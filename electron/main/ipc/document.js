const { ipcMain } = require('electron');
const { dialog } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { parseFile } = require('../services/importer');
const { mapReduce, needsMapReduce } = require('../services/mapReduce');
const { loadMode } = require('../services/modes');
const { getAboutMe } = require('../services/context');
const { getDatabase } = require('../services/db');

const chokidar = require('chokidar');

// In-flight processing jobs keyed by job id.
const processingJobs = new Map();

// Folder watchers keyed by folder path.
const folderWatchers = new Map();

function send(mainWindow, channel, payload) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, payload);
    }
}

function hashContent(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

function registerDocumentIpcHandlers(mainWindow) {
    const db = getDatabase();

    // ============================================
    // Map-reduce processing
    // ============================================
    ipcMain.handle('document:process', async (event, {
        filePath, model, modeId, jobId,
    }) => {
        const parsed = await parseFile(filePath);
        const mode = modeId ? loadMode(modeId) : null;
        const aboutMe = getAboutMe();

        const controller = new AbortController();
        processingJobs.set(jobId, { controller, type: 'process', filePath });

        try {
            const result = await mapReduce({
                content: parsed.content,
                model: (mode && mode.model) || model,
                modeId,
                modeSystem: mode ? mode.system : null,
                aboutMe,
                onProgress: (progress) => {
                    send(mainWindow, 'document:progress', { jobId, ...progress });
                },
                signal: controller.signal,
            });

            send(mainWindow, 'document:done', {
                jobId,
                summary: result.summary,
                parts: result.parts,
                filename: parsed.filename,
                wordCount: parsed.wordCount,
            });
            return { success: true };
        } catch (err) {
            if (err.message === 'Aborted') {
                send(mainWindow, 'document:cancelled', { jobId });
                return { cancelled: true };
            }
            send(mainWindow, 'document:error', { jobId, message: err.message });
            return { success: false, error: err.message };
        } finally {
            processingJobs.delete(jobId);
        }
    });

    ipcMain.on('document:cancel', (event, { jobId }) => {
        const job = processingJobs.get(jobId);
        if (job) {
            job.controller.abort();
        }
    });

    // ============================================
    // Batch processing
    // ============================================
    ipcMain.handle('batch:process', async (event, {
        folder, model, modeId, jobId,
    }) => {
        const entries = await fs.readdir(folder, { withFileTypes: true });
        const files = entries
            .filter((e) => e.isFile())
            .map((e) => path.join(folder, e.name))
            .filter((f) => ['.txt', '.md', '.pdf', '.docx'].includes(path.extname(f).toLowerCase()));

        const controller = new AbortController();
        processingJobs.set(jobId, { controller, type: 'batch', folder });

        const results = [];
        const mode = modeId ? loadMode(modeId) : null;
        const aboutMe = getAboutMe();

        try {
            for (let i = 0; i < files.length; i++) {
                if (controller.signal.aborted) break;

                const filePath = files[i];
                const content = await readFileContent(filePath);
                const contentHash = hashContent(content);

                // Skip if already processed with same content + config.
                const already = await isAlreadyProcessed(filePath, contentHash, modeId, model);
                if (already) {
                    results.push({ filePath, fileName: path.basename(filePath), status: 'skipped' });
                    send(mainWindow, 'batch:progress', {
                        jobId, part: i + 1, total: files.length,
                        fileName: path.basename(filePath), status: 'skipped',
                    });
                    continue;
                }

                send(mainWindow, 'batch:progress', {
                    jobId, part: i + 1, total: files.length,
                    fileName: path.basename(filePath), status: 'processing',
                });

                try {
                    const result = await mapReduce({
                        content,
                        model: (mode && mode.model) || model,
                        modeId,
                        modeSystem: mode ? mode.system : null,
                        aboutMe,
                        signal: controller.signal,
                    });

                    const outPath = await saveBatchNote(
                        filePath, result.summary, { model, modeId, contentHash },
                    );

                    results.push({
                        filePath,
                        fileName: path.basename(filePath),
                        status: 'completed',
                        outputPath: outPath,
                        completedAt: new Date().toISOString(),
                    });

                    send(mainWindow, 'batch:progress', {
                        jobId, part: i + 1, total: files.length,
                        fileName: path.basename(filePath), status: 'completed',
                        outputPath: outPath,
                    });
                } catch (err) {
                    results.push({
                        filePath,
                        fileName: path.basename(filePath),
                        status: 'error',
                        error: err.message,
                        completedAt: new Date().toISOString(),
                    });
                    send(mainWindow, 'batch:progress', {
                        jobId, part: i + 1, total: files.length,
                        fileName: path.basename(filePath), status: 'error',
                        error: err.message,
                    });
                }
            }

            send(mainWindow, 'batch:done', { jobId, results });
            return { success: true };
        } catch (err) {
            send(mainWindow, 'batch:error', { jobId, message: err.message });
            return { success: false, error: err.message };
        } finally {
            processingJobs.delete(jobId);
        }
    });

    ipcMain.on('batch:cancel', (event, { jobId }) => {
        const job = processingJobs.get(jobId);
        if (job) {
            job.controller.abort();
        }
    });

    // ============================================
    // Folder watching (optional)
    // ============================================
    ipcMain.handle('watch:start', async (event, { folder }) => {
        if (folderWatchers.has(folder)) {
            return { watching: true };
        }

        const watcher = chokidar.watch(folder, {
            ignored: /(^|[\/\\])\../,
            persistent: true,
            ignoreInitial: true,
        });

        const pendingQueue = new Set();

        watcher.on('add', async (filePath) => {
            const ext = path.extname(filePath).toLowerCase();
            if (!['.txt', '.md', '.pdf', '.docx'].includes(ext)) return;

            // Wait briefly to let the file finish being written.
            await new Promise((r) => setTimeout(r, 1000));

            pendingQueue.add(filePath);
            send(mainWindow, 'watch:detected', { filePath, fileName: path.basename(filePath) });
        });

        folderWatchers.set(folder, { watcher, pendingQueue });
        return { watching: true };
    });

    ipcMain.handle('watch:stop', (event, { folder }) => {
        const watcherEntry = folderWatchers.get(folder);
        if (watcherEntry) {
            watcherEntry.watcher.close();
            folderWatchers.delete(folder);
            return { stopped: true };
        }
        return { stopped: false };
    });

    ipcMain.handle('watch:approve', async (event, { filePath }) => {
        // Process the detected file using default settings.
        const { getSetting } = require('../services/db');
        const db = getDatabase();
        const vault = db.getSetting('vault_path') || null;
        // Default processing - user can configure via settings later.
        return { approved: true, filePath, vault };
    });
}

async function readFileContent(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
        const pdf = require('pdf-parse');
        const dataBuffer = await fs.readFile(filePath);
        const pdfData = await pdf(dataBuffer);
        return pdfData.text || '';
    }
    if (ext === '.docx') {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value || '';
    }
    return await fs.readFile(filePath, 'utf-8');
}

