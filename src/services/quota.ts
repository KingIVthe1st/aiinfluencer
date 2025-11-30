// AI Singer Studio - Quota Management Service
// Uses Durable Objects for distributed quota tracking

import { DurableObject } from 'cloudflare:workers';

export interface QuotaLimits {
  imagesPerMonth: number;
  songsPerMonth: number;
  videosPerMonth: number;
}

export interface QuotaUsage {
  images: number;
  songs: number;
  videos: number;
  periodStart: number; // Timestamp
}

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
}

/**
 * QuotaManager Durable Object
 * Manages per-user quota tracking with atomic operations
 */
export class QuotaManager extends DurableObject {
  private usage: Map<string, QuotaUsage> = new Map();

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
  }

  /**
   * Check if user has quota available for content type
   */
  async checkQuota(
    userId: string,
    contentType: 'image' | 'song' | 'video',
    limits: QuotaLimits
  ): Promise<QuotaCheckResult> {
    const usage = await this.getUsage(userId);
    const now = Date.now();

    // Reset usage if in new billing period (monthly)
    if (this.shouldResetPeriod(usage.periodStart, now)) {
      await this.resetUsage(userId);
      return {
        allowed: true,
        remaining: this.getLimitForType(contentType, limits) - 1,
        limit: this.getLimitForType(contentType, limits),
        resetAt: this.getNextResetDate(now),
      };
    }

    const currentUsage = this.getUsageForType(contentType, usage);
    const limit = this.getLimitForType(contentType, limits);
    const allowed = currentUsage < limit;

    return {
      allowed,
      remaining: Math.max(0, limit - currentUsage),
      limit,
      resetAt: this.getNextResetDate(usage.periodStart),
    };
  }

  /**
   * Consume quota (increment usage counter)
   */
  async consumeQuota(
    userId: string,
    contentType: 'image' | 'song' | 'video',
    limits: QuotaLimits
  ): Promise<QuotaCheckResult> {
    const check = await this.checkQuota(userId, contentType, limits);

    if (!check.allowed) {
      return check;
    }

    // Increment usage atomically
    const usage = await this.getUsage(userId);

    switch (contentType) {
      case 'image':
        usage.images++;
        break;
      case 'song':
        usage.songs++;
        break;
      case 'video':
        usage.videos++;
        break;
    }

    this.usage.set(userId, usage);
    await this.ctx.storage.put(`usage:${userId}`, usage);

    return {
      allowed: true,
      remaining: check.remaining - 1,
      limit: check.limit,
      resetAt: check.resetAt,
    };
  }

  /**
   * Get current usage for user
   */
  async getUsage(userId: string): Promise<QuotaUsage> {
    let usage = this.usage.get(userId);

    if (!usage) {
      // Load from storage
      usage = await this.ctx.storage.get<QuotaUsage>(`usage:${userId}`);

      if (!usage) {
        // Initialize new usage period
        usage = {
          images: 0,
          songs: 0,
          videos: 0,
          periodStart: Date.now(),
        };
      }

      this.usage.set(userId, usage);
    }

    return usage;
  }

  /**
   * Reset usage for new billing period
   */
  private async resetUsage(userId: string): Promise<void> {
    const newUsage: QuotaUsage = {
      images: 0,
      songs: 0,
      videos: 0,
      periodStart: Date.now(),
    };

    this.usage.set(userId, newUsage);
    await this.ctx.storage.put(`usage:${userId}`, newUsage);
  }

  /**
   * Check if billing period should reset (monthly)
   */
  private shouldResetPeriod(periodStart: number, now: number): boolean {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return now - periodStart > thirtyDays;
  }

  /**
   * Get next reset date (30 days from period start)
   */
  private getNextResetDate(periodStart: number): number {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return periodStart + thirtyDays;
  }

  /**
   * Get usage for specific content type
   */
  private getUsageForType(
    contentType: 'image' | 'song' | 'video',
    usage: QuotaUsage
  ): number {
    switch (contentType) {
      case 'image':
        return usage.images;
      case 'song':
        return usage.songs;
      case 'video':
        return usage.videos;
    }
  }

  /**
   * Get limit for specific content type
   */
  private getLimitForType(
    contentType: 'image' | 'song' | 'video',
    limits: QuotaLimits
  ): number {
    switch (contentType) {
      case 'image':
        return limits.imagesPerMonth;
      case 'song':
        return limits.songsPerMonth;
      case 'video':
        return limits.videosPerMonth;
    }
  }
}

/**
 * Quota tier definitions
 */
export const QUOTA_TIERS: Record<string, QuotaLimits> = {
  starter: {
    imagesPerMonth: 50,
    songsPerMonth: 10,
    videosPerMonth: 5,
  },
  creator: {
    imagesPerMonth: 200,
    songsPerMonth: 50,
    videosPerMonth: 20,
  },
  studio: {
    imagesPerMonth: 1000,
    songsPerMonth: 200,
    videosPerMonth: 100,
  },
};

/**
 * Get quota limits for subscription tier
 */
export function getQuotaLimits(tier: string): QuotaLimits {
  return QUOTA_TIERS[tier.toLowerCase()] || QUOTA_TIERS.starter;
}

/**
 * QuotaService - Client for interacting with QuotaManager Durable Object
 */
export class QuotaService {
  constructor(
    private quotaManagerNamespace: DurableObjectNamespace,
    private tier: string
  ) {}

  /**
   * Get QuotaManager instance for user
   */
  private getQuotaManager(userId: string): any {
    const id = this.quotaManagerNamespace.idFromName(userId);
    return this.quotaManagerNamespace.get(id);
  }

  /**
   * Check if user can perform action
   */
  async checkQuota(
    userId: string,
    contentType: 'image' | 'song' | 'video'
  ): Promise<QuotaCheckResult> {
    const manager = this.getQuotaManager(userId);
    const limits = getQuotaLimits(this.tier);

    return (manager as any).checkQuota(userId, contentType, limits);
  }

  /**
   * Consume quota for action
   */
  async consumeQuota(
    userId: string,
    contentType: 'image' | 'song' | 'video'
  ): Promise<QuotaCheckResult> {
    const manager = this.getQuotaManager(userId);
    const limits = getQuotaLimits(this.tier);

    return (manager as any).consumeQuota(userId, contentType, limits);
  }

  /**
   * Get current usage
   */
  async getUsage(userId: string): Promise<QuotaUsage> {
    const manager = this.getQuotaManager(userId);
    return (manager as any).getUsage(userId);
  }
}
