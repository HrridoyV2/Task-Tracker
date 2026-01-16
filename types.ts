
export enum UserRole {
  MANAGER = 'MANAGER',
  ASSIGNEE = 'ASSIGNEE'
}

export enum TaskStatus {
  RESEARCH = 'Research',
  IN_PROGRESS = 'In Progress',
  UNDER_REVIEW = 'Under Review',
  CORRECTION = 'Correction',
  DONE = 'Done',
  ASSIGN = 'Assign',
  FORWARD = 'Forward',
  FAILED = 'Failed',
  FIRST_ATTEMPT = '1st attempt',
  HOLD = 'Hold'
}

export interface User {
  id: string;
  employee_id: string;
  name: string;
  role: UserRole;
  password_hash: string;
  salary: number;
  telegram_number?: string;
  is_active: boolean;
  created_at: string;
}

export interface Valuation {
  id: string;
  title: string;
  unit_type: string;
  charge_amount: number;
  created_by: string;
  assignee_id: string;
  is_active: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  task_code: string;
  title: string;
  brief: string;
  assigned_by: string;
  assigned_to: string;
  status: TaskStatus;
  deadline: string;
  task_start_time: string;
  task_end_time: string | null;
  elapsed_hours: number;
  output: string;
  valuation_id: string;
  deliverable_count: number;
  concern: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialSummary {
  totalDeliverables: number;
  totalValue: number;
  salary: number;
  contributionPercentage: number;
}
