import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, UserRole, Task, Valuation, TaskStatus, TaskPriority } from '../types';
import { generateTaskCode, supabase } from '../db';
import { calculateElapsedHours } from '../utils/timeUtils';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Type } from '@google/genai';

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

const CONCERN_OPTIONS = ['Wecon', 'P2P Furniture', 'ENCL', 'Management', 'Health Care', 'EC', 'D. Studio'];

const TasksPage: React.FC<TasksPageProps> = ({ user, db, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedAssigneeInForm, setSelectedAssigneeInForm] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const titleRef = useRef<HTMLInputElement>(null);
  const briefRef = useRef<HTMLTextAreaElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);

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

  const handleAIWrite = async () => {
    const title = titleRef.current?.value;
    if (!title) {
      alert("Please enter a task title first so the AI knows what to write about.");
      return;
    }

    setIsAILoading(true);
    try {
      if (!(await window.aistudio.hasSelectedApiKey())) {
        await window.aistudio.openSelectKey();
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Generate a professional, detailed project briefing and relevant tags for a task titled: "${title}".` }] }],
        config: {
          systemInstruction: "You are an expert project manager. Provide clear, actionable task descriptions. Response must be JSON only.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              brief: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["brief", "tags"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      if (briefRef.current) briefRef.current.value = result.brief || '';
      if (tagsRef.current) tagsRef.current.value = (result.tags || []).join(', ');
      
    } catch (err: any) {
      console.error("AI Copilot Error:", err);
      if (err.message?.includes('Requested entity was not found')) {
        await window.aistudio.openSelectKey();
      } else {
        alert("AI System connection timeout. Please ensure you have an API key selected.");
      }
    } finally {
      setIsAILoading(false);
    }
  };

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
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Project Matrix</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Lifecycle monitoring & assignment control</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportExcel} className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Export
          </button>
          {isManager && (
            <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2 shadow-2xl shadow-indigo-500/30 transition-all active:scale-95">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
              Initiate Task
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-[28px] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[300px] relative">
          <svg className="w-5 h-5 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" placeholder="Search by Project ID, Title or Concern..." className="w-full pl-12 pr-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 outline-none transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 cursor-pointer outline-none shadow-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">Status: All</option>
            {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {isManager && (
            <select className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 cursor-pointer outline-none shadow-sm" value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}>
              <option value="ALL">Team: Everyone</option>
              {potentialAssignees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed">
            <thead className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="w-[120px] px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">P-Code</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Project Specifications</th>
                <th className="w-[150px] px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Lifecycle</th>
                <th className="w-[140px] px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Responsible</th>
                <th className="w-[150px] px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Threshold</th>
                <th className="w-[100px] px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTasks.map((task, idx) => {
                const assignee = db.users.find(u => u.id === task.assigned_to);
                return (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                    key={task.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all cursor-pointer group"
                    onClick={() => setEditingTask(task)}
                  >
                    <td className="px-8 py-7 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">{task.task_code}</span>
                        <div className="flex items-center gap-1">
                          {getPriorityIcon(task.priority)}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-7 align-top">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{task.concern}</span>
                          <span className="text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors leading-tight">{task.title}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-[350px] font-medium leading-relaxed">{task.brief}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {task.tags?.map(tag => <span key={tag} className="px-2 py-0.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/20 text-[9px] font-black text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/30">#{tag}</span>)}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-7 align-top text-center">
                      <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusStyles(task.status)} shadow-sm`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-8 py-7 align-top">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center text-xs font-black border border-indigo-200 dark:border-indigo-800/50">
                          {assignee?.name.charAt(0)}
                        </div>
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase truncate w-full text-center">{assignee?.name.split(' ')[0] || 'Pending'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-7 align-top">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-black text-rose-500 dark:text-rose-400 tabular-nums">
                          {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                           <div className="bg-rose-400 h-full w-2/3"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-7 align-top text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <button onClick={(e) => { e.stopPropagation(); setEditingTask(task); }} className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all shadow-md"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsModalOpen(false); setEditingTask(null); }} className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }} className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[48px] shadow-3xl overflow-hidden flex flex-col md:flex-row max-h-[92vh] border border-white/10">
              <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-800/50 p-10 border-r border-slate-100 dark:border-slate-800/80 space-y-10 overflow-y-auto custom-scrollbar">
                <MetadataSection label="Pipeline Status">
                  <select name="status" form="task-form" defaultValue={editingTask?.status || TaskStatus.ASSIGN} className="w-full px-5 py-4 rounded-2xl border-none bg-white dark:bg-slate-800 font-black text-slate-700 dark:text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                    {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </MetadataSection>
                <MetadataSection label="Responsible Lead">
                  <select name="assigned_to" form="task-form" defaultValue={editingTask?.assigned_to || selectedAssigneeInForm} disabled={!isManager} className="w-full px-5 py-4 rounded-2xl border-none bg-white dark:bg-slate-800 font-black text-slate-700 dark:text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40 appearance-none">
                    {potentialAssignees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </MetadataSection>
                <div className="grid grid-cols-2 gap-5">
                  <MetadataSection label="Priority">
                    <select name="priority" form="task-form" defaultValue={editingTask?.priority || TaskPriority.NORMAL} className="w-full px-5 py-4 rounded-2xl border-none bg-white dark:bg-slate-800 font-black text-slate-700 dark:text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                      {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </MetadataSection>
                  <MetadataSection label="Concern">
                    <select name="concern" form="task-form" defaultValue={editingTask?.concern || 'Wecon'} className="w-full px-5 py-4 rounded-2xl border-none bg-white dark:bg-slate-800 font-black text-slate-700 dark:text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                      {CONCERN_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </MetadataSection>
                </div>
                <MetadataSection label="Deadline Threshold">
                  <input type="date" name="deadline" form="task-form" defaultValue={editingTask?.deadline ? new Date(editingTask.deadline).toISOString().split('T')[0] : ''} className="w-full px-5 py-4 rounded-2xl border-none bg-white dark:bg-slate-800 font-black text-slate-700 dark:text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </MetadataSection>
                <MetadataSection label="Categorization">
                  <input ref={tagsRef} type="text" name="tags" form="task-form" defaultValue={editingTask?.tags?.join(', ')} className="w-full px-5 py-4 rounded-2xl border-none bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Separate with commas" />
                </MetadataSection>
              </div>

              <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
                <div className="px-12 py-8 flex justify-between items-center border-b border-slate-50 dark:border-slate-800">
                  <div className="flex items-center gap-5">
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 tracking-[0.3em] uppercase">{editingTask?.task_code || 'Project Inception'}</span>
                       <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{editingTask ? 'Specification Review' : 'Task Protocol'}</h2>
                    </div>
                  </div>
                  <button onClick={() => { setIsModalOpen(false); setEditingTask(null); }} className="text-slate-400 hover:text-rose-500 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
                <form id="task-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
                  <div className="space-y-4 relative group">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] ml-2">Project Headline</label>
                      <button 
                        type="button"
                        onClick={handleAIWrite}
                        disabled={isAILoading}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all rounded-xl uppercase tracking-widest disabled:opacity-50"
                      >
                        {isAILoading ? (
                          <div className="w-3.5 h-3.5 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        )}
                        Generate Protocol
                      </button>
                    </div>
                    <input ref={titleRef} name="title" required defaultValue={editingTask?.title} className="w-full text-4xl font-black text-slate-900 dark:text-white border-none bg-slate-50/50 dark:bg-slate-800/40 p-8 rounded-[32px] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder-slate-200 dark:placeholder-slate-800 tracking-tighter" placeholder="Summarize objective..." />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] ml-2">Operational Briefing</label>
                    <textarea ref={briefRef} name="brief" rows={10} required defaultValue={editingTask?.brief} className="w-full p-8 rounded-[32px] bg-slate-50/50 dark:bg-slate-800/40 border-none focus:ring-4 focus:ring-indigo-500/10 font-medium text-slate-700 dark:text-slate-300 outline-none resize-none placeholder-slate-200 dark:placeholder-slate-800 text-lg leading-relaxed" placeholder="Detailed execution instructions..."></textarea>
                  </div>
                  {editingTask && (
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] ml-2">Verification Proof (Output URL)</label>
                      <input name="output" defaultValue={editingTask?.output} className="w-full p-8 rounded-[32px] bg-emerald-50/20 dark:bg-emerald-900/10 border-none focus:ring-4 focus:ring-emerald-500/10 font-black text-emerald-700 dark:text-emerald-400 outline-none tracking-tight" placeholder="https://deliverable.url" />
                    </div>
                  )}
                </form>
                <div className="px-12 py-10 border-t border-slate-50 dark:border-slate-800/50 flex gap-6 bg-slate-50/20 dark:bg-slate-800/10">
                  <button type="submit" form="task-form" disabled={isSaving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-[32px] shadow-2xl shadow-indigo-500/20 transition-all active:scale-[0.99] disabled:opacity-50 uppercase tracking-[0.3em] text-[11px]">
                    {isSaving ? 'Synchronizing...' : (editingTask ? 'Commit Protocol Updates' : 'Authorize Project Initiation')}
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
    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-4 ml-1">{label}</h3>
    {children}
  </div>
);

export default TasksPage;