/**
 * Generic external API client (axios).
 * Replace the base URL and endpoints with your own integration.
 */
const axios = require('axios');

function getApiClient(options = {}) {
    const baseUrl = options.baseUrl || 'https://api.example.com';
    const timeout = options.timeout || 30000;
    const userAgent = options.userAgent || 'Jade/1.0';

    const client = axios.create({
        baseURL: baseUrl,
        timeout,
        headers: {
            'User-Agent': userAgent,
            'Accept': 'application/json',
        },
        proxy: options.proxy ? parseProxy(options.proxy) : false,
    });

    client.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;
                if (status === 404) throw new Error(`Not found: ${error.config.url}`);
                if (status === 429) throw new Error('Rate limit exceeded. Please wait.');
                if (status >= 500) throw new Error(`Server error (${status}).`);
                throw new Error(`API error (${status}): ${data?.message || 'Unknown error'}`);
            } else if (error.request) {
                throw new Error(`No response from server: ${error.message}`);
            }
            throw new Error(`Request setup error: ${error.message}`);
        }
    );

    return {
        client,
        get: (url, cfg) => client.get(url, cfg).then(r => r.data),
        post: (url, body, cfg) => client.post(url, body, cfg).then(r => r.data),
        close: () => Promise.resolve(),
    };
}

function parseProxy(proxyUrl) {
    try {
        const parsed = new URL(proxyUrl);
        return {
            protocol: parsed.protocol.replace(':', ''),
            host: parsed.hostname,
            port: parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80),
            auth: parsed.username
                ? { username: decodeURIComponent(parsed.username), password: decodeURIComponent(parsed.password || '') }
                : undefined,
        };
    } catch {
        throw new Error(`Invalid proxy URL: ${proxyUrl}`);
    }
}

module.exports = { getApiClient };
