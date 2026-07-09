const { Mistral } = require('@mistralai/mistralai');
const { splitPrompt } = require('../../utils/promptSplitter');

module.exports = function createMistralProvider(config) {
    const client = new Mistral({ apiKey: config.apiKey });
    
    return async (prompt) => {
        const { system, user } = splitPrompt(prompt);
        const messages = [];
        if (system) messages.push({ role: 'system', content: system });
        if (user) messages.push({ role: 'user', content: user });
        if (messages.length === 0) messages.push({ role: 'user', content: prompt });

        const chatCompletion = await client.chat.complete({
            model: config.model,
            messages,
            temperature: config.options.temperature,
            maxTokens: config.options.maxOutputTokens
        });
        return chatCompletion.choices[0].message.content;
    };
};
