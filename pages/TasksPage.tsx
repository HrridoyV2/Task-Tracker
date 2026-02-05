import React, { useState, useMemo, useEffect } from 'react';
import { User, UserRole, Task, Valuation, TaskStatus, TaskPriority } from '../types';
import { generateTaskCode, supabase } from '../db';
import { calculateElapsedHours } from '../utils/timeUtils';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';

interface TasksPageProps {
  user: User;
  db: { users: User[]; tasks: Task[]; valuations: Valuation[] };
  onUpdate: () => void;
}

const getStatusStyles = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.DONE: return 'bg-emerald-500 text-white';
    case TaskStatus.IN_PROGRESS: return 'bg-blue-500 text-white';
    case TaskStatus.UNDER_REVIEW: return 'bg-amber-400 text-slate-900';
    case TaskStatus.CORRECTION: return 'bg-orange-500 text-white';
    case TaskStatus.FAILED: return 'bg-rose-500 text-white';
    case TaskStatus.HOLD: return 'bg-slate-400 text-white';
    case TaskStatus.RESEARCH: return 'bg-indigo-500 text-white';
    case TaskStatus.ASSIGN: return 'bg-violet-500 text-white';
    default: return 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  }
};

const getPriorityIcon = (priority?: TaskPriority) => {
  switch (priority) {
    case TaskPriority.URGENT: return <svg className="w-4 h-4 text-rose-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12.45 3.17c-.24-.22-.55-.33-.86-.31-.31.02-.6.17-.79.43L4.82 12c-.22.3-.28.69-.15 1.04.13.35.43.61.81.69l4.52.92-2.3 6.18c-.14.37-.09.79.15 1.1.23.32.61.5 1.01.5.07 0 .15-.01.23-.03.39-.08.7-.35.83-.72l4.8-13.33c.13-.37.06-.79-.18-1.1s-.63-.49-1.03-.49l-4.22-.01 3.56-4.9c.19-.27.24-.62.15-.95s-.35-.61-.69-.73z"/></svg>;
    case TaskPriority.HIGH: return <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>;
    case TaskPriority.NORMAL: return <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>;
    case TaskPriority.LOW: return <svg className="w-4 h-4 text-slate-300 dark:text-slate-600" fill="currentColor" viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>;
    default: return null;
  }
};

const WEBHOOK_URL = 'https://n8n.mutho.tech/webhook/wecon-website';
const CONCERN_OPTIONS = ['Wecon', 'P2P Furniture', 'ENCL', 'Management', 'Health Care', 'EC', 'D. Studio'];

