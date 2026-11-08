import React, { useEffect, useRef, useState } from 'react';

export function ChatInput({ input, onChange, onSend, onStop, streaming, modes, activeModeId, onModeChange, onAttach }) {
    const textareaRef = useRef(null);
    const [showSlash, setShowSlash] = useState(false);
    const [slashMatches, setSlashMatches] = useState([]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
        }
    }, [input]);

    const handleChange = (e) => {
        const value = e.target.value;
        onChange(value);
        if (value.startsWith('/') && value.length > 1) {
            const query = value.slice(1).toLowerCase();
            setSlashMatches(
                modes.filter(
                    (m) =>
                        (m.slash || '').toLowerCase().includes(query) ||
                        m.name.toLowerCase().includes(query) ||
                        m.id.toLowerCase().includes(query)
                )
            );
            setShowSlash(true);
        } else {
            setShowSlash(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
        if (e.key === 'Escape') {
            setShowSlash(false);
        }
    };

    const selectMode = (mode) => {
        onModeChange(mode.id);
        onChange(`/${mode.slash || mode.id} `);
        setShowSlash(false);
    };

    const activeMode = modes.find((m) => m.id === activeModeId);

    return (
        <div className="px-4 pb-6 pt-4 border-t border-gray-700 bg-[#0b1020]">
            <div className="flex gap-2 items-end">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message… (/ for modes, Enter to send, Shift + Enter for new line)"
                    className="w-full bg-[#16213e] border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    rows={2}
                />
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onAttach}
                        className="px-3 py-3 rounded-xl bg-[#1a1a2e] border border-gray-700 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                        title="Attach file"
                    >
                        <span aria-hidden="true">📎</span>
                    </button>
                    <button
                        onClick={() => (streaming ? onStop() : onSend())}
                        disabled={!input.trim()}
                        className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-white"
                    >
                        {streaming ? 'Stop' : 'Send'}
                    </button>
                </div>
            </div>

            {showSlash && slashMatches.length > 0 && (
                <div className="absolute mt-1 w-[400px] bg-[#1a1a2e] border border-gray-700 rounded-lg shadow-xl z-10">
                    <ul className="divide-y divide-gray-700">
                        {slashMatches.map((mode) => (
                            <li key={mode.id}>
                                <button
                                    onClick={() => selectMode(mode)}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                        activeModeId === mode.id
                                            ? 'bg-blue-600/30 text-blue-400'
                                            : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                                    }`}
                                >
                                    <span className="text-blue-400 text-xs font-mono mr-2">
                                        {mode.slash || `/${mode.id}`}
                                    </span>
                                    {mode.name}
                                    {activeModeId === mode.id && (
                                        <span className="ml-auto text-[10px] text-gray-500">active</span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {activeMode && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="text-blue-400">{activeMode.slash || `/${activeMode.id}`}</span>
                    <span>Mode: {activeMode.name}</span>
                </div>
            )}
        </div>
    );
}
