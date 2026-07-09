const createChannel = require('./createChannel');
const deleteChannel = require('./deleteChannel');
const editChannel = require('./editChannel');
const createRole = require('./createRole');
const deleteRole = require('./deleteRole');
const sendMessage = require('./sendMessage');
const addRoleToMember = require('./addRoleToMember');
const removeRoleFromMember = require('./removeRoleFromMember');
const editRole = require('./editRole');
const removeMember = require('./removeMember');
const blockMember = require('./blockMember');
const timeoutMember = require('./timeoutMember');
const clearMessages = require('./clearMessages');
const setNickname = require('./setNickname');
const unblockMember = require('./unblockMember');
const getServerInfo = require('./getServerInfo');
const getUserInfo = require('./getUserInfo');
const getChannelInfo = require('./getChannelInfo');
const getRoleInfo = require('./getRoleInfo');
const listChannels = require('./listChannels');
const listRoles = require('./listRoles');
const listEmojis = require('./listEmojis');
const createEmoji = require('./createEmoji');
const editEmoji = require('./editEmoji');
const deleteEmoji = require('./deleteEmoji');
const muteMember = require('./muteMember');
const deafenMember = require('./deafenMember');
const moveMember = require('./moveMember');
const createInvite = require('./createInvite');
const listInvites = require('./listInvites');
const deleteInvite = require('./deleteInvite');
const editServer = require('./editServer');
const getSnipe = require('./getSnipe');
const searchServer = require('./searchServer');

// Collection of callable skills
const skills = {
    createChannel,
    deleteChannel,
    editChannel,
    createRole,
    deleteRole,
    sendMessage,
    addRoleToMember,
    removeRoleFromMember,
    editRole,
    removeMember,
    blockMember,
    timeoutMember,
    clearMessages,
    setNickname,
    unblockMember,
    getServerInfo,
    getUserInfo,
    getChannelInfo,
    getRoleInfo,
    listChannels,
    listRoles,
    listEmojis,
    createEmoji,
    editEmoji,
    deleteEmoji,
    muteMember,
    deafenMember,
    moveMember,
    createInvite,
    listInvites,
    deleteInvite,
    editServer,
    getSnipe,
    searchServer,
};

// Definitions for the AI prompt (without the execute function)
const definitions = Object.values(skills).map(s => ({
    name: s.name,
    description: s.description,
    params: s.params
}));

module.exports = {
    ...skills,           // can be called directly: skills.createChannel
    definitions         // for the AI prompt
};
