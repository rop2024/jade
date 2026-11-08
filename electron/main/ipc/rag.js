const { ipcMain } = require('electron');
const { getRAGService } = require('../services/rag');

let indexingJob = null;

function registerRAGIpcHandlers(mainWindow) {
    const rag = getRAGService();

    function send(channel, payload) {
        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isDevToolsDestroyed()) {
            mainWindow.webContents.send(channel, payload);
        }
    }

    // ============================================
    // RAG Indexing
    // ============================================
    ipcMain.handle('rag:index', async (event, { vaultPath, excludedFolders }) => {
        if (indexingJob) {
            return { error: 'Indexing already in progress' };
        }

        indexingJob = (async () => {
            try {
                const result = await rag.indexVault(vaultPath, excludedFolders, (progress) => {
                    send('rag:progress', progress);
                });
                send('rag:done', result);
                return result;
            } catch (err) {
                send('rag:error', { message: err.message });
                throw err;
            } finally {
                indexingJob = null;
                send('rag:idle', {});
            }
        })();

        return { started: true };
    });

    ipcMain.handle('rag:stop', () => {
        rag.stopIndexing();
        indexingJob = null;
        send('rag:idle', {});
        return { stopped: true };
    });

    ipcMain.handle('rag:status', () => {
        return rag.getIndexStatus();
    });

    ipcMain.handle('rag:chunkCount', () => {
        return { count: rag.getChunkCount() };
    });

    // ============================================
    // RAG Search / Retrieval
    // ============================================
    ipcMain.handle('rag:search', async (event, { query, vaultPath, topK }) => {
        const results = await rag.searchChunks(query, vaultPath, topK);
        return { results };
    });

    // ============================================
    // RAG Prompt Construction
    // ============================================
    ipcMain.handle('rag:buildPrompt', async (event, { query, chunks, aboutMe }) => {
        const prompt = rag.buildRagPrompt(query, chunks, aboutMe);
        return { prompt };
    });

    // ============================================
    // RAG File removal (when a vault file is deleted)
    // ============================================
    ipcMain.handle('rag:removeFile', async (event, { filePath }) => {
        rag.removeFileChunks(filePath);
        return { removed: true };
    });
}

module.exports = { registerRAGIpcHandlers };
