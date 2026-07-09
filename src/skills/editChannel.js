const { findChannel } = require('../utils/fuzzyMatch');

module.exports = {
    name: 'editChannel',
    requiredPermissions: ['ManageChannels'],
    description: 'Edits an existing channel. Use this to: rename a channel, change its topic, toggle age restrictions, or MOVE it to a category (via parentCategory). IMPORTANT: Text channel new names MUST be lowercase with hyphens. Voice channels and Categories CAN have uppercase letters and spaces. Provide the exact casing requested if it is a Voice Channel or Category.',
    params: {
        currentName: 'string - The CURRENT existing name of the channel to edit (can be a mention like <#ID>). ALWAYS put the old name here.',
        channelType: 'string (optional) - "text", "voice", or "category". If the user explicitly mentions the type of channel, provide it here to ensure accuracy.',
        newName: 'string (optional) - The NEW name to rename the channel to. DO NOT put the old name here.',
        topic: 'string (optional) - The new topic for text channels.',
        ageRestricted: 'boolean (optional) - Set to true to make it age restricted, false otherwise.',
        parentCategory: 'string (optional) - The name of the category to move this channel under. Provide the category name, not ID.'
    },
    async execute(guild, params, message) {
        if (!params.currentName) throw new Error('I need the current name of the channel to look it up.');
        
        let typeFilter = null;
        if (params.channelType) {
            const typeStr = params.channelType.toLowerCase();
            if (typeStr === 'text') typeFilter = 0;
            else if (typeStr === 'voice') typeFilter = 2;
            else if (typeStr === 'category') typeFilter = 4;
        } else {
            typeFilter = [0, 2, 5, 13, 15]; // exclude categories by default
        }

        const channel = await findChannel(guild, params.currentName, typeFilter);
        
        if (!channel) {
            let typeMsg = params.channelType ? ` ${params.channelType}` : '';
            throw new Error(`I couldn't find${typeMsg} channel "${params.currentName}".`);
        }

        if (channel.nsfw && !message.channel.nsfw) {
            throw new Error(`You can't edit the age-restricted channel "${channel.name}" from a non-NSFW channel.`);
        }

        if (message.member.id !== guild.ownerId) {
            const perms = channel.permissionsFor(message.member);
            if (!perms || !perms.has('ViewChannel') || !perms.has('ManageChannels')) {
                throw new Error(`You don't have permission to view or manage "${channel.name}".`);
            }
        }

        const options = {};
        // remove accidental # prefix for the new name
        if (params.newName) options.name = params.newName.replace(/^[#]/, ''); 
        if (params.topic !== undefined && channel.type === 0) options.topic = params.topic; // GUILD_TEXT = 0
        if (params.ageRestricted !== undefined) options.nsfw = params.ageRestricted;

        if (params.parentCategory) {
            const category = await findChannel(guild, params.parentCategory, 4);
            if (!category) {
                throw new Error(`I couldn't find a category called "${params.parentCategory}".`);
            }
            if (message.member.id !== guild.ownerId) {
                const perms = category.permissionsFor(message.member);
                if (!perms || !perms.has('ViewChannel') || !perms.has('ManageChannels')) {
                    throw new Error(`You don't have permission to manage the category "${category.name}".`);
                }
            }
            options.parent = category.id;
        }
        
        await channel.edit(options);
        return true;
    }
};
