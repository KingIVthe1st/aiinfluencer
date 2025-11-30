// Advanced Error Tracking and Logging Middleware

import type { Context } from 'hono';
import type { AppContext } from '../api/types';

export interface ErrorLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  method: string;
  path: string;
  userId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  request?: {
    headers: Record<string, string>;
    query: Record<string, string>;
    body?: any;
  };
  response?: {
    status: number;
    body?: any;
  };
  duration?: number;
  metadata?: Record<string, any>;
}

class ErrorTracker {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 1000;

  log(entry: ErrorLogEntry) {
    console.log(`[${entry.level.toUpperCase()}] [${entry.method} ${entry.path}]`,
      entry.error ? entry.error.message : 'Request processed',
      entry.duration ? `(${entry.duration}ms)` : ''
    );

    this.logs.push(entry);

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  getRecentLogs(count = 50): ErrorLogEntry[] {
    return this.logs.slice(-count);
  }

  getErrorLogs(count = 50): ErrorLogEntry[] {
    return this.logs.filter(log => log.level === 'error').slice(-count);
  }
}

export const errorTracker = new ErrorTracker();

export function errorTrackingMiddleware() {
  return async (c: Context<AppContext>, next: () => Promise<void>) => {
    const startTime = Date.now();
    const method = c.req.method;
    const path = c.req.path;

    try {
      // Log incoming request
      errorTracker.log({
        timestamp: new Date().toISOString(),
        level: 'info',
        method,
        path,
        userId: (c as any).get?.('auth')?.userId,
        request: {
          headers: {},
          query: {},
        },
      });

      await next();

      const duration = Date.now() - startTime;

      // Log successful response
      errorTracker.log({
        timestamp: new Date().toISOString(),
        level: c.res.status >= 400 ? 'warn' : 'info',
        method,
        path,
        userId: (c as any).get?.('auth')?.userId,
        response: {
          status: c.res.status,
        },
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error
      errorTracker.log({
        timestamp: new Date().toISOString(),
        level: 'error',
        method,
        path,
        userId: (c as any).get?.('auth')?.userId,
        error: {
          name: error instanceof Error ? error.name : 'UnknownError',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        duration,
      });

      // Re-throw to be handled by error handler
      throw error;
    }
  };
}

export function globalErrorHandler() {
  return async (err: Error, c: Context<AppContext>) => {
    console.error('[GLOBAL ERROR HANDLER]', err);

    errorTracker.log({
      timestamp: new Date().toISOString(),
      level: 'error',
      method: c.req.method,
      path: c.req.path,
      userId: (c as any).get?.('auth')?.userId,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
    });

    return c.json(
      {
        error: 'Internal Server Error',
        message: err.message,
        timestamp: new Date().toISOString(),
        path: c.req.path,
      },
      500
    );
  };
}

// Helper function to get recent logs
export function getRecentLogs(count = 50): ErrorLogEntry[] {
  return errorTracker.getRecentLogs(count);
}

export function getErrorLogs(count = 50): ErrorLogEntry[] {
  return errorTracker.getErrorLogs(count);
}
