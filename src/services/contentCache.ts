const CACHE_PREFIX = 'hitzkideak-content-cache';
const CACHE_VERSION = '2026-05-premium-v1';

type CacheEnvelope<T> = {
  version: string;
  savedAt: string;
  data: T;
};

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function buildCacheKey(key: string): string {
  return `${CACHE_PREFIX}:${CACHE_VERSION}:${key}`;
}

export const contentCache = {
  read<T>(key: string): T | null {
    const storage = getStorage();
    if (!storage) return null;

    const rawValue = storage.getItem(buildCacheKey(key));
    if (!rawValue) return null;

    try {
      const parsed = JSON.parse(rawValue) as CacheEnvelope<T> | T;
      if (parsed && typeof parsed === 'object' && 'data' in parsed) {
        return parsed.data;
      }

      return parsed as T;
    } catch {
      storage.removeItem(buildCacheKey(key));
      return null;
    }
  },

  write<T>(key: string, data: T): void {
    const storage = getStorage();
    if (!storage) return;

    const payload: CacheEnvelope<T> = {
      version: CACHE_VERSION,
      savedAt: new Date().toISOString(),
      data,
    };

    try {
      storage.setItem(buildCacheKey(key), JSON.stringify(payload));
    } catch {
      // Ignore storage failures and keep the app usable.
    }
  },

  hasItems(key: string): boolean {
    const cached = contentCache.read(key) as unknown;
    return Array.isArray(cached) ? cached.length > 0 : cached !== null;
  },
};
