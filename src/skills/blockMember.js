module.exports = {
    name: 'blockMember',
    requiredPermissions: ['BanMembers'],
    description: 'Blocks a member from accessing the server. Use this to permanently block a user.',
    params: {
        memberId: 'string - The ID, mention, or username of the member to block.',
        reason: 'string (optional) - The reason for the block.',
        deleteMessageDays: 'number (optional) - Number of days of messages to delete (0-7).'
    },
    async execute(guild, params, message) {
        if (!params.memberId) throw new Error('You need to tell me which member — either their ID or a mention.');
        
        const parsedId = params.memberId.replace(/[<@!>]/g, '');
        let targetMember = await guild.members.fetch(parsedId).catch(() => null);
        
        if (!targetMember) {
            const members = await guild.members.fetch({ query: params.memberId, limit: 1 });
            targetMember = members.first();
        }

        if (!targetMember) {
            // Check if parsedId is a valid Discord ID (Hackblock / Pre-block)
            if (/^\d{17,20}$/.test(parsedId)) {
                try {
                    await guild.bans.create(parsedId, {
                        deleteMessageSeconds: (params.deleteMessageDays || 0) * 24 * 60 * 60,
                        reason: params.reason || 'Blocked by AI Bot (User not in server)'
                    });
                    return true;
                } catch (err) {
                    throw new Error(`Couldn't block the ID ${parsedId}: ${err.message}`);
                }
            }
            throw new Error(`I couldn't find any member matching "${params.memberId}" in this server.`);
        }

        if (!targetMember.bannable || guild.members.me.roles.highest.position <= targetMember.roles.highest.position) {
            throw new Error(`I'm not able to block ${targetMember.user.username} — their role is too high for me.`);
        }

        if (message.member.id !== guild.ownerId) {
            if (message.member.roles.highest.position <= targetMember.roles.highest.position) {
                throw new Error(`You can't block ${targetMember.user.username} — their highest role is at or above yours.`);
            }
        }

        await targetMember.ban({
            deleteMessageSeconds: (params.deleteMessageDays || 0) * 24 * 60 * 60,
            reason: params.reason || 'Blocked by AI Bot'
        });
        return true;
    }
};
