// Simple TTL cache with localStorage persistence.
// Survives page refreshes — warm reloads skip the network entirely.

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Bump this when the shape of any cached value changes — old entries
// under the previous version will simply be ignored.
const STORAGE_PREFIX = 'blockvote_cache_v5:';

const storage: Storage | undefined =
  typeof window !== 'undefined' ? window.localStorage : undefined;

// Dates don't survive JSON roundtrips by default. JSON.stringify calls
// Date.prototype.toJSON() BEFORE our replacer runs, so by then `value`
// is already an ISO string and `instanceof Date` is false. The spec
// binds `this` inside the replacer to the holder object though — so
// `this[key]` is still the original Date we need to detect.
function replacer(this: unknown, key: string, value: unknown): unknown {
  const holder = this as Record<string, unknown> | null | undefined;
  const original = holder?.[key];
  if (original instanceof Date) {
    return { __date: original.toISOString() };
  }
  return value;
}

function reviver(_key: string, value: unknown): unknown {
  if (
    value &&
    typeof value === 'object' &&
    '__date' in value &&
    typeof (value as { __date: unknown }).__date === 'string'
  ) {
    return new Date((value as { __date: string }).__date);
  }
  return value;
}

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();

  constructor() {
    this.hydrate();
  }

  private hydrate(): void {
    if (!storage) return;
    const now = Date.now();
    const stale: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const fullKey = storage.key(i);
      if (!fullKey || !fullKey.startsWith(STORAGE_PREFIX)) continue;
      const raw = storage.getItem(fullKey);
      if (!raw) continue;
      try {
        const entry = JSON.parse(raw, reviver) as CacheEntry<unknown>;
        if (now - entry.timestamp > entry.ttl) {
          stale.push(fullKey);
          continue;
        }
        this.store.set(fullKey.slice(STORAGE_PREFIX.length), entry);
      } catch {
        stale.push(fullKey);
      }
    }
    for (const k of stale) storage.removeItem(k);
  }

  set<T>(key: string, data: T, ttlMs: number = 300000): void {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl: ttlMs };
    this.store.set(key, entry);
    if (!storage) return;
    try {
      storage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry, replacer));
    } catch {
      // Quota exceeded or storage disabled — fall back to in-memory only.
    }
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): void {
    this.store.delete(key);
    if (storage) storage.removeItem(STORAGE_PREFIX + key);
  }

  clear(): void {
    this.store.clear();
    if (!storage) return;
    const toRemove: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) toRemove.push(k);
    }
    for (const k of toRemove) storage.removeItem(k);
  }
}

export const cache = new Cache();
