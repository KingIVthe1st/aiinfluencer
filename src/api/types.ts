// AI Singer Studio - API Types

import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '../db/schema';
import type { Env } from '../index';

export interface AppContext {
  Bindings: Env & {
    db: DrizzleD1Database<typeof schema>;
  };
}