async function isAlreadyProcessed(filePath, contentHash, modeId, model) {
    try {
        const row = dbPrepare(
            `SELECT content_hash FROM processed_files WHERE file_path = @file_path AND content_hash = @content_hash AND mode_id = @mode_id AND model = @model`
        ).get({ file_path: filePath, content_hash: contentHash, mode_id: modeId || null, model: model || null });
        return !!row;
    } catch {
        // Table may not exist yet; create it.
        try {
            getDatabase().prepare(
                `CREATE TABLE IF NOT EXISTS processed_files (
                    id INTEGER PRIMARY KEY,
                    file_path TEXT,
                    content_hash TEXT,
                    mode_id TEXT,
                    model TEXT,
                    output_path TEXT,
                    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`
            ).run();
        } catch {}
        return false;
    }
}

async function saveBatchNote(filePath, summary, config) {
    const db = getDatabase();
    const fileName = path.basename(filePath, path.extname(filePath));
    const outName = `${fileName} - summary.md`;
    const outPath = path.join(path.dirname(filePath), outName);

    await fs.writeFile(outPath, summary, 'utf-8');

    try {
        db.prepare(
            `INSERT OR REPLACE INTO processed_files (file_path, content_hash, mode_id, model, output_path, processed_at)
             VALUES (@file_path, @content_hash, @mode_id, @model, @output_path, @processed_at)`
        ).run({
            file_path: filePath,
            content_hash: config.contentHash || hashContent(summary),
            mode_id: config.modeId || null,
            model: config.model || null,
            output_path: outPath,
            processed_at: new Date().toISOString(),
        });
    } catch {
        // Best-effort recording.
    }

    return outPath;
}

function dbPrepare(sql) {
    return getDatabase().prepare(sql);
}

module.exports = { registerDocumentIpcHandlers, processingJobs, folderWatchers };
