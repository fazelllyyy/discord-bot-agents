const { findChannel } = require('../utils/fuzzyMatch');

module.exports = {
    name: 'deleteChannel',
    requiredPermissions: ['ManageChannels'],
    description: 'Deletes an existing channel.',
    params: {
        channelName: 'string - The name or mention of the channel to delete.',
        channelType: 'string (optional) - "text", "voice", or "category". If the user explicitly mentions the type of channel, provide it here to ensure accuracy.'
    },
    async execute(guild, params, message) {
        if (!params.channelName) throw new Error('I need a name for the channel first.');
        
        let typeFilter = null;
        if (params.channelType) {
            const typeStr = params.channelType.toLowerCase();
            if (typeStr === 'text') typeFilter = 0;
            else if (typeStr === 'voice') typeFilter = 2;
            else if (typeStr === 'category') typeFilter = 4;
        } else {
            typeFilter = [0, 2, 5, 13, 15]; // exclude categories by default
        }

        const channel = await findChannel(guild, params.channelName, typeFilter);
        
        if (!channel) {
            let typeMsg = params.channelType ? ` ${params.channelType}` : '';
            throw new Error(`I couldn't find a${typeMsg} channel named "${params.channelName}" in this server.`);
        }

        if (channel.nsfw && !message.channel.nsfw) {
            throw new Error(`You can't delete "${channel.name}" (age-restricted) from a public channel.`);
        }

        if (message.member.id !== guild.ownerId) {
            const perms = channel.permissionsFor(message.member);
            if (!perms || !perms.has('ViewChannel') || !perms.has('ManageChannels')) {
                throw new Error(`You don't have permission to view or delete "${channel.name}".`);
            }
        }

        await channel.delete();
        return true;
    }
};
