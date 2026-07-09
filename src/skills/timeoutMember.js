module.exports = {
    name: 'timeoutMember',
    requiredPermissions: ['ModerateMembers'],
    description: 'Timeouts (mutes) a member in the server for a specific duration.',
    params: {
        memberId: 'string - The ID, mention, or username of the member to timeout.',
        durationMinutes: 'number (optional) - The duration of the timeout in minutes. Defaults to 5 if not specified. Set to 0 to remove an active timeout.',
        reason: 'string (optional) - The reason for the timeout.'
    },
    async execute(guild, params, message) {
        if (!params.memberId) throw new Error('You need to tell me which member to timeout — either their ID or a mention.');
        
        const parsedId = params.memberId.replace(/[<@!>]/g, '');
        let targetMember = await guild.members.fetch(parsedId).catch(() => null);
        
        if (!targetMember) {
            const members = await guild.members.fetch({ query: params.memberId, limit: 1 });
            targetMember = members.first();
        }

        if (!targetMember) throw new Error(`I couldn't find anyone matching "${params.memberId}" here.`);

        if (!targetMember.moderatable || guild.members.me.roles.highest.position <= targetMember.roles.highest.position) {
            throw new Error(`I can't timeout ${targetMember.user.username} — my role isn't high enough in the hierarchy.`);
        }

        if (message.member.id !== guild.ownerId) {
            if (message.member.roles.highest.position <= targetMember.roles.highest.position) {
                throw new Error(`You can't timeout ${targetMember.user.username} — their highest role matches or beats yours.`);
            }
        }

        const durationMs = (params.durationMinutes ?? 5) * 60 * 1000;
        const isTimedOut = targetMember.isCommunicationDisabled();

        if (durationMs > 0 && isTimedOut) {
            throw new Error(`${targetMember.user.username} is already timed out until ${targetMember.communicationDisabledUntil.toLocaleString()} — I can't timeout them twice.`);
        }
        if (durationMs <= 0 && !isTimedOut) {
            throw new Error(`${targetMember.user.username} isn't currently timed out, so there's nothing to remove.`);
        }

        await targetMember.timeout(durationMs > 0 ? durationMs : null, params.reason || 'Timeout by AI Bot');
        return true;
    }
};
