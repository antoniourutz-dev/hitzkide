import { afterEach, describe, expect, it, vi } from 'vitest';
import { clozeService } from '../../services/clozeService';
import { discourseClozeService } from '../../services/discourseClozeService';
import { playerService } from '../../services/playerService';
import { DiscourseClozeQuestion } from '../../types/discourseCloze';
import * as supabaseModule from '../../lib/supabase';
import { contentCache } from '../../services/contentCache';

function createDiscourseQuestion(id: number): DiscourseClozeQuestion {
  return {
    id,
    passage_id: null,
    target_marker_id: null,
    target_function_id: null,
    level: 'B1',
    difficulty: 'medium',
    mode: 'normal',
    sentence_eu: 'Testu bat',
    sentence_with_blank_eu: 'A ______ B',
    answer: 'beraz',
    normalized_answer: 'beraz',
    options: ['beraz', 'hala ere'],
    discursive_function: 'ondorioa',
    correct_answer_reason_eu: 'Ondorioa azaltzen du.',
    correct_answer_reason_es: null,
    nuance_note_eu: null,
    nuance_note_es: null,
    possible_alternatives_eu: null,
    possible_alternatives_es: null,
    register_note_eu: null,
    register_note_es: null,
    not_to_use_eu: null,
    not_to_use_es: null,
    teacher_note: null,
    skill_focus: 'lokailuak',
    quality_level: 'gold',
    risk_level: 'low',
    review_status: 'reviewed_safe',
    is_active: true,
  };
}

