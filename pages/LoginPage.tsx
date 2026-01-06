
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { DEFAULT_ADMIN, supabase } from '../db';

interface LoginPageProps {
  onLogin: (user: User) => void;
  users: User[];
  onUpdate: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, users, onUpdate }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');

    // 1. Check Hardcoded Admin Fallback
    if (employeeId === DEFAULT_ADMIN.employee_id && password === DEFAULT_ADMIN.password) {
      const adminUser: User = {
        id: '00000000-0000-0000-0000-000000000000',
        employee_id: 'admin',
        name: 'Super Admin',
        role: UserRole.MANAGER,
        password_hash: '',
        salary: 0,
        is_active: true,
        created_at: new Date().toISOString()
      };
      onLogin(adminUser);
      setIsLoggingIn(false);
      return;
    }

    // 2. Check Database
    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('password_hash', password)
        .eq('is_active', true)
        .single();

      if (data) {
        onLogin(data);
      } else {
        setError('Invalid credentials or account inactive');
      }
    } catch (err) {
      setError('Connection failed. Please check credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 border border-slate-100">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-indigo-200">
            T
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Portal Access</h1>
          <p className="text-slate-500 mt-2 font-medium">Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Employee ID</label>
            <input
              type="text"
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-all placeholder-slate-300 font-medium"
              placeholder="Your unique ID"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-all placeholder-slate-300 font-medium"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center border border-red-100 animate-pulse">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-indigo-100 transform transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Unlock Workspace'
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-100 text-center text-slate-400 text-[10px] uppercase tracking-widest font-bold">
          <p>Powered by Supabase v2.0</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
