const { ipcMain } = require('electron');
const { parseFile, isSupported, getFileType } = require('../services/importer');
const { chunkText, splitByDate, estimateTokens, DEFAULT_CHUNK_WORDS } = require('../services/chunker');

function registerFilesIpcHandlers() {
    // ============================================
    // File import (dropped / selected files)
    // ============================================
    ipcMain.handle('file:parse', async (event, { filePath }) => {
        if (!isSupported(filePath)) {
            throw new Error(`Unsupported file type: ${getFileType(filePath)}`);
        }
        return parseFile(filePath);
    });

    // ============================================
    // Text chunking
    // ============================================
    ipcMain.handle('file:chunk', (event, { text, maxWords, detectDates }) => {
        return chunkText(text, { maxWords, detectDates });
    });

    // ============================================
    // Journal date detection
    // ============================================
    ipcMain.handle('file:detectDates', (event, { text }) => {
        return splitByDate(text);
    });

    // ============================================
    // Token estimation
    // ============================================
    ipcMain.handle('file:estimateTokens', (event, { text }) => {
        return { words: countWords(text), tokens: estimateTokens(countWords(text)) };
    });

    ipcMain.handle('file:isSupported', (event, { filePath }) => {
        return { supported: isSupported(filePath), fileType: getFileType(filePath) };
    });
}

function countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
}

module.exports = { registerFilesIpcHandlers };
