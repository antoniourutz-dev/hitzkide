import { SupabaseClient } from '@supabase/supabase-js';
import { observabilityService } from '../analytics/observabilityService';
import { getSupabaseClient, hasSupabaseConfig } from './supabaseClient';

let hasWarnedMissingConfig = false;

export function getSupabase() {
  if (!hasSupabaseConfig()) {
    if (!hasWarnedMissingConfig) {
      observabilityService.trackSupabase('supabase.configuration_missing', {
        hasUrl: Boolean(import.meta.env.VITE_SUPABASE_URL),
        hasAnonKey: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY),
        mode: 'local_offline',
      });
      hasWarnedMissingConfig = true;
    }
    return null;
  }

  return getSupabaseClient() as SupabaseClient;
}
