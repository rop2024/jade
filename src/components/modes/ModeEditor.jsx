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
        <div className="bg-[#16213e] border border-gray-700 rounded-xl p-6 space-y-5">
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold">{mode ? 'Edit Mode' : 'New Mode'}</h3>
                <div className="flex gap-2">
                    {mode && (
                        <button
                            onClick={handleDelete}
                            className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20 rounded hover:text-red-300"
                        >
                            Delete
                        </button>
                    )}
                    <button
                        onClick={handleCancel}
                        className="px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-700/50 rounded hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-1.5 text-xs bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 text-white"
                    >
                        {saving ? 'Saving…' : 'Save Mode'}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Id</label>
                        <input
                            value={draft.id}
                            onChange={(e) => updateField('id', e.target.value)}
                            className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder="journal-digest"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
                        <input
                            value={draft.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder="Journal Digest"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Slash command</label>
                        <input
                            value={draft.slash}
                            onChange={(e) => updateField('slash', e.target.value)}
                            className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder="/journal"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Model</label>
                        <input
                            value={draft.model}
                            onChange={(e) => updateField('model', e.target.value)}
                            className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder="llama3.2"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Temperature</label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="2"
                            value={draft.temperature}
                            onChange={(e) => updateField('temperature', parseFloat(e.target.value) || 0.5)}
                            className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Output type</label>
                        <select
                            value={draft.output?.type || 'markdown'}
                            onChange={(e) =>
                                updateField('output', { ...draft.output, type: e.target.value })
                            }
                            className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                            <option value="markdown">Markdown</option>
                            <option value="text">Plain text</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">System prompt</label>
                    <textarea
                        value={draft.system}
                        onChange={(e) => updateField('system', e.target.value)}
                        rows={4}
                        className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="You are a helpful assistant…"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Output template</label>
                    <textarea
                        value={draft.template}
                        onChange={(e) => updateField('template', e.target.value)}
                        rows={3}
                        className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="# Summary…"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Rules</label>
                    <div className="space-y-2">
                        {draft.rules.map((rule, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    value={rule}
                                    onChange={(e) => updateRule(index, e.target.value)}
                                    className="flex-1 bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    placeholder="Bullets only"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeRule(index)}
                                    className="px-2 py-2 text-gray-500 hover:text-red-400 rounded hover:bg-gray-700/50"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addRule}
                            className="text-xs text-blue-400 hover:text-blue-300"
                        >
                            + Add rule
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Few-shot examples</label>
                    <div className="space-y-2">
                        {draft.examples.map((example, index) => (
                            <div key={index} className="space-y-2 border-b border-gray-800 pb-2">
                                <div className="flex gap-2">
                                    <input
                                        value={example.input}
                                        onChange={(e) => updateExample(index, 'input', e.target.value)}
                                        className="flex-1 bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="Input"
                                    />
                                    <input
                                        value={example.output}
                                        onChange={(e) => updateExample(index, 'output', e.target.value)}
                                        className="flex-1 bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="Output"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeExample(index)}
                                        className="px-2 py-2 text-gray-500 hover:text-red-400 rounded hover:bg-gray-700/50"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addExample}
                            className="text-xs text-blue-400 hover:text-blue-300"
                        >
                            + Add example
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
