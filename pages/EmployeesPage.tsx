import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../db';

interface EmployeesPageProps {
  user: User;
  db: { users: User[]; tasks: any[]; valuations: any[] };
  onUpdate: () => void;
}

const EmployeesPage: React.FC<EmployeesPageProps> = ({ db, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    const telegramValue = formData.get('telegram_number') as string;
    
    // Create the full object with telegram
    const userData: any = {
      employee_id: formData.get('employee_id') as string,
      name: formData.get('name') as string,
      role: formData.get('role') as string,
      telegram_number: telegramValue || null,
      salary: Number(formData.get('salary')),
      is_active: formData.get('is_active') === 'true',
    };

    const password = formData.get('password') as string;
    if (password) {
      userData.password_hash = password;
    } else if (!editingUser) {
      userData.password_hash = 'password';
    }

    try {
      // 1. Try to save with telegram_number
      let { error } = editingUser 
        ? await supabase.from('users').update(userData).eq('id', editingUser.id)
        : await supabase.from('users').insert([{ ...userData, created_at: new Date().toISOString() }]);

      // 2. If it fails specifically because of the missing column (PGRST204)
      if (error && (error.code === 'PGRST204' || error.message?.includes('telegram_number'))) {
        console.warn("Retrying save without telegram_number due to missing column in DB.");
        
        // Remove the problematic field
        const { telegram_number, ...safeUserData } = userData;
        
        const retryResult = editingUser
          ? await supabase.from('users').update(safeUserData).eq('id', editingUser.id)
          : await supabase.from('users').insert([{ ...safeUserData, created_at: new Date().toISOString() }]);
        
        if (retryResult.error) throw retryResult.error;
        
        alert("Success, but Telegram was NOT saved. \n\nReason: The database column 'telegram_number' is missing or not synced yet. \n\nAction: Go to Supabase SQL Editor and run: \nALTER TABLE users ADD COLUMN telegram_number TEXT;");
      } else if (error) {
        throw error;
      }

      setIsModalOpen(false);
      setEditingUser(null);
      onUpdate();
    } catch (err: any) {
      console.error('Employee Save Error:', err);
      alert(err.message || 'Failed to save employee record');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workspace Directory</h1>
          <p className="text-slate-500">Manage all Manager and Assignee profiles</p>
        </div>
        <button 
          onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          New Account
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Emp ID</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Salary</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {db.users.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-indigo-600">{emp.employee_id}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900">{emp.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <svg className="w-3 h-3 text-indigo-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.52-1.4.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.45-.42-1.39-.89.03-.24.36-.49.99-.74 3.89-1.69 6.48-2.8 7.77-3.32 3.7-1.48 4.47-1.74 4.97-1.75.11 0 .36.03.52.16.14.11.18.26.19.38.01.07.01.2-.01.35z"/></svg>
                      {emp.telegram_number || 'No Telegram'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${emp.role === UserRole.MANAGER ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {emp.role}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-700">৳ {emp.salary.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${emp.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {emp.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => setEditingUser(emp)} className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(isModalOpen || editingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">{editingUser ? 'Update Profile' : 'New Account Credentials'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingUser(null); }} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Access Role</label>
                  <select name="role" defaultValue={editingUser?.role || UserRole.ASSIGNEE} required className="w-full px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-900 font-bold focus:ring-2 focus:ring-indigo-500">
                    <option value={UserRole.ASSIGNEE}>Assignee</option>
                    <option value={UserRole.MANAGER}>Manager</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Account Status</label>
                  <select name="is_active" defaultValue={editingUser?.is_active?.toString() || 'true'} className="w-full px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-900 font-bold focus:ring-2 focus:ring-indigo-500">
                    <option value="true">Authorized</option>
                    <option value="false">Deactivated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Employee Identifier</label>
                <input name="employee_id" defaultValue={editingUser?.employee_id} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 font-medium" placeholder="MGR-00X or EMP-00X" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Display Name</label>
                  <input name="name" defaultValue={editingUser?.name} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 font-medium" placeholder="Full Name" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Telegram Number</label>
                  <input name="telegram_number" type="tel" pattern="[0-9]*" defaultValue={editingUser?.telegram_number} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 font-medium" placeholder="8801XXXXXXXXX" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Access Token (Password)</label>
                <input name="password" type="password" required={!editingUser} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 font-medium" placeholder={editingUser ? "Leave blank to keep same" : "Set secure password"} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Monthly Remuneration (৳)</label>
                <input name="salary" type="number" defaultValue={editingUser?.salary} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 font-medium" />
              </div>
              
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
              >
                {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (editingUser ? 'Update Records' : 'Commit Account')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;