
import React from 'react';
import { User } from '../types';

interface HeaderProps {
  user: User;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
      <h2 className="text-lg font-semibold text-slate-800 hidden md:block">
        Employee Management Portal
      </h2>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-bold text-slate-900">{user.name}</p>
          <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">{user.role}</p>
        </div>
        <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">
          {user.name.charAt(0)}
        </div>
      </div>
    </header>
  );
};

export default Header;
