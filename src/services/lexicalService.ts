import { getSupabase } from '../lib/supabase';
import { LexicalGroup, LexicalWord } from '../types/lexical';
import { contentCache } from './contentCache';
import { observabilityService } from '../analytics/observabilityService';

const LEXICAL_GROUPS_CACHE_KEY = 'lexical-groups';

function getCachedLexicalGroups(): LexicalGroup[] {
  const cached = contentCache.read<LexicalGroup[]>(LEXICAL_GROUPS_CACHE_KEY);
  return Array.isArray(cached) ? cached : [];
}

function storeLexicalGroups(groups: LexicalGroup[]): void {
  if (groups.length > 0) {
    contentCache.write(LEXICAL_GROUPS_CACHE_KEY, groups);
  }
}

export function hasCachedGameData(): boolean {
  return contentCache.hasItems(LEXICAL_GROUPS_CACHE_KEY);
}

function createSeedWord(id: number, word: string): LexicalWord {
  return {
    id,
    word,
    learner_level: null,
    frequency: null,
    register: null,
    dialect: null,
    status: 'egokia',
    note: null,
  };
}

const SEED_DATA: LexicalGroup[] = [
  {
    id: 999901,
    source_id: null,
    concept: 'Azkar',
    meaning_es: 'Rápido',
    category: 'lexikoa',
    subcategory: null,
    grammar: 'adberbioa',
    relation: 'sinonimoa',
    reviewed_level: 'B1',
    recommended_question_type: 'direct_synonym',
    review_status: 'reviewed_safe',
    is_active: true,
    risk_level: 'low',
    quality_level: 'gold',
    words: [
      createSeedWord(9991, 'Azkar'),
      createSeedWord(9992, 'Bizkor'),
      createSeedWord(9993, 'Agudo')
    ],
  },
  {
    id: 999902,
    source_id: null,
    concept: 'Polita',
    meaning_es: 'Bonito',
    category: 'lexikoa',
    subcategory: null,
    grammar: 'izondoa',
    relation: 'sinonimoa',
    reviewed_level: 'B1',
    recommended_question_type: 'direct_synonym',
    review_status: 'reviewed_safe',
    is_active: true,
    risk_level: 'low',
    quality_level: 'gold',
    words: [
      createSeedWord(9994, 'Polita'),
      createSeedWord(9995, 'Ederra'),
      createSeedWord(9996, 'Sorgingarria')
    ],
  }
];

export async function fetchGameData(): Promise<LexicalGroup[]> {
  const cachedGroups = getCachedLexicalGroups();

  try {
    const supabase = getSupabase();
    if (!supabase) {
      return cachedGroups.length > 0 ? cachedGroups : SEED_DATA;
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Fetch Timeout')), 5000)
    );

    const fetchPromise = supabase
      .from('lexical_groups')
      .select('*, words:lexical_words(*)')
      .eq('is_active', true)
      .in('review_status', ['reviewed_safe', 'reviewed_context_needed', 'reviewed_register_sensitive']);

    const result = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (!result || result.error) {
      if (result?.error) {
        observabilityService.captureError('supabase.lexical_fetch_failed', 'supabase', result.error, {
          operation: 'fetchGameData',
        });
      }
      return cachedGroups.length > 0 ? cachedGroups : SEED_DATA;
    }

    const groupsData = result.data;
    if (groupsData && groupsData.length > 0) {
      const normalizedGroups = groupsData as LexicalGroup[];
      storeLexicalGroups(normalizedGroups);
      return normalizedGroups;
    }

    return cachedGroups.length > 0 ? cachedGroups : SEED_DATA;
  } catch (err) {
    console.warn('⚠️ Hitzkideak: Fetch interrupted, using cache', err);
    return cachedGroups.length > 0 ? cachedGroups : SEED_DATA;
  }
}

export async function fetchGroupsForReview(): Promise<LexicalGroup[]> {
  const cachedGroups = getCachedLexicalGroups();
  const supabase = getSupabase();
  if (!supabase) return cachedGroups.length > 0 ? cachedGroups : SEED_DATA;

  const { data, error } = await supabase
    .from('lexical_groups')
    .select('*, words:lexical_words(*)');

  if (error) {
    observabilityService.captureError('supabase.review_fetch_failed', 'supabase', error, {
      operation: 'fetchGroupsForReview',
    });
    return cachedGroups;
  }

  const normalizedGroups = data as LexicalGroup[];
  storeLexicalGroups(normalizedGroups);
  return normalizedGroups.length > 0 ? normalizedGroups : cachedGroups.length > 0 ? cachedGroups : SEED_DATA;
}
