import { describe, it, expect, beforeEach } from 'vitest';
import { playerService } from '../../services/playerService';
import { AnswerResult, PlayerProfile, SessionResult, UserLevel } from '../../types/stats';
import { GameQuestion } from '../../types/question';
import { DiscourseClozeQuestion } from '../../types/discourseCloze';

function createQuestion(id: string, groupId: number, level: UserLevel = 'B1'): GameQuestion {
  return {
    id,
    groupId,
    sourceId: groupId,
    questionType: 'direct_synonym',
    promptWord: {
      id: groupId * 10,
      word: `prompt-${groupId}`,
      learner_level: null,
      frequency: null,
      register: null,
      dialect: null,
      status: 'egokia',
      note: null,
    },
    correctWord: {
      id: groupId * 10 + 1,
      word: `correct-${groupId}`,
      learner_level: null,
      frequency: null,
      register: null,
      dialect: null,
      status: 'egokia',
      note: null,
    },
    options: [],
    meaningEs: null,
    concept: `concept-${groupId}`,
    relation: null,
    grammar: 'izena',
    category: 'komunikazioa',
    level,
  };
}

function createAnswer(question: GameQuestion, isCorrect: boolean, answeredAt: string): AnswerResult {
  return {
    questionId: question.id,
    groupId: question.groupId,
    promptWordId: question.promptWord.id,
    correctWordId: question.correctWord.id,
    selectedOptionId: isCorrect ? question.correctWord.id : question.correctWord.id + 100,
    correctAnswer: question.correctWord.word,
    isCorrect,
    answeredAt,
    level: (question.level as UserLevel) || 'B1',
    questionType: question.questionType,
  };
}

function createStoredSession(
  startedAt: string,
  finishedAt: string,
  score: number,
  total: number,
  mode: string = 'main'
): SessionResult {
  return {
    score,
    total,
    questions: [],
    answers: [],
    statusChanges: [],
    level: 'B1',
    mode,
    startedAt,
    finishedAt,
  };
}

function createProfile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  const base = structuredClone(playerService.getProfile());
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
    unlockedLevels: overrides.unlockedLevels ? [...overrides.unlockedLevels] : [...base.unlockedLevels],
    clozeSessions: overrides.clozeSessions ? [...overrides.clozeSessions] : [...base.clozeSessions],
    discourseClozeSessions: overrides.discourseClozeSessions ? [...overrides.discourseClozeSessions] : [...(base.discourseClozeSessions || [])],
    recentAnswers: overrides.recentAnswers ? [...overrides.recentAnswers] : [...base.recentAnswers],
    sessions: overrides.sessions ? [...overrides.sessions] : [...(base.sessions || [])],
  };
}

function createRecentAnswer(groupId: number, index: number, isCorrect: boolean, level: UserLevel = 'B1') {
  return {
    isCorrect,
    level,
    contentLevel: level,
    playerLevelAtAnswer: level,
    groupId,
    promptWordId: groupId * 100 + index,
    correctWordId: groupId * 100 + index + 1,
    selectedWordId: isCorrect ? groupId * 100 + index + 1 : groupId * 100 + index + 99,
    answeredAt: `2026-05-${String((index % 9) + 1).padStart(2, '0')}T10:${String(index).padStart(2, '0')}:00.000Z`,
  };
}

