const fs = require('fs/promises');
const path = require('path');
const matter = require('gray-matter');

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;
const RESERVED_NAMES = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
];

/**
 * Sanitize a proposed filename so it is safe for the filesystem.
 * @param {string} name
 * @returns {string}
 */
function sanitizeFilename(name) {
    let safe = (name || 'Untitled').trim().replace(INVALID_FILENAME_CHARS, ' ').replace(/\s+/g, ' ').trim();
    if (!safe) safe = 'Untitled';
    const base = safe.split('.')[0];
    if (RESERVED_NAMES.includes(base.toUpperCase())) safe = `_${safe}`;
    return safe.slice(0, 200);
}

/**
 * Ensure the destination directory stays inside the vault root.
 * @param {string} vault
 * @param {string} folder
 * @returns {string} resolved destination path
 */
function resolveDestination(vault, folder) {
    const vaultRoot = path.resolve(vault);
    const dest = path.resolve(vaultRoot, folder || '');
    const rel = path.relative(vaultRoot, dest);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error('Destination folder escapes the vault root.');
    }
    return dest;
}

/**
 * Generate a unique filename within a directory.
 * @param {string} dir
 * @param {string} filename
 * @returns {string} unique filename (e.g. "Note.md" or "Note 2.md")
 */
async function uniqueFilename(dir, filename) {
    const base = filename.endsWith('.md') ? filename.slice(0, -3) : filename;
    let candidate = filename;
    let counter = 1;
    while (true) {
        try {
            await fs.access(path.join(dir, candidate));
            candidate = `${base} ${counter}.md`;
            counter += 1;
        } catch {
            return candidate;
        }
    }
}

/**
 * Extract the first Markdown heading as a default note title.
 * @param {string} body
 * @returns {string|null}
 */
function extractTitle(body) {
    const match = /^#\s+(.+)$/m.exec(body || '');
    return match ? match[1].trim() : null;
}

/**
 * Save a Markdown note with YAML frontmatter to the Obsidian vault.
 *
 * @param {string} vault - Absolute vault path.
 * @param {string} folder - Destination folder relative to the vault root.
 * @param {string} title - Note title (used for filename).
 * @param {string} body - Markdown body (frontmatter is added by this function).
 * @param {Array<string>} tags - Tags for frontmatter.
 * @returns {Promise<{path: string, title: string}>}
 */
async function saveNote(vault, folder, title, body, tags = []) {
    if (!vault) throw new Error('Vault path is not configured.');
    const dest = resolveDestination(vault, folder);
    await fs.mkdir(dest, { recursive: true });

    const fileTitle = sanitizeFilename(title || 'Untitled');
    const filename = await uniqueFilename(dest, `${fileTitle}.md`);
    const filePath = path.join(dest, filename);

    const data = {
        created: new Date().toISOString().slice(0, 10),
        tags: Array.isArray(tags) ? tags : [],
        source: 'llm-desk',
    };

    const frontmatter = matter.stringify(body || '', data);
    await fs.writeFile(filePath, frontmatter, 'utf-8');

    return { path: filePath, title: fileTitle };
}

/**
 * Scan Markdown filenames in the vault for link-suggestion matching.
 * @param {string} vault
 * @returns {Promise<Array<string>>}
 */
async function listNoteTitles(vault) {
    if (!vault) return [];
    const titles = new Set();

    async function walk(dir) {
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await walk(full);
            } else if (entry.name.endsWith('.md')) {
                titles.add(entry.name.slice(0, -3));
            }
        }
    }

    await walk(vault);
    return Array.from(titles).sort();
}

module.exports = {
    saveNote,
    sanitizeFilename,
    resolveDestination,
    uniqueFilename,
    extractTitle,
    listNoteTitles,
};
