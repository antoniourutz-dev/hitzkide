import { getSupabase } from '../lib/supabase';
import { LexicalClozeQuestion, ClozeLevel } from '../types/cloze';

export const clozeService = {
  async fetchClozeQuestions(params: {
    currentLevel: ClozeLevel;
    mode: 'normal' | 'aditua';
    limit?: number;
  }): Promise<LexicalClozeQuestion[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    let query = supabase
      .from('lexical_cloze_questions')
      .select('*')
      .eq('is_active', true)
      .neq('risk_level', 'high')
      .in('quality_level', ['gold', 'platinum']);

    // Level compatibility logic: simplifying complex filtering needs
    // For now, fetch a good pool and filter in JS if needed,
    // or use simpler Supabase filters if the schema supports it.
    
    const { data, error } = await query.limit(params.limit || 50);

    if (error) {
      console.error('Error fetching cloze questions:', error);
      return [];
    }

    return (data || []).map(this.normalizeClozeQuestion).filter((q): q is LexicalClozeQuestion => !!q);
  },

  normalizeClozeQuestion(raw: any): LexicalClozeQuestion | null {
    if (!raw.sentence_eu || !raw.answer) return null;

    let options = Array.isArray(raw.options) ? raw.options : [];
    if (typeof raw.options === 'string') {
        try { options = JSON.parse(raw.options); } catch { options = []; }
    }

    if (!options.includes(raw.answer)) {
      options.push(raw.answer);
    }
    options = [...new Set(options)].filter(o => !!o);

    return {
      ...raw,
      options,
    };
  },

  checkClozeAnswer(question: LexicalClozeQuestion, selectedAnswer: string): boolean {
    return (
      selectedAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase()
    );
  },

  getClozeExplanation(question: LexicalClozeQuestion, language: 'eu' | 'es' | 'both') {
    const getBlock = (isEu: boolean) => ({
      explanation: isEu ? (question.explanation_eu || question.explanation_es) : (question.explanation_es || question.explanation_eu),
      nuance: isEu ? (question.nuance_note_eu || question.nuance_note_es) : (question.nuance_note_es || question.nuance_note_eu),
      whyNot: isEu ? (question.why_not_eu || question.why_not_es) : (question.why_not_es || question.why_not_eu),
    });

    if (language === 'eu') return { eu: getBlock(true) };
    if (language === 'es') return { es: getBlock(false) };
    return { eu: getBlock(true), es: getBlock(false) };
  }
};
