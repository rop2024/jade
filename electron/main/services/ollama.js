const axios = require('axios');

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434';

// Approximate token budget: ~1 token per 4 characters. Target roughly
// 6,000 tokens of history+system inside an 8,192-token context window.
const TOKENS_PER_CHAR = 4;
const CONTEXT_TOKEN_BUDGET = 6000;
const TITLE_MAX_WORDS = 5;
const TITLE_FALLBACK_CHARS = 40;

class OllamaError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'OllamaError';
        this.code = code;
    }
}

const http = axios.create({
    baseURL: OLLAMA_BASE_URL,
    timeout: 0,
    headers: { 'Content-Type': 'application/json' },
});

function estimateTokens(text) {
    return Math.ceil((text || '').length / TOKENS_PER_CHAR);
}

/**
 * Keep the system prompt plus as many recent messages as fit within the
 * token budget. Oldest messages are dropped first; the system prompt is
 * never removed.
 * @param {Array<{role:string,content:string}>} messages
 * @param {string} systemPrompt
 * @param {number} [maxTokens]
 * @returns {Array<{role:string,content:string}>}
 */
function trimMessages(messages, systemPrompt, maxTokens = CONTEXT_TOKEN_BUDGET) {
    const systemTokens = estimateTokens(systemPrompt);
    let budget = maxTokens - systemTokens;
    if (budget < 0) budget = 0;

    const kept = [];
    let used = 0;
    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        const tokens = estimateTokens(message.content);
        if (used + tokens > budget && kept.length > 0) break;
        kept.unshift(message);
        used += tokens;
    }

    return [{ role: 'system', content: systemPrompt }, ...kept];
}

async function isOllamaRunning() {
    try {
        await http.get('/api/tags', { timeout: 3000 });
        return true;
    } catch {
        return false;
    }
}

async function listModels() {
    const { data } = await http.get('/api/tags');
    return (data.models || []).map((m) => ({ name: m.name }));
}

async function streamChat({ model, messages, signal, onToken, options }) {
    const response = await http.post(
        '/api/chat',
        { model, messages, stream: true, options },
        { signal, responseType: 'stream' },
    );

    let buffer = '';
    const stream = response.data;

    stream.on('data', (chunk) => {
        buffer += chunk.toString();
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            if (!line) continue;
            try {
                const parsed = JSON.parse(line);
                if (parsed.message && typeof parsed.message.content === 'string') {
                    onToken(parsed.message.content);
                }
                if (parsed.done) {
                    stream.destroy();
                }
            } catch {
                // Ignore malformed JSON lines.
            }
        }
    });

    await new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', (err) => {
            if (err.name === 'AbortError') {
                reject(err);
            } else {
                reject(err);
            }
        });
        signal.addEventListener('abort', () => {
            stream.destroy(new DOMException('Aborted', 'AbortError'));
        });
    });
}

async function chat({ model, messages, signal, onToken, onDone, onError, systemPrompt, options }) {
    try {
        const finalMessages = systemPrompt
            ? trimMessages(messages, systemPrompt)
            : messages;

        await streamChat({ model, messages: finalMessages, signal, onToken, options });
        onDone();
        return { done: true, aborted: false };
    } catch (err) {
        if (err.name === 'AbortError' || signal.aborted) {
            return { done: false, aborted: true };
        }

        let message = err.message || 'Unknown Ollama error';
        let code = 'unknown';

        if (err.response) {
            const status = err.response.status;
            const body = err.response.data || {};
            code = `http_${status}`;
            if (status === 404) {
                message = `The model "${model}" is not installed. Pull it first (e.g. \`ollama pull ${model}\`).`;
            } else {
                message = body.error || `Ollama returned status ${status}`;
            }
        } else if (err.code === 'ECONNREFUSED' || !err.response) {
            code = 'connection';
            message = 'Ollama is not running. Start Ollama and try again.';
        }

        onError(new OllamaError(message, code));
        return { done: false, aborted: false, error: new OllamaError(message, code) };
    }
}

async function generateTitle({ model, firstUserMessage, signal }) {
    const systemPrompt = 'You are a title generator. Reply with only a conversation title of at most five words. No punctuation, no quotes, no explanation, no extra text.';
    const response = await http.post('/api/chat', {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Suggest a title for a conversation that begins with: "${firstUserMessage}"` },
        ],
        stream: false,
    }, { signal });

    let title = (response.data.message && response.data.message.content) || '';
    title = title.trim().replace(/^["']|["']$/g, '');
    const wordCount = title.split(/\s+/).filter(Boolean).length;
    if (!title || wordCount > TITLE_MAX_WORDS) {
        title = firstUserMessage.slice(0, TITLE_FALLBACK_CHARS);
    }
    return title;
}

module.exports = {
    OLLAMA_BASE_URL,
    OllamaError,
    estimateTokens,
    trimMessages,
    isOllamaRunning,
    listModels,
    streamChat,
    chat,
    generateTitle,
};
