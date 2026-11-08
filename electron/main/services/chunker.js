/**
 * Text chunking utilities for long-document processing.
 *
 * Strategy:
 * 1. Detect date headings (# YYYY-MM-DD) for journal files and split by date
 *    first so entries stay together.
 * 2. Split remaining text by paragraph boundaries.
 * 3. Greedily pack paragraphs into chunks up to ~1,500 words.
 * 4. If a single paragraph exceeds the limit, split it by sentence boundaries.
 */

const DEFAULT_CHUNK_WORDS = 1500;

// Matches "# YYYY-MM-DD" date headings at the start of a line.
const DATE_HEADING_RE = /^#\s*(\d{4}-\d{2}-\d{2})\s*$/m;

// Matches sentence boundaries.
const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+/;

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
 * Split text into paragraphs (one or more blank lines separate paragraphs).
 * @param {string} text
 * @returns {Array<string>}
 */
function splitParagraphs(text) {
    if (!text) return [];
    return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

/**
 * Split a paragraph into sentences.
 * @param {string} text
 * @returns {Array<string>}
 */
function splitSentences(text) {
    if (!text) return [];
    return text.split(SENTENCE_SPLIT_RE).map((s) => s.trim()).filter(Boolean);
}

/**
 * Detect date headings and split a journal into date-sections.
 * Returns sections like [{ date: '2026-11-01', heading: '# 2026-11-01', content: '...' }]
 * or a single section with date null when no date headings found.
 * @param {string} text
 * @returns {Array<{date:string|null, heading:string|null, content:string}>}
 */
function splitByDate(text) {
    if (!text) return [];

    const lines = text.split('\n');
    const sections = [];
    let currentDate = null;
    let currentHeading = null;
    let currentLines = [];

    for (const line of lines) {
        const m = DATE_HEADING_RE.exec(line);
        if (m) {
            // Flush previous section.
            if (currentLines.length > 0 || currentDate !== null) {
                sections.push({
                    date: currentDate,
                    heading: currentHeading,
                    content: currentLines.join('\n').trim(),
                });
            }
            currentDate = m[1];
            currentHeading = line;
            currentLines = [];
        } else {
            currentLines.push(line);
        }
    }

    // Flush last section.
    if (currentLines.length > 0 || currentDate !== null) {
        sections.push({
            date: currentDate,
            heading: currentHeading,
            content: currentLines.join('\n').trim(),
        });
    }

    // If no date headings at all, return a single undated section.
    if (sections.length === 1 && sections[0].date === null) {
        return [{ date: null, heading: null, content: text }];
    }

    return sections.filter((s) => s.content.length > 0);
}

/**
 * Greedily pack paragraphs into chunks of at most `maxWords` words.
 * Paragraphs are kept whole unless a single paragraph exceeds the limit,
 * in which case it is split by sentence boundaries.
 * @param {Array<string>} paragraphs
 * @param {number} maxWords
 * @returns {Array<string>}
 */
function packChunks(paragraphs, maxWords = DEFAULT_CHUNK_WORDS) {
    const chunks = [];
    let current = '';
    let currentWords = 0;

    for (const para of paragraphs) {
        const paraWords = countWords(para);

        if (paraWords === 0) continue;

        // Single paragraph too big -> split by sentences.
        if (paraWords > maxWords) {
            // Flush current chunk first.
            if (currentWords > 0) {
                chunks.push(current.trim());
                current = '';
                currentWords = 0;
            }

            const sentences = splitSentences(para);
            let sentenceChunk = '';
            let sentenceWords = 0;
            for (const sentence of sentences) {
                const sWords = countWords(sentence);
                if (sentenceWords + sWords > maxWords && sentenceWords > 0) {
                    chunks.push(sentenceChunk.trim());
                    sentenceChunk = sentence;
                    sentenceWords = sWords;
                } else {
                    sentenceChunk = sentenceChunk
                        ? `${sentenceChunk} ${sentence}`
                        : sentence;
                    sentenceWords += sWords;
                }
            }
            if (sentenceWords > 0) {
                chunks.push(sentenceChunk.trim());
            }
            continue;
        }

        if (currentWords + paraWords > maxWords && currentWords > 0) {
            chunks.push(current.trim());
            current = para;
            currentWords = paraWords;
        } else {
            current = current ? `${current}\n\n${para}` : para;
            currentWords += paraWords;
        }
    }

    if (currentWords > 0) {
        chunks.push(current.trim());
    }

    return chunks;
}

/**
 * Chunk a document for map-reduce processing.
 *
 * For journal files, date headings are detected first so entries stay
 * together; then normal paragraph/sentence chunking is applied per date
 * section.
 *
 * @param {string} text
 * @param {Object} options
 * @param {number} [options.maxWords=1500] - Target max words per chunk.
 * @param {boolean} [options.detectDates=true] - Detect journal date headings.
 * @returns {Array<{index:number, text:string, words:number, date:string|null, heading:string|null}>}
 */
function chunkText(text, options = {}) {
    const maxWords = options.maxWords || DEFAULT_CHUNK_WORDS;
    const detectDates = options.detectDates !== false;

    const sections = detectDates ? splitByDate(text) : [{ date: null, heading: null, content: text }];

    const chunks = [];
    let index = 0;

    for (const section of sections) {
        const paragraphs = splitParagraphs(section.content);
        const sectionChunks = packChunks(paragraphs, maxWords);
        for (const chunkText of sectionChunks) {
            chunks.push({
                index,
                text: chunkText,
                words: countWords(chunkText),
                date: section.date,
                heading: section.heading,
            });
            index += 1;
        }
    }

    return chunks;
}

/**
 * Estimate tokens from word count (~1.3 tokens per word, conservative).
 * @param {number} words
 * @returns {number}
 */
function estimateTokens(words) {
    return Math.ceil(words * 1.3);
}

module.exports = {
    countWords,
    splitParagraphs,
    splitSentences,
    splitByDate,
    packChunks,
    chunkText,
    estimateTokens,
    DEFAULT_CHUNK_WORDS,
    DATE_HEADING_RE,
};
