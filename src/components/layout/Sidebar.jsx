import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useConversationStore } from '../../store/conversationStore';
import { Sun, Moon, Menu, X, ChevronRight, Settings as SettingsIcon } from 'lucide-react';

function relativeTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMs < 60000) return 'Just now';
  if (diffMs < 86400000) {
    const diffHours = Math.floor(diffMs / 3600000);
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function dayGroupKey(timestamp) {
  if (!timestamp) return 'previous';
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffMs = date - now;
  const diffDays = Math.round(diffMs / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays === -1) return 'yesterday';
  if (diffDays > -8 && diffDays < 0) return 'previous7';
  return 'previous';
}

function groupLabel(key) {
  switch (key) {
    case 'today': return 'Today';
    case 'yesterday': return 'Yesterday';
    case 'previous7': return 'Previous 7 days';
    default: return 'Earlier';
  }
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
    theme,
    toggleTheme,
  } = useConversationStore();

  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [renameId, setRenameId] = useState(null);
  const [renameTitle, setRenameTitle] = useState('');

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const filtered = useMemo(() => {
    return conversations.filter((c) => c && c.id != null)
      .filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [conversations, searchQuery]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((c) => {
      const key = dayGroupKey(c.updated_at);
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    const order = ['today', 'yesterday', 'previous7', 'previous'];
    return order.filter((k) => groups[k] && groups[k].length > 0).map((k) => ({
      key: k,
      label: groupLabel(k),
      conversations: groups[k],
    }));
  }, [filtered]);

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

  const handleToggleTheme = () => {
    toggleTheme();
  };

  return (
    <aside className={`shrink-0 border-r border-line flex flex-col transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-72'
    } bg-sidebar`}>
    <div className="flex items-center justify-between px-4 py-4 bg-sidebar shrink-0 z-10">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">
          J
        </div>
        {!collapsed && (
          <span className="font-serif font-semibold text-lg tracking-tight text-text">Jade</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!collapsed && (
          <button
            onClick={handleToggleTheme}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors text-muted hover:text-text"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-surface-hover rounded-lg transition-colors text-muted hover:text-text"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <X size={16} />}
        </button>
      </div>
    </div>

    {!collapsed && (
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* New chat */}
        <div className="px-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-text bg-surface border border-border hover:bg-surface-hover hover:border-accent transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="text-accent">+</span> New chat
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="px-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations"
              className="w-full bg-surface border border-border px-3 py-2 text-sm text-text placeholder-muted focus-ring rounded-lg transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-muted hover:text-text"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* History grouped by date */}
        <div className="px-2 space-y-3">
          {grouped.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted">
              {searchQuery ? 'No matching conversations' : 'No conversations yet'}
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.key} className="space-y-1.5">
                <h3 className="text-[10px] uppercase tracking-wider text-muted px-2 font-medium">
                  {group.label}
                </h3>
                <ul className="space-y-0.5">
                  {group.conversations.map((conversation) => {
                    const isActive = conversation.id === activeConversationId;
                    const isRenaming = renameId === conversation.id;
                    return (
                      <li key={conversation.id}>
                        {isRenaming ? (
                          <div className="flex items-center gap-2 bg-accent-muted p-1 rounded-lg">
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
                              className="flex-1 bg-transparent px-2 py-1.5 text-sm text-text outline-none"
                            />
                            <button
                              onClick={() => handleRenameSave(conversation.id)}
                              className="p-1.5 text-accent hover:bg-accent/20 rounded-md"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                setRenameTitle(conversation.title);
                                setRenameId(null);
                              }}
                              className="p-1.5 text-muted hover:bg-pink/10 hover:text-err rounded-md"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleSelect(conversation.id)}
                            className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors border border-transparent ${
                              isActive
                                ? 'bg-accent/10 border-accent/30 text-text'
                                : 'hover:bg-surface-hover text-text'
                            }`}
                            title={conversation.title}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="truncate text-sm font-medium">{conversation.title}</div>
                              <div className="text-[11px] text-muted truncate">{relativeTime(conversation.updated_at)}</div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(conversation.id);
                              }}
                              className="p-1.5 text-muted hover:bg-pink/10 hover:text-err rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    )}

    {/* Footer */}
    <div className="border-t border-line bg-sidebar p-3 shrink-0">
      <div className="flex items-center gap-3 px-2">
        <button
          onClick={() => {}}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            collapsed
              ? 'justify-center text-muted hover:bg-surface-hover'
              : 'text-text hover:bg-surface-hover'
          }`}
          title="Settings"
        >
          <SettingsIcon size={16} />
          {!collapsed && <span>Settings</span>}
        </button>
      </div>
    </div>
    </aside>
  );
}

export default Sidebar;
