const { ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, ThumbnailBuilder, MessageFlags } = require('discord.js');
const { randomUUID } = require('crypto');

const paginationCache = new Map();

function buildPage(title, thumbnailUrl, items, colorHex, pageInfo) {
    const container = new ContainerBuilder();
    if (colorHex) {
        // Strip # if present
        const cleanHex = colorHex.startsWith('#') ? colorHex.slice(1) : colorHex;
        container.setAccentColor(parseInt(cleanHex, 16));
    } else {
        container.setAccentColor(0x5865F2); // Default Blurple
    }

    if (thumbnailUrl) {
        const section = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailUrl));
        container.addSectionComponents(section);
    } else {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`));
    }

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    let currentChunk = '';
    const builders = [];
    for (const item of items) {
        if (currentChunk.length + item.length + 1 > 1900) {
            builders.push(new TextDisplayBuilder().setContent(currentChunk));
            currentChunk = item + '\n';
        } else {
            currentChunk += item + '\n';
        }
    }
    if (currentChunk.trim().length > 0) {
        builders.push(new TextDisplayBuilder().setContent(currentChunk.trim()));
    }

    // Limit to 5 text displays to avoid hitting component limits (5 max per container usually, although it's higher for TextDisplay)
    const displayBuilders = builders.slice(0, 5);
    if (builders.length > 5) {
        displayBuilders.push(new TextDisplayBuilder().setContent('*...content truncated due to length limits.*'));
    }

    container.addTextDisplayComponents(...displayBuilders);

    if (pageInfo) {
        const { current, total, cacheId, l } = pageInfo;
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`*${l('page_info', `Page ${current} of ${total}`)}*`)
        );
        
        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`page_prev_${cacheId}`)
                    .setLabel(l('prev', 'Prev'))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(current === 1),
                new ButtonBuilder()
                    .setCustomId(`page_next_${cacheId}`)
                    .setLabel(l('next', 'Next'))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(current === total)
            )
        );
    }

    return container;
}

function createStandardUI({
    title,
    thumbnailUrl,
    items, // Array of strings
    colorHex,
    itemsPerPage = 10,
    pagination = true,
    ownerId,
    l = (k, d) => d
}) {
    if (items.length === 0) {
        return buildPage(title, thumbnailUrl, [`*${l('empty_result', 'No data available.')}*`], colorHex, null);
    }

    if (pagination === false) {
        const totalLength = items.join('\n').length;
        if (totalLength > 5500) {
            throw new Error(l('limit_exceeded', "I cannot display all the requested data without pagination because it exceeds Discord's character limit."));
        }
        return buildPage(title, thumbnailUrl, items, colorHex, null);
    }

    if (items.length <= itemsPerPage) {
        return buildPage(title, thumbnailUrl, items, colorHex, null);
    }

    const pages = [];
    for (let i = 0; i < items.length; i += itemsPerPage) {
        pages.push(items.slice(i, i + itemsPerPage));
    }

    const cacheId = randomUUID().replace(/-/g, '').substring(0, 16);
    paginationCache.set(cacheId, {
        title,
        thumbnailUrl,
        pages,
        currentPage: 0,
        colorHex,
        ownerId,
        l
    });

    // Clean up cache after 15 minutes
    setTimeout(() => {
        paginationCache.delete(cacheId);
    }, 15 * 60 * 1000);

    return buildPage(title, thumbnailUrl, pages[0], colorHex, {
        current: 1,
        total: pages.length,
        cacheId,
        l
    });
}

async function handlePaginationInteraction(interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('page_')) return;

    // Acknowledge the interaction immediately to prevent the 3-second timeout
    await interaction.deferUpdate();

    const parts = interaction.customId.split('_');
    const direction = parts[1];
    const cacheId = parts[2];

    const cacheData = paginationCache.get(cacheId);
    if (!cacheData) {
        return interaction.followUp({ content: 'Pagination session expired. Please run the command again.', flags: MessageFlags.Ephemeral });
    }

    // Validate owner
    if (interaction.user.id !== cacheData.ownerId) {
        return interaction.followUp({ content: 'Only the user who ran the command can use these buttons.', flags: MessageFlags.Ephemeral });
    }

    if (direction === 'prev' && cacheData.currentPage > 0) {
        cacheData.currentPage--;
    } else if (direction === 'next' && cacheData.currentPage < cacheData.pages.length - 1) {
        cacheData.currentPage++;
    }

    const container = buildPage(
        cacheData.title,
        cacheData.thumbnailUrl,
        cacheData.pages[cacheData.currentPage],
        cacheData.colorHex,
        {
            current: cacheData.currentPage + 1,
            total: cacheData.pages.length,
            cacheId,
            l: cacheData.l
        }
    );

    // To update the message with CV2 components, we use editReply since we deferred
    await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });
}

module.exports = {
    createStandardUI,
    handlePaginationInteraction
};
