import React, { useState, useEffect, useCallback } from 'react';

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

export function ModeEditor({ mode, onSave, onDelete, onCancel }) {
    const [draft, setDraft] = useState(DEFAULT_MODE);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setDraft(mode ? { ...mode } : { ...DEFAULT_MODE });
    }, [mode]);

    const updateField = useCallback((key, value) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    }, []);

    const addRule = useCallback(() => {
        setDraft((prev) => ({ ...prev, rules: [...prev.rules, ''] }));
    }, []);

    const removeRule = useCallback((index) => {
        setDraft((prev) => {
            const rules = [...prev.rules];
            rules.splice(index, 1);
            return { ...prev, rules };
        });
    }, []);

    const updateRule = useCallback((index, value) => {
        setDraft((prev) => {
            const rules = [...prev.rules];
            rules[index] = value;
            return { ...prev, rules };
        });
    }, []);

    const addExample = useCallback(() => {
        setDraft((prev) => ({
            ...prev,
            examples: [...prev.examples, { input: '', output: '' }],
        }));
    }, []);

    const removeExample = useCallback((index) => {
        setDraft((prev) => {
            const examples = [...prev.examples];
            examples.splice(index, 1);
            return { ...prev, examples };
        });
    }, []);

    const updateExample = useCallback((index, field, value) => {
        setDraft((prev) => {
            const examples = [...prev.examples];
            examples[index] = { ...examples[index], [field]: value };
            return { ...prev, examples };
        });
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!draft.id || !draft.name) {
            alert('Id and name are required.');
            return;
        }
        setSaving(true);
        try {
            onSave?.(draft);
        } catch (err) {
            alert('Failed to save mode: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!draft.id) return;
        if (!window.confirm(`Delete mode "${draft.name}"?`)) return;
        onDelete?.(draft.id);
    };

    const handleCancel = () => {
        onCancel?.();
    };

    return (
        <div className="surface-2 border border-line rounded panel p-6 space-y-5 shadow-neon-cyan">
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-display font-bold text-text">{mode ? 'Edit Mode' : 'New Mode'}</h3>
                <div className="flex gap-2">
                    {mode && (
                        <button
                            onClick={handleDelete}
                            className="px-3 py-1.5 text-xs text-pink hover:bg-pink/10 rounded hover:text-pink transition-colors"
                        >
                            Delete
                        </button>
                    )}
                    <button
                        onClick={handleCancel}
                        className="px-3 py-1.5 text-xs text-dim hover:text-text hover:bg-surface-3 rounded transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-1.5 text-xs bg-yellow text-black font-technical font-bold disabled:opacity-50 hover:bg-surface-3 hover:border-yellow hover:border transition-colors"
                    >
                        {saving ? 'Saving…' : 'Save Mode'}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="tech-label text-muted mb-1 block">// id</label>
                        <input
                            value={draft.id}
                            onChange={(e) => updateField('id', e.target.value)}
                            className="w-full bg-surface-3 border border-line rounded px-3 py-2 text-text focus-ring font-mono text-sm"
                            placeholder="journal-digest"
                        />
                    </div>
                    <div>
                        <label className="tech-label text-muted mb-1 block">// name</label>
                        <input
                            value={draft.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            className="w-full bg-surface-3 border border-line rounded px-3 py-2 text-text focus-ring font-mono text-sm"
                            placeholder="Journal Digest"
                        />
                    </div>
                    <div>
                        <label className="tech-label text-muted mb-1 block">// slash command</label>
                        <input
                            value={draft.slash}
                            onChange={(e) => updateField('slash', e.target.value)}
                            className="w-full bg-surface-3 border border-line rounded px-3 py-2 text-text focus-ring font-mono text-sm"
                            placeholder="/journal"
                        />
                    </div>
                    <div>
                        <label className="tech-label text-muted mb-1 block">// model</label>
                        <input
                            value={draft.model}
                            onChange={(e) => updateField('model', e.target.value)}
                            className="w-full bg-surface-3 border border-line rounded px-3 py-2 text-text focus-ring font-mono text-sm"
                            placeholder="llama3.2"
                        />
                    </div>
                    <div>
                        <label className="tech-label text-muted mb-1 block">// temperature</label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="2"
                            value={draft.temperature}
                            onChange={(e) => updateField('temperature', parseFloat(e.target.value) || 0.5)}
                            className="w-full bg-surface-3 border border-line rounded px-3 py-2 text-text focus-ring font-mono text-sm"
                        />
                    </div>
                    <div>
                        <label className="tech-label text-muted mb-1 block">// output type</label>
                        <select
                            value={draft.output?.type || 'markdown'}
                            onChange={(e) =>
                                updateField('output', { ...draft.output, type: e.target.value })
                            }
                            className="w-full bg-surface-3 border border-line rounded px-3 py-2 text-text focus-ring font-mono text-sm"
                        >
                            <option value="markdown">Markdown</option>
                            <option value="text">Plain text</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="tech-label text-muted mb-1 block">// system prompt</label>
                    <textarea
                        value={draft.system}
                        onChange={(e) => updateField('system', e.target.value)}
                        rows={4}
                        className="w-full bg-surface-3 border border-line rounded px-3 py-2 text-text focus-ring font-mono text-sm"
                        placeholder="You are a helpful assistant…"
                    />
                </div>

                <div>
                    <label className="tech-label text-muted mb-1 block">// output template</label>
                    <textarea
                        value={draft.template}
                        onChange={(e) => updateField('template', e.target.value)}
                        rows={3}
                        className="w-full bg-surface-3 border border-line rounded px-3 py-2 text-text focus-ring font-mono text-sm"
                        placeholder="# Summary…"
                    />
                </div>

                <div>
                    <label className="tech-label text-muted mb-1 block">// rules</label>
                    <div className="space-y-2">
                        {draft.rules.map((rule, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    value={rule}
                                    onChange={(e) => updateRule(index, e.target.value)}
                                    className="flex-1 bg-surface-3 border border-line rounded px-3 py-2 text-text focus-ring font-mono text-sm"
                                    placeholder="Bullets only"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeRule(index)}
                                    className="px-2 py-2 text-dim hover:text-pink rounded hover:bg-pink/10"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addRule}
                            className="text-xs text-cyan hover:text-text"
                        >
                            + Add rule
                        </button>
                    </div>
                </div>

                <div>
                    <label className="tech-label text-muted mb-1 block">// few-shot examples</label>
                    <div className="space-y-2">
                        {draft.examples.map((example, index) => (
                            <div key={index} className="space-y-2 border-b border-line pb-2">
                                <div className="flex gap-2">
                                    <input
                                        value={example.input}
                                        onChange={(e) => updateExample(index, 'input', e.target.value)}
                                        className="flex-1 bg-surface-3 border border-line rounded px-3 py-2 text-text focus-ring font-mono text-sm"
                                        placeholder="Input"
                                    />
                                    <input
                                        value={example.output}
                                        onChange={(e) => updateExample(index, 'output', e.target.value)}
                                        className="flex-1 bg-surface-3 border border-line rounded px-3 py-2 text-text focus-ring font-mono text-sm"
                                        placeholder="Output"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeExample(index)}
                                        className="px-2 py-2 text-dim hover:text-pink rounded hover:bg-pink/10"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addExample}
                            className="text-xs text-cyan hover:text-text"
                        >
                            + Add example
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
