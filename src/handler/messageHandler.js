const { extractJSON } = require('../utils/jsonHelper');
const { planActions, summarizeResults } = require('../core/ai');
const config = require('../config');
const { ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags } = require('discord.js');

// ============================================================================
// PRE-FETCH QUERY DATA (unchanged heuristic keyword matching)
// ============================================================================

async function prefetchQueryData(userMessage, message) {
    const prefetched = {};
    const lowerMsg = userMessage.toLowerCase();

    const QUERY_TRIGGERS = {
        getServerInfo: [
            'server info', 'server information', 'info server', 'informasi server',
            'server owner', 'server name', 'who is the owner', 'pemilik server', 'nama server', 'siapa owner',
            'server description', 'deskripsi server', 'how many members', 'member berapa',
            'how many channels', 'channel berapa', 'how many roles', 'role berapa',
            'how many emojis', 'emoji berapa', 'when was the server created', 'kapan server dibuat',
            'this server', 'about server', 'server details', 'server ini', 'boost level', 'premium tier',
            'server icon', 'server banner', 'icon server', 'banner server', 'boost server', 'server id'
        ],
        listChannels: [
            'list channels', 'channel list', 'what channels are there',
            'all channels', 'show channels', 'list channel', 'daftar channel', 'channel apa saja',
            'semua channel', 'tampilkan channel', 'kategori', 'category', 'voice channel', 'text channel',
            'stage channel', 'forum', 'announcement channel', 'kategori channel'
        ],
        listRoles: [
            'list roles', 'role list', 'what roles are there',
            'all roles', 'show roles', 'list role', 'daftar role', 'role apa saja',
            'semua role', 'tampilkan role', 'admin', 'administrator', 'moderator', 'semua izin', 'all permissions'
        ],
        listEmojis: [
            'list emojis', 'emoji list', 'all emojis', 'show emojis',
            'list emoji', 'daftar emoji', 'semua emoji', 'tampilkan emoji', 'list emoticon'
        ],
        getUserInfo: [
            'user info', 'member info', 'who is', 'user id', 'id user',
            'profile', 'about user', 'info user', 'info member', 'siapa', 'profil', 'tentang user',
            'kapan akun dibuat', 'account created', 'kapan bergabung', 'joined at', 'is bot', 'apakah bot'
        ],
        getChannelInfo: [
            'channel info', 'channel details', 'about channel', 'info channel', 'detail channel', 'channel id', 'id channel', 'nsfw'
        ],
        getRoleInfo: [
            'role info', 'role details', 'about role', 'info role', 'detail role', 'role id', 'id role', 'izin role', 'role permissions'
        ],
        listInvites: [
            'list invites', 'invite list', 'all invites', 'list invite', 'daftar invite', 'semua invite', 'undangan', 'invitation'
        ],
        getSnipe: [
            'snipe', 'deleted message', 'deleted messages', 'pesan dihapus', 'hapus pesan'
        ],
        searchServer: [
            'search', 'find', 'cari', 'emoji', 'emoticon', 'stiker', 'sticker'
        ]
    };

    for (const [skillName, triggers] of Object.entries(QUERY_TRIGGERS)) {
        const isTriggered = triggers.some(t => lowerMsg.includes(t));
        if (isTriggered) {
            try {
                const skill = require('../skills')[skillName];
                if (skill && skill.fetchRaw) {
                    const rawData = await skill.fetchRaw(message.guild, message);
                    prefetched[skillName] = rawData;
                }
            } catch (err) {
                console.warn(`[Pre-fetch] Failed to pre-fetch ${skillName}:`, err.message);
            }
        }
    }

    return prefetched;
}

// ============================================================================
// RENDER FINAL REPLY
// Handles 4 modes: plain text, text+image, CV2 embed, CV2 components
// Enforces Discord limits: 2000 chars text, 4000 chars CV2, 40 components
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

