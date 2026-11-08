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

    const filtered = conversations.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleNewChat = async () => {
        const now = new Date().toISOString();
        const conversation = await createConversation({
            title: 'New Conversation',
            model: null,
        });
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
        <div className="w-80 bg-[#16213e] border-r border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Conversations</h2>
            </div>

            <div className="p-3 border-b border-gray-700">
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search conversations…"
                        className="w-full bg-[#1a1a2e] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-2 text-gray-500 hover:text-white"
                        >
                            &times;
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <button
                    onClick={handleNewChat}
                    className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md shadow-blue-500/30"
                >
                    + New Chat
                </button>

                {filtered.length === 0 ? (
                    <div className="px-4 py-4 text-center text-sm text-gray-500">
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
                                        <div className="flex items-center gap-2 bg-[#1a1a2e] rounded-lg p-1">
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
                                                className="flex-1 bg-transparent px-2 py-1.5 text-sm text-white outline-none"
                                            />
                                            <button
                                                onClick={() => handleRenameSave(conversation.id)}
                                                className="p-1 text-blue-400 hover:text-blue-300 rounded hover:bg-blue-500/10"
                                            >
                                                ✓
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setRenameTitle(conversation.title);
                                                    setRenameId(null);
                                                }}
                                                className="p-1 text-gray-500 hover:text-gray-300 rounded hover:bg-gray-700/50"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => handleSelect(conversation.id)}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                // No-op context menu; delete via button below
                                            }}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                                                isActive
                                                    ? 'bg-blue-600/20 text-white border-l-2 border-l-blue-500'
                                                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                                            }`}
                                        >
                                            <div className="flex-1 min-w-0 truncate">{conversation.title}</div>
                                            <div className="text-xs text-gray-500 whitespace-nowrap">
                                                {relativeTime(conversation.updated_at)}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRenameStart(conversation.id, conversation.title);
                                                }}
                                                className="p-1 text-gray-500 hover:text-blue-400 rounded hover:bg-gray-700/50 opacity-0 group-hover:opacity-100"
                                                title="Rename"
                                            >
                                                ✎
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(conversation.id);
                                                }}
                                                className="p-1 text-gray-500 hover:text-red-400 rounded hover:bg-gray-700/50 opacity-0 group-hover:opacity-100"
                                                title="Delete"
                                            >
                                                ×
                                            </button>
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
