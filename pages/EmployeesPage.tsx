
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { saveDB } from '../db';

interface EmployeesPageProps {
  user: User;
  db: { users: User[]; tasks: any[]; valuations: any[] };
  onUpdate: () => void;
}

const EmployeesPage: React.FC<EmployeesPageProps> = ({ db, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const userData: User = {
      id: editingUser?.id || crypto.randomUUID(),
      employee_id: formData.get('employee_id') as string,
      name: formData.get('name') as string,
      role: UserRole.ASSIGNEE,
      password_hash: formData.get('password') as string || editingUser?.password_hash || 'password',
      salary: Number(formData.get('salary')),
      is_active: formData.get('is_active') === 'true',
      created_at: editingUser?.created_at || new Date().toISOString(),
    };

    let updatedUsers;
    if (editingUser) {
      updatedUsers = db.users.map(u => u.id === editingUser.id ? userData : u);
    } else {
      updatedUsers = [...db.users, userData];
    }

    saveDB({ users: updatedUsers });
    setIsModalOpen(false);
    setEditingUser(null);
    onUpdate();
  };

  const assignees = db.users.filter(u => u.role === UserRole.ASSIGNEE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Management</h1>
          <p className="text-slate-500">Create and manage assignee accounts</p>
        </div>
        <button 
          onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          Add New Employee
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee ID</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Salary</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {assignees.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-indigo-600">{emp.employee_id}</td>
                <td className="px-6 py-4 font-medium text-slate-900">{emp.name}</td>
                <td className="px-6 py-4 font-bold text-slate-700">৳ {emp.salary.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${emp.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {emp.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">{editingUser ? 'Edit Employee' : 'Create Employee'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingUser(null); }} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Employee ID</label>
                <input name="employee_id" defaultValue={editingUser?.employee_id} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                <input name="name" defaultValue={editingUser?.name} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password {editingUser && '(Leave blank to keep current)'}</label>
                <input name="password" type="password" required={!editingUser} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Monthly Salary (৳)</label>
                <input name="salary" type="number" defaultValue={editingUser?.salary} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                <select name="is_active" defaultValue={editingUser?.is_active?.toString() || 'true'} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all">
                {editingUser ? 'Save Changes' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