async function renderFinalReply(thinkingMsg, result, message, allCv2Components = []) {
    const replyFormat = result.replyFormat || "text";
    const replyText = result.reply && result.reply.trim().length > 0 ? result.reply : "";
    const imageUrl = result.imageUrl || null;
    const colorHex = result.colorHex && /^#[0-9a-f]{6}$/i.test(result.colorHex)
        ? parseInt(result.colorHex.replace('#', ''), 16)
        : 0x2B2D31;

    const safeText = enforceTextLimit(replyText, DISCORD_MSG_LIMIT);

    if (replyText.length === 0 && (!allCv2Components || allCv2Components.length === 0)) {
        await thinkingMsg.edit({
            content: "Done.",
            components: [],
            flags: 0,
            allowedMentions: noMentions
        });
        return;
    }

    // ── CV2 Components mode (from query skills: listChannels, listRoles, etc.) ──
    if (allCv2Components && allCv2Components.length > 0) {
        let combined = [...allCv2Components];

        if (replyText.length > 0) {
            const limit = CV2_TEXT_LIMIT;
            const short = enforceTextLimit(replyText, limit);
            const textDisplay = new TextDisplayBuilder().setContent(short);
            const replyContainer = new ContainerBuilder()
                .addTextDisplayComponents(textDisplay);
            combined.unshift(replyContainer);
        }

        // Enforce 40-component limit — progressive reduction
        while (countComponents(combined) > CV2_COMPONENT_LIMIT) {
            combined = combined.slice(0, Math.max(combined.length - 5, 1));
        }

        await thinkingMsg.edit({
            content: "",
            components: combined,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: noMentions
        });
        return;
    }

    // ── CV2 Embed mode (when user explicitly asks "dalam embed") ──
    if (replyFormat === 'embed') {
        const short = enforceTextLimit(replyText, Math.min(CV2_TEXT_LIMIT, 2000));
        const container = new ContainerBuilder()
            .setAccentColor(colorHex);

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
            content: "",
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: noMentions
        });
        return;
    }

    // ── Plain text with image attachment ──
    if (imageUrl) {
        await thinkingMsg.edit({
            content: safeText,
            files: [imageUrl],
            components: [],
            flags: 0,
            allowedMentions: noMentions
        });
        return;
    }

    // ── Plain text only (DEFAULT) ──
    await thinkingMsg.edit({
        content: safeText,
        components: [],
        flags: 0,
        allowedMentions: noMentions
    });
}

