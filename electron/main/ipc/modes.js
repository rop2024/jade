const { ipcMain } = require('electron');
const { loadModes, loadMode, saveMode, deleteMode } = require('../services/modes');

function registerModesIpcHandlers() {
    // ============================================
    // Modes
    // ============================================
    ipcMain.handle('mode:list', () => loadModes());

    ipcMain.handle('mode:get', (event, { id }) => loadMode(id));

    ipcMain.handle('mode:save', (event, { mode }) => saveMode(mode));

    ipcMain.handle('mode:delete', (event, { id }) => deleteMode(id));
}

module.exports = { registerModesIpcHandlers };
