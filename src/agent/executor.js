const skillRegistry = require('../skills');
const { mapDiscordError } = require('../utils/errorMapper');

function missingRequiredParams(skill, params) {
    return Object.entries(skill.params || {})
        .filter(([_, v]) => {
            const desc = typeof v === 'string' ? v : v.description || '';
            return !desc.toLowerCase().includes('(optional)');
        })
        .map(([k]) => k)
        .filter(k => params[k] == null || params[k] === '');
}

/**
 * Execute planned skill actions against Discord.
 * Returns { results, cv2Components }.
 */
async function execute(actions, message, plan) {
    const results = [];
    const cv2Components = [];

    for (const action of actions) {
        const skill = skillRegistry[action.skill];
        if (!skill) {
            results.push({ skill: action.skill, status: 'failed', error: 'Unknown skill' });
            continue;
        }

        const missing = missingRequiredParams(skill, action.params || {});
        if (missing.length > 0) {
            results.push({
                skill: action.skill,
                status: 'failed',
                error: `Missing required params: ${missing.join(', ')}`,
            });
            continue;
        }

        if (skill.requiredPermissions?.length) {
            const missingBot = skill.requiredPermissions.filter(
                p => !message.guild.members.me.permissions.has(p)
            );
            if (missingBot.length > 0) {
                results.push({
                    skill: action.skill,
                    status: 'failed',
                    error: `I am missing permissions: ${missingBot.join(', ')}`,
                });
                continue;
            }

            const isOwner = message.member.id === message.guild.ownerId;
            const isAdmin = message.member.permissions.has('Administrator');
            if (!isOwner && !isAdmin) {
                const missingUser = skill.requiredPermissions.filter(
                    p => !message.member.permissions.has(p)
                );
                if (missingUser.length > 0) {
                    results.push({
                        skill: action.skill,
                        status: 'failed',
                        error: `You are missing permissions: ${missingUser.join(', ')}`,
                    });
                    continue;
                }
            }
        }

        try {
            const execRes = await skill.execute(message.guild, action.params || {}, message, plan);

            if (execRes && typeof execRes === 'object' && execRes.cv2 && execRes.components) {
                cv2Components.push(...execRes.components);
                results.push({ skill: action.skill, status: 'success', note: 'UI components generated.' });
            } else if (execRes && typeof execRes === 'object' && execRes.imageUrl) {
                results.push({
                    skill: action.skill,
                    status: 'success',
                    result: execRes.reply || '',
                    imageUrl: execRes.imageUrl,
                });
            } else {
                results.push({ skill: action.skill, status: 'success', result: execRes });
            }
        } catch (err) {
            results.push({
                skill: action.skill,
                status: 'failed',
                error: mapDiscordError(err),
            });
        }
    }

    return { results, cv2Components };
}

module.exports = { execute };
