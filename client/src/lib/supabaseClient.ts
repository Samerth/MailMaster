import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { env } from './env';

// Create the Supabase client
export const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true, 
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Log that the client has been initialized
console.log('[Supabase] Client initialized with URL:', env.SUPABASE_URL);

export default supabase;
