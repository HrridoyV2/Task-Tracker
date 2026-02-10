import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  user: User;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onLogout: () => void;
  onPageChange: (page: any) => void;
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, theme, onThemeToggle, onLogout, onPageChange, onMenuToggle }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-2.5 flex items-center justify-between sticky top-0 z-50 transition-colors">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-bold">
          <span className="hidden sm:inline uppercase tracking-widest">Main</span>
          <svg className="w-3 h-3 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-slate-900 dark:text-slate-100 font-black tracking-tight">Project Space</span>
        </div>
      </div>

      <div className="flex items-center gap-3 relative" ref={dropdownRef}>
        <div className="flex items-center gap-2">
           <button className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hidden sm:block">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
           </button>
           <button className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hidden sm:block">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
           </button>
        </div>

        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
        >
          <div className="relative">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-xs shadow-md shadow-indigo-500/20">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm"></div>
          </div>
          <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10, x: 0 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/5 overflow-hidden ring-1 ring-black/5"
            >
              {/* Profile Header */}
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-sm">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate leading-tight">{user.name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Online
                  </p>
                </div>
              </div>

              {/* Status Section */}
              <div className="px-3 pb-3">
                <button className="w-full text-left px-3 py-2 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-xs text-slate-500 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-center gap-2">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>
                   Set status
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-white/5 p-1.5">
                <MenuAction icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeWidth="2"/></svg>} label="Mute notifications" />
              </div>

              <div className="border-t border-slate-100 dark:border-white/5 p-1.5">
                <MenuAction onClick={() => { onPageChange('settings'); setIsDropdownOpen(false); }} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeWidth="2"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2"/></svg>} label="Settings" />
                <MenuAction onClick={onThemeToggle} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-3" strokeWidth="2"/></svg>} label="Themes" badge={theme.toUpperCase()} />
                <MenuAction icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" strokeWidth="2"/></svg>} label="Keyboard shortcuts" badge="⌘K" />
                <MenuAction icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2"/></svg>} label="Download App" isExternal />
                <MenuAction icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>} label="Help" />
              </div>

              {/* Personal Tools */}
              <div className="bg-slate-50 dark:bg-white/[0.02] p-3">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.15em] mb-2 px-1">Personal Tools</h4>
                <div className="space-y-0.5">
                  <ToolAction onClick={() => { onPageChange('tasks'); setIsDropdownOpen(false); }} icon={<svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeWidth="2"/></svg>} label="My Work" />
                  <ToolAction icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>} label="Track Time" />
                  <ToolAction icon={<svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" strokeWidth="2"/><path d="M18.364 5.636l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2"/></svg>} label="Notepad" />
                  <ToolAction icon={<svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" strokeWidth="2"/></svg>} label="Record a Clip" pin />
                </div>
              </div>

              {/* Logout */}
              <div className="p-1.5 border-t border-slate-100 dark:border-white/5">
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                  Log out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

const MenuAction: React.FC<{ icon: React.ReactNode; label: string; badge?: string; isExternal?: boolean; onClick?: () => void }> = ({ icon, label, badge, isExternal, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-all group"
  >
    <div className="flex items-center gap-3">
      <div className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{icon}</div>
      {label}
    </div>
    <div className="flex items-center gap-2">
       {badge && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-500 font-black">{badge}</span>}
       {isExternal && <svg className="w-3 h-3 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth="2.5"/></svg>}
    </div>
  </button>
);

const ToolAction: React.FC<{ icon: React.ReactNode; label: string; pin?: boolean; onClick?: () => void }> = ({ icon, label, pin, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-white dark:hover:bg-white/10 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-all shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-white/5 group"
  >
    <div className="flex items-center gap-2.5">
      {icon}
      {label}
    </div>
    {pin && <svg className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M16 9V4l1 1V2h-10v3l1-1v5l-2 2v3h5v7l1 1 1-1v-7h5v-3l-2-2z"/></svg>}
  </button>
);

export default Header;