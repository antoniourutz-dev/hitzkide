export type ClozeLevel = 'B1' | 'B2' | 'C1' | 'C2' | 'Aditua';

export type ClozeDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type ClozeMode = 'normal' | 'aditua';

export type ClozeQualityLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export type ClozeRiskLevel = 'low' | 'medium' | 'high';

export type ClozeSkillFocus =
  | 'esanahia'
  | 'testuingurua'
  | 'erregistroa'
  | 'intentsitatea'
  | 'lokailuak'
  | 'administrazio_hizkera'
  | 'argudio_idazkera'
  | 'ñabardura';

export interface LexicalClozeQuestion {
  id: number;
  group_id: number | null;
  source_id: number | null;

  level: ClozeLevel;
  difficulty: ClozeDifficulty | null;
  mode: ClozeMode | null;

  sentence_eu: string;
  answer: string;
  options: string[];

  explanation_eu?: string | null;
  explanation_es?: string | null;
  nuance_note_eu?: string | null;
  nuance_note_es?: string | null;
  why_not_eu?: string | null;
  why_not_es?: string | null;

  register_focus?: string | null;
  skill_focus?: ClozeSkillFocus | string | null;

  quality_level?: ClozeQualityLevel | string | null;
  risk_level?: ClozeRiskLevel | string | null;

  is_active: boolean;
}

export interface ClozeAnswerResult {
  questionId: number;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  answeredAt: string;
  level: ClozeLevel;
  difficulty?: ClozeDifficulty | null;
  skillFocus?: string | null;
}

export interface ClozeSession {
  sessionId: string;
  type: 'cloze';
  startedAt: string;
  finishedAt?: string;
  level: ClozeLevel;
  questions: LexicalClozeQuestion[];
  answers: ClozeAnswerResult[];
  score: number;
  total: number;
  completed: boolean;
}

export interface ClozeMastery {
  questionId: number;
  level: ClozeLevel;
  timesSeen: number;
  timesCorrect: number;
  timesWrong: number;
  masteryScore: number;
  status: 'new' | 'seen' | 'learning' | 'reviewing' | 'known' | 'mastered';
  lastSeenAt: string | null;
  nextReviewAt: string | null;
  correctStreak: number;
  wrongStreak: number;
}
