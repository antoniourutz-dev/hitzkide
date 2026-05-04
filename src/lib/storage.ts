import { LexicalGroup } from '../types/lexical';

const FAVORITES_KEY = 'hitzkideak_favorites';

export const Storage = {
  getFavorites(): LexicalGroup[] {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  },

  toggleFavorite(group: LexicalGroup) {
    const favorites = this.getFavorites();
    const index = favorites.findIndex(f => f.id === group.id);
    if (index === -1) {
      favorites.push(group);
    } else {
      favorites.splice(index, 1);
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  },

  isFavorite(groupId: number): boolean {
    return this.getFavorites().some(f => f.id === groupId);
  }
};
