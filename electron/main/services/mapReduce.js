/**
 * Map-reduce processing for long documents.
 *
 * Splits a document into chunks, summarizes each chunk (map stage),
 * then combines the summaries through a selected mode (reduce stage).
 * Reports progress via callbacks and supports cancellation.
 */

const axios = require('axios');
const { chunkText, estimateTokens } = require('./chunker');

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434';

const http = axios.create({
    baseURL: OLLAMA_BASE_URL,
    timeout: 0,
    headers: { 'Content-Type': 'application/json' },
});

const TOKEN_THRESHOLD = 5000; // Approximate token threshold for map-reduce

const MAP_PROMPT = `Summarize the following part of a document. Preserve key facts, names, dates, and decisions. Keep it concise but complete.

Text:
{{chunk}}`;

const REDUCE_PROMPT = `Combine the following part summaries into a single coherent summary. Preserve key facts, names, dates, and decisions. Eliminate redundancy.

Part summaries:
{{summaries}}`;

/**
 * Map-reduce process a document.
 *
 * @param {Object} options
 * @param {string} options.content - Full document text
 * @param {string} options.model - Ollama model to use
 * @param {string} [options.modeId] - Mode id for reduce stage (affects system prompt)
 * @param {string} [options.modeSystem] - Mode system prompt for reduce stage
 * @param {string} [options.aboutMe] - Personal context for reduce stage
 * @param {Function} options.onProgress - (progress) => void, progress = { stage, part, total, message }
 * @param {AbortSignal} [options.signal] - Cancellation signal
 * @param {number} [options.maxWords=1500] - Chunk size in words
 * @returns {Promise<{summary: string, parts: number}>}
 */
async function mapReduce(options) {
    const {
        content,
        model,
        modeId,
        modeSystem,
        aboutMe,
        onProgress,
        signal,
        maxWords = 1500,
    } = options;

    const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;
    const tokenEstimate = estimateTokens(wordCount);

    // If the document is small enough, just do a single pass.
    if (tokenEstimate <= TOKEN_THRESHOLD) {
        onProgress?.({ stage: 'single', part: 1, total: 1, message: 'Processing document...' });
        const result = await chatOnce(model, content, modeSystem, aboutMe, signal);
        return { summary: result, parts: 1 };
    }

    // Chunk the document.
    onProgress?.({ stage: 'chunking', part: 0, total: 0, message: 'Chunking document...' });
    const chunks = chunkText(content, { maxWords, detectDates: true });

    // Map stage: summarize each chunk.
    const summaries = [];
    for (let i = 0; i < chunks.length; i++) {
        if (signal?.aborted) throw new Error('Aborted');

        onProgress?.({
            stage: 'map',
            part: i + 1,
            total: chunks.length,
            message: `Summarizing part ${i + 1} of ${chunks.length}...`,
        });

        const chunkPrompt = MAP_PROMPT.replace('{{chunk}}', chunks[i].text);
        const summary = await chatOnce(model, chunkPrompt, modeSystem, aboutMe, signal);
        summaries.push(summary);
    }

    // Reduce stage: combine summaries.
    onProgress?.({
        stage: 'reduce',
        part: 1,
        total: 1,
        message: 'Combining summaries...',
    });

    const combined = summaries.map((s, i) => `Part ${i + 1}:\n${s}`).join('\n\n');
    const reducePrompt = REDUCE_PROMPT.replace('{{summaries}}', combined);
    const final = await chatOnce(model, reducePrompt, modeSystem, aboutMe, signal);

    return { summary: final, parts: chunks.length };
}

/**
 * Send a single chat request to Ollama and return the full response text.
 * @param {string} model
 * @param {string} prompt
 * @param {string|null} modeSystem
 * @param {string|null} aboutMe
 * @param {AbortSignal|null} signal
 * @returns {Promise<string>}
 */
async function chatOnce(model, prompt, modeSystem, aboutMe, signal) {
    const sections = [];
    if (aboutMe) {
        sections.push('## Personal Context\n' + aboutMe);
    }
    if (modeSystem) {
        sections.push('## Mode Instructions\n' + modeSystem);
    }
    sections.push('## User Request\n' + prompt);

    const systemContent = sections.join('\n\n');

    const response = await http.post(
        '/api/chat',
        {
            model,
            messages: [
                { role: 'system', content: systemContent },
                { role: 'user', content: prompt },
            ],
            stream: false,
        },
        { signal },
    );

    return (response.data.message && response.data.message.content) || '';
}

/**
 * Estimate whether a document needs map-reduce processing.
 * @param {string} content
 * @returns {boolean}
 */
function needsMapReduce(content) {
    const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;
    return estimateTokens(wordCount) > TOKEN_THRESHOLD;
}

module.exports = {
    mapReduce,
    needsMapReduce,
    TOKEN_THRESHOLD,
    chatOnce,
};
