/**
 * Maps standard Discord API errors to user-friendly messages.
 */
function mapDiscordError(err) {
    if (!err) return "Something went wrong, but I'm not sure what.";

    const code = err.code || err.status || 0;
    
    const errorMap = {
        50013: "I don't have the permissions needed for that — make sure my role is above the target in the hierarchy.",
        50001: "I can't access that channel.",
        10003: "That channel doesn't seem to exist anymore — it might have been deleted.",
        10004: "I couldn't find that server.",
        10007: "That member isn't on this server.",
        10008: "That message is gone — it might have been deleted.",
        10011: "I couldn't find that role.",
        10014: "I couldn't find that emoji.",
        30008: "This server has hit the max emoji limit already.",
        429: "Discord's API is rate-limiting us right now — give it a moment and try again.",
        50035: "The input I sent was invalid — something didn't match what Discord expects.",
    };

    if (errorMap[code]) {
        return errorMap[code];
    }

    if (err.message) {
        if (err.message.includes('Missing Permissions')) {
            return "I'm missing the permissions I need to do that.";
        }
        if (err.message.includes('Privilege is too low')) {
            return "My role isn't high enough to manage that target.";
        }
        if (err.message.includes('Must be 50 or fewer')) {
            return "I can only process up to 50 items at once for safety — that limit was exceeded.";
        }
        return `Something went wrong: ${err.message}`;
    }

    return "I couldn't reach Discord's servers — there might be a connection issue.";
}

module.exports = {
    mapDiscordError
};
