const { plan } = require('./planner');
const { execute } = require('./executor');
const { summarize } = require('./summarizer');
const { compose } = require('./composer');
const { prefetchQueryData } = require('./prefetch');

/**
 * Intelligence-first Discord agent (Plan → Execute → Summarize).
 *
 * Cost profile (free keys friendly, intelligence prioritized):
 *   - Empty @Bot mention: 0 LLM (handled in messageHandler)
 *   - Normal command: 2 LLM calls (plan + summarize)
 *   - Prefetch / skills: Discord API only
 *
 * Why 2 calls: one model pass cannot both choose tools AND craft a
 * grounded reply after seeing real skill results. Multi-intent needs both.
 */
async function run(userMessage, message) {
    const prefetchedData = await prefetchQueryData(userMessage, message);

    console.log(`[Agent] Planning: ${userMessage.slice(0, 100)}`);
    const decision = await plan(userMessage, message, prefetchedData);
    console.log(`[Agent] Actions=${decision.actions.length} | ${ (decision.reasoning || '').slice(0, 140)}`);

    const { results, cv2Components } = await execute(decision.actions, message, decision);

    console.log(`[Agent] Summarizing (${results.length} result(s))…`);
    const summary = await summarize(userMessage, message, prefetchedData, decision, results);
    const output = compose(summary, results, cv2Components);

    return {
        ...output,
        plan: decision,
        results,
    };
}

module.exports = { run };
