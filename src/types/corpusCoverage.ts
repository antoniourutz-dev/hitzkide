export type CoverageStatus =
  | 'playable'
  | 'inactive'
  | 'disabled_for_game'
  | 'needs_external_check'
  | 'high_risk'
  | 'low_quality'
  | 'missing_quality_level'
  | 'missing_question_type'
  | 'unknown_question_type'
  | 'not_enough_words'
  | 'missing_explanation'
  | 'missing_examples'
  | 'not_reviewed_safe'
  | 'wrong_option_count'
  | 'wrong_correct_option_count'
  | 'missing_question_explanation_eu'
  | 'missing_option_explanation_eu'
  | 'possible_english_in_es_fields';

export interface LexicalCoverageRow {
  id: number;
  source_id: number | null;
  group_label: string | null;
  concept: string | null;
  category: string | null;
  subcategory: string | null;
  grammar: string | null;
  relation: string | null;
  original_level: string | null;
  reviewed_level: string | null;
  recommended_question_type: string | null;
  review_status: string | null;
  risk_level: string | null;
  quality_level: string | null;
  is_active: boolean | null;
  word_count: number;
  has_sensitive_word: boolean;
  has_explanation_short: boolean;
  has_explanation_long: boolean;
  has_good_example: boolean;
  has_contrast_note: boolean;
  is_playable: boolean;
  coverage_status: CoverageStatus | string;
  recommended_action: string | null;
}

export interface LexicalCoverageSummary {
  total_groups: number;
  active_groups: number;
  playable_groups: number;
  non_playable_groups: number;
  playable_percentage: number;
  disabled_for_game_count: number;
  needs_external_check_count: number;
  high_risk_count: number;
  low_quality_count: number;
  missing_quality_level_count: number;
  missing_question_type_count: number;
  unknown_question_type_count: number;
  not_enough_words_count: number;
  missing_explanation_count: number;
  missing_examples_count: number;
  platinum_count: number;
  gold_count: number;
  silver_count: number;
  bronze_count: number;
  playable_basic_count: number;
  playable_premium_count: number;
}

export interface CoverageDistributionRow {
  label: string;
  total_count: number;
  playable_count: number;
  non_playable_count?: number;
  playable_percentage?: number;
}

export interface DiscourseCoverageSummary {
  total_questions: number;
  active_questions: number;
  playable_questions: number;
  four_option_questions: number;
  single_correct_option_questions: number;
  missing_explanation_count: number;
  possible_english_in_es_fields_count: number;
}

export interface DiscourseCoverageRow {
  question_id: number;
  passage_id: number | null;
  answer: string | null;
  normalized_answer: string | null;
  level: string | null;
  difficulty: string | null;
  discursive_function: string | null;
  skill_focus: string | null;
  quality_level: string | null;
  risk_level: string | null;
  review_status: string | null;
  is_active: boolean | null;
  option_count: number;
  correct_option_count: number;
  has_question_explanation_eu: boolean;
  all_options_have_explanation_eu: boolean;
  possible_english_in_es_fields: boolean;
  is_playable: boolean;
  coverage_status: CoverageStatus | string;
  recommended_action: string | null;
}

export type EditorialPriorityBand =
  | 'oso_handia'
  | 'handia'
  | 'ertaina'
  | 'baxua';

export interface EditorialPriorityRow {
  id: number;
  source_id: number | null;
  group_label: string | null;
  concept: string | null;
  category: string | null;
  subcategory: string | null;
  grammar: string | null;
  relation: string | null;
  original_level: string | null;
  reviewed_level: string | null;
  recommended_question_type: string | null;
  review_status: string | null;
  risk_level: string | null;
  quality_level: string | null;
  is_active: boolean | null;
  word_count: number;
  has_explanation_short: boolean;
  has_explanation_long: boolean;
  has_good_example: boolean;
  has_contrast_note: boolean;
  is_playable: boolean;
  coverage_status: string;
  priority_score: number;
  priority_band: EditorialPriorityBand | string;
  priority_reasons: string[];
  editorial_next_action: string | null;
}

export interface EditorialPrioritySummary {
  total_priority_items: number;
  very_high_priority_count: number;
  high_priority_count: number;
  medium_priority_count: number;
  low_priority_count: number;
  missing_explanation_in_priority_count: number;
  missing_example_in_priority_count: number;
  missing_contrast_in_priority_count: number;
  average_priority_score: number;
}

export interface CoverageQueryResult<T> {
  data: T;
  error: string | null;
  missingView: boolean;
}

export interface LexicalCoverageFilters {
  status?: 'all' | 'playable' | 'non_playable' | 'high_risk' | 'needs_external_check' | 'disabled_for_game' | 'missing_explanation' | 'missing_examples';
  level?: string;
  category?: string;
  questionType?: string;
  limit?: number;
  offset?: number;
}

export interface EditorialPriorityFilters {
  limit?: number;
  offset?: number;
  priorityBand?: EditorialPriorityBand | 'all';
  level?: string;
  category?: string;
  questionType?: string;
  missingExplanationOnly?: boolean;
  missingExampleOnly?: boolean;
  missingContrastOnly?: boolean;
}

export interface DuplicateSummary {
  duplicate_set_count: number;
  duplicated_group_count: number;
  active_duplicated_group_count: number;
  playable_duplicated_group_count: number;
  exact_duplicate_set_count: number;
  pending_duplicate_set_count: number;
  resolved_duplicate_set_count: number;
}

export interface DuplicateExactRow {
  normalized_word_set: string;
  duplicate_count: number;
  group_ids: number[];
  source_ids: Array<number | null>;
  labels: Array<string | null>;
  quality_levels: Array<string | null>;
  review_statuses: Array<string | null>;
  active_flags: boolean[];
  playable_flags: boolean[];
}

export interface DuplicateSet {
  id: number;
  duplicate_set_key: string;
  normalized_word_set: string;
  duplicate_count: number;
  canonical_group_id: number | null;
  duplicate_type: 'exact' | 'near' | 'subset' | 'manual' | string;
  decision_status: 'pending' | 'reviewed' | 'resolved' | 'ignored' | string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DuplicateGroup {
  id: number;
  duplicate_set_id: number;
  group_id: number;
  source_id: number | null;
  group_label: string | null;
  quality_level: string | null;
  review_status: string | null;
  risk_level: string | null;
  is_active: boolean | null;
  is_playable: boolean | null;
  canonical_candidate_score: number;
  is_canonical_candidate: boolean;
  suggested_action: string;
  created_at: string | null;
}
