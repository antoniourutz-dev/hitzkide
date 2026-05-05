import { getSupabase } from '../lib/supabase';
import { LexicalClozeQuestion, ClozeLevel } from '../types/cloze';

type RawClozeQuestion = Omit<Partial<LexicalClozeQuestion>, 'options'> & {
  sentence_eu?: string | null;
  answer?: string | null;
  options?: string[] | string | null;
};

const CLOZE_LEVEL_ORDER: ClozeLevel[] = ['B1', 'B2', 'C1', 'C2', 'Aditua'];

function shuffleArray<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export function getAccessibleClozeLevels(currentLevel: ClozeLevel, mode: 'normal' | 'aditua'): ClozeLevel[] {
  if (mode === 'aditua') {
    return ['Aditua'];
  }

  const currentIndex = CLOZE_LEVEL_ORDER.indexOf(currentLevel);
  return CLOZE_LEVEL_ORDER.slice(0, currentIndex + 1);
}

export const clozeService = {
  async fetchClozeQuestions(params: {
    currentLevel: ClozeLevel;
    mode: 'normal' | 'aditua';
    limit?: number;
  }): Promise<LexicalClozeQuestion[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    const accessibleLevels = getAccessibleClozeLevels(params.currentLevel, params.mode);
    const requestedLimit = params.limit || 50;
    const queryLimit = Math.max(requestedLimit * 4, 50);

    const query = supabase
      .from('lexical_cloze_questions')
      .select('*')
      .eq('is_active', true)
      .neq('risk_level', 'high')
      .in('quality_level', ['gold', 'platinum'])
      .eq('mode', params.mode)
      .in('level', accessibleLevels);

    const { data, error } = await query.limit(queryLimit);

    if (error) {
      console.error('Error fetching cloze questions:', error);
      return [];
    }

    const normalizedQuestions = (data || [])
      .map(this.normalizeClozeQuestion)
      .filter((q): q is LexicalClozeQuestion => !!q);
    const currentLevelQuestions = shuffleArray(
      normalizedQuestions.filter((question) => question.level === params.currentLevel)
    );
    const fallbackQuestions = shuffleArray(
      normalizedQuestions.filter((question) => question.level !== params.currentLevel)
    );

    return [...currentLevelQuestions, ...fallbackQuestions].slice(0, requestedLimit);
  },

  normalizeClozeQuestion(raw: RawClozeQuestion): LexicalClozeQuestion | null {
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
      id: raw.id ?? 0,
      group_id: raw.group_id ?? null,
      source_id: raw.source_id ?? null,
      level: raw.level ?? 'B1',
      difficulty: raw.difficulty ?? null,
      mode: raw.mode ?? 'normal',
      sentence_eu: raw.sentence_eu,
      answer: raw.answer,
      is_active: raw.is_active ?? true,
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
