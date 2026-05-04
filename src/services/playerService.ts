import { PlayerProfile, UserLevel, MasteryStatus, ItemMastery, SessionResult } from '../types/stats';
import { ClozeSession, ClozeMastery } from '../types/cloze';
import { DiscourseClozeSession, DiscourseClozeMastery } from '../types/discourseCloze';
import { GameQuestion } from '../types/question';

const PLAYER_KEY = 'hitzkideak_player_profile';

const INITIAL_PROFILE: PlayerProfile = {
  installationId: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
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
    dailySessionsCount: 0
  },
  groupMastery: {},
  wordMastery: {},
  clozeSessions: [],
  clozeMastery: {},
  lastLevelUp: null,
  recentAnswers: []
};

const LEVEL_ORDER: UserLevel[] = ['B1', 'B2', 'C1', 'C2', 'Aditua'];

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
    const base = LEVEL_CRITERIA[level];
    
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
    const saved = localStorage.getItem(PLAYER_KEY);
    let profile = INITIAL_PROFILE;
    let needsSave = false;
    if (saved) {
      try {
        profile = JSON.parse(saved);
      } catch {
        profile = INITIAL_PROFILE;
      }
    }

    if (!profile.groupMastery) { profile.groupMastery = {}; needsSave = true; }
    if (!profile.clozeSessions) { profile.clozeSessions = []; needsSave = true; }
    if (!profile.clozeMastery) { profile.clozeMastery = {}; needsSave = true; }
    if (!profile.discourseClozeSessions) { profile.discourseClozeSessions = []; needsSave = true; }
    if (!profile.discourseClozeMastery) { profile.discourseClozeMastery = {}; needsSave = true; }
    if (!profile.recentAnswers) { profile.recentAnswers = []; needsSave = true; }
    
    // Normalize level answers and rebuild if missing from sessions
    if ((!profile.recentAnswers.length && profile.sessions && profile.sessions.length > 0) || 
        (profile.recentAnswers.length > 0 && !profile.recentAnswers[0].playerLevelAtAnswer && !profile.recentAnswers[0].contentLevel)) {
      this.rebuildRecentAnswersFromSessions(profile);
      needsSave = true;
    }

    if (needsSave) {
      this.saveProfile(profile);
    }

    return profile;
  },

  saveClozeSession(session: ClozeSession) {
    const profile = this.getProfile();
    profile.clozeSessions.push(session);
    this.saveProfile(profile);
  },

  saveDiscourseClozeSession(session: any) {
    const profile = this.getProfile();
    if (!profile.discourseClozeSessions) profile.discourseClozeSessions = [];
    profile.discourseClozeSessions.push(session);
    this.saveProfile(profile);
  },

  updateDiscourseClozeMastery(questionId: number, isCorrect: boolean, level: any, skillFocus: string, discursiveFunction: string) {
    const profile = this.getProfile();
    if (!profile.discourseClozeMastery) profile.discourseClozeMastery = {};
    
    let mastery = profile.discourseClozeMastery[questionId] || {
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

    profile.discourseClozeMastery[questionId] = mastery as any;
    this.saveProfile(profile);
  },

  updateClozeMastery(questionId: number, isCorrect: boolean, level: UserLevel) {
    const profile = this.getProfile();
    let mastery = profile.clozeMastery[questionId] || {
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
    this.saveProfile(profile);
  },

  saveProfile(profile: PlayerProfile) {
    localStorage.setItem(PLAYER_KEY, JSON.stringify(profile));
  },

  updateSession(score: number, questions: GameQuestion[], answers: any[], mode: string = 'main'): SessionResult {
    const profile = this.getProfile();
    const statusChanges: any[] = [];
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
    questions.forEach((q, idx) => {
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
    profile.sessions.push(sessionResult);

    this.saveProfile(profile);

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
    const levelAnswers = allAnswers.filter((a: any) => {
      const answerLevel = a.playerLevelAtAnswer || a.level || profile.currentLevel;
      return answerLevel === profile.currentLevel;
    });
    const totalCount = levelAnswers.length;

    // Use level-specific mastery!
    const levelGroupMastery = this.buildLevelGroupMastery(profile, profile.currentLevel);
    const currentLevelGroups: ItemMastery[] = Object.values(levelGroupMastery);
      
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

    let knowledgeScore = 0;
    currentLevelGroups.forEach(m => {
        knowledgeScore += getKnowledgeScoreForGroup(m);
    });

    const totalSeenGroups = currentLevelGroups.length;
    const knowledgeRate = totalSeenGroups > 0 ? (knowledgeScore / totalSeenGroups) : 0;

    const lastN = levelAnswers.slice(-40);
    const recentAccuracy = lastN.length > 0 ? (lastN.filter(a => a.isCorrect).length / lastN.length) : 0;

    const criteria = this.getLevelCriteria(profile.currentLevel, totalCount, recentAccuracy, reviewingRatio);
    if (totalCount >= criteria.questions && recentAccuracy >= criteria.accuracy && knowledgeRate >= criteria.effectiveMastery && reviewingRatio <= criteria.review) {
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
      const allAnswers: any[] = [];
      const validLevels = ['B1', 'B2', 'C1', 'C2', 'Aditua'];
      if (profile.sessions) {
        profile.sessions.forEach(session => {
          if (session.answers) {
            session.answers.forEach((ans: any) => {
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
        this.saveProfile(profile);
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
    const seenGroupIdArray = Object.keys(levelGroupMastery).map(Number);
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

    const knowledgeScore = currentLevelGroups.reduce((score, m) => score + getKnowledgeScoreForGroup(m), 0);

    const totalSeenGroups = currentLevelGroups.length;
    const knowledgeRate = totalSeenGroups > 0 ? (knowledgeScore / totalSeenGroups) : 0;

    const lastN = answersForLevel.slice(-40);
    const recentAccuracy = lastN.length > 0 ? (lastN.filter(a => a.isCorrect).length / lastN.length) : 0;
    
    // Debug logging
    console.log("[level-mastery-debug]", {
      level: currentLevel,
      answersForLevel: answersForLevel.length,
      levelGroupMastery,
      totalGroupsSeenInThisLevel: totalSeenGroups,
      knowledgeScore,
      knowledgeRate,
    });


    const criteria = this.getLevelCriteria(currentLevel, totalCount, recentAccuracy, reviewingRatio);
    const targetQuestions = criteria.questions;
    const targetAccuracy = criteria.accuracy;
    const targetMastery = criteria.effectiveMastery;
    const maxReviewing = criteria.review;

    const questionProgress = Math.min(1, totalCount / targetQuestions);
    const accuracyProgress = totalCount === 0 ? 0 : Math.min(1, recentAccuracy / targetAccuracy);
    const masteryProgress = totalSeenGroups === 0 ? 0 : Math.min(1, knowledgeRate / targetMastery);
    
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
  }

};
