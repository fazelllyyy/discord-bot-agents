/**
 * Compatibility layer for scripts/test_ai.js and older imports.
 * Real logic lives in src/agent/.
 */
const { run } = require('../agent');
const { plan } = require('../agent/planner');
const { summarize } = require('../agent/summarizer');
const { prefetchQueryData } = require('../agent/prefetch');

async function planActions(userMessage, message, prefetchedData = {}) {
    return plan(userMessage, message, prefetchedData);
}

async function summarizeResults(userMessage, message, prefetchedData, planObj, executionResults) {
    return summarize(userMessage, message, prefetchedData, planObj, executionResults);
}

/**
 * Test helper: plan + optional summarize without Discord execution.
 * Returns { actions, reasoning, reply, replyFormat } similar to older decideActions.
 */
async function decideActions(userMessage, message) {
    const prefetched = await prefetchQueryData(userMessage, message);
    const decision = await plan(userMessage, message, prefetched);
    const summary = await summarize(userMessage, message, prefetched, decision, []);
    return {
        reasoning: decision.reasoning,
        actions: decision.actions,
        reply: summary.reply,
        replyFormat: summary.replyFormat || 'text',
        imageUrl: summary.imageUrl || null,
        colorHex: summary.colorHex || '#2B2D31',
    };
}

module.exports = {
    planActions,
    summarizeResults,
    decideActions,
    run,
};
