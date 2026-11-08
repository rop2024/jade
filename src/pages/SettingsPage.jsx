import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useConversationStore } from '../store/conversationStore';
import { ModeEditor } from '../components/modes/ModeEditor';
import { ModeTestPanel } from '../components/modes/ModeTestPanel';

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
        })();
    }, [loadAboutMe, loadModes, vaultGet]);

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

    const handleNewMode = () => setEditingMode({ ...DEFAULT_MODE });
    const handleEditMode = (mode) => setEditingMode({ ...mode });
    const handleCancelEditor = () => setEditingMode(null);
    const handleCancelTester = () => setTestingMode(null);

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

            {/* Personal context editor */}
            <div className="bg-[#16213e] rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">Personal context (about-me)</h2>
                    <span className="text-xs text-gray-500">
                        {wordCount} words (recommended &lt; 250)
                    </span>
                </div>
                <p className="text-sm text-gray-400">
                    Background, skills, goals, projects, preferred response style, and workflow
                    rules. This is prepended to every mode prompt so the assistant understands
                    your context.
                </p>
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

            {/* Vault configuration */}
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
                <p className="text-sm text-gray-400">
                    Select your Obsidian vault folder so notes can be saved there. The path
                    is stored locally and never hardcoded.
                </p>
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
                <p className="text-sm text-gray-400">
                    Process all supported files in a folder sequentially. Each file is summarized
                    through the map-reduce pipeline and saved next to the original.
                </p>
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
                <p className="text-sm text-gray-400">
                    Monitor a folder for new files. New files are detected and queued for
                    processing only after you approve them.
                </p>
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
                {watchFolder && (
                    <div className="text-xs text-gray-500 bg-[#1a1a2e] border border-gray-700 rounded p-3 break-all">
                        {watchFolder} {watching ? '— watching' : ''}
                    </div>
                )}
            </div>

            {/* Modes management */}
            <div className="bg-[#16213e] rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">AI modes</h2>
                    <button
                        onClick={handleNewMode}
                        className="px-3 py-2 text-xs bg-blue-600 rounded hover:bg-blue-700 text-white"
                    >
                        New mode
                    </button>
                </div>
                <p className="text-sm text-gray-400">
                    Modes personalize the assistant per conversation. Pick a mode in the chat
                    header or type its slash command (e.g. <span className="text-blue-400">/journal</span>)
                    to switch for a single message.
                </p>
                <div className="flex flex-wrap gap-2">
                    {modes.length === 0 && (
                        <span className="text-sm text-gray-500">No modes defined.</span>
                    )}
                    {modes.map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => setEditingMode({ ...mode })}
                            className={`px-3 py-1.5 rounded text-xs transition-colors ${
                                activeModeId === mode.id
                                    ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50'
                                    : 'bg-[#1a1a2e] text-gray-300 border border-gray-700 hover:text-white hover:border-gray-500'
                            }`}
                        >
                            {mode.slash} {mode.name}
                        </button>
                    ))}
                </div>

                {editingMode && (
                    <div className="border-t border-gray-700 pt-4">
                        <ModeEditor
                            mode={editingMode}
                            onSave={handleModeSaved}
                            onDelete={handleModeDeleted}
                            onCancel={handleCancelEditor}
                        />
                    </div>
                )}

                {modes.length > 0 && (
                    <div className="border-t border-gray-700 pt-4">
                        <label className="block text-xs font-medium text-gray-400 mb-2">Test a mode</label>
                        <select
                            value={testingMode ? testingMode.id : ''}
                            onChange={(e) => {
                                const id = e.target.value;
                                setTestingMode(id ? modes.find((m) => m.id === id) : null);
                            }}
                            className="w-full mb-3 bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                            <option value="">Select a mode to test</option>
                            {modes.map((mode) => (
                                <option key={mode.id} value={mode.id}>
                                    {mode.slash} {mode.name}
                                </option>
                            ))}
                        </select>
                        {testingMode && (
                            <div className="border-t border-gray-700 pt-3">
                                <ModeTestPanel mode={testingMode} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

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