// ============================================================================
// RATE LIMITER — simple in-memory cooldown per user
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
// MAIN HANDLER — TWO-PHASE ARCHITECTURE
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

    if (!sanitizedPrompt) {
        const greeting = config.defaultGreeting.replace('{botName}', client.user.username);
        const greetingContainer = new ContainerBuilder()
            .setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(greeting));
        return message.reply({ components: [greetingContainer], flags: MessageFlags.IsComponentsV2 });
    }

    let thinkingMsg;
    try {
        thinkingMsg = await message.reply("Thinking...");
    } catch {
        return;
    }

    try {
        // ── Pre-fetch query data ──
        const prefetchedData = await prefetchQueryData(sanitizedPrompt, message);

        let contextPrompt = sanitizedPrompt;
        if (message.attachments && message.attachments.size > 0) {
            const attachmentInfo = message.attachments.map(a => `[Attachment: ${a.name || 'file'} - ${a.url}]`).join('\n');
            contextPrompt = `${attachmentInfo}\n\n${sanitizedPrompt}`;
        }

        // ════════════════════════════════════════════════
        // PHASE 1: PLAN  — AI determines what actions to take
        // ════════════════════════════════════════════════
        const plan = await planActions(contextPrompt, message, prefetchedData);

        if (!plan || !Array.isArray(plan.actions)) {
            plan.actions = [];
        }

        if (plan.actions.length > 5) {
            plan.actions = plan.actions.slice(0, 5);
        }

        // ── Deduplicate identical actions ──
        const seen = new Set();
        plan.actions = plan.actions.filter(a => {
            const key = a.skill + ':' + JSON.stringify(Object.entries(a.params || {}).sort());
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // ════════════════════════════════════════════════
        // EXECUTION  — run all planned skills
        // ════════════════════════════════════════════════
        const skillRegistry = require('../skills');
        const executionResults = [];
        let allCv2Components = [];

        for (const action of plan.actions) {
            const skill = skillRegistry[action.skill];
            if (!skill) {
                executionResults.push({ skill: action.skill, status: 'failed', error: 'Unknown skill' });
                continue;
            }

            // ── Pre-validate required params ──
            const missingRequired = Object.entries(skill.params || {})
                .filter(([_, v]) => {
                    const desc = typeof v === 'string' ? v : v.description || '';
                    return !desc.toLowerCase().includes('(optional)');
                })
                .map(([k]) => k)
                .filter(k => action.params[k] == null);
            if (missingRequired.length > 0) {
                executionResults.push({ skill: action.skill, status: 'failed', error: `Missing required params: ${missingRequired.join(', ')}` });
                continue;
            }

            if (skill.requiredPermissions && skill.requiredPermissions.length > 0) {
                const missingBot = skill.requiredPermissions.filter(p => !message.guild.members.me.permissions.has(p));
                if (missingBot.length > 0) {
                    executionResults.push({ skill: action.skill, status: 'failed', error: `I am missing required permissions to do this: ${missingBot.join(', ')}` });
                    continue;
                }

                const isOwner = message.member.id === message.guild.ownerId;
                const isAdmin = message.member.permissions.has('Administrator');
                if (!isOwner && !isAdmin) {
                    const missingUser = skill.requiredPermissions.filter(p => !message.member.permissions.has(p));
                    if (missingUser.length > 0) {
                        executionResults.push({ skill: action.skill, status: 'failed', error: `You are missing required permissions to do this: ${missingUser.join(', ')}` });
                        continue;
                    }
                }
            }

            try {
                const execRes = await skill.execute(message.guild, action.params, message, plan);

                if (execRes && typeof execRes === 'object' && execRes.imageUrl) {
                    executionResults.push({ skill: action.skill, status: 'success', result: execRes.reply || '', imageUrl: execRes.imageUrl });
                } else if (execRes && execRes.cv2 && execRes.components) {
                    allCv2Components.push(...execRes.components);
                    executionResults.push({ skill: action.skill, status: 'success', note: 'UI components generated.' });
                } else {
                    executionResults.push({ skill: action.skill, status: 'success', result: execRes });
                }
            } catch (skillErr) {
                const { mapDiscordError } = require('../utils/errorMapper');
                const friendlyMsg = mapDiscordError(skillErr);
                executionResults.push({ skill: action.skill, status: 'failed', error: friendlyMsg });
            }
        }

        // ── Background job check: skip Phase 2 only if it's the sole result ──
        const massJobResult = executionResults.find(r => typeof r.result === 'string' && r.result.startsWith('Background job'));
        if (massJobResult && executionResults.length === 1) {
            await thinkingMsg.edit({
                content: massJobResult.result,
                components: [],
                flags: 0
            });
            return;
        }
        if (massJobResult) {
            executionResults.push({ skill: 'background', status: 'info', result: massJobResult.result });
        }

        // ════════════════════════════════════════════════
        // PHASE 2: SUMMARIZE  — AI crafts reply based on actual results
        // ════════════════════════════════════════════════
        const summary = await summarizeResults(
            contextPrompt,
            message,
            prefetchedData,
            plan,
            executionResults
        );

        // Combine CV2 components (from query skills like listChannels) with summary reply
        await renderFinalReply(thinkingMsg, summary, message, allCv2Components);

    } catch (error) {
        console.error('Handler Error:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(0xED4245)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('An error occurred while processing the command. Please try again later.'));
        await thinkingMsg.edit({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
    } finally {
        try {
            const { advanceProvider } = require('../core/providerManager');
            advanceProvider();
        } catch { /* ignore */ }
    }
}

module.exports = { handleMessage };
