import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { ChatView } from '../components/chat/ChatView';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OllamaStatusBar } from '../components/OllamaStatusBar';

export function ChatPage() {
  return (
    <ErrorBoundary>
      <div className="flex-1 flex flex-col min-w-0 bg-bg">
        <div className="flex-1 overflow-y-auto px-6 pb-8 scroll-smooth">
          <ChatView />
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default ChatPage;
