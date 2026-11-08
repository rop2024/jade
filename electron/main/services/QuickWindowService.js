const { app, globalShortcut, BrowserWindow } = require('electron');
const path = require('path');

let quickWindow = null;
let isQuickWindowVisible = false;
const isDev = process.env.NODE_ENV === 'development';

/**
 * Creates a small always-on-top quick window for hotkey access.
 */
function createQuickWindow() {
    if (quickWindow && !quickWindow.isDestroyed()) {
        return quickWindow;
    }

    quickWindow = new BrowserWindow({
        width: 500,
        height: 400,
        minWidth: 400,
        minHeight: 300,
        alwaysOnTop: true,
        frame: true,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: !isDev,
        },
        backgroundColor: '#1a1a2e',
    });

    if (isDev) {
        quickWindow.loadURL('http://localhost:5173/#/quick');
        quickWindow.webContents.openDevTools();
    } else {
        quickWindow.loadFile(path.join(__dirname, '../../dist/index.html'), { hash: '/quick' });
    }

    quickWindow.on('blur', () => {
        // Auto-hide quick window when it loses focus
        if (quickWindow && !quickWindow.isDestroyed()) {
            quickWindow.hide();
            isQuickWindowVisible = false;
        }
    });

    quickWindow.on('closed', () => {
        quickWindow = null;
        isQuickWindowVisible = false;
    });

    return quickWindow;
}

/**
 * Toggle the quick window visibility.
 */
function toggleQuickWindow() {
    if (!quickWindow || quickWindow.isDestroyed()) {
        createQuickWindow();
    }

    if (isQuickWindowVisible && quickWindow) {
        quickWindow.hide();
        isQuickWindowVisible = false;
    } else if (quickWindow) {
        quickWindow.show();
        quickWindow.focus();
        isQuickWindowVisible = true;
    }
}

/**
 * Register global hotkeys.
 * Ctrl+Shift+Space - Toggle quick window
 */
function registerGlobalHotkeys() {
    // Quick window toggle
    const quickWindowRegistered = globalShortcut.register('CommandOrControl+Shift+Space', () => {
        toggleQuickWindow();
    });

    if (!quickWindowRegistered) {
        console.error('Failed to register quick window hotkey');
    }

    console.log('Global hotkeys registered');
}

/**
 * Unregister all global hotkeys.
 */
function unregisterGlobalHotkeys() {
    globalShortcut.unregisterAll();
}

/**
 * Get the quick window instance.
 */
function getQuickWindow() {
    return quickWindow;
}

/**
 * Send clipboard content to the quick window.
 */
function sendClipboardToQuickWindow(clipboardText) {
    if (quickWindow && !quickWindow.isDestroyed() && quickWindow.webContents) {
        quickWindow.webContents.send('clipboard:content', { text: clipboardText });
    }
}

module.exports = {
    createQuickWindow,
    toggleQuickWindow,
    registerGlobalHotkeys,
    unregisterGlobalHotkeys,
    getQuickWindow,
    sendClipboardToQuickWindow,
    isQuickWindowVisible: () => isQuickWindowVisible,
};
