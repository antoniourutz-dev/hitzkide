import { getSupabase } from '../lib/supabase';
import { LexicalGroup } from '../types/lexical';

export async function fetchGameData(): Promise<LexicalGroup[]> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.error('Supabase instance could not be initialized. Check environment variables.');
      return [];
    }

    // Try fetching from the requested view first
    const { data: viewData, error: viewError } = await supabase
      .from('game_lexical_groups')
      .select('*');

    if (!viewError && viewData) {
      return viewData as LexicalGroup[];
    }

    if (viewError) {
      console.warn('View game_lexical_groups fetch failed or doesn\'t exist, falling back to basic join:', viewError.message);
    }
    
    const { data: groups, error: groupsError } = await supabase
      .from('lexical_groups')
      .select('*, words:lexical_words(*)')
      .eq('is_active', true)
      .in('review_status', ['reviewed_safe', 'reviewed_context_needed', 'reviewed_register_sensitive']);

    if (groupsError) {
      console.error('Error fetching lexical data from fallback tables:', groupsError.message);
      return [];
    }

    return groups as LexicalGroup[];
  } catch (err) {
    console.error('Unexpected error in fetchGameData:', err);
    return [];
  }
}

export async function fetchGroupsForReview(): Promise<LexicalGroup[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('lexical_groups')
    .select('*, words:lexical_words(*)');

  if (error) {
    console.error('Error fetching review data:', error);
    return [];
  }

  return data as LexicalGroup[];
}
