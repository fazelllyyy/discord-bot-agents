/**
 * Split the combined prompt into system + user parts for chat APIs.
 * Must stay in sync with separators used in src/core/ai.js.
 */
function splitPrompt(prompt) {
    // Primary separator used by planActions / summarizeResults
    const separators = [
        '━━━ USER COMMAND ━━━',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📥 USER COMMAND\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        'USER COMMAND',
    ];

    for (const separator of separators) {
        const idx = prompt.indexOf(separator);
        if (idx === -1) continue;

        const systemPart = prompt.substring(0, idx).trim();
        let userPart = prompt.substring(idx + separator.length).trim();

        // Drop leading decorative dashes left by "━━━ USER COMMAND ━━━"
        userPart = userPart.replace(/^━+\s*/, '').trim();

        return {
            system: systemPart || prompt,
            user: userPart || prompt,
        };
    }

    // No separator — treat entire prompt as user content (providers that need a message)
    return { system: '', user: prompt };
}

module.exports = { splitPrompt };
