module.exports = {
    name: 'setNickname',
    requiredPermissions: ['ManageNicknames'],
    description: 'Changes the nickname of a member in the server.',
    params: {
        memberId: 'string - The ID, mention, or username of the member.',
        nickname: 'string (optional) - The new nickname. Empty string or omit to reset the nickname.',
        reason: 'string (optional) - The reason for changing the nickname.'
    },
    async execute(guild, params, message) {
        if (!params.memberId) throw new Error('You need to tell me which member — either their ID or a mention.');
        
        const parsedId = params.memberId.replace(/[<@!>]/g, '');
        let targetMember = await guild.members.fetch(parsedId).catch(() => null);
        
        if (!targetMember) {
            const members = await guild.members.fetch({ query: params.memberId, limit: 1 });
            targetMember = members.first();
        }

        if (!targetMember) throw new Error(`I couldn't find anyone matching "${params.memberId}" here.`);

        if (guild.members.me.roles.highest.position <= targetMember.roles.highest.position && targetMember.id !== guild.members.me.id) {
            throw new Error(`I can't change ${targetMember.user.username}'s nickname — my role isn't high enough in the hierarchy.`);
        }

        if (message.member.id !== guild.ownerId) {
            if (message.member.roles.highest.position <= targetMember.roles.highest.position && targetMember.id !== message.member.id) {
                throw new Error(`You can't change ${targetMember.user.username}'s nickname — their highest role matches or beats yours.`);
            }
        }

        await targetMember.setNickname(params.nickname || null, params.reason || 'Changed by AI Bot');
        return true;
    }
};
