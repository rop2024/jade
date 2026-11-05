import { useState, useEffect, useCallback } from 'react';
import { electronAPI } from '../api/electronAPI';

/**
 * React hook for core task operations.
 */
export function useTask() {
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const handleProgress = (data) => {
            setProgress(data);
            setIsRunning(data.isRunning || false);
            if (data.status === 'error') setError(data.message);
        };
        electronAPI.onProgress(handleProgress);
        return () => electronAPI.removeProgressListener();
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
