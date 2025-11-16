import { LicenseVerificationData } from './useLicenseVerification';

interface CacheEntry {
  data: LicenseVerificationData;
  timestamp: number;
  userId: string;
}

class LicenseCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 3 * 60 * 1000; // 3 minutos

  set(userId: string, data: LicenseVerificationData): void {
    this.cache.set(userId, {
      data,
      timestamp: Date.now(),
      userId
    });
  }

  get(userId: string): LicenseVerificationData | null {
    const entry = this.cache.get(userId);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.TTL;
    if (isExpired) {
      this.cache.delete(userId);
      return null;
    }

    return entry.data;
  }

  clear(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }

  invalidate(userId: string): void {
    this.cache.delete(userId);
  }
}

export const licenseCache = new LicenseCache();