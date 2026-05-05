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
    const supabase = getSupabase();
    if (!supabase) return { questions: [], error: new Error('Supabase client not initialized') };
    const accessibleLevels = getAccessibleDiscourseLevels(params.currentLevel, params.unlockedLevels);
    const requestedLimit = params.limit || 50;
    const queryLimit = Math.max(requestedLimit * 4, 100);

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
      console.error('Error fetching discourse cloze questions:', error);
      return { questions: [], error };
    }

    let questions: DiscourseClozeQuestion[] = (data || [])
      .map(this.normalizeDiscourseQuestion)
      .filter((q): q is DiscourseClozeQuestion => !!q);

    if (params.excludeRecentlySeenIds && params.excludeRecentlySeenIds.length > 0) {
      const unseenQuestions = questions.filter((question) => !params.excludeRecentlySeenIds!.includes(question.id));
      if (unseenQuestions.length >= Math.min(requestedLimit, questions.length)) {
        questions = unseenQuestions;
      }
    }

    const currentLevelQuestions = shuffleArray(
      questions.filter((question) => question.level === params.currentLevel)
    );
    const fallbackQuestions = shuffleArray(
      questions.filter((question) => question.level !== params.currentLevel)
    );

    questions = [...currentLevelQuestions, ...fallbackQuestions].slice(0, requestedLimit);
    return { questions };
  },

  async fetchDiscourseOptionExplanations(questionId: number): Promise<DiscourseClozeOptionExplanation[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('discourse_cloze_options_for_game')
      .select('*')
      .eq('question_id', questionId)
      .order('option_order');

    if (error) {
      console.error('Error fetching discourse option explanations:', error);
      return [];
    }

    return data || [];
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
      sessionId: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
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
      sessionId: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
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
