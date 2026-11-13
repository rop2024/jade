import React from 'react';
import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';
import { ChatPage } from './pages/ChatPage';
import { OllamaStatusBar } from './components/OllamaStatusBar';

function App() {
  return (
    <HashRouter>
      <div className="h-screen flex bg-bg text-text overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 bg-bg overflow-hidden">
          <OllamaStatusBar className="border-b border-line bg-surface shrink-0" />
          <div className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/chat" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;
