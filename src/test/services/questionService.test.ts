import { beforeEach, describe, expect, it } from 'vitest';
import { buildSessionQuestions } from '../../services/questionService';
import { PlayerProfile } from '../../types/stats';
import { LexicalGroup, LexicalWord } from '../../types/lexical';

function createWord(id: number, word: string, status: string = 'egokia'): LexicalWord {
  return {
    id,
    group_id: Math.floor(id / 10),
    word,
    learner_level: null,
    frequency: null,
    register: null,
    dialect: null,
    status,
    note: null,
  };
}

function createGroup(
  id: number,
  overrides: Partial<LexicalGroup> = {},
  words: LexicalWord[] = [
    createWord(id * 10 + 1, `hitz-${id}-a`),
    createWord(id * 10 + 2, `hitz-${id}-b`),
  ],
): LexicalGroup {
  return {
    id,
    source_id: id,
    concept: `kontzeptua-${id}`,
    meaning_es: `significado-${id}`,
    category: 'lexikoa',
    subcategory: 'sinonimoak',
    grammar: 'izena',
    relation: 'sinonimoa',
    original_level: 'B1',
    reviewed_level: 'B1',
    recommended_question_type: 'direct_synonym',
    review_status: 'reviewed_safe',
    is_active: true,
    words,
    risk_level: 'low',
    quality_level: 'gold',
    ...overrides,
  };
}

function createProfile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  const base: PlayerProfile = {
    installationId: 'test-installation',
    currentLevel: 'B1',
    unlockedLevels: ['B1'],
    stats: {
      totalSessions: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      globalAccuracy: 0,
      currentStreak: 0,
      bestStreak: 0,
      lastPlayedDate: null,
      dailySessionsCount: 0,
    },
    groupMastery: {},
    wordMastery: {},
    clozeSessions: [],
    clozeMastery: {},
    discourseClozeSessions: [],
    discourseClozeMastery: {},
    lastLevelUp: null,
    recentAnswers: [],
    sessions: [],
  };

  return {
    ...base,
    ...overrides,
    stats: {
      ...base.stats,
      ...(overrides.stats || {}),
    },
    groupMastery: { ...base.groupMastery, ...(overrides.groupMastery || {}) },
    wordMastery: { ...base.wordMastery, ...(overrides.wordMastery || {}) },
    clozeMastery: { ...base.clozeMastery, ...(overrides.clozeMastery || {}) },
    discourseClozeMastery: { ...(base.discourseClozeMastery || {}), ...(overrides.discourseClozeMastery || {}) },
    clozeSessions: overrides.clozeSessions ? [...overrides.clozeSessions] : [...base.clozeSessions],
    discourseClozeSessions: overrides.discourseClozeSessions ? [...overrides.discourseClozeSessions] : [...(base.discourseClozeSessions || [])],
    recentAnswers: overrides.recentAnswers ? [...overrides.recentAnswers] : [...base.recentAnswers],
    sessions: overrides.sessions ? [...overrides.sessions] : [...(base.sessions || [])],
  };
}

describe('questionService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('falls back to a compact main session when only five valid groups are available', async () => {
    const groups = Array.from({ length: 3 }, (_, index) => createGroup(index + 1));
    const profile = createProfile();

    const result = await buildSessionQuestions(groups, profile, 'main');

    expect(result.requestedCount).toBe(10);
    expect(result.generatedCount).toBe(5);
    expect(result.fallbackUsed).toBe(true);
    expect(new Set(result.questions.map((question) => question.groupId)).size).toBe(3);
  });

  it('prioritizes review groups and keeps them in review sessions', async () => {
    const groups = [createGroup(1), createGroup(2), createGroup(3), createGroup(4)];
    const profile = createProfile({
      groupMastery: {
        1: {
          timesSeen: 2,
          timesCorrect: 1,
          timesWrong: 1,
          masteryScore: 1,
          status: 'reviewing',
          lastSeenAt: '2026-05-01T10:00:00.000Z',
          nextReviewAt: '2026-05-01T12:00:00.000Z',
          correctStreak: 0,
          wrongStreak: 1,
        },
        2: {
          timesSeen: 3,
          timesCorrect: 1,
          timesWrong: 2,
          masteryScore: 1,
          status: 'reviewing',
          lastSeenAt: '2026-05-01T10:05:00.000Z',
          nextReviewAt: '2026-05-01T12:05:00.000Z',
          correctStreak: 0,
          wrongStreak: 2,
        },
      },
    });

    const result = await buildSessionQuestions(groups, profile, 'review');

    expect(result.generatedCount).toBeGreaterThanOrEqual(3);
    expect(result.questions.map((question) => question.groupId)).toEqual(expect.arrayContaining([1, 2]));
  });

  it('tracks discarded reasons when groups cannot generate a valid question', async () => {
    const invalidTypeGroup = createGroup(2, { recommended_question_type: 'misterioa' });
    const validGroup = createGroup(3);
    const supportGroupA = createGroup(4);
    const supportGroupB = createGroup(5);
    const profile = createProfile();

    const result = await buildSessionQuestions([invalidTypeGroup, validGroup, supportGroupA, supportGroupB], profile, 'quick');

    expect(result.generatedCount).toBeGreaterThan(0);
    expect(result.discardedReasons.invalid_question_type).toBeGreaterThan(0);
  });
});
