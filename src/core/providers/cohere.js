const { CohereClient } = require('cohere-ai');

module.exports = function createCohereProvider(config) {
    const cohere = new CohereClient({ token: config.apiKey });
    
    return async (prompt) => {
        // Cohere works best with the full prompt as a single user message
        // Using preamble can reduce instruction-following strictness
        const response = await cohere.chat({
            model: config.model,
            message: prompt,
            temperature: config.options.temperature,
            maxTokens: config.options.maxOutputTokens
        });
        return response.text;
    };
};
