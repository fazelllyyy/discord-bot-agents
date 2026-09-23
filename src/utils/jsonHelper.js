/**
 * Extract a JSON object from LLM output.
 * Handles fences, preamble text, trailing commas, and unescaped control chars in strings.
 */
function extractJSON(text) {
    if (text == null) return null;
    if (typeof text !== 'string') {
        if (typeof text === 'object') return text;
        return null;
    }

    const trimmed = text.trim();
    if (!trimmed) return null;

    const candidates = [];

    // 1) Whole string
    candidates.push(trimmed);

    // 2) Fenced ```json ... ```
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fence) candidates.push(fence[1].trim());

    // 3) Balanced object from first `{`
    const firstBrace = trimmed.indexOf('{');
    if (firstBrace !== -1) {
        const balanced = sliceBalancedObject(trimmed, firstBrace);
        if (balanced) candidates.push(balanced);
    }

    for (const candidate of candidates) {
        const parsed = tryParseObject(candidate);
        if (parsed) return parsed;
    }

    // 4) Last resort: pull known fields with regex (still useful for summarize replies)
    const loose = extractLooseFields(trimmed);
    if (loose) return loose;

    return null;
}

function tryParseObject(str) {
    if (!str || typeof str !== 'string') return null;

    const attempts = [
        str,
        repairTrailingCommas(str),
        repairUnescapedControls(str),
        repairTrailingCommas(repairUnescapedControls(str)),
        normalizeSmartQuotes(str),
        repairTrailingCommas(repairUnescapedControls(normalizeSmartQuotes(str))),
    ];

    for (const attempt of attempts) {
        try {
            const parsed = JSON.parse(attempt);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed;
            }
        } catch {
            /* try next */
        }
    }
    return null;
}

function sliceBalancedObject(text, startIdx) {
    let depth = 0;
    let inString = false;
    let escape = false;

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
                return text.substring(startIdx, i + 1);
            }
        }
    }
    return null;
}

/** Remove trailing commas before } or ] */
function repairTrailingCommas(str) {
    return str.replace(/,(\s*[}\]])/g, '$1');
}

/** Replace curly/smart quotes with straight quotes */
function normalizeSmartQuotes(str) {
    return str
        .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
        .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
}

/**
 * Escape raw control characters that appear inside JSON string values.
 * LLMs often emit real newlines inside "reply" instead of \n.
 */
function repairUnescapedControls(str) {
    let out = '';
    let inString = false;
    let escape = false;

    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        const code = str.charCodeAt(i);

        if (escape) {
            out += ch;
            escape = false;
            continue;
        }

        if (inString) {
            if (ch === '\\') {
                out += ch;
                escape = true;
                continue;
            }
            if (ch === '"') {
                out += ch;
                inString = false;
                continue;
            }
            if (ch === '\n') {
                out += '\\n';
                continue;
            }
            if (ch === '\r') {
                out += '\\r';
                continue;
            }
            if (ch === '\t') {
                out += '\\t';
                continue;
            }
            if (code < 0x20) {
                out += '\\u' + code.toString(16).padStart(4, '0');
                continue;
            }
            out += ch;
            continue;
        }

        if (ch === '"') {
            inString = true;
        }
        out += ch;
    }

    return out;
}

/**
 * Best-effort field extraction when JSON is too broken to parse.
 * Only used as a last resort for summarize-phase replies.
 */
function extractLooseFields(text) {
    const reply = matchJsonStringField(text, 'reply');
    if (reply == null) return null;

    const result = {
        reply,
        reasoning: matchJsonStringField(text, 'reasoning') || '',
        replyFormat: matchJsonStringField(text, 'replyFormat') || 'text',
        imageUrl: matchJsonStringField(text, 'imageUrl'),
        colorHex: matchJsonStringField(text, 'colorHex') || '#2B2D31',
        imageStyle: matchJsonStringField(text, 'imageStyle') || null,
    };

    if (result.imageUrl === 'null') result.imageUrl = null;
    return result;
}

function matchJsonStringField(text, field) {
    const re = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 's');
    const m = text.match(re);
    if (!m) {
        // Try with unescaped newlines inside the value (broken JSON)
        const loose = new RegExp(`"${field}"\\s*:\\s*"([\\s\\S]*?)"\\s*[,}]`);
        const m2 = text.match(loose);
        if (!m2) return null;
        return m2[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    try {
        return JSON.parse('"' + m[1] + '"');
    } catch {
        return m[1];
    }
}

module.exports = { extractJSON };
