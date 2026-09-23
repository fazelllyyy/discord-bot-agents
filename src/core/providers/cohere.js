const { CohereClient } = require('cohere-ai');

module.exports = function createCohereProvider(config) {
    const cohere = new CohereClient({ token: config.apiKey });

    return async (prompt, opts = {}) => {
        const response = await cohere.chat({
            model: config.model,
            message: prompt,
            temperature: config.options.temperature,
            maxTokens: opts.maxTokens || config.options.maxOutputTokens,
            responseFormat: { type: 'json_object' },
        });
        return response.text;
    };
};
