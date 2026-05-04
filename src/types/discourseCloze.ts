export type DiscourseClozeLevel =
  | 'B1'
  | 'B2'
  | 'C1'
  | 'C2'
  | 'Aditua';

export type DiscourseClozeDifficulty =
  | 'easy'
  | 'medium'
  | 'hard'
  | 'expert';

export type DiscourseClozeMode =
  | 'normal'
  | 'aditua'
  | 'review';

export type DiscourseClozeQualityLevel =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum';

export type DiscourseClozeRiskLevel =
  | 'low'
  | 'medium'
  | 'high';

export type DiscourseClozeReviewStatus =
  | 'pending'
  | 'reviewed_safe'
  | 'reviewed_context_needed'
  | 'reviewed_register_sensitive'
  | 'needs_external_check'
  | 'disabled_for_game';

export interface DiscourseClozeQuestion {
  id: number;
  passage_id: number | null;
  target_marker_id: number | null;
  target_function_id: number | null;

  level: DiscourseClozeLevel;
  difficulty: DiscourseClozeDifficulty;
  mode: DiscourseClozeMode;

  sentence_eu: string;
  sentence_with_blank_eu: string;

  answer: string;
  normalized_answer: string;

  options: string[];

  discursive_function: string;

  correct_answer_reason_eu: string;
  correct_answer_reason_es?: string | null;

  nuance_note_eu?: string | null;
  nuance_note_es?: string | null;

  possible_alternatives_eu?: string | null;
  possible_alternatives_es?: string | null;

  register_note_eu?: string | null;
  register_note_es?: string | null;

  not_to_use_eu?: string | null;
  not_to_use_es?: string | null;

  teacher_note?: string | null;

  skill_focus: string;
  quality_level: DiscourseClozeQualityLevel;
  risk_level: DiscourseClozeRiskLevel;
  review_status: DiscourseClozeReviewStatus;

  is_active: boolean;

  created_at?: string | null;
  updated_at?: string | null;
}

export interface DiscourseClozeOptionExplanation {
  id: number;
  question_id: number;

  option_text: string;
  normalized_option: string;
  option_order: number;
  is_correct: boolean;

  explanation_eu: string;
  explanation_es?: string | null;

  discursive_relation_eu?: string | null;
  discursive_relation_es?: string | null;

  why_fits_eu?: string | null;
  why_fits_es?: string | null;

  why_not_eu?: string | null;
  why_not_es?: string | null;

  register_note_eu?: string | null;
  register_note_es?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
}

export interface DiscourseClozeAnswerResult {
  questionId: number;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  answeredAt: string;
  level: DiscourseClozeLevel;
  skillFocus: string;
  discursiveFunction: string;
}

export interface DiscourseClozeSession {
  sessionId: string;
  type: 'discourse_cloze';
  startedAt: string;
  finishedAt?: string;
  level: DiscourseClozeLevel;
  questions: DiscourseClozeQuestion[];
  answers: DiscourseClozeAnswerResult[];
  score: number;
  total: number;
  completed: boolean;
}

export interface DiscourseClozeMastery {
  questionId: number;
  level: DiscourseClozeLevel;
  skillFocus: string;
  discursiveFunction: string;

  timesSeen: number;
  timesCorrect: number;
  timesWrong: number;

  masteryScore: number;

  status:
    | 'new'
    | 'seen'
    | 'learning'
    | 'reviewing'
    | 'known'
    | 'mastered';

  lastSeenAt: string | null;
  nextReviewAt: string | null;

  correctStreak: number;
  wrongStreak: number;
}

export interface DiscourseClozeStats {
  totalSessions: number;
  totalAnswers: number;
  totalCorrect: number;
  totalWrong: number;
  accuracy: number;

  currentStreak: number;
  bestStreak: number;

  byLevel: Record<string, {
    total: number;
    correct: number;
    accuracy: number;
  }>;

  byDiscursiveFunction: Record<string, {
    total: number;
    correct: number;
    accuracy: number;
  }>;

  bySkillFocus: Record<string, {
    total: number;
    correct: number;
    accuracy: number;
  }>;

  masterySummary: {
    new: number;
    seen: number;
    learning: number;
    reviewing: number;
    known: number;
    mastered: number;
  };

  weakestFunctions: Array<{
    discursiveFunction: string;
    total: number;
    correct: number;
    accuracy: number;
  }>;

  questionsToReview: number;
}
