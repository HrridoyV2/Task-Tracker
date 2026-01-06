
import React, { useState, useMemo, useEffect } from 'react';
import { User, UserRole, Task, Valuation, TaskStatus } from '../types';
import { saveDB, generateTaskCode } from '../db';
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
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const isManager = user.role === UserRole.MANAGER;

  // Sync selected assignee when editing
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

  const handleCreateTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTask: Task = {
      id: crypto.randomUUID(),
      task_code: generateTaskCode(db.tasks),
      title: formData.get('title') as string,
      brief: formData.get('brief') as string,
      assigned_by: user.id,
      assigned_to: formData.get('assigned_to') as string,
      status: TaskStatus.PENDING,
      deadline: formData.get('deadline') as string,
      task_start_time: (formData.get('task_start_time') as string) || new Date().toISOString(),
      task_end_time: null,
      elapsed_hours: 0,
      output: '',
      valuation_id: formData.get('valuation_id') as string,
      deliverable_count: Number(formData.get('deliverable_count')) || 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveDB({ tasks: [...db.tasks, newTask] });
    setIsModalOpen(false);
    onUpdate();
  };

  const handleUpdateTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTask) return;
    const formData = new FormData(e.currentTarget);
    const updatedStatus = formData.get('status') as TaskStatus;
    const currentEnd = (updatedStatus === TaskStatus.COMPLETED) ? new Date().toISOString() : null;
    
    const updatedTasks = db.tasks.map(t => {
      if (t.id === editingTask.id) {
        const elapsed = currentEnd ? calculateElapsedHours(t.task_start_time, currentEnd) : t.elapsed_hours;
        return {
          ...t,
          status: updatedStatus,
          output: formData.get('output') as string || t.output,
          deliverable_count: Number(formData.get('deliverable_count')) || t.deliverable_count,
          task_end_time: currentEnd || t.task_end_time,
          elapsed_hours: elapsed,
          updated_at: new Date().toISOString(),
          ...(isManager ? {
            title: formData.get('title') as string,
            brief: formData.get('brief') as string,
            assigned_to: formData.get('assigned_to') as string,
            valuation_id: formData.get('valuation_id') as string,
            deadline: formData.get('deadline') as string,
          } : {})
        };
      }
      return t;
    });
    saveDB({ tasks: updatedTasks });
    setEditingTask(null);
    onUpdate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Task Management</h1>
          <p className="text-slate-500">Track, manage and analyze workflow progress</p>
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
          placeholder="Search tasks..." 
          className="w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select className="bg-slate-50 rounded-xl px-4 py-3 text-slate-900 font-medium" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value={TaskStatus.PENDING}>Pending</option>
          <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
          <option value={TaskStatus.COMPLETED}>Completed</option>
        </select>
        {isManager && (
          <select className="bg-slate-50 rounded-xl px-4 py-3 text-slate-900 font-medium" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
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
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Task Title</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assignee</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Elapsed Hrs</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTasks.map((task) => {
                const assignee = db.users.find(u => u.id === task.assigned_to);
                return (
                  <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-indigo-600 text-sm">{task.task_code}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{task.title}</span>
                        <span className="text-xs text-slate-400">{task.deadline}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{assignee?.name || 'Unassigned'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        task.status === TaskStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' :
                        task.status === TaskStatus.IN_PROGRESS ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">{task.elapsed_hours}h</td>
                    <td className="px-6 py-4">
                      <button onClick={() => setEditingTask(task)} className="p-2 text-slate-400 hover:text-indigo-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(isModalOpen || editingTask) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900">{editingTask ? 'Edit Task' : 'Create Task'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingTask(null); }} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={editingTask ? handleUpdateTask : handleCreateTask} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Assign To</label>
                  <select 
                    name="assigned_to" 
                    value={selectedAssigneeInForm} 
                    onChange={(e) => setSelectedAssigneeInForm(e.target.value)}
                    required 
                    disabled={!isManager && !!editingTask}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    {db.users.filter(u => u.role === UserRole.ASSIGNEE).map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Title of Work</label>
                  <input name="title" defaultValue={editingTask?.title} required readOnly={!isManager && !!editingTask} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Brief of Work</label>
                  <textarea name="brief" rows={2} defaultValue={editingTask?.brief} required readOnly={!isManager && !!editingTask} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium resize-none"></textarea>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Assignee's Valuation Category</label>
                  <select name="valuation_id" defaultValue={editingTask?.valuation_id} required disabled={!isManager && !!editingTask} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium">
                    {filteredValuationsForForm.length === 0 ? (
                      <option disabled>No valuations configured for this employee</option>
                    ) : (
                      filteredValuationsForForm.map(v => (
                        <option key={v.id} value={v.id}>{v.title} (৳{v.charge_amount})</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Deadline</label>
                  <input type="date" name="deadline" defaultValue={editingTask?.deadline} required readOnly={!isManager && !!editingTask} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Deliverable Count</label>
                  <input type="number" name="deliverable_count" min="1" defaultValue={editingTask?.deliverable_count || 1} required className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Task Status</label>
                  <select name="status" defaultValue={editingTask?.status || TaskStatus.PENDING} required className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-indigo-50 text-indigo-700 font-bold">
                    <option value={TaskStatus.PENDING}>Pending</option>
                    <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                    <option value={TaskStatus.COMPLETED}>Completed</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Output Notes</label>
                  <textarea name="output" defaultValue={editingTask?.output} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium resize-none" placeholder="Provide link or completion details..."></textarea>
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all">
                  {editingTask ? 'Save Changes' : 'Create Task'}
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
