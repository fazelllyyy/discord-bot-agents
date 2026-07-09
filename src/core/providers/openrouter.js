const OpenAI = require('openai');
const { splitPrompt } = require('../../utils/promptSplitter');

module.exports = function createOpenRouterProvider(config) {
    const openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: config.apiKey,
        defaultHeaders: {
            "HTTP-Referer": "https://github.com/fazelllyyy/discord-bot-agents",
            "X-Title": "Discord Bot Agents",
        }
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
