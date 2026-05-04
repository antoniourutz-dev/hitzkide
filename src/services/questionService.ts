import { LexicalGroup, LexicalWord } from '../types/lexical';
import { GameQuestion } from '../types/question';
import { PlayerProfile, UserLevel } from '../types/stats';
import { isValidGroup, isValidWord } from '../utils/guards';
import { playerService } from './playerService';

const LEVEL_ORDER: UserLevel[] = ['B1', 'B2', 'C1', 'C2', 'Aditua'];

export const MAIN_SESSION_QUESTION_COUNT = 10;
export const QUICK_SESSION_QUESTION_COUNT = 5;
export const MIN_NORMAL_SESSION_QUESTIONS = 5;

type SessionMode = 'main' | 'quick' | 'review';

export async function buildSessionQuestions(
  allGroups: LexicalGroup[],
  profile: PlayerProfile,
  mode: SessionMode = 'main'
): Promise<{ questions: GameQuestion[], requestedCount: number, generatedCount: number, fallbackUsed: boolean, discardedReasons: any }> {
  
  const validGroups = allGroups.filter(g => 
    isValidGroup(g) && 
    g.risk_level !== 'high' && 
    g.quality_level !== 'bronze'
  );
  
  const currentLevel = profile.currentLevel;
  const currentLevelIdx = LEVEL_ORDER.indexOf(currentLevel);
  const unlockedLevels = LEVEL_ORDER.slice(0, currentLevelIdx + 1);
  const nextLevel = currentLevelIdx < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[currentLevelIdx + 1] : null;

  const discardedReasons: Record<string, number> = {
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

  const requestedCount = mode === 'main' ? MAIN_SESSION_QUESTION_COUNT : QUICK_SESSION_QUESTION_COUNT;
  let targetCount = requestedCount;
  let fallbackUsed = false;

  const progress = playerService.calculateLevelProgress(profile);
  const reqQuestions = progress.missingRequirements.find(r => r.label === 'Galderak')?.isMet;
  const reqAccuracy = progress.missingRequirements.find(r => r.label === 'Akurazia')?.isMet;
  const reqReview = progress.missingRequirements.find(r => r.label === 'Berrikusteko')?.isMet;
  const reqMastery = progress.missingRequirements.find(r => r.label === 'Ezagutza')?.isMet;

  const knowledgeGap = reqQuestions && reqAccuracy && reqReview && !reqMastery;

  // Let's gather pools
  const now = new Date();
  
  // pool consolidation: learning groups close to becoming known
  const poolConsolidation = validGroups.filter(g => 
    g.reviewed_level === currentLevel &&
    profile.groupMastery[g.id]?.status === 'learning' &&
    ((profile.groupMastery[g.id].masteryScore || 0) >= 2 || (profile.groupMastery[g.id].correctStreak || 0) >= 1 || (profile.groupMastery[g.id].timesCorrect || 0) >= 1) &&
    (profile.groupMastery[g.id].timesSeen || 0) >= 1
  ).sort((a, b) => {
    const ma = profile.groupMastery[a.id];
    const mb = profile.groupMastery[b.id];
    if (mb.masteryScore !== ma.masteryScore) return (mb.masteryScore || 0) - (ma.masteryScore || 0);
    return (mb.correctStreak || 0) - (ma.correctStreak || 0);
  });

  // pool 1: current level, unseen or learning (excluding consolidation)
  const pool1 = validGroups.filter(g => 
    g.reviewed_level === currentLevel && 
    (!profile.groupMastery[g.id] || ['new', 'seen', 'learning'].includes(profile.groupMastery[g.id].status)) &&
    !poolConsolidation.find(cg => cg.id === g.id)
  );

  // pool 2: review of unlocked levels
  const pool2 = validGroups.filter(g => 
    unlockedLevels.includes(g.reviewed_level as UserLevel) &&
    (profile.groupMastery[g.id]?.status === 'reviewing' || (profile.groupMastery[g.id]?.nextReviewAt && new Date(profile.groupMastery[g.id].nextReviewAt!) < now))
  );

  // pool 3: challenge
  const pool3 = nextLevel ? validGroups.filter(g => g.reviewed_level === nextLevel) : [];

  // pool 4: any active/safe from unlocked levels
  const pool4 = validGroups.filter(g => unlockedLevels.includes(g.reviewed_level as UserLevel));

  // Determine actual target count for 'review'
  if (mode === 'review') {
    targetCount = Math.max(3, Math.min(10, pool2.length)); 
    if (pool2.length === 0) targetCount = 3; // fallback if user clicked review with nothing pending, we will just give 3 to not crash.
  }

  // Pass logic definition
  const tryGenerateFromGroup = (group: LexicalGroup, allowGroupRepeat: boolean = false): boolean => {
    if (!allowGroupRepeat && usedGroupIds.has(group.id)) {
      discardedReasons.already_used_group++;
      return false;
    }

    const validWords = group.words.filter(isValidWord);
    if (validWords.length < 2) {
      discardedReasons.not_enough_valid_words++;
      return false;
    }

    // Try to find a valid prompt+correct pair
    const shuffledWords = [...validWords].sort(() => Math.random() - 0.5);
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

    // Distractors
    const getCompatibleGrammar = (grammar: string) => {
      if (grammar === 'aditza') return ['aditza', 'aditz_esapidea'];
      if (grammar === 'aditz_esapidea') return ['aditz_esapidea', 'aditza'];
      if (grammar === 'adberbioa') return ['adberbioa', 'denbora_adberbioa'];
      if (grammar === 'denbora_adberbioa') return ['denbora_adberbioa', 'adberbioa'];
      if (grammar === 'lokailua') return ['lokailua', 'esapidea'];
      if (grammar === 'esapidea') return ['esapidea', 'lokailua'];
      return [grammar];
    };

    const compatibleGrammars = getCompatibleGrammar(group.grammar || '');

    // Get all candidate words
    const allCandidateWords = allGroups
      .filter(g => g.is_active)
      .flatMap(g => g.words.filter(w => w.status === 'egokia' || w.status === 'kontuz').map(w => ({ ...w, _groupId: g.id, _groupGrammar: g.grammar })))
      .filter(w => (
        w.word.toLowerCase() !== promptWord!.word.toLowerCase() && 
        w.word.toLowerCase() !== correctWord!.word.toLowerCase()
      ));

    // Step 1: Exact grammar + different group
    let distractors = allCandidateWords.filter(w => w._groupId !== group.id && w._groupGrammar === group.grammar);
    
    // Step 2: Compatible grammar if not enough
    if (distractors.length < 3) {
      const compatibleDistractors = allCandidateWords.filter(w => w._groupId !== group.id && compatibleGrammars.includes(w._groupGrammar || ''));
      // Combine and unique
      const seen = new Set(distractors.map(w => w.word.toLowerCase()));
      for(const d of compatibleDistractors) {
        if(!seen.has(d.word.toLowerCase())) {
          seen.add(d.word.toLowerCase());
          distractors.push(d);
        }
      }
    }

    // Step 3: Any safe group if STILL not enough
    if (distractors.length < 3) {
      const allSafeDistractors = allCandidateWords.filter(w => w._groupId !== group.id);
      const seen = new Set(distractors.map(w => w.word.toLowerCase()));
      for(const d of allSafeDistractors) {
        if(!seen.has(d.word.toLowerCase())) {
          seen.add(d.word.toLowerCase());
          distractors.push(d);
        }
      }
    }

    // Shuffle and pick 3
    const shuffledDistractors = distractors.sort(() => Math.random() - 0.5);
    const selectedDistractors = shuffledDistractors.slice(0, 3);

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

  let fallbackStep = 0;
  
  const performPass = (
    pool: LexicalGroup[],
    limit: number,
    allowGroupRepeat: boolean,
    shuffle: boolean
  ) => {
    fallbackStep++;
    populateFromPool(pool, limit, shuffle, allowGroupRepeat);
  };

  if (mode === 'review') {
    performPass(pool2, targetCount, false, true);
    if (selectedQuestions.length < targetCount) {
      performPass(pool4, targetCount, false, true);
    }
  } else {
    // 5-pass generation strategy
    // Pass 1: Consolidation (allow repeat groupId)
    performPass(poolConsolidation, 10, true, false);
    
    // Pass 2: Current level (unseen or learning)
    performPass(pool1, 10, false, true);
    
    // Pass 3: Review
    performPass(pool2, 10, false, true);
    
    // Pass 4: Challenge
    performPass(pool3, 10, false, true);
    
    // Pass 5: Fallback to any safe group
    performPass(pool4, 10, true, true);
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

  if (import.meta.env.DEV) {
    console.log("[session-generation]", {
      mode,
      requestedCount,
      generatedCount: resultQuestions.length,
      fallbackUsed,
      fallbackStep,
      discardedReasons
    });
  }

  return {
    questions: resultQuestions,
    requestedCount,
    generatedCount: resultQuestions.length,
    fallbackUsed,
    discardedReasons
  };
}
