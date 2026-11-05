import { useState, useEffect, useCallback } from 'react';
import { electronAPI } from '../api/electronAPI';

/**
 * React hook for settings operations.
 */
export function useSettings() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadSettings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await electronAPI.getSettings();
            setSettings(data);
            return data;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateSettings = useCallback(async (newSettings) => {
        try {
            const result = await electronAPI.updateSettings(newSettings);
            if (result) {
                setSettings(prev => ({ ...prev, ...newSettings }));
                return true;
            }
            return false;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const resetSettings = useCallback(async () => {
        try {
            const result = await electronAPI.resetSettings();
            if (result) {
                await loadSettings();
                return true;
            }
            return false;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [loadSettings]);

    useEffect(() => { loadSettings(); }, [loadSettings]);

    return { settings, loading, error, loadSettings, updateSettings, resetSettings };
}
