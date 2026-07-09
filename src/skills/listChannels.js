const { createStandardUI } = require('../utils/uiBuilder');

module.exports = {
    name: 'listChannels',
    description: 'Lists all channels in the server. Returns raw data for AI to format.',
    params: {
        type: 'string (optional) - Filter by channel type: "text", "voice", "category". If "tree" format is used, type filter applies after tree is built.',
        categoryName: 'string (optional) - Only channels under this category.',
        format: 'string (optional) - "list" (default, flat list) or "tree" (organized by category with tree indentation). Use "tree" for hierarchical view.'
    },

    async fetchRaw(guild, message) {
        const channelTypeMap = { 0: 'Text', 2: 'Voice', 4: 'Category', 5: 'Announcement', 13: 'Stage', 15: 'Forum' };
        const channels = Array.from(guild.channels.cache.values()).map(c => ({
            name: c.name,
            id: c.id,
            mention: `<#${c.id}>`,
            type: channelTypeMap[c.type] || 'Unknown',
            typeCode: c.type,
            nsfw: c.nsfw || false,
            topic: c.topic || null,
            parentName: c.parent?.name || null,
            parentId: c.parentId,
            position: c.position,
            rawPosition: c.rawPosition,
        }));
        return { channels, total: channels.length };
    },

    async execute(guild, params, message, context = {}) {
        const data = await this.fetchRaw(guild, message);
        const format = params.format || 'list';
        const typeFilter = params.type ? params.type.toLowerCase() : null;

        if (context.replyFormat === 'embed') {
            let items = [];
            if (format === 'tree') {
                const categories = data.channels.filter(c => c.typeCode === 4).sort((a, b) => a.rawPosition - b.rawPosition);
                const uncategorized = data.channels
                    .filter(c => c.typeCode !== 4 && !c.parentId)
                    .sort((a, b) => a.rawPosition - b.rawPosition);

                for (const ch of uncategorized) {
                    if (typeFilter && ch.type.toLowerCase() !== typeFilter) continue;
                    items.push(`├── ${ch.name} (${ch.type}) ${ch.mention}`);
                }

                for (const cat of categories) {
                    if (typeFilter && cat.type.toLowerCase() !== typeFilter) continue;
                    items.push(`**${cat.name}**`);
                    const children = data.channels
                        .filter(c => c.parentId === cat.id && c.typeCode !== 4)
                        .sort((a, b) => a.rawPosition - b.rawPosition);
                    for (const child of children) {
                        if (typeFilter && child.type.toLowerCase() !== typeFilter) continue;
                        items.push(` ├── ${child.name} (${child.type}) ${child.mention}`);
                    }
                }
            } else {
                let channels = data.channels;
                if (params.type) {
                    channels = channels.filter(c => c.type.toLowerCase() === params.type.toLowerCase());
                }
                if (params.categoryName) {
                    channels = channels.filter(c => c.parentName && c.parentName.toLowerCase().includes(params.categoryName.toLowerCase()));
                }
                items = channels.map(c => `- **${c.name}** (${c.type}) - ${c.mention}`);
            }

            if (items.length === 0) return 'No channels match what you\'re looking for.';

            const container = createStandardUI({
                title: 'Server Channels',
                items,
                colorHex: '#5865F2',
                ownerId: message.author.id,
                itemsPerPage: 15
            });
            return { cv2: true, components: [container] };
        }

        if (format === 'tree') {
            const categories = data.channels.filter(c => c.typeCode === 4).sort((a, b) => a.rawPosition - b.rawPosition);
            const uncategorized = data.channels
                .filter(c => c.typeCode !== 4 && !c.parentId)
                .sort((a, b) => a.rawPosition - b.rawPosition);

            let lines = [];
            for (const ch of uncategorized) {
                if (typeFilter && ch.type.toLowerCase() !== typeFilter) continue;
                lines.push(`├── ${ch.name} (${ch.type}) ${ch.mention}`);
            }

            for (const cat of categories) {
                if (typeFilter && cat.type.toLowerCase() !== typeFilter) continue;
                lines.push(`${cat.name}`);
                const children = data.channels
                    .filter(c => c.parentId === cat.id && c.typeCode !== 4)
                    .sort((a, b) => a.rawPosition - b.rawPosition);
                for (const child of children) {
                    if (typeFilter && child.type.toLowerCase() !== typeFilter) continue;
                    lines.push(`├── ${child.name} (${child.type}) ${child.mention}`);
                }
            }

            if (lines.length === 0) return 'No channels match what you\'re looking for.';
            return lines.join('\n');
        }

        // Default: flat list
        let channels = data.channels;
        if (params.type) {
            channels = channels.filter(c => c.type.toLowerCase() === params.type.toLowerCase());
        }
        if (params.categoryName) {
            channels = channels.filter(c => c.parentName && c.parentName.toLowerCase().includes(params.categoryName.toLowerCase()));
        }
        if (channels.length === 0) return 'No channels match what you\'re looking for.';
        return channels.map(c => `- ${c.name} (${c.type}) - ${c.mention}`).join('\n');
    }
};
