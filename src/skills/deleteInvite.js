module.exports = {
    name: 'deleteInvite',
    requiredPermissions: ['ManageChannels'],
    description: 'Delete an active invite by its code.',
    params: {
        code: { type: 'string', description: 'The invite code to delete.' }
    },
    async execute(guild, params, message) {
        try {
            if (!params.code) throw new Error('I need an invite code to work with.');

            const invite = await guild.invites.fetch(params.code).catch(() => null);
            if (!invite) {
                return `I couldn't find an invite with the code ${params.code}.`;
            }

            if (message.member.id !== guild.ownerId) {
                if (invite.channel) {
                    const perms = invite.channel.permissionsFor(message.member);
                    if (!perms || !perms.has('ViewChannel') || !perms.has('ManageChannels')) {
                        throw new Error(`You don't have permission to manage invites for "${invite.channel.name}".`);
                    }
                } else if (!message.member.permissions.has('ManageGuild')) {
                    throw new Error(`You need the ManageServer permission to delete this invite.`);
                }
            }

            await invite.delete('Deleted by AI bot command');
            return `The invite ${params.code} has been deleted.`;
        } catch (error) {
            console.error('deleteInvite error:', error);
            return `Couldn't delete the invite: ${error.message}`;
        }
    }
};
