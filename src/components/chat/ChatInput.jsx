import React, { useCallback, useEffect, useRef, useState } from 'react';

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
 <div className="px-4 pb-6 pt-4 border-t border-line bg-surface-1">
 <div className="flex gap-2 items-end">
 <textarea
 ref={textareaRef}
 value={input}
 onChange={handleChange}
 onKeyDown={handleKeyDown}
 placeholder="// type a message… (/ for modes, Enter to send, Shift + Enter for new line)"
 className="w-full bg-surface-3 border border-line px-4 py-3 text-text focus-ring font-mono text-sm resize-none"
 rows={2}
 />
 <div className="flex gap-2">
 <button
 type="button"
 onClick={onAttach}
 className="p-3 bg-surface-3 border border-line text-muted hover:text-cyan hover:border-cyan transition-colors"
 title="Attach file"
 >
 <span aria-hidden="true">📎</span>
 </button>
 <button
 onClick={() => (streaming ? onStop() : onSend())}
 disabled={!input.trim()}
 className="px-5 py-3 bg-yellow text-black font-technical font-bold hover:bg-surface-3 hover:border-yellow hover:border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 {streaming ? 'Stop' : 'Send'}
 </button>
 </div>
 </div>

 {showSlash && slashMatches.length > 0 && (
 <div className="absolute mt-1 w-[400px] surface-3 border border-line shadow-neon-cyan z-10">
 <ul className="divide-y divide-line">
 {slashMatches.map((mode) => (
 <li key={mode.id}>
 <button
 onClick={() => selectMode(mode)}
 className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
 activeModeId === mode.id
 ? 'bg-cyan/10 text-cyan border-r-2 border-r-yellow'
 : 'text-muted hover:bg-surface-3 hover:text-text'
 }`}
 >
 <span className="text-cyan text-xs font-mono mr-2">
 {mode.slash || `/${mode.id}`}
 </span>
 {mode.name}
 {activeModeId === mode.id && (
 <span className="ml-auto text-[10px] text-dim">active</span>
 )}
 </button>
 </li>
 ))}
 </ul>
 </div>
 )}

 {activeMode && (
 <div className="flex items-center gap-2 text-tech text-dim">
 <span className="text-cyan">{activeMode.slash || `/${activeMode.id}`}</span>
 <span>Mode: {activeMode.name}</span>
 </div>
 )}
 </div>
 );
}

