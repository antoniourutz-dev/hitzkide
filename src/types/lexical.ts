export interface LexicalWord {
  id: number;
  group_id?: number;
  word: string;
  learner_level: string | null;
  frequency: string | null;
  register: string | null;
  dialect: string | null;
  status: string | null;
  note: string | null;
}

export interface LexicalGroup {
  id: number;
  source_id: number | null;
  concept: string | null;
  meaning_es: string | null;
  category: string | null;
  subcategory: string | null;
  grammar: string | null;
  relation: string | null;
  original_level?: string | null;
  reviewed_level: string | null;
  recommended_question_type: string | null;
  review_status: string | null;
  is_active: boolean;
  words: LexicalWord[];
  risk_level?: 'low' | 'medium' | 'high' | null;
  quality_level?: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  explanation_short?: string | null;
  explanation_long?: string | null;
  usage_warning?: string | null;
  good_example?: string | null;
  bad_example?: string | null;
  contrast_note?: string | null;
  teaching_tip?: string | null;
  explanation_short_eu?: string | null;
  explanation_long_eu?: string | null;
  usage_warning_eu?: string | null;
  good_example_eu?: string | null;
  bad_example_eu?: string | null;
  contrast_note_eu?: string | null;
  teaching_tip_eu?: string | null;
}
