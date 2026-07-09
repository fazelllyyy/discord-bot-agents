const { findClosest } = require('../utils/fuzzyMatch');

module.exports = {
    name: 'searchServer',
    description: 'Searches and lists server channels, roles, emojis, or members based on a keyword. When type is not specified, auto-detects across all categories.',
    params: {
        query: 'string - The keyword to search for. Required.',
        type: 'string (optional) - The type of items to search. Valid options: "channels", "roles", "emojis", "members". If not provided, searches all types.',
        roleName: 'string (optional) - Only applicable for type "members". Filter members by this specific role name or mention.'
    },

    async fetchRaw(guild, message, params = {}) {
        const query = (params.query || '').toLowerCase().trim();

        async function searchType(type) {
            let collection;
            switch (type) {
                case 'channels':
                    collection = guild.channels.cache;
                    break;
                case 'roles':
                    collection = guild.roles.cache;
                    break;
                case 'emojis':
                    collection = guild.emojis.cache;
                    break;
                case 'members':
                    collection = await guild.members.fetch();
                    break;
                default:
                    return null;
            }

            let targetRole = null;
            if (type === 'members' && params.roleName) {
                targetRole = findClosest(guild.roles.cache, params.roleName);
                if (!targetRole) {
                    return { error: `I couldn't find a role called "${params.roleName}" on this server.` };
                }
            }

            let results = [];

            collection.forEach(item => {
                const itemName = item.user ? item.user.username : item.name;
                let matches = true;

                if (query && !itemName.toLowerCase().includes(query)) {
                    matches = false;
                }

                if (type === 'members' && targetRole && matches) {
                    if (!item.roles.cache.has(targetRole.id)) {
                        matches = false;
                    }
                }

                if (matches) {
                    let mention = null;
                    if (type === 'members') mention = `<@${item.id}>`;
                    else if (type === 'roles') mention = `<@&${item.id}>`;
                    else if (type === 'channels') mention = `<#${item.id}>`;
                    else if (type === 'emojis') mention = item.animated ? `<a:${item.name}:${item.id}>` : `<:${item.name}:${item.id}>`;

                    results.push({
                        id: item.id,
                        name: itemName,
                        type: type,
                        mention: mention
                    });
                }
            });

            return { type: type, query: query, results: results, total: results.length };
        }

        if (params.type) {
            return await searchType(params.type.toLowerCase());
        }

        // Auto-detect: search all types and return the one with most results
        const types = ['emojis', 'roles', 'channels', 'members'];
        let bestResult = null;

        for (const type of types) {
            const result = await searchType(type);
            if (result && result.results && result.results.length > 0) {
                if (!bestResult || result.results.length > bestResult.results.length) {
                    bestResult = result;
                }
            }
        }

        return bestResult || { type: 'all', query: query, results: [], total: 0 };
    },

    async execute(guild, params, message) {
        if (!params.query || !params.query.trim()) throw new Error('You need to tell me what you want to search for.');
        const data = await this.fetchRaw(guild, message, params);
        if (data && data.error) throw new Error(data.error);
        if (!data || data.results.length === 0) {
            const searchTerm = params.query ? ` matching "${params.query}"` : '';
            return `I didn't find anything${searchTerm}.`;
        }
        return data.results.map(r => `- ${r.name} (ID: ${r.id}) ${r.mention ? '- ' + r.mention : ''}`).join('\n');
    }
};
