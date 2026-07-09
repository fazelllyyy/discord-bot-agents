const { OpenAI } = require('openai');

module.exports = function createClarifaiProvider(config) {
    const openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: 'https://api.clarifai.com/v2/ext/openai/v1'
    });

    return async (prompt) => {
        const response = await openai.chat.completions.create({
            model: config.model || 'https://clarifai.com/openai/chat-completion/models/gpt-4o-mini',
            messages: [{ role: "user", content: prompt }],
            temperature: config.options?.temperature || 0.2,
            max_tokens: config.options?.maxOutputTokens || 300,
        });
        return response.choices[0].message.content;
    };
};
