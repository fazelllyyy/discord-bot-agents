module.exports = {
    name: 'removeMember',
    requiredPermissions: ['KickMembers'],
    description: 'Removes a member from the server.',
    params: {
        memberId: 'string - The ID, mention, or username of the member to remove.',
        reason: 'string (optional) - The reason for the removal.'
    },
    async execute(guild, params, message) {
        if (!params.memberId) throw new Error('You need to give me a member ID, username, or mention to remove.');
        
        const parsedId = params.memberId.replace(/[<@!>]/g, '');
        let targetMember;

        try {
            targetMember = await guild.members.fetch(parsedId);
        } catch (err) {
            targetMember = guild.members.cache.find(m => m.user.username.toLowerCase() === params.memberId.toLowerCase());
        }

        if (!targetMember) throw new Error(`I couldn't find anyone matching "${params.memberId}" on this server.`);

        if (!targetMember.kickable || guild.members.me.roles.highest.position <= targetMember.roles.highest.position) {
            throw new Error(`I can't remove ${targetMember.user.username} — my role isn't high enough in the hierarchy.`);
        }

        if (message.member.id !== guild.ownerId) {
            if (message.member.roles.highest.position <= targetMember.roles.highest.position) {
                throw new Error(`You can't remove ${targetMember.user.username} — their highest role is the same or above yours.`);
            }
        }

        await targetMember.kick(params.reason || 'Removed by AI Bot');
        return true;
    }
};
