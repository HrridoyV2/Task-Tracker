import { createClient } from '@supabase/supabase-js';
import { User, Task } from './types';

// Access keys from environment variables (standard for Netlify)
const SUPABASE_URL = (typeof process !== 'undefined' && process.env.SUPABASE_URL) || 'https://ippnrisnomndllfskxbn.supabase.co';
const SUPABASE_KEY = (typeof process !== 'undefined' && process.env.SUPABASE_KEY) || 'sb_publishable_5_CnXh46ugjutHA6PitJgg_Y9cRbuny';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const generateTaskCode = async (): Promise<string> => {
  // Fetch only the task_code column for all tasks
  const { data, error } = await supabase
    .from('tasks')
    .select('task_code');

  if (error || !data || data.length === 0) {
    return `B0001`;
  }

  // Extract numeric parts from codes like "B0002"
  const ids = data
    .map(t => {
      const match = t.task_code.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    })
    .filter(id => !isNaN(id));

  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  const nextId = maxId + 1;
  
  return `B${nextId.toString().padStart(4, '0')}`;
};

// Hardcoded Admin Credentials
export const DEFAULT_ADMIN = {
  employee_id: 'admin',
  password: 'brand@p2pfamily'
};