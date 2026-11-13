import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Type, Monitor, StopCircle } from 'lucide-react';
import { useConversationStore } from '../../store/conversationStore';

export function ChatInput({ input, onChange, onSend, onStop, streaming, modes, activeModeId, onModeChange, onAttach }) {
  const {
    attachments,
    clearAttachments,
    removeAttachment,
    models,
  } = useConversationStore();
  const textareaRef = useRef(null);
  const [showSlash, setShowSlash] = useState(false);
  const [slashMatches, setSlashMatches] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);

  useEffect(() => {
    const options = [];
    models.forEach((m) => {
      options.push({ label: m.name, value: m.name });
    });
    // Presets first
    const presetOptions = [];
    if (modes.find((m) => m.id === 'fast')) presetOptions.push({ label: 'Fast', value: 'fast' });
    if (modes.find((m) => m.id === 'deep')) presetOptions.push({ label: 'Deep', value: 'deep' });
    setModelOptions([...presetOptions, ...options]);
  }, [models, modes]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
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
    <div className="bg-sidebar border-t border-line p-4">
      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-1.5">
              <span className="text-[10px] text-muted font-mono">{a.filename}</span>
              <button
                onClick={() => removeAttachment(a.id)}
                className="p-1 text-muted hover:text-err hover:bg-err/10 rounded-sm"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={clearAttachments}
            className="text-xs text-muted underline underline-offset-2 hover:text-text"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift + Enter for new line)"
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text focus-ring sans text-base resize-none"
          rows={2}
          spellCheck={false}
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onAttach}
            className="p-2.5 bg-surface border border-border rounded-lg text-muted hover:text-accent hover:bg-surface-hover transition-colors"
            title="Attach file"
          >
            <Plus size={16} />
          </button>
          <select
            value={activeModeId || 'fast'}
            onChange={(e) => onModeChange(e.target.value)}
            className="bg-surface border border-border rounded-lg px-2.5 py-2 text-xs text-muted font-mono focus-ring cursor-pointer"
          >
            {modes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.slash || `/${m.id}`} — {m.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => (streaming ? onStop() : onSend())}
            disabled={!input.trim() && !streaming}
            className="px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-1.5"
            disabled={!input.trim() && !streaming}
          >
            {streaming ? (
              <>
                <StopCircle size={16} className="text-err" />
                <span className="text-err font-medium">Stop</span>
              </>
            ) : (
              <>
                <Type size={16} className="text-white" />
                <span className="text-white font-medium">Send</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showSlash && slashMatches.length > 0 && (
        <div className="mt-1 w-[360px] surface border border-border rounded-lg shadow-sm z-10">
          <ul className="divide-y divide-border">
            {slashMatches.map((mode) => (
              <li key={mode.id}>
                <button
                  onClick={() => selectMode(mode)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    activeModeId === mode.id
                      ? 'bg-accent/10 text-accent border-r-2 border-r-accent'
                      : 'text-text hover:bg-surface-hover'
                  }`}
                >
                  <span className="text-accent text-[10px] font-mono mr-2">
                    {mode.slash || `/${mode.id}`}
                  </span>
                  {mode.name}
                  {activeModeId === mode.id && (
                    <span className="ml-auto text-[10px] text-muted">active</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeMode && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted font-mono">
          <Monitor size={12} />
          <span>Mode: {activeMode.name}</span>
        </div>
      )}
    </div>
  );
}
