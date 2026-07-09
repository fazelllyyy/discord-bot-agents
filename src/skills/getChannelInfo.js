const { findClosest } = require('../utils/fuzzyMatch');

module.exports = {
    name: 'getChannelInfo',
    description: 'Fetches information about a specific channel.',
    params: {
        channelName: 'string - The name or mention of the channel to inspect.'
    },

    async fetchRaw(guild, message, params = {}) {
        if (!params.channelName) return null;
        let channel = findClosest(guild.channels.cache, params.channelName);
        
        if (!channel) {
            const idMatch = params.channelName.match(/<[#@&!]+(\d+)>/);
            const rawId = idMatch ? idMatch[1] : (/^\d+$/.test(params.channelName) ? params.channelName : null);
            if (rawId) {
                channel = await guild.channels.fetch(rawId).catch(() => null);
            }
        }
        if (!channel) return null;

        const channelTypes = {
            0: 'Text', 2: 'Voice', 4: 'Category', 5: 'Announcement', 13: 'Stage', 15: 'Forum'
        };

        return {
            name: channel.name,
            id: channel.id,
            mention: `<#${channel.id}>`,
            type: channelTypes[channel.type] || `Unknown (${channel.type})`,
            createdAt: channel.createdAt.toISOString(),
            nsfw: channel.nsfw || false,
            parentName: channel.parent ? channel.parent.name : null,
            topic: channel.topic || null,
            bitrate: channel.bitrate || null,
            userLimit: channel.userLimit || null,
            position: channel.position
        };
    },

    async execute(guild, params, message) {
        const data = await this.fetchRaw(guild, message, params);
        if (!data) throw new Error(`I couldn't find a channel called "${params.channelName}" here.`);
        
        let channel = findClosest(guild.channels.cache, params.channelName);
        if (!channel) {
            const idMatch = params.channelName.match(/<[#@&!]+(\d+)>/);
            const rawId = idMatch ? idMatch[1] : (/^\d+$/.test(params.channelName) ? params.channelName : null);
            if (rawId) {
                channel = await guild.channels.fetch(rawId).catch(() => null);
            }
        }
        if (channel.nsfw && !message.channel.nsfw) {
            throw new Error(`You can't look up info on the age-restricted channel "${channel.name}" from a non-NSFW channel.`);
        }

        if (message.member.id !== guild.ownerId) {
            const perms = channel.permissionsFor(message.member);
            if (!perms || !perms.has('ViewChannel')) {
                throw new Error(`You don't have permission to view info about ${channel.name}.`);
            }
        }

        return `**Channel Information: ${data.name}**
- **Mention:** ${data.mention}
- **ID:** ${data.id}
- **Type:** ${data.type}
- **Category:** ${data.parentName || 'None'}
- **Created At:** ${new Date(data.createdAt).toLocaleString()}
- **NSFW:** ${data.nsfw ? 'Yes' : 'No'}`;
    }
};
