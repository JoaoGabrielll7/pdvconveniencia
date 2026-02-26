type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class AppCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const cached = this.store.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return cached.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + Math.max(1, ttlMs),
    });
  }

  clear(): number {
    const total = this.store.size;
    this.store.clear();
    return total;
  }

  clearPrefix(prefix: string): number {
    let removed = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  size(): number {
    return this.store.size;
  }
}

export const appCache = new AppCache();
