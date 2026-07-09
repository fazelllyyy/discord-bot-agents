const { findEmoji } = require('../utils/fuzzyMatch');
const { withRetry } = require('../utils/retry');

module.exports = {
    name: 'deleteEmoji',
    requiredPermissions: ['ManageGuildExpressions'],
    description: 'Deletes an emoji from the server.',
    params: {
        emojiNameOrId: 'string - The exact name, ID, or mention of the emoji to delete.'
    },
    async execute(guild, params) {
        if (!params.emojiNameOrId) {
            throw new Error('I need the emoji name, ID, or mention to delete it.');
        }

        const emoji = await findEmoji(guild, params.emojiNameOrId);

        if (!emoji) {
            throw new Error(`I couldn't find an emoji called "${params.emojiNameOrId}" in this server.`);
        }

        const deletedName = emoji.name;
        
        await withRetry(async () => {
            await emoji.delete();
        }, { label: 'deleteEmoji' });

        return `The emoji "${deletedName}" has been deleted.`;
    }
};
