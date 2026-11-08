import React, { useEffect } from 'react';
import { useConversationStore } from '../../store/conversationStore';

export function ModePicker() {
    const { modes, activeModeId, setActiveMode, loadModes } = useConversationStore();

    useEffect(() => {
        loadModes();
    }, [loadModes]);

    const activeMode = modes.find((m) => m.id === activeModeId);

    return (
        <div className="flex items-center gap-2">
            <span className="tech-label text-dim">// mode</span>
            <select
                value={activeModeId || ''}
                onChange={(e) => setActiveMode(e.target.value)}
                className="bg-surface-3 border border-line rounded px-3 py-2 text-sm text-text focus-ring font-mono"
            >
                <option value="">default</option>
                {modes.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                        {mode.slash} {mode.name}
                    </option>
                ))}
            </select>
            {activeMode && (
                <span className="text-xs text-dim font-mono">
                    {activeMode.model}
                </span>
            )}
        </div>
    );
}
