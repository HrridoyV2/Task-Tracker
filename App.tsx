import React, { useState, useEffect } from 'react';
import { User, UserRole, Task, Valuation } from './types';
import { supabase } from './db';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TasksPage from './pages/TasksPage';
import ValuationsPage from './pages/ValuationsPage';
import SettingsPage from './pages/SettingsPage';
import EmployeesPage from './pages/EmployeesPage';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<'dashboard' | 'tasks' | 'valuations' | 'settings' | 'employees'>('dashboard');
  const [db, setDb] = useState<{ users: User[]; tasks: Task[]; valuations: Valuation[] }>({ users: [], tasks: [], valuations: [] });
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  const fetchData = async () => {
    setLoading(true);
    const [usersRes, tasksRes, valuationsRes] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('valuations').select('*')
    ]);

    setDb({
      users: usersRes.data || [],
      tasks: tasksRes.data || [],
      valuations: valuationsRes.data || []
    });
    setLoading(false);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    fetchData();
  }, []);

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('current_user');
  };

  const handlePageChange = (page: any) => {
    setActivePage(page);
    setIsMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Connecting to Workspace...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} users={db.users} onUpdate={fetchData} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard user={currentUser} db={db} onUpdate={fetchData} />;
      case 'tasks':
        return <TasksPage user={currentUser} db={db} onUpdate={fetchData} />;
      case 'employees':
        if (currentUser.role !== UserRole.MANAGER) return <div className="dark:text-white p-8">Access Denied</div>;
        return <EmployeesPage user={currentUser} db={db} onUpdate={fetchData} />;
      case 'valuations':
        if (currentUser.role !== UserRole.MANAGER) return <div className="dark:text-white p-8">Access Denied</div>;
        return <ValuationsPage user={currentUser} db={db} onUpdate={fetchData} />;
      case 'settings':
        return <SettingsPage user={currentUser} users={db.users} onUpdate={fetchData} />;
      default:
        return <Dashboard user={currentUser} db={db} onUpdate={fetchData} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Desktop Sidebar */}
      <Sidebar 
        role={currentUser.role} 
        activePage={activePage} 
        onPageChange={handlePageChange} 
        onLogout={handleLogout}
      />

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="w-64 h-full bg-slate-900 shadow-2xl animate-in slide-in-from-left duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar 
              role={currentUser.role} 
              activePage={activePage} 
              onPageChange={handlePageChange} 
              onLogout={handleLogout}
              isMobile
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          user={currentUser} 
          theme={theme}
          onThemeToggle={toggleTheme}
          onLogout={handleLogout}
          onPageChange={handlePageChange}
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;