const { getSnipes } = require('../utils/snipeManager');
const { findChannel } = require('../utils/fuzzyMatch');

module.exports = {
    name: 'getSnipe',
    description: 'Retrieves the most recently deleted messages in a channel.',
    params: {
        channelName: 'string (optional) - The name or mention of the channel to snipe from. Defaults to the current channel.',
        amount: 'number (optional) - How many deleted messages to retrieve (1-5). Default is 1.',
        index: 'number (optional) - Which deleted message to retrieve (1-5). 1 = most recent. Alias for amount.'
    },
    
    async fetchRaw(guild, message, params = {}) {
        let targetChannel = message.channel;
        if (params.channelName) {
            targetChannel = await findChannel(guild, params.channelName) || message.channel;
        }

        if (!targetChannel) return null;

        if (targetChannel.nsfw && !message.channel.nsfw) {
            return { error: `You can't snipe messages from the age-restricted channel "${targetChannel.name}" while you're in a public channel.` };
        }

        if (message.member.id !== guild.ownerId) {
            const perms = targetChannel.permissionsFor(message.member);
            if (!perms || !perms.has('ViewChannel')) {
                return { error: `You don't have permission to view or snipe messages in ${targetChannel.name}.` };
            }
        }

        const snipes = getSnipes(targetChannel.id);
        
        if (!snipes || snipes.length === 0) {
            return { snipes: [], channelName: targetChannel.name };
        }

        const amount = Math.min(Math.max((params.amount || params.index || 1), 1), 5);
        const snipesToShow = snipes.slice(0, amount);

        return { snipes: snipesToShow, channelName: targetChannel.name };
    },

    async execute(guild, params, message) {
        const data = await this.fetchRaw(guild, message, params);
        if (data && data.error) throw new Error(data.error);
        if (!data || !data.snipes || data.snipes.length === 0) return 'No deleted messages to show in that channel.';
        return data.snipes.map(m => `**[${new Date(m.timestamp).toLocaleTimeString()}] ${m.authorName}**:\n${m.content}`).join('\n\n');
    }
};
