const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { getDatabase } = require('./db');

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
const EMBED_MODEL = 'nomic-embed-text';
const CHUNK_MAX_WORDS = 400;
const OVERLAP_WORDS = 50;
const TOP_K = 6;
const EMBED_DIM = 768; // nomic-embed-text dimension

const http = axios.create({
    baseURL: OLLAMA_BASE_URL,
    timeout: 0,
    headers: { 'Content-Type': 'application/json' },
});

// Default excluded folders
const DEFAULT_EXCLUDED = ['.obsidian', 'Attachments'];

/**
 * Count words in a string.
 * @param {string} text
 * @returns {number}
 */
function countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Extract YAML frontmatter from Markdown content.
 * Returns { frontmatter: object|null, body: string }
 * @param {string} content
 * @returns {{frontmatter: object|null, body: string}}
 */
function extractFrontmatter(content) {
    const match = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/.exec(content);
    if (!match) {
        return { frontmatter: null, body: content };
    }
    let frontmatter = null;
    try {
        frontmatter = {};
        for (const line of match[1].split('\n')) {
            const colonIdx = line.indexOf(':');
            if (colonIdx > 0) {
                const key = line.slice(0, colonIdx).trim();
                const value = line.slice(colonIdx + 1).trim().replace(/^"|"$|^'|'$/g, '');
                frontmatter[key] = value;
            }
        }
    } catch {
        frontmatter = null;
    }
    return { frontmatter, body: match[2] };
}

/**
 * Split Markdown body by ## headings.
 * Returns [{ heading: string|null, content: string }]
 * @param {string} body
 * @returns {Array<{heading:string|null, content:string}>}
 */
function splitByHeadings(body) {
    const lines = body.split('\n');
    const sections = [];
    let currentHeading = null;
    let currentContent = [];

    for (const line of lines) {
        const headingMatch = /^#{2,6}\s+(.+)$/.exec(line);
        if (headingMatch) {
            if (currentContent.length > 0 || currentHeading !== null) {
                sections.push({
                    heading: currentHeading,
                    content: currentContent.join('\n').trim(),
                });
            }
            currentHeading = headingMatch[1].trim();
            currentContent = [];
        } else {
            currentContent.push(line);
        }
    }

    if (currentContent.length > 0 || currentHeading !== null) {
        sections.push({
            heading: currentHeading,
            content: currentContent.join('\n').trim(),
        });
    }

    return sections.filter((s) => s.content.length > 0);
}

/**
 * Split a text section into chunks by sentence boundaries if it exceeds max words.
 * Adds overlap between consecutive chunks.
 * @param {string} text
 * @param {number} maxWords
 * @param {number} overlapWords
 * @returns {Array<string>}
 */
function splitSection(text, maxWords = CHUNK_MAX_WORDS, overlapWords = OVERLAP_WORDS) {
    if (!text) return [];
    const wordCount = countWords(text);
    if (wordCount <= maxWords) return [text];

    // Split into sentences
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    const chunks = [];
    let current = [];
    let currentWords = 0;

    for (const sentence of sentences) {
        const sWords = countWords(sentence);
        if (currentWords + sWords > maxWords && currentWords > 0) {
            chunks.push(current.join(' '));
            // Start new chunk with overlap from previous
            const overlapText = current.join(' ').split(/\s+/).slice(-overlapWords).join(' ');
            current = overlapText ? [overlapText, sentence] : [sentence];
            currentWords = countWords(current.join(' '));
        } else {
            current.push(sentence);
            currentWords += sWords;
        }
    }

    if (currentWords > 0) {
        chunks.push(current.join(' '));
    }

    return chunks;
}

/**
 * Parse a Markdown file into chunks with source metadata.
 * @param {string} content
 * @param {string} filePath
 * @returns {Array<{heading:string|null, text:string, sourcePath:string, sourceHeading:string|null}>}
 */
function parseMarkdownToChunks(content, filePath) {
    const { frontmatter, body } = extractFrontmatter(content);
    const sections = splitByHeadings(body);
    const chunks = [];

    for (const section of sections) {
        const sectionChunks = splitSection(section.content);
        for (const chunkText of sectionChunks) {
            chunks.push({
                heading: section.heading,
                text: chunkText.trim(),
                sourcePath: filePath,
                sourceHeading: section.heading,
            });
        }
    }

    return chunks;
}

/**
 * Normalize a vector to unit length.
 * @param {Float32Array} vec
 * @returns {Float32Array}
 */
function normalizeVector(vec) {
    let norm = 0;
    for (let i = 0; i < vec.length; i++) {
        norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm);
    if (norm === 0) return vec;
    const result = new Float32Array(vec.length);
    for (let i = 0; i < vec.length; i++) {
        result[i] = vec[i] / norm;
    }
    return result;
}

/**
 * Cosine similarity between two normalized vectors (dot product).
 * @param {Float32Array} a
 * @param {Float32Array} b
 * @returns {number}
 */
function cosineSimilarity(a, b) {
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
    }
    return dot;
}

