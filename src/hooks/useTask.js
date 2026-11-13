import { useState, useEffect, useCallback } from 'react';
import { electronAPI, isElectron } from '../api/electronAPI';

/**
 * React hook for core task operations.
 */
export function useTask() {
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isElectron || typeof window.api.onProgress !== 'function') return undefined;
        const handleProgress = (data) => {
            setProgress(data);
            setIsRunning(data.isRunning || false);
            if (data.status === 'error') setError(data.message);
        };
        const unsubscribe = window.api.onProgress(handleProgress);
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
            else if (typeof window.api.removeProgressListener === 'function') {
                window.api.removeProgressListener();
            }
        };
    }, []);

    const run = useCallback(async (payload = {}) => {
        setIsRunning(true);
        setError(null);
        try {
            const result = await electronAPI.runTask(payload);
            if (!result.success) {
                setError(result.error);
                setIsRunning(false);
                return { success: false, error: result.error };
            }
            return { success: true, data: result.data };
        } catch (err) {
            setError(err.message);
            setIsRunning(false);
            return { success: false, error: err.message };
        }
    }, []);

    const cancel = useCallback(async () => {
        try {
            const result = await electronAPI.cancelTask();
            if (result.success) setIsRunning(false);
            return result;
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, []);

    return { isRunning, progress, error, run, cancel };
}
