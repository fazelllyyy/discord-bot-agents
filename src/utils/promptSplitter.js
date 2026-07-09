function splitPrompt(prompt) {
    const separator = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📥 USER COMMAND\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const separatorIdx = prompt.indexOf(separator);

    if (separatorIdx !== -1) {
        const systemPart = prompt.substring(0, separatorIdx).trim();
        let userPart = prompt.substring(separatorIdx + separator.length).trim();
        // Also strip the final reminders that come after user command
        const reminderIdx = userPart.indexOf('⚠️ FINAL REMINDER');
        if (reminderIdx !== -1) {
            userPart = userPart.substring(0, reminderIdx).trim();
        }
        return {
            system: systemPart,
            user: userPart
        };
    }

    // Fallback: try to split based on USER COMMAND
    const altSeparator = 'USER COMMAND';
    const altIdx = prompt.indexOf(altSeparator);
    if (altIdx !== -1) {
        const afterSep = prompt.substring(altIdx + altSeparator.length).trim();
        const firstNewline = afterSep.indexOf('\n');
        const userPart = firstNewline !== -1 ? afterSep.substring(firstNewline).trim() : afterSep;
        const systemPart = prompt.substring(0, altIdx).trim();
        return { system: systemPart, user: userPart };
    }

    return { system: prompt, user: '' };
}

module.exports = { splitPrompt };