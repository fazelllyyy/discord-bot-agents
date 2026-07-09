const { findChannel } = require('../utils/fuzzyMatch');

module.exports = {
    name: 'createChannel',
    requiredPermissions: ['ManageChannels'],
    description: 'Creates a new text or voice channel, optionally within a specific category.',
    params: {
        name: 'string - channel name',
        type: 'string - "text" or "voice" (default: text)',
        categoryName: 'string (optional) - category name',
        topic: 'string (optional) - channel topic (for text channels)',
        ageRestricted: 'boolean (optional) - default false',
        position: 'number (optional)'
    },

    async execute(guild, params, message) {
        // Validate parameters
        const channelName = params.name;
        if (!channelName) throw new Error('I need a name for the channel first.');

        let channelType = 0; // GUILD_TEXT
        if (params.type === 'voice') channelType = 2; // GUILD_VOICE

        const options = {
            name: channelName,
            type: channelType,
        };

        let warning = null;

        // Find category if provided
        if (params.categoryName) {
            const category = await findChannel(guild, params.categoryName, 4);
            
            if (category) {
                options.parent = category.id;
            } else {
                warning = `I couldn't find a category matching "${params.categoryName}" — the channel was created without one.`;
            }
        }
        
        if (params.topic && channelType === 0) options.topic = params.topic;
        if (params.ageRestricted) options.nsfw = true;
        if (params.position) options.position = params.position;

        await guild.channels.create(options);
        return warning || true;
    }
};
