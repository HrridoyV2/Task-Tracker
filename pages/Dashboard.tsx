
import React, { useMemo } from 'react';
import { User, UserRole, Task, Valuation, TaskStatus, FinancialSummary } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
    return {
      total: filteredTasks.length,
      pending: filteredTasks.filter(t => t.status === TaskStatus.PENDING).length,
      inProgress: filteredTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      completed: filteredTasks.filter(t => t.status === TaskStatus.COMPLETED).length,
    };
  }, [filteredTasks]);

  const financialSummary = useMemo((): FinancialSummary => {
    const completed = filteredTasks.filter(t => t.status === TaskStatus.COMPLETED);
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

  const chartData = [
    { name: 'Pending', count: stats.pending, color: '#94a3b8' },
    { name: 'Active', count: stats.inProgress, color: '#6366f1' },
    { name: 'Done', count: stats.completed, color: '#10b981' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500">Welcome back, {user.name}. Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Tasks" value={stats.total} icon={<svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/></svg>} />
        <StatCard title="Pending" value={stats.pending} color="text-slate-500" icon={<svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
        <StatCard title="In Progress" value={stats.inProgress} color="text-indigo-600" icon={<svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>} />
        <StatCard title="Completed" value={stats.completed} color="text-emerald-600" icon={<svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Financial Contribution Section */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {isManager ? 'Company Value Snapshot' : 'My Financial Value'}
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Completed Deliverables</span>
                <span className="text-slate-900 font-bold">{financialSummary.totalDeliverables}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Value Provided</span>
                <span className="text-slate-900 font-bold">৳ {financialSummary.totalValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-50">
                <span className="text-slate-500 font-medium">{isManager ? 'Avg. Salary' : 'Withdrawing Salary'}</span>
                <span className="text-slate-900 font-bold">৳ {financialSummary.salary.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-end justify-between mb-2">
              <span className="text-sm font-bold text-slate-700">Contribution Rate</span>
              <span className={`text-2xl font-black ${financialSummary.contributionPercentage >= 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                {financialSummary.contributionPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-1000 ${financialSummary.contributionPercentage >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.min(financialSummary.contributionPercentage, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-400 mt-3 font-medium">Based on completed tasks only</p>
          </div>
        </div>

        {/* Task Performance Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Task Performance Breakdown</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 500 }} />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; color?: string }> = ({ title, value, icon, color = 'text-slate-900' }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 hover:border-indigo-100 transition-colors">
    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
      {icon}
    </div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h4 className={`text-2xl font-bold ${color}`}>{value}</h4>
    </div>
  </div>
);

export default Dashboard;
