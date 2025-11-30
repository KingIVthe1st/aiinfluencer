// Database middleware - initializes Drizzle ORM
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';
import type { Context, Next } from 'hono';
import type { Env } from '../index';

export async function dbMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  // Initialize Drizzle ORM with D1 database
  const db = drizzle(c.env.DB, { schema });

  // Attach to context
  c.set('db', db);

  await next();
}

// Helper to get db from context
export function getDb(c: Context) {
  return c.get('db');
}
