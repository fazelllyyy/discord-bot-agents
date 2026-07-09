const { findRole } = require('../utils/fuzzyMatch');

module.exports = {
    name: 'editRole',
    requiredPermissions: ['ManageRoles'],
    description: 'Edits an existing role in the server. Use this when the user wants to rename a role, change its color, hoist it, make it mentionable, or edit its permissions (like ManageChannels, Administrator).',
    params: {
        roleName: 'string - The CURRENT name or mention of the role to edit.',
        newName: 'string (optional) - The NEW name to rename the role to.',
        color: 'string (optional) - HEX color code (e.g., "#FF0000").',
        hoist: 'boolean (optional) - Whether the role should be displayed separately.',
        mentionable: 'boolean (optional) - Whether the role can be mentioned by anyone.',
        addPermissions: 'array of strings (optional) - List of permissions to ADD for this role (e.g., ["ManageChannels", "Administrator"]).',
        removePermissions: 'array of strings (optional) - List of permissions to REMOVE from this role.'
    },
    async execute(guild, params, message) {
        if (!params.roleName) throw new Error('I need the name of the role you want to edit.');
        const role = await findRole(guild, params.roleName);
        
        if (!role) {
            throw new Error(`I couldn't find a role called "${params.roleName}" anywhere in this server.`);
        }

        if (guild.members.me.roles.highest.position <= role.position) {
            throw new Error(`I'm not able to edit "${role.name}" — it's at or above my highest role, so I don't have authority over it.`);
        }

        if (message.member.id !== guild.ownerId) {
            if (message.member.roles.highest.position <= role.position) {
                throw new Error(`You can't edit "${role.name}" — that role is at or above your highest role in the hierarchy.`);
            }
            if (role.permissions.has('Administrator')) {
                throw new Error(`Only the server owner can edit Administrator roles through this bot.`);
            }
        }

        // We allow editing @everyone and managed roles (like Booster), but the Discord API 
        // will naturally restrict editing name/color for @everyone or permissions for some managed roles.
        // The errorMapper will handle any Discord API rejections gracefully.

        const options = {};
        if (params.newName) options.name = params.newName;
        if (params.color) options.color = require('discord.js').resolveColor(params.color);
        if (params.hoist !== undefined) options.hoist = params.hoist;
        if (params.mentionable !== undefined) options.mentionable = params.mentionable;

        if (Object.keys(options).length > 0) {
            await role.edit(options);
        }

        if (params.addPermissions && Array.isArray(params.addPermissions)) {
            const currentPerms = role.permissions.toArray();
            const toAdd = params.addPermissions.filter(p => !currentPerms.includes(p));
            if (toAdd.length > 0) {
                if (message.member.id !== guild.ownerId) {
                    if (toAdd.includes('Administrator')) throw new Error(`Only the server owner can grant Administrator permissions.`);
                    for (const perm of toAdd) {
                        if (!message.member.permissions.has(perm)) throw new Error(`You can't grant "${perm}" — you don't have that permission yourself.`);
                    }
                }
                await role.setPermissions([...currentPerms, ...toAdd]);
            }
        }

        if (params.removePermissions && Array.isArray(params.removePermissions)) {
            const currentPerms = role.permissions.toArray();
            const toRemove = params.removePermissions.filter(p => currentPerms.includes(p));
            if (toRemove.length > 0) {
                if (message.member.id !== guild.ownerId) {
                    if (toRemove.includes('Administrator')) throw new Error(`Only the server owner can remove Administrator permissions.`);
                    for (const perm of toRemove) {
                        if (!message.member.permissions.has(perm)) throw new Error(`You can't remove "${perm}" — you don't have that permission yourself.`);
                    }
                }
                await role.setPermissions(currentPerms.filter(p => !toRemove.includes(p)));
            }
        }

        return true;
    }
};