/**
 * Generate an embedding for text via Ollama /api/embed.
 * @param {string} text
 * @param {string} type - 'document' or 'query'
 * @returns {Promise<Float32Array>}
 */
async function generateEmbedding(text, type = 'document') {
    const prefix = type === 'query' ? 'search_query: ' : 'search_document: ';
    const input = prefix + text;
    const response = await http.post('/api/embed', {
        model: EMBED_MODEL,
        input,
    });
    const embeddings = response.data.embeddings;
    if (!embeddings || !embeddings[0]) {
        throw new Error('No embedding returned from Ollama');
    }
    return Float32Array.from(embeddings[0]);
}

/**
 * Check if a path should be excluded based on excluded folders.
 * @param {string} filePath
 * @param {string} vaultPath
 * @param {Set<string>} excludedFolders
 * @returns {boolean}
 */
function isExcluded(filePath, vaultPath, excludedFolders) {
    const rel = path.relative(vaultPath, filePath);
    const parts = rel.split(path.sep);
    // Check if any part matches an excluded folder
    for (const part of parts) {
        if (excludedFolders.has(part)) return true;
    }
    return false;
}

/**
 * Get supported Markdown files in a vault directory.
 * @param {string} dir
 * @param {string} vaultPath
 * @param {Set<string>} excludedFolders
 * @returns {Promise<Array<string>>}
 */
async function getMarkdownFiles(dir, vaultPath, excludedFolders) {
    const files = [];
    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
        return files;
    }
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (isExcluded(full, vaultPath, excludedFolders)) continue;
            const subFiles = await getMarkdownFiles(full, vaultPath, excludedFolders);
            files.push(...subFiles);
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.markdown')) {
            if (!isExcluded(full, vaultPath, excludedFolders)) {
                files.push(full);
            }
        }
    }
    return files;
}

class RAGService {
    constructor() {
        this.db = null;
        this.indexing = false;
        this.indexProgress = { status: 'idle', current: 0, total: 0, file: '' };
        this._stmts = {};
    }

    initialize() {
        this.db = getDatabase();
        this._prepareStatements();
    }

    _prepareStatements() {
        const db = this.db.db;
        this._stmts = {
            insertChunk: db.prepare(`
                INSERT OR REPLACE INTO chunks (id, path, heading, text, mtime, embedding)
                VALUES (@id, @path, @heading, @text, @mtime, @embedding)
            `),
            deleteChunksByPath: db.prepare(`DELETE FROM chunks WHERE path = @path`),
            getChunkByPath: db.prepare(`SELECT * FROM chunks WHERE path = @path`),
            getAllChunks: db.prepare(`SELECT id, path, heading, text, mtime, embedding FROM chunks`),
            getChunksByPath: db.prepare(`SELECT id, path, heading, text, mtime, embedding FROM chunks WHERE path = @path`),
            getFileMtime: db.prepare(`SELECT mtime FROM chunks WHERE path = @path LIMIT 1`),
        };
    }

    /**
     * Serialize Float32Array to Buffer for SQLite storage.
     * @param {Float32Array} vec
     * @returns {Buffer}
     */
    _serializeEmbedding(vec) {
        const buf = Buffer.alloc(vec.length * 4);
        for (let i = 0; i < vec.length; i++) {
            buf.writeFloatLE(vec[i], i * 4);
        }
        return buf;
    }

    /**
     * Deserialize Buffer to Float32Array.
     * @param {Buffer} buf
     * @returns {Float32Array}
     */
    _deserializeEmbedding(buf) {
        const len = buf.length / 4;
        const vec = new Float32Array(len);
        for (let i = 0; i < len; i++) {
            vec[i] = buf.readFloatLE(i * 4);
        }
        return vec;
    }

    /**
     * Generate a deterministic chunk ID from path + heading + text hash.
     * @param {string} path
     * @param {string|null} heading
     * @param {string} text
     * @returns {string}
     */
    _chunkId(path, heading, text) {
        return crypto.createHash('sha256').update(`${path}|${heading || ''}|${text}`).digest('hex');
    }

    /**
     * Index a single Markdown file: parse, embed, store chunks.
     * @param {string} filePath
     * @param {string} vaultPath
     * @returns {Promise<{chunks:number, skipped:boolean}>}
     */
    async indexFile(filePath, vaultPath) {
        const stat = await fs.stat(filePath);
        const mtime = stat.mtimeMs;

        // Check if already indexed with same mtime
        const existing = this._stmts.getFileMtime.get({ path: filePath });
        if (existing && existing.mtime === mtime) {
            return { chunks: 0, skipped: true };
        }

        // Delete old chunks for this file
        this._stmts.deleteChunksByPath.run({ path: filePath });

        const content = await fs.readFile(filePath, 'utf-8');
        const chunks = parseMarkdownToChunks(content, filePath);

        // Generate embeddings first (async), then insert in a transaction
        const preparedChunks = [];
        for (const chunk of chunks) {
            const id = this._chunkId(filePath, chunk.heading, chunk.text);
            const embedding = await generateEmbedding(chunk.text, 'document');
            preparedChunks.push({
                id,
                path: filePath,
                heading: chunk.heading || null,
                text: chunk.text,
                mtime,
                embedding: this._serializeEmbedding(embedding),
            });
        }

        const txn = this.db.db.transaction(() => {
            for (const chunk of preparedChunks) {
                this._stmts.insertChunk.run(chunk);
            }
        });
        txn();

        return { chunks: chunks.length, skipped: false };
    }

