const { Mistral } = require('@mistralai/mistralai');
const { splitPrompt } = require('../../utils/promptSplitter');

module.exports = function createMistralProvider(config) {
    const client = new Mistral({ apiKey: config.apiKey });

    return async (prompt, opts = {}) => {
        const { system, user } = splitPrompt(prompt);
        const messages = [];
        if (system) messages.push({ role: 'system', content: system });
        if (user) messages.push({ role: 'user', content: user });
        if (messages.length === 0) messages.push({ role: 'user', content: prompt });

        const chatCompletion = await client.chat.complete({
            model: config.model,
            messages,
            temperature: config.options.temperature,
            maxTokens: opts.maxTokens || config.options.maxOutputTokens,
            responseFormat: { type: 'json_object' },
        });
        return chatCompletion.choices[0].message.content;
    };
};
