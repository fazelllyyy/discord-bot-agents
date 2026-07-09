const { findRole } = require('../utils/fuzzyMatch');

module.exports = {
    name: 'getRoleInfo',
    description: 'Fetches information about a specific role.',
    params: {
        roleName: 'string - The name, ID, or mention of the role to inspect.'
    },

    async fetchRaw(guild, message, params = {}) {
        if (!params.roleName) return null;
        const role = await findRole(guild, params.roleName);
        if (!role) return null;

        return {
            name: role.name,
            id: role.id,
            mention: `<@&${role.id}>`,
            color: role.hexColor.toUpperCase(),
            createdAt: role.createdAt.toISOString(),
            hoist: role.hoist,
            mentionable: role.mentionable,
            permissions: role.permissions.toArray(),
            memberCount: role.members.size,
            position: role.position
        };
    },

    async execute(guild, params, message) {
        const data = await this.fetchRaw(guild, message, params);
        if (!data) throw new Error(`I couldn't find a role called "${params.roleName}" in this server.`);
        return `**Role Information: ${data.name}**
- **Mention:** ${data.mention}
- **ID:** ${data.id}
- **Color:** ${data.color}
- **Members:** ${data.memberCount}
- **Created At:** ${new Date(data.createdAt).toLocaleString()}
- **Permissions:** ${data.permissions.join(', ') || 'None'}`;
    }
};
