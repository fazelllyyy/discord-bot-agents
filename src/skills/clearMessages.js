const { findChannel } = require('../utils/fuzzyMatch');

module.exports = {
    name: 'clearMessages',
    requiredPermissions: ['ManageMessages'],
    description: 'Deletes recent messages from a text channel (purge). Supports advanced filters. Cannot delete messages older than 14 days.',
    params: {
        amount: 'number (optional) - The number of messages to search/delete (1-1000). Default is 100.',
        channelName: 'string (optional) - The name or mention of the channel. If empty, defaults to the current channel.',
        filterType: 'string (optional) - Filter the messages. Options: "default", "image", "embed", "bot", "user", "emoji", "reaction", "link", "file", "mention".',
        targetUserId: 'string (optional) - Only delete messages from this specific User ID or mention.'
    },
    async execute(guild, params, message) {
        const amount = params.amount || 100;
        if (amount < 1 || amount > 1000) {
            throw new Error('The amount needs to be somewhere between 1 and 1000.');
        }

        const filterType = params.filterType ? params.filterType.toLowerCase() : 'default';
        const targetId = params.targetUserId ? params.targetUserId.replace(/[<@!>]/g, '') : null;

        let targetChannel = message.channel;
        if (params.channelName) {
            targetChannel = await findChannel(guild, params.channelName, 0) || message.channel;
        }

        if (!targetChannel || targetChannel.type !== 0) {
            throw new Error('I couldn\'t find a valid text channel to work with.');
        }

        if (targetChannel.nsfw && !message.channel.nsfw) {
            throw new Error(`You can't clear messages in "${targetChannel.name}" (age-restricted channel) from a public channel.`);
        }

        if (message.member.id !== guild.ownerId) {
            const perms = targetChannel.permissionsFor(message.member);
            if (!perms || !perms.has('ViewChannel') || !perms.has('ManageMessages')) {
                throw new Error(`You don't have permission to view or manage messages in ${targetChannel.name}.`);
            }
        }

        function isOnlyEmoji(text) {
            if (!text) return false;
            // Basic regex to match only emojis (custom or unicode) and spaces
            const replaced = text.replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, '').replace(/[\p{Extended_Pictographic}\s]/gu, '').trim();
            return replaced.length === 0 && text.trim().length > 0;
        }

        let fetchedMessages = new Map();
        let reactionsClearedCount = 0;
        let lastMessageId = null;
        let keepFetching = true;

        while (keepFetching && fetchedMessages.size < amount && (filterType !== 'reaction' || reactionsClearedCount < amount)) {
            const fetchOptions = { limit: 100 };
            if (lastMessageId) fetchOptions.before = lastMessageId;

            const messages = await targetChannel.messages.fetch(fetchOptions).catch(() => null);
            if (!messages || messages.size === 0) break;

            lastMessageId = messages.last().id;

            for (const msg of messages.values()) {
                if (filterType === 'reaction') {
                    if (msg.reactions.cache.size > 0) {
                        await msg.reactions.removeAll().catch(() => {});
                        reactionsClearedCount++;
                    }
                    if (reactionsClearedCount >= amount) {
                        keepFetching = false;
                        break;
                    }
                    continue; // Skip the deletion logic below
                }

                const isOld = (Date.now() - msg.createdTimestamp) > 14 * 24 * 60 * 60 * 1000;
                if (isOld) {
                    keepFetching = false;
                    break;
                }

                let matches = false;
                if (filterType === 'default') matches = true;
                else if (filterType === 'image') matches = msg.attachments.size > 0 && msg.attachments.some(a => a.contentType ? a.contentType.startsWith('image') : /\.(jpg|jpeg|png|gif|webp)$/i.test(a.name || ''));
                else if (filterType === 'file') matches = msg.attachments.size > 0 && msg.attachments.some(a => !(a.contentType && a.contentType.startsWith('image')));
                else if (filterType === 'embed') matches = msg.embeds.length > 0;
                else if (filterType === 'bot') matches = msg.author.bot;
                else if (filterType === 'user') matches = !msg.author.bot;
                else if (filterType === 'emoji') matches = isOnlyEmoji(msg.content);
                else if (filterType === 'link') matches = /(https?:\/\/[^\s]+)/i.test(msg.content);
                else if (filterType === 'mention') matches = msg.mentions.users.size > 0 || msg.mentions.roles.size > 0 || msg.mentions.everyone;

                if (targetId && msg.author.id !== targetId) matches = false;

                if (matches) {
                    fetchedMessages.set(msg.id, msg);
                    if (fetchedMessages.size >= amount) {
                        keepFetching = false;
                        break;
                    }
                }
            }
        }

        if (filterType === 'reaction') {
            return `Cleared reactions from the last ${reactionsClearedCount} messages.`;
        }

        if (fetchedMessages.size === 0) {
            return `I didn't find any messages matching that criteria — they may be over 14 days old.`;
        }

        const messagesToDelete = Array.from(fetchedMessages.values());
        let deletedCount = 0;
        
        for (let i = 0; i < messagesToDelete.length; i += 100) {
            const chunk = messagesToDelete.slice(i, i + 100);
            const deleted = await targetChannel.bulkDelete(chunk, true).catch(() => new Map());
            deletedCount += deleted.size;
            if (chunk.length === 100) await new Promise(r => setTimeout(r, 1500)); // Sleep to prevent rate limit
        }

        let resultMessage = `Deleted ${deletedCount} messages${filterType !== 'default' ? ` with type '${filterType}'` : ''}.`;
        if (deletedCount < amount && filterType === 'default' && !targetId) {
            resultMessage += `\n(Couldn't hit the target of ${amount} messages — hit the 14-day age limit first).`;
        }
        
        return resultMessage;
    }
};
