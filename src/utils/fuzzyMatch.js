// Matches all Discord mention formats:
//   <#ID> <@ID> <@!ID> <@&ID> <:name:ID> <a:name:ID>
const MENTION_REGEX = /<(?:[#@&!]+|a?:\w+:)(\d+)>/;

function extractId(searchName) {
    const m = searchName.match(MENTION_REGEX);
    if (m) return m[1];
    if (/^\d+$/.test(searchName)) return searchName;
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

function findClosest(collection, searchName) {
    if (!searchName) return null;
    
    // Extract ID from Discord mention format (channel, user, role, emoji)
    const mentionMatch = searchName.match(MENTION_REGEX);
    if (mentionMatch) {
        const id = mentionMatch[1];
        const foundById = collection.get(id);
        if (foundById) return foundById;
        searchName = id;
    }

    // Check if it's just a raw ID
    if (/^\d+$/.test(searchName)) {
        const foundById = collection.get(searchName);
        if (foundById) return foundById;
    }

    // Clean the search string by removing leading # (channels) or @ (roles)
    const cleanSearch = searchName.replace(/^[#@]/, '');
    
    let found = collection.find(c => c.name === cleanSearch);
    if (found) return found;

    const lowerSearch = cleanSearch.toLowerCase();
    found = collection.find(c => c.name.toLowerCase() === lowerSearch);
    if (found) return found;

    found = collection.find(c => c.name.toLowerCase().includes(lowerSearch));
    if (found) return found;

    return null;
}

module.exports = { findClosest, findChannel, findRole, findEmoji };
