/**
 * Light prefetch for info queries — Discord API only (no LLM cost).
 * Helps the planner answer simple facts; list UIs still require skills.
 */
async function prefetchQueryData(userMessage, message) {
    const prefetched = {};
    const lowerMsg = userMessage.toLowerCase();

    const QUERY_TRIGGERS = {
        getServerInfo: [
            'server info', 'info server', 'informasi server', 'server owner', 'pemilik server',
            'nama server', 'siapa owner', 'how many members', 'member berapa', 'boost', 'server icon',
            'banner server', 'server id', 'about server', 'server ini',
        ],
        listChannels: [
            'list channel', 'daftar channel', 'channel list', 'all channels', 'semua channel',
            'tampilkan channel', 'channel apa', 'beri.*channel', 'berikan.*channel', 'show channel',
        ],
        listRoles: [
            'list role', 'daftar role', 'role list', 'all roles', 'semua role', 'tampilkan role', 'show role',
        ],
        listEmojis: ['list emoji', 'daftar emoji', 'all emojis', 'semua emoji', 'show emoji'],
        getUserInfo: ['user info', 'member info', 'info user', 'info member', 'who is', 'siapa', 'profil'],
        getChannelInfo: ['channel info', 'info channel', 'detail channel'],
        getRoleInfo: ['role info', 'info role', 'detail role'],
        listInvites: ['list invite', 'daftar invite', 'all invites', 'undangan'],
        getSnipe: ['snipe', 'deleted message', 'pesan dihapus'],
        searchServer: ['search', 'cari', 'find'],
    };

    for (const [skillName, triggers] of Object.entries(QUERY_TRIGGERS)) {
        const isTriggered = triggers.some(t => {
            if (t.includes('.*')) return new RegExp(t, 'i').test(lowerMsg);
            return lowerMsg.includes(t);
        });
        if (!isTriggered) continue;
        try {
            const skill = require('../skills')[skillName];
            if (skill?.fetchRaw) {
                prefetched[skillName] = await skill.fetchRaw(message.guild, message);
            }
        } catch (err) {
            console.warn(`[Pre-fetch] ${skillName}:`, err.message);
        }
    }

    return prefetched;
}

module.exports = { prefetchQueryData };
