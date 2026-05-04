import { getSupabase } from '../lib/supabase';
import { 
  DiscourseClozeQuestion, 
  DiscourseClozeLevel, 
  DiscourseClozeMode,
  DiscourseClozeOptionExplanation,
  DiscourseClozeSession
} from '../types/discourseCloze';

import { playerService } from './playerService';

export const discourseClozeService = {
  normalizeText(value: string): string {
    if (!value) return '';
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  },

  normalizeDiscourseQuestion(raw: any): DiscourseClozeQuestion | null {
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
      options,
    };
  },

  async fetchDiscourseClozeQuestions(params: {
    currentLevel: DiscourseClozeLevel;
    unlockedLevels: DiscourseClozeLevel[];
    mode?: DiscourseClozeMode;
    limit?: number;
    excludeRecentlySeenIds?: number[];
  }): Promise<{ questions: DiscourseClozeQuestion[], error?: any }> {
    const supabase = getSupabase();
    if (!supabase) return { questions: [], error: new Error('Supabase client not initialized') };

    let query = supabase
      .from('discourse_cloze_questions_for_game')
      .select('*')
      .eq('is_active', true)
      .in('quality_level', ['gold', 'platinum'])
      .in('risk_level', ['low', 'medium'])
      .in('review_status', ['reviewed_safe', 'reviewed_context_needed', 'reviewed_register_sensitive']);

    if (params.mode === 'aditua') {
       query = query.eq('mode', 'aditua');
    } else {
       query = query.eq('mode', 'normal');
    }

    const limit = params.limit || 50;
    const { data, error } = await query.limit(limit);

    if (error) {
      console.error('Error fetching discourse cloze questions:', error);
      return { questions: [], error };
    }

    const questions = (data || []).map(this.normalizeDiscourseQuestion).filter((q): q is DiscourseClozeQuestion => !!q);
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

  async buildDiscourseReviewSession(profile: any, params: {
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
    const { questions, error } = await this.fetchDiscourseClozeQuestions({
      currentLevel: params.currentLevel,
      unlockedLevels: params.unlockedLevels,
      mode: params.mode || 'normal',
      limit: 100
    });

    if (error || questions.length === 0) return null;

    // Filter recently seen if we have enough
    let pool = questions;
    if (params.recentlySeenQuestionIds && params.recentlySeenQuestionIds.length > 0) {
      const filtered = questions.filter(q => !params.recentlySeenQuestionIds!.includes(q.id));
      if (filtered.length >= params.sessionSize) {
        pool = filtered;
      }
    }

    // Shuffle and pick
    const selected = pool.sort(() => 0.5 - Math.random()).slice(0, params.sessionSize);

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
