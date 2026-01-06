
import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../db';

interface SettingsPageProps {
  user: User;
  users: User[];
  onUpdate: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, users, onUpdate }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fix: changed function to be async to handle supabase call and replaced saveDB with supabase
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Handle hardcoded admin case separately
    if (user.employee_id === 'admin') {
      setMessage({ type: 'error', text: 'Password cannot be changed for the hardcoded admin account.' });
      return;
    }

    if (currentPassword !== user.password_hash) {
      setMessage({ type: 'error', text: 'Current password is incorrect' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    // Fix: Using supabase instead of non-existent saveDB to update user data
    try {
      const { error } = await supabase
        .from('users')
        .update({ password_hash: newPassword })
        .eq('id', user.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onUpdate();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update password. Please check your connection.' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-slate-500">Manage your profile and security preferences</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">Security & Privacy</h3>
          <p className="text-sm text-slate-500">Update your account credentials</p>
        </div>
        
        <form onSubmit={handlePasswordChange} className="p-8 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Current Password</label>
              <input 
                type="password"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 font-medium"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">New Password</label>
                <input 
                  type="password"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 font-medium"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm New Password</label>
                <input 
                  type="password"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 font-medium"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          {message.text && (
            <div className={`p-4 rounded-xl text-sm font-bold text-center ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
              {message.text}
            </div>
          )}

          <div className="pt-4">
            <button 
              type="submit"
              className="w-full md:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>

      <div className="bg-slate-900 text-white rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-slate-200">
        <div>
          <h4 className="text-xl font-bold mb-2">Profile Information</h4>
          <p className="text-slate-400 font-medium">Employee ID: <span className="text-white">{user.employee_id}</span></p>
          <p className="text-slate-400 font-medium">Account Type: <span className="text-white">{user.role}</span></p>
          <p className="text-slate-400 font-medium">Monthly Salary: <span className="text-white">৳ {user.salary.toLocaleString()}</span></p>
        </div>
        <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center text-3xl font-black text-indigo-400 border-2 border-indigo-500/30">
          {user.name.charAt(0)}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
