module.exports = {
    name: 'listEmojis',
    description: 'Lists all emojis in the server.',
    params: {},

    async fetchRaw(guild, message) {
        let emojis = Array.from(guild.emojis.cache.values())
            .map(e => ({
                name: e.name,
                id: e.id,
                mention: e.animated ? `<a:${e.name}:${e.id}>` : `<:${e.name}:${e.id}>`,
                animated: e.animated,
                url: e.imageURL({ extension: 'png', size: 64 }),
                createdAt: e.createdAt
            }));
        return { emojis, total: emojis.length };
    },

    async execute(guild, params, message) {
        const data = await this.fetchRaw(guild, message);
        if (data.emojis.length === 0) return 'There aren\'t any emojis in this server.';
        return data.emojis.map(e => `- ${e.mention} **${e.name}** (ID: ${e.id})${e.animated ? ' [Animated]' : ''}`).join('\n');
    }
};
