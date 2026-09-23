/**
 * Resolve Discord entities from:
 *   - Mentions: <#ID> <@ID> <@!ID> <@&ID> <:name:ID> <a:name:ID>
 *   - Prefixed IDs: #123…  @123…
 *   - Raw snowflake IDs
 *   - Plain names (with optional leading # / @)
 *
 * Discord autocomplete turns #channel / @user into mention tags in message.content.
 * LLMs sometimes rewrite those to "#123…" — both must work.
 */

// Zero-width / invisible chars Discord or copy-paste may insert
const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF\u00A0]/g;

function cleanInput(value) {
    if (value == null) return '';
    return String(value).replace(INVISIBLE, '').trim();
}

// <#ID> <@ID> <@!ID> <@&ID> <:name:ID> <a:name:ID>
const MENTION_REGEX = /<(?:#|@!?|@&|a?:\w+:)(\d+)>/;

/**
 * Extract a snowflake ID from a mention, #id, @id, or raw digits.
 * Returns null if not an ID reference.
 */
function extractId(searchName) {
    const raw = cleanInput(searchName);
    if (!raw) return null;

    const mention = raw.match(MENTION_REGEX);
    if (mention) return mention[1];

    // #1487… or @1487… (LLM often strips <> from Discord mentions)
    const prefixed = raw.match(/^[#@&]!?(\d{16,20})$/);
    if (prefixed) return prefixed[1];

    if (/^\d{16,20}$/.test(raw)) return raw;

    return null;
}

/**
 * Normalize a search token for name matching (strip mention wrappers / # @).
 */
function normalizeName(searchName) {
    let raw = cleanInput(searchName);
    if (!raw) return '';

    const mention = raw.match(MENTION_REGEX);
    if (mention) return mention[1]; // fall through as id-like; callers also use extractId

    return raw.replace(/^[#@&]+/, '');
}

function findClosest(collection, searchName) {
    const raw = cleanInput(searchName);
    if (!raw || !collection) return null;

    // 1) Mention / prefixed ID / raw snowflake → cache get
    const id = extractId(raw);
    if (id) {
        const byId = collection.get(id);
        if (byId) return byId;
    }

    // 2) Name match (strip leading # / @)
    const cleanSearch = normalizeName(raw);
    if (!cleanSearch) return null;

    // If after stripping we still have a snowflake, try ID again
    if (/^\d{16,20}$/.test(cleanSearch)) {
        const byId = collection.get(cleanSearch);
        if (byId) return byId;
    }

    let found = collection.find(c => c.name === cleanSearch);
    if (found) return found;

    const lowerSearch = cleanSearch.toLowerCase();
    found = collection.find(c => c.name.toLowerCase() === lowerSearch);
    if (found) return found;

    found = collection.find(c => c.name.toLowerCase().includes(lowerSearch));
    if (found) return found;

    return null;
}

async function findChannel(guild, searchName, typeFilter) {
    let channels = guild.channels.cache;
    if (typeFilter !== undefined && typeFilter !== null) {
        const validTypes = Array.isArray(typeFilter) ? typeFilter : [typeFilter];
        channels = channels.filter(c => validTypes.includes(c.type));
    }

    let channel = findClosest(channels, searchName);
    if (channel) return channel;

    // Fetch from API if we have an ID (cache miss)
    const rawId = extractId(searchName);
    if (rawId) {
        channel = await guild.channels.fetch(rawId).catch(() => null);
        if (channel) {
            if (typeFilter !== undefined && typeFilter !== null) {
                const validTypes = Array.isArray(typeFilter) ? typeFilter : [typeFilter];
                if (!validTypes.includes(channel.type)) return null;
            }
            return channel;
        }
    }
    return null;
}

async function findRole(guild, searchName) {
    let role = findClosest(guild.roles.cache, searchName);
    if (role) return role;

    const rawId = extractId(searchName);
    if (rawId) {
        role = await guild.roles.fetch(rawId).catch(() => null);
        return role;
    }
    return null;
}

async function findEmoji(guild, searchName) {
    let emoji = findClosest(guild.emojis.cache, searchName);
    if (emoji) return emoji;

    const rawId = extractId(searchName);
    if (rawId) {
        emoji = await guild.emojis.fetch(rawId).catch(() => null);
        return emoji;
    }
    return null;
}

/**
 * Resolve a guild member from mention, ID, or username query.
 */
async function findMember(guild, searchName) {
    const raw = cleanInput(searchName);
    if (!raw) return null;

    const id = extractId(raw);
    if (id) {
        const cached = guild.members.cache.get(id);
        if (cached) return cached;
        const fetched = await guild.members.fetch(id).catch(() => null);
        if (fetched) return fetched;
    }

    const name = normalizeName(raw);
    const byUser = guild.members.cache.find(
        m => m.user.username.toLowerCase() === name.toLowerCase()
            || m.displayName.toLowerCase() === name.toLowerCase()
    );
    if (byUser) return byUser;

    const queried = await guild.members.fetch({ query: name, limit: 1 }).catch(() => null);
    if (queried && queried.size > 0) return queried.first();

    return null;
}

module.exports = {
    findClosest,
    findChannel,
    findRole,
    findEmoji,
    findMember,
    extractId,
    normalizeName,
    cleanInput,
};
