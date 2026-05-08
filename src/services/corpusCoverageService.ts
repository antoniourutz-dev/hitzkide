import { getSupabase } from '../lib/supabase';
import {
  CoverageDistributionRow,
  CoverageQueryResult,
  DiscourseCoverageRow,
  DiscourseCoverageSummary,
  DuplicateExactRow,
  DuplicateGroup,
  DuplicateSummary,
  EditorialPriorityFilters,
  EditorialPriorityRow,
  EditorialPrioritySummary,
  LexicalCoverageFilters,
  LexicalCoverageRow,
  LexicalCoverageSummary,
} from '../types/corpusCoverage';
import { observabilityService } from '../analytics/observabilityService';

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 1000;

type SupabaseFilterQuery<T> = T & {
  eq: (column: string, value: unknown) => SupabaseFilterQuery<T>;
  or: (filters: string) => SupabaseFilterQuery<T>;
};

type SupabaseCoverageQuery = {
  eq: (column: string, value: unknown) => SupabaseCoverageQuery;
  range: (from: number, to: number) => Promise<{ data: unknown[] | null; error: unknown }>;
};

function emptyResult<T>(data: T, error: string | null = null, missingView: boolean = false): CoverageQueryResult<T> {
  return { data, error, missingView };
}

function isMissingViewError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String(error.message).toLowerCase() : '';
  const code = 'code' in error ? String(error.code) : '';
  return code === '42P01' || message.includes('does not exist') || message.includes('not found');
}

function normalizeLimit(limit?: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit || DEFAULT_LIMIT)));
}

async function fetchSingle<T>(viewName: string): Promise<CoverageQueryResult<T | null>> {
  const supabase = getSupabase();
  if (!supabase) {
    return emptyResult<T | null>(null, 'Supabase ez dago konfiguratuta.');
  }

  const { data, error } = await supabase.from(viewName).select('*').maybeSingle();
  if (error) {
    const missingView = isMissingViewError(error);
    if (!missingView) {
      observabilityService.captureError('corpus_coverage.fetch_single_failed', 'supabase', error, { viewName });
    }
    return emptyResult<T | null>(null, 'Ezin izan da corpusaren estaldura kargatu.', missingView);
  }

  return emptyResult((data as T | null) ?? null);
}

async function fetchRows<T>(viewName: string, limit?: number, offset?: number): Promise<CoverageQueryResult<T[]>> {
  const supabase = getSupabase();
  if (!supabase) {
    return emptyResult<T[]>([], 'Supabase ez dago konfiguratuta.');
  }

  const normalizedLimit = normalizeLimit(limit);
  const from = Math.max(0, Math.floor(offset || 0));
  const to = from + normalizedLimit - 1;
  const { data, error } = await supabase.from(viewName).select('*').range(from, to);

  if (error) {
    const missingView = isMissingViewError(error);
    if (!missingView) {
      observabilityService.captureError('corpus_coverage.fetch_rows_failed', 'supabase', error, { viewName });
    }
    return emptyResult<T[]>([], 'Ezin izan da corpusaren estaldura kargatu.', missingView);
  }

  return emptyResult((data || []) as T[]);
}

function applyLexicalFilters<T>(query: T, filters: LexicalCoverageFilters): T {
  let nextQuery = query as SupabaseFilterQuery<T>;

  if (filters.status === 'playable') nextQuery = nextQuery.eq('is_playable', true);
  if (filters.status === 'non_playable') nextQuery = nextQuery.eq('is_playable', false);
  if (filters.status === 'high_risk') nextQuery = nextQuery.eq('coverage_status', 'high_risk');
  if (filters.status === 'needs_external_check') nextQuery = nextQuery.eq('coverage_status', 'needs_external_check');
  if (filters.status === 'disabled_for_game') nextQuery = nextQuery.eq('coverage_status', 'disabled_for_game');
  if (filters.status === 'missing_explanation') nextQuery = nextQuery.or('has_explanation_short.eq.false,has_contrast_note.eq.false');
  if (filters.status === 'missing_examples') nextQuery = nextQuery.eq('has_good_example', false);
  if (filters.level && filters.level !== 'all') nextQuery = nextQuery.eq('reviewed_level', filters.level);
  if (filters.category && filters.category !== 'all') nextQuery = nextQuery.eq('category', filters.category);
  if (filters.questionType && filters.questionType !== 'all') nextQuery = nextQuery.eq('recommended_question_type', filters.questionType);

  return nextQuery as T;
}

