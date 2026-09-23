const { generateWithFallback } = require('../core/providerManager');
const { extractJSON } = require('../utils/jsonHelper');
const { detectLanguage, languageInstruction } = require('./language');
const { buildSummarizePrompt } = require('./prompts');
const config = require('../config');

/**
 * Phase 2: Natural language reply covering the FULL request + real results.
 */
async function summarize(userMessage, message, prefetchedData, plan, executionResults) {
    const detected = detectLanguage(userMessage);
    const system = buildSummarizePrompt(message, prefetchedData, plan, executionResults);
    const prompt = `${system}\n\n━━━ USER COMMAND ━━━\n${userMessage}\n\n━━━ RESULTS ━━━\n${JSON.stringify(executionResults)}\n\n━━━ PLAN ━━━\n${plan.reasoning}\n${JSON.stringify(plan.actions)}\n\n🚨 ${languageInstruction(detected, 'summarize')}\nReturn JSON only. Keep reply as one line (use \\n if needed).`;

    const raw = await generateWithFallback(prompt, { maxTokens: 2048 });
    const parsed = extractJSON(raw);

    if (!parsed || typeof parsed !== 'object') {
        console.warn('[Agent/Summarize] JSON parse failed. Preview:', String(raw).slice(0, 500));
        return fallbackReply(userMessage, plan, executionResults, detected);
    }

    return {
        reasoning: parsed.reasoning || '',
        reply: parsed.reply || fallbackReply(userMessage, plan, executionResults, detected).reply,
        replyFormat: parsed.replyFormat || 'text',
        imageUrl: parsed.imageUrl || null,
        colorHex: parsed.colorHex || '#2B2D31',
        imageStyle: parsed.imageStyle || null,
    };
}

function fallbackReply(userMessage, plan, executionResults, detected) {
    const id = detected.lang === 'id';
    const fails = (executionResults || []).filter(r => r.status === 'failed');
    const oks = (executionResults || []).filter(r => r.status === 'success');

    if (fails.length && !oks.length) {
        return {
            reply: id
                ? `Gagal: ${fails[0].error}`
                : `Failed: ${fails[0].error}`,
            replyFormat: 'text',
            imageUrl: null,
            colorHex: '#2B2D31',
            imageStyle: null,
        };
    }

    if (oks.length) {
        const bits = oks.map(r => {
            if (typeof r.result === 'string' && r.result) return r.result;
            if (r.note) return r.note;
            return id ? `${r.skill} berhasil.` : `${r.skill} succeeded.`;
        });
        return {
            reply: bits.join('\n'),
            replyFormat: 'text',
            imageUrl: null,
            colorHex: '#2B2D31',
            imageStyle: null,
        };
    }

    const reasoning = (plan?.reasoning || '').toLowerCase();
    if (reasoning.includes('identity')) {
        return {
            reply: config.identityMessage.replace('{botName}', process.env.BOT_NAME || 'Bot'),
            replyFormat: 'text',
            imageUrl: null,
            colorHex: '#2B2D31',
            imageStyle: null,
        };
    }

    return {
        reply: id
            ? 'Aku kurang yakin maksudnya. Coba ulangi perintah manajemen server-nya.'
            : (config.notUnderstandMessage || 'I am not sure what you meant. Please rephrase your server-management request.'),
        replyFormat: 'text',
        imageUrl: null,
        colorHex: '#2B2D31',
        imageStyle: null,
    };
}

module.exports = { summarize };
