const { app, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');

let tray = null;
let mainWindow = null;
let isTrayModeEnabled = true;
let quitCallback = null;

/**
 * Creates a system tray icon.
 */
function createTray(mainWindowRef, options = {}) {
    mainWindow = mainWindowRef;
    isTrayModeEnabled = options.trayMode !== false;
    quitCallback = options.quitCallback || (() => app.quit());

    // Try to load a tray icon, fall back to a simple one
    let icon = null;
    try {
        const iconPath = path.join(__dirname, '../../assets/icon.png');
        icon = nativeImage.createFromPath(iconPath);
    } catch {
        // Fall back to creating a simple icon
    }

    if (!icon || icon.isEmpty()) {
        // Create a simple 16x16 icon programmatically
        icon = nativeImage.createEmpty();
    }

    tray = new Tray(icon);
    tray.setToolTip('LLMDesk - AI Desktop Assistant');

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open LLMDesk',
            click: () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.show();
                    if (mainWindow.isMinimized()) mainWindow.restore();
                }
            },
        },
        {
            label: 'Hide LLMDesk',
            click: () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.hide();
                }
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                quitCallback();
            },
        },
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            if (mainWindow.isMinimized()) mainWindow.restore();
        }
    });

    return tray;
}

/**
 * Destroys the tray icon.
 */
function destroyTray() {
    if (tray) {
        tray.destroy();
        tray = null;
    }
}

/**
 * Get the tray instance.
 */
function getTray() {
    return tray;
}

module.exports = {
    createTray,
    destroyTray,
    getTray,
};
