const { findClosest } = require('../utils/fuzzyMatch');

module.exports = {
    name: 'createInvite',
    requiredPermissions: ['CreateInstantInvite'],
    description: 'Create an invite link for a specific channel.',
    params: {
        channelName: { type: 'string', description: 'The name or mention of the channel to create an invite for.' },
        channelId: { type: 'string', description: 'The ID of the channel to create an invite for.' },
        maxAge: { type: 'number', description: 'Duration of invite in seconds before expiry (0 for never). E.g. 86400 for 24 hours.' },
        maxUses: { type: 'number', description: 'Maximum number of uses (0 for unlimited). Must be a clean integer without commas.' }
    },
    async execute(guild, params, message) {
        try {
            let targetChannel;

            if (params.channelId) {
                targetChannel = await guild.channels.fetch(params.channelId).catch(() => null);
            }

            if (!targetChannel && params.channelName) {
                const channels = guild.channels.cache.filter(c => c.isTextBased());
                const parsedId = params.channelName.replace(/[<#>]/g, '');
                targetChannel = guild.channels.cache.get(parsedId) || findClosest(channels, params.channelName);
            }

            if (!targetChannel) {
                targetChannel = message.channel;
            }

            if (targetChannel.nsfw && !message.channel.nsfw) {
                return `You can't interact with "${targetChannel.name}" (age-restricted channel) from a public channel.`;
            }
            
            if (message.member.id !== guild.ownerId) {
                const perms = targetChannel.permissionsFor(message.member);
                if (!perms || !perms.has('ViewChannel') || !perms.has('CreateInstantInvite')) {
                    return `You don't have permission to view or create invites for ${targetChannel.name}.`;
                }
            }
            
            // Clean inputs
            const maxAge = parseInt(String(params.maxAge).replace(/,/g, ''), 10) || 0;
            const maxUses = parseInt(String(params.maxUses).replace(/,/g, ''), 10) || 0;

            const invite = await targetChannel.createInvite({
                maxAge: maxAge,
                maxUses: maxUses
            });

            return `Invite is ready!\nLink: ${invite.url}\nMax Uses: ${maxUses === 0 ? 'Unlimited' : maxUses}\nExpires: ${maxAge === 0 ? 'Never' : maxAge + ' seconds'}`;
        } catch (error) {
            console.error('createInvite error:', error);
            return `Couldn't create the invite: ${error.message}`;
        }
    }
};
