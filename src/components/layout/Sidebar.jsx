import React, { useState, useEffect, useCallback } from 'react';
import { useConversationStore } from '../../store/conversationStore';

function relativeTime(timestamp) {
 if (!timestamp) return '';
 const date = new Date(timestamp);
 const now = new Date();
 const diffMs = now - date;
 const diffMins = Math.floor(diffMs / 60000);
 const diffHours = Math.floor(diffMs / 3600000);
 const diffDays = Math.floor(diffMs / 86400000);

 if (diffMins < 1) return 'Just now';
 if (diffMins < 60) return `${diffMins}m ago`;
 if (diffHours < 24) return `${diffHours}h ago`;
 if (diffDays < 7) return `${diffDays}d ago`;
 return date.toLocaleDateString();
}

export function Sidebar() {
 const {
 conversations,
 activeConversationId,
 loadConversations,
 createConversation,
 renameConversation,
 deleteConversation,
 setActiveConversation,
 } = useConversationStore();

 const [searchQuery, setSearchQuery] = useState('');
 const [renameId, setRenameId] = useState(null);
 const [renameTitle, setRenameTitle] = useState('');

 useEffect(() => {
 loadConversations();
 }, [loadConversations]);

 const filtered = conversations.filter(Boolean).filter((c) =>
  c.title.toLowerCase().includes(searchQuery.toLowerCase())
 );

 const handleNewChat = async () => {
  const conversation = await createConversation({
   title: 'New Conversation',
   model: null,
  });
  if (!conversation || !conversation.id) return;
  setActiveConversation(conversation.id);
 };

 const handleSelect = (id) => {
 setRenameId(null);
 setActiveConversation(id);
 };

 const handleRenameStart = (id, title) => {
 setRenameId(id);
 setRenameTitle(title);
 };

 const handleRenameSave = async (id) => {
 const title = (renameTitle || '').trim();
 if (!title || id === null) {
 setRenameId(null);
 return;
 }
 await renameConversation(id, title);
 setRenameId(null);
 };

 const handleDelete = async (id) => {
 if (!window.confirm('Delete this conversation?')) return;
 await deleteConversation(id);
 };

 return (
 <div className="w-80 bg-surface-1 border-r border-line flex flex-col">
 <div className="p-4 border-b border-line">
 <h2 className="tech-label text-muted">// conversations</h2>
 </div>

 <div className="p-3 border-b border-line">
 <div className="relative">
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="// search conversations"
 className="w-full bg-surface-3 border border-line px-4 py-2.5 text-sm text-text placeholder-dim focus-ring font-mono"
 />
 {searchQuery && (
 <button
 onClick={() => setSearchQuery('')}
 className="absolute right-2 top-2 text-dim hover:text-cyan"
 >
 &times;
 </button>
 )}
 </div>
 </div>

 <div className="flex-1 overflow-y-auto p-2 space-y-1">
 <button
 onClick={handleNewChat}
 className="w-full px-4 py-2.5 text-sm font-technical text-text bg-cyan/10 border border-cyan/30 hover:bg-cyan/20 transition-colors shadow-neon-cyan"
 >
 + New Chat
 </button>

 {filtered.length === 0 ? (
 <div className="px-4 py-4 text-center text-sm text-dim">
 {searchQuery ? 'No matching conversations' : 'No conversations yet'}
 </div>
 ) : (
 <ul className="space-y-1">
 {filtered.map((conversation) => {
 const isActive = conversation.id === activeConversationId;
 const isRenaming = renameId === conversation.id;
 return (
 <li key={conversation.id}>
 {isRenaming ? (
 <div className="flex items-center gap-2 bg-surface-3 p-1">
 <input
 autoFocus
 value={renameTitle}
 onChange={(e) => setRenameTitle(e.target.value)}
 onBlur={() => handleRenameSave(conversation.id)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') handleRenameSave(conversation.id);
 if (e.key === 'Escape') {
 setRenameTitle(conversation.title);
 setRenameId(null);
 }
 }}
 className="flex-1 bg-transparent px-2 py-1.5 text-sm text-text outline-none font-mono"
 />
 <button
 onClick={() => handleRenameSave(conversation.id)}
 className="p-1 text-cyan hover:text-text hover:bg-surface-3"
 >
 ✓
 </button>
 <button
 onClick={() => {
 setRenameTitle(conversation.title);
 setRenameId(null);
 }}
 className="p-1 text-dim hover:text-pink hover:bg-pink/10"
 >
 ✕
 </button>
 </div>
 ) : (
 <div
 onClick={() => handleSelect(conversation.id)}
 className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors border-l-2 ${
 isActive
 ? 'border-l-yellow bg-cyan/10 text-cyan'
 : 'border-l-transparent text-muted hover:bg-surface-3 hover:text-text'
 }`}
 title={conversation.title}
 >
 <div className="flex-1 min-w-0 truncate text-text font-mono text-sm">
 {conversation.title}
 </div>
 <div className="text-xs text-dim whitespace-nowrap font-mono">
 {relativeTime(conversation.updated_at)}
 </div>
 </div>
 )}
 </li>
 );
 })}
 </ul>
 )}
 </div>
 </div>
 );
}

