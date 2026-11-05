import React, { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';

export function SettingsPage() {
    const { settings, updateSettings, resetSettings, loading } = useSettings();
    const [local, setLocal] = useState({});

    useEffect(() => {
        if (settings) setLocal(settings);
    }, [settings]);

    const handleChange = (key, value) => setLocal(prev => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        await updateSettings(local);
        alert('Settings saved');
    };

    const handleReset = async () => {
        if (window.confirm('Reset all settings to defaults?')) {
            await resetSettings();
            alert('Settings reset');
        }
    };

    if (loading) return <div className="text-center py-8">Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Settings</h1>

            <div className="bg-[#16213e] rounded-lg p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">API Timeout (ms)</label>
                    <input
                        type="number"
                        value={local.apiTimeout || 30000}
                        onChange={(e) => handleChange('apiTimeout', parseInt(e.target.value) || 30000)}
                        className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-white"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Proxy (optional)</label>
                    <input
                        type="text"
                        value={local.proxy || ''}
                        onChange={(e) => handleChange('proxy', e.target.value)}
                        placeholder="http://user:pass@host:port"
                        className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-white"
                    />
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-700">
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-700">
                        Save Settings
                    </button>
                    <button onClick={handleReset} className="px-6 py-2 bg-red-600 rounded hover:bg-red-700">
                        Reset to Defaults
                    </button>
                </div>
            </div>
        </div>
    );
}
