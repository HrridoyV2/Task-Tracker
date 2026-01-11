import React, { useState, useMemo, useEffect } from 'react';
import { User, UserRole, Task, Valuation, TaskStatus } from '../types';
import { generateTaskCode, supabase } from '../db';
import { calculateElapsedHours } from '../utils/timeUtils';

interface TasksPageProps {
  user: User;
  db: { users: User[]; tasks: Task[]; valuations: Valuation[] };
  onUpdate: () => void;
}

const getStatusColor = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.DONE: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case TaskStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700 border-blue-200';
    case TaskStatus.UNDER_REVIEW: return 'bg-amber-100 text-amber-700 border-amber-200';
    case TaskStatus.CORRECTION: return 'bg-orange-100 text-orange-700 border-orange-200';
    case TaskStatus.FAILED: return 'bg-red-100 text-red-700 border-red-200';
    case TaskStatus.HOLD: return 'bg-slate-200 text-slate-700 border-slate-300';
    case TaskStatus.RESEARCH: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

const WEBHOOK_URL = 'https://n8n.mutho.tech/webhook-test/task-tracker';

const TasksPage: React.FC<TasksPageProps> = ({ user, db, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedAssigneeInForm, setSelectedAssigneeInForm] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const isManager = user.role === UserRole.MANAGER;

  // Potential assignees are all active users except the hardcoded super admin reference
  const potentialAssignees = useMemo(() => {
    return db.users.filter(u => u.is_active && u.id !== '00000000-0000-0000-0000-000000000000');
  }, [db.users]);

  useEffect(() => {
    if (editingTask) {
      setSelectedAssigneeInForm(editingTask.assigned_to);
    } else if (isModalOpen) {
      if (potentialAssignees.length > 0) {
        setSelectedAssigneeInForm(potentialAssignees[0].id);
      }
    }
  }, [editingTask, isModalOpen, potentialAssignees]);

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

  const sendWebhook = async (taskData: any, action: 'create' | 'update') => {
    try {
      const assigneeUser = db.users.find(u => u.id === taskData.assigned_to);
      const managerUser = db.users.find(u => u.id === taskData.assigned_by);
      const valuation = db.valuations.find(v => v.id === taskData.valuation_id);

      const payload = {
        action,
        triggered_by: {
          id: user.id,
          name: user.name,
          role: user.role
        },
        task: {
          ...taskData,
          assignee_name: assigneeUser?.name || 'Unknown',
          assignee_telegram: assigneeUser?.telegram_number || 'N/A',
          manager_name: managerUser?.name || user.name,
          manager_telegram: managerUser?.telegram_number || user.telegram_number || 'N/A',
          valuation_title: valuation?.title || 'N/A',
          valuation_amount: valuation?.charge_amount || 0
        },
        timestamp: new Date().toISOString()
      };

      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Webhook failed to send:', err);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const status = formData.get('status') as TaskStatus;
    
    try {
      if (editingTask) {
        const endTime = status === TaskStatus.DONE ? new Date().toISOString() : editingTask.task_end_time;
        const elapsed = endTime ? calculateElapsedHours(editingTask.task_start_time, endTime) : editingTask.elapsed_hours;

        const updateData: Partial<Task> = {
          title: formData.get('title') as string,
          brief: formData.get('brief') as string,
          status: status,
          deadline: formData.get('deadline') as string,
          valuation_id: formData.get('valuation_id') as string,
          deliverable_count: Number(formData.get('deliverable_count')),
          output: formData.get('output') as string,
          task_end_time: endTime,
          elapsed_hours: elapsed,
          updated_at: new Date().toISOString()
        };

        if (isManager) {
          updateData.assigned_to = formData.get('assigned_to') as string;
        }

        const { error, data } = await supabase.from('tasks').update(updateData).eq('id', editingTask.id).select().single();
        if (error) throw error;
        
        sendWebhook(data, 'update');
      } else {
        const code = await generateTaskCode();
        
        let realAssignedBy = user.id;
        if (user.id === '00000000-0000-0000-0000-000000000000') {
          const firstRealManager = db.users.find(u => u.role === UserRole.MANAGER && u.id !== '00000000-0000-0000-0000-000000000000');
          if (!firstRealManager) {
            throw new Error("Please create at least one Manager account first.");
          }
          realAssignedBy = firstRealManager.id;
        }

        const insertData: any = {
          task_code: code,
          title: formData.get('title') as string,
          brief: formData.get('brief') as string,
          assigned_to: formData.get('assigned_to') as string,
          assigned_by: realAssignedBy,
          status: status || TaskStatus.RESEARCH,
          deadline: formData.get('deadline') as string,
          valuation_id: formData.get('valuation_id') as string,
          deliverable_count: Number(formData.get('deliverable_count')) || 1,
          task_start_time: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error, data } = await supabase.from('tasks').insert([insertData]).select().single();
        if (error) throw error;

        sendWebhook(data, 'create');
      }
      setIsModalOpen(false);
      setEditingTask(null);
      onUpdate();
    } catch (err: any) {
      console.error('Task Save Error:', err);
      alert(`Error: ${err.message || 'Failed to save task'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Task Operations</h1>
          <p className="text-slate-500 font-medium">Coordinate workflow and track deliverable efficiency</p>
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
          {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {isManager && (
          <select className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-indigo-900 font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="ALL">All Responsible</option>
            {potentialAssignees.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left table-auto">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Task ID</th>
                <th className="px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Task Name</th>
                {isManager ? (
                  <th className="px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Responsible</th>
                ) : (
                  <th className="px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Assigned By</th>
                )}
                <th className="px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Brief</th>
                <th className="px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Deadline</th>
                <th className="px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Hours</th>
                <th className="px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-[13px]">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium">No tasks found</td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const assignee = db.users.find(u => u.id === task.assigned_to);
                  const manager = db.users.find(u => u.id === task.assigned_by);
                  return (
                    <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-3 py-4">
                        <span className="font-black text-indigo-600 whitespace-nowrap">{task.task_code}</span>
                      </td>
                      <td className="px-3 py-4">
                        <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 max-w-[120px]">{task.title}</span>
                      </td>
                      {isManager ? (
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 ${assignee?.role === UserRole.MANAGER ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                              {assignee?.name.charAt(0)}
                            </div>
                            <span className="font-semibold text-slate-700 truncate max-w-[80px]">{assignee?.name || 'Unassigned'}</span>
                          </div>
                        </td>
                      ) : (
                        <td className="px-3 py-4">
                           <span className="font-semibold text-slate-700 truncate max-w-[80px]">{manager?.name || 'Super Admin'}</span>
                        </td>
                      )}
                      <td className="px-3 py-4 relative group/brief">
                        <p className="text-slate-500 line-clamp-2 max-w-[180px] font-medium leading-tight cursor-help">{task.brief}</p>
                        <div className="absolute left-0 bottom-full mb-2 z-50 w-72 p-4 bg-slate-900 text-white text-[12px] rounded-xl shadow-2xl opacity-0 invisible group-hover/brief:opacity-100 group-hover/brief:visible transition-all">
                          <p className="font-black mb-1 text-indigo-400 uppercase tracking-widest border-b border-slate-700 pb-1">Work Brief</p>
                          <div className="max-h-48 overflow-y-auto">{task.brief}</div>
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className="font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                          {new Date(task.deadline).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${getStatusColor(task.status)} whitespace-nowrap`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className="font-black text-slate-900 whitespace-nowrap">{task.elapsed_hours}h</span>
                      </td>
                      <td className="px-3 py-4">
                        <button onClick={() => setEditingTask(task)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
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
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{editingTask ? 'Edit Task Lifecycle' : 'Initiate New Project'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingTask(null); }} className="text-slate-400 hover:text-red-500 p-2 rounded-xl transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Assign To (User/Manager)</label>
                  <select 
                    name="assigned_to" 
                    value={selectedAssigneeInForm} 
                    onChange={(e) => setSelectedAssigneeInForm(e.target.value)}
                    required 
                    disabled={!isManager && !!editingTask}
                    className="w-full px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-900 font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {potentialAssignees.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title of Project</label>
                  <input name="title" defaultValue={editingTask?.title} required readOnly={!isManager && !!editingTask} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold placeholder-slate-300" placeholder="e.g. Content Creation" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Work Brief</label>
                  <textarea name="brief" rows={2} defaultValue={editingTask?.brief} required readOnly={!isManager && !!editingTask} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium resize-none placeholder-slate-300" placeholder="Project details..."></textarea>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">Lifecycle Status</label>
                  <select name="status" defaultValue={editingTask?.status || TaskStatus.RESEARCH} required className="w-full px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-900 font-black focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                    {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Financial Valuation</label>
                  <select name="valuation_id" defaultValue={editingTask?.valuation_id} required disabled={!isManager && !!editingTask} className="w-full px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-900 font-bold focus:ring-2 focus:ring-indigo-500">
                    {filteredValuationsForForm.length === 0 ? (
                      <option disabled>No rates linked to this user</option>
                    ) : (
                      filteredValuationsForForm.map(v => (
                        <option key={v.id} value={v.id}>{v.title} — ৳{v.charge_amount}</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Deadline</label>
                  <input type="date" name="deadline" defaultValue={editingTask?.deadline ? new Date(editingTask.deadline).toISOString().split('T')[0] : ''} required readOnly={!isManager && !!editingTask} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold" />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Deliverables</label>
                  <input type="number" name="deliverable_count" min="1" defaultValue={editingTask?.deliverable_count || 1} required className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Output Proof / URL</label>
                  <textarea name="output" defaultValue={editingTask?.output} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium resize-none placeholder-slate-300" placeholder="Paste link or notes here..."></textarea>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center uppercase tracking-widest text-sm"
                >
                  {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (editingTask ? 'Update Task' : 'Commit Task')}
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