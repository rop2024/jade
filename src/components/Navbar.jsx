import React from 'react';
import { NavLink } from 'react-router-dom';

export function Navbar() {
  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-[#16213e]'
    }`;

  return (
    <nav className="bg-[#16213e] border-b border-gray-700">
      <div className="mx-auto max-w-7xl px-4 flex items-center h-14 gap-2">
        <span className="font-bold text-lg mr-4">StarterApp</span>
        <NavLink to="/" className={linkClass}>Home</NavLink>
        <NavLink to="/chat" className={linkClass}>Chat</NavLink>
        <NavLink to="/settings" className={linkClass}>Settings</NavLink>
      </div>
    </nav>
  );
}
