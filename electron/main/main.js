const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { EventEmitter } = require('events');

// Avoid GPU-process crashes on systems without a supported GPU/sandbox.
// The app still renders via SwiftShader (software WebGL).
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');

// Services
const SettingsService = require('./services/SettingsService');
const WindowManager = require('./services/WindowManager');
const LoggerService = require('./services/LoggerService');
const ErrorHandler = require('./services/ErrorHandler').ErrorHandler;
const { DatabaseService } = require('../../database/database');
const { getApiClient } = require('../../api/client');
const { createEngine } = require('../../sync/engine');
const { getDatabase } = require('./services/db');
const { seedDefaultModes } = require('./services/modes');
const { ensureAboutMe } = require('./services/context');
const { warmUpOllama } = require('./services/OllamaWarmupService');
const { registerGlobalHotkeys } = require('./services/QuickWindowService');
const { createTray, destroyTray, getTray } = require('./services/TrayService');
const { registerPhase8IpcHandlers } = require('./ipc/phase8');

// IPC Handlers
const registerIpcHandlers = require('./ipc');

// Global instances
let mainWindow = null;
    let settingsService = null;
    let databaseService = null;
    let chatDatabase = null;
let apiClient = null;
let engine = null;
let loggerService = null;
let errorHandler = null;
let eventEmitter = null;

const isDev = process.env.NODE_ENV === 'development';

// ============================================
// App Lifecycle
// ============================================

async function initializeServices() {
    // Initialize event emitter
    eventEmitter = new EventEmitter();

    // Initialize services
    settingsService = new SettingsService();
    await settingsService.initialize();

    loggerService = new LoggerService();
    await loggerService.initialize();

    errorHandler = new ErrorHandler({
        logger: loggerService,
        mainWindow,
    });

    databaseService = new DatabaseService();
    await databaseService.initialize();

    // Chat persistence database (better-sqlite3, WAL mode)
    chatDatabase = getDatabase();

    // Seed default modes and personal context file on first launch
    seedDefaultModes();
    ensureAboutMe();

    // Get API configuration from settings
    const settings = await settingsService.get();
    apiClient = getApiClient({
        timeout: settings.apiTimeout || 30000,
        userAgent: 'Jade/1.0',
        proxy: settings.proxy || undefined,
    });

    // Initialize engine (replace with your app's core logic)
    engine = createEngine({
        database: databaseService,
        api: apiClient,
        settingsService: settingsService,
        eventEmitter: eventEmitter,
        logger: loggerService,
        errorHandler,
    });

    return {
        settingsService,
        databaseService,
        chatDatabase,
        apiClient,
        engine,
        loggerService,
        eventEmitter,
    };
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: 'Jade',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: !isDev,
        },
        show: false,
        frame: true,
        backgroundColor: '#080A0F',
    });

    // Load the app
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Window event handlers
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    if (errorHandler) {
        errorHandler.mainWindow = mainWindow;
    }

    // Set up progress forwarding (main -> renderer)
    if (eventEmitter) {
        eventEmitter.on('app:progress', (progress) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('app:progress', progress);
            }
        });
    }

    return mainWindow;
}

// App ready
app.whenReady().then(async () => {
    try {
        // Initialize all services
        const services = await initializeServices();

        // Register IPC handlers
        registerIpcHandlers(ipcMain, {
            mainWindow,
            settingsService: services.settingsService,
            databaseService: services.databaseService,
            api: services.apiClient,
            engine: services.engine,
            eventEmitter: services.eventEmitter,
        });

        // Register Phase 8 IPC handlers (hotkeys, tray, startup, backup, lock)
        registerPhase8IpcHandlers(mainWindow, services.settingsService);

        // Register global hotkeys
        registerGlobalHotkeys();

        // Create system tray
        createTray(mainWindow, {
            trayMode: true,
            quitCallback: async () => {
                await services.settingsService.setSetting('trayMode', false);
                app.quit();
            },
        });

        // Warm up Ollama on launch
        (async () => {
            try {
                const settings = await services.settingsService.get();
                const model = settings.defaultModel || 'llama3.2';
                const result = await warmUpOllama(model);
                if (!result.success) {
                    console.log('Ollama warm-up skipped:', result.error);
                } else {
                    console.log('Ollama warmed up successfully');
                }
            } catch (err) {
                console.log('Ollama warm-up not available:', err.message);
            }
        })();

        // Create main window
        createWindow();

        app.on('activate', function () {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });

        console.log('App initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        app.quit();
    }
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        // If tray mode is enabled, hide instead of quit
        if (getTray && getTray()) {
            return;
        }
        app.quit();
    }
});

// ============================================
// Cleanup
// ============================================

app.on('before-quit', async () => {
    if (databaseService) {
        databaseService.close();
    }
    if (apiClient) {
        await apiClient.close();
    }
    if (engine && engine.isRunning) {
        await engine.cancel();
    }
});

// ============================================
// Security
// ============================================

app.on('web-contents-created', (event, contents) => {
    if (isDev) {
        contents.session.webRequest.onBeforeSendHeaders((details, callback) => {
            callback({ requestHeaders: { ...details.requestHeaders, 'Origin': 'http://localhost:5173' } });
        });
    }
});

// Disable navigation
app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
        event.preventDefault();
    });
});
