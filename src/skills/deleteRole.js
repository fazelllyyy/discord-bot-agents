const { findRole } = require('../utils/fuzzyMatch');

module.exports = {
    name: 'deleteRole',
    requiredPermissions: ['ManageRoles'],
    description: 'Deletes an existing role from the server.',
    params: {
        roleName: 'string - The name or mention of the role to delete.'
    },
    async execute(guild, params, message) {
        if (!params.roleName) throw new Error('I need a role name to work with.');
        const role = await findRole(guild, params.roleName);
        
        if (!role) {
            throw new Error(`I couldn't find a role called "${params.roleName}" anywhere in this server.`);
        }

        if (role.id === guild.roles.everyone.id) {
            throw new Error('The @everyone role can\'t be deleted — it\'s a permanent part of Discord.');
        }

        if (role.managed) {
            throw new Error(`"${role.name}" is managed by an integration or another bot, so I can't delete it.`);
        }

        if (guild.members.me.roles.highest.position <= role.position) {
            throw new Error(`I can't delete "${role.name}" — that role is above or equal to my highest role in the hierarchy.`);
        }

        if (message.member.id !== guild.ownerId) {
            if (message.member.roles.highest.position <= role.position) {
                throw new Error(`You can't delete "${role.name}" — it's at or above your highest role in the hierarchy.`);
            }
            if (role.permissions.has('Administrator')) {
                throw new Error(`Only the Server Owner can delete Administrator roles through this bot.`);
            }
        }

        await role.delete();
        return true;
    }
};
