
import React, { useState, useMemo, useEffect } from 'react';
import { User, UserRole, Task, Valuation, TaskStatus } from '../types';
import { generateTaskCode, supabase } from '../db';
import { calculateElapsedHours } from '../utils/timeUtils';

interface TasksPageProps {
  user: User;
  db: { users: User[]; tasks: Task[]; valuations: Valuation[] };
  onUpdate: () => void;
}

const TasksPage: React.FC<TasksPageProps> = ({ user, db, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedAssigneeInForm, setSelectedAssigneeInForm] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const isManager = user.role === UserRole.MANAGER;

  useEffect(() => {
    if (editingTask) {
      setSelectedAssigneeInForm(editingTask.assigned_to);
    } else if (isModalOpen) {
      const firstAssignee = db.users.find(u => u.role === UserRole.ASSIGNEE);
      if (firstAssignee) setSelectedAssigneeInForm(firstAssignee.id);
    }
  }, [editingTask, isModalOpen, db.users]);

  const filteredTasks = useMemo(() => {
    let result = [...db.tasks];
    if (!isManager) {
      result = result.filter(t => t.assigned_to === user.id);
    } else if (assigneeFilter !== 'ALL') {
      result = result.filter(t => t.assigned_to === assigneeFilter);
    }

    if (statusFilter !== 'ALL') result = result.filter(t => t.status === statusFilter);
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(lowerSearch) || t.task_code.toLowerCase().includes(lowerSearch));
    }
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [db.tasks, isManager, user.id, statusFilter, assigneeFilter, searchTerm]);

  const filteredValuationsForForm = useMemo(() => {
    return db.valuations.filter(v => v.assignee_id === selectedAssigneeInForm);
  }, [db.valuations, selectedAssigneeInForm]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const status = formData.get('status') as TaskStatus;
    
    try {
      if (editingTask) {
        const endTime = status === TaskStatus.COMPLETED ? new Date().toISOString() : editingTask.task_end_time;
        const elapsed = endTime ? calculateElapsedHours(editingTask.task_start_time, endTime) : editingTask.elapsed_hours;

        const updateData = {
          title: formData.get('title') as string,
          brief: formData.get('brief') as string,
          assigned_to: formData.get('assigned_to') as string,
          status: status,
          deadline: formData.get('deadline') as string,
          valuation_id: formData.get('valuation_id') as string,
          deliverable_count: Number(formData.get('deliverable_count')),
          output: formData.get('output') as string,
          task_end_time: endTime,
          elapsed_hours: elapsed,
          updated_at: new Date().toISOString()
        };
        await supabase.from('tasks').update(updateData).eq('id', editingTask.id);
      } else {
        const code = await generateTaskCode();
        const insertData = {
          task_code: code,
          title: formData.get('title') as string,
          brief: formData.get('brief') as string,
          assigned_by: user.id,
          assigned_to: formData.get('assigned_to') as string,
          status: TaskStatus.PENDING,
          deadline: formData.get('deadline') as string,
          valuation_id: formData.get('valuation_id') as string,
          deliverable_count: Number(formData.get('deliverable_count')) || 1,
          task_start_time: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await supabase.from('tasks').insert([insertData]);
      }
      setIsModalOpen(false);
      setEditingTask(null);
      onUpdate();
    } catch (err) {
      alert('Error saving task');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Task Operations</h1>
          <p className="text-slate-500">Coordinate workflow and track deliverable efficiency</p>
        </div>
        {isManager && (
          <button 
            onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
            Create Task
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input 
          type="text" 
          placeholder="Search by ID or Title..." 
          className="w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 border border-slate-100"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-indigo-900 font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value={TaskStatus.PENDING}>Pending</option>
          <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
          <option value={TaskStatus.COMPLETED}>Completed</option>
        </select>
        {isManager && (
          <select className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-indigo-900 font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="ALL">All Assignees</option>
            {db.users.filter(u => u.role === UserRole.ASSIGNEE).map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Project Title</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Responsible</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Efficiency</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">No tasks found in current view</td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const assignee = db.users.find(u => u.id === task.assigned_to);
                  return (
                    <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-bold text-indigo-600 text-sm">{task.task_code}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{task.title}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{new Date(task.deadline).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-black">
                            {assignee?.name.charAt(0)}
                          </div>
                          <span className="text-sm font-semibold text-slate-700">{assignee?.name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-black text-slate-900">{task.elapsed_hours}h</span>
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                            task.status === TaskStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' :
                            task.status === TaskStatus.IN_PROGRESS ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => setEditingTask(task)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(isModalOpen || editingTask) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{editingTask ? 'Edit Active Task' : 'Initiate New Work'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingTask(null); }} className="text-slate-400 hover:text-red-500 p-2 rounded-xl transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Assignee</label>
                  <select 
                    name="assigned_to" 
                    value={selectedAssigneeInForm} 
                    onChange={(e) => setSelectedAssigneeInForm(e.target.value)}
                    required 
                    disabled={!isManager && !!editingTask}
                    className="w-full px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-900 font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {db.users.filter(u => u.role === UserRole.ASSIGNEE).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.employee_id})</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title of Project</label>
                  <input name="title" defaultValue={editingTask?.title} required readOnly={!isManager && !!editingTask} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold placeholder-slate-300" placeholder="e.g. Social Media Campaign Q1" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Work Brief</label>
                  <textarea name="brief" rows={2} defaultValue={editingTask?.brief} required readOnly={!isManager && !!editingTask} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium resize-none placeholder-slate-300" placeholder="Summary of deliverables..."></textarea>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">Financial Valuation Basis (Filtered by Assignee)</label>
                  <select name="valuation_id" defaultValue={editingTask?.valuation_id} required disabled={!isManager && !!editingTask} className="w-full px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-900 font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                    {filteredValuationsForForm.length === 0 ? (
                      <option disabled>No valuations linked to this employee</option>
                    ) : (
                      filteredValuationsForForm.map(v => (
                        <option key={v.id} value={v.id}>{v.title} — ৳{v.charge_amount}</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Submission Deadline</label>
                  <input type="date" name="deadline" defaultValue={editingTask?.deadline ? new Date(editingTask.deadline).toISOString().split('T')[0] : ''} required readOnly={!isManager && !!editingTask} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold" />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Deliverable Units</label>
                  <input type="number" name="deliverable_count" min="1" defaultValue={editingTask?.deliverable_count || 1} required className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">Current Lifecycle Status</label>
                  <select name="status" defaultValue={editingTask?.status || TaskStatus.PENDING} required className="w-full px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-900 font-black focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                    <option value={TaskStatus.PENDING}>Pending Launch</option>
                    <option value={TaskStatus.IN_PROGRESS}>Work In Progress</option>
                    <option value={TaskStatus.COMPLETED}>Mark as Completed</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Deliverable URL / Output Proof</label>
                  <textarea name="output" defaultValue={editingTask?.output} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium resize-none placeholder-slate-300" placeholder="https://... or completion summary"></textarea>
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center uppercase tracking-widest text-sm"
                >
                  {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (editingTask ? 'Save Updates' : 'Launch Task')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;
