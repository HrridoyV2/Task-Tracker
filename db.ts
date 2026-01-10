import { createClient } from '@supabase/supabase-js';
import { User, Task } from './types';

// Access keys from environment variables (standard for Netlify)
// Note: Netlify injects variables into the environment. 
// For client-side apps using ESM/Vite/Build tools, process.env is often shimmed.
const SUPABASE_URL = (typeof process !== 'undefined' && process.env.SUPABASE_URL) || 'https://ippnrisnomndllfskxbn.supabase.co';
const SUPABASE_KEY = (typeof process !== 'undefined' && process.env.SUPABASE_KEY) || 'sb_publishable_5_CnXh46ugjutHA6PitJgg_Y9cRbuny';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const generateTaskCode = async (): Promise<string> => {
  const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
  const nextId = (count || 0) + 1;
  return `B${nextId.toString().padStart(4, '0')}`;
};

// Hardcoded Admin Credentials
export const DEFAULT_ADMIN = {
  employee_id: 'admin',
  password: 'brand@p2pfamily'
};