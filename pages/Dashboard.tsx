import React, { useMemo } from 'react';
import { User, UserRole, Task, Valuation, TaskStatus, FinancialSummary } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

interface DashboardProps {
  user: User;
  db: { users: User[]; tasks: Task[]; valuations: Valuation[] };
  onUpdate: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, db }) => {
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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Work Overview</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Lifecycle analytics for {user.name}.</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Assigned" value={stats.total} icon={<svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/></svg>} />
        <StatCard title="In Progress" value={stats[TaskStatus.IN_PROGRESS]} color="text-blue-600 dark:text-blue-400" icon={<svg className="w-6 h-6 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>} />
        <StatCard title="Review Required" value={stats[TaskStatus.UNDER_REVIEW]} color="text-amber-600 dark:text-amber-400" icon={<svg className="w-6 h-6 text-orange-500 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>} />
        <StatCard title="Finished Tasks" value={stats[TaskStatus.DONE]} color="text-emerald-600 dark:text-emerald-400" icon={<svg className="w-6 h-6 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="lg:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
        >
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              {isManager ? 'Value Snapshot' : 'Financials'}
            </h3>
            
            <div className="space-y-2">
              <FinancialRow label="Deliverables" value={financialSummary.totalDeliverables} />
              <FinancialRow label="Current Value" value={`৳${financialSummary.totalValue.toLocaleString()}`} />
              <FinancialRow label="Base Salary" value={`৳${financialSummary.salary.toLocaleString()}`} />
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-end justify-between mb-3">
              <span className="text-sm font-black text-slate-500 uppercase tracking-widest">Contribution</span>
              <span className={`text-3xl font-black ${financialSummary.contributionPercentage >= 100 ? 'text-emerald-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
                {financialSummary.contributionPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(financialSummary.contributionPercentage, 100)}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={`h-full rounded-full ${financialSummary.contributionPercentage >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              ></motion.div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800"
        >
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8">Pipeline Distribution</h3>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={document.documentElement.className === 'dark' ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 700, fontSize: 11 }} />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                    backgroundColor: document.documentElement.className === 'dark' ? '#1e293b' : '#ffffff',
                    color: document.documentElement.className === 'dark' ? '#ffffff' : '#000000'
                  }}
                />
                <Bar dataKey="count" radius={[12, 12, 0, 0]} barSize={44}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} />
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
  <div className="flex justify-between items-center py-4 border-b border-slate-50 dark:border-slate-800/50">
    <span className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">{label}</span>
    <span className="text-slate-900 dark:text-slate-100 font-black text-sm">{value}</span>
  </div>
);

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; color?: string }> = ({ title, value, icon, color = 'text-slate-900 dark:text-white' }) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="bg-white dark:bg-slate-900 p-6 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-5 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all"
  >
    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center shadow-inner">
      {icon}
    </div>
    <div>
      <p className="text-[10px] text-slate-500 dark:text-slate-500 font-black uppercase tracking-widest mb-1">{title}</p>
      <h4 className={`text-2xl font-black tracking-tight ${color}`}>{value || 0}</h4>
    </div>
  </motion.div>
);

export default Dashboard;