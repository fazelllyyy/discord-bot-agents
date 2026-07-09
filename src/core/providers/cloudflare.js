const { splitPrompt } = require('../../utils/promptSplitter');

module.exports = function createCloudflareProvider(config) {
    const { accountId, apiKey, model } = config;
    
    return async (prompt) => {
        const { system, user } = splitPrompt(prompt);
        const messages = [];
        if (system) messages.push({ role: 'system', content: system });
        if (user) messages.push({ role: 'user', content: user });
        if (messages.length === 0) messages.push({ role: 'user', content: prompt });

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages,
                    max_tokens: config.options.maxOutputTokens
                })
            }
        );

        const result = await response.json();
        if (!response.ok) {
            throw new Error(`Cloudflare API Error: ${result.errors?.[0]?.message || response.statusText}`);
        }
        return result.result.response;
    };
};
