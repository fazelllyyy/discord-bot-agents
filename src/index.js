require('dotenv').config({ quiet: true });
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const { handleMessage } = require('./handler/messageHandler');
const config = require('./config');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once(Events.ClientReady, async () => {
    try {
      await client.user.setPresence({
        activities: [{ name: `/help | ${client.user.username}`, type: ActivityType.Custom }],
        status: "online",
    })
  } catch (error) {
    console.error('Error setting presence:', error);
  }
});

const { handlePaginationInteraction } = require('./utils/uiBuilder');
const { addSnipe } = require('./utils/snipeManager');

client.on('messageDelete', (message) => {
    if (message.partial || message.author?.bot) return; // Ignore partials and bots
    if (!message.guild) return; // Only track guild messages

    addSnipe(message.channel.id, {
        content: message.content,
        authorId: message.author.id,
        authorUsername: message.author.username,
        authorAvatar: message.author.displayAvatarURL(),
        timestamp: message.createdTimestamp,
        image: message.attachments.first()?.url || null
    });
});

client.on('messageCreate', async (message) => {
    // Ignore messages from bots or DMs (adjust if necessary)
    if (message.author.bot) return;
    if (!message.guild) return; // Only process server messages

    await handleMessage(message, client);
});

client.on('interactionCreate', async (interaction) => {
    try {
        await handlePaginationInteraction(interaction);
    } catch (error) {
        console.error('Interaction Error:', error);
    }
});

client.login(process.env.DISCORD_TOKEN);
