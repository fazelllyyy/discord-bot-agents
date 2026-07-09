const OpenAI = require('openai');
const { splitPrompt } = require('../../utils/promptSplitter');

module.exports = function createJinaProvider(config) {
    const openai = new OpenAI({
        baseURL: 'https://deepsearch.jina.ai/v1',
        apiKey: config.apiKey
    });
    
    return async (prompt) => {
        const { system, user } = splitPrompt(prompt);
        const messages = [];
        if (system) messages.push({ role: 'system', content: system });
        if (user) messages.push({ role: 'user', content: user });
        if (messages.length === 0) messages.push({ role: 'user', content: prompt });

        const chatCompletion = await openai.chat.completions.create({
            messages,
            model: config.model,
            temperature: config.options.temperature,
            max_tokens: config.options.maxOutputTokens
        });
        return chatCompletion.choices[0].message.content;
    };
};
