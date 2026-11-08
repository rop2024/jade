const { app } = require('electron');

/**
 * Enable or disable startup with Windows.
 * @param {boolean} enabled
 */
function setStartup(enabled) {
    try {
        app.setLoginItemSettings({
            openAtLogin: enabled,
            path: process.execPath,
        });
        return { success: true, enabled };
    } catch (err) {
        console.error('Failed to set startup:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Check if startup with Windows is enabled.
 * @returns {boolean}
 */
function isStartupEnabled() {
    try {
        const settings = app.getLoginItemSettings();
        return settings.openAtLogin || false;
    } catch {
        return false;
    }
}

module.exports = {
    setStartup,
    isStartupEnabled,
};
