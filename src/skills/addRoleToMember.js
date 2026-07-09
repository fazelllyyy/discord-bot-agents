const { findRole } = require('../utils/fuzzyMatch');

module.exports = {
    name: 'addRoleToMember',
    requiredPermissions: ['ManageRoles'],
    description: 'Adds a specific role to a server member. Use this when the user wants to give a role to themselves or someone else.',
    params: {
        roleName: 'string - The name or mention of the role to add.',
        memberId: 'string (optional) - The ID or mention of the member. If empty, defaults to the user who sent the command. Set to "all" to apply to everyone (max 50).'
    },
    async execute(guild, params, message) {
        if (!params.roleName) throw new Error('I need a role name to work with.');
        
        const role = await findRole(guild, params.roleName);
        if (!role) {
            throw new Error(`I couldn't find a role called "${params.roleName}" anywhere in this server.`);
        }

        if (role.id === guild.roles.everyone.id) {
            throw new Error('The @everyone role can\'t be assigned manually — it\'s built into Discord.');
        }
        
        if (role.managed) {
            throw new Error(`"${role.name}" is managed by Discord itself (like a Booster or bot role), so I can't assign it.`);
        }

        // Check hierarchy
        if (guild.members.me.roles.highest.position <= role.position) {
            throw new Error(`I can't manage "${role.name}" — that role is above or equal to my highest role in the hierarchy.`);
        }

        if (message.member.id !== guild.ownerId) {
            if (message.member.roles.highest.position <= role.position) {
                throw new Error(`You can't manage "${role.name}" — it's at or above your highest role in the hierarchy.`);
            }
            if (role.permissions.has('Administrator')) {
                throw new Error(`For security reasons, only the Server Owner can manage Administrator roles through this bot.`);
            }
        }

        if (params.memberId && params.memberId.toLowerCase() === 'all') {
            await guild.members.fetch();
            const targets = Array.from(guild.members.cache.filter(m => !m.user.bot && !m.roles.cache.has(role.id)).values());
            
            if (targets.length === 0) return `Every matching member already has the role "${role.name}".`;

            const { runMassJob } = require('../utils/jobManager');
            return await runMassJob(targets, async (member) => {
                await member.roles.add(role);
            }, { jobName: `Add Role ${role.name}`, message });
        }

        let targetMember = message.member;
        if (params.memberId) {
            const parsedId = params.memberId.replace(/[<@!>]/g, '');
            targetMember = await guild.members.fetch(parsedId).catch(() => null);
            
            if (!targetMember) {
                const members = await guild.members.fetch({ query: params.memberId, limit: 1 });
                targetMember = members.first();
            }

            if (!targetMember) throw new Error(`I couldn't find any member matching "${params.memberId}" in this server.`);
        }

        if (targetMember.roles.cache.has(role.id)) {
            return `That member already has the role "${role.name}".`;
        }

        await targetMember.roles.add(role);
        return true;
    }
};
