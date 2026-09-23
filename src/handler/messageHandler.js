const { run: runAgent } = require('../agent');
const config = require('../config');
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
} = require('discord.js');

// ============================================================================
// RENDER — Discord output (text / image / CV2)
// ============================================================================

const CV2_TEXT_LIMIT = 4000;
const DISCORD_MSG_LIMIT = 2000;
const CV2_COMPONENT_LIMIT = 40;
const noMentions = { parse: [] };

function enforceTextLimit(text, limit) {
    if (!text || text.length <= limit) return text || '';
    return text.substring(0, limit - 3) + '...';
}

function countComponents(arr) {
    if (!arr) return 0;
    let count = 0;
    for (const item of arr) {
        count++;
        if (item.components) count += countComponents(item.components);
    }
    return count;
}

async function renderFinalReply(thinkingMsg, result) {
    const replyFormat = result.replyFormat || 'text';
    const replyText = result.reply && result.reply.trim().length > 0 ? result.reply : '';
    const imageUrl = result.imageUrl || null;
    const allCv2Components = result.cv2Components || [];
    const colorHex = result.colorHex && /^#[0-9a-f]{6}$/i.test(result.colorHex)
        ? parseInt(result.colorHex.replace('#', ''), 16)
        : 0x2B2D31;

    const safeText = enforceTextLimit(replyText, DISCORD_MSG_LIMIT);

    if (replyText.length === 0 && allCv2Components.length === 0) {
        await thinkingMsg.edit({
            content: 'Done.',
            components: [],
            flags: 0,
            allowedMentions: noMentions,
        });
        return;
    }

    if (allCv2Components.length > 0) {
        let combined = [...allCv2Components];
        if (replyText.length > 0) {
            const short = enforceTextLimit(replyText, CV2_TEXT_LIMIT);
            const replyContainer = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(short));
            combined.unshift(replyContainer);
        }
        while (countComponents(combined) > CV2_COMPONENT_LIMIT) {
            combined = combined.slice(0, Math.max(combined.length - 5, 1));
        }
        await thinkingMsg.edit({
            content: '',
            components: combined,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: noMentions,
        });
        return;
    }

    if (replyFormat === 'embed') {
        const short = enforceTextLimit(replyText, Math.min(CV2_TEXT_LIMIT, 2000));
        const container = new ContainerBuilder().setAccentColor(colorHex);
        if (imageUrl) {
            const imageStyle = result.imageStyle || 'attachment';
            if (imageStyle === 'thumbnail') {
                container.addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(short))
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(imageUrl))
                );
            } else {
                container
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(short))
                    .addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(
                            new MediaGalleryItemBuilder().setURL(imageUrl)
                        )
                    );
            }
        } else {
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(short));
        }
        await thinkingMsg.edit({
            content: '',
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: noMentions,
        });
        return;
    }

    if (imageUrl) {
        await thinkingMsg.edit({
            content: safeText,
            files: [imageUrl],
            components: [],
            flags: 0,
            allowedMentions: noMentions,
        });
        return;
    }

    await thinkingMsg.edit({
        content: safeText,
        components: [],
        flags: 0,
        allowedMentions: noMentions,
    });
}

// ============================================================================
// RATE LIMIT
// ============================================================================

const userCooldowns = new Map();
const COOLDOWN_MS = 2000;

function checkCooldown(userId) {
    const now = Date.now();
    const last = userCooldowns.get(userId) || 0;
    if (now - last < COOLDOWN_MS) return true;
    userCooldowns.set(userId, now);
    return false;
}

// ============================================================================
// MAIN HANDLER — Discord adapter; LLM agent owns understanding
// ============================================================================

async function handleMessage(message, client) {
    if (!message.guild) return;
    if (checkCooldown(message.author.id)) return;

    const botMention = message.content.match(config.botPrefix);
    if (!botMention) return;

    const botId = botMention[1];
    if (botId !== client.user.id) return;

    const contentAfterMention = message.content.replace(botMention[0], '').trim();

    const sanitizedPrompt = contentAfterMention
        .replace(/\bn[\s-]*s[\s-]*f[\s-]*w\b/gi, 'age restricted')
        .replace(/\bb[\s-]*a[\s-]*n\b/gi, 'block')
        .replace(/\bk[\s-]*i[\s-]*c[\s-]*k\b/gi, 'remove')
        .replace(/\bu[\s-]*n[\s-]*b[\s-]*a[\s-]*n\b/gi, 'unblock');

    // Empty mention only — everything else goes through the agent (incl. "hi", multi-intent, ambiguous)
    if (!sanitizedPrompt) {
        const greeting = config.defaultGreeting.replace('{botName}', client.user.username);
        const greetingContainer = new ContainerBuilder()
            .setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(greeting));
        return message.reply({ components: [greetingContainer], flags: MessageFlags.IsComponentsV2 });
    }

    let thinkingMsg;
    try {
        thinkingMsg = await message.reply('Thinking...');
    } catch {
        return;
    }

    try {
        let contextPrompt = sanitizedPrompt;
        if (message.attachments?.size > 0) {
            const attachmentInfo = message.attachments
                .map(a => `[Attachment: ${a.name || 'file'} - ${a.url}]`)
                .join('\n');
            contextPrompt = `${attachmentInfo}\n\n${sanitizedPrompt}`;
        }

        const result = await runAgent(contextPrompt, message);
        await renderFinalReply(thinkingMsg, result);
    } catch (error) {
        console.error('Handler Error:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(0xED4245)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    'An error occurred while processing the command. Please try again later.'
                )
            );
        await thinkingMsg.edit({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
    } finally {
        try {
            const { advanceProvider } = require('../core/providerManager');
            advanceProvider();
        } catch { /* ignore */ }
    }
}

module.exports = { handleMessage };
