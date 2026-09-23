/**
 * Merge summarize LLM output with CV2 components / images from skills.
 */
function compose(summary, results = [], cv2Components = []) {
    const imageHit = results.find(r => r.status === 'success' && r.imageUrl);
    const imageUrl = summary.imageUrl || imageHit?.imageUrl || null;

    // Background job sole result — skip fancy summary override
    const job = results.find(r => typeof r.result === 'string' && r.result.startsWith('Background job'));
    if (job && results.length === 1) {
        return {
            reply: job.result,
            replyFormat: 'text',
            imageUrl: null,
            colorHex: '#2B2D31',
            imageStyle: null,
            cv2Components: [],
        };
    }

    return {
        reply: summary.reply || '',
        replyFormat: summary.replyFormat || 'text',
        imageUrl,
        colorHex: summary.colorHex || '#2B2D31',
        imageStyle: summary.imageStyle || null,
        cv2Components: cv2Components || [],
    };
}

module.exports = { compose };
