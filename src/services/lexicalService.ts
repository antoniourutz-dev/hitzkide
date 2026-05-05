import { getSupabase } from '../lib/supabase';
import { LexicalGroup } from '../types/lexical';

export async function fetchGameData(): Promise<LexicalGroup[]> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.error('Supabase instance could not be initialized. Check environment variables.');
      return [];
    }

    // Try fetching from lexical_groups first
    const { data: groupsData, error: groupsError } = await supabase
      .from('lexical_groups')
      .select('*, words:lexical_words(*)')
      .eq('is_active', true)
      .in('review_status', ['reviewed_safe', 'reviewed_context_needed', 'reviewed_register_sensitive']);

    if (groupsError) {
      console.error('Error fetching lexical data:', groupsError.message);
      return [];
    }

    if (groupsData && groupsData.length > 0) {
      return groupsData as LexicalGroup[];
    }

    return [];
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
