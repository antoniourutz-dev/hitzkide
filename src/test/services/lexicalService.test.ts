import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGameData, hasCachedGameData } from '../../services/lexicalService';
import * as supabaseModule from '../../lib/supabase';
import { contentCache } from '../../services/contentCache';

describe('lexicalService offline cache', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('reports cached game data availability', () => {
    expect(hasCachedGameData()).toBe(false);

    contentCache.write('lexical-groups', [{ id: 1 }]);

    expect(hasCachedGameData()).toBe(true);
  });

  it('returns cached lexical groups when Supabase is unavailable', async () => {
    contentCache.write('lexical-groups', [{ id: 1, words: [] }]);
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);

    const groups = await fetchGameData();

    expect(groups).toHaveLength(1);
    expect(groups[0]?.id).toBe(1);
  });
});
