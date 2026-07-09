const { withRetry } = require('./retry');
const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { mapDiscordError } = require('./errorMapper');

/**
 * Executes a mass action asynchronously in the background.
 * @param {Array} targets - Array of items to process.
 * @param {Function} actionFn - Async function to run for each target: async (target) => {}
 * @param {Object} options - Options
 * @param {string} options.jobName - Name of the job for logging
 * @param {Message} options.message - Original message context to send updates to
 */
async function runMassJob(targets, actionFn, { jobName = 'Mass Job', message }) {
    // 1. Strict limit of 50
    if (targets.length > 50) {
        targets = targets.slice(0, 50);
    }

    const total = targets.length;
    if (total === 0) return;

    let completed = 0;
    let failed = 0;
    let errors = [];

    // Reply initially to indicate a background job has started
    const statusContainer = new ContainerBuilder()
        .setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${jobName}** has started. Working through ${total} item(s) (capped at 50 for safety)...`));

    const statusMsg = await message.channel.send({
        components: [statusContainer],
        flags: MessageFlags.IsComponentsV2
    });

    // Run asynchronously
    (async () => {
        for (let i = 0; i < total; i++) {
            const target = targets[i];
            try {
                // Wrap in retry mechanism
                await withRetry(async () => {
                    await actionFn(target);
                }, { label: `${jobName} Task ${i + 1}`, baseDelay: 1000 });
                completed++;
            } catch (err) {
                failed++;
                const friendlyErr = mapDiscordError(err);
                if (!errors.includes(friendlyErr)) errors.push(friendlyErr);
            }

            // Delay between requests to avoid rate limits (1 second)
            await new Promise(r => setTimeout(r, 1000));

            // Update status every 10 tasks to avoid editing too fast (which itself causes rate limits)
            if ((i + 1) % 10 === 0 && (i + 1) !== total) {
                const runningContainer = new ContainerBuilder()
                    .setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${jobName}** is in progress... [${i + 1}/${total}]`));
                await statusMsg.edit({
                    components: [runningContainer],
                    flags: MessageFlags.IsComponentsV2
                }).catch(err => console.error(`[JobManager] Failed to update status for "${jobName}": ${err.message}`));
            }
        }

        // Final update
        let finalContent = `**${jobName}** is done!\nSuccessful: ${completed} | Failed: ${failed}`;
        if (failed > 0) {
            finalContent += `\n**Failure Reasons:**\n- ${errors.join('\n- ')}`;
        }

        const completedContainer = new ContainerBuilder()
            .setAccentColor(failed > 0 ? 0xED4245 : 0x57F287) // Red if failures, Green if full success
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(finalContent));

        await statusMsg.edit({ components: [completedContainer], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error(`[JobManager] Failed to send final update for "${jobName}": ${err.message}`));
    })();

    // Returning immediately so the bot isn't blocked
    return `Background job '${jobName}' for ${total} items has been kicked off.`;
}

module.exports = {
    runMassJob
};
