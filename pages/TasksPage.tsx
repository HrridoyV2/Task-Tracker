
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
    case TaskStatus.ASSIGN: return 'bg-purple-100 text-purple-700 border-purple-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

const WEBHOOK_URL = 'https://n8n.mutho.tech/webhook/wecon-website';

const CONCERN_OPTIONS = [
  'Wecon', 
  'P2P Furniture', 
  'ENCL', 
  'Management', 
  'Health Care', 
  'EC', 
  'D. Studio'
];

const TasksPage: React.FC<TasksPageProps> = ({ user, db, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedAssigneeInForm, setSelectedAssigneeInForm] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const isManager = user.role === UserRole.MANAGER;

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

  const sendWebhook = async (taskData: any, action: 'create' | 'update' | 'delete') => {
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

  const handleDelete = async (e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    e.stopPropagation();
    
    const confirmed = window.confirm(`CONFIRM DELETION:\nTask ID: ${task.task_code}\nTitle: ${task.title}\n\nThis action cannot be undone.`);
    if (!confirmed) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);
      
      if (error) throw error;
      
      onUpdate();
      sendWebhook(task, 'delete');
    } catch (err: any) {
      console.error('Delete Error:', err);
      alert(`Delete Failed: ${err.message || 'Unknown database error'}`);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const taskData: any = {
        title: formData.get('title') as string,
        brief: formData.get('brief') as string,
        concern: formData.get('concern') as string,
        deadline: formData.get('deadline') as string,
        updated_at: new Date().toISOString()
      };

      if (editingTask) {
        const status = (formData.get('status') as TaskStatus) || editingTask.status;
        const endTime = status === TaskStatus.DONE ? new Date().toISOString() : editingTask.task_end_time;
        const elapsed = endTime ? calculateElapsedHours(editingTask.task_start_time, endTime) : editingTask.elapsed_hours;

        taskData.status = status;
        taskData.task_end_time = endTime;
        taskData.elapsed_hours = elapsed;
        taskData.output = (formData.get('output') as string) || editingTask.output || '';

        if (isManager) {
          taskData.assigned_to = formData.get('assigned_to') as string;
        }

        let { error, data } = await supabase.from('tasks').update(taskData).eq('id', editingTask.id).select().single();
        
        if (error && error.message?.includes('concern')) {
          const { concern, ...safeData } = taskData;
          const retry = await supabase.from('tasks').update(safeData).eq('id', editingTask.id).select().single();
          if (retry.error) throw retry.error;
          data = retry.data;
        } else if (error) {
          throw error;
        }
        
        if (data) sendWebhook(data, 'update');
      } else {
        const code = await generateTaskCode();
        let realAssignedBy = user.id;
        if (user.id === '00000000-0000-0000-0000-000000000000') {
          const firstRealManager = db.users.find(u => u.role === UserRole.MANAGER && u.id !== '00000000-0000-0000-0000-000000000000');
          if (!firstRealManager) throw new Error("Please create at least one Manager account first.");
          realAssignedBy = firstRealManager.id;
        }

        const insertData: any = {
          ...taskData,
          task_code: code,
          assigned_to: formData.get('assigned_to') as string,
          assigned_by: realAssignedBy,
          status: TaskStatus.ASSIGN,
          deliverable_count: 1, 
          output: '', 
          task_start_time: new Date().toISOString(),
          created_at: new Date().toISOString()
        };

        let { error, data } = await supabase.from('tasks').insert([insertData]).select().single();

        if (error && error.message?.includes('concern')) {
          const { concern, ...safeInsertData } = insertData;
          const retry = await supabase.from('tasks').insert([safeInsertData]).select().single();
          if (retry.error) throw retry.error;
          data = retry.data;
        } else if (error) {
          throw error;
        }

        if (data) sendWebhook(data, 'create');
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
            type="button"
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
                <th className="px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Concern</th>
                <th className="px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Task Name</th>
                {isManager ? (
                  <th className="px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Responsible</th>
                ) : (
                  <th className="px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Assigned By</th>
                )}
                <th className="px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Deadline</th>
                <th className="px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Output Proof</th>
                <th className="px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Hours</th>
                <th className="px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-[13px]">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-medium">No tasks found</td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const assignee = db.users.find(u => u.id === task.assigned_to);
                  const manager = db.users.find(u => u.id === task.assigned_by);
                  return (
                    <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-4">
                        <span className="font-black text-indigo-600 whitespace-nowrap">{task.task_code}</span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-black text-[9px] uppercase border border-slate-200">{task.concern || 'General'}</span>
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
                      <td className="px-3 py-4">
                        {task.output ? (
                          <a 
                            href={task.output.startsWith('http') ? task.output : `https://${task.output}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 font-bold hover:bg-indigo-600 hover:text-white transition-all text-[10px]"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                            Link
                          </a>
                        ) : (
                          <span className="text-slate-300 italic text-[10px]">Pending</span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className="font-black text-slate-900 whitespace-nowrap">{task.elapsed_hours}h</span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingTask(task); }} 
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                          </button>
                          {isManager && (
                            <button 
                              type="button"
                              onClick={(e) => handleDelete(e, task)} 
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          )}
                        </div>
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
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{editingTask ? 'Update Task Details' : 'New Project Initiation'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingTask(null); }} className="text-slate-400 hover:text-red-500 p-2 rounded-xl transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-1">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Concern</label>
                  <select 
                    name="concern" 
                    defaultValue={editingTask?.concern || 'Wecon'}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {CONCERN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Responsible Person</label>
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
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Task Title</label>
                  <input name="title" defaultValue={editingTask?.title} required readOnly={!isManager && !!editingTask} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold placeholder-slate-300" placeholder="e.g. Design Presentation" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Detailed Brief</label>
                  <textarea name="brief" rows={3} defaultValue={editingTask?.brief} required readOnly={!isManager && !!editingTask} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium resize-none placeholder-slate-300" placeholder="Explain the project objective..."></textarea>
                </div>

                {editingTask && (
                  <div className="md:col-span-1">
                    <label className="block text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">Status</label>
                    <select name="status" defaultValue={editingTask?.status} required className="w-full px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-900 font-black focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                      {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}

                <div className={editingTask ? "md:col-span-1" : "md:col-span-2"}>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Deadline Date</label>
                  <input type="date" name="deadline" defaultValue={editingTask?.deadline ? new Date(editingTask.deadline).toISOString().split('T')[0] : ''} required readOnly={!isManager && !!editingTask} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold" />
                </div>
                
                {editingTask && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Output Proof (URL or Notes)</label>
                    <input 
                      name="output" 
                      defaultValue={editingTask?.output} 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium placeholder-slate-300" 
                      placeholder="https://example.com/result or proof details..." 
                    />
                  </div>
                )}
              </div>

              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center uppercase tracking-widest text-sm"
                >
                  {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (editingTask ? 'Commit Updates' : 'Launch Task')}
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
