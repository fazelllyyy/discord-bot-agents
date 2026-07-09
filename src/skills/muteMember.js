module.exports = {
    name: 'muteMember',
    requiredPermissions: ['MuteMembers'],
    description: 'Server mute or unmute a member in a voice channel.',
    params: {
        memberId: { type: 'string', description: 'The ID of the member to mute/unmute.' },
        mute: { type: 'boolean', description: 'true to mute, false to unmute.' }
    },
    async execute(guild, params, message) {
        try {
            if (!params.memberId) throw new Error('You need to tell me which member — either their ID or a mention.');
            if (params.mute === undefined || params.mute === null) throw new Error('I need a mute parameter: true to mute, false to unmute.');
            const parsedId = params.memberId.replace(/[<@!>]/g, '');
            let member = await guild.members.fetch(parsedId).catch(() => null);
            
            if (!member) {
                const members = await guild.members.fetch({ query: params.memberId, limit: 1 });
                member = members.first();
            }

            if (!member) return `I couldn't find any member matching "${params.memberId}" here.`;

            if (guild.members.me.roles.highest.position <= member.roles.highest.position) {
                return `I can't mute ${member.user.username} — my role isn't high enough in the hierarchy.`;
            }

            if (message.member.id !== guild.ownerId) {
                if (message.member.roles.highest.position <= member.roles.highest.position) {
                    return `You can't mute ${member.user.username} — their highest role matches or beats yours.`;
                }
            }

            if (!member.voice.channel) {
                return `${member.user.username} isn't connected to any voice channel right now.`;
            }
            await member.voice.setMute(params.mute);
            return `Done! ${member.user.username} has been ${params.mute ? 'muted' : 'unmuted'} in voice.`;
        } catch (error) {
            console.error('muteMember error:', error);
            return `Couldn't ${params.mute ? 'mute' : 'unmute'} that member: ${error.message}`;
        }
    }
};
