// Browser Session Pool and Concurrency Control
// Prevents overwhelming browser rendering API with simultaneous heavy operations

/**
 * BrowserPool - Manages concurrent browser rendering operations
 *
 * Limits:
 * - Max 2 concurrent browser sessions per worker instance
 * - Queue additional requests with timeout
 * - Auto-cleanup on errors
 *
 * Note: This is per-worker-instance concurrency control.
 * Cloudflare may still spawn multiple workers for high load.
 */
export class BrowserPool {
  private browser: Fetcher;
  private activeSessions = 0;
  private maxConcurrent = 2; // Max 2 heavy browser operations at once
  private queue: Array<{
    operation: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = [];

  constructor(browser: Fetcher, maxConcurrent = 2) {
    this.browser = browser;
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Execute a browser operation with concurrency control
   * Queues if too many concurrent operations
   */
  async execute<T>(
    operation: (browser: Fetcher) => Promise<T>,
    timeoutMs = 180000 // 3 minutes default
  ): Promise<T> {
    // If under limit, execute immediately
    if (this.activeSessions < this.maxConcurrent) {
      return this.executeOperation(operation);
    }

    // Otherwise, queue and wait
    console.log(
      `[BrowserPool] Queuing operation (${this.activeSessions}/${this.maxConcurrent} active, ${this.queue.length} queued)`
    );

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Remove from queue on timeout
        const index = this.queue.findIndex((item) => item.timeout === timeout);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
        reject(new Error(`Browser operation timed out after ${timeoutMs}ms waiting in queue`));
      }, timeoutMs);

      this.queue.push({
        operation: () => this.executeOperation(operation),
        resolve,
        reject,
        timeout,
      });
    });
  }

  /**
   * Execute the operation and track active sessions
   */
  private async executeOperation<T>(operation: (browser: Fetcher) => Promise<T>): Promise<T> {
    this.activeSessions++;

    console.log(`[BrowserPool] Starting operation (${this.activeSessions}/${this.maxConcurrent} active)`);

    try {
      const result = await operation(this.browser);

      console.log(`[BrowserPool] Operation complete (${this.activeSessions - 1}/${this.maxConcurrent} active)`);

      return result;
    } catch (error) {
      console.error(`[BrowserPool] Operation failed:`, error);
      throw error;
    } finally {
      this.activeSessions--;
      this.processQueue();
    }
  }

  /**
   * Process next queued operation if slots available
   */
  private processQueue(): void {
    if (this.queue.length === 0 || this.activeSessions >= this.maxConcurrent) {
      return;
    }

    const next = this.queue.shift();
    if (!next) return;

    clearTimeout(next.timeout);

    console.log(`[BrowserPool] Processing queued operation (${this.queue.length} remaining)`);

    next
      .operation()
      .then(next.resolve)
      .catch(next.reject);
  }

  /**
   * Get pool stats for monitoring
   */
  getStats() {
    return {
      active: this.activeSessions,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

// Global browser pool instance (per worker instance)
let globalBrowserPool: BrowserPool | null = null;

/**
 * Get or create the global browser pool
 * This ensures only one pool per worker instance
 */
export function getBrowserPool(browser: Fetcher): BrowserPool {
  if (!globalBrowserPool) {
    console.log('[BrowserPool] Initializing global browser pool (max 2 concurrent)');
    globalBrowserPool = new BrowserPool(browser, 2);
  }
  return globalBrowserPool;
}
