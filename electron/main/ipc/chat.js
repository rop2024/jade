const { ipcMain } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');
const { chat, generateTitle, isOllamaRunning, listModels, startOllama } = require('../services/ollama');
const { getDatabase } = require('../services/db');
const { loadMode } = require('../services/modes');
const { getAboutMe, buildMessages } = require('../services/context');

/**
 * Map of active chat request IDs to their AbortController instances.
 * @type {Map<string, AbortController>}
 */
const activeControllers = new Map();
const responseDirectory = path.join(os.tmpdir(), 'jade-chat-responses');
const RESPONSE_CLEANUP_DELAY = 60 * 1000;

let nextRequestId = 1;
const DEBUG_CHAT =
    process.env.NODE_ENV === 'development' || process.env.JADE_DEBUG_OLLAMA === '1';

function debugChat(message) {
    if (DEBUG_CHAT) console.log(`[Chat] ${message}`);
}

function createResponseFile(requestId) {
    fs.mkdirSync(responseDirectory, { recursive: true });
    const filePath = path.join(responseDirectory, `${requestId}-${randomUUID()}.md`);
    fs.writeFileSync(filePath, '', 'utf8');
    return filePath;
}

function scheduleResponseCleanup(filePath) {
    setTimeout(() => {
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                debugChat(`failed to clean response file ${filePath}: ${err.message}`);
            }
        }
    }, RESPONSE_CLEANUP_DELAY).unref();
}

function isResponseFile(filePath) {
    const directory = path.resolve(responseDirectory) + path.sep;
    return typeof filePath === 'string' && path.resolve(filePath).startsWith(directory);
}

function generateRequestId() {
    return `chat_${Date.now()}_${nextRequestId++}`;
}

function send(mainWindow, channel, payload) {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isDevToolsDestroyed()) {
        mainWindow.webContents.send(channel, payload);
    }
}

function registerChatIpcHandlers(mainWindowOrGetter) {
    // The handlers are registered before the BrowserWindow is created. Resolve
    // it at event time so streamed tokens reach the renderer.
    const getMainWindow = typeof mainWindowOrGetter === 'function'
        ? mainWindowOrGetter
        : () => mainWindowOrGetter;

    ipcMain.handle('chat:start', async (event, {
        model, messages, conversationId, firstUserMessage, modeId, temperature,
    }) => {
        const requestId = generateRequestId();
        const controller = new AbortController();
        const responseFile = createResponseFile(requestId);
        activeControllers.set(requestId, controller);
        debugChat(`started request=${requestId} model=${model}`);

        const signal = controller.signal;
        const db = getDatabase();

        const cleanup = () => {
            activeControllers.delete(requestId);
        };

        let titleResolved = false;

        // Resolve the model, system prompt and options. When a mode is active
        // the prompt is assembled in one place (context.buildMessages) using
        // personal context + mode instructions + template + rules + examples.
        let finalModel = model;
        let options = {};
        let systemPrompt = null;
        let finalMessages = messages || [];

        if (modeId) {
            const mode = loadMode(modeId);
            if (mode) {
                finalModel = mode.model || finalModel;
                if (mode.temperature !== undefined) options.temperature = mode.temperature;
                const aboutMe = getAboutMe();
                // buildMessages already includes personal context + mode
                // instructions as the system message, so no extra systemPrompt.
                finalMessages = buildMessages(mode, aboutMe, finalMessages || []);
            }
        } else {
            systemPrompt = db.getSetting('system_prompt') ||
                'You are a helpful assistant.';
            if (temperature !== undefined) options.temperature = temperature;
        }

        (async () => {
            try {
                const result = await chat({
                    model: finalModel,
                    messages: finalMessages,
                    signal,
                    systemPrompt,
                    options,
                    onToken: (token) => {
                        try {
                            fs.appendFileSync(responseFile, token, 'utf8');
                            send(getMainWindow(), 'chat:token', {
                                requestId,
                                token,
                                filePath: responseFile,
                            });
                        } catch (err) {
                            debugChat(`failed to write response file: ${err.message}`);
                            controller.abort();
                            send(getMainWindow(), 'chat:error', {
                                requestId,
                                message: 'Failed to write the temporary Markdown response.',
                                code: 'response_file',
                            });
                            cleanup();
                        }
                    },
                    onDone: () => {
                        debugChat(`completed request=${requestId}`);
                        send(getMainWindow(), 'chat:done', {
                            requestId,
                            filePath: responseFile,
                        });
                        scheduleResponseCleanup(responseFile);
                        // Auto-title a brand-new conversation after the first
                        // assistant response completes.
                        if (conversationId && !titleResolved) {
                            titleResolved = true;
                            generateConversationTitle({
                                model: finalModel, conversationId, firstUserMessage,
                            }).catch(() => {
                                // Title generation is best-effort.
                            });
                        }
                        cleanup();
                    },
                    onError: (err) => {
                        debugChat(`failed request=${requestId} code=${err.code}: ${err.message}`);
                        send(getMainWindow(), 'chat:error', {
                            requestId,
                            message: err.message,
                            code: err.code,
                        });
                        scheduleResponseCleanup(responseFile);
                        cleanup();
                    },
                });
                if (result.aborted) {
                    scheduleResponseCleanup(responseFile);
                    cleanup();
                }
            } catch (err) {
                if (!signal.aborted) {
                    send(getMainWindow(), 'chat:error', {
                        requestId,
                        message: err.message || 'Unknown Ollama error',
                        code: 'unknown',
                    });
                    scheduleResponseCleanup(responseFile);
                    cleanup();
                }
            }
        })();

        return { requestId };
    });

    ipcMain.on('chat:stop', (event, { requestId }) => {
        const controller = activeControllers.get(requestId);
        if (controller) {
            controller.abort();
        }
    });

    ipcMain.on('chat:dispose', (event, { requestId }) => {
        const controller = activeControllers.get(requestId);
        if (controller) {
            controller.abort();
            activeControllers.delete(requestId);
        }
    });

    ipcMain.handle('chat:readFile', async (event, filePath) => {
        if (!isResponseFile(filePath)) {
            throw new Error('Invalid chat response file.');
        }
        return fs.promises.readFile(filePath, 'utf8');
    });

    ipcMain.handle('ollama:status', async () => {
        const available = await isOllamaRunning();
        let models = [];
        if (available) {
            try {
                models = await listModels();
            } catch {
                models = [];
            }
        }
        return { available, models };
    });

    ipcMain.handle('ollama:start', async () => {
        return await startOllama();
    });
}

/**
 * Generate a conversation title (best-effort, with timeout). Falls back to
 * the first characters of the user message on failure or slowness.
 */
async function generateConversationTitle({ model, conversationId, firstUserMessage }) {
    const titleController = new AbortController();
    const titleTimeout = setTimeout(() => titleController.abort(), 5000);

    let title;
    try {
        title = await generateTitle({
            model,
            firstUserMessage,
            signal: titleController.signal,
        });
    } catch {
        title = firstUserMessage.slice(0, 40);
    } finally {
        clearTimeout(titleTimeout);
    }

    if (!title) {
        title = firstUserMessage.slice(0, 40);
    }

    const db = getDatabase();
    try {
        db.renameConversation(conversationId, title);
    } catch {
        // Best-effort.
    }
    return title;
}

module.exports = {
    registerChatIpcHandlers,
    activeControllers,
    generateRequestId,
};
