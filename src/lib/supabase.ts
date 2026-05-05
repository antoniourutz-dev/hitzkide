import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let hasWarnedMissingConfig = false;

export function getSupabase() {
  if (!supabaseInstance) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      if (!hasWarnedMissingConfig) {
        console.warn('Supabase configuration missing. Running in local/offline mode.');
        hasWarnedMissingConfig = true;
      }
      return null;
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

/**
 * SQL SCHEMA NECESSARY IN SUPABASE:
 * 
 * -- Main Tables
 * CREATE TABLE lexical_groups (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   source_id TEXT,
 *   concept TEXT NOT NULL,
 *   meaning_es TEXT,
 *   category TEXT,
 *   subcategory TEXT,
 *   grammar TEXT,
 *   relation TEXT,
 *   original_level TEXT,
 *   reviewed_level TEXT,
 *   recommended_question_type TEXT,
 *   review_status TEXT NOT NULL,
 *   is_active BOOLEAN DEFAULT true,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE lexical_words (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   group_id UUID REFERENCES lexical_groups(id) ON DELETE CASCADE,
 *   word TEXT NOT NULL,
 *   learner_level TEXT,
 *   frequency TEXT,
 *   register TEXT,
 *   dialect TEXT,
 *   status TEXT,
 *   note TEXT
 * );
 * 
 * -- User Data Tables
 * CREATE TABLE user_answers (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id TEXT NOT NULL,
 *   group_id UUID REFERENCES lexical_groups(id) ON DELETE CASCADE,
 *   word_id UUID REFERENCES lexical_words(id),
 *   is_correct BOOLEAN NOT NULL,
 *   timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE user_favorites (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id TEXT NOT NULL,
 *   group_id UUID REFERENCES lexical_groups(id) ON DELETE CASCADE,
 *   timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 */
