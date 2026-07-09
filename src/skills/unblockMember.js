module.exports = {
    name: 'unblockMember',
    requiredPermissions: ['BanMembers'],
    description: 'Restores access for a previously blocked member in the server.',
    params: {
        memberId: 'string - The ID, username, or mention of the member to unblock.',
        reason: 'string (optional) - The reason for the unblock.'
    },
    async execute(guild, params, message) {
        if (!params.memberId) throw new Error('You need to give me a member ID, username, or mention to unblock.');
        
        const parsedId = params.memberId.replace(/[<@!>]/g, '');
        
        try {
            await guild.members.unban(parsedId, params.reason || 'Unblocked by AI Bot');
            return true;
        } catch (err) {
            // If unblock by ID fails, it might be a username. We have to fetch bans.
            const bans = await guild.bans.fetch();
            const bannedUser = bans.find(b => b.user.username.toLowerCase() === params.memberId.toLowerCase());
            
            if (bannedUser) {
                await guild.members.unban(bannedUser.user.id, params.reason || 'Unblocked by AI Bot');
                return true;
            }
            
            throw new Error(`I couldn't find anyone named "${params.memberId}" in the blocked list.`);
        }
    }
};
