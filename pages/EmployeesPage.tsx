import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../db';
import { motion, AnimatePresence } from 'framer-motion';

interface EmployeesPageProps {
  user: User;
  db: { users: User[]; tasks: any[]; valuations: any[] };
  onUpdate: () => void;
}

const EmployeesPage: React.FC<EmployeesPageProps> = ({ db, onUpdate, user }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const togglePassword = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const userData: any = {
      employee_id: formData.get('employee_id') as string,
      name: formData.get('name') as string,
      role: formData.get('role') as string,
      telegram_number: formData.get('telegram_number') as string || null,
      salary: Number(formData.get('salary')),
      is_active: formData.get('is_active') === 'true',
    };

    const password = formData.get('password') as string;
    if (password) userData.password_hash = password;
    else if (!editingUser) userData.password_hash = 'password';

    try {
      if (editingUser) await supabase.from('users').update(userData).eq('id', editingUser.id);
      else await supabase.from('users').insert([{ ...userData, created_at: new Date().toISOString() }]);
      setIsModalOpen(false);
      setEditingUser(null);
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Error saving employee');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Team Directory</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Personnel & Access Metadata</p>
        </div>
        <button onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-black flex items-center gap-2 shadow-xl transition-all active:scale-95">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          Register Talent
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Entity</th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Access Key</th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Role</th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Compensation</th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {db.users.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-indigo-600 text-white rounded-[14px] flex items-center justify-center font-black text-base shadow-lg shadow-indigo-600/10">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <span className="block font-black text-slate-900 dark:text-slate-100 text-sm leading-tight">{emp.name}</span>
                        <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">{emp.employee_id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3 cursor-pointer group/pass" onClick={() => togglePassword(emp.id)}>
                      <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl font-mono text-[11px] text-slate-600 dark:text-slate-400 min-w-[130px] flex justify-between items-center transition-all group-hover/pass:bg-slate-200 dark:group-hover/pass:bg-slate-700">
                        {visiblePasswords[emp.id] ? emp.password_hash : '••••••••••••'}
                        <svg className="w-3.5 h-3.5 text-slate-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${emp.role === UserRole.MANAGER ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center font-black text-slate-700 dark:text-slate-300 text-sm">৳ {emp.salary.toLocaleString()}</td>
                  <td className="px-8 py-6 text-right">
                    <button onClick={() => setEditingUser(emp)} className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {(isModalOpen || editingUser) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsModalOpen(false); setEditingUser(null); }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingUser ? 'Account Modulation' : 'Personnel Inception'}</h3>
                <button onClick={() => { setIsModalOpen(false); setEditingUser(null); }} className="text-slate-400 hover:text-rose-500 p-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
              </div>
              <form onSubmit={handleSubmit} className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-5">
                  <FormSection label="Role">
                    <select name="role" defaultValue={editingUser?.role || UserRole.ASSIGNEE} className="w-full px-4 py-3.5 rounded-2xl border-none bg-slate-50 dark:bg-slate-800 font-black text-slate-700 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value={UserRole.ASSIGNEE}>Assignee</option>
                      <option value={UserRole.MANAGER}>Manager</option>
                    </select>
                  </FormSection>
                  <FormSection label="Status">
                    <select name="is_active" defaultValue={editingUser?.is_active?.toString() || 'true'} className="w-full px-4 py-3.5 rounded-2xl border-none bg-slate-50 dark:bg-slate-800 font-black text-slate-700 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="true">Operational</option>
                      <option value="false">Deactivated</option>
                    </select>
                  </FormSection>
                </div>
                <FormSection label="Employee Identifier">
                  <input name="employee_id" defaultValue={editingUser?.employee_id} required className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 font-black text-slate-900 dark:text-white outline-none" placeholder="EMP-XXX" />
                </FormSection>
                <FormSection label="Legal Name">
                  <input name="name" defaultValue={editingUser?.name} required className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 font-black text-slate-900 dark:text-white outline-none" placeholder="Hridoy Chandra Das" />
                </FormSection>
                <FormSection label="Access Credential">
                  <input name="password" defaultValue={editingUser?.password_hash} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 font-black text-slate-900 dark:text-white outline-none" placeholder="Set security key" />
                </FormSection>
                <FormSection label="Monthly Stipend (৳)">
                  <input name="salary" type="number" defaultValue={editingUser?.salary} required className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 font-black text-slate-900 dark:text-white outline-none" />
                </FormSection>
                <button type="submit" disabled={isSaving} className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 text-white font-black py-5 rounded-[20px] shadow-2xl shadow-indigo-500/10 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest text-xs">
                  {isSaving ? 'Synchronizing...' : (editingUser ? 'Update Profile' : 'Authorize Identity')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const FormSection: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block ml-1">{label}</label>
    {children}
  </div>
);

export default EmployeesPage;