const fs = require('fs/promises');
const path = require('path');
const { app } = require('electron');
const AdmZip = require('adm-zip');

const BACKUP_FILENAME = 'llmdesk-backup.zip';

/**
 * Get paths to back up.
 * @returns {Array<{name: string, path: string}>}
 */
function getBackupPaths() {
    const userData = app.getPath('userData');
    return [
        { name: 'llmdesk.db', path: path.join(userData, 'llmdesk.db') },
        { name: 'about-me.md', path: path.join(userData, 'about-me.md') },
        { name: 'modes', path: path.join(userData, 'modes') },
        { name: 'settings', path: path.join(userData, 'settings.json') },
    ];
}

/**
 * Create a backup ZIP archive.
 * @param {string} outputPath - Path to save the ZIP file
 * @returns {Promise<{success: boolean, path?: string, error?: string}>}
 */
async function createBackup(outputPath) {
    try {
        const zip = new AdmZip();
        const paths = getBackupPaths();

        for (const item of paths) {
            try {
                const stat = await fs.stat(item.path);
                if (stat.isDirectory()) {
                    await addFolderToZip(zip, item.path, item.name);
                } else {
                    zip.addLocalFile(item.path, item.name);
                }
            } catch {
                // Skip missing files
            }
        }

        const zipBuffer = zip.toBuffer();
        await fs.writeFile(outputPath, zipBuffer);

        return { success: true, path: outputPath };
    } catch (err) {
        console.error('Backup failed:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Add a folder recursively to a ZIP archive.
 * @param {AdmZip} zip
 * @param {string} folderPath
 * @param {string} zipName
 */
async function addFolderToZip(zip, folderPath, zipName) {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);
        const zipEntryPath = path.join(zipName, entry.name);
        if (entry.isDirectory()) {
            await addFolderToZip(zip, fullPath, zipEntryPath);
        } else {
            zip.addLocalFile(fullPath, zipEntryPath);
        }
    }
}

/**
 * Restore from a backup ZIP archive.
 * @param {string} zipPath - Path to the ZIP file
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function restoreBackup(zipPath) {
    try {
        const zip = new AdmZip(zipPath);
        const entries = zip.getEntries();
        const userData = app.getPath('userData');

        for (const entry of entries) {
            if (entry.isDirectory) continue;

            const targetPath = path.join(userData, entry.entryName);
            const targetDir = path.dirname(targetPath);

            await fs.mkdir(targetDir, { recursive: true });
            await fs.writeFile(targetPath, entry.getData());
        }

        return { success: true };
    } catch (err) {
        console.error('Restore failed:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Get default backup path in user's documents.
 * @returns {string}
 */
function getDefaultBackupPath() {
    const documents = app.getPath('documents');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(documents, `llmdesk-backup-${timestamp}.zip`);
}

module.exports = {
    createBackup,
    restoreBackup,
    getBackupPaths,
    getDefaultBackupPath,
};
