const { createStandardUI } = require('../utils/uiBuilder');

module.exports = {
    name: 'listRoles',
    description: 'Lists all roles in the server. Returns raw data for AI to format.',
    params: {},

    async fetchRaw(guild, message) {
        let roles = Array.from(guild.roles.cache.values())
            .sort((a, b) => b.position - a.position)
            .map(r => ({
                name: r.name,
                id: r.id,
                mention: `<@&${r.id}>`,
                color: r.hexColor.toUpperCase(),
                hoist: r.hoist,
                mentionable: r.mentionable,
                memberCount: r.members.size,
                position: r.position
            }));
            
        return { roles, total: roles.length };
    },

    async execute(guild, params, message, context = {}) {
        const data = await this.fetchRaw(guild, message);
        if (data.roles.length === 0) return 'There aren\'t any roles to show.';

        if (context.replyFormat === 'embed') {
            const items = data.roles.map(r => `**${r.name}**\nID: \`${r.id}\` • ${r.mention} • ${r.memberCount} members`);
            const container = createStandardUI({
                title: 'Server Roles',
                items,
                colorHex: '#5865F2',
                ownerId: message.author.id,
                itemsPerPage: 10
            });
            return { cv2: true, components: [container] };
        }

        return data.roles.map(r => `- ${r.name} (ID: ${r.id}) - ${r.mention} - ${r.memberCount} members`).join('\n');
    }
};
