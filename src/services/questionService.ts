import { LexicalGroup, LexicalWord } from '../types/lexical';
import { GameQuestion } from '../types/question';
import { PlayerProfile, UserLevel } from '../types/stats';
import { isValidGroup, isValidWord } from '../utils/guards';

const LEVEL_ORDER: UserLevel[] = ['B1', 'B2', 'C1', 'C2', 'Aditua'];

export const MAIN_SESSION_QUESTION_COUNT = 10;
export const QUICK_SESSION_QUESTION_COUNT = 5;
export const MIN_NORMAL_SESSION_QUESTIONS = 5;
const RECENT_GROUP_COOLDOWN_ANSWERS = 240;
const RECENT_PROMPT_COOLDOWN_ANSWERS = 320;
const RECENT_GROUP_HARD_BLOCK_ANSWERS = 120;

type SessionMode = 'main' | 'quick' | 'review';
type DiscardedReason =
  | 'not_enough_valid_words'
  | 'already_used_group'
  | 'already_used_prompt'
  | 'not_enough_distractors'
  | 'invalid_question_type';

type SessionBuildResult = {
  questions: GameQuestion[];
  requestedCount: number;
  generatedCount: number;
  fallbackUsed: boolean;
  discardedReasons: Record<DiscardedReason, number>;
};

type CandidateWord = LexicalWord & {
  _groupGrammar: string | null;
  _groupId: number;
};

