import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useConversationStore } from '../../store/conversationStore';
import { noteSave, noteListTitles, vaultGet } from '../../api/chatAPI';

export function SaveToVaultDialog({ content, open, onClose, onSaved }) {
    const { vaultGet: storeVaultGet, noteSave: storeNoteSave } = useConversationStore();
    const [vault, setVault] = useState('');
    const [folder, setFolder] = useState('');
    const [title, setTitle] = useState('');
    const [tags, setTags] = useState('');
    const [body, setBody] = useState(content || '');
    const [saving, setSaving] = useState(false);
    const [suggestedTitles, setSuggestedTitles] = useState([]);
    const titleInputRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                const { vaultPath } = await storeVaultGet();
                setVault(vaultPath || '');
            } catch {}
            const extracted = extractTitle(content);
            if (extracted) {
                setTitle(extracted);
            } else {
                setTitle('Untitled Note');
            }
            setBody(content || '');
            setTags('');
            setFolder('');
            if (vault) {
                try {
                    const titles = await noteListTitles(vault);
                    setSuggestedTitles(titles);
                } catch {}
            }
        })();
        return () => {};
    }, [open, content, storeVaultGet, noteListTitles]);

    const extractTitle = (text) => {
        const match = /^#\s+(.+)$/m.exec(text || '');
        return match ? match[1].trim() : null;
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!vault) {
            alert('Please configure an Obsidian vault path in Settings.');
            return;
        }
        if (!title.trim()) {
            alert('A note title is required.');
            return;
        }
        setSaving(true);
        try {
            const tagList = tags.split(/\s*,\s*/).filter(Boolean);
            const saved = await storeNoteSave({
                vault,
                folder: folder.trim(),
                title: title.trim(),
                body,
                tags: tagList,
            });
            onClose();
            onSaved?.(saved);
        } catch (err) {
            alert('Failed to save note: ' + (err.message || String(err)));
        } finally {
            setSaving(false);
        }
    };

    const handleLinkSuggestion = (titleName) => {
        setBody((prev) => {
            const link = `[[${titleName}]]`;
            if (prev.includes(link)) return prev;
            return `${prev.trim()}\n\n${link}`;
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="surface-2 border border-line rounded panel p-6 w-full max-w-2xl shadow-neon-cyan">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-display font-bold text-text">Save to Vault</h3>
                    <button
                        onClick={onClose}
                        className="text-muted hover:text-cyan"
                    >
                        &times;
                    </button>
                </div>

                {!vault && (
                    <div className="bg-pink/10 border border-pink/30 rounded p-3 mb-4 text-sm text-pink font-mono">
                        No vault configured. Set your Obsidian vault path in Settings first.
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="tech-label text-muted mb-1 block">// vault</label>
                        <div className="bg-surface-3 border border-line rounded px-3 py-2 text-sm text-muted font-mono">
                            {vault || 'Not configured'}
                        </div>
                    </div>

                    <div>
                        <label className="tech-label text-muted mb-1 block">// destination folder</label>
                        <input
                            value={folder}
                            onChange={(e) => setFolder(e.target.value)}
                            placeholder="e.g. Notes"
                            className="w-full bg-surface-3 border border-line rounded px-3 py-2 text-text focus-ring font-mono text-sm"
                        />
                        <p className="text-[10px] text-dim mt-1">
                            Relative to vault root. Leave empty for vault root.
                        </p>
                    </div>

                    <div>
                        <label className="tech-label text-muted mb-1 block">// note title</label>
                        <input
                            ref={titleInputRef}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-surface-3 border border-line rounded px-3 py-2 text-text focus-ring font-mono text-sm"
                        />
                    </div>

                    <div>
                        <label className="tech-label text-muted mb-1 block">// tags (comma-separated)</label>
                        <input
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="knowledge, journal"
                            className="w-full bg-surface-3 border border-line rounded px-3 py-2 text-text focus-ring font-mono text-sm"
                        />
                    </div>

                    <div>
                        <label className="tech-label text-muted mb-1 block">// markdown content</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={10}
                            className="w-full bg-[#080A0F] border border-line rounded p-3 text-sm text-text focus-ring font-mono"
                        />
                    </div>

                    {suggestedTitles.length > 0 && (
                        <div>
                            <label className="tech-label text-muted mb-2 block">// link to existing notes</label>
                            <div className="flex flex-wrap gap-2">
                                {suggestedTitles.slice(0, 20).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => handleLinkSuggestion(t)}
                                        className="px-2 py-1 text-[11px] text-muted bg-surface-3 border border-line rounded hover:text-cyan hover:border-cyan transition-colors"
                                    >
                                        [[{t}]]
                                    </button>
                                ))}
                                {suggestedTitles.length > 20 && (
                                    <span className="text-[10px] text-dim">…and {suggestedTitles.length - 20} more</span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4 border-t border-line">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded text-muted hover:text-text"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !vault || !title.trim()}
                            className="px-4 py-2 rounded bg-yellow text-black font-technical font-bold disabled:opacity-50 transition-colors"
                        >
                            {saving ? 'Saving…' : 'Save Note'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
