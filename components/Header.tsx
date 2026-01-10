
import React from 'react';
import { User } from '../types';

interface HeaderProps {
  user: User;
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onMenuToggle }) => {
  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button 
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Toggle Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        
        <h2 className="text-lg font-semibold text-slate-800 hidden sm:block">
          Employee Management Portal
        </h2>
        <h2 className="text-lg font-semibold text-slate-800 sm:hidden">
          Portal
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-bold text-slate-900 leading-tight">{user.name}</p>
          <p className="text-[10px] text-slate-500 font-bold tracking-wide uppercase">{user.role}</p>
        </div>
        <div className="w-9 h-9 md:w-10 md:h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm md:text-base border border-indigo-200">
          {user.name.charAt(0)}
        </div>
      </div>
    </header>
  );
};

export default Header;
