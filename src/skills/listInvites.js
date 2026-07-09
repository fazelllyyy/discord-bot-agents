module.exports = {
    name: 'listInvites',
    description: 'List active invites in the server.',
    params: {},

    async fetchRaw(guild, message) {
        try {
            let invites = await guild.invites.fetch();
            
            // Filter invites to only show those the user has permission to view/manage
            if (message.member.id !== guild.ownerId) {
                invites = invites.filter(inv => {
                    if (!inv.channel) return message.member.permissions.has('ManageGuild');
                    const perms = inv.channel.permissionsFor(message.member);
                    return perms && perms.has('ViewChannel') && perms.has('ManageChannels');
                });
            }

            if (invites.size === 0) return { invites: [], total: 0 };

            const invitesData = invites.map(inv => ({
                code: inv.code,
                inviterName: inv.inviter ? inv.inviter.username : 'Unknown',
                uses: inv.uses,
                maxUses: inv.maxUses === 0 ? 'Unlimited' : inv.maxUses,
                channelName: inv.channel ? inv.channel.name : 'Unknown',
                expiresAt: inv.expiresAt ? inv.expiresAt.toISOString() : null
            }));

            return { invites: invitesData, total: invitesData.length };
        } catch (error) {
            console.error('listInvites error:', error);
            return null;
        }
    },

    async execute(guild, params, message) {
        const data = await this.fetchRaw(guild, message);
        if (!data || data.invites.length === 0) return 'There aren\'t any active invites in this server right now.';
        return data.invites.map(inv => `- **${inv.code}** (by ${inv.inviter}): ${inv.uses}/${inv.maxUses || '∞'} uses - Expires: ${inv.expiresAt ? new Date(inv.expiresAt).toLocaleString() : 'Never'}`).join('\n');
    }
};
