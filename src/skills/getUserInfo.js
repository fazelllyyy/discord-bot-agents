module.exports = {
    name: 'getUserInfo',
    description: 'Fetches information about a specific server member.',
    params: {
        memberId: 'string - The ID or @mention of the member to look up.'
    },

    async fetchRaw(guild, message, params = {}) {
        let targetMember = message.member;
        if (params.memberId) {
            const parsedId = params.memberId.replace(/[<@!>]/g, '');
            targetMember = await guild.members.fetch(parsedId).catch(() => null);
        }
        if (!targetMember) return null;

        return {
            username: targetMember.user.username,
            displayName: targetMember.displayName,
            id: targetMember.id,
            mention: `<@${targetMember.id}>`,
            avatarUrl: targetMember.user.displayAvatarURL({ size: 256 }),
            roles: targetMember.roles.cache.filter(r => r.id !== guild.roles.everyone.id).map(r => r.name),
            joinedAt: targetMember.joinedAt?.toISOString() || null,
            accountCreatedAt: targetMember.user.createdAt.toISOString(),
            isBot: targetMember.user.bot,
            isBoosting: !!targetMember.premiumSince,
            nickname: targetMember.nickname || null,
        };
    },

    async execute(guild, params, message) {
        const data = await this.fetchRaw(guild, message, params);
        if (!data) throw new Error(`I couldn't find that user on this server.`);
        const reply = `**User Information: ${data.displayName}**
- **Username:** ${data.username}
- **Mention:** ${data.mention}
- **ID:** ${data.id}
- **Joined Server:** ${data.joinedAt ? new Date(data.joinedAt).toLocaleString() : 'Unknown'}
- **Account Created:** ${new Date(data.accountCreatedAt).toLocaleString()}
- **Bot:** ${data.isBot ? 'Yes' : 'No'}
- **Roles:** ${data.roles.join(', ') || 'None'}`;
        if (data.avatarUrl) {
            return { reply, imageUrl: data.avatarUrl };
        }
        return reply;
    }
};
