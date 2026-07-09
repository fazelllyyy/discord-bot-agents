module.exports = {
    name: 'createRole',
    requiredPermissions: ['ManageRoles'],
    description: 'Creates a new role in the server.',
    params: {
        name: 'string - The name of the role.',
        color: 'string (optional) - HEX color code (e.g., "#FF0000" for red) or standard color name.',
        hoist: 'boolean (optional) - Whether the role should be displayed separately in the member list.',
        mentionable: 'boolean (optional) - Whether the role can be mentioned by anyone.'
    },
    async execute(guild, params, message) {
        if (!params.name) throw new Error('I need a role name to work with.');
        
        const options = {
            name: params.name,
        };
        if (params.color) options.color = require('discord.js').resolveColor(params.color);
        if (params.hoist !== undefined) options.hoist = params.hoist;
        if (params.mentionable !== undefined) options.mentionable = params.mentionable;

        const newRole = await guild.roles.create(options);
        return newRole;
    }
};
