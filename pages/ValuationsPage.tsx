
import React, { useState } from 'react';
import { User, Valuation, UserRole } from '../types';
import { saveDB } from '../db';

interface ValuationsPageProps {
  user: User;
  db: { users: User[]; tasks: any[]; valuations: Valuation[] };
  onUpdate: () => void;
}

const ValuationsPage: React.FC<ValuationsPageProps> = ({ user, db, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingValuation, setEditingValuation] = useState<Valuation | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newValuation: Valuation = {
      id: editingValuation?.id || crypto.randomUUID(),
      title: formData.get('title') as string,
      unit_type: formData.get('unit_type') as string,
      charge_amount: Number(formData.get('charge_amount')),
      created_by: user.id,
      assignee_id: formData.get('assignee_id') as string,
      is_active: true,
      created_at: editingValuation?.created_at || new Date().toISOString(),
    };

    let updatedValuations;
    if (editingValuation) {
      updatedValuations = db.valuations.map(v => v.id === editingValuation.id ? newValuation : v);
    } else {
      updatedValuations = [...db.valuations, newValuation];
    }

    saveDB({ valuations: updatedValuations });
    setIsModalOpen(false);
    setEditingValuation(null);
    onUpdate();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure? Tasks using this valuation will lose their pricing data.')) return;
    saveDB({ valuations: db.valuations.filter(v => v.id !== id) });
    onUpdate();
  };

  const assignees = db.users.filter(u => u.role === UserRole.ASSIGNEE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Valuation Matrix</h1>
          <p className="text-slate-500">Define deliverable types per specific employee</p>
        </div>
        <button 
          onClick={() => { setEditingValuation(null); setIsModalOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          Add Valuation Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {db.valuations.map((v) => {
          const assignee = db.users.find(u => u.id === v.assignee_id);
          return (
            <div key={v.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:border-indigo-100 transition-all group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold mb-2">
                      ৳
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full inline-block">
                      For: {assignee?.name || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingValuation(v)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button onClick={() => handleDelete(v.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-1 leading-tight">{v.title}</h4>
                <p className="text-sm text-slate-500 font-medium mb-4">Unit: {v.unit_type}</p>
              </div>
              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Charge Amount</span>
                <span className="text-xl font-black text-slate-900">৳ {v.charge_amount}</span>
              </div>
            </div>
          );
        })}
      </div>

      {(isModalOpen || editingValuation) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Valuation Details</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingValuation(null); }} className="p-2 text-slate-400 hover:bg-slate-200 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Relates to Assignee</label>
                <select name="assignee_id" defaultValue={editingValuation?.assignee_id} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 font-medium">
                  {assignees.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.employee_id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Category Title</label>
                <input name="title" defaultValue={editingValuation?.title} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 font-medium" placeholder="e.g. Website Content Updating" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Unit Type</label>
                <input name="unit_type" defaultValue={editingValuation?.unit_type} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 font-medium" placeholder="e.g. Per Post, Per Day" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Charge Amount (TK)</label>
                <input type="number" name="charge_amount" defaultValue={editingValuation?.charge_amount} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 font-medium" placeholder="Amount in Taka" />
              </div>

              <div className="pt-6 flex gap-3">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all">
                  {editingValuation ? 'Update Category' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValuationsPage;
