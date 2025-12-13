import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { config } from 'dotenv';
import { resolve } from 'path';
import * as schema from "@shared/schema";

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env'), override: true });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : undefined,
});

// Handle pool errors to prevent crashes on transient DB issues
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  // Don't exit - let the pool recover
});

export const db = drizzle({ client: pool, schema });
