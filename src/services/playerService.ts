import { getSupabase } from '../lib/supabase';
import { PlayerProfile, UserLevel, MasteryStatus, ItemMastery, SessionResult, AnswerResult, StatusChange } from '../types/stats';
import { ClozeSession } from '../types/cloze';
import { DiscourseClozeSession, DiscourseClozeLevel } from '../types/discourseCloze';
import { GameQuestion } from '../types/question';
import { observabilityService } from '../analytics/observabilityService';
import { authService } from './authService';
import { createClientId } from '../lib/id';

type NormalizedAnswer = {
  isCorrect: boolean;
  level?: UserLevel;
  playerLevelAtAnswer?: UserLevel;
  contentLevel?: string | null;
  groupId?: number;
  promptWordId?: number;
  correctWordId?: number;
  selectedWordId?: number;
  answeredAt?: string;
};

const LEGACY_PLAYER_KEY = 'hitzkideak_player_profile';
const PLAYER_PROFILE_UPDATED_EVENT = 'hitzkideak:player-profile-updated';
const MAX_RECENT_ANSWERS = 500;
const MAX_STANDARD_SESSIONS = 120;
const MAX_CLOZE_SESSIONS = 120;
const MAX_DISCOURSE_SESSIONS = 120;
const AUTH_SESSION_TIMEOUT_MS = 4000;
const SUPABASE_READ_TIMEOUT_MS = 8000;
const SUPABASE_WRITE_TIMEOUT_MS = 10000;
let authenticatedProfileSyncPromise: Promise<PlayerProfile> | null = null;
let authenticatedProfileSyncUserId: string | null = null;
let currentUserId: string | null = null;

const LEVEL_ORDER: UserLevel[] = ['B1', 'B2', 'C1', 'C2', 'Aditua'];
const VALID_LEVELS = new Set<UserLevel>(LEVEL_ORDER);

