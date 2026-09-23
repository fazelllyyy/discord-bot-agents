const { generateWithFallback } = require('../core/providerManager');
const { extractJSON } = require('../utils/jsonHelper');
const { detectLanguage, languageInstruction } = require('./language');
const { buildPlanningPrompt } = require('./prompts');

/**
 * Phase 1: Plan ALL actions for the full user request (multi-intent aware).
 */
async function plan(userMessage, message, prefetchedData = {}) {
    const detected = detectLanguage(userMessage);
    const system = buildPlanningPrompt(message, prefetchedData);
    const prompt = `${system}\n\n━━━ USER COMMAND ━━━\n${userMessage}\n\n🚨 ${languageInstruction(detected, 'plan')}\nReturn JSON only: {"reasoning":"...","actions":[...]} — no reply field.`;

    const raw = await generateWithFallback(prompt, { maxTokens: 2048 });
    const parsed = extractJSON(raw);

    if (!parsed || typeof parsed !== 'object') {
        console.warn('[Agent/Plan] JSON parse failed. Preview:', String(raw).slice(0, 400));
        return { reasoning: 'Parse failure', actions: [] };
    }

    let actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    actions = actions
        .filter(a => a && typeof a.skill === 'string')
        .map(a => ({
            skill: a.skill,
            params: a.params && typeof a.params === 'object' ? a.params : {},
        }))
        .slice(0, 5);

    const seen = new Set();
    actions = actions.filter(a => {
        const key = a.skill + ':' + JSON.stringify(Object.entries(a.params).sort());
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return {
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
        actions,
    };
}

module.exports = { plan };
