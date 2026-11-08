const { ipcMain } = require('electron');
const { chat, generateTitle, isOllamaRunning, listModels } = require('../services/ollama');
const { getDatabase } = require('../services/db');
const { loadMode } = require('../services/modes');
const { getAboutMe, buildMessages } = require('../services/context');

/**
 * Map of active chat request IDs to their AbortController instances.
 * @type {Map<string, AbortController>}
 */
const activeControllers = new Map();

let nextRequestId = 1;

function generateRequestId() {
    return `chat_${Date.now()}_${nextRequestId++}`;
}

function send(mainWindow, channel, payload) {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isDevToolsDestroyed()) {
        mainWindow.webContents.send(channel, payload);
    }
}

function registerChatIpcHandlers(mainWindow) {

    ipcMain.handle('chat:start', async (event, {
        model, messages, conversationId, firstUserMessage, modeId, temperature,
    }) => {
        const requestId = generateRequestId();
        const controller = new AbortController();
        activeControllers.set(requestId, controller);

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
                await chat({
                    model: finalModel,
                    messages: finalMessages,
                    signal,
                    systemPrompt,
                    options,
                    onToken: (token) => {
                        send(mainWindow, 'chat:token', { requestId, token });
                    },
                    onDone: () => {
                        send(mainWindow, 'chat:done', { requestId });
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
                        send(mainWindow, 'chat:error', {
                            requestId,
                            message: err.message,
                            code: err.code,
                        });
                        cleanup();
                    },
                });
            } catch (err) {
                if (!signal.aborted) {
                    send(mainWindow, 'chat:error', {
                        requestId,
                        message: err.message || 'Unknown Ollama error',
                        code: 'unknown',
                    });
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
