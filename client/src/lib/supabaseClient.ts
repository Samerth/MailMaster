import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pmpibxcgbkokkmimztwf.supabase.co';
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcGlieGNnYmtva2ttaW16dHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMjQ1NDUsImV4cCI6MjA2MTkwMDU0NX0.TWH54XeAungkmtYR8XJsNTQ_P0NV0DPP2cPOWiWTo6M';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
