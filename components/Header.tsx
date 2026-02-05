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
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3 flex items-center justify-between shadow-sm sticky top-0 z-30 transition-colors">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Toggle Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-sm font-medium">
          <span className="hidden sm:inline">Workspace</span>
          <svg className="w-4 h-4 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-slate-900 dark:text-slate-100 font-bold capitalize">Operations</span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 relative" ref={dropdownRef}>
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-3 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all group"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight group-hover:text-indigo-600 transition-colors">{user.name}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-500 font-black tracking-wide uppercase">{user.role}</p>
          </div>
          <div className="relative">
            <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-sm border-2 border-white dark:border-slate-900 shadow-md">
              {user.name.charAt(0)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
          </div>
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              {/* Profile Header */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-lg">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="text-base font-black text-slate-900 dark:text-white">{user.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Online
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-2 border-t border-slate-100 dark:border-slate-700">
                <button onClick={() => { onPageChange('settings'); setIsDropdownOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  Settings
                </button>
                <button onClick={onThemeToggle} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {theme === 'light' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                      )}
                    </svg>
                    Themes
                  </div>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded uppercase">{theme}</span>
                </button>
              </div>

              {/* Personal Tools */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/30">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Personal Tools</h4>
                <div className="space-y-1">
                  <button onClick={() => { onPageChange('tasks'); setIsDropdownOpen(false); }} className="w-full flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 transition-all shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>
                    My Work
                  </button>
                  <button className="w-full flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 transition-all shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>
                    Track Time
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-2 border-t border-slate-100 dark:border-slate-700">
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-sm font-bold text-rose-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
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

export default Header;