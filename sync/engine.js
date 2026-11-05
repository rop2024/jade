/**
 * Core engine / background task runner.
 * Replace `run()` with your app's main logic (e.g. a sync engine).
 * Emits 'app:progress' events that are forwarded to the renderer.
 */
class Engine {
    constructor({ database, api, settingsService, eventEmitter, logger, errorHandler }) {
        this.db = database;
        this.api = api;
        this.settings = settingsService;
        this.events = eventEmitter;
        this.logger = logger;
        this.errorHandler = errorHandler;
        this.isRunning = false;
        this.shouldCancel = false;
        this.progress = { status: 'idle', message: '', phase: 'idle' };
    }

    async run(payload = {}) {
        if (this.isRunning) {
            throw new Error('Task already in progress');
        }

        this.isRunning = true;
        this.shouldCancel = false;
        this.progress.status = 'running';
        this.emitProgress('Starting task...', 'running');

        try {
            // TODO: implement your core logic here.
            // Example:
            // const data = await this.api.get('/some-endpoint');
            // this.db.run('INSERT INTO items (name, data) VALUES (?, ?)', [payload.name, JSON.stringify(data)]);

            this.progress.status = 'complete';
            this.emitProgress('Task complete', 'complete');

            return { success: true };
        } catch (error) {
            this.progress.status = 'error';
            this.emitProgress(`Failed: ${error.message}`, 'error');
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    async cancel() {
        if (!this.isRunning) {
            throw new Error('No task in progress');
        }
        this.shouldCancel = true;
        this.emitProgress('Cancelling...', 'cancelling');
        return { success: true, message: 'Task cancelled' };
    }

    getStatus() {
        return { isRunning: this.isRunning, progress: this.progress };
    }

    emitProgress(message, phase) {
        this.progress.message = message;
        if (phase) this.progress.phase = phase;
        if (this.events) {
            this.events.emit('app:progress', { ...this.progress, isRunning: this.isRunning });
        }
    }
}

function createEngine(opts) {
    return new Engine(opts);
}

module.exports = { Engine, createEngine };
