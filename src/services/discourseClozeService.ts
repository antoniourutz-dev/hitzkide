import { getSupabase } from '../lib/supabase';
import { 
  DiscourseClozeQuestion, 
  DiscourseClozeLevel, 
  DiscourseClozeMode,
  DiscourseClozeOptionExplanation,
  DiscourseClozeSession
} from '../types/discourseCloze';
import { PlayerProfile } from '../types/stats';
import { playerService } from './playerService';
import { contentCache } from './contentCache';
import { observabilityService } from '../analytics/observabilityService';
import { createClientId } from '../lib/id';

type RawDiscourseQuestion = Omit<Partial<DiscourseClozeQuestion>, 'options'> & {
  id?: number | null;
  sentence_with_blank_eu?: string | null;
  answer?: string | null;
  options?: string[] | string | null;
};

type DiscourseQuestionFetchResult = {
  questions: DiscourseClozeQuestion[];
  error?: unknown;
};

const DISCOURSE_LEVEL_ORDER: DiscourseClozeLevel[] = ['B1', 'B2', 'C1', 'C2', 'Aditua'];

function shuffleArray<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function buildDiscourseCacheKey(levels: DiscourseClozeLevel[], mode?: DiscourseClozeMode): string {
  return `discourse:${mode || 'all'}:${levels.join(',')}`;
}

function buildDiscourseExplanationCacheKey(questionId: number): string {
  return `discourse-explanations:${questionId}`;
}

function prioritizeDiscourseQuestions(
  questions: DiscourseClozeQuestion[],
  currentLevel: DiscourseClozeLevel,
  requestedLimit: number,
  excludeRecentlySeenIds?: number[]
): DiscourseClozeQuestion[] {
  let filteredQuestions = questions;

  if (excludeRecentlySeenIds && excludeRecentlySeenIds.length > 0) {
    const unseenQuestions = filteredQuestions.filter(
      (question) => !excludeRecentlySeenIds.includes(question.id)
    );

    if (unseenQuestions.length >= Math.min(requestedLimit, filteredQuestions.length)) {
      filteredQuestions = unseenQuestions;
    }
  }

  const currentLevelQuestions = shuffleArray(
    filteredQuestions.filter((question) => question.level === currentLevel)
  );
  const fallbackQuestions = shuffleArray(
    filteredQuestions.filter((question) => question.level !== currentLevel)
  );

  return [...currentLevelQuestions, ...fallbackQuestions].slice(0, requestedLimit);
}

export function getAccessibleDiscourseLevels(
  currentLevel: DiscourseClozeLevel,
  unlockedLevels: DiscourseClozeLevel[]
): DiscourseClozeLevel[] {
  const currentIndex = DISCOURSE_LEVEL_ORDER.indexOf(currentLevel);
  const fallbackLevels = DISCOURSE_LEVEL_ORDER.slice(0, currentIndex + 1);
  const candidateLevels = unlockedLevels.length > 0 ? unlockedLevels : fallbackLevels;

  return candidateLevels
    .filter((level): level is DiscourseClozeLevel => DISCOURSE_LEVEL_ORDER.includes(level))
    .filter((level) => DISCOURSE_LEVEL_ORDER.indexOf(level) <= currentIndex)
    .sort((left, right) => DISCOURSE_LEVEL_ORDER.indexOf(left) - DISCOURSE_LEVEL_ORDER.indexOf(right));
}

