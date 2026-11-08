/**
 * IPC Handlers - Small, focused handlers.
 * React -> Electron communication only.
 */
const { app, dialog, shell } = require('electron');
const fs = require('fs').promises;
const { registerChatIpcHandlers } = require('./chat');
const { registerConversationIpcHandlers } = require('./conversation');
const { registerModesIpcHandlers } = require('./modes');
const { registerContextIpcHandlers } = require('./context');
const { registerFilesIpcHandlers } = require('./files');
const { registerDocumentIpcHandlers } = require('./document');
const { registerRAGIpcHandlers } = require('./rag');

function registerIpcHandlers(ipcMain, {
    mainWindow,
    settingsService,
    databaseService,
    api,
    engine,
    eventEmitter,
}) {
    // ============================================
    // App Handlers
    // ============================================
    ipcMain.handle('app:getVersion', () => app.getVersion());
    ipcMain.handle('app:getPath', (event, name) => app.getPath(name));

    // ============================================
    // Settings Handlers
    // ============================================
    ipcMain.handle('settings:get', async () => settingsService.get());
    ipcMain.handle('settings:update', async (event, settings) => settingsService.setAll(settings));
    ipcMain.handle('settings:reset', async () => settingsService.reset());

    // ============================================
    // Engine / Core task handlers
    // ============================================
    ipcMain.handle('task:run', async (event, payload) => {
        try {
            const result = await engine.run(payload);
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('task:cancel', async () => {
        try {
            const result = await engine.cancel();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('task:status', () => engine.getStatus());

    // ============================================
    // Database Handlers (generic)
    // ============================================
    ipcMain.handle('db:query', async (event, sql, params) => {
        return databaseService.run(sql, params);
    });

    ipcMain.handle('db:getAll', async (event, sql, params) => {
        return databaseService.getAll(sql, params);
    });

    // ============================================
    // Filesystem Handlers
    // ============================================
    ipcMain.handle('fs:readDirectory', async (event, dirPath) => {
        try {
            const files = await fs.readdir(dirPath);
            return { success: true, data: files };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('fs:fileExists', async (event, filePath) => {
        try {
            await fs.access(filePath);
            return { success: true, exists: true };
        } catch {
            return { success: true, exists: false };
        }
    });

    // ============================================
    // Dialog Handlers
    // ============================================
    ipcMain.handle('dialog:openFile', async (event, options) =>
        dialog.showOpenDialog(mainWindow, { properties: ['openFile'], ...options }));

    ipcMain.handle('dialog:openDirectory', async (event, options) =>
        dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'], ...options }));

    ipcMain.handle('dialog:saveFile', async (event, options) =>
        dialog.showSaveDialog(mainWindow, options));

    ipcMain.handle('dialog:showMessage', async (event, options) =>
        dialog.showMessageBox(mainWindow, options));

    // ============================================
    // Utility Handlers
    // ============================================
    ipcMain.handle('util:openExternal', async (event, url) => {
        await shell.openExternal(url);
        return { success: true };
    });

    // ============================================
    // Chat Handlers (Ollama)
    // ============================================
    registerChatIpcHandlers(mainWindow);

    // ============================================
    // Conversation Handlers (SQLite)
    // ============================================
    registerConversationIpcHandlers(mainWindow);

    // ============================================
    // Mode Handlers
    // ============================================
    registerModesIpcHandlers();

    // ============================================
    // Context Handlers (personal context + prompt assembly)
    // ============================================
    registerContextIpcHandlers(mainWindow);

    // ============================================
    // File Import Handlers
    // ============================================
    registerFilesIpcHandlers();

    // ============================================
    // Document Processing Handlers (map-reduce, batch, watch)
    // ============================================
    registerDocumentIpcHandlers(mainWindow);

    // ============================================
    // RAG Handlers (vault search + retrieval-augmented generation)
    // ============================================
    registerRAGIpcHandlers(mainWindow);
}

module.exports = registerIpcHandlers;
