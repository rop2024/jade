const { ipcMain } = require('electron');
const { loadModes, loadMode, saveMode, deleteMode, addFeedbackExample } = require('../services/modes');

function registerModesIpcHandlers() {
    // ============================================
    // Modes
    // ============================================
    ipcMain.handle('mode:list', () => loadModes());

    ipcMain.handle('mode:get', (event, { id }) => loadMode(id));

    ipcMain.handle('mode:save', (event, { mode }) => saveMode(mode));

    ipcMain.handle('mode:delete', (event, { id }) => deleteMode(id));

    // ============================================
    // Feedback examples
    // ============================================
    ipcMain.handle('feedback:addExample', (event, { modeId, example }) =>
        addFeedbackExample(modeId, example));
}

module.exports = { registerModesIpcHandlers };
