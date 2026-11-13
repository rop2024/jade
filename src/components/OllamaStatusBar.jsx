import React, { useEffect, useState } from 'react';
import { ollamaStatus } from '../api/chatAPI';
import { useConversationStore } from '../store/conversationStore';

export function OllamaStatusBar() {
    const [available, setAvailable] = useState(null);
    const [error, setError] = useState(null);
    const defaultModel = useConversationStore((state) => state.defaultModel);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const status = await ollamaStatus();
                if (mounted) {
                    setAvailable(status.available);
                    setError(null);
                }
            } catch (err) {
                if (mounted) {
                    setAvailable(false);
                    setError(err.message);
                }
            }
        })();
        return () => { mounted = false; };
    }, []);

    if (available === null) {
        return (
            <div className="flex items-center gap-2 px-3 py-1 bg-surface-1 border-b border-line text-xs">
                <span className="text-tech font-technical animate-pulse">Ollama checking…</span>
            </div>
        );
    }

    if (!available) {
        return (
            <div className="flex items-center gap-2 px-3 py-1 bg-pink/5 border-b border-pink/20 text-xs text-pink">
                <span className="text-pink font-technical">Ollama offline</span>
                {error && <span className="text-muted">{`— ${error}`}</span>}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1 bg-surface-1 border-b border-line text-xs text-cyan">
            <span className="text-cyan font-technical">Ollama online</span>
            <span className="text-muted">·</span>
            <span className="font-mono">{defaultModel || 'llama3.2'}</span>
        </div>
    );
}

export default OllamaStatusBar;