export async function fetchLexicalCoverageSummary(): Promise<CoverageQueryResult<LexicalCoverageSummary | null>> {
  return fetchSingle<LexicalCoverageSummary>('lexical_corpus_coverage_summary');
}

export async function fetchLexicalCoverageRows(
  filters: LexicalCoverageFilters = {}
): Promise<CoverageQueryResult<LexicalCoverageRow[]>> {
  const supabase = getSupabase();
  if (!supabase) {
    return emptyResult<LexicalCoverageRow[]>([], 'Supabase ez dago konfiguratuta.');
  }

  const normalizedLimit = normalizeLimit(filters.limit);
  const from = Math.max(0, Math.floor(filters.offset || 0));
  const to = from + normalizedLimit - 1;
  let query = supabase
    .from('lexical_corpus_coverage')
    .select('*')
    .order('is_playable', { ascending: true })
    .order('coverage_status', { ascending: true })
    .order('id', { ascending: true });

  query = applyLexicalFilters(query, filters) as typeof query;
  const { data, error } = await query.range(from, to);

  if (error) {
    const missingView = isMissingViewError(error);
    if (!missingView) {
      observabilityService.captureError('corpus_coverage.fetch_lexical_rows_failed', 'supabase', error, { filters });
    }
    return emptyResult<LexicalCoverageRow[]>([], 'Ezin izan da corpusaren estaldura kargatu.', missingView);
  }

  return emptyResult((data || []) as LexicalCoverageRow[]);
}

function mapDistribution<T extends Record<string, unknown>>(rows: T[], key: keyof T): CoverageDistributionRow[] {
  return rows.map((row) => ({
    label: String(row[key] ?? 'unknown'),
    total_count: Number(row.total_count || 0),
    playable_count: Number(row.playable_count || 0),
    non_playable_count: 'non_playable_count' in row ? Number(row.non_playable_count || 0) : undefined,
    playable_percentage: 'playable_percentage' in row ? Number(row.playable_percentage || 0) : undefined,
  }));
}

export async function fetchLexicalCoverageByLevel(): Promise<CoverageQueryResult<CoverageDistributionRow[]>> {
  const result = await fetchRows<Record<string, unknown>>('lexical_corpus_coverage_by_level', 100);
  return emptyResult(mapDistribution(result.data, 'level'), result.error, result.missingView);
}

export async function fetchLexicalCoverageByCategory(): Promise<CoverageQueryResult<CoverageDistributionRow[]>> {
  const result = await fetchRows<Record<string, unknown>>('lexical_corpus_coverage_by_category', 200);
  return emptyResult(mapDistribution(result.data, 'category'), result.error, result.missingView);
}

export async function fetchLexicalCoverageByQuestionType(): Promise<CoverageQueryResult<CoverageDistributionRow[]>> {
  const result = await fetchRows<Record<string, unknown>>('lexical_corpus_coverage_by_question_type', 50);
  return emptyResult(mapDistribution(result.data, 'recommended_question_type'), result.error, result.missingView);
}

export async function fetchLexicalCoverageByQuality(): Promise<CoverageQueryResult<CoverageDistributionRow[]>> {
  const result = await fetchRows<Record<string, unknown>>('lexical_corpus_coverage_by_quality', 20);
  return emptyResult(mapDistribution(result.data, 'quality_level'), result.error, result.missingView);
}

export async function fetchLexicalCoverageByRisk(): Promise<CoverageQueryResult<CoverageDistributionRow[]>> {
  const result = await fetchRows<Record<string, unknown>>('lexical_corpus_coverage_by_risk', 20);
  return emptyResult(mapDistribution(result.data, 'risk_level'), result.error, result.missingView);
}

export async function fetchDiscourseCoverageSummary(): Promise<CoverageQueryResult<DiscourseCoverageSummary | null>> {
  return fetchSingle<DiscourseCoverageSummary>('discourse_corpus_coverage_summary');
}

export async function fetchDiscourseCoverageRows(filters: { limit?: number; offset?: number } = {}): Promise<CoverageQueryResult<DiscourseCoverageRow[]>> {
  return fetchRows<DiscourseCoverageRow>('discourse_corpus_coverage', filters.limit, filters.offset);
}

export async function fetchEditorialPrioritySummary(): Promise<CoverageQueryResult<EditorialPrioritySummary | null>> {
  const result = await fetchSingle<EditorialPrioritySummary>('lexical_editorial_priority_summary');
  if (result.missingView) {
    return emptyResult<EditorialPrioritySummary | null>(null, 'Lehentasun editorialaren datuak ez daude oraindik eskuragarri.', true);
  }

  return result;
}