export const discourseClozeService = {
  normalizeText(value: string): string {
    if (!value) return '';
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  },

  normalizeDiscourseQuestion(raw: RawDiscourseQuestion): DiscourseClozeQuestion | null {
    if (!raw.id || !raw.sentence_with_blank_eu || !raw.answer) return null;

    let options = Array.isArray(raw.options) ? raw.options : [];
    if (typeof raw.options === 'string') {
        try { options = JSON.parse(raw.options); } catch { options = []; }
    }

    if (!options.includes(raw.answer)) {
      options.push(raw.answer);
    }
    
    options = [...new Set(options)].filter(o => !!o);
    
    if (options.length < 2) return null;

    return {
      ...raw,
      id: raw.id,
      passage_id: raw.passage_id ?? null,
      target_marker_id: raw.target_marker_id ?? null,
      target_function_id: raw.target_function_id ?? null,
      level: raw.level ?? 'B1',
      difficulty: raw.difficulty ?? 'medium',
      mode: raw.mode ?? 'normal',
      sentence_eu: raw.sentence_eu ?? raw.sentence_with_blank_eu,
      sentence_with_blank_eu: raw.sentence_with_blank_eu,
      answer: raw.answer,
      normalized_answer: raw.normalized_answer ?? this.normalizeText(raw.answer),
      discursive_function: raw.discursive_function ?? 'besterik',
      correct_answer_reason_eu: raw.correct_answer_reason_eu ?? '',
      skill_focus: raw.skill_focus ?? 'orokorra',
      quality_level: raw.quality_level ?? 'gold',
      risk_level: raw.risk_level ?? 'low',
      review_status: raw.review_status ?? 'reviewed_safe',
      is_active: raw.is_active ?? true,
      options,
    };
  },

  async fetchDiscourseClozeQuestions(params: {
    currentLevel: DiscourseClozeLevel;
    unlockedLevels: DiscourseClozeLevel[];
    mode?: DiscourseClozeMode;
    limit?: number;
    excludeRecentlySeenIds?: number[];
  }): Promise<DiscourseQuestionFetchResult> {
    const accessibleLevels = getAccessibleDiscourseLevels(params.currentLevel, params.unlockedLevels);
    const requestedLimit = params.limit || 50;
    const queryLimit = Math.max(requestedLimit * 4, 100);
    const cacheKey = buildDiscourseCacheKey(accessibleLevels, params.mode);
    const cachedQuestions = contentCache.read<DiscourseClozeQuestion[]>(cacheKey) || [];
    const fallbackQuestions = prioritizeDiscourseQuestions(
      cachedQuestions,
      params.currentLevel,
      requestedLimit,
      params.excludeRecentlySeenIds
    );
    const supabase = getSupabase();

    if (!supabase) {
      return fallbackQuestions.length > 0
        ? { questions: fallbackQuestions }
        : { questions: [], error: new Error('Supabase client not initialized') };
    }

    let query = supabase
      .from('discourse_cloze_questions_for_game')
      .select('*')
      .eq('is_active', true)
      .in('quality_level', ['gold', 'platinum'])
      .in('risk_level', ['low', 'medium'])
      .in('review_status', ['reviewed_safe', 'reviewed_context_needed', 'reviewed_register_sensitive'])
      .in('level', accessibleLevels);

    if (params.mode === 'aditua') {
       query = query.eq('mode', 'aditua');
    } else if (params.mode === 'normal') {
       query = query.eq('mode', 'normal');
    }

    const { data, error } = await query.limit(queryLimit);

    if (error) {
      observabilityService.captureError('supabase.discourse_fetch_failed', 'supabase', error, {
        mode: params.mode || 'normal',
        currentLevel: params.currentLevel,
      });
      return fallbackQuestions.length > 0
        ? { questions: fallbackQuestions }
        : { questions: [], error };
    }

    const normalizedQuestions: DiscourseClozeQuestion[] = (data || [])
      .map(this.normalizeDiscourseQuestion)
      .filter((q): q is DiscourseClozeQuestion => !!q);

    if (normalizedQuestions.length > 0) {
      contentCache.write(cacheKey, normalizedQuestions);
    }

    const questions = prioritizeDiscourseQuestions(
      normalizedQuestions.length > 0 ? normalizedQuestions : cachedQuestions,
      params.currentLevel,
      requestedLimit,
      params.excludeRecentlySeenIds
    );
    return { questions };
  },

  async fetchDiscourseOptionExplanations(questionId: number): Promise<DiscourseClozeOptionExplanation[]> {
    const cacheKey = buildDiscourseExplanationCacheKey(questionId);
    const cachedExplanations = contentCache.read<DiscourseClozeOptionExplanation[]>(cacheKey) || [];
    const supabase = getSupabase();
    if (!supabase) return cachedExplanations;

    const { data, error } = await supabase
      .from('discourse_cloze_options_for_game')
      .select('*')
      .eq('question_id', questionId)
      .order('option_order');

    if (error) {
      observabilityService.captureError('supabase.discourse_option_fetch_failed', 'supabase', error, {
        questionId,
      });
      return cachedExplanations;
    }

    const normalizedExplanations = data || [];
    if (normalizedExplanations.length > 0) {
      contentCache.write(cacheKey, normalizedExplanations);
    }

    return normalizedExplanations.length > 0 ? normalizedExplanations : cachedExplanations;
  },

  async buildDiscourseReviewSession(profile: PlayerProfile, params: {
    currentLevel: DiscourseClozeLevel;
    unlockedLevels: DiscourseClozeLevel[];
    sessionSize: number;
  }): Promise<DiscourseClozeSession | null> {
    const { questions, error } = await this.fetchDiscourseClozeQuestions({
      currentLevel: params.currentLevel,
      unlockedLevels: params.unlockedLevels,
      limit: 500
    });

    if (error || questions.length === 0) return null;

    const reviewQuestions = playerService.getDiscourseClozeReviewQuestions(profile, questions);
    if (reviewQuestions.length === 0) return null;

    const selected = reviewQuestions.slice(0, Math.max(5, params.sessionSize));

    return {
      sessionId: createClientId('discourse-review-session'),
      type: 'discourse_cloze',
      startedAt: new Date().toISOString(),
      level: params.currentLevel,
      questions: selected,
      answers: [],
      score: 0,
      total: selected.length,
      completed: false
    };
  },

  async buildDiscourseClozeSession(params: {
    currentLevel: DiscourseClozeLevel;
    unlockedLevels: DiscourseClozeLevel[];
    sessionSize: 5 | 10 | 15;
    mode?: DiscourseClozeMode;
    recentlySeenQuestionIds?: number[];
  }): Promise<DiscourseClozeSession | null> {
    const result: DiscourseQuestionFetchResult = await this.fetchDiscourseClozeQuestions({
      currentLevel: params.currentLevel,
      unlockedLevels: params.unlockedLevels,
      mode: params.mode || 'normal',
      limit: 100,
      excludeRecentlySeenIds: params.recentlySeenQuestionIds
    });
    const { questions, error } = result;

    if (error || questions.length === 0) return null;

    const selected: DiscourseClozeQuestion[] = shuffleArray(questions).slice(0, params.sessionSize);

    return {
      sessionId: createClientId('discourse-session'),
      type: 'discourse_cloze',
      startedAt: new Date().toISOString(),
      level: params.currentLevel,
      questions: selected,
      answers: [],
      score: 0,
      total: selected.length,
      completed: false
    };
  },

  checkDiscourseClozeAnswer(question: DiscourseClozeQuestion, selectedAnswer: string) {
    const normalizedSelected = this.normalizeText(selectedAnswer);
    const normalizedCorrect = this.normalizeText(question.answer);
    const isCorrect = normalizedSelected === normalizedCorrect || 
                     (question.normalized_answer && normalizedSelected === question.normalized_answer);

    return {
      questionId: question.id,
      selectedAnswer,
      correctAnswer: question.answer,
      isCorrect,
      answeredAt: new Date().toISOString(),
      level: question.level,
      skillFocus: question.skill_focus,
      discursiveFunction: question.discursive_function
    };
  }
};
