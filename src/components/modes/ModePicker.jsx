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
            <span className="text-xs text-gray-400 uppercase tracking-wider">Mode</span>
            <select
                value={activeModeId || ''}
                onChange={(e) => setActiveMode(e.target.value)}
                className="bg-[#1a1a2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
                <option value="">Default</option>
                {modes.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                        {mode.slash} {mode.name}
                    </option>
                ))}
            </select>
            {activeMode && (
                <span className="text-xs text-gray-500">
                    {activeMode.model}
                </span>
            )}
        </div>
    );
}
