const { GoogleGenerativeAI } = require('@google/generative-ai');
const { splitPrompt } = require('../../utils/promptSplitter');

module.exports = function createGeminiProvider(config) {
    const keys = config.apiKeys && config.apiKeys.length > 0 ? config.apiKeys : [config.apiKey];
    let currentKeyIndex = 0;

    return async (prompt, opts = {}) => {
        const apiKey = keys[currentKeyIndex];
        currentKeyIndex = (currentKeyIndex + 1) % keys.length;

        const genAI = new GoogleGenerativeAI(apiKey);
        const { system, user } = splitPrompt(prompt);

        const modelParams = {
            model: config.model,
            generationConfig: {
                temperature: config.options.temperature,
                maxOutputTokens: opts.maxTokens || config.options.maxOutputTokens,
                responseMimeType: 'application/json',
            },
        };
        if (system) {
            modelParams.systemInstruction = system;
        }
        const model = genAI.getGenerativeModel(modelParams);

        const input = user || prompt;
        const result = await model.generateContent(input);
        return result.response.text();
    };
};
