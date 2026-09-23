const config = require('../config');

const providerFactories = {
    gemini: require('./providers/gemini'),
    groq: require('./providers/groq'),
    github: require('./providers/github'),
    cloudflare: require('./providers/cloudflare'),
    openrouter: require('./providers/openrouter'),
    cerebras: require('./providers/cerebras'),
    mistral: require('./providers/mistral'),
    cohere: require('./providers/cohere'),
    jina: require('./providers/jina'),
    cometapi: require('./providers/cometapi')
};

const providers = [];

function initializeProviders() {
    let maxKeys = 0;
    const expandedList = [];

    // First pass: collect keys and find max depth
    for (const providerCfg of config.aiProviders) {
        // Skip if cached as missing
        if (config.missingVars.has(providerCfg.name)) {
            console.warn(`[WARN] API Key for ${providerCfg.name} is missing. Skipping...`);
            continue;
        }
        const keys = providerCfg.apiKeys && providerCfg.apiKeys.length > 0 ? providerCfg.apiKeys : (providerCfg.apiKey ? [providerCfg.apiKey] : []);
        if (keys.length > maxKeys) maxKeys = keys.length;
        expandedList.push({ cfg: providerCfg, keys: keys });
    }

    // Second pass: interleave
    for (let i = 0; i < maxKeys; i++) {
        for (const item of expandedList) {
            if (i < item.keys.length) {
                const factory = providerFactories[item.cfg.type];
                if (factory) {
                    const multiConfig = { ...item.cfg, apiKey: item.keys[i] };
                    if (item.cfg.accountIds && item.cfg.accountIds.length > i) {
                        multiConfig.accountId = item.cfg.accountIds[i];
                    }
                    delete multiConfig.apiKeys; // Prevent internal rotation if any provider supports it
                    delete multiConfig.accountIds;
                    const multiName = item.keys.length > 1 ? `${item.cfg.name}_${i + 1}` : item.cfg.name;
                    providers.push({
                        name: multiName,
                        generate: factory(multiConfig)
                    });
                    console.log(`[INFO] Initialized AI Provider: ${multiName}`);
                } else {
                    if (i === 0) console.warn(`[WARN] Unknown provider type: ${item.cfg.type}`);
                }
            }
        }
    }
}

initializeProviders();

let currentIndex = 0;
let lastRequestTime = Date.now();
const RESET_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const GENERATE_TIMEOUT_MS = 15 * 1000; // 15 seconds

async function generateWithFallback(prompt, { maxTokens } = {}) {
    if (providers.length === 0) {
        throw new Error('No AI providers are initialized. Please check your API keys.');
    }

    const now = Date.now();
    // Reset to first provider if inactive for more than 5 minutes
    if (now - lastRequestTime > RESET_TIMEOUT_MS) {
        if (currentIndex !== 0) {
            console.log('[INFO] Inactivity timeout reached. Resetting AI Provider queue to Primary.');
        }
        currentIndex = 0;
    }
    lastRequestTime = now;

    // We will attempt up to providers.length times
    for (let attempts = 0; attempts < providers.length; attempts++) {
        // Calculate the actual index for this attempt
        const attemptIndex = (currentIndex + attempts) % providers.length;
        const provider = providers[attemptIndex];
        
        try {
            console.log(`[INFO] Attempting to generate with provider: ${provider.name.toUpperCase()}`);
            
            let text;
            let timerId;
            try {
                const timeoutPromise = new Promise((_, reject) => {
                    timerId = setTimeout(() => reject(new Error(`Timeout: Provider ${provider.name.toUpperCase()} took longer than 15 seconds`)), GENERATE_TIMEOUT_MS);
                });
                
                text = await Promise.race([
                    provider.generate(prompt, { maxTokens }),
                    timeoutPromise
                ]);
            } finally {
                clearTimeout(timerId);
            }
            
            if (!text || text.trim() === '') {
                throw new Error('Provider returned an empty or invalid response (possibly blocked by safety filters).');
            }
            
            // On success, advance to next provider for the FRESH request
            currentIndex = (attemptIndex + 1) % providers.length;
            console.log(`[INFO] Provider ${provider.name.toUpperCase()} generated successfully.`);
            return text;
        } catch (err) {
            let errMsg = err.message;
            if (errMsg.includes('429') || errMsg.toLowerCase().includes('too many requests') || errMsg.toLowerCase().includes('quota exceeded')) {
                errMsg = '429 Rate Limit / Quota Exceeded.';
            } else if (errMsg.includes('400') && errMsg.includes('filtered')) {
                errMsg = '400 Content Filtered (Safety policy triggered).';
            } else if (errMsg.length > 200) {
                errMsg = errMsg.substring(0, 200) + '... (truncated)';
            }
            console.warn(`[WARN] Provider ${provider.name.toUpperCase()} failed:`, errMsg);
            if (attempts < providers.length - 1) {
                const nextProviderName = providers[(currentIndex + attempts + 1) % providers.length].name;
                console.log(`[INFO] Falling back to next provider: ${nextProviderName.toUpperCase()}...`);
            }
        }
    }
    throw new Error('All AI providers failed. Check logs for details.');
}

function advanceProvider() {
    if (providers.length > 0) {
        currentIndex = (currentIndex + 1) % providers.length;
        // console.log(`[INFO] Advancing round-robin queue. Next primary: ${providers[currentIndex].name.toUpperCase()}`);
    }
}

module.exports = { generateWithFallback, providers, advanceProvider };

