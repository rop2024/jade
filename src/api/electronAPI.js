/**
 * Safe accessor for the Electron preload bridge.
 * Falls back to a no-op stub so the UI degrades gracefully outside Electron.
 */
const NOT_IN_ELECTRON = 'This feature requires the desktop app (not a browser).';

function makeStub() {
    return async () => { throw new Error(NOT_IN_ELECTRON); };
}

const STUB = new Proxy({}, {
    get(_target, prop) {
        if (prop === 'isElectron') return false;
        return makeStub();
    },
});

export const electronAPI = (typeof window !== 'undefined' && window.electronAPI) ? window.electronAPI : STUB;
export const isElectron = !!(typeof window !== 'undefined' && window.electronAPI);

export default electronAPI;
