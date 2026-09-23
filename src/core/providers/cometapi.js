const { OpenAI } = require('openai');
const { splitPrompt } = require('../../utils/promptSplitter');

module.exports = function createCometApiProvider(config) {
    const openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: 'https://api.cometapi.com/v1',
    });

    return async (prompt, opts = {}) => {
        const { system, user } = splitPrompt(prompt);
        const messages = [];
        if (system) messages.push({ role: 'system', content: system });
        if (user) messages.push({ role: 'user', content: user });
        if (messages.length === 0) messages.push({ role: 'user', content: prompt });

        const response = await openai.chat.completions.create({
            model: config.model,
            messages,
            temperature: config.options?.temperature || 0.2,
            max_tokens: opts.maxTokens || config.options?.maxOutputTokens || 1024,
        });
        return response.choices[0].message.content;
    };
};
