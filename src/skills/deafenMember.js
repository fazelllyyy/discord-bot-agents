module.exports = {
    name: 'deafenMember',
    requiredPermissions: ['DeafenMembers'],
    description: 'Server deafen or undeafen a member in a voice channel.',
    params: {
        memberId: { type: 'string', description: 'The ID of the member to deafen/undeafen.' },
        deaf: { type: 'boolean', description: 'true to deafen, false to undeafen.' }
    },
    async execute(guild, params, message) {
        try {
            if (!params.memberId) throw new Error('You need to tell me which member — either their ID or a mention.');
            if (params.deaf === undefined || params.deaf === null) throw new Error('I need the deaf parameter — true to deafen, false to undeafen.');
            const parsedId = params.memberId.replace(/[<@!>]/g, '');
            let member = await guild.members.fetch(parsedId).catch(() => null);
            
            if (!member) {
                const members = await guild.members.fetch({ query: params.memberId, limit: 1 });
                member = members.first();
            }

            if (!member) return `Couldn't find a member matching "${params.memberId}".`;

            if (guild.members.me.roles.highest.position <= member.roles.highest.position) {
                return `I can't deafen ${member.user.username} — their role is too high for me.`;
            }

            if (message.member.id !== guild.ownerId) {
                if (message.member.roles.highest.position <= member.roles.highest.position) {
                    return `You can't deafen ${member.user.username} — their highest role is at or above yours.`;
                }
            }

            if (!member.voice.channel) {
                return `${member.user.username} isn't in a voice channel right now.`;
            }
            await member.voice.setDeaf(params.deaf);
            return `${member.user.username} has been ${params.deaf ? 'deafened' : 'undeafened'} in voice.`;
        } catch (error) {
            console.error('deafenMember error:', error);
            return `Couldn't ${params.deaf ? 'deafen' : 'undeafen'} that member: ${error.message}`;
        }
    }
};