export async function fetchEditorialPriorityQueue(
  filters: EditorialPriorityFilters = {}
): Promise<CoverageQueryResult<EditorialPriorityRow[]>> {
  const supabase = getSupabase();
  if (!supabase) {
    return emptyResult<EditorialPriorityRow[]>([], 'Supabase ez dago konfiguratuta.');
  }

  const normalizedLimit = normalizeLimit(filters.limit);
  const from = Math.max(0, Math.floor(filters.offset || 0));
  const to = from + normalizedLimit - 1;
  let query = supabase
    .from('lexical_editorial_priority_queue')
    .select('*')
    .order('priority_score', { ascending: false })
    .order('reviewed_level', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true }) as unknown as SupabaseCoverageQuery;

  if (filters.priorityBand && filters.priorityBand !== 'all') query = query.eq('priority_band', filters.priorityBand);
  if (filters.level && filters.level !== 'all') query = query.eq('reviewed_level', filters.level);
  if (filters.category && filters.category !== 'all') query = query.eq('category', filters.category);
  if (filters.questionType && filters.questionType !== 'all') query = query.eq('recommended_question_type', filters.questionType);
  if (filters.missingExplanationOnly) query = query.eq('has_explanation_short', false);
  if (filters.missingExampleOnly) query = query.eq('has_good_example', false);
  if (filters.missingContrastOnly) query = query.eq('has_contrast_note', false);

  const { data, error } = await query.range(from, to);

  if (error) {
    const missingView = isMissingViewError(error);
    if (!missingView) {
      observabilityService.captureError('corpus_coverage.fetch_editorial_priority_failed', 'supabase', error, { filters });
    }
    return emptyResult<EditorialPriorityRow[]>(
      [],
      'Lehentasun editorialaren datuak ez daude oraindik eskuragarri.',
      missingView
    );
  }

  return emptyResult((data || []) as EditorialPriorityRow[]);
}

export async function fetchDuplicateSummary(): Promise<CoverageQueryResult<DuplicateSummary | null>> {
  const result = await fetchSingle<DuplicateSummary>('lexical_duplicate_summary');
  if (result.missingView) {
    return emptyResult<DuplicateSummary | null>(null, 'Bikoiztuen datuak ez daude oraindik eskuragarri.', true);
  }

  return result;
}

export async function fetchDuplicateExactRows(filters: { limit?: number; offset?: number } = {}): Promise<CoverageQueryResult<DuplicateExactRow[]>> {
  const supabase = getSupabase();
  if (!supabase) {
    return emptyResult<DuplicateExactRow[]>([], 'Supabase ez dago konfiguratuta.');
  }

  const normalizedLimit = normalizeLimit(filters.limit);
  const from = Math.max(0, Math.floor(filters.offset || 0));
  const to = from + normalizedLimit - 1;
  const { data, error } = await supabase
    .from('lexical_duplicate_exact_view')
    .select('*')
    .order('duplicate_count', { ascending: false })
    .order('normalized_word_set', { ascending: true })
    .range(from, to);

  if (error) {
    const missingView = isMissingViewError(error);
    if (!missingView) {
      observabilityService.captureError('corpus_coverage.fetch_duplicates_failed', 'supabase', error, { filters });
    }
    return emptyResult<DuplicateExactRow[]>([], 'Bikoiztuen datuak ez daude oraindik eskuragarri.', missingView);
  }

  return emptyResult((data || []) as DuplicateExactRow[]);
}

export async function fetchDuplicateGroupsForSet(duplicateSetId: number): Promise<CoverageQueryResult<DuplicateGroup[]>> {
  const supabase = getSupabase();
  if (!supabase) {
    return emptyResult<DuplicateGroup[]>([], 'Supabase ez dago konfiguratuta.');
  }

  const { data, error } = await supabase
    .from('lexical_duplicate_groups')
    .select('*')
    .eq('duplicate_set_id', duplicateSetId)
    .order('is_canonical_candidate', { ascending: false })
    .order('canonical_candidate_score', { ascending: false })
    .order('group_id', { ascending: true });

  if (error) {
    const missingView = isMissingViewError(error);
    if (!missingView) {
      observabilityService.captureError('corpus_coverage.fetch_duplicate_groups_failed', 'supabase', error, { duplicateSetId });
    }
    return emptyResult<DuplicateGroup[]>([], 'Bikoiztuen datuak ez daude oraindik eskuragarri.', missingView);
  }

  return emptyResult((data || []) as DuplicateGroup[]);
}
