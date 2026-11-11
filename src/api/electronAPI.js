/**
 * Safe accessor for the Electron preload bridge.
 * Falls back to a no-op stub so the UI degrades gracefully outside Electron.
 */
const NOT_IN_ELECTRON = 'This feature requires the desktop app (not a browser).';

function makeStub() {
    return async () => { throw new Error(NOT_IN_ELECTRON); };
}

const TARGET = (typeof window !== 'undefined' && window.api) || {};

export const electronAPI = new Proxy(TARGET, {
    get(_target, prop) {
        if (prop === 'isElectron') return false;
        const val = _target[prop];
        return typeof val === 'function' ? val : makeStub();
    }
});

export const isElectron = !!(typeof window !== 'undefined' && window.api);

export default electronAPI;
