const fs = require('fs/promises');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const SUPPORTED_EXTENSIONS = new Set(['.txt', '.md', '.pdf', '.docx']);

/**
 * Check whether a file extension is supported for import.
 * @param {string} filePath
 * @returns {boolean}
 */
function isSupported(filePath) {
    const ext = path.extname(filePath || '').toLowerCase();
    return SUPPORTED_EXTENSIONS.has(ext);
}

/**
 * Get the lowercase file extension (without the dot).
 * @param {string} filePath
 * @returns {string}
 */
function getFileType(filePath) {
    return path.extname(filePath || '').toLowerCase().slice(1);
}

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
 * Parse a document file and return structured content.
 *
 * @param {string} filePath - Absolute path to the file (from webUtils.getPathForFile).
 * @returns {Promise<{filename:string, content:string, wordCount:number, fileType:string}>}
 */
async function parseFile(filePath) {
    if (!filePath) throw new Error('No file path provided.');
    const ext = path.extname(filePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
        throw new Error(`Unsupported file type: ${ext || '(none)'}. Supported: .txt, .md, .pdf, .docx`);
    }

    const filename = path.basename(filePath);
    const fileType = getFileType(filePath);
    let content = '';

    if (ext === '.pdf') {
        const dataBuffer = await fs.readFile(filePath);
        const pdfData = await pdf(dataBuffer);
        content = pdfData.text || '';
    } else if (ext === '.docx') {
        const result = await mammoth.extractRawText({ path: filePath });
        content = result.value || '';
    } else {
        // .txt and .md
        content = await fs.readFile(filePath, 'utf-8');
    }

    return {
        filename,
        content,
        wordCount: countWords(content),
        fileType,
    };
}

module.exports = {
    parseFile,
    isSupported,
    getFileType,
    countWords,
    SUPPORTED_EXTENSIONS,
};
