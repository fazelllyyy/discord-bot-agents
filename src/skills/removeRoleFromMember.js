const { findRole } = require('../utils/fuzzyMatch');

module.exports = {
    name: 'removeRoleFromMember',
    requiredPermissions: ['ManageRoles'],
    description: 'Removes a specific role from a server member. Use this when the user wants to remove a role from themselves or someone else.',
    params: {
        roleName: 'string - The name or mention of the role to remove.',
        memberId: 'string (optional) - The ID or mention of the member. If empty, defaults to the user who sent the command. Set to "all" to apply to everyone (max 50).'
    },
    async execute(guild, params, message) {
        if (!params.roleName) throw new Error('You need to tell me which role to remove.');
        
        const role = await findRole(guild, params.roleName);
        if (!role) {
            throw new Error(`I couldn't find a role called "${params.roleName}" on this server.`);
        }

        if (role.id === guild.roles.everyone.id) {
            throw new Error('You can\'t remove the @everyone role — it\'s not possible to do that manually.');
        }
        
        if (role.managed) {
            throw new Error(`I can't remove "${role.name}" — it's managed automatically by Discord (like a Server Booster, bot role, or integration role).`);
        }

        // Check hierarchy
        if (guild.members.me.roles.highest.position <= role.position) {
            throw new Error(`I can't manage "${role.name}" — it's at or above my highest role in the hierarchy.`);
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
            const targets = Array.from(guild.members.cache.filter(m => !m.user.bot && m.roles.cache.has(role.id)).values());
            
            if (targets.length === 0) return `None of the specified members have the role "${role.name}" right now.`;

            const { runMassJob } = require('../utils/jobManager');
            return await runMassJob(targets, async (member) => {
                await member.roles.remove(role);
            }, { jobName: `Remove Role ${role.name}`, message });
        }

        let targetMember = message.member;
        if (params.memberId) {
            const parsedId = params.memberId.replace(/[<@!>]/g, '');
            targetMember = await guild.members.fetch(parsedId).catch(() => null);
            
            if (!targetMember) {
                const members = await guild.members.fetch({ query: params.memberId, limit: 1 });
                targetMember = members.first();
            }

            if (!targetMember) throw new Error(`I couldn't find anyone matching "${params.memberId}" on this server.`);
        }

        if (!targetMember.roles.cache.has(role.id)) {
            return `That member doesn't have the role "${role.name}" on them.`;
        }

        await targetMember.roles.remove(role);
        return true;
    }
};
