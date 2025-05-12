import * as pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { createClient } from '@supabase/supabase-js';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create PostgreSQL connection pool for Supabase
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Supabase connections
});

// Create Drizzle instance with our schema
export const db = drizzle(pool);

// Create Supabase client for auth and storage features
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Only create the client if we have the required environment variables
export const supabaseAdmin = supabaseUrl && supabaseKey ? 
  createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
    }
  ) : null;

// Output environment variables for debugging
console.log("Database URL configured:", !!process.env.DATABASE_URL);
console.log("Supabase URL configured:", !!supabaseUrl);
console.log("Supabase key configured:", !!supabaseKey);