const TasksPage: React.FC<TasksPageProps> = ({ user, db, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedAssigneeInForm, setSelectedAssigneeInForm] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const isManager = user.role === UserRole.MANAGER;
  const potentialAssignees = useMemo(() => db.users.filter(u => u.is_active && u.id !== '00000000-0000-0000-0000-000000000000'), [db.users]);

  useEffect(() => {
    if (editingTask) setSelectedAssigneeInForm(editingTask.assigned_to);
    else if (isModalOpen && potentialAssignees.length > 0) setSelectedAssigneeInForm(potentialAssignees[0].id);
  }, [editingTask, isModalOpen, potentialAssignees]);

  const filteredTasks = useMemo(() => {
    let result = [...db.tasks];
    if (!isManager) result = result.filter(t => t.assigned_to === user.id);
    else if (assigneeFilter !== 'ALL') result = result.filter(t => t.assigned_to === assigneeFilter);
    if (statusFilter !== 'ALL') result = result.filter(t => t.status === statusFilter);
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(lowerSearch) || t.task_code.toLowerCase().includes(lowerSearch));
    }
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [db.tasks, isManager, user.id, statusFilter, assigneeFilter, searchTerm]);

  const handleExportExcel = () => {
    const dataToExport = filteredTasks.map(task => {
      const assignee = db.users.find(u => u.id === task.assigned_to);
      return {
        'Task ID': task.task_code, 'Concern': task.concern || 'General', 'Task Name': task.title,
        'Priority': task.priority || 'Normal', 'Responsible': assignee?.name || 'Unassigned',
        'Deadline': new Date(task.deadline).toLocaleDateString(), 'Status': task.status,
        'Output Proof': task.output || 'Pending', 'Elapsed Hours': `${task.elapsed_hours}h`,
        'Created At': new Date(task.created_at).toLocaleDateString()
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
    let name = isManager && assigneeFilter === 'ALL' ? 'All_Employees' : (db.users.find(u => u.id === (isManager ? assigneeFilter : user.id))?.name.replace(/\s+/g, '_') || 'Employee');
    XLSX.writeFile(workbook, `${name}_Tasks_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const taskData: any = {
      title: formData.get('title') as string, brief: formData.get('brief') as string,
      concern: formData.get('concern') as string, deadline: formData.get('deadline') as string,
      priority: formData.get('priority') as TaskPriority,
      tags: (formData.get('tags') as string)?.split(',').map(t => t.trim()).filter(t => t),
      updated_at: new Date().toISOString()
    };
    try {
      if (editingTask) {
        taskData.status = (formData.get('status') as TaskStatus) || editingTask.status;
        const endTime = taskData.status === TaskStatus.DONE ? new Date().toISOString() : editingTask.task_end_time;
        taskData.task_end_time = endTime;
        taskData.elapsed_hours = endTime ? calculateElapsedHours(editingTask.task_start_time, endTime) : editingTask.elapsed_hours;
        taskData.output = (formData.get('output') as string) || '';
        if (isManager) taskData.assigned_to = formData.get('assigned_to') as string;
        await supabase.from('tasks').update(taskData).eq('id', editingTask.id);
      } else {
        const code = await generateTaskCode();
        await supabase.from('tasks').insert([{
          ...taskData, task_code: code, assigned_to: formData.get('assigned_to') as string,
          assigned_by: user.id === '00000000-0000-0000-0000-000000000000' ? db.users.find(u => u.role === UserRole.MANAGER)?.id : user.id,
          status: TaskStatus.ASSIGN, deliverable_count: 1, output: '', task_start_time: new Date().toISOString(), created_at: new Date().toISOString()
        }]);
      }
      setIsModalOpen(false); setEditingTask(null); onUpdate();
    } catch (err: any) { alert(`Error: ${err.message}`); }
    finally { setIsSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Project Board</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Efficient deliverable management</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportExcel} className="hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Export
          </button>
          {isManager && (
            <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
              Add Task
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" placeholder="Filter by ID, Title..." className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-slate-600 dark:text-slate-300 font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer outline-none min-w-[140px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="ALL">All Status</option>
          {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {isManager && (
          <select className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-slate-600 dark:text-slate-300 font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer outline-none min-w-[140px]" value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}>
            <option value="ALL">Everyone</option>
            {potentialAssignees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed">
            <thead className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="w-[110px] px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Task Details</th>
                <th className="w-[140px] px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="w-[120px] px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Priority</th>
                <th className="w-[180px] px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assignee</th>
                <th className="w-[140px] px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Deadline</th>
                <th className="w-[100px] px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTasks.map((task, idx) => {
                const assignee = db.users.find(u => u.id === task.assigned_to);
                return (
                  <motion.tr 
                    initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}
                    key={task.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all cursor-pointer group"
                    onClick={() => setEditingTask(task)}
                  >
                    <td className="px-6 py-5 align-top">
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{task.task_code}</span>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{task.concern}</span>
                          <span className="text-slate-200 dark:text-slate-700">/</span>
                          <span className="text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">{task.title}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-[320px] font-medium">{task.brief}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {task.tags?.map(tag => <span key={tag} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-500 dark:text-slate-400">#{tag}</span>)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusStyles(task.status)} shadow-sm`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 align-top text-center">
                      <div className="flex justify-center items-center gap-1.5 text-xs font-black text-slate-600 dark:text-slate-400">
                        {getPriorityIcon(task.priority)}
                        <span className="uppercase tracking-tighter">{task.priority || 'Normal'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center text-[11px] font-black border border-indigo-200 dark:border-indigo-800/50 shadow-sm">
                          {assignee?.name.charAt(0)}
                        </div>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 truncate">{assignee?.name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <span className="text-xs font-black text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-1 rounded-lg border border-rose-100 dark:border-rose-900/30">
                        {new Date(task.deadline).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-5 align-top text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setEditingTask(task); }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                        {isManager && (
                          <button onClick={async (e) => { 
                            e.stopPropagation();
                            if(confirm('Archive this task?')) {
                              await supabase.from('tasks').delete().eq('id', task.id);
                              onUpdate();
                            }
                          }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {(isModalOpen || editingTask) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsModalOpen(false); setEditingTask(null); }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 10 }} className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] border border-slate-200 dark:border-slate-800">
              {/* Sidebar Settings Panel */}
              <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-800/40 p-8 border-r border-slate-100 dark:border-slate-800 space-y-8 overflow-y-auto custom-scrollbar">
                <MetadataSection label="Status">
                  <select name="status" form="task-form" defaultValue={editingTask?.status || TaskStatus.ASSIGN} className="w-full px-4 py-2.5 rounded-xl border-none bg-white dark:bg-slate-800 font-black text-slate-700 dark:text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500">
                    {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </MetadataSection>
                <MetadataSection label="Responsible">
                  <select name="assigned_to" form="task-form" defaultValue={editingTask?.assigned_to || selectedAssigneeInForm} disabled={!isManager} className="w-full px-4 py-2.5 rounded-xl border-none bg-white dark:bg-slate-800 font-black text-slate-700 dark:text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40">
                    {potentialAssignees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </MetadataSection>
                <div className="grid grid-cols-2 gap-4">
                  <MetadataSection label="Priority">
                    <select name="priority" form="task-form" defaultValue={editingTask?.priority || TaskPriority.NORMAL} className="w-full px-4 py-2.5 rounded-xl border-none bg-white dark:bg-slate-800 font-black text-slate-700 dark:text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500">
                      {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </MetadataSection>
                  <MetadataSection label="Concern">
                    <select name="concern" form="task-form" defaultValue={editingTask?.concern || 'Wecon'} className="w-full px-4 py-2.5 rounded-xl border-none bg-white dark:bg-slate-800 font-black text-slate-700 dark:text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500">
                      {CONCERN_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </MetadataSection>
                </div>
                <MetadataSection label="Target Date">
                  <input type="date" name="deadline" form="task-form" defaultValue={editingTask?.deadline ? new Date(editingTask.deadline).toISOString().split('T')[0] : ''} className="w-full px-4 py-2.5 rounded-xl border-none bg-white dark:bg-slate-800 font-black text-slate-700 dark:text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </MetadataSection>
                <MetadataSection label="Categorization (Tags)">
                  <input type="text" name="tags" form="task-form" defaultValue={editingTask?.tags?.join(', ')} className="w-full px-4 py-2.5 rounded-xl border-none bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Urgent, v2, Design" />
                </MetadataSection>
              </div>

              {/* Main Task Editor */}
              <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
                <div className="px-10 py-6 flex justify-between items-center border-b border-slate-50 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg tracking-widest">{editingTask?.task_code || 'NEW-TASK'}</span>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingTask ? 'Task Specification' : 'Project Initiation'}</h2>
                  </div>
                  <button onClick={() => { setIsModalOpen(false); setEditingTask(null); }} className="text-slate-400 hover:text-rose-500 p-2 rounded-xl transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
                <form id="task-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Headline</label>
                    <input name="title" required defaultValue={editingTask?.title} className="w-full text-3xl font-black text-slate-900 dark:text-white border-none bg-slate-50/50 dark:bg-slate-800/30 p-5 rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-200 dark:placeholder-slate-800" placeholder="Define the objective..." />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Briefing</label>
                    <textarea name="brief" rows={8} required defaultValue={editingTask?.brief} className="w-full p-5 rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 border-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 dark:text-slate-300 outline-none resize-none placeholder-slate-200 dark:placeholder-slate-800" placeholder="Instructions for execution..."></textarea>
                  </div>
                  {editingTask && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Deliverable Proof</label>
                      <input name="output" defaultValue={editingTask?.output} className="w-full p-5 rounded-3xl bg-indigo-50/20 dark:bg-indigo-900/10 border-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700 dark:text-indigo-400 outline-none" placeholder="URL or Proof Location" />
                    </div>
                  )}
                </form>
                <div className="px-10 py-8 border-t border-slate-50 dark:border-slate-800 flex gap-4">
                  <button type="submit" form="task-form" disabled={isSaving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.99] disabled:opacity-50 uppercase tracking-widest text-xs">
                    {isSaving ? 'Processing...' : (editingTask ? 'Commit Updates' : 'Launch Project')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const MetadataSection: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">{label}</h3>
    {children}
  </div>
);

export default TasksPage;