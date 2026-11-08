const axios = require('axios');

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434';

const http = axios.create({
    baseURL: OLLAMA_BASE_URL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

/**
 * Warm up Ollama by sending a lightweight request using keep_alive.
 * This reduces the delay before the first actual response.
 * Does not guarantee the model will remain loaded if Ollama unloads it.
 * @param {string} model - Model to warm up (default: llama3.2)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function warmUpOllama(model = 'llama3.2') {
    try {
        const response = await http.post('/api/embed', {
            model: 'nomic-embed-text',
            input: 'search_document: warm up',
        });
        return { success: true };
    } catch (err) {
        // Try chat as fallback
        try {
            await http.post('/api/chat', {
                model,
                messages: [{ role: 'user', content: 'hi' }],
                stream: false,
                keep_alive: '5m',
            });
            return { success: true };
        } catch (err2) {
            return { success: false, error: err2.message || 'Ollama warm-up failed' };
        }
    }
}

/**
 * Check if Ollama is reachable.
 * @returns {Promise<boolean>}
 */
async function isOllamaAvailable() {
    try {
        await http.get('/api/tags', { timeout: 3000 });
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    warmUpOllama,
    isOllamaAvailable,
};
