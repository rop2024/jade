import React, { useEffect, useState } from 'react';
import { Circle, WifiOff, Database } from 'lucide-react';
import { ollamaStatus } from '../api/chatAPI';
import { useConversationStore } from '../store/conversationStore';

export function OllamaStatusBar({ className = '' }) {
    const [available, setAvailable] = useState(null);
    const [error, setError] = useState(null);
    const defaultModel = useConversationStore((state) => state.defaultModel);
    const models = useConversationStore((state) => state.models);

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
            <div className={`flex items-center gap-2 px-3 py-1.5 ${className} text-xs`}>
                <span className="text-muted">Ollama connecting…</span>
            </div>
        );
    }

    return (
        <div className={`flex items-center justify-between gap-2 px-3 py-1.5 ${className} text-xs`}>
            <div className="flex items-center gap-2">
                {available ? (
                    <>
                        <span className="flex items-center gap-1">
                            <Circle size={8} className="fill-ok" />
                            <span className="text-ok font-medium">Ollama online</span>
                        </span>
                        <span className="text-muted">·</span>
                        <span className="font-mono text-text">
                            {defaultModel || (models[0]?.name || 'no model')}
                        </span>
                    </>
                ) : (
                    <>
                        <WifiOff size={12} className="text-err" />
                        <span className="text-err font-medium">Ollama offline</span>
                        {error && <span className="text-muted">— {error}</span>}
                    </>
                )}
            </div>
        </div>
    );
}

export default OllamaStatusBar;
