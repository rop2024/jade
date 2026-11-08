const { ipcMain, dialog } = require('electron');
const {
    getAboutMe,
    setAboutMe,
    appendFact,
    countWords,
    buildMessages,
} = require('../services/context');
const { saveNote, listNoteTitles } = require('../services/notes');
const { parseSlashCommand, executeBuiltin } = require('../services/commands');

function registerContextIpcHandlers(mainWindow) {
    // ============================================
    // Personal context (about-me.md)
    // ============================================
    ipcMain.handle('context:get', () => getAboutMe());

    ipcMain.handle('context:set', (event, { content }) => setAboutMe(content));

    ipcMain.handle('context:appendFact', (event, { fact }) => appendFact(fact));

    ipcMain.handle('context:countWords', (event, { text }) => countWords(text));

    // ============================================
    // Prompt assembly (single place)
    // ============================================
    ipcMain.handle('context:buildMessages', (event, { mode, aboutMe, history }) =>
        buildMessages(mode, aboutMe, history));

    // ============================================
    // Vault configuration
    // ============================================
    ipcMain.handle('vault:get', () => {
        const { getSetting } = require('../services/db');
        // Use the settings table via db module
        const db = require('../services/db').getDatabase();
        return { vaultPath: db.getSetting('vault_path') || null };
    });

    ipcMain.handle('vault:set', (event, { vaultPath }) => {
        const db = require('../services/db').getDatabase();
        db.setSetting('vault_path', vaultPath);
        return { success: true };
    });

    ipcMain.handle('vault:pick', async () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
            return { canceled: true, vaultPath: null };
        }
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
        });
        if (result.canceled || !result.filePaths.length) {
            return { canceled: true, vaultPath: null };
        }
        const vaultPath = result.filePaths[0];
        const db = require('../services/db').getDatabase();
        db.setSetting('vault_path', vaultPath);
        return { canceled: false, vaultPath };
    });

    // ============================================
    // Note saving
    // ============================================
    ipcMain.handle('note:save', async (event, { vault, folder, title, body, tags }) => {
        const saved = await saveNote(vault, folder, title, body, tags);
        return saved;
    });

    ipcMain.handle('note:listTitles', async (event, { vault }) => {
        return await listNoteTitles(vault);
    });

    // ============================================
    // Slash command parsing
    // ============================================
    ipcMain.handle('command:parse', (event, { input, modes }) => {
        return parseSlashCommand(input, modes);
    });
}

module.exports = { registerContextIpcHandlers };