describe('cloze and discourse services', () => {
  afterEach(() => {
    localStorage.clear();
    playerService.resetProfile('auth_required');
    vi.restoreAllMocks();
  });

  it('normalizes cloze questions and ensures the correct answer is present in options', () => {
    const normalized = clozeService.normalizeClozeQuestion({
      id: 1,
      group_id: 1,
      source_id: 1,
      level: 'B1',
      sentence_eu: 'Hau ______ da.',
      answer: 'ederra',
      options: JSON.stringify(['zaila', 'ederra', 'zaila']),
      is_active: true,
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.options).toEqual(['zaila', 'ederra']);
  });

  it('returns localized cloze explanations according to language preference', () => {
    const explanation = clozeService.getClozeExplanation({
      id: 2,
      group_id: 1,
      source_id: 1,
      level: 'B1',
      difficulty: 'easy',
      mode: 'normal',
      sentence_eu: 'Hau ______ da.',
      answer: 'ederra',
      options: ['ederra', 'okerra'],
      explanation_eu: 'Euskarazko azalpena',
      explanation_es: 'Explicacion en castellano',
      nuance_note_eu: 'Ñabardura',
      nuance_note_es: 'Matiz',
      why_not_eu: 'Ez da egokia',
      why_not_es: 'No encaja',
      skill_focus: 'esanahia',
      quality_level: 'gold',
      risk_level: 'low',
      is_active: true,
    }, 'both');

    expect(explanation.eu?.explanation).toBe('Euskarazko azalpena');
    expect(explanation.es?.explanation).toBe('Explicacion en castellano');
  });

  it('checks cloze answers case-insensitively', () => {
    const isCorrect = clozeService.checkClozeAnswer({
      id: 3,
      group_id: 1,
      source_id: 1,
      level: 'B1',
      difficulty: 'easy',
      mode: 'normal',
      sentence_eu: 'Hau ______ da.',
      answer: 'Ederra',
      options: ['Ederra', 'okerra'],
      is_active: true,
    }, ' ederra ');

    expect(isCorrect).toBe(true);
  });

  it('returns an empty cloze question list when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);

    const questions = await clozeService.fetchClozeQuestions({
      currentLevel: 'B1',
      mode: 'normal',
      limit: 5,
    });

    expect(questions).toEqual([]);
  });

  it('reuses cached cloze questions when offline', async () => {
    contentCache.write('cloze:normal:B1', [
      {
        id: 8,
        group_id: 1,
        source_id: 1,
        level: 'B1',
        difficulty: 'easy',
        mode: 'normal',
        sentence_eu: 'Hau ______ da.',
        answer: 'ederra',
        options: ['ederra', 'okerra'],
        is_active: true,
      },
    ]);
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);

    const questions = await clozeService.fetchClozeQuestions({
      currentLevel: 'B1',
      mode: 'normal',
      limit: 5,
    });

    expect(questions).toHaveLength(1);
    expect(questions[0]?.answer).toBe('ederra');
  });

  it('normalizes discourse text and answers', () => {
    expect(discourseClozeService.normalizeText('  Hala   ERE  ')).toBe('hala ere');

    const normalized = discourseClozeService.normalizeDiscourseQuestion({
      id: 1,
      sentence_with_blank_eu: 'A ______ B',
      answer: 'beraz',
      options: JSON.stringify(['hala ere', 'beraz', 'hala ere']),
      discursive_function: 'ondorioa',
      correct_answer_reason_eu: 'Ondorioa da.',
      skill_focus: 'lokailuak',
      level: 'B1',
      difficulty: 'medium',
      mode: 'normal',
      quality_level: 'gold',
      risk_level: 'low',
      review_status: 'reviewed_safe',
      is_active: true,
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.options).toEqual(['hala ere', 'beraz']);
    expect(normalized?.normalized_answer).toBe('beraz');
  });

  it('checks discourse answers against normalized answers', () => {
    const result = discourseClozeService.checkDiscourseClozeAnswer(createDiscourseQuestion(10), ' BERAZ ');

    expect(result.isCorrect).toBe(true);
    expect(result.correctAnswer).toBe('beraz');
  });

  it('builds a discourse session from fetched questions', async () => {
    vi.spyOn(discourseClozeService, 'fetchDiscourseClozeQuestions').mockResolvedValue({
      questions: [createDiscourseQuestion(11), createDiscourseQuestion(12)],
    });

    const session = await discourseClozeService.buildDiscourseClozeSession({
      currentLevel: 'B1',
      unlockedLevels: ['B1'],
      sessionSize: 5,
      mode: 'normal',
      recentlySeenQuestionIds: [],
    });

    expect(session).not.toBeNull();
    expect(session?.questions.length).toBe(2);
    expect(session?.completed).toBe(false);
  });

  it('builds a discourse review session from prioritized review questions', async () => {
    const question = createDiscourseQuestion(21);
    vi.spyOn(discourseClozeService, 'fetchDiscourseClozeQuestions').mockResolvedValue({
      questions: [question],
    });
    vi.spyOn(playerService, 'getDiscourseClozeReviewQuestions').mockReturnValue([question]);

    const session = await discourseClozeService.buildDiscourseReviewSession(playerService.getProfile(), {
      currentLevel: 'B1',
      unlockedLevels: ['B1'],
      sessionSize: 5,
    });

    expect(session).not.toBeNull();
    expect(session?.questions[0].id).toBe(21);
    expect(session?.total).toBe(1);
  });

  it('returns an error payload when discourse questions cannot be fetched offline', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);

    const result = await discourseClozeService.fetchDiscourseClozeQuestions({
      currentLevel: 'B1',
      unlockedLevels: ['B1'],
      mode: 'normal',
      limit: 5,
    });

    expect(result.questions).toEqual([]);
    expect(result.error).toBeInstanceOf(Error);
  });

  it('reuses cached discourse questions when offline', async () => {
    contentCache.write('discourse:normal:B1', [createDiscourseQuestion(55)]);
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);

    const result = await discourseClozeService.fetchDiscourseClozeQuestions({
      currentLevel: 'B1',
      unlockedLevels: ['B1'],
      mode: 'normal',
      limit: 5,
    });

    expect(result.error).toBeUndefined();
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]?.id).toBe(55);
  });
});
