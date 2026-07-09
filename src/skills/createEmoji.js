const { withRetry } = require('../utils/retry');

module.exports = {
    name: 'createEmoji',
    requiredPermissions: ['ManageGuildExpressions'],
    description: 'Creates a new emoji in the server, or "steals" an emoji from a URL or raw discord custom emoji format.',
    params: {
        name: 'string - The name of the new emoji (max 32 chars).',
        url: 'string - The URL of the image/gif to upload as an emoji.'
    },
    async execute(guild, params) {
        if (!params.name || !params.url) {
            throw new Error('I need both a name and a URL to create an emoji.');
        }

        let finalUrl = params.url;
        // Parse custom discord emoji if provided (<:name:id> or <a:name:id>)
        const emojiMatch = params.url.match(/<(a?):[a-zA-Z0-9_]+:(\d+)>/);
        if (emojiMatch) {
            const isAnimated = emojiMatch[1] === 'a';
            const id = emojiMatch[2];
            finalUrl = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? 'gif' : 'png'}`;
        }

        const newEmoji = await withRetry(async () => {
            return await guild.emojis.create({ attachment: finalUrl, name: params.name });
        }, { label: 'createEmoji' });

        return `Emoji ${newEmoji} has been created with the name "${newEmoji.name}".`;
    }
};
