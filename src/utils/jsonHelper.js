function extractJSON(text) {
    if (!text || typeof text !== 'string') return null;

    try {
        return JSON.parse(text);
    } catch (e) {}

    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
        try {
            return JSON.parse(match[1]);
        } catch (err) {}
    }

    const firstBrace = text.indexOf('{');
    if (firstBrace === -1) return null;

    try {
        const result = extractBalancedJSON(text, firstBrace);
        if (result) return result;
    } catch (err) {}

    return null;
}

function extractBalancedJSON(text, startIdx) {
    let depth = 0;
    let inString = false;
    let escape = false;
    let lastValidEnd = -1;

    for (let i = startIdx; i < text.length; i++) {
        const ch = text[i];

        if (escape) {
            escape = false;
            continue;
        }

        if (inString) {
            if (ch === '\\') {
                escape = true;
            } else if (ch === '"') {
                inString = false;
            }
            continue;
        }

        if (ch === '"') {
            inString = true;
            continue;
        }

        if (ch === '{') {
            depth++;
            continue;
        }

        if (ch === '}') {
            depth--;
            if (depth === 0) {
                lastValidEnd = i;
                break;
            }
        }
    }

    if (lastValidEnd === -1) return null;

    const jsonStr = text.substring(startIdx, lastValidEnd + 1);
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        if (jsonStr.length < 10) return null;
        const lastGoodBrace = findLastCompleteBrace(text, startIdx, lastValidEnd);
        if (lastGoodBrace > startIdx) {
            try {
                return JSON.parse(text.substring(startIdx, lastGoodBrace + 1));
            } catch (err) {}
        }
        return null;
    }
}

function findLastCompleteBrace(text, startIdx, endIdx) {
    let depth = 0;
    let inString = false;
    let escape = false;
    let validEnd = -1;

    for (let i = startIdx; i <= endIdx; i++) {
        const ch = text[i];

        if (escape) {
            escape = false;
            continue;
        }

        if (inString) {
            if (ch === '\\') {
                escape = true;
            } else if (ch === '"') {
                inString = false;
            }
            continue;
        }

        if (ch === '"') {
            inString = true;
            continue;
        }

        if (ch === '{') {
            depth++;
            continue;
        }

        if (ch === '}') {
            depth--;
            if (depth === 0) {
                validEnd = i;
            }
        }
    }

    return validEnd;
}

module.exports = { extractJSON };
