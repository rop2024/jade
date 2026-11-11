import React from 'react';
import { NavLink } from 'react-router-dom';

export function Navbar() {
 const linkClass = ({ isActive }) =>
 `px-3 py-2 text-sm font-technical transition-colors border-b-2 border-transparent ${
 isActive
 ? 'border-yellow text-yellow'
 : 'border-transparent text-muted hover:border-line hover:text-text'
 }`;

 return (
 <nav className="bg-surface-1 border-b border-line">
 <div className="mx-auto max-w-7xl px-4 flex items-center h-14 gap-2">
 <span className="font-display font-bold text-lg tracking-wider flex items-center gap-2">
 <span className="text-cyan">JADE</span>
 </span>
 <NavLink to="/" className={linkClass}>Home</NavLink>
 <NavLink to="/chat" className={linkClass}>Chat</NavLink>
 <NavLink to="/settings" className={linkClass}>Settings</NavLink>
 </div>
 </nav>
 );
}

