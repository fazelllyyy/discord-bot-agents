module.exports = {
    name: 'editServer',
    requiredPermissions: ['ManageGuild'],
    description: 'Edit server settings (name, description, verification level).',
    params: {
        name: { type: 'string', description: 'New name for the server (optional).' },
        description: { type: 'string', description: 'New description for the server. Set to empty string to remove (optional).' },
        verificationLevel: { type: 'number', description: '0=NONE, 1=LOW, 2=MEDIUM, 3=HIGH, 4=VERY_HIGH (optional).' }
    },
    async execute(guild, params, message) {
        try {
            const updates = {};
            if (params.name) updates.name = params.name;
            if (params.description !== undefined) updates.description = params.description;
            if (typeof params.verificationLevel === 'number') updates.verificationLevel = params.verificationLevel;

            if (Object.keys(updates).length === 0) {
                return 'You didn\'t provide any server settings to update.';
            }

            await guild.edit(updates, 'Edited by AI bot command');
            return `Server settings have been updated.`;
        } catch (error) {
            console.error('editServer error:', error);
            return `Something went wrong while updating the server: ${error.message}`;
        }
    }
};
