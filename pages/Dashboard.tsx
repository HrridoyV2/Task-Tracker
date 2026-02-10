
import React, { useMemo, useState } from 'react';
import { User, UserRole, Task, Valuation, TaskStatus, FinancialSummary } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';

interface DashboardProps {
  user: User;
  db: { users: User[]; tasks: Task[]; valuations: Valuation[] };
  onUpdate: () => void;
}

// Removed the explicit Window declaration as it conflicts with the environment-provided AIStudio type.

const Dashboard: React.FC<DashboardProps> = ({ user, db }) => {
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const isManager = user.role === UserRole.MANAGER;
  
  const filteredTasks = useMemo(() => {
    return isManager ? db.tasks : db.tasks.filter(t => t.assigned_to === user.id);
  }, [db.tasks, isManager, user.id]);

  const stats = useMemo(() => {
    const s: Record<string, number> = {};
    Object.values(TaskStatus).forEach(status => {
      s[status] = filteredTasks.filter(t => t.status === status).length;
    });
    return {
      ...s,
      total: filteredTasks.length
    };
  }, [filteredTasks]);

  const handleGetAiInsights = async () => {
    setIsAiLoading(true);
    try {
      // Ensure key selection is checked before API calls
      if (!(await window.aistudio.hasSelectedApiKey())) {
        await window.aistudio.openSelectKey();
      }

      // Initialize a fresh GoogleGenAI instance to ensure the latest API key is used
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `As a high-level project manager, analyze these team metrics:
      - Total Tasks: ${stats.total}
      - Done: ${stats[TaskStatus.DONE]}
      - In Progress: ${stats[TaskStatus.IN_PROGRESS]}
      - Review: ${stats[TaskStatus.UNDER_REVIEW]}
      - Failed: ${stats[TaskStatus.FAILED]}
      - Research: ${stats[TaskStatus.RESEARCH]}
      
      Identify the biggest bottleneck and provide 3 strategic recommendations for the team's efficiency. Keep it under 100 words.`;

      // Use a simple string as contents for the text generation task
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      // Extract the response text directly from the response.text property
      setAiSummary(response.text || 'Insight generation completed with no text.');
    } catch (err: any) {
      console.error('AI Insight Error:', err);
      // Handle the "Requested entity was not found" error by prompting for key re-selection
      if (err.message?.includes('Requested entity was not found')) {
        setAiSummary('Configuration required. Please select a valid Gemini API Key from your project dashboard.');
        await window.aistudio.openSelectKey();
      } else {
        setAiSummary('System connection delay. Please ensure you have selected an API key in the workspace settings.');
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const financialSummary = useMemo((): FinancialSummary => {
    const completed = filteredTasks.filter(t => t.status === TaskStatus.DONE);
    let totalValue = 0;
    completed.forEach(task => {
      const val = db.valuations.find(v => v.id === task.valuation_id);
      if (val) {
        totalValue += task.deliverable_count * val.charge_amount;
      }
    });

    return {
      totalDeliverables: completed.reduce((acc, t) => acc + t.deliverable_count, 0),
      totalValue,
      salary: user.salary,
      contributionPercentage: user.salary > 0 ? (totalValue / user.salary) * 100 : 0
    };
  }, [filteredTasks, db.valuations, user.salary]);

  const chartData = useMemo(() => {
    return [
      { name: 'Research', count: stats[TaskStatus.RESEARCH] || 0, color: '#6366f1' },
      { name: 'Active', count: (stats[TaskStatus.IN_PROGRESS] || 0) + (stats[TaskStatus.FIRST_ATTEMPT] || 0), color: '#3b82f6' },
      { name: 'Review', count: (stats[TaskStatus.UNDER_REVIEW] || 0) + (stats[TaskStatus.CORRECTION] || 0), color: '#f59e0b' },
      { name: 'Done', count: stats[TaskStatus.DONE] || 0, color: '#10b981' },
      { name: 'Failed', count: stats[TaskStatus.FAILED] || 0, color: '#ef4444' },
      { name: 'On Hold', count: stats[TaskStatus.HOLD] || 0, color: '#94a3b8' },
    ];
  }, [stats]);

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Real-time team performance & ROI analysis.</p>
        </div>
        <button 
          onClick={handleGetAiInsights}
          disabled={isAiLoading}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/30 transition-all disabled:opacity-50 active:scale-95"
        >
          {isAiLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
          Analyze Performance
        </button>
      </motion.div>

      <AnimatePresence>
        {aiSummary && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 p-8 rounded-[32px] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
               <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">Team Performance Insights</h4>
              </div>
              <button onClick={() => setAiSummary('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed font-semibold italic">
              {aiSummary}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Throughput" value={stats.total} icon={<svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>} />
        <StatCard title="In Flight" value={stats[TaskStatus.IN_PROGRESS]} color="text-blue-600 dark:text-blue-400" icon={<svg className="w-6 h-6 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
        <StatCard title="Bottlenecks" value={(stats[TaskStatus.UNDER_REVIEW] || 0) + (stats[TaskStatus.CORRECTION] || 0)} color="text-amber-600 dark:text-amber-400" icon={<svg className="w-6 h-6 text-orange-500 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>} />
        <StatCard title="Success Rate" value={`${Math.round((stats[TaskStatus.DONE] / (stats.total || 1)) * 100)}%`} color="text-emerald-600 dark:text-emerald-400" icon={<svg className="w-6 h-6 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="lg:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
        >
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              Financial ROI
            </h3>
            
            <div className="space-y-2">
              <FinancialRow label="Deliverables Completed" value={financialSummary.totalDeliverables} />
              <FinancialRow label="Market Value" value={`৳${financialSummary.totalValue.toLocaleString()}`} />
              <FinancialRow label="Salary Investment" value={`৳${financialSummary.salary.toLocaleString()}`} />
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-end justify-between mb-3">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Team Efficiency Score</span>
              <span className={`text-3xl font-black ${financialSummary.contributionPercentage >= 100 ? 'text-emerald-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
                {financialSummary.contributionPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(financialSummary.contributionPercentage, 100)}%` }}
                transition={{ duration: 1.5, ease: "circOut" }}
                className={`h-full rounded-full ${financialSummary.contributionPercentage >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-indigo-600 to-indigo-400'}`}
              ></motion.div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-800"
        >
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Lifecycle Pipeline</h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase">Success</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase">Growth</span>
              </div>
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={document.documentElement.className === 'dark' ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 800, fontSize: 10 }} />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    backgroundColor: document.documentElement.className === 'dark' ? '#0f172a' : '#ffffff',
                    padding: '16px'
                  }}
                />
                <Bar dataKey="count" radius={[16, 16, 0, 0]} barSize={50}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const FinancialRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex justify-between items-center py-5 border-b border-slate-50 dark:border-slate-800/50 group">
    <span className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-[0.15em] group-hover:text-indigo-500 transition-colors">{label}</span>
    <span className="text-slate-900 dark:text-slate-100 font-black text-base">{value}</span>
  </div>
);

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; color?: string }> = ({ title, value, icon, color = 'text-slate-900 dark:text-white' }) => (
  <motion.div 
    whileHover={{ scale: 1.02, y: -5 }}
    className="bg-white dark:bg-slate-900 p-7 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-6 hover:border-indigo-200 dark:hover:border-indigo-900/30 transition-all"
  >
    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/40 rounded-[22px] flex items-center justify-center shadow-inner">
      {icon}
    </div>
    <div>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mb-1.5">{title}</p>
      <h4 className={`text-3xl font-black tracking-tighter ${color}`}>{value || 0}</h4>
    </div>
  </motion.div>
);

export default Dashboard;