describe('playerService', () => {
  beforeEach(() => {
    localStorage.clear();
    playerService.resetProfile('auth_required');
  });

  describe('getLevelCriteria', () => {
    it('should return base criteria for B1 with no compensation', () => {
      const result = playerService.getLevelCriteria('B1', 10, 0.7, 0.3);
      expect(result.questions).toBe(40);
      expect(result.accuracy).toBe(0.75);
      expect(result.mastery).toBe(0.45);
      expect(result.isCompensated).toBe(false);
    });

    it('should apply excellence compensation for high performance', () => {
      const result = playerService.getLevelCriteria('B1', 200, 0.90, 0.10);
      expect(result.isCompensated).toBe(true);
      expect(result.effectiveMastery).toBeLessThan(result.mastery);
    });

    it('should not compensate for insufficient data', () => {
      const result = playerService.getLevelCriteria('B1', 50, 0.85, 0.2);
      expect(result.isCompensated).toBe(false);
    });

    it('should handle all level types', () => {
      const levels: UserLevel[] = ['B1', 'B2', 'C1', 'C2', 'Aditua'];
      levels.forEach(level => {
        const result = playerService.getLevelCriteria(level, 50, 0.8, 0.2);
        expect(result.questions).toBeGreaterThan(0);
        expect(result.accuracy).toBeGreaterThan(0);
        expect(result.mastery).toBeGreaterThan(0);
      });
    });
  });

  describe('calculateLevelProgress', () => {
    it('should return initial progress for fresh profile', () => {
      const progress = playerService.calculateLevelProgress();
      expect(progress.totalProgress).toBeGreaterThanOrEqual(0);
      expect(progress.totalProgress).toBeLessThanOrEqual(100);
      expect(progress.missingRequirements).toBeDefined();
      expect(Array.isArray(progress.missingRequirements)).toBe(true);
    });
  });

  describe('getMasteryCounts', () => {
    it('should return mastery counts object with status counts', () => {
      const counts = playerService.getMasteryCounts();
      expect(counts).toBeDefined();
      expect(typeof counts.new).toBe('number');
      expect(typeof counts.mastered).toBe('number');
      expect(typeof counts.known).toBe('number');
      expect(typeof counts.learning).toBe('number');
    });
  });

  describe('phase 1 safeguards', () => {
    it('stores compact standard sessions while preserving immediate session result', () => {
      const question = createQuestion('q-1', 1);
      const answer = createAnswer(question, true, '2026-05-05T10:00:00.000Z');

      const result = playerService.updateSession(1, [question], [answer], 'main');
      const savedProfile = playerService.getProfile();

      expect(result.questions).toHaveLength(1);
      expect(savedProfile.sessions).toHaveLength(1);
      expect(savedProfile.sessions?.[0].questions).toHaveLength(0);
      expect(savedProfile.stats.totalSessions).toBe(1);
      expect(savedProfile.stats.totalQuestions).toBe(1);
      expect(savedProfile.stats.totalCorrect).toBe(1);
      expect(savedProfile.syncStatus).toBe('auth_required');
    });

    it('merges local and cloud progress without dropping sessions or recent answers', () => {
      const local = createProfile({
        currentLevel: 'B2',
        unlockedLevels: ['B1', 'B2'],
        sessions: [createStoredSession('2026-05-01T09:00:00.000Z', '2026-05-01T09:05:00.000Z', 2, 3)],
        recentAnswers: [
          {
            isCorrect: true,
            level: 'B1',
            playerLevelAtAnswer: 'B1',
            groupId: 1,
            promptWordId: 10,
            correctWordId: 11,
            selectedWordId: 11,
            answeredAt: '2026-05-01T09:03:00.000Z',
          },
        ],
      });
      const cloud = createProfile({
        currentLevel: 'C1',
        unlockedLevels: ['B1', 'B2', 'C1'],
        sessions: [createStoredSession('2026-05-02T09:00:00.000Z', '2026-05-02T09:05:00.000Z', 1, 2)],
        recentAnswers: [
          {
            isCorrect: false,
            level: 'B2',
            playerLevelAtAnswer: 'B2',
            groupId: 2,
            promptWordId: 20,
            correctWordId: 21,
            selectedWordId: 25,
            answeredAt: '2026-05-02T09:03:00.000Z',
          },
        ],
      });

      const merged = playerService.mergeLocalAndCloudProgress(local, cloud);

      expect(merged.currentLevel).toBe('C1');
      expect(merged.unlockedLevels).toEqual(['B1', 'B2', 'C1']);
      expect(merged.sessions).toHaveLength(2);
      expect(merged.recentAnswers).toHaveLength(2);
      expect(merged.stats.totalSessions).toBe(2);
      expect(merged.stats.totalQuestions).toBe(5);
      expect(merged.stats.totalCorrect).toBe(3);
      expect(merged.syncStatus).toBe('pending');
    });

    it('levels up when the current level criteria are met with level-specific mastery', () => {
      const recentAnswers = Array.from({ length: 5 }, (_, groupOffset) =>
        Array.from({ length: 8 }, (_, index) => createRecentAnswer(groupOffset + 1, groupOffset * 8 + index, true))
      ).flat();

      const profile = createProfile({
        currentLevel: 'B1',
        unlockedLevels: ['B1'],
        recentAnswers,
      });

      playerService.checkLevelUp(profile);

      expect(profile.currentLevel).toBe('B2');
      expect(profile.unlockedLevels).toEqual(['B1', 'B2']);
      expect(profile.lastLevelUp?.fromLevel).toBe('B1');
      expect(profile.lastLevelUp?.toLevel).toBe('B2');
      expect(profile.lastLevelUp?.seen).toBe(false);
    });

    it('rebuilds normalized answers from stored sessions when recentAnswers is missing', () => {
      const question = createQuestion('q-2', 2, 'B2');
      const answer = createAnswer(question, false, '2026-05-05T11:00:00.000Z');
      answer.playerLevelAtAnswer = 'B2';
      answer.contentLevel = 'B2';
      answer.selectedWordId = answer.selectedOptionId;

      const profile = createProfile({
        currentLevel: 'B2',
        recentAnswers: [],
        sessions: [
          {
            score: 0,
            total: 1,
            questions: [question],
            answers: [answer],
            statusChanges: [],
            level: 'B2',
            mode: 'main',
            startedAt: '2026-05-05T10:55:00.000Z',
            finishedAt: '2026-05-05T11:00:00.000Z',
          },
        ],
      });

      const normalized = playerService.getAllNormalizedAnswers(profile);

      expect(normalized).toHaveLength(1);
      expect(normalized[0]).toMatchObject({
        isCorrect: false,
        playerLevelAtAnswer: 'B2',
        contentLevel: 'B2',
        groupId: 2,
        correctWordId: question.correctWord.id,
      });
    });

    it('prioritizes discourse review questions that are due or belong to weak functions', () => {
      const allQuestions: DiscourseClozeQuestion[] = [
        {
          id: 101,
          passage_id: null,
          target_marker_id: null,
          target_function_id: null,
          level: 'B1',
          difficulty: 'medium',
          mode: 'normal',
          sentence_eu: 'Testua 1',
          sentence_with_blank_eu: 'A ______ B',
          answer: 'beraz',
          normalized_answer: 'beraz',
          options: ['beraz', 'hala ere'],
          discursive_function: 'ondorioa',
          correct_answer_reason_eu: 'Ondorioa adierazten du.',
          skill_focus: 'lokailuak',
          quality_level: 'gold',
          risk_level: 'low',
          review_status: 'reviewed_safe',
          is_active: true,
        },
        {
          id: 102,
          passage_id: null,
          target_marker_id: null,
          target_function_id: null,
          level: 'B1',
          difficulty: 'medium',
          mode: 'normal',
          sentence_eu: 'Testua 2',
          sentence_with_blank_eu: 'C ______ D',
          answer: 'hala ere',
          normalized_answer: 'hala ere',
          options: ['hala ere', 'beraz'],
          discursive_function: 'kontrastea',
          correct_answer_reason_eu: 'Kontrastea adierazten du.',
          skill_focus: 'lokailuak',
          quality_level: 'gold',
          risk_level: 'low',
          review_status: 'reviewed_safe',
          is_active: true,
        },
      ];

      const profile = createProfile({
        discourseClozeSessions: [
          {
            sessionId: 'disc-1',
            type: 'discourse_cloze',
            startedAt: '2026-05-01T10:00:00.000Z',
            finishedAt: '2026-05-01T10:10:00.000Z',
            level: 'B1',
            questions: [],
            answers: [
              {
                questionId: 101,
                selectedAnswer: 'hala ere',
                correctAnswer: 'beraz',
                isCorrect: false,
                answeredAt: '2026-05-01T10:05:00.000Z',
                level: 'B1',
                skillFocus: 'lokailuak',
                discursiveFunction: 'ondorioa',
              },
              {
                questionId: 102,
                selectedAnswer: 'hala ere',
                correctAnswer: 'hala ere',
                isCorrect: true,
                answeredAt: '2026-05-01T10:06:00.000Z',
                level: 'B1',
                skillFocus: 'lokailuak',
                discursiveFunction: 'kontrastea',
              },
              {
                questionId: 102,
                selectedAnswer: 'hala ere',
                correctAnswer: 'hala ere',
                isCorrect: true,
                answeredAt: '2026-05-01T10:07:00.000Z',
                level: 'B1',
                skillFocus: 'lokailuak',
                discursiveFunction: 'kontrastea',
              },
              {
                questionId: 102,
                selectedAnswer: 'hala ere',
                correctAnswer: 'hala ere',
                isCorrect: true,
                answeredAt: '2026-05-01T10:08:00.000Z',
                level: 'B1',
                skillFocus: 'lokailuak',
                discursiveFunction: 'kontrastea',
              },
            ],
            score: 3,
            total: 4,
            completed: true,
          },
        ],
        discourseClozeMastery: {
          101: {
            questionId: 101,
            level: 'B1',
            skillFocus: 'lokailuak',
            discursiveFunction: 'ondorioa',
            timesSeen: 2,
            timesCorrect: 0,
            timesWrong: 2,
            masteryScore: 1,
            status: 'reviewing',
            lastSeenAt: '2026-05-01T10:05:00.000Z',
            nextReviewAt: '2026-05-01T12:05:00.000Z',
            correctStreak: 0,
            wrongStreak: 2,
          },
          102: {
            questionId: 102,
            level: 'B1',
            skillFocus: 'lokailuak',
            discursiveFunction: 'kontrastea',
            timesSeen: 3,
            timesCorrect: 3,
            timesWrong: 0,
            masteryScore: 4,
            status: 'known',
            lastSeenAt: '2026-05-01T10:08:00.000Z',
            nextReviewAt: '2026-06-01T10:08:00.000Z',
            correctStreak: 3,
            wrongStreak: 0,
          },
        },
      });

      const reviewQuestions = playerService.getDiscourseClozeReviewQuestions(profile, allQuestions);

      expect(reviewQuestions[0]?.id).toBe(101);
      expect(reviewQuestions.map((question) => question.id)).toContain(101);
    });
  });
});
