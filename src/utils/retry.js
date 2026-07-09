/**
 * Helper to determine if we should retry a Discord API error.
 */
const shouldRetryDiscordAPI = (err) => {
    if (!err) return false;
    
    // Do not retry 404 (Not Found), 403 (Forbidden), 400 (Bad Request)
    // Common non-retryable Discord API codes:
    // 10007 (Unknown Member), 10004 (Unknown Guild), 50013 (Missing Permissions)
    if (err.status === 404 || err.status === 403 || err.status === 400) return false;
    if (err.code === 10007 || err.code === 10004 || err.code === 50013) return false;

    // Retry on Rate Limit (429) or Server Errors (5xx) or Network errors
    const isRateLimit = err.status === 429 || err.httpStatus === 429;
    const isTransient = err.status >= 500 || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT';
    
    return isRateLimit || isTransient;
};

/**
 * Execute a function with exponential backoff retry on rate limits, transient errors, and timeouts.
 * 
 * @param {Function} fn - Async function to execute
 * @param {object} opts - Options
 * @param {number} opts.maxRetries - Max retry attempts (default 3)
 * @param {number} opts.baseDelay - Base delay in ms (default 1000)
 * @param {number} opts.maxDelay - Max delay cap in ms (default 10000)
 * @param {number} opts.timeout - Timeout per attempt in ms. 0 = no timeout (default 30000)
 * @param {string} opts.label - Label for logging
 */
async function withRetry(fn, { 
    maxRetries = 3, 
    baseDelay = 1000, 
    maxDelay = 10000, 
    timeout = 30000,
    label = "Action"
} = {}) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const action = fn();
            if (timeout > 0) {
                const timer = new Promise((_, reject) =>
                    setTimeout(() => reject(Object.assign(new Error(`Timed out after ${timeout}ms`), { code: 'TIMEOUT' })), timeout)
                );
                return await Promise.race([action, timer]);
            }
            return await action;
        } catch (err) {
            const isTimeout = err?.code === 'TIMEOUT';
            const isRateLimit = err?.status === 429 || err?.httpStatus === 429;
            const retryAllowed = shouldRetryDiscordAPI(err) || isTimeout;
            
            if (attempt === maxRetries || !retryAllowed) {
                throw err;
            }

            // Use Discord's retry_after if available, otherwise exponential backoff
            const retryAfter = (isRateLimit && err.retry_after) ? err.retry_after * 1000 : baseDelay;
            const delay = Math.min(retryAfter * Math.pow(2, attempt), maxDelay);
            
            // Add jitter (50-100% of delay) to prevent thundering herd
            const jitter = delay * (0.5 + Math.random() * 0.5);

            console.warn(`[Retry] ${label} retry ${attempt + 1}/${maxRetries} after ${Math.round(jitter)}ms (${isTimeout ? 'TIMEOUT' : isRateLimit ? '429' : err.status || err.code})`);
            await new Promise(r => setTimeout(r, jitter));
        }
    }
}

module.exports = {
    shouldRetryDiscordAPI,
    withRetry
};
