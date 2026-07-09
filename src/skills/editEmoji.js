const { findEmoji } = require('../utils/fuzzyMatch');
const { withRetry } = require('../utils/retry');

module.exports = {
    name: 'editEmoji',
    requiredPermissions: ['ManageGuildExpressions'],
    description: 'Edits the name of an existing emoji.',
    params: {
        emojiNameOrId: 'string - The exact name, ID, or mention of the emoji to edit.',
        newName: 'string (optional) - The new name for the emoji.'
    },
    async execute(guild, params) {
        if (!params.emojiNameOrId) {
            throw new Error('I need the emoji name, ID, or mention to edit it.');
        }
        if (!params.newName) {
            return 'You didn\'t give me a new name for the emoji.';
        }

        const emoji = await findEmoji(guild, params.emojiNameOrId);

        if (!emoji) {
            throw new Error(`I couldn't find an emoji called "${params.emojiNameOrId}" in this server.`);
        }

        await withRetry(async () => {
            await emoji.edit({ name: params.newName });
        }, { label: 'editEmoji' });

        return `Emoji renamed to "${params.newName}" successfully.`;
    }
};
