import { ClozeSession, ClozeMastery } from './cloze';
import { DiscourseClozeSession, DiscourseClozeMastery } from './discourseCloze';
import { GameQuestion } from './question';

export interface StatusChange {
  groupId: number;
  concept: string;
  oldStatus: MasteryStatus;
  newStatus: MasteryStatus;
}

export type UserLevel = 'B1' | 'B2' | 'C1' | 'C2' | 'Aditua';

export type MasteryStatus = 'new' | 'seen' | 'learning' | 'reviewing' | 'known' | 'mastered';

export interface ItemMastery {
  timesSeen: number;
  timesCorrect: number;
  timesWrong: number;
  masteryScore: number; // 0 to 5
  status: MasteryStatus;
  lastSeenAt: string | null;
  nextReviewAt: string | null;
  correctStreak: number;
  wrongStreak: number;
  level?: string;
}

export interface PlayerProfile {
  installationId: string;
  currentLevel: UserLevel;
  unlockedLevels: UserLevel[];
  stats: {
    totalSessions: number;
    totalQuestions: number;
    totalCorrect: number;
    globalAccuracy: number;
    currentStreak: number;
    bestStreak: number;
    lastPlayedDate: string | null;
    dailySessionsCount: number;
  };
  groupMastery: Record<number, ItemMastery>; // groupId -> mastery
  wordMastery: Record<number, ItemMastery>;  // wordId -> mastery
  clozeSessions: ClozeSession[];
  clozeMastery: Record<number, ClozeMastery>;
  discourseClozeSessions?: DiscourseClozeSession[];
  discourseClozeMastery?: Record<number, DiscourseClozeMastery>;
  lastLevelUp: {
    fromLevel: UserLevel;
    toLevel: UserLevel;
    date: string;
    seen: boolean;
  } | null;
  recentAnswers: { 
    isCorrect: boolean; 
    level?: UserLevel; // fallback for old answers
    contentLevel?: string | null;
    playerLevelAtAnswer?: UserLevel;
    groupId?: number;
    promptWordId?: number;
    correctWordId?: number;
    selectedWordId?: number;
    answeredAt?: string;
  }[]; // For level up checks (last N answers)
  sessions?: SessionResult[];
  
  // Sync metadata
  syncStatus?: 'loading' | 'synced' | 'pending' | 'error' | 'auth_required';
  lastCloudSyncAt?: string;
  cloudUserId?: string;
}

export interface AnswerResult {
  questionId: string;
  groupId: number;
  promptWordId: number;
  correctWordId: number;
  selectedOptionId?: number;
  selectedAnswer?: string;
  correctAnswer: string;
  isCorrect: boolean;
  answeredAt: string;
  level: UserLevel;
  questionType: string;
  playerLevelAtAnswer?: UserLevel;
  contentLevel?: string | null;
  selectedWordId?: number;
}

export interface DayResult {
  date: string;
  score: number;
  total: number;
  answers: AnswerResult[];
}

export interface UserStats {
  totalGamesPlayed: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  bestScore: number;
  currentStreak: number;
  lastPlayedDate: string | null;
  history: Record<string, DayResult>;
}

export interface SessionResult {
  score: number;
  total: number;
  questions: GameQuestion[];
  answers: AnswerResult[];
  level?: UserLevel;
  mode?: string;
  startedAt?: string;
  finishedAt?: string;
  statusChanges: StatusChange[];
}

export interface LevelProgress {
  totalProgress: number;
  questionProgress: number;
  accuracyProgress: number;
  masteryProgress: number;
  reviewProgress: number;
  missingRequirements: {
    label: string,
    current: number | string,
    target: number | string,
    isMet: boolean
  }[];
  isCompensated?: boolean;
}