function createEmptyStats(): PlayerProfile['stats'] {
  return {
    totalSessions: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    globalAccuracy: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastPlayedDate: null,
    dailySessionsCount: 0
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        globalThis.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        globalThis.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function createInitialProfile(syncStatus: PlayerProfile['syncStatus'] = 'loading'): PlayerProfile {
  return {
    installationId: createClientId('installation'),
    currentLevel: 'B1',
    unlockedLevels: ['B1'],
    stats: createEmptyStats(),
    groupMastery: {},
    wordMastery: {},
    clozeSessions: [],
    clozeMastery: {},
    discourseClozeSessions: [],
    discourseClozeMastery: {},
    lastLevelUp: null,
    recentAnswers: [],
    syncStatus,
  };
}

let currentProfile: PlayerProfile = createInitialProfile();

function isValidLevel(level: unknown): level is UserLevel {
  return typeof level === 'string' && VALID_LEVELS.has(level as UserLevel);
}

function getLevelRank(level: UserLevel): number {
  return LEVEL_ORDER.indexOf(level);
}

function trimToMax<T>(items: T[], max: number): T[] {
  return items.length <= max ? items : items.slice(-max);
}

function dedupeBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const deduped = new Map<string, T>();
  items.forEach((item) => {
    deduped.set(getKey(item), item);
  });
  return Array.from(deduped.values());
}

function getSessionTimestamp(session: { finishedAt?: string; startedAt?: string }): string {
  return session.finishedAt || session.startedAt || '';
}

function buildRecentAnswerKey(answer: NormalizedAnswer): string {
  return [
    answer.answeredAt || '',
    answer.groupId ?? '',
    answer.promptWordId ?? '',
    answer.correctWordId ?? '',
    answer.selectedWordId ?? '',
    answer.isCorrect ? '1' : '0',
    answer.playerLevelAtAnswer || answer.level || ''
  ].join('|');
}

function buildStandardSessionKey(session: SessionResult): string {
  return [
    getSessionTimestamp(session),
    session.mode || '',
    session.score,
    session.total
  ].join('|');
}

function buildClozeSessionKey(session: ClozeSession): string {
  return session.sessionId || [getSessionTimestamp(session), session.level, session.score, session.total].join('|');
}

function buildDiscourseSessionKey(session: DiscourseClozeSession): string {
  return session.sessionId || [getSessionTimestamp(session), session.level, session.score, session.total].join('|');
}

function compactStandardSession(session: SessionResult): SessionResult {
  return {
    ...session,
    questions: []
  };
}

function compactClozeSession(session: ClozeSession): ClozeSession {
  return {
    ...session,
    questions: []
  };
}

function compactDiscourseSession(session: DiscourseClozeSession): DiscourseClozeSession {
  return {
    ...session,
    questions: []
  };
}

function getUniqueSortedSessionDates(sessions: SessionResult[]): string[] {
  return Array.from(new Set(
    sessions
      .map((session) => getSessionTimestamp(session))
      .filter(Boolean)
      .map((timestamp) => timestamp.split('T')[0])
  )).sort();
}

function calculateCurrentStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0;

  let streak = 1;
  for (let index = sortedDates.length - 1; index > 0; index -= 1) {
    const current = new Date(sortedDates[index]);
    const previous = new Date(sortedDates[index - 1]);
    const diff = Math.round((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      streak += 1;
      continue;
    }
    break;
  }

  return streak;
}

function calculateBestStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0;

  let best = 1;
  let current = 1;

  for (let index = 1; index < sortedDates.length; index += 1) {
    const date = new Date(sortedDates[index]);
    const previous = new Date(sortedDates[index - 1]);
    const diff = Math.round((date.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 1) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

function calculateStatsFromSessions(sessions: SessionResult[]): PlayerProfile['stats'] {
  if (sessions.length === 0) {
    return createEmptyStats();
  }

  const totalSessions = sessions.length;
  const totalQuestions = sessions.reduce((sum, session) => sum + session.total, 0);
  const totalCorrect = sessions.reduce((sum, session) => sum + session.score, 0);
  const sortedDates = getUniqueSortedSessionDates(sessions);
  const lastPlayedDate = sortedDates.at(-1) || null;
  const dailySessionsCount = lastPlayedDate
    ? sessions.filter((session) => getSessionTimestamp(session).startsWith(lastPlayedDate)).length
    : 0;

  return {
    totalSessions,
    totalQuestions,
    totalCorrect,
    globalAccuracy: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
    currentStreak: calculateCurrentStreak(sortedDates),
    bestStreak: calculateBestStreak(sortedDates),
    lastPlayedDate,
    dailySessionsCount
  };
}

function applyRetentionPolicy(profile: PlayerProfile): PlayerProfile {
  profile.recentAnswers = trimToMax(
    dedupeBy(profile.recentAnswers || [], buildRecentAnswerKey)
      .sort((a, b) => (a.answeredAt || '').localeCompare(b.answeredAt || '')),
    MAX_RECENT_ANSWERS
  );

  if (profile.sessions) {
    profile.sessions = trimToMax(
      dedupeBy(profile.sessions.map(compactStandardSession), buildStandardSessionKey)
        .sort((a, b) => getSessionTimestamp(a).localeCompare(getSessionTimestamp(b))),
      MAX_STANDARD_SESSIONS
    );
  }

  profile.clozeSessions = trimToMax(
    dedupeBy((profile.clozeSessions || []).map(compactClozeSession), buildClozeSessionKey)
      .sort((a, b) => getSessionTimestamp(a).localeCompare(getSessionTimestamp(b))),
    MAX_CLOZE_SESSIONS
  );

  profile.discourseClozeSessions = trimToMax(
    dedupeBy((profile.discourseClozeSessions || []).map(compactDiscourseSession), buildDiscourseSessionKey)
      .sort((a, b) => getSessionTimestamp(a).localeCompare(getSessionTimestamp(b))),
    MAX_DISCOURSE_SESSIONS
  );

  return profile;
}

function cloneProfile(profile: PlayerProfile): PlayerProfile {
  return typeof structuredClone === 'function'
    ? structuredClone(profile)
    : JSON.parse(JSON.stringify(profile)) as PlayerProfile;
}

function normalizeLoadedProfile(rawProfile: Partial<PlayerProfile> | null | undefined): PlayerProfile {
  const base = createInitialProfile();
  const profile: PlayerProfile = {
    ...base,
    ...(rawProfile || {}),
    currentLevel: isValidLevel(rawProfile?.currentLevel) ? rawProfile.currentLevel : base.currentLevel,
    unlockedLevels: (rawProfile?.unlockedLevels || base.unlockedLevels).filter(isValidLevel),
    stats: {
      ...base.stats,
      ...(rawProfile?.stats || {})
    },
    groupMastery: { ...(rawProfile?.groupMastery || {}) },
    wordMastery: { ...(rawProfile?.wordMastery || {}) },
    clozeSessions: rawProfile?.clozeSessions ? [...rawProfile.clozeSessions] : [],
    clozeMastery: { ...(rawProfile?.clozeMastery || {}) },
    discourseClozeSessions: rawProfile?.discourseClozeSessions ? [...rawProfile.discourseClozeSessions] : [],
    discourseClozeMastery: { ...(rawProfile?.discourseClozeMastery || {}) },
    lastLevelUp: rawProfile?.lastLevelUp || null,
    recentAnswers: rawProfile?.recentAnswers ? [...rawProfile.recentAnswers] : [],
    sessions: rawProfile?.sessions ? [...rawProfile.sessions] : []
  };

  if (!profile.unlockedLevels.includes(profile.currentLevel)) {
    profile.unlockedLevels = Array.from(new Set([...profile.unlockedLevels, profile.currentLevel]))
      .sort((left, right) => getLevelRank(left) - getLevelRank(right));
  }

  return applyRetentionPolicy(profile);
}

function getLegacyStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readLegacyLocalProfile(): PlayerProfile | null {
  const storage = getLegacyStorage();
  if (!storage) return null;

  const rawValue = storage.getItem(LEGACY_PLAYER_KEY);
  if (!rawValue) return null;

  try {
    return normalizeLoadedProfile(JSON.parse(rawValue) as PlayerProfile);
  } catch {
    storage.removeItem(LEGACY_PLAYER_KEY);
    return null;
  }
}

function clearLegacyLocalProfile(): void {
  const storage = getLegacyStorage();
  if (!storage) return;

  storage.removeItem(LEGACY_PLAYER_KEY);
}

function profileHasMeaningfulProgress(profile: PlayerProfile): boolean {
  const normalized = normalizeLoadedProfile(profile);

  return (
    normalized.stats.totalSessions > 0 ||
    normalized.stats.totalQuestions > 0 ||
    (normalized.sessions?.length || 0) > 0 ||
    normalized.recentAnswers.length > 0 ||
    normalized.clozeSessions.length > 0 ||
    (normalized.discourseClozeSessions?.length || 0) > 0 ||
    Object.keys(normalized.groupMastery).length > 0 ||
    Object.keys(normalized.wordMastery).length > 0 ||
    Object.keys(normalized.clozeMastery).length > 0 ||
    Object.keys(normalized.discourseClozeMastery || {}).length > 0 ||
    normalized.currentLevel !== 'B1' ||
    normalized.unlockedLevels.length > 1
  );
}

function notifyProfileUpdated() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(PLAYER_PROFILE_UPDATED_EVENT));
}

function setCurrentProfile(profile: PlayerProfile, options?: { notify?: boolean }) {
  currentProfile = normalizeLoadedProfile(profile);

  if (options?.notify !== false) {
    notifyProfileUpdated();
  }
}

async function resolveAuthenticatedUserId(): Promise<string | null> {
  if (currentUserId) {
    return currentUserId;
  }

  const user = await authService.getCurrentUser();
  currentUserId = user?.id ?? null;
  return currentUserId;
}

function createProgressSyncError(reason: 'auth_required' | 'sync_failed'): Error {
  const error = new Error(reason);
  error.name = 'ProgressSyncError';
  return error;
}

const LEVEL_CRITERIA: Record<UserLevel, { 
  questions: number, 
  accuracy: number, 
  mastery: number, 
  review: number,
  minMastery: number 
}> = {
  'B1': { questions: 40, accuracy: 0.75, mastery: 0.45, review: 0.25, minMastery: 0.35 },
  'B2': { questions: 60, accuracy: 0.78, mastery: 0.55, review: 0.20, minMastery: 0.45 },
  'C1': { questions: 80, accuracy: 0.80, mastery: 0.65, review: 0.15, minMastery: 0.55 },
  'C2': { questions: 100, accuracy: 0.85, mastery: 0.75, review: 0.10, minMastery: 0.65 },
  'Aditua': { questions: 100, accuracy: 0.85, mastery: 0.75, review: 0.10, minMastery: 0.65 } // Placeholder
};

export const playerService = {
  // Helper to get effective criteria including compensation
  getLevelCriteria(level: UserLevel, totalCount: number, recentAccuracy: number, reviewingRatio: number) {
    const base = LEVEL_CRITERIA[level] || LEVEL_CRITERIA['B1'];
    
    // Excellence Compensation
    let effectiveMastery = base.mastery;
    let isCompensated = false;
    if (
      totalCount >= base.questions * 3 &&
      recentAccuracy >= base.accuracy + 0.10 &&
      reviewingRatio <= base.review * 0.6
    ) {
      effectiveMastery = Math.max(base.minMastery, base.mastery - 0.10);
      isCompensated = true;
    }
    
    return { ...base, effectiveMastery, isCompensated };
  },

  getProfile(): PlayerProfile {
    return cloneProfile(currentProfile);
  },

  resetProfile(syncStatus: PlayerProfile['syncStatus'] = 'auth_required') {
    currentUserId = null;
    setCurrentProfile(createInitialProfile(syncStatus));
    return this.getProfile();
  },

  saveClozeSession(session: ClozeSession) {
    const profile = this.getProfile();
    session.answers.forEach((answer) => {
      const question = session.questions.find((item) => item.id === answer.questionId);
      if (question) {
        this.updateClozeMastery(question.id, answer.isCorrect, question.level, profile);
      }
    });
    profile.clozeSessions.push(compactClozeSession(session));
    this.saveProfile(profile);
  },

  async persistClozeSession(session: ClozeSession) {
    await this.commitCloudProfileChange(() => {
      this.saveClozeSession(session);
      return session;
    });
    observabilityService.trackFeatureUsage('cloze', session.questions[0]?.mode || 'normal', 'completed', {
      total: session.total,
      score: session.score,
      level: session.level,
    });
  },

  saveDiscourseClozeSession(session: DiscourseClozeSession) {
    const profile = this.getProfile();
    if (!profile.discourseClozeSessions) profile.discourseClozeSessions = [];
    session.answers.forEach((answer) => {
      const question = session.questions.find((item) => item.id === answer.questionId);
      if (question) {
        this.updateDiscourseClozeMastery(
          question.id,
          answer.isCorrect,
          question.level,
          question.skill_focus,
          question.discursive_function,
          profile
        );
      }
    });
    profile.discourseClozeSessions.push(compactDiscourseSession(session));
    this.saveProfile(profile);
  },

  async persistDiscourseClozeSession(session: DiscourseClozeSession) {
    await this.commitCloudProfileChange(() => {
      this.saveDiscourseClozeSession(session);
      return session;
    });
    observabilityService.trackFeatureUsage('discourse', session.questions[0]?.mode || 'normal', 'completed', {
      total: session.total,
      score: session.score,
      level: session.level,
    });
  },

  updateDiscourseClozeMastery(
    questionId: number,
    isCorrect: boolean,
    level: DiscourseClozeLevel,
    skillFocus: string,
    discursiveFunction: string,
    profileOverride?: PlayerProfile
  ) {
    const profile = profileOverride ?? this.getProfile();
    if (!profile.discourseClozeMastery) profile.discourseClozeMastery = {};
    
    const mastery = profile.discourseClozeMastery[questionId] || {
      questionId,
      level,
      skillFocus,
      discursiveFunction,
      timesSeen: 0,
      timesCorrect: 0,
      timesWrong: 0,
      masteryScore: 0,
      status: 'new',
      lastSeenAt: null,
      nextReviewAt: null,
      correctStreak: 0,
      wrongStreak: 0
    };

    mastery.timesSeen++;
    mastery.lastSeenAt = new Date().toISOString();
    
    if (isCorrect) {
      mastery.timesCorrect++;
      mastery.correctStreak++;
      mastery.wrongStreak = 0;
      if (mastery.masteryScore < 5) mastery.masteryScore++;
    } else {
      mastery.timesWrong++;
      mastery.wrongStreak++;
      mastery.correctStreak = 0;
      if (mastery.masteryScore > 0) mastery.masteryScore--;
    }

    if (!isCorrect) {
      mastery.status = 'reviewing';
    } else {
      if (mastery.masteryScore >= 5 && mastery.correctStreak >= 3) {
        mastery.status = 'mastered';
      } else if (mastery.masteryScore >= 4 && mastery.correctStreak >= 2) {
        mastery.status = 'known';
      } else {
        mastery.status = 'learning' as MasteryStatus;
      }
    }

    let nextReviewHours = 2; // Default 2 hours if wrong
    const ms = mastery.masteryScore;
    if (isCorrect) {
       if (ms === 0) nextReviewHours = 2; // prompt again soon
       else if (ms === 1) nextReviewHours = 6;
       else if (ms === 2) nextReviewHours = 24; // +1 day
       else if (ms === 3) nextReviewHours = 24 * 3; // +3 days
       else if (ms === 4) nextReviewHours = 24 * 7; // +7 days
       else if (ms === 5) nextReviewHours = 24 * 14; // +14 days
    }
    
    const nextDate = new Date();
    nextDate.setHours(nextDate.getHours() + nextReviewHours);
    mastery.nextReviewAt = nextDate.toISOString();

    profile.discourseClozeMastery[questionId] = mastery;
    if (!profileOverride) {
      this.saveProfile(profile);
    }

    return profile;
  },

  updateClozeMastery(questionId: number, isCorrect: boolean, level: UserLevel, profileOverride?: PlayerProfile) {
    const profile = profileOverride ?? this.getProfile();
    const mastery = profile.clozeMastery[questionId] || {
      questionId,
      level,
      timesSeen: 0,
      timesCorrect: 0,
      timesWrong: 0,
      masteryScore: 0,
      status: 'new',
      lastSeenAt: null,
      nextReviewAt: null,
      correctStreak: 0,
      wrongStreak: 0
    };

    mastery.timesSeen++;
    mastery.lastSeenAt = new Date().toISOString();
    
    if (isCorrect) {
      mastery.timesCorrect++;
      mastery.correctStreak++;
      mastery.wrongStreak = 0;
      if (mastery.masteryScore < 5) mastery.masteryScore++;
    } else {
      mastery.timesWrong++;
      mastery.wrongStreak++;
      mastery.correctStreak = 0;
      if (mastery.masteryScore > 0) mastery.masteryScore--;
      mastery.status = 'reviewing';
    }

    // Determine status
    const accuracy = (mastery.timesCorrect / mastery.timesSeen);
    if (!isCorrect) {
      mastery.status = 'reviewing';
    } else {
      if (mastery.timesSeen >= 5 && accuracy >= 0.8 && mastery.correctStreak >= 3 && mastery.masteryScore >= 5) {
        mastery.status = 'mastered';
      } else if (mastery.timesSeen >= 3 && mastery.timesCorrect >= 2 && accuracy >= 0.66 && mastery.correctStreak >= 2) {
        mastery.status = 'known';
      } else if (mastery.timesSeen > 1) {
        mastery.status = 'learning';
      } else {
        mastery.status = 'seen';
      }
    }

    profile.clozeMastery[questionId] = mastery;
    if (!profileOverride) {
      this.saveProfile(profile);
    }

    return profile;
  },

  saveProfile(profile: PlayerProfile, options?: { markPending?: boolean; preserveLocalTimestamp?: boolean; notify?: boolean }) {
    if (options?.markPending !== false) {
      profile.syncStatus = currentUserId ? 'pending' : 'auth_required';
    }

    setCurrentProfile(profile, { notify: options?.notify });
  },

  subscribeToProfileChanges(callback: () => void) {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const handler = () => callback();
    window.addEventListener(PLAYER_PROFILE_UPDATED_EVENT, handler);

    return () => {
      window.removeEventListener(PLAYER_PROFILE_UPDATED_EVENT, handler);
    };
  },

  async synchronizeAuthenticatedProfile(userId: string): Promise<PlayerProfile> {
    if (authenticatedProfileSyncPromise && authenticatedProfileSyncUserId === userId) {
      return authenticatedProfileSyncPromise;
    }

    const syncPromise = (async () => {
      currentUserId = userId;
      this.saveProfile({ ...this.getProfile(), syncStatus: 'loading' }, { markPending: false });
      const inMemoryProfile = this.getProfile();
      const legacyProfile = readLegacyLocalProfile();
      const cloudProfile = await this.loadProgressFromCloud(userId);

      if (cloudProfile) {
        clearLegacyLocalProfile();
        this.saveProfile(cloudProfile, { markPending: false });
        this.markSynced(cloudProfile.lastCloudSyncAt || new Date().toISOString());
        return this.getProfile();
      }

      const memoryHasProgress =
        inMemoryProfile.syncStatus !== 'loading' &&
        inMemoryProfile.syncStatus !== 'auth_required' &&
        profileHasMeaningfulProgress(inMemoryProfile);
      const legacyHasProgress = legacyProfile ? profileHasMeaningfulProgress(legacyProfile) : false;
      const localCandidate = memoryHasProgress && legacyHasProgress && legacyProfile
        ? this.mergeLocalAndCloudProgress(inMemoryProfile, legacyProfile)
        : memoryHasProgress
          ? inMemoryProfile
          : legacyHasProgress && legacyProfile
            ? legacyProfile
            : null;

      const seedProfile = localCandidate && profileHasMeaningfulProgress(localCandidate)
        ? localCandidate
        : createInitialProfile('pending');
      clearLegacyLocalProfile();
      return this.syncProgressToCloud(seedProfile, { userId, skipMerge: true });
    })().catch((error) => {
      this.markSyncError();
      observabilityService.captureError('sync.authenticated_profile_failed', 'sync', error, {
        userId,
      });
      return this.getProfile();
    }).finally(() => {
      if (authenticatedProfileSyncPromise === syncPromise) {
        authenticatedProfileSyncPromise = null;
        authenticatedProfileSyncUserId = null;
      }
    });

    authenticatedProfileSyncPromise = syncPromise;
    authenticatedProfileSyncUserId = userId;

    return syncPromise;
  },

  async triggerBackgroundSync() {
    const userId = await resolveAuthenticatedUserId();
    const profile = this.getProfile();
    return this.syncProgressToCloud(profile, userId ? { userId } : undefined);
  },

  async commitCloudProfileChange<T>(applyChange: () => T): Promise<T> {
    const previousProfile = this.getProfile();
    const result = applyChange();
    const syncedProfile = await this.triggerBackgroundSync();

    if (syncedProfile.syncStatus !== 'synced') {
      this.saveProfile(previousProfile, { markPending: false });
      throw createProgressSyncError(syncedProfile.syncStatus === 'auth_required' ? 'auth_required' : 'sync_failed');
    }

    return result;
  },

  updateSession(score: number, questions: GameQuestion[], answers: AnswerResult[], mode: string = 'main'): SessionResult {
    const profile = this.getProfile();
    const statusChanges: StatusChange[] = [];
    const now = new Date().toISOString();

    profile.stats.totalSessions += 1;
    profile.stats.totalQuestions += questions.length;
    profile.stats.totalCorrect += score;
    profile.stats.globalAccuracy = (profile.stats.totalCorrect / profile.stats.totalQuestions) * 100;

    // Update streak and daily session count
    const today = new Date().toISOString().split('T')[0];
    if (profile.stats.lastPlayedDate) {
      if (profile.stats.lastPlayedDate === today) {
        profile.stats.dailySessionsCount = (profile.stats.dailySessionsCount || 0) + 1;
      } else {
        profile.stats.dailySessionsCount = 1;
        const last = new Date(profile.stats.lastPlayedDate);
        const diff = Math.floor((new Date(today).getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          profile.stats.currentStreak += 1;
        } else if (diff > 1) {
          profile.stats.currentStreak = 1;
        }
      }
    } else {
      profile.stats.currentStreak = 1;
      profile.stats.dailySessionsCount = 1;
    }
    profile.stats.lastPlayedDate = today;
    profile.stats.bestStreak = Math.max(profile.stats.bestStreak, profile.stats.currentStreak);

    // Update Mastery for each question
    questions.forEach((q) => {
      const answer = answers.find(a => a.questionId === q.id);
      const isCorrect = answer?.isCorrect || false;

      // Update Group Mastery
      const oldGroupMastery = profile.groupMastery[q.groupId] || this.getInitialMastery();
      const oldStatus = oldGroupMastery.status;
      
      const newGroupMastery = this.calculateNextMastery(oldGroupMastery, isCorrect, now);
      newGroupMastery.level = q.level; // Save level metadata
      profile.groupMastery[q.groupId] = newGroupMastery;

      if (newGroupMastery.status !== oldStatus) {
        statusChanges.push({
          groupId: q.groupId,
          concept: q.concept,
          oldStatus,
          newStatus: newGroupMastery.status
        });
      }

      // Update Word Mastery (correct word)
      const oldWordMastery = profile.wordMastery[q.correctWord.id] || this.getInitialMastery();
      profile.wordMastery[q.correctWord.id] = this.calculateNextMastery(oldWordMastery, isCorrect, now);

      // Track recent answers for level up (keep all for accurate level-up tracking across sessions)
      profile.recentAnswers.push({ 
        isCorrect, 
        contentLevel: q.level,
        playerLevelAtAnswer: profile.currentLevel,
        groupId: q.groupId,
        promptWordId: q.promptWord?.id,
        correctWordId: q.correctWord.id,
        selectedWordId: answer?.selectedOptionId,
        answeredAt: now,
        level: (q.level as UserLevel) || profile.currentLevel // fallback
      });
    });

    // Check for Level Up
    this.checkLevelUp(profile);

    // Track session
    const sessionResult: SessionResult = {
      score,
      total: questions.length,
      questions,
      answers,
      statusChanges,
      level: profile.currentLevel,
      mode,
      startedAt: now, // Simplification: we don't have start time here, use now for both or rely on finishedAt
      finishedAt: now,
    };

    if (!profile.sessions) profile.sessions = [];
    profile.sessions.push(compactStandardSession(sessionResult));

    this.saveProfile(profile);

    return sessionResult;
  },

  async finalizeSession(score: number, questions: GameQuestion[], answers: AnswerResult[], mode: string = 'main') {
    const sessionResult = await this.commitCloudProfileChange(() => (
      this.updateSession(score, questions, answers, mode)
    ));
    observabilityService.trackFeatureUsage('synonym', mode, 'completed', {
      total: questions.length,
      score,
      level: sessionResult.level,
    });
    return sessionResult;
  },

  getInitialMastery(): ItemMastery {
    return {
      timesSeen: 0,
      timesCorrect: 0,
      timesWrong: 0,
      masteryScore: 0,
      status: 'new',
      lastSeenAt: null,
      nextReviewAt: null,
      correctStreak: 0,
      wrongStreak: 0
    };
  },

  calculateNextMastery(current: ItemMastery, isCorrect: boolean, now: string): ItemMastery {
    const next = { ...current };
    next.timesSeen += 1;
    next.lastSeenAt = now;

    if (isCorrect) {
      next.timesCorrect += 1;
      next.correctStreak += 1;
      next.wrongStreak = 0;
      next.masteryScore = Math.min(5, next.masteryScore + 1);
    } else {
      next.timesWrong += 1;
      next.wrongStreak += 1;
      next.correctStreak = 0;
      next.masteryScore = Math.max(0, next.masteryScore - 1);
    }

    // Determine status
    let status: MasteryStatus = next.status;
    const accuracy = (next.timesCorrect / next.timesSeen);

    if (!isCorrect) {
      status = 'reviewing';
    } else {
      if (next.timesSeen >= 5 && accuracy >= 0.8 && next.correctStreak >= 3 && next.masteryScore >= 5) {
        status = 'mastered';
      } else if (next.timesSeen >= 3 && next.timesCorrect >= 2 && accuracy >= 0.66 && next.correctStreak >= 2) {
        status = 'known';
      } else if (next.timesSeen > 1) {
        status = 'learning';
      } else {
        status = 'seen';
      }
    }
    next.status = status;

    // Schedule next review (simple SRS)
    let hours = 2; // default 2h for wrong
    if (isCorrect) {
      if (status === 'mastered') hours = 24 * 30; // 1 month
      else if (status === 'known') hours = 24 * 7; // 1 week
      else if (status === 'learning') hours = 24; // 1 day
      else hours = 12;
    }
    
    const nextDate = new Date(now);
    nextDate.setHours(nextDate.getHours() + hours);
    next.nextReviewAt = nextDate.toISOString();

    return next;
  },

  checkLevelUp(profile: PlayerProfile) {
    const currentIdx = LEVEL_ORDER.indexOf(profile.currentLevel);
    if (currentIdx === LEVEL_ORDER.length - 1) return; // Already max level

    const nextLevel = LEVEL_ORDER[currentIdx + 1];
    let canLevelUp = false;

    // Filter recent answers for the current level
    const allAnswers = this.getAllNormalizedAnswers(profile);
    const levelAnswers = allAnswers.filter((a) => {
      const answerLevel = a.playerLevelAtAnswer || a.level || profile.currentLevel;
      return answerLevel === profile.currentLevel;
    });
    const totalCount = levelAnswers.length;

    // Use level-specific mastery!
    const levelGroupMastery = this.buildLevelGroupMastery(profile, profile.currentLevel);
    const currentLevelGroups: ItemMastery[] = Object.values(levelGroupMastery);
      
    const reviewingCount = currentLevelGroups.filter(m => m.status === 'reviewing').length;
    const reviewingRatio = currentLevelGroups.length > 0 ? (reviewingCount / currentLevelGroups.length) : 0;

    const lastN = levelAnswers.slice(-40);
    const recentAccuracy = lastN.length > 0 ? (lastN.filter(a => a.isCorrect).length / lastN.length) : 0;

    const criteria = this.getLevelCriteria(profile.currentLevel, totalCount, recentAccuracy, reviewingRatio);

    const getKnowledgeScoreForGroup = (m: ItemMastery): number => {
      if (m.status === 'mastered') return 1.0;
      if (m.status === 'known') return 0.8;
      if (m.status === 'learning' && (m.timesSeen || 0) >= 3 && (m.correctStreak || 0) >= 2) return 0.4;
      if (m.status === 'learning' && (m.timesSeen || 0) >= 2) return 0.2;
      if (m.status === 'seen') return 0.05;
      return 0;
    };

    const sortedGroups = [...currentLevelGroups].sort((a, b) => getKnowledgeScoreForGroup(b) - getKnowledgeScoreForGroup(a));
    const targetQ = criteria?.questions || 40;
    const topGroups = sortedGroups.slice(0, targetQ);

    const knowledgeScore = topGroups.reduce((score, mastery) => (
      score + getKnowledgeScoreForGroup(mastery)
    ), 0);

    const evaluatedGroupCount = topGroups.length;
    const knowledgeRate = evaluatedGroupCount > 0 ? (knowledgeScore / evaluatedGroupCount) : 0;

    if (criteria && totalCount >= criteria.questions && recentAccuracy >= criteria.accuracy && knowledgeRate >= criteria.effectiveMastery && reviewingRatio <= criteria.review) {
      canLevelUp = true;
    }

    if (canLevelUp) {
      profile.lastLevelUp = {
        fromLevel: profile.currentLevel,
        toLevel: nextLevel,
        date: new Date().toISOString(),
        seen: false
      };
      profile.currentLevel = nextLevel;
      if (!profile.unlockedLevels.includes(nextLevel)) {
        profile.unlockedLevels.push(nextLevel);
      }
    }
  },

  acknowledgeLevelUp() {
    const profile = this.getProfile();
    if (profile.lastLevelUp) {
      profile.lastLevelUp.seen = true;
      this.saveProfile(profile);
    }
  },

  rebuildRecentAnswersFromSessions(profile: PlayerProfile) {
    // 1. First, try to migrate existing recentAnswers if they just lack the fields
    if (profile.recentAnswers) {
      const validLevels = ['B1', 'B2', 'C1', 'C2', 'Aditua'];
      profile.recentAnswers.forEach(ans => {
        if (!ans.playerLevelAtAnswer || !validLevels.includes(ans.playerLevelAtAnswer)) {
          if (ans.level && validLevels.includes(ans.level)) {
            ans.playerLevelAtAnswer = ans.level;
          } else {
            ans.playerLevelAtAnswer = profile.currentLevel;
          }
        }
        if (!ans.level || !validLevels.includes(ans.level)) {
          ans.level = ans.playerLevelAtAnswer;
        }
      });
    }

    // 2. If recentAnswers is empty but sessions exist, try to rebuild from sessions
    if (!profile.recentAnswers || profile.recentAnswers.length === 0) {
      const allAnswers: NormalizedAnswer[] = [];
      const validLevels = ['B1', 'B2', 'C1', 'C2', 'Aditua'];
      if (profile.sessions) {
        profile.sessions.forEach(session => {
          if (session.answers) {
            session.answers.forEach((ans) => {
              const sessionLevel = (session.level && validLevels.includes(session.level)) ? session.level : profile.currentLevel;
              const ansLevel = (ans.level && validLevels.includes(ans.level)) ? ans.level : sessionLevel;
              const playerLevel = (ans.playerLevelAtAnswer && validLevels.includes(ans.playerLevelAtAnswer)) ? ans.playerLevelAtAnswer : ansLevel;

              allAnswers.push({
                isCorrect: ans.isCorrect,
                level: playerLevel,
                playerLevelAtAnswer: playerLevel,
                contentLevel: ans.contentLevel || ans.level || null,
                groupId: ans.groupId,
                promptWordId: ans.promptWordId,
                correctWordId: ans.correctWordId,
                selectedWordId: ans.selectedWordId,
                answeredAt: ans.answeredAt || session.finishedAt || session.startedAt,
              });
            });
          }
        });
      }
      if (allAnswers.length > 0) {
        profile.recentAnswers = allAnswers;
      }
    }
  },

  getAllNormalizedAnswers(profile: PlayerProfile) {
    if (!profile.recentAnswers || profile.recentAnswers.length === 0) {
      this.rebuildRecentAnswersFromSessions(profile);
    } else {
      // Check if they need normalization
      let needsRebuild = false;
      const validLevels = ['B1', 'B2', 'C1', 'C2', 'Aditua'];
      for (const ans of profile.recentAnswers) {
        if (!ans.playerLevelAtAnswer && !ans.level) {
          needsRebuild = true;
          break;
        }
        if (ans.playerLevelAtAnswer && !validLevels.includes(ans.playerLevelAtAnswer)) {
          needsRebuild = true;
          break;
        }
      }
      if (needsRebuild) {
        this.rebuildRecentAnswersFromSessions(profile);
        // Removed saveProfile to prevent infinite loops during render
      }
    }
    return profile.recentAnswers || [];
  },

  getMasteryCounts() {
    const profile = this.getProfile();
    const counts = { new: 0, seen: 0, learning: 0, reviewing: 0, known: 0, mastered: 0 };
    (Object.values(profile.groupMastery) as ItemMastery[]).forEach(m => { counts[m.status]++; });
    return counts;
  },

  getWordMasteryCounts() {
    const profile = this.getProfile();
    const counts = { new: 0, seen: 0, learning: 0, reviewing: 0, known: 0, mastered: 0 };
    (Object.values(profile.wordMastery) as ItemMastery[]).forEach(m => { counts[m.status]++; });
    return counts;
  },

  buildLevelGroupMastery(profile: PlayerProfile, level: UserLevel): Record<number, ItemMastery> {
    const answersForLevel = this.getAllNormalizedAnswers(profile).filter(answer =>
      answer.playerLevelAtAnswer === level
    );

    const groupMetrics: Record<number, {
      timesSeen: number,
      timesCorrect: number,
      timesWrong: number,
      correctStreak: number,
      wrongStreak: number,
      masteryScore: number
    }> = {};

    answersForLevel.forEach(ans => {
      if (ans.groupId === undefined) return;
      if (!groupMetrics[ans.groupId]) {
        groupMetrics[ans.groupId] = {
          timesSeen: 0,
          timesCorrect: 0,
          timesWrong: 0,
          correctStreak: 0,
          wrongStreak: 0,
          masteryScore: 0
        };
      }
      
      const m = groupMetrics[ans.groupId];
      m.timesSeen += 1;
      if (ans.isCorrect) {
        m.timesCorrect += 1;
        m.correctStreak += 1;
        m.wrongStreak = 0;
        m.masteryScore = Math.min(5, m.masteryScore + 1);
      } else {
        m.timesWrong += 1;
        m.wrongStreak += 1;
        m.correctStreak = 0;
        m.masteryScore = Math.max(0, m.masteryScore - 1);
      }
    });

    const levelGroupMastery: Record<number, ItemMastery> = {};
    Object.entries(groupMetrics).forEach(([groupId, m]) => {
      const accuracy = m.timesCorrect / m.timesSeen;
      let status: MasteryStatus = 'new';
      
      if (m.timesSeen === 1) {
        status = 'seen';
      } else if (m.timesSeen >= 5 && accuracy >= 0.8 && m.correctStreak >= 3 && m.masteryScore >= 5) {
        status = 'mastered';
      } else if (m.timesSeen >= 3 && m.timesCorrect >= 2 && accuracy >= 0.66 && m.correctStreak >= 2) {
        status = 'known';
      } else if (m.wrongStreak > 0 || accuracy < 0.5) {
        status = 'reviewing';
      } else if (m.timesSeen >= 1) {
        status = 'learning';
      }

      levelGroupMastery[Number(groupId)] = {
        ...m,
        status,
        lastSeenAt: '',
        nextReviewAt: null
      };
    });

    return levelGroupMastery;
  },

  buildLevelWordMastery(profile: PlayerProfile, level: UserLevel) {
    const answersForLevel = this.getAllNormalizedAnswers(profile).filter(answer =>
      answer.playerLevelAtAnswer === level
    );

    const wordMetrics: Record<number, {
      timesSeen: number,
      timesCorrect: number,
      timesWrong: number,
      correctStreak: number,
      wrongStreak: number,
      masteryScore: number
    }> = {};

    answersForLevel.forEach(ans => {
      const wordId = ans.correctWordId;
      if (wordId === undefined) return;
      if (!wordMetrics[wordId]) {
        wordMetrics[wordId] = {
          timesSeen: 0,
          timesCorrect: 0,
          timesWrong: 0,
          correctStreak: 0,
          wrongStreak: 0,
          masteryScore: 0
        };
      }
      
      const m = wordMetrics[wordId];
      m.timesSeen += 1;
      if (ans.isCorrect) {
        m.timesCorrect += 1;
        m.correctStreak += 1;
        m.wrongStreak = 0;
        m.masteryScore = Math.min(5, m.masteryScore + 1);
      } else {
        m.timesWrong += 1;
        m.wrongStreak += 1;
        m.correctStreak = 0;
        m.masteryScore = Math.max(0, m.masteryScore - 1);
      }
    });

    const levelWordMastery: Record<number, ItemMastery> = {};
    Object.entries(wordMetrics).forEach(([wordId, m]) => {
      const accuracy = m.timesCorrect / m.timesSeen;
      let status: MasteryStatus = 'new';
      
      if (m.timesSeen === 1) {
        status = 'seen';
      } else if (m.timesSeen >= 5 && accuracy >= 0.8 && m.correctStreak >= 3 && m.masteryScore >= 5) {
        status = 'mastered';
      } else if (m.timesSeen >= 3 && m.timesCorrect >= 2 && accuracy >= 0.66 && m.correctStreak >= 2) {
        status = 'known';
      } else if (m.wrongStreak > 0 || accuracy < 0.5) {
        status = 'reviewing';
      } else if (m.timesSeen >= 1) {
        status = 'learning';
      }

      levelWordMastery[Number(wordId)] = {
        ...m,
        status,
        lastSeenAt: '',
        nextReviewAt: null
      };
    });

    return levelWordMastery;
  },

  calculateLevelProgress(providedProfile?: PlayerProfile): import('../types/stats').LevelProgress {
    const profile = providedProfile || this.getProfile();
    const currentLevel = profile.currentLevel;
    
    // NEW: Get answers normalized
    const answersForLevel = this.getAllNormalizedAnswers(profile).filter(answer =>
      answer.playerLevelAtAnswer === currentLevel
    );
    const totalCount = answersForLevel.length;

    // Use level-specific mastery!
    const levelGroupMastery = this.buildLevelGroupMastery(profile, currentLevel);
    const currentLevelGroups: ItemMastery[] = Object.values(levelGroupMastery);

    // If no answers at this level, reset metrics to 0
    if (totalCount === 0 || currentLevelGroups.length === 0) {
        return {
            totalProgress: 0,
            questionProgress: 0,
            accuracyProgress: 0,
            masteryProgress: 0,
            reviewProgress: 0,
            missingRequirements: [
                { label: 'Galderak', current: 0, target: this.getLevelCriteria(currentLevel, 0, 0, 0).questions, isMet: false },
                { label: 'Akurazia', current: '0%', target: `${Math.round(this.getLevelCriteria(currentLevel, 0, 0, 0).accuracy * 100)}%`, isMet: false },
                { label: 'Ezagutza', current: '0%', target: `${Math.round(this.getLevelCriteria(currentLevel, 0, 0, 0).mastery * 100)}%`, isMet: false },
                { label: 'Berrikusteko', current: '0%', target: `<${Math.round(this.getLevelCriteria(currentLevel, 0, 0, 0).review * 100)}%`, isMet: true },
            ],
            isCompensated: false
        };
    }
      
    const reviewingCount = currentLevelGroups.filter(m => m.status === 'reviewing').length;
    const reviewingRatio = currentLevelGroups.length > 0 ? (reviewingCount / currentLevelGroups.length) : 0;

    const getKnowledgeScoreForGroup = (m: ItemMastery): number => {
      if (m.status === 'mastered') return 1.0;
      if (m.status === 'known') return 0.8;
      if (m.status === 'learning' && (m.timesSeen || 0) >= 3 && (m.correctStreak || 0) >= 2) return 0.4;
      if (m.status === 'learning' && (m.timesSeen || 0) >= 2) return 0.2;
      if (m.status === 'seen') return 0.05;
      return 0;
    };

    const lastN = answersForLevel.slice(-40);
    const recentAccuracy = lastN.length > 0 ? (lastN.filter(a => a.isCorrect).length / lastN.length) : 0;
    
    const criteria = this.getLevelCriteria(currentLevel, totalCount, recentAccuracy, reviewingRatio);

    const sortedGroups = [...currentLevelGroups].sort((a, b) => getKnowledgeScoreForGroup(b) - getKnowledgeScoreForGroup(a));
    const targetQ = criteria?.questions || 40;
    const topGroups = sortedGroups.slice(0, targetQ);

    const knowledgeScore = topGroups.reduce((score, mastery) => (
      score + getKnowledgeScoreForGroup(mastery)
    ), 0);

    const totalSeenGroups = currentLevelGroups.length;
    const evaluatedGroupCount = topGroups.length;
    const knowledgeRate = evaluatedGroupCount > 0 ? (knowledgeScore / evaluatedGroupCount) : 0;
    
    const targetQuestions = targetQ;
    const targetAccuracy = criteria?.accuracy || 0.75;
    const targetMastery = criteria?.effectiveMastery || 0.45;
    const maxReviewing = criteria?.review || 0.25;

    const questionProgress = Math.min(1, totalCount / targetQuestions);
    const accuracyProgress = totalCount === 0 ? 0 : Math.min(1, recentAccuracy / targetAccuracy);
    const masteryProgress = evaluatedGroupCount === 0 ? 0 : Math.min(1, knowledgeRate / targetMastery);
    
    let reviewProgress = 0.5;
    if (totalSeenGroups > 0) {
      if (reviewingRatio <= maxReviewing) {
        reviewProgress = 1;
      } else {
        reviewProgress = Math.max(0, 1 - ((reviewingRatio - maxReviewing) / (1 - maxReviewing)));
      }
    }

    const totalProgress = (
      (questionProgress * 0.35) + 
      (accuracyProgress * 0.25) + 
      (masteryProgress * 0.25) + 
      (reviewProgress * 0.15)
    ) * 100;

    const missingRequirements = [
      { 
        label: 'Galderak', 
        current: totalCount, 
        target: targetQuestions, 
        isMet: totalCount >= targetQuestions 
      },
      { 
        label: 'Akurazia', 
        current: `${Math.round(recentAccuracy * 100)}%`, 
        target: `${Math.round(targetAccuracy * 100)}%`, 
        isMet: recentAccuracy >= targetAccuracy 
      },
      { 
        label: 'Ezagutza', 
        current: `${Math.round(knowledgeRate * 100)}%`, 
        target: `${Math.round(targetMastery * 100)}%${criteria.isCompensated ? ' (egokitua)' : ''}`, 
        isMet: knowledgeRate >= targetMastery 
      },
      { 
        label: 'Berrikusteko', 
        current: `${Math.round(reviewingRatio * 100)}%`, 
        target: `<${Math.round(maxReviewing * 100)}%`, 
        isMet: reviewingRatio <= maxReviewing 
      }
    ];

    return {
      totalProgress: Math.min(100, Math.round(totalProgress)),
      questionProgress,
      accuracyProgress,
      masteryProgress,
      reviewProgress,
      missingRequirements,
      isCompensated: criteria.isCompensated
    };
  },

  getDiscourseClozeStats(profile: PlayerProfile): import('../types/discourseCloze').DiscourseClozeStats {
    const sessions = profile.discourseClozeSessions || [];
    const masteryValues = Object.values(profile.discourseClozeMastery || {});
    
    let totalAnswers = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let currentStreak = 0;
    let bestStreak = 0;

    const byLevel: Record<string, { total: number; correct: number; accuracy: number }> = {};
    const byDiscursiveFunction: Record<string, { total: number; correct: number; accuracy: number }> = {};
    const bySkillFocus: Record<string, { total: number; correct: number; accuracy: number }> = {};
    
    const masterySummary = { new: 0, seen: 0, learning: 0, reviewing: 0, known: 0, mastered: 0 };
    
    masteryValues.forEach(m => {
       masterySummary[m.status] = (masterySummary[m.status] || 0) + 1;
    });

    sessions.forEach(session => {
       if (session.answers) {
          session.answers.forEach(ans => {
             totalAnswers++;
             if (ans.isCorrect) totalCorrect++;
             else totalWrong++;
             
             // Level
             if (!byLevel[ans.level]) byLevel[ans.level] = { total: 0, correct: 0, accuracy: 0 };
             byLevel[ans.level].total++;
             if (ans.isCorrect) byLevel[ans.level].correct++;
             
             // Discursive string
             const dFunc = ans.discursiveFunction || 'besterik';
             if (!byDiscursiveFunction[dFunc]) byDiscursiveFunction[dFunc] = { total: 0, correct: 0, accuracy: 0 };
             byDiscursiveFunction[dFunc].total++;
             if (ans.isCorrect) byDiscursiveFunction[dFunc].correct++;
             
             // Skill focus
             const sFocus = ans.skillFocus || 'besterik';
             if (!bySkillFocus[sFocus]) bySkillFocus[sFocus] = { total: 0, correct: 0, accuracy: 0 };
             bySkillFocus[sFocus].total++;
             if (ans.isCorrect) bySkillFocus[sFocus].correct++;
          });
       }
    });

    let tempStreak = 0;
    const allAnswers = sessions.flatMap(s => s.answers || []);
    allAnswers.sort((a, b) => new Date(a.answeredAt).getTime() - new Date(b.answeredAt).getTime());
    
    allAnswers.forEach(ans => {
       if (ans.isCorrect) {
          tempStreak++;
          bestStreak = Math.max(bestStreak, tempStreak);
       } else {
          tempStreak = 0;
       }
    });
    currentStreak = tempStreak;

    Object.keys(byLevel).forEach(k => byLevel[k].accuracy = byLevel[k].total > 0 ? byLevel[k].correct / byLevel[k].total : 0);
    Object.keys(byDiscursiveFunction).forEach(k => byDiscursiveFunction[k].accuracy = byDiscursiveFunction[k].total > 0 ? byDiscursiveFunction[k].correct / byDiscursiveFunction[k].total : 0);
    Object.keys(bySkillFocus).forEach(k => bySkillFocus[k].accuracy = bySkillFocus[k].total > 0 ? bySkillFocus[k].correct / bySkillFocus[k].total : 0);

    const weakestFunctions = Object.entries(byDiscursiveFunction)
       .map(([func, stats]) => ({ discursiveFunction: func, ...stats }))
       .filter(s => s.total >= 3)
       .sort((a, b) => a.accuracy - b.accuracy)
       .slice(0, 3);

    return {
       totalSessions: sessions.length,
       totalAnswers,
       totalCorrect,
       totalWrong,
       accuracy: totalAnswers > 0 ? totalCorrect / totalAnswers : 0,
       currentStreak,
       bestStreak,
       byLevel,
       byDiscursiveFunction,
       bySkillFocus,
       masterySummary,
       weakestFunctions,
       questionsToReview: masterySummary.reviewing || 0
    };
  },
  
  getDiscourseClozeReviewQuestions(profile: PlayerProfile, allQuestions: import('../types/discourseCloze').DiscourseClozeQuestion[]): import('../types/discourseCloze').DiscourseClozeQuestion[] {
     const mastery = profile.discourseClozeMastery || {};
     const now = new Date().getTime();
     
     const stats = this.getDiscourseClozeStats(profile);
     const weakestFunctions = stats.weakestFunctions.map(f => f.discursiveFunction);

     const reviewQueue = Object.values(mastery).filter(m => {
        if (m.status === 'reviewing') return true;
        if (m.nextReviewAt && new Date(m.nextReviewAt).getTime() < now) return true;
        if (m.wrongStreak > 0) return true;
        if (m.masteryScore <= 2 && m.status !== 'new') return true;
        
        // Also pick some weakest function questions if they aren't mastered
        if (weakestFunctions.includes(m.discursiveFunction) && m.masteryScore < 4) return true;
        
        return false;
     });

     // Calculate priority score
     const scoredQueue = reviewQueue.map(m => {
        let score = 0;
        
        // recentWrong: +100
        if (m.wrongStreak > 0) score += 100 + (m.wrongStreak * 5);
        
        // reviewing: +80
        if (m.status === 'reviewing') score += 80;
        
        // masteryScore <= 2: +60
        if (m.masteryScore <= 2) score += 60 - (m.masteryScore * 10);
        
        // weakFunction: +50
        if (weakestFunctions.includes(m.discursiveFunction)) {
            score += 50;
        }
        
        // dueReview: +40
        if (m.nextReviewAt && new Date(m.nextReviewAt).getTime() < now) {
            score += 40;
        }
        
        // lowTimesSeen: +20
      if (m.timesSeen < 3) {
            score += 20;
        }
        
        // random noise to avoid mechanical repetition
        score += Math.random() * 10;
        
        return { item: m, score };
     });

     // Sort by priority descending
     scoredQueue.sort((a, b) => b.score - a.score);
     
     const topIds = scoredQueue.map(sq => sq.item.questionId);
     const questions = [];
     for (const id of topIds) {
        const q = allQuestions.find(x => x.id === id);
        if (q) questions.push(q);
     }
     
     return questions;
  },

  async syncProgressToCloud(
    profile: PlayerProfile,
    options?: { userId?: string; skipMerge?: boolean }
  ): Promise<PlayerProfile> {
    const supabase = getSupabase();
    const normalizedProfile = applyRetentionPolicy(normalizeLoadedProfile(profile));
    if (!supabase) {
      this.markSyncError(normalizedProfile);
      return this.getProfile();
    }

    const user = options?.userId
      ? null
      : await withTimeout(
        authService.getCurrentUser(),
        AUTH_SESSION_TIMEOUT_MS,
        'auth.get_current_user'
      );
    const userId = options?.userId || user?.id;
    if (!userId) {
      this.saveProfile({ ...normalizedProfile, syncStatus: 'auth_required' }, { markPending: false });
      return this.getProfile();
    }

    currentUserId = userId;

    try {
      let profileToSync = normalizedProfile;
      if (!options?.skipMerge) {
        const cloudProfile = await this.loadProgressFromCloud(userId);
        if (cloudProfile) {
          profileToSync = this.mergeLocalAndCloudProgress(profileToSync, cloudProfile);
        }
      }

      this.markSyncPending(profileToSync);
      const now = new Date().toISOString();
      observabilityService.trackSync('started', {
        userId,
        totalSessions: profileToSync.stats.totalSessions,
        totalAnswers: profileToSync.stats.totalQuestions,
      });
      const payload = {
        user_id: userId,
        schema_version: 1,
        progress: {
          ...profileToSync,
          syncStatus: 'synced',
          lastCloudSyncAt: now,
        },
        current_level: profileToSync.currentLevel,
        total_sessions: profileToSync.stats.totalSessions,
        total_answers: profileToSync.stats.totalQuestions,
        total_correct: profileToSync.stats.totalCorrect,
        accuracy: profileToSync.stats.globalAccuracy,
        last_synced_at: now,
        updated_at: now,
      };

      // Ensure user profile snippet exists first (since it has references depending on structure, though we can skip directly to snapshot upsert if we just want).
      // actually, let's just write to user_progress_snapshots.
      // Make sure we have a profile to link to.
      
      const { error: profileError } = await withTimeout(
        Promise.resolve(
          supabase
            .from('user_profiles')
            .upsert({
              id: userId,
              username: user?.user_metadata?.username || user?.email?.split('@')[0] || null,
              display_name: authService.getDisplayName(user),
              current_level: profileToSync.currentLevel,
              updated_at: now
            }, { onConflict: 'id' })
        ),
        SUPABASE_WRITE_TIMEOUT_MS,
        'sync.user_profiles_upsert'
      );
      
      if (profileError) {
        observabilityService.captureError('sync.profile_meta_failed', 'sync', profileError, {
          userId,
        });
      }

      const { error } = await withTimeout(
        Promise.resolve(
          supabase
            .from('user_progress_snapshots')
            .upsert(payload, { onConflict: 'user_id' })
        ),
        SUPABASE_WRITE_TIMEOUT_MS,
        'sync.user_progress_snapshots_upsert'
      );

      if (error) {
        this.markSyncError(profileToSync);
        observabilityService.captureError('sync.snapshot_failed', 'sync', error, {
          userId,
          totalSessions: profileToSync.stats.totalSessions,
        });
        return this.getProfile();
      }

      this.saveProfile({
        ...profileToSync,
        syncStatus: 'synced',
        lastCloudSyncAt: now,
      }, { markPending: false });
      observabilityService.trackSync('success', {
        userId,
        totalSessions: profileToSync.stats.totalSessions,
        totalAnswers: profileToSync.stats.totalQuestions,
      });
      await observabilityService.flushEventsToSupabase('sync_success');
      return this.getProfile();
    } catch (error) {
      this.markSyncError(normalizedProfile);
      observabilityService.captureError('sync.unexpected_failure', 'sync', error, {
        userId,
      });
      return this.getProfile();
    }
  },

  async loadProgressFromCloud(userId: string): Promise<PlayerProfile | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    try {
      const { data, error } = await withTimeout(
        Promise.resolve(
          supabase
            .from('user_progress_snapshots')
            .select('progress, last_synced_at')
            .eq('user_id', userId)
            .maybeSingle()
        ),
        SUPABASE_READ_TIMEOUT_MS,
        'sync.load_progress_snapshot'
      );

      if (error || !data) {
        if (error) {
          observabilityService.captureError('sync.load_failed', 'sync', error, {
            userId,
          });
        }
        return null;
      }
      
      const p = normalizeLoadedProfile(data.progress as PlayerProfile);
      p.syncStatus = 'synced';
      p.lastCloudSyncAt = data.last_synced_at;
      return p;
    } catch (error) {
      observabilityService.captureError('sync.load_unexpected_failure', 'sync', error, {
        userId,
      });
      return null;
    }
  },

  mergeLocalAndCloudProgress(local: PlayerProfile, cloud: PlayerProfile): PlayerProfile {
    const normalizedLocal = normalizeLoadedProfile(local);
    const normalizedCloud = normalizeLoadedProfile(cloud);
    const mergedSessions = dedupeBy(
      [...(normalizedCloud.sessions || []), ...(normalizedLocal.sessions || [])],
      buildStandardSessionKey
    ).sort((left, right) => getSessionTimestamp(left).localeCompare(getSessionTimestamp(right)));
    const mergedRecentAnswers = dedupeBy(
      [...(normalizedCloud.recentAnswers || []), ...(normalizedLocal.recentAnswers || [])],
      buildRecentAnswerKey
    ).sort((left, right) => (left.answeredAt || '').localeCompare(right.answeredAt || ''));
    const mergedClozeSessions = dedupeBy(
      [...(normalizedCloud.clozeSessions || []), ...(normalizedLocal.clozeSessions || [])],
      buildClozeSessionKey
    ).sort((left, right) => getSessionTimestamp(left).localeCompare(getSessionTimestamp(right)));
    const mergedDiscourseSessions = dedupeBy(
      [...(normalizedCloud.discourseClozeSessions || []), ...(normalizedLocal.discourseClozeSessions || [])],
      buildDiscourseSessionKey
    ).sort((left, right) => getSessionTimestamp(left).localeCompare(getSessionTimestamp(right)));
    const richerStats = normalizedLocal.stats.totalQuestions > normalizedCloud.stats.totalQuestions
      ? normalizedLocal.stats
      : normalizedCloud.stats;
    const mergedStats = mergedSessions.length > 0 ? calculateStatsFromSessions(mergedSessions) : richerStats;
    const localLastLevelUp = normalizedLocal.lastLevelUp;
    const cloudLastLevelUp = normalizedCloud.lastLevelUp;
    const latestLevelUp = !localLastLevelUp
      ? cloudLastLevelUp
      : !cloudLastLevelUp
        ? localLastLevelUp
        : new Date(localLastLevelUp.date).getTime() >= new Date(cloudLastLevelUp.date).getTime()
          ? localLastLevelUp
          : cloudLastLevelUp;

    const merged: PlayerProfile = {
      ...normalizedCloud,
      installationId: normalizedLocal.installationId,
      currentLevel: getLevelRank(normalizedLocal.currentLevel) > getLevelRank(normalizedCloud.currentLevel)
        ? normalizedLocal.currentLevel
        : normalizedCloud.currentLevel,
      unlockedLevels: Array.from(new Set([...(normalizedLocal.unlockedLevels || []), ...(normalizedCloud.unlockedLevels || [])]))
        .sort((left, right) => getLevelRank(left) - getLevelRank(right)),
      stats: mergedStats,
      clozeSessions: mergedClozeSessions,
      discourseClozeSessions: mergedDiscourseSessions,
      sessions: mergedSessions,
      recentAnswers: mergedRecentAnswers,
      lastLevelUp: latestLevelUp,
      groupMastery: { ...(normalizedCloud.groupMastery || {}) },
      wordMastery: { ...(normalizedCloud.wordMastery || {}) },
      clozeMastery: { ...(normalizedCloud.clozeMastery || {}) },
      discourseClozeMastery: { ...(normalizedCloud.discourseClozeMastery || {}) },
      syncStatus: 'pending',
      lastCloudSyncAt: [normalizedLocal.lastCloudSyncAt, normalizedCloud.lastCloudSyncAt]
        .filter(Boolean)
        .sort()
        .at(-1)
    };

    // Merge mastery intelligently
    type MasteryEntry = {
      timesSeen: number;
      timesCorrect: number;
      timesWrong: number;
      masteryScore: number;
      status: MasteryStatus;
      lastSeenAt: string | null;
      nextReviewAt: string | null;
    };
    const mergeMasterMap = (dest: Record<string, MasteryEntry>, src: Record<string, MasteryEntry>) => {
      if (!src) return;
      Object.keys(src).forEach(k => {
        if (!dest[k]) {
          dest[k] = src[k];
        } else {
          const d = dest[k];
          const s = src[k];
          dest[k] = {
            timesSeen: Math.max(d.timesSeen, s.timesSeen),
            timesCorrect: Math.max(d.timesCorrect, s.timesCorrect),
            timesWrong: Math.max(d.timesWrong, s.timesWrong),
            masteryScore: Math.max(d.masteryScore, s.masteryScore),
            status: (['mastered', 'known', 'learning', 'reviewing', 'seen', 'new'].find(st => d.status === st || s.status === st) || d.status) as MasteryStatus,
            lastSeenAt: d.lastSeenAt && s.lastSeenAt ? (new Date(d.lastSeenAt) > new Date(s.lastSeenAt) ? d.lastSeenAt : s.lastSeenAt) : d.lastSeenAt || s.lastSeenAt,
            nextReviewAt: d.nextReviewAt || s.nextReviewAt ? (d.nextReviewAt && s.nextReviewAt ? (new Date(d.nextReviewAt) < new Date(s.nextReviewAt) ? d.nextReviewAt : s.nextReviewAt) : d.nextReviewAt || s.nextReviewAt) : null,
          };
        }
      });
    };

    mergeMasterMap(merged.groupMastery, normalizedLocal.groupMastery);
    mergeMasterMap(merged.wordMastery, normalizedLocal.wordMastery);
    mergeMasterMap(merged.clozeMastery, normalizedLocal.clozeMastery);
    if (normalizedLocal.discourseClozeMastery && merged.discourseClozeMastery) {
      mergeMasterMap(merged.discourseClozeMastery, normalizedLocal.discourseClozeMastery);
    }

    if (!merged.recentAnswers.length && merged.sessions && merged.sessions.length > 0) {
      this.rebuildRecentAnswersFromSessions(merged);
    }

    return applyRetentionPolicy(merged);
  },

  markSyncPending(profile?: PlayerProfile) {
    const nextProfile = profile ? normalizeLoadedProfile(profile) : this.getProfile();
    nextProfile.syncStatus = currentUserId ? 'pending' : 'auth_required';
    setCurrentProfile(nextProfile);
  },

  markSyncError(profile?: PlayerProfile) {
    const nextProfile = profile ? normalizeLoadedProfile(profile) : this.getProfile();
    nextProfile.syncStatus = 'error';
    setCurrentProfile(nextProfile);
  },

  markSynced(time: string, profile?: PlayerProfile) {
    const nextProfile = profile ? normalizeLoadedProfile(profile) : this.getProfile();
    nextProfile.syncStatus = 'synced';
    nextProfile.lastCloudSyncAt = time;
    setCurrentProfile(nextProfile);
  },

  handleSignedOutState() {
    authenticatedProfileSyncPromise = null;
    authenticatedProfileSyncUserId = null;
    currentUserId = null;
    setCurrentProfile(createInitialProfile('auth_required'));
  },

  getCurrentUserId() {
    return currentUserId;
  }
};
