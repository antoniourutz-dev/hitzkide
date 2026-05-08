import { LexicalGroup } from '../types/lexical';

const FAVORITES_KEY = 'hitzkideak_favorites';

export const SESSION_STORAGE_KEYS = {
  questions: 'hitzkideak_questions',
  result: 'hitzkideak_result',
  clozeResult: 'hitzkideak_cloze_result',
  discourseResult: 'hitzkideak_discourse_result',
} as const;

function getStorageArea(type: 'local' | 'session'): globalThis.Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return type === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function readJsonFromStorage<T>(type: 'local' | 'session', key: string): T | null {
  const storage = getStorageArea(type);
  if (!storage) return null;

  const rawValue = storage.getItem(key);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function writeJsonToStorage(type: 'local' | 'session', key: string, value: unknown): boolean {
  const storage = getStorageArea(type);
  if (!storage) return false;

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function removeStorageItem(type: 'local' | 'session', key: string): void {
  const storage = getStorageArea(type);
  if (!storage) return;

  storage.removeItem(key);
}

export function readJsonFromSessionStorage<T>(key: string): T | null {
  return readJsonFromStorage<T>('session', key);
}

export function writeJsonToSessionStorage(key: string, value: unknown): boolean {
  return writeJsonToStorage('session', key, value);
}

export function removeSessionStorageItem(key: string): void {
  removeStorageItem('session', key);
}

export const Storage = {
  getFavorites(): LexicalGroup[] {
    const favorites = readJsonFromStorage<LexicalGroup[]>('local', FAVORITES_KEY);
    return Array.isArray(favorites) ? favorites : [];
  },

  toggleFavorite(group: LexicalGroup) {
    const favorites = this.getFavorites();
    const index = favorites.findIndex(f => f.id === group.id);
    if (index === -1) {
      favorites.push(group);
    } else {
      favorites.splice(index, 1);
    }
    writeJsonToStorage('local', FAVORITES_KEY, favorites);
  },

  isFavorite(groupId: number): boolean {
    return this.getFavorites().some(f => f.id === groupId);
  }
};
