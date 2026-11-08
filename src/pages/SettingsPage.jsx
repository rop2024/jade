import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useConversationStore } from '../store/conversationStore';
import { ModeEditor } from '../components/modes/ModeEditor';
import { ModeTestPanel } from '../components/modes/ModeTestPanel';

const DEFAULT_MODE = {
    id: '',
    name: '',
    slash: '',
    model: 'llama3.2',
    temperature: 0.5,
    system: '',
    template: '',
    rules: [],
    examples: [],
    output: { type: 'markdown', saveTo: null, folder: null },
};

export function SettingsPage() {
    const { settings, updateSettings, resetSettings, loading } = useSettings();
    const {
        aboutMe,
        loadAboutMe,
        saveAboutMe,
        countWords,
        vaultGet,
        vaultSet,
        vaultPick,
        modes,
        loadModes,
        saveMode,
        deleteMode,
        activeModeId,
        setActiveMode,
        processBatch,
        cancelBatch,
        startWatch,
        stopWatch,
        startupGet,
        startupSet,
        backupCreate,
        backupRestore,
        backupGetDefaultPath,
        lockIsConfigured,
        lockSet,
        lockRemove,
        lockCheck,
        hotkeyRegister,
        trayCreate,
        ollamaWarmUp,
        ollamaCheckAvailable,
        ollamaOpenInstallLink,
    } = useConversationStore();
    const [local, setLocal] = useState({});
    const [aboutMeLocal, setAboutMeLocal] = useState('');
    const [wordCount, setWordCount] = useState(0);
    const [editingMode, setEditingMode] = useState(null);
    const [testingMode, setTestingMode] = useState(null);
    const [vaultPath, setVaultPath] = useState('');
    const [batchFolder, setBatchFolder] = useState('');
    const [watchFolder, setWatchFolder] = useState('');
    const [watching, setWatching] = useState(false);
    const [batchProcessing, setBatchProcessing] = useState(false);
    const [startupEnabled, setStartupEnabled] = useState(false);
    const [ollamaAvailable, setOllamaAvailable] = useState(false);
    const [lockConfigured, setLockConfigured] = useState(false);
    const [lockPassword, setLockPassword] = useState('');
    const [lockConfirm, setLockConfirm] = useState('');
    const [lockUnlock, setLockUnlock] = useState('');
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        if (settings) setLocal(settings);
    }, [settings]);

    useEffect(() => {
        loadAboutMe();
        loadModes();
        (async () => {
            try {
                const { vaultPath: vp } = await vaultGet();
                setVaultPath(vp || '');
            } catch {}
            try {
                const { enabled } = await startupGet();
                setStartupEnabled(enabled);
            } catch {}
            try {
                const { available } = await ollamaCheckAvailable();
                setOllamaAvailable(available);
            } catch {}
            try {
                const { configured } = await lockIsConfigured();
                setLockConfigured(configured);
            } catch {}
            try {
                await hotkeyRegister();
                await trayCreate();
            } catch {}
        })();
    }, [loadAboutMe, loadModes, vaultGet, startupGet, ollamaCheckAvailable, lockIsConfigured, hotkeyRegister, trayCreate]);

    useEffect(() => {
        setAboutMeLocal(aboutMe);
        setWordCount(countWords ? countWords(aboutMe) : 0);
    }, [aboutMe, countWords]);

    const handleChange = (key, value) => setLocal(prev => ({ ...prev, [key]: value }));

    const handleAboutMeChange = (e) => {
        const value = e.target.value;
        setAboutMeLocal(value);
        setWordCount(countWords ? countWords(value) : 0);
    };

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

    const handleSaveAboutMe = async () => {
        await saveAboutMe(aboutMeLocal);
        alert('About me saved');
    };

    const handleSaveVault = async () => {
        await vaultSet(vaultPath);
        alert('Vault path saved');
    };

    const handlePickVault = async () => {
        const { canceled, vaultPath: vp } = await vaultPick();
        if (!canceled && vp) setVaultPath(vp);
    };

    const handlePickBatchFolder = async () => {
        const { canceled, vaultPath: vp } = await vaultPick();
        if (!canceled && vp) setBatchFolder(vp);
    };

    const handleProcessBatch = async () => {
        if (!batchFolder) {
            alert('Please select a folder first.');
            return;
        }
        setBatchProcessing(true);
        try {
            const jobId = `batch_${Date.now()}`;
            await processBatch({
                folder: batchFolder,
                model: null,
                modeId: null,
                jobId,
            });
        } catch (err) {
            alert('Batch processing failed: ' + err.message);
        } finally {
            setBatchProcessing(false);
        }
    };

    const handleCancelBatch = async () => {
        await cancelBatch({ jobId: 'batch_' + Date.now() });
        setBatchProcessing(false);
    };

    const handlePickWatchFolder = async () => {
        const { canceled, vaultPath: vp } = await vaultPick();
        if (!canceled && vp) setWatchFolder(vp);
    };

    const handleStartWatch = async () => {
        if (!watchFolder) {
            alert('Please select a folder first.');
            return;
        }
        try {
            await startWatch({ folder: watchFolder });
            setWatching(true);
        } catch (err) {
            alert('Failed to start watching: ' + err.message);
        }
    };

    const handleStopWatch = async () => {
        try {
            await stopWatch({ folder: watchFolder });
            setWatching(false);
        } catch (err) {
            alert('Failed to stop watching: ' + err.message);
        }
    };

    const handleModeDeleted = async (id) => {
        await deleteMode(id);
        if (editingMode?.id === id) setEditingMode(null);
        if (testingMode?.id === id) setTestingMode(null);
    };

    const handleToggleStartup = async () => {
        try {
            await startupSet(!startupEnabled);
            setStartupEnabled(!startupEnabled);
        } catch (err) {
            alert('Failed to toggle startup: ' + err.message);
        }
    };

    const handleWarmUpOllama = async () => {
        try {
            await ollamaWarmUp(local.defaultModel || 'llama3.2');
            alert('Ollama warmed up');
        } catch (err) {
            alert('Ollama warm-up failed: ' + err.message);
        }
    };

    const handleOpenOllamaLink = async () => {
        await ollamaOpenInstallLink();
    };

    const handleCreateBackup = async () => {
        const { path: defaultPath } = await backupGetDefaultPath();
        const result = await backupCreate(defaultPath);
        if (result.success) {
            alert('Backup created: ' + result.path);
        } else {
            alert('Backup failed: ' + result.error);
        }
    };

    const handleRestoreBackup = async () => {
        const zipPath = window.prompt('Enter path to backup ZIP:');
        if (!zipPath) return;
        const result = await backupRestore(zipPath);
        if (result.success) {
            alert('Backup restored. Please restart the application.');
        } else {
            alert('Restore failed: ' + result.error);
        }
    };

    const handleToggleLock = async () => {
        if (!lockConfigured) {
            if (!lockPassword || !lockConfirm) {
                alert('Please enter and confirm password.');
                return;
            }
            if (lockPassword !== lockConfirm) {
                alert('Passwords do not match.');
                return;
            }
            await lockSet(lockPassword);
            setLockConfigured(true);
            setLockPassword('');
            setLockConfirm('');
            alert('Application lock set.');
        } else {
            if (!lockUnlock) {
                alert('Enter unlock password.');
                return;
            }
            const valid = await lockCheck(lockUnlock);
            if (!valid) {
                alert('Incorrect password.');
                return;
            }
            await lockRemove();
            setLockConfigured(false);
            setLockUnlock('');
            alert('Application lock removed.');
        }
    };

    const handleUnlockApp = async () => {
        if (!lockUnlock) {
            alert('Enter unlock password.');
            return;
        }
        const valid = await lockCheck(lockUnlock);
        if (!valid) {
            alert('Incorrect password.');
            return;
        }
        setIsLocked(false);
        setLockUnlock('');
    };

    const handleModeSaved = async (saved) => {
        await saveMode(saved);
        setEditingMode(null);
    };

    if (loading) return <div className="text-center py-8">Loading...</div>;

    if (lockConfigured && isLocked) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center">
                <h1 className="text-3xl font-bold mb-4">LLMDesk Locked</h1>
                <p className="text-gray-400 mb-6">Enter your unlock password to continue.</p>
                <input
                    type="password"
                    value={lockUnlock}
                    onChange={(e) => setLockUnlock(e.target.value)}
                    placeholder="Password"
                    className="w-full max-w-sm bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <button
                    onClick={handleUnlockApp}
                    className="mt-4 px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 text-white"
                >
                    Unlock
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Settings</h1>

            {/* General */}
            <div className="bg-[#16213e] rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-bold">General</h2>
                <div>
                    <label className="block text-sm font-medium mb-2">Start with Windows</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={startupEnabled}
                            onChange={handleToggleStartup}
                            className="rounded bg-[#1a1a2e] border border-gray-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Launch LLMDesk on system startup</span>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2">Default Model</label>
                    <input
                        type="text"
                        value={local.defaultModel || 'llama3.2'}
                        onChange={(e) => handleChange('defaultModel', e.target.value)}
                        placeholder="llama3.2"
                        className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleWarmUpOllama}
                        disabled={!ollamaAvailable}
                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
                    >
                        Warm up Ollama
                    </button>
                    {!ollamaAvailable && (
                        <button
                            onClick={handleOpenOllamaLink}
                            className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-xs"
                        >
                            Install Ollama
                        </button>
                    )}
                </div>
                {!ollamaAvailable && (
                    <p className="text-xs text-red-400">
                        Ollama is not available. Install it from ollama.com to use LLMDesk.
                    </p>
                )}
            </div>

            {/* Models */}
            <div className="bg-[#16213e] rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-bold">Models</h2>
                <p className="text-sm text-gray-400">
                    Configure default model and model presets for Fast/Deep modes.
                </p>
                <div>
                    <label className="block text-sm font-medium mb-2">Default Model</label>
                    <input
                        type="text"
                        value={local.defaultModel || 'llama3.2'}
                        onChange={(e) => handleChange('defaultModel', e.target.value)}
                        className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                </div>
            </div>

            {/* Performance */}
            <div className="bg-[#16213e] rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-bold">Performance</h2>
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

            {/* Vault */}
            <div className="bg-[#16213e] rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">Obsidian Vault</h2>
                    <button
                        onClick={handlePickVault}
                        className="px-3 py-2 text-xs bg-blue-600 rounded hover:bg-blue-700 text-white"
                    >
                        Choose folder
                    </button>
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={vaultPath}
                        onChange={(e) => setVaultPath(e.target.value)}
                        placeholder="E:\\@obsidian vault\\Fresh Brain"
                        className="flex-1 bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                    <button
                        onClick={handleSaveVault}
                        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-white"
                    >
                        Save
                    </button>
                </div>
                {vaultPath && (
                    <div className="text-xs text-gray-500 bg-[#1a1a2e] border border-gray-700 rounded p-3 break-all">
                        {vaultPath}
                    </div>
                )}
            </div>

            {/* Indexing */}
            <div className="bg-[#16213e] rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-bold">Indexing</h2>
                <div>
                    <label className="block text-sm font-medium mb-2">Excluded folders (comma-separated)</label>
                    <input
                        type="text"
                        value={local.excludedFolders || '.obsidian, Attachments'}
                        onChange={(e) => handleChange('excludedFolders', e.target.value)}
                        placeholder=".obsidian, Attachments"
                        className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                </div>
            </div>

            {/* Privacy */}
            <div className="bg-[#16213e] rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-bold">Privacy</h2>
                {lockConfigured ? (
                    <div>
                        <input
                            type="password"
                            value={lockUnlock}
                            onChange={(e) => setLockUnlock(e.target.value)}
                            placeholder="Unlock password"
                            className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                        <button
                            onClick={handleToggleLock}
                            className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
                        >
                            Remove Lock
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="space-y-2">
                            <input
                                type="password"
                                value={lockPassword}
                                onChange={(e) => setLockPassword(e.target.value)}
                                placeholder="New password"
                                className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                            <input
                                type="password"
                                value={lockConfirm}
                                onChange={(e) => setLockConfirm(e.target.value)}
                                placeholder="Confirm password"
                                className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <button
                            onClick={handleToggleLock}
                            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            Set Lock
                        </button>
                    </div>
                )}
            </div>

            {/* Backup */}
            <div className="bg-[#16213e] rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-bold">Backup</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleCreateBackup}
                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        Create Backup
                    </button>
                    <button
                        onClick={handleRestoreBackup}
                        className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
                    >
                        Restore Backup
                    </button>
                </div>
            </div>

            {/* Personal context editor */}
            <div className="bg-[#16213e] rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">Personal context (about-me)</h2>
                    <span className="text-xs text-gray-500">
                        {wordCount} words (recommended &lt; 250)
                    </span>
                </div>
                <textarea
                    value={aboutMeLocal}
                    onChange={handleAboutMeChange}
                    rows={14}
                    className="w-full bg-[#1a1a2e] border border-gray-700 rounded p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm"
                    placeholder="Write about yourself here…"
                />
                <button
                    onClick={handleSaveAboutMe}
                    className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-white"
                >
                    Save personal context
                </button>
            </div>

            {/* Batch processing */}
            <div className="bg-[#16213e] rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">Batch Process Folder</h2>
                    <button
                        onClick={handlePickBatchFolder}
                        className="px-3 py-2 text-xs bg-blue-600 rounded hover:bg-blue-700 text-white"
                    >
                        Choose folder
                    </button>
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={batchFolder}
                        onChange={(e) => setBatchFolder(e.target.value)}
                        placeholder="Select a folder…"
                        className="flex-1 bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                    <button
                        onClick={handleProcessBatch}
                        disabled={batchProcessing || !batchFolder}
                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
                    >
                        {batchProcessing ? 'Processing…' : 'Process Folder'}
                    </button>
                </div>
            </div>

            {/* Folder watching */}
            <div className="bg-[#16213e] rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">Folder Watching</h2>
                    <button
                        onClick={handlePickWatchFolder}
                        className="px-3 py-2 text-xs bg-blue-600 rounded hover:bg-blue-700 text-white"
                    >
                        Choose folder
                    </button>
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={watchFolder}
                        onChange={(e) => setWatchFolder(e.target.value)}
                        placeholder="Select a folder…"
                        className="flex-1 bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                    {watching ? (
                        <button
                            onClick={handleStopWatch}
                            className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
                        >
                            Stop watching
                        </button>
                    ) : (
                        <button
                            onClick={handleStartWatch}
                            disabled={!watchFolder}
                            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
                        >
                            Start watching
                        </button>
                    )}
                </div>
            </div>

            {/* Modes management */}
            <div className="bg-[#16213e] rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">AI modes</h2>
                    <button
                        onClick={() => setEditingMode({ ...DEFAULT_MODE })}
                        className="px-3 py-2 text-xs bg-blue-600 rounded hover:bg-blue-700 text-white"
                    >
                        New mode
                    </button>
                </div>
                {editingMode && (
                    <div className="border-t border-gray-700 pt-4">
                        <ModeEditor
                            mode={editingMode}
                            onSave={handleModeSaved}
                            onDelete={handleModeDeleted}
                            onCancel={() => setEditingMode(null)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
