const Groq = require('groq-sdk');
const { splitPrompt } = require('../../utils/promptSplitter');

module.exports = function createGroqProvider(config) {
    const groq = new Groq({ apiKey: config.apiKey });
    return async (prompt) => {
        const { system, user } = splitPrompt(prompt);
        const messages = [];
        if (system) messages.push({ role: 'system', content: system });
        if (user) messages.push({ role: 'user', content: user });
        if (messages.length === 0) messages.push({ role: 'user', content: prompt });

        const chatCompletion = await groq.chat.completions.create({
            messages,
            model: config.model,
            temperature: config.options.temperature,
            max_tokens: config.options.maxOutputTokens
        });
        return chatCompletion.choices[0].message.content;
    };
};
