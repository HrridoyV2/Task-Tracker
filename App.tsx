
import React, { useState, useEffect } from 'react';
import { User, UserRole, Task, Valuation } from './types';
import { getDB } from './db';
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
  const [db, setDb] = useState(getDB());

  useEffect(() => {
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('current_user');
  };

  const updateDB = () => {
    setDb(getDB());
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} users={db.users} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard user={currentUser} db={db} onUpdate={updateDB} />;
      case 'tasks':
        return <TasksPage user={currentUser} db={db} onUpdate={updateDB} />;
      case 'employees':
        if (currentUser.role !== UserRole.MANAGER) return <div>Access Denied</div>;
        return <EmployeesPage user={currentUser} db={db} onUpdate={updateDB} />;
      case 'valuations':
        if (currentUser.role !== UserRole.MANAGER) return <div>Access Denied</div>;
        return <ValuationsPage user={currentUser} db={db} onUpdate={updateDB} />;
      case 'settings':
        return <SettingsPage user={currentUser} users={db.users} onUpdate={updateDB} />;
      default:
        return <Dashboard user={currentUser} db={db} onUpdate={updateDB} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        role={currentUser.role} 
        activePage={activePage} 
        onPageChange={setActivePage} 
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={currentUser} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;
