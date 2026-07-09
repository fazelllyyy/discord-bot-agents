const snipes = new Map();
const MAX_SNIPES = 5;

module.exports = {
    addSnipe: (channelId, data) => {
        if (!snipes.has(channelId)) {
            snipes.set(channelId, []);
        }
        const channelSnipes = snipes.get(channelId);
        
        // Add to the beginning of the array (newest first)
        channelSnipes.unshift(data);
        
        // Remove oldest if length exceeds max
        if (channelSnipes.length > MAX_SNIPES) {
            channelSnipes.pop();
        }
    },
    getSnipes: (channelId) => {
        return snipes.get(channelId) || [];
    }
};
