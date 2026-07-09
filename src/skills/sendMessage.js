const { findChannel } = require('../utils/fuzzyMatch');

module.exports = {
    name: 'sendMessage',
    requiredPermissions: ['SendMessages'],
    description: 'Sends a specific message to a target channel.',
    params: {
        channelName: 'string - The name or mention of the channel to send the message to.',
        content: 'string - The message content to send.'
    },
    async execute(guild, params, message) {
        if (!params.channelName || !params.content) throw new Error('I need both a channel name and the message content to send.');
        const channel = await findChannel(guild, params.channelName, [0, 5, 15]);
        
        if (!channel) {
            throw new Error(`I couldn't find a text channel called "${params.channelName}" here.`);
        }

        if (channel.nsfw && !message.channel.nsfw) {
            throw new Error(`You can't send messages to the age-restricted channel "${channel.name}" from a public channel.`);
        }

        const botPermissions = channel.permissionsFor(guild.members.me);
        if (!botPermissions.has('ViewChannel') || !botPermissions.has('SendMessages')) {
            throw new Error(`I don't have permission to see or send messages in ${channel.name}.`);
        }

        if (message.member.id !== guild.ownerId) {
            const perms = channel.permissionsFor(message.member);
            if (!perms || !perms.has('ViewChannel') || !perms.has('SendMessages')) {
                throw new Error(`You don't have permission to see or send messages in ${channel.name}.`);
            }
        }
        const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
        const container = new ContainerBuilder()
            .setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(params.content));
            
        await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
        return true;
    }
};
