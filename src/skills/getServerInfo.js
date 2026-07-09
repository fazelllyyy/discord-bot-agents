module.exports = {
    name: 'getServerInfo',
    description: 'Fetches information about the current server. The AI will format and present the data.',
    params: {},

    async fetchRaw(guild, message) {
        let ownerName = 'Unknown';
        let ownerId = null;
        try {
            const owner = await guild.fetchOwner();
            ownerName = owner.user.username;
            ownerId = owner.id;
        } catch(e) {}

        const activeMembers = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size;
        const offlineMembers = guild.memberCount - activeMembers;

        return {
            name: guild.name,
            id: guild.id,
            ownerName,
            ownerId,
            ownerMention: ownerId ? `<@${ownerId}>` : null,
            description: guild.description || null,
            memberCount: guild.memberCount,
            activeMemberCount: activeMembers,
            offlineMemberCount: offlineMembers,
            channelCount: guild.channels.cache.size,
            channelTextCount: guild.channels.cache.filter(c => c.type === 0).size,
            channelVoiceCount: guild.channels.cache.filter(c => c.type === 2).size,
            channelCategoryCount: guild.channels.cache.filter(c => c.type === 4).size,
            roleCount: guild.roles.cache.size,
            emojiCount: guild.emojis.cache.size,
            iconUrl: guild.iconURL({ size: 256 }) || null,
            bannerUrl: guild.bannerURL({ size: 512 }) || null,
            createdAt: guild.createdAt.toISOString(),
            premiumTier: guild.premiumTier,
            premiumSubscriptionCount: guild.premiumSubscriptionCount || 0,
            verificationLevel: guild.verificationLevel,
        };
    },

    async execute(guild, params, message) {
        const data = await this.fetchRaw(guild, message);
        const reply = `**Server Information:**
- **Name:** ${data.name}
- **ID:** ${data.id}
- **Owner:** ${data.ownerName} (${data.ownerMention || data.ownerId})
- **Created At:** ${new Date(data.createdAt).toLocaleString()}
- **Members:** ${data.memberCount} (${data.activeMemberCount} Active, ${data.offlineMemberCount} Offline)
- **Channels:** ${data.channelCount} Total (${data.channelTextCount} Text, ${data.channelVoiceCount} Voice)
- **Roles:** ${data.roleCount}
- **Emojis:** ${data.emojiCount}
- **Boost Tier:** ${data.premiumTier} (${data.premiumSubscriptionCount} Boosts)`;
        if (data.iconUrl) {
            return { reply, imageUrl: data.iconUrl };
        }
        return reply;
    }
};
