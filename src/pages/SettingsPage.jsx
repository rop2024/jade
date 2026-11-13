import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useConversationStore } from '../store/conversationStore';
import { ModeEditor } from '../components/modes/ModeEditor';
import { ModeTestPanel } from '../components/modes/ModeTestPanel';
import { StatusBadge } from '../components/StatusBadge';

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
 const [settingsError, setSettingsError] = useState(null);

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
 })();
 }, [loadAboutMe, loadModes, vaultGet, startupGet, ollamaCheckAvailable, lockIsConfigured]);

 useEffect(() => {
 setAboutMeLocal(aboutMe);
 let active = true;
 if (countWords) {
 countWords(aboutMe).then((count) => {
  if (active) setWordCount(count);
 });
 } else {
 setWordCount(0);
 }
 return () => {
  active = false;
 };
 }, [aboutMe, countWords]);

 const handleChange = (key, value) => setLocal(prev => ({ ...prev, [key]: value }));

 const handleAboutMeChange = async (e) => {
 const value = e.target.value;
 setAboutMeLocal(value);
 setWordCount(countWords ? await countWords(value) : 0);
 };

 const handleSave = async () => {
 setSettingsError(null);
 try {
 await updateSettings(local);
 } catch (err) {
 setSettingsError(err.message || 'Failed to save settings.');
 }
 };

 const handleReset = async () => {
 if (!window.confirm('Reset all settings to defaults?')) return;
 setSettingsError(null);
 try {
 await resetSettings();
 } catch (err) {
 setSettingsError(err.message || 'Failed to reset settings.');
 }
 };

 const handleSaveAboutMe = async () => {
 setSettingsError(null);
 try {
 await saveAboutMe(aboutMeLocal);
 } catch (err) {
 setSettingsError(err.message || 'Failed to save personal context.');
 }
 };

 const handleSaveVault = async () => {
 setSettingsError(null);
 try {
 await vaultSet(vaultPath);
 } catch (err) {
 setSettingsError(err.message || 'Failed to save vault path.');
 }
 };

 const handlePickVault = async () => {
 setSettingsError(null);
 try {
 const { canceled, vaultPath: vp } = await vaultPick();
 if (!canceled && vp) setVaultPath(vp);
 } catch (err) {
 setSettingsError(err.message || 'Failed to pick vault folder.');
 }
 };

 const handlePickBatchFolder = async () => {
 setSettingsError(null);
 try {
 const { canceled, vaultPath: vp } = await vaultPick();
 if (!canceled && vp) setBatchFolder(vp);
 } catch (err) {
 setSettingsError(err.message || 'Failed to pick batch folder.');
 }
 };

 const handleProcessBatch = async () => {
 setSettingsError(null);
 if (!batchFolder) {
 setSettingsError('Please select a folder first.');
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
 setSettingsError('Batch processing failed: ' + err.message);
 } finally {
 setBatchProcessing(false);
 }
 };

 const handleCancelBatch = async () => {
 setSettingsError(null);
 try {
 await cancelBatch({ jobId: 'batch_' + Date.now() });
 } catch (err) {
 setSettingsError('Failed to cancel batch: ' + err.message);
 } finally {
 setBatchProcessing(false);
 }
 };

 const handlePickWatchFolder = async () => {
 setSettingsError(null);
 try {
 const { canceled, vaultPath: vp } = await vaultPick();
 if (!canceled && vp) setWatchFolder(vp);
 } catch (err) {
 setSettingsError(err.message || 'Failed to pick watch folder.');
 }
 };

 const handleStartWatch = async () => {
 setSettingsError(null);
 if (!watchFolder) {
 setSettingsError('Please select a folder first.');
 return;
 }
 try {
 await startWatch({ folder: watchFolder });
 setWatching(true);
 } catch (err) {
 setSettingsError('Failed to start watching: ' + err.message);
 }
 };

 const handleStopWatch = async () => {
 setSettingsError(null);
 try {
 await stopWatch({ folder: watchFolder });
 setWatching(false);
 } catch (err) {
 setSettingsError('Failed to stop watching: ' + err.message);
 }
 };

 const handleToggleStartup = async () => {
 setSettingsError(null);
 try {
 await startupSet(!startupEnabled);
 setStartupEnabled(!startupEnabled);
 } catch (err) {
 setSettingsError('Failed to toggle startup: ' + err.message);
 }
 };

 const handleWarmUpOllama = async () => {
 setSettingsError(null);
 try {
 await ollamaWarmUp(local.defaultModel || 'llama3.2');
 } catch (err) {
 setSettingsError('Ollama warm-up failed: ' + err.message);
 }
 };

 const handleOpenOllamaLink = async () => {
 setSettingsError(null);
 try {
 await ollamaOpenInstallLink();
 } catch (err) {
 setSettingsError('Failed to open Ollama install link: ' + err.message);
 }
 };

 const handleCreateBackup = async () => {
 setSettingsError(null);
 try {
 const { path: defaultPath } = await backupGetDefaultPath();
 const result = await backupCreate(defaultPath);
 if (result.success) {
 } else {
 setSettingsError('Backup failed: ' + result.error);
 }
 } catch (err) {
 setSettingsError(err.message || 'Backup failed.');
 }
 };

 const handleRestoreBackup = async () => {
 setSettingsError(null);
 const zipPath = window.prompt('Enter path to backup ZIP:');
 if (!zipPath) return;
 try {
 const result = await backupRestore(zipPath);
 if (result.success) {
 } else {
 setSettingsError('Restore failed: ' + result.error);
 }
 } catch (err) {
 setSettingsError(err.message || 'Restore failed.');
 }
 };

 const handleToggleLock = async () => {
 setSettingsError(null);
 if (!lockConfigured) {
 if (!lockPassword || !lockConfirm) {
 setSettingsError('Please enter and confirm password.');
 return;
 }
 if (lockPassword !== lockConfirm) {
 setSettingsError('Passwords do not match.');
 return;
 }
 try {
 await lockSet(lockPassword);
 setLockConfigured(true);
 setLockPassword('');
 setLockConfirm('');
 } catch (err) {
 setSettingsError(err.message || 'Failed to set application lock.');
 }
 } else {
 if (!lockUnlock) {
 setSettingsError('Enter unlock password.');
 return;
 }
 try {
 const valid = await lockCheck(lockUnlock);
 if (!valid) {
 setSettingsError('Incorrect password.');
 return;
 }
 await lockRemove();
 setLockConfigured(false);
 setLockUnlock('');
 } catch (err) {
 setSettingsError(err.message || 'Failed to remove application lock.');
 }
 }
 };

 const handleUnlockApp = async () => {
 setSettingsError(null);
 if (!lockUnlock) {
 setSettingsError('Enter unlock password.');
 return;
 }
 try {
 const valid = await lockCheck(lockUnlock);
 if (!valid) {
 setSettingsError('Incorrect password.');
 return;
 }
 setIsLocked(false);
 setLockUnlock('');
 } catch (err) {
 setSettingsError(err.message || 'Unlock failed.');
 }
 };

 const handleModeDeleted = async (id) => {
 setSettingsError(null);
 try {
 await deleteMode(id);
 if (editingMode?.id === id) setEditingMode(null);
 if (testingMode?.id === id) setTestingMode(null);
 } catch (err) {
 setSettingsError(err.message || 'Failed to delete mode.');
 }
 };

 const handleModeSaved = async (saved) => {
 setSettingsError(null);
 try {
 await saveMode(saved);
 setEditingMode(null);
 } catch (err) {
 setSettingsError(err.message || 'Failed to save mode.');
 }
 };

 if (loading) return <div className="text-center py-8">Loading...</div>;

 if (lockConfigured && isLocked) {
 return (
 <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
 <div className="panel p-8 max-w-md w-full shadow-neon-cyan">
 <h1 className="text-3xl font-display font-bold tracking-tight text-text mb-1">JADE</h1>
 <p className="text-sm text-muted mb-6">Application locked</p>
 {settingsError && (
 <div className="bg-pink/10 border border-pink/30 p-3 text-pink text-sm font-mono mb-4">
 {settingsError}
 </div>
 )}
 <input
 type="password"
 value={lockUnlock}
 onChange={(e) => setLockUnlock(e.target.value)}
 placeholder="Unlock password"
 className="w-full bg-surface-3 border border-line px-3 py-2 text-text focus-ring font-mono text-sm mb-4"
 />
 <button
 onClick={handleUnlockApp}
 className="w-full px-4 py-2 bg-yellow text-black font-technical font-bold transition-colors"
 >
 Unlock
 </button>
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {settingsError && (
 <div className="bg-pink/10 border border-pink/30 p-3 text-pink text-sm font-mono">
 {settingsError}
 </div>
 )}
 <div className="flex justify-between items-center">
 <h1 className="text-3xl font-display font-bold tracking-tight text-text">JADE</h1>
 <span className="text-tech text-muted">// settings</span>
 </div>

 {/* General */}
 <section className="panel p-6 space-y-4">
 <div className="flex justify-between items-start">
 <div>
 <h2 className="font-display font-bold text-text">General</h2>
 <p className="text-sm text-muted">Application startup, default model, and Ollama availability.</p>
 </div>
 <StatusBadge status={ollamaAvailable ? 'complete' : 'error'} />
 </div>
 <div>
 <label className="tech-label text-muted mb-1 block">// start with windows</label>
 <div className="flex items-center gap-2">
 <input
 type="checkbox"
 checked={startupEnabled}
 onChange={handleToggleStartup}
 className=" bg-surface-3 border border-line text-cyan focus-ring"
 />
 <span className="text-sm text-text">Launch JADE on system startup</span>
 </div>
 </div>
 <div>
 <label className="tech-label text-muted mb-1 block">// default model</label>
 <input
 type="text"
 value={local.defaultModel || 'llama3.2'}
 onChange={(e) => handleChange('defaultModel', e.target.value)}
 placeholder="llama3.2"
 className="w-full bg-surface-3 border border-line px-3 py-2 text-text focus-ring font-mono text-sm"
 />
 </div>
 <div className="flex gap-2">
 <button
 onClick={handleWarmUpOllama}
 disabled={!ollamaAvailable}
 className="px-4 py-2 bg-yellow text-black font-technical font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 Warm up Ollama
 </button>
 {!ollamaAvailable && (
 <button
 onClick={handleOpenOllamaLink}
 className="px-4 py-2 text-cyan hover:text-text underline text-xs font-technical"
 >
 Install Ollama
 </button>
 )}
 </div>
 {!ollamaAvailable && (
 <p className="text-sm text-dim">
 Ollama is not available. Install it to use local models with JADE.
 </p>
 )}
 </section>

 {/* Models */}
 <section className="panel p-6 space-y-4">
 <h2 className="font-display font-bold text-text">Models</h2>
 <p className="text-sm text-muted">
 Configure default model and model presets for Fast/Deep modes.
 </p>
 <div>
 <label className="tech-label text-muted mb-1 block">// default model</label>
 <input
 type="text"
 value={local.defaultModel || 'llama3.2'}
 onChange={(e) => handleChange('defaultModel', e.target.value)}
 className="w-full bg-surface-3 border border-line px-3 py-2 text-text focus-ring font-mono text-sm"
 />
 </div>
 <div className="flex gap-2 pt-4 border-t border-line">
 <button
 onClick={handleSave}
 className="px-4 py-2 bg-yellow text-black font-technical font-bold hover:bg-surface-3 hover:border-yellow hover:border transition-colors"
 >
 Save Settings
 </button>
 <button
 onClick={handleReset}
 className="px-4 py-2 bg-pink text-text font-technical font-bold hover:bg-surface-3 hover:border-pink hover:border transition-colors"
 >
 Reset to Defaults
 </button>
 </div>
 </section>

 {/* Performance */}
 <section className="panel p-6 space-y-4">
 <h2 className="font-display font-bold text-text">Performance</h2>
 <div>
 <label className="tech-label text-muted mb-1 block">// api timeout (ms)</label>
 <input
 type="number"
 value={local.apiTimeout || 30000}
 onChange={(e) => handleChange('apiTimeout', parseInt(e.target.value) || 30000)}
 className="w-full bg-surface-3 border border-line px-3 py-2 text-text focus-ring font-mono text-sm"
 />
 </div>
 <div>
 <label className="tech-label text-muted mb-1 block">// proxy (optional)</label>
 <input
 type="text"
 value={local.proxy || ''}
 onChange={(e) => handleChange('proxy', e.target.value)}
 placeholder="http://user:pass@host:port"
 className="w-full bg-surface-3 border border-line px-3 py-2 text-text focus-ring font-mono text-sm"
 />
 </div>
 </section>

 {/* Vault */}
 <section className="panel p-6 space-y-4">
 <div className="flex justify-between items-start">
 <div>
 <h2 className="font-display font-bold text-text">Obsidian Vault</h2>
 <p className="text-sm text-muted">Path to your Obsidian vault for document retrieval and saving.</p>
 </div>
 <button
 onClick={handlePickVault}
 className="px-3 py-1.5 text-xs bg-cyan text-black font-technical font-bold hover:bg-surface-3 hover:border-cyan hover:border transition-colors"
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
 className="flex-1 bg-surface-3 border border-line px-3 py-2 text-text focus-ring font-mono text-sm"
 />
 <button
 onClick={handleSaveVault}
 className="px-4 py-2 bg-yellow text-black font-technical font-bold disabled:opacity-50 transition-colors"
 >
 Save
 </button>
 </div>
 {vaultPath && (
 <div className="bg-surface-3 border border-line p-3 break-all">
 <span className="text-xs text-dim font-mono block">Vault path:</span>
 <span className="text-sm text-text font-mono truncate" title={vaultPath}>
 {vaultPath}
 </span>
 </div>
 )}
 </section>

 {/* Indexing */}
 <section className="panel p-6 space-y-4">
 <h2 className="font-display font-bold text-text">Indexing</h2>
 <div>
 <label className="tech-label text-muted mb-1 block">// excluded folders</label>
 <input
 type="text"
 value={local.excludedFolders || '.obsidian, Attachments'}
 onChange={(e) => handleChange('excludedFolders', e.target.value)}
 placeholder=".obsidian, Attachments"
 className="w-full bg-surface-3 border border-line px-3 py-2 text-text focus-ring font-mono text-sm"
 />
 <p className="text-[10px] text-dim mt-1">
 Comma-separated folder names to skip during RAG indexing.
 </p>
 </div>
 </section>

 {/* Privacy */}
 <section className="panel p-6 space-y-4">
 <h2 className="font-display font-bold text-text">Privacy</h2>
 {lockConfigured ? (
 <div>
 <label className="tech-label text-muted mb-1 block">// unlock password</label>
 <input
 type="password"
 value={lockUnlock}
 onChange={(e) => setLockUnlock(e.target.value)}
 placeholder="Unlock password"
 className="w-full bg-surface-3 border border-line px-3 py-2 text-text focus-ring font-mono text-sm"
 />
 <button
 onClick={handleToggleLock}
 className="px-4 py-2 bg-pink text-text font-technical font-bold hover:bg-surface-3 hover:border-pink hover:border transition-colors"
 >
 Remove Lock
 </button>
 </div>
 ) : (
 <div className="space-y-2">
 <label className="tech-label text-muted mb-1 block">// new password</label>
 <input
 type="password"
 value={lockPassword}
 onChange={(e) => setLockPassword(e.target.value)}
 placeholder="New password"
 className="w-full bg-surface-3 border border-line px-3 py-2 text-text focus-ring font-mono text-sm"
 />
 <label className="tech-label text-muted mb-1 block">// confirm password</label>
 <input
 type="password"
 value={lockConfirm}
 onChange={(e) => setLockConfirm(e.target.value)}
 placeholder="Confirm password"
 className="w-full bg-surface-3 border border-line px-3 py-2 text-text focus-ring font-mono text-sm"
 />
 <button
 onClick={handleToggleLock}
 className="px-4 py-2 bg-yellow text-black font-technical font-bold hover:bg-surface-3 hover:border-yellow hover:border transition-colors"
 >
 Set Lock
 </button>
 </div>
 )}
 </section>

 {/* Backup */}
 <section className="panel p-6 space-y-4">
 <h2 className="font-display font-bold text-text">Backup</h2>
 <div className="flex gap-2">
 <button
 onClick={handleCreateBackup}
 className="px-4 py-2 bg-yellow text-black font-technical font-bold hover:bg-surface-3 hover:border-yellow hover:border transition-colors"
 >
 Create Backup
 </button>
 <button
 onClick={handleRestoreBackup}
 className="px-4 py-2 bg-surface-3 border border-line text-text font-technical font-bold hover:bg-cyan hover:text-text hover:border-cyan transition-colors"
 >
 Restore Backup
 </button>
 </div>
 </section>

 {/* Personal context editor */}
 <section className="panel p-6 space-y-4">
 <div className="flex justify-between items-start">
 <div>
 <h2 className="font-display font-bold text-text">Personal context (about-me)</h2>
 <span className="text-xs text-dim">
 {wordCount} words (recommended &lt; 250)
 </span>
 </div>
 </div>
 <textarea
 value={aboutMeLocal}
 onChange={handleAboutMeChange}
 rows={14}
 className="w-full bg-surface-3 border border-line p-3 text-text focus-ring font-mono text-sm"
 placeholder="Write about yourself here…"
 />
 <button
 onClick={handleSaveAboutMe}
 className="px-4 py-2 bg-yellow text-black font-technical font-bold hover:bg-surface-3 hover:border-yellow hover:border transition-colors"
 >
 Save personal context
 </button>
 </section>

 {/* Batch processing */}
 <section className="panel p-6 space-y-4">
 <div className="flex justify-between items-start">
 <div>
 <h2 className="font-display font-bold text-text">Batch Process Folder</h2>
 </div>
 <button
 onClick={handlePickBatchFolder}
 className="px-3 py-1.5 text-xs bg-cyan text-black font-technical font-bold hover:bg-surface-3 hover:border-cyan hover:border transition-colors"
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
 className="flex-1 bg-surface-3 border border-line px-3 py-2 text-text focus-ring font-mono text-sm"
 />
 <button
 onClick={handleProcessBatch}
 disabled={batchProcessing || !batchFolder}
 className="px-4 py-2 bg-yellow text-black font-technical font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 {batchProcessing ? 'Processing…' : 'Process Folder'}
 </button>
 {batchProcessing && (
 <button
 onClick={handleCancelBatch}
 className="px-4 py-2 bg-pink text-text font-technical font-bold hover:bg-surface-3 hover:border-pink hover:border transition-colors"
 >
 Cancel
 </button>
 )}
 </div>
 </section>

 {/* Folder watching */}
 <section className="panel p-6 space-y-4">
 <div className="flex justify-between items-start">
 <div>
 <h2 className="font-display font-bold text-text">Folder Watching</h2>
 </div>
 <button
 onClick={handlePickWatchFolder}
 className="px-3 py-1.5 text-xs bg-cyan text-black font-technical font-bold hover:bg-surface-3 hover:border-cyan hover:border transition-colors"
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
 className="flex-1 bg-surface-3 border border-line px-3 py-2 text-text focus-ring font-mono text-sm"
 />
 {watching ? (
 <button
 onClick={handleStopWatch}
 className="px-4 py-2 bg-pink text-text font-technical font-bold hover:bg-surface-3 hover:border-pink hover:border transition-colors"
 >
 Stop watching
 </button>
 ) : (
 <button
 onClick={handleStartWatch}
 disabled={!watchFolder}
 className="px-4 py-2 bg-yellow text-black font-technical font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 Start watching
 </button>
 )}
 </div>
 </section>

 {/* Modes management */}
 <section className="panel p-6 space-y-4">
 <div className="flex justify-between items-start">
 <div>
 <h2 className="font-display font-bold text-text">AI modes</h2>
 </div>
 <button
 onClick={() => setEditingMode({ ...DEFAULT_MODE })}
 className="px-3 py-1.5 text-xs bg-cyan text-black font-technical font-bold hover:bg-surface-3 hover:border-cyan hover:border transition-colors"
 >
 New mode
 </button>
 </div>
 {editingMode && (
 <div className="border-t border-line pt-4">
 <ModeEditor
 mode={editingMode}
 onSave={handleModeSaved}
 onDelete={handleModeDeleted}
 onCancel={() => setEditingMode(null)}
 />
 </div>
 )}
 {testingMode && (
 <div className="mt-6 border-t border-line pt-4">
 <ModeTestPanel mode={testingMode} />
 </div>
 )}
 </section>
 </div>
 );
}

