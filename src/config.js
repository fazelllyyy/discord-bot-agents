// Collects API keys / tokens with base var first, then _1, _2 for optional rotation.
function collectKeys(base) {
    return [process.env[base], process.env[base + '_1'], process.env[base + '_2']].filter(Boolean);
}

// Build AI provider list
const aiProviders = [
    {
        name: 'gemini',
        type: 'gemini',
        apiKeys: collectKeys('GEMINI_API_KEY'),
        model: 'gemini-2.5-flash-lite',
        options: { temperature: 0.0, maxOutputTokens: 4096 }
    },
    {
        name: 'groq',
        type: 'groq',
        apiKeys: collectKeys('GROQ_API_KEY'),
        model: 'llama-3.3-70b-versatile',
        options: { temperature: 0.0, maxOutputTokens: 4096 }
    },
    {
        name: 'cohere',
        type: 'cohere',
        apiKeys: collectKeys('COHERE_API_KEY'),
        model: 'command-r7b-12-2024', 
        options: { temperature: 0.0, maxOutputTokens: 4096 }
    },
    {
        name: 'mistral',
        type: 'mistral',
        apiKeys: collectKeys('MISTRAL_API_KEY'),
        model: 'mistral-small-latest',
        options: { temperature: 0.0, maxOutputTokens: 4096 }
    },
    {
        name: 'cerebras',
        type: 'cerebras',
        apiKeys: collectKeys('CEREBRAS_API_KEY'),
        model: 'zai-glm-4.7',
        options: { temperature: 0.0, maxOutputTokens: 4096 }
    },
    {
        name: 'github',
        type: 'github',
        apiKeys: collectKeys('GITHUB_PATH_KEY'),
        model: 'gpt-4o-mini',
        options: { temperature: 0.0, maxOutputTokens: 4096 }
    },
    {
        name: 'cloudflare',
        type: 'cloudflare',
        apiKeys: collectKeys('CLOUDFLARE_API_TOKEN'),
        accountIds: collectKeys('CLOUDFLARE_ACCOUNT_ID'),
        model: '@cf/meta/llama-3.1-8b-instruct-fp8',
        options: { temperature: 0.0, maxOutputTokens: 4096 }
    },
    {
        name: 'openrouter',
        type: 'openrouter',
        apiKeys: collectKeys('OPENROUTER_API_KEY'),
        model: 'openai/gpt-oss-120b:free',
        options: { temperature: 0.0, maxOutputTokens: 4096 }
    },
    {
        name: 'jina',
        type: 'jina',
        apiKeys: collectKeys('JINA_API_KEY'),
        model: 'jina-deepsearch-v1',
        options: { temperature: 0.0, maxOutputTokens: 4096 }
    },
    {
        name: 'cometapi',
        type: 'cometapi',
        apiKeys: collectKeys('COMETAPI_API_KEY'),
        model: 'gpt-4o-mini',
        options: { temperature: 0.0, maxOutputTokens: 4096 }
    }
];

// Cache: track which providers have missing keys so they aren't used in the queue
const missingVars = new Set();
for (const p of aiProviders) {
    if (p.type === 'cloudflare') {
        if (!p.apiKeys || p.apiKeys.length === 0 || !p.accountIds || p.accountIds.length === 0) {
            missingVars.add(p.name);
        }
    } else {
        if (!p.apiKeys || p.apiKeys.length === 0) {
            missingVars.add(p.name);
        }
    }
}

module.exports = {
    // Bot mention prefix (will be checked automatically by the handler)
    botPrefix: /^<@!?(\d+)>/, // Regex for mention

    // AI Providers (priority order from cheapest to most expensive)
    aiProviders,

    // Set of provider names with missing keys (won't be in rotation)
    missingVars,

    // Default language for responses if not detected
    defaultLanguage: 'english',

    // Bot name (automatically fetched from client.user.username, can fallback)
    botNamePlaceholder: 'AI Bot',

    // Default messages
    defaultGreeting: 'Hello, I am {botName}. How can I help you today?',
    notUnderstandMessage: 'I do not understand your request. Please rephrase.',
    identityMessage: 'I am {botName}, an AI assistant for managing this Discord server.',
};
