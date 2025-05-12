import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Use VITE_ prefixed environment variables for client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pmpibxcgbkokkmimztwf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcGlieGNnYmtva2ttaW16dHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMjQ1NDUsImV4cCI6MjA2MTkwMDU0NX0.TWH54XeAungkmtYR8XJsNTQ_P0NV0DPP2cPOWiWTo6M';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, 
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export default supabase;