    /**
     * Index an entire vault incrementally.
     * @param {string} vaultPath
     * @param {Array<string>} excludedFolders
     * @param {Function} onProgress - (progress) => void
     * @returns {Promise<{indexed:number, skipped:number, totalFiles:number}>}
     */
    async indexVault(vaultPath, excludedFolders = [], onProgress) {
        if (this.indexing) {
            throw new Error('Indexing already in progress');
        }
        this.indexing = true;
        const excludedSet = new Set([...DEFAULT_EXCLUDED, ...(excludedFolders || [])]);

        try {
            this.indexProgress = { status: 'indexing', current: 0, total: 0, file: '' };
            const files = await getMarkdownFiles(vaultPath, vaultPath, excludedSet);
            this.indexProgress.total = files.length;

            let indexed = 0;
            let skipped = 0;

            for (let i = 0; i < files.length; i++) {
                if (!this.indexing) break; // Allow cancellation

                const filePath = files[i];
                this.indexProgress.current = i + 1;
                this.indexProgress.file = path.basename(filePath);
                onProgress?.({ ...this.indexProgress });

                try {
                    const result = await this.indexFile(filePath, vaultPath);
                    if (result.skipped) skipped += 1;
                    else indexed += 1;
                } catch (err) {
                    console.error(`Failed to index ${filePath}:`, err.message);
                }
            }

            this.indexProgress = { status: 'idle', current: 0, total: 0, file: '' };
            return { indexed, skipped, totalFiles: files.length };
        } finally {
            this.indexing = false;
        }
    }

    /**
     * Stop any in-progress indexing.
     */
    stopIndexing() {
        this.indexing = false;
    }

    /**
     * Get indexing status.
     * @returns {{status:string, current:number, total:number, file:string}}
     */
    getIndexStatus() {
        return { ...this.indexProgress };
    }

    /**
     * Search for relevant chunks given a query.
     * @param {string} query
     * @param {string} vaultPath
     * @param {number} topK
     * @returns {Promise<Array<{id:string, path:string, heading:string|null, text:string, similarity:number, sourcePath:string, sourceHeading:string|null}>}>
     */
    async searchChunks(query, vaultPath, topK = TOP_K) {
        const rows = this._stmts.getAllChunks.all();
        if (rows.length === 0) return [];

        const queryEmbedding = normalizeVector(await generateEmbedding(query, 'query'));

        const results = [];
        for (const row of rows) {
            const embedding = this._deserializeEmbedding(row.embedding);
            const sim = cosineSimilarity(queryEmbedding, normalizeVector(embedding));
            results.push({
                id: row.id,
                path: row.path,
                heading: row.heading,
                text: row.text,
                similarity: sim,
                sourcePath: row.path,
                sourceHeading: row.heading,
            });
        }

        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, topK);
    }

    /**
     * Build a RAG prompt from query and retrieved chunks.
     * @param {string} query
     * @param {Array<{path:string, heading:string|null, text:string, similarity:number}>} chunks
     * @param {string} aboutMe
     * @returns {string}
     */
    buildRagPrompt(query, chunks, aboutMe = '') {
        const sections = [];
        sections.push('## Personal Context\n' + (aboutMe || 'No personal context provided.'));
        sections.push('## Instructions\nAnswer only using the provided notes. If the answer is not available, say that it was not found in the notes. Mention the notes used to generate the answer.');
        sections.push('## Retrieved Notes\n');

        for (const chunk of chunks) {
            const sourceLabel = chunk.heading
                ? `${path.basename(chunk.path)} > ${chunk.heading}`
                : path.basename(chunk.path);
            sections.push(`### ${sourceLabel}\n${chunk.text}\n`);
        }

        sections.push('## Question\n' + query);
        sections.push('## Answer\n');

        return sections.join('\n\n');
    }

    /**
     * Delete all chunks for a removed file.
     * @param {string} filePath
     */
    removeFileChunks(filePath) {
        this._stmts.deleteChunksByPath.run({ path: filePath });
    }

    /**
     * Get total chunk count.
     * @returns {number}
     */
    getChunkCount() {
        const row = this.db.db.prepare(`SELECT COUNT(*) as n FROM chunks`).get();
        return row.n;
    }
}

let instance = null;

function getRAGService() {
    if (!instance) {
        instance = new RAGService();
        instance.initialize();
    }
    return instance;
}

module.exports = {
    RAGService,
    getRAGService,
    parseMarkdownToChunks,
    generateEmbedding,
    cosineSimilarity,
    normalizeVector,
    EMBED_MODEL,
    TOP_K,
};
