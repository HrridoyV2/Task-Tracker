
import { User, UserRole, Task, Valuation, TaskStatus } from './types';

const USERS_KEY = 'task_tracker_users';
const TASKS_KEY = 'task_tracker_tasks';
const VALUATIONS_KEY = 'task_tracker_valuations';

// Initial Data
const DEFAULT_USERS: User[] = [
  { id: 'u1', employee_id: 'MGR001', name: 'Admin Manager', role: UserRole.MANAGER, password_hash: 'password', salary: 50000, is_active: true, created_at: new Date().toISOString() },
  { id: 'u2', employee_id: 'EMP001', name: 'John Doe', role: UserRole.ASSIGNEE, password_hash: 'password', salary: 30000, is_active: true, created_at: new Date().toISOString() },
  { id: 'u3', employee_id: 'EMP002', name: 'Jane Smith', role: UserRole.ASSIGNEE, password_hash: 'password', salary: 35000, is_active: true, created_at: new Date().toISOString() },
];

const DEFAULT_VALUATIONS: Valuation[] = [
  { id: 'v1', title: 'Content Posting & Digital Platform Management', unit_type: 'Per Post', charge_amount: 500, created_by: 'u1', assignee_id: 'u2', is_active: true, created_at: new Date().toISOString() },
  { id: 'v2', title: 'Website Content Updating', unit_type: 'Per Update', charge_amount: 1200, created_by: 'u1', assignee_id: 'u2', is_active: true, created_at: new Date().toISOString() },
  { id: 'v3', title: 'Query Response Handling', unit_type: 'Per Day', charge_amount: 2000, created_by: 'u1', assignee_id: 'u3', is_active: true, created_at: new Date().toISOString() },
];

export const getDB = () => {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || JSON.stringify(DEFAULT_USERS));
  const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
  const valuations = JSON.parse(localStorage.getItem(VALUATIONS_KEY) || JSON.stringify(DEFAULT_VALUATIONS));
  return { users, tasks, valuations };
};

export const saveDB = (data: { users?: User[]; tasks?: Task[]; valuations?: Valuation[] }) => {
  if (data.users) localStorage.setItem(USERS_KEY, JSON.stringify(data.users));
  if (data.tasks) localStorage.setItem(TASKS_KEY, JSON.stringify(data.tasks));
  if (data.valuations) localStorage.setItem(VALUATIONS_KEY, JSON.stringify(data.valuations));
};

export const generateTaskCode = (tasks: Task[]) => {
  const nextId = tasks.length + 1;
  return `B${nextId.toString().padStart(4, '0')}`;
};
