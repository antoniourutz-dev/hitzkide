import { Storage } from '../lib/storage';
import { LexicalGroup } from '../types/lexical';

export const favoritesService = {
  getFavorites(): LexicalGroup[] {
    return Storage.getFavorites();
  },
  
  toggleFavorite(group: LexicalGroup) {
    Storage.toggleFavorite(group);
  },
  
  isFavorite(groupId: number): boolean {
    return Storage.isFavorite(groupId);
  }
};
