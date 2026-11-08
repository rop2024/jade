const { ipcMain, app, shell, clipboard } = require('electron');
const { registerGlobalHotkeys, unregisterGlobalHotkeys, toggleQuickWindow, getQuickWindow, sendClipboardToQuickWindow } = require('../services/QuickWindowService');
const { createTray, destroyTray, getTray } = require('../services/TrayService');
const { setStartup, isStartupEnabled } = require('../services/StartupService');
const { warmUpOllama, isOllamaAvailable } = require('../services/OllamaWarmupService');
const { createBackup, restoreBackup, getDefaultBackupPath } = require('../services/BackupService');
const { isLockConfigured, setLockPassword, removeLockPassword, checkLockPassword, requireUnlock } = require('../services/AppLockService');

let mainWindowRef = null;
let settingsServiceRef = null;

function registerPhase8IpcHandlers(mainWindow, settingsService) {
    mainWindowRef = mainWindow;
    settingsServiceRef = settingsService;

    // ============================================
    // Global Hotkeys
    // ============================================
    ipcMain.handle('hotkey:register', () => {
        registerGlobalHotkeys();
        return { registered: true };
    });

    ipcMain.handle('hotkey:unregister', () => {
        unregisterGlobalHotkeys();
        return { unregistered: true };
    });

    ipcMain.handle('hotkey:toggleQuickWindow', () => {
        toggleQuickWindow();
        return { toggled: true };
    });

    ipcMain.handle('hotkey:isQuickWindowVisible', () => {
        return { visible: getQuickWindow() && !getQuickWindow().isDestroyed() && getQuickWindow().isVisible() };
    });

    // Clipboard processing
    ipcMain.handle('clipboard:read', () => {
        return { text: clipboard.readText() };
    });

    ipcMain.handle('clipboard:write', (event, { text }) => {
        clipboard.writeText(text);
        return { written: true };
    });

    ipcMain.handle('clipboard:processAndOpen', async (event, { text }) => {
        sendClipboardToQuickWindow(text);
        toggleQuickWindow();
        return { opened: true };
    });

    // ============================================
    // System Tray
    // ============================================
    ipcMain.handle('tray:create', (event, { trayMode = true }) => {
        const quitCallback = async () => {
            if (settingsServiceRef) {
                await settingsServiceRef.set('trayMode', false);
            }
            app.quit();
        };
        createTray(mainWindow, { trayMode, quitCallback });
        return { created: true };
    });

    ipcMain.handle('tray:destroy', () => {
        destroyTray();
        return { destroyed: true };
    });

    ipcMain.handle('window:hide', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.hide();
            return { hidden: true };
        }
        return { hidden: false };
    });

    // ============================================
    // Startup with Windows
    // ============================================
    ipcMain.handle('startup:get', () => {
        return { enabled: isStartupEnabled() };
    });

    ipcMain.handle('startup:set', (event, { enabled }) => {
        return setStartup(enabled);
    });

    // ============================================
    // Ollama Warm-up
    // ============================================
    ipcMain.handle('ollama:warmUp', async (event, { model }) => {
        return await warmUpOllama(model);
    });

    ipcMain.handle('ollama:checkAvailable', async () => {
        return { available: await isOllamaAvailable() };
    });

    // ============================================
    // Backup
    // ============================================
    ipcMain.handle('backup:create', async (event, { outputPath }) => {
        const targetPath = outputPath || getDefaultBackupPath();
        return await createBackup(targetPath);
    });

    ipcMain.handle('backup:restore', async (event, { zipPath }) => {
        return await restoreBackup(zipPath);
    });

    ipcMain.handle('backup:getDefaultPath', () => {
        return { path: getDefaultBackupPath() };
    });

    // ============================================
    // Application Lock
    // ============================================
    ipcMain.handle('lock:isConfigured', async () => {
        return { configured: await isLockConfigured(settingsServiceRef) };
    });

    ipcMain.handle('lock:set', async (event, { password }) => {
        await setLockPassword(password, settingsServiceRef);
        return { set: true };
    });

    ipcMain.handle('lock:remove', async () => {
        await removeLockPassword(settingsServiceRef);
        return { removed: true };
    });

    ipcMain.handle('lock:check', async (event, { password }) => {
        return { valid: await checkLockPassword(password, settingsServiceRef) };
    });

    ipcMain.handle('lock:requireUnlock', async (event, { password }) => {
        if (!password) return { unlocked: false };
        return { unlocked: await checkLockPassword(password, settingsServiceRef) };
    });

    // ============================================
    // Open Ollama install link
    // ============================================
    ipcMain.handle('ollama:openInstallLink', async () => {
        await shell.openExternal('https://ollama.com/download');
        return { opened: true };
    });
}

module.exports = { registerPhase8IpcHandlers };
