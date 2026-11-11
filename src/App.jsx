import React from 'react';
import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';
import { ChatPage } from './pages/ChatPage';

function App() {
 return (
 <HashRouter>
 <div className="min-h-screen bg-[#080A0F] text-text">
 <Navbar />
 <main className="mx-auto max-w-7xl px-4 py-8">
 <Routes>
 <Route path="/" element={<HomePage />} />
 <Route path="/chat" element={<ChatPage />} />
 <Route path="/settings" element={<SettingsPage />} />
 <Route path="*" element={<Navigate to="/chat" replace />} />
 </Routes>
 </main>
 </div>
 </HashRouter>
 );
}

export default App;

