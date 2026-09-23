/**
 * Language guidance for the LLM.
 * Prefer matching the user's language. Default English only when ambiguous.
 */
function detectLanguage(msg) {
    const text = (msg || '').trim();
    const names = {
        en: 'ENGLISH', id: 'INDONESIAN', ar: 'ARABIC', ja: 'JAPANESE', ru: 'RUSSIAN',
        de: 'GERMAN', es: 'SPANISH', fr: 'FRENCH', zh: 'CHINESE', ko: 'KOREAN', pt: 'PORTUGUESE',
    };

    // Explicit override
    if (/in english|bahasa inggris|reply in english/i.test(text)) return { lang: 'en', name: names.en, mode: 'forced' };
    if (/in indonesian|bahasa indonesia|reply in indonesian/i.test(text)) return { lang: 'id', name: names.id, mode: 'forced' };
    if (/in arabic|bahasa arab/i.test(text)) return { lang: 'ar', name: names.ar, mode: 'forced' };
    if (/in japanese|bahasa jepang/i.test(text)) return { lang: 'ja', name: names.ja, mode: 'forced' };
    if (/in russian|bahasa rusia/i.test(text)) return { lang: 'ru', name: names.ru, mode: 'forced' };
    if (/in german|bahasa jerman/i.test(text)) return { lang: 'de', name: names.de, mode: 'forced' };
    if (/in spanish|bahasa spanyol/i.test(text)) return { lang: 'es', name: names.es, mode: 'forced' };
    if (/in french|bahasa prancis/i.test(text)) return { lang: 'fr', name: names.fr, mode: 'forced' };
    if (/in chinese|bahasa mandarin/i.test(text)) return { lang: 'zh', name: names.zh, mode: 'forced' };
    if (/in korean|bahasa korea/i.test(text)) return { lang: 'ko', name: names.ko, mode: 'forced' };
    if (/in portuguese|bahasa portugis/i.test(text)) return { lang: 'pt', name: names.pt, mode: 'forced' };

    if (/[\u3040-\u30ff]/.test(text)) return { lang: 'ja', name: names.ja, mode: 'detected' };
    if (/[\u3400-\u9fff]/.test(text)) return { lang: 'zh', name: names.zh, mode: 'detected' };
    if (/[\u0600-\u06FF]/.test(text)) return { lang: 'ar', name: names.ar, mode: 'detected' };
    if (/[\u0400-\u04FF]/.test(text)) return { lang: 'ru', name: names.ru, mode: 'detected' };
    if (/[\uAC00-\uD7AF]/.test(text)) return { lang: 'ko', name: names.ko, mode: 'detected' };

    if (/\b(buatlah|buatkan|tolong|hapus|hapuskan|tampilkan|berikan|carikan|kirimkan|kamu|siapa|daftar|tambah|ganti|bisukan|keluarkan|selamanya|dalam|server|channel|role|anggota|beri|list)\b/i.test(text)
        || /^(hei+|hai+|halo+|pagi|siang|sore|malam)\b/i.test(text)) {
        return { lang: 'id', name: names.id, mode: 'detected' };
    }

    if (/^(how|what|why|when|where|who|tell|create|make|change|list|give|show|timeout|is|are|can|do|did|will|would|could|rename|deafen|unmute|snipe|search|kick|ban|mute|block|unblock|hi|hey|hello)\b/i.test(text)) {
        return { lang: 'en', name: names.en, mode: 'detected' };
    }

    // Ambiguous → English default; still tell model to mirror user if they wrote clearly in another tongue
    return { lang: 'en', name: names.en, mode: 'default' };
}

function languageInstruction(detected, phase) {
    if (phase === 'plan') {
        return 'Write "reasoning" in English. Understand the user request in ANY language.';
    }
    // summarize
    if (detected.mode === 'forced' || detected.mode === 'detected') {
        return `Your "reply" MUST be 100% in ${detected.name}.`;
    }
    return 'Your "reply" MUST match the user\'s language. If ambiguous, use ENGLISH.';
}

module.exports = { detectLanguage, languageInstruction };
