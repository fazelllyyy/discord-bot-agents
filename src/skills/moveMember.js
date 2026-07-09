const { findChannel } = require('../utils/fuzzyMatch');

module.exports = {
    name: 'moveMember',
    requiredPermissions: ['MoveMembers'],
    description: 'Move a MEMBER to another voice channel, or disconnect them from voice. ONLY for MEMBERS, NOT channels. For moving a CHANNEL to a category, use editChannel with parentCategory.',
    params: {
        memberId: { type: 'string', description: 'The ID, mention, or username of the member to move/disconnect.' },
        channelId: { type: 'string', description: '(optional) The name, ID, or mention of the target Voice/Stage channel. Omit, use null, or empty string to disconnect them from voice.' }
    },
    async execute(guild, params, message) {
        try {
            if (!params.memberId) throw new Error('You need to give me a member ID or mention to move.');
            const parsedId = params.memberId.replace(/[<@!>]/g, '');
            let member = await guild.members.fetch(parsedId).catch(() => null);
            
            if (!member) {
                const members = await guild.members.fetch({ query: params.memberId, limit: 1 });
                member = members.first();
            }

            if (!member) return `I couldn't find anyone matching "${params.memberId}" on this server.`;

            if (guild.members.me.roles.highest.position <= member.roles.highest.position) {
                return `I can't move or disconnect ${member.user.username} — my highest role isn't high enough in the hierarchy.`;
            }

            if (message.member.id !== guild.ownerId) {
                if (message.member.roles.highest.position <= member.roles.highest.position) {
                    return `You can't move or disconnect ${member.user.username} — their highest role is the same or above yours.`;
                }
            }

            if (!member.voice.channel) {
                return `${member.user.username} isn't in any voice channel right now.`;
            }
            
            if (!params.channelId || params.channelId.trim() === '') {
                await member.voice.disconnect();
                return `Done! ${member.user.username} has been disconnected from voice.`;
            } else {
                let targetChannel = await findChannel(guild, params.channelId, [2, 13]);
                
                if (targetChannel && targetChannel.nsfw && !message.channel.nsfw) {
                    throw new Error(`You can't move someone to the age-restricted channel "${targetChannel.name}" from a public channel.`);
                }

                if (targetChannel && message.member.id !== guild.ownerId) {
                    const perms = targetChannel.permissionsFor(message.member);
                    if (!perms || !perms.has('Connect') || !perms.has('ViewChannel')) {
                        throw new Error(`You don't have permission to connect to ${targetChannel.name}.`);
                    }
                }
                
                await member.voice.setChannel(targetChannel ? targetChannel.id : params.channelId);
                return `${member.user.username} has been moved to ${targetChannel ? targetChannel.name : params.channelId}.`;
            }
        } catch (error) {
            console.error('moveMember error:', error);
            return `Something went wrong trying to move or disconnect that member: ${error.message}`;
        }
    }
};
