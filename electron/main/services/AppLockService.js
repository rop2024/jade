const crypto = require('crypto');
const { app } = require('electron');

const LOCK_KEY = 'app_lock';
const SALT_KEY = 'app_lock_salt';

/**
 * Hash a password using scrypt with a random salt.
 * @param {string} password
 * @returns {Promise<{hash: string, salt: string}>}
 */
async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const key = crypto.scryptSync(password, salt, 64);
    return { hash: key.toString('hex'), salt };
}

/**
 * Verify a password against a stored hash and salt.
 * @param {string} password
 * @param {string} storedHash
 * @param {string} salt
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, storedHash, salt) {
    const key = crypto.scryptSync(password, salt, 64);
    return key.toString('hex') === storedHash;
}

/**
 * Set up an application lock password.
 * @param {string} password
 * @param {object} settingsStore - Object with set/get methods
 * @returns {Promise<void>}
 */
async function setLockPassword(password, settingsStore) {
    const { hash, salt } = await hashPassword(password);
    await settingsStore.set(LOCK_KEY, hash);
    await settingsStore.set(SALT_KEY, salt);
}

/**
 * Remove the application lock.
 * @param {object} settingsStore
 * @returns {Promise<void>}
 */
async function removeLockPassword(settingsStore) {
    await settingsStore.set(LOCK_KEY, null);
    await settingsStore.set(SALT_KEY, null);
}

/**
 * Check if an application lock is configured.
 * @param {object} settingsStore
 * @returns {Promise<boolean>}
 */
async function isLockConfigured(settingsStore) {
    const hash = await settingsStore.get(LOCK_KEY);
    return !!hash;
}

/**
 * Verify the lock password.
 * @param {string} password
 * @param {object} settingsStore
 * @returns {Promise<boolean>}
 */
async function checkLockPassword(password, settingsStore) {
    const hash = await settingsStore.get(LOCK_KEY);
    const salt = await settingsStore.get(SALT_KEY);
    if (!hash || !salt) return false;
    return verifyPassword(password, hash, salt);
}

/**
 * Middleware to check if app is locked and prompt for password.
 * Returns true if unlocked or no lock configured.
 * @param {object} settingsStore
 * @param {Function} promptPassword - Function that returns a promise with the password
 * @returns {Promise<boolean>}
 */
async function requireUnlock(settingsStore, promptPassword) {
    const configured = await isLockConfigured(settingsStore);
    if (!configured) return true;

    const password = await promptPassword();
    if (!password) return false;

    return await checkLockPassword(password, settingsStore);
}

module.exports = {
    hashPassword,
    verifyPassword,
    setLockPassword,
    removeLockPassword,
    isLockConfigured,
    checkLockPassword,
    requireUnlock,
};
