const { OpenAI } = require('openai');

module.exports = function createAi21Provider(config) {
    const openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: 'https://api.ai21.com/studio/v1/'
    });

    return async (prompt) => {
        const response = await openai.chat.completions.create({
            model: config.model || 'jamba-1.5-mini',
            messages: [{ role: "user", content: prompt }],
            temperature: config.options?.temperature || 0.2,
            max_tokens: config.options?.maxOutputTokens || 300,
        });
        return response.choices[0].message.content;
    };
};