export async function buildSessionQuestions(
  allGroups: LexicalGroup[],
  profile: PlayerProfile,
  mode: SessionMode = 'main'
): Promise<SessionBuildResult> {
  
  const validGroups = allGroups.filter(g => 
    isValidGroup(g) && 
    g.risk_level !== 'high' && 
    g.quality_level !== 'bronze'
  );
  
  const currentLevel = profile.currentLevel;
  const currentLevelIdx = LEVEL_ORDER.indexOf(currentLevel);
  const unlockedLevels = LEVEL_ORDER.slice(0, currentLevelIdx + 1);
  const nextLevel = currentLevelIdx < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[currentLevelIdx + 1] : null;
  const validWordsByGroup = new Map<number, LexicalWord[]>();
  validGroups.forEach((group) => {
    validWordsByGroup.set(group.id, group.words.filter(isValidWord));
  });

  const allCandidateWords: CandidateWord[] = [];
  const candidateWordsByGrammar = new Map<string, CandidateWord[]>();

  allGroups.forEach((group) => {
    if (!group.is_active) return;

    group.words
      .filter((word) => word.status === 'egokia' || word.status === 'kontuz')
      .forEach((word) => {
        const candidateWord: CandidateWord = {
          ...word,
          _groupId: group.id,
          _groupGrammar: group.grammar || null,
        };

        allCandidateWords.push(candidateWord);

        const grammarKey = group.grammar || '';
        const existingPool = candidateWordsByGrammar.get(grammarKey);
        if (existingPool) {
          existingPool.push(candidateWord);
        } else {
          candidateWordsByGrammar.set(grammarKey, [candidateWord]);
        }
      });
  });

  const discardedReasons: Record<DiscardedReason, number> = {
    not_enough_valid_words: 0,
    already_used_group: 0,
    already_used_prompt: 0,
    not_enough_distractors: 0,
    invalid_question_type: 0
  };

  const selectedQuestions: GameQuestion[] = [];
  const usedGroupIds = new Set<number>();
  const usedPromptWords = new Set<string>();
  const usedPromptCorrectPairs = new Set<string>(); // promptWordId-correctWordId
  const recentAnswers = profile.recentAnswers || [];
  const recentGroupIds = new Set(
    recentAnswers
      .slice(-RECENT_GROUP_COOLDOWN_ANSWERS)
      .map((answer) => answer.groupId)
      .filter((groupId): groupId is number => typeof groupId === 'number')
  );
  const veryRecentGroupIds = new Set(
    recentAnswers
      .slice(-RECENT_GROUP_HARD_BLOCK_ANSWERS)
      .map((answer) => answer.groupId)
      .filter((groupId): groupId is number => typeof groupId === 'number')
  );
  const recentPromptWordIds = new Set(
    recentAnswers
      .slice(-RECENT_PROMPT_COOLDOWN_ANSWERS)
      .map((answer) => answer.promptWordId)
      .filter((wordId): wordId is number => typeof wordId === 'number')
  );

  const requestedCount = mode === 'main' ? MAIN_SESSION_QUESTION_COUNT : QUICK_SESSION_QUESTION_COUNT;
  let targetCount = requestedCount;
  let fallbackUsed = false;

  const getCompatibleGrammar = (grammar: string) => {
    if (grammar === 'aditza') return ['aditza', 'aditz_esapidea'];
    if (grammar === 'aditz_esapidea') return ['aditz_esapidea', 'aditza'];
    if (grammar === 'adberbioa') return ['adberbioa', 'denbora_adberbioa'];
    if (grammar === 'denbora_adberbioa') return ['denbora_adberbioa', 'adberbioa'];
    if (grammar === 'lokailua') return ['lokailua', 'esapidea'];
    if (grammar === 'esapidea') return ['esapidea', 'lokailua'];
    return [grammar];
  };

  const getShuffledCopy = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

  const buildDistractorPool = (
    group: LexicalGroup,
    promptWord: LexicalWord,
    correctWord: LexicalWord
  ): LexicalWord[] => {
    const blockedWords = new Set([
      promptWord.word.toLowerCase(),
      correctWord.word.toLowerCase(),
    ]);
    const selectedDistractors: CandidateWord[] = [];
    const selectedWords = new Set<string>();

    const addFromPool = (pool: CandidateWord[]) => {
      if (selectedDistractors.length >= 3 || pool.length === 0) {
        return;
      }

      const shuffledPool = getShuffledCopy(pool);
      for (const candidate of shuffledPool) {
        const normalizedWord = candidate.word.toLowerCase();

        if (
          candidate._groupId === group.id ||
          blockedWords.has(normalizedWord) ||
          selectedWords.has(normalizedWord)
        ) {
          continue;
        }

        selectedDistractors.push(candidate);
        selectedWords.add(normalizedWord);

        if (selectedDistractors.length >= 3) {
          break;
        }
      }
    };

    addFromPool(candidateWordsByGrammar.get(group.grammar || '') || []);

    if (selectedDistractors.length < 3) {
      const compatiblePool = getCompatibleGrammar(group.grammar || '')
        .flatMap((grammar) => candidateWordsByGrammar.get(grammar) || []);
      addFromPool(compatiblePool);
    }

    if (selectedDistractors.length < 3) {
      addFromPool(allCandidateWords);
    }

    return selectedDistractors.slice(0, 3);
  };

  // Let's gather pools
  const now = new Date();

  const isUnlockedGroup = (group: LexicalGroup) => unlockedLevels.includes(group.reviewed_level as UserLevel);
  const getMastery = (group: LexicalGroup) => profile.groupMastery[group.id];
  const getLastSeenTime = (group: LexicalGroup): number => {
    const timestamp = getMastery(group)?.lastSeenAt;
    return timestamp ? new Date(timestamp).getTime() : 0;
  };
  const isReviewDue = (group: LexicalGroup): boolean => {
    const mastery = getMastery(group);
    if (!mastery) return false;
    if (mastery.status === 'reviewing' || (mastery.wrongStreak || 0) > 0) return true;
    return Boolean(mastery.nextReviewAt && new Date(mastery.nextReviewAt) <= now);
  };
  const isRestingKnownGroup = (group: LexicalGroup): boolean => {
    const status = getMastery(group)?.status;
    return (status === 'known' || status === 'mastered') && !isReviewDue(group);
  };
  const isRecentlySeenGroup = (group: LexicalGroup): boolean => recentGroupIds.has(group.id);
  const isVeryRecentlySeenGroup = (group: LexicalGroup): boolean => veryRecentGroupIds.has(group.id);
  const scoreGroupForSelection = (group: LexicalGroup): number => {
    const mastery = getMastery(group);
    const unseenBoost = !mastery || mastery.status === 'new' ? 500 : 0;
    const dueBoost = isReviewDue(group) ? 260 : 0;
    const oldnessBoost = Math.min(160, Math.max(0, now.getTime() - getLastSeenTime(group)) / (1000 * 60 * 60 * 24));
    const recentPenalty = isRecentlySeenGroup(group) ? 900 : 0;
    const veryRecentPenalty = isVeryRecentlySeenGroup(group) ? 2000 : 0;
    const masteredPenalty = isRestingKnownGroup(group) ? 900 : 0;
    const learningBoost = mastery?.status === 'learning' || mastery?.status === 'seen' ? 80 : 0;

    return unseenBoost + dueBoost + oldnessBoost + learningBoost - recentPenalty - veryRecentPenalty - masteredPenalty + Math.random();
  };
  const sortForSelection = (groups: LexicalGroup[]) => [...groups].sort((a, b) => scoreGroupForSelection(b) - scoreGroupForSelection(a));

  const poolReview = sortForSelection(validGroups.filter(g =>
    isUnlockedGroup(g) &&
    isReviewDue(g) &&
    (!isVeryRecentlySeenGroup(g) || (getMastery(g)?.wrongStreak || 0) > 0)
  ));

  const poolNewCurrentLevel = sortForSelection(validGroups.filter(g => {
    const mastery = getMastery(g);
    return g.reviewed_level === currentLevel &&
      (!mastery || mastery.status === 'new') &&
      !isRecentlySeenGroup(g);
  }));

  const poolLearningDue = sortForSelection(validGroups.filter(g => {
    const status = getMastery(g)?.status;
    return isUnlockedGroup(g) &&
      (status === 'seen' || status === 'learning') &&
      isReviewDue(g) &&
      !isVeryRecentlySeenGroup(g);
  }));

  const poolLevelExpansion = sortForSelection(validGroups.filter(g => {
    const groupLevel = g.reviewed_level as UserLevel;
    const mastery = getMastery(g);
    const isNextLevel = nextLevel && groupLevel === nextLevel;
    const isKnownUnlockedLevel = isUnlockedGroup(g);

    return (isNextLevel || isKnownUnlockedLevel) &&
      (!mastery || mastery.status === 'new') &&
      !isRecentlySeenGroup(g);
  }));

  const poolExplorationFallback = sortForSelection(validGroups.filter(g =>
    isUnlockedGroup(g) &&
    !isRecentlySeenGroup(g) &&
    !isRestingKnownGroup(g)
  ));

  const poolSoftExpansionFallback = sortForSelection(validGroups.filter(g => {
    const mastery = getMastery(g);
    return (!mastery || mastery.status === 'new') &&
      !isVeryRecentlySeenGroup(g) &&
      !isRestingKnownGroup(g);
  }));

  const poolEmergency = sortForSelection(validGroups.filter(g =>
    isUnlockedGroup(g) &&
    !isVeryRecentlySeenGroup(g)
  ));

  // Determine actual target count for 'review'
  if (mode === 'review') {
    targetCount = Math.max(3, Math.min(10, poolReview.length));
    if (poolReview.length === 0) targetCount = 3; // fallback if user clicked review with nothing pending
  }

  // Pass logic definition
  const tryGenerateFromGroup = (group: LexicalGroup, allowGroupRepeat: boolean = false): boolean => {
    if (!allowGroupRepeat && usedGroupIds.has(group.id)) {
      discardedReasons.already_used_group++;
      return false;
    }

    const validWords = validWordsByGroup.get(group.id) || [];
    if (validWords.length < 2) {
      discardedReasons.not_enough_valid_words++;
      return false;
    }

    // Try to find a valid prompt+correct pair
    const shuffledWords = [...validWords].sort((a, b) => {
      const aRecentlyPrompted = recentPromptWordIds.has(a.id) ? 1 : 0;
      const bRecentlyPrompted = recentPromptWordIds.has(b.id) ? 1 : 0;
      if (aRecentlyPrompted !== bRecentlyPrompted) {
        return aRecentlyPrompted - bRecentlyPrompted;
      }

      return Math.random() - 0.5;
    });
    let promptWord: LexicalWord | null = null;
    let correctWord: LexicalWord | null = null;

    for (let i = 0; i < shuffledWords.length; i++) {
      for (let j = 0; j < shuffledWords.length; j++) {
        if (i === j) continue;
        const p = shuffledWords[i];
        const c = shuffledWords[j];
        if (!usedPromptWords.has(p.word.toLowerCase())) {
          const pairKey = `${p.id}-${c.id}`;
          if (!usedPromptCorrectPairs.has(pairKey)) {
            promptWord = p;
            correctWord = c;
            break;
          }
        }
      }
      if (promptWord) break;
    }

    if (!promptWord || !correctWord) {
      discardedReasons.already_used_prompt++;
      return false;
    }

    const selectedDistractors = buildDistractorPool(group, promptWord, correctWord);

    if (selectedDistractors.length < 3) {
      discardedReasons.not_enough_distractors++;
      return false;
    }

    const options = [correctWord, ...selectedDistractors].sort(() => Math.random() - 0.5);

    const VALID_QUESTION_TYPES = ['direct_synonym', 'context_synonym', 'register_question', 'intensity_question'];
    let questionType = group.recommended_question_type || 'direct_synonym';
    
    if (group.review_status === 'reviewed_context_needed') {
      questionType = 'context_synonym';
    } else if (group.review_status === 'reviewed_register_sensitive') {
      questionType = 'register_question';
    }

    if (!VALID_QUESTION_TYPES.includes(questionType)) {
      discardedReasons.invalid_question_type++;
      return false;
    }

    // Success, register uses
    usedGroupIds.add(group.id);
    usedPromptWords.add(promptWord.word.toLowerCase());
    usedPromptCorrectPairs.add(`${promptWord.id}-${correctWord.id}`);

    selectedQuestions.push({
      id: `${group.id}-${Date.now()}-${Math.random()}`,
      groupId: group.id,
      sourceId: group.source_id || 0,
      questionType,
      promptWord,
      correctWord,
      options,
      meaningEs: group.meaning_es || '',
      concept: group.concept || '',
      relation: group.relation || '',
      grammar: group.grammar || '',
      category: group.category || '',
      level: group.reviewed_level || undefined,
      contentLevel: group.reviewed_level || undefined,
      playerLevelAtGeneration: profile.currentLevel,
      reviewStatus: group.review_status || undefined,
      riskLevel: group.risk_level,
      qualityLevel: group.quality_level,
      explanationShort: group.explanation_short,
      explanationLong: group.explanation_long,
      usageWarning: group.usage_warning,
      goodExample: group.good_example,
      badExample: group.bad_example,
      contrastNote: group.contrast_note,
      teachingTip: group.teaching_tip,
      explanationShortEu: group.explanation_short_eu,
      explanationLongEu: group.explanation_long_eu,
      usageWarningEu: group.usage_warning_eu,
      goodExampleEu: group.good_example_eu,
      badExampleEu: group.bad_example_eu,
      contrastNoteEu: group.contrast_note_eu,
      teachingTipEu: group.teaching_tip_eu
    });

    return true;
  };

  const populateFromPool = (pool: LexicalGroup[], limit: number, shuffle: boolean = true, allowGroupRepeat: boolean = false) => {
    let toProcess = [...pool];
    if (shuffle) toProcess = toProcess.sort(() => Math.random() - 0.5);
    
    let addedCount = 0;
    for (const group of toProcess) {
      if (selectedQuestions.length >= targetCount) break;
      if (addedCount >= limit) break;

      const success = tryGenerateFromGroup(group, allowGroupRepeat);
      if (success) {
        addedCount++;
      }
    }
  };

  const performPass = (
    pool: LexicalGroup[],
    limit: number,
    allowGroupRepeat: boolean,
    shuffle: boolean
  ) => {
    populateFromPool(pool, limit, shuffle, allowGroupRepeat);
  };

  if (mode === 'review') {
    performPass(poolReview, targetCount, false, false);
    if (selectedQuestions.length < targetCount) {
      performPass(poolLearningDue, targetCount, false, false);
    }
    if (selectedQuestions.length < targetCount) {
      performPass(poolExplorationFallback, targetCount, false, false);
    }
  } else {
    // Balanced learning loop: overdue items first, then exploration, then light challenge.
    performPass(poolReview, 2, false, false);
    performPass(poolNewCurrentLevel, 8, false, false);
    performPass(poolLevelExpansion, 4, false, false);
    performPass(poolLearningDue, 1, false, false);
    performPass(poolExplorationFallback, 10, false, false);
    performPass(poolSoftExpansionFallback, 10, false, false);
    performPass(poolEmergency, 10, false, false);

    if (mode === 'main' && selectedQuestions.length < MIN_NORMAL_SESSION_QUESTIONS) {
      performPass(poolEmergency, MIN_NORMAL_SESSION_QUESTIONS - selectedQuestions.length, true, true);
    }
  }

  // Sanity check adjustments
  if (mode === 'main') {
    if (selectedQuestions.length < MAIN_SESSION_QUESTION_COUNT) {
      fallbackUsed = true;
      if (selectedQuestions.length >= MIN_NORMAL_SESSION_QUESTIONS) {
        targetCount = MIN_NORMAL_SESSION_QUESTIONS;
      }
    }
  } else if (mode === 'quick') {
    if (selectedQuestions.length < QUICK_SESSION_QUESTION_COUNT) {
      fallbackUsed = true;
    }
  }

  const resultQuestions = (mode === 'main' && selectedQuestions.length >= MIN_NORMAL_SESSION_QUESTIONS && selectedQuestions.length < MAIN_SESSION_QUESTION_COUNT)
    ? selectedQuestions.slice(0, MIN_NORMAL_SESSION_QUESTIONS)
    : selectedQuestions.slice(0, targetCount);

  return {
    questions: resultQuestions,
    requestedCount,
    generatedCount: resultQuestions.length,
    fallbackUsed,
    discardedReasons
  };
}
