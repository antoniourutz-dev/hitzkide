import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import HomePage from '../../pages/HomePage';
import DailyGamePage from '../../pages/DailyGamePage';
import SessionResultPage from '../../pages/SessionResultPage';
import ClozeGamePage from '../../pages/ClozeGamePage';
import DiscourseClozeGamePage from '../../pages/DiscourseClozeGamePage';
import { GameQuestion } from '../../types/question';
import { LexicalClozeQuestion } from '../../types/cloze';
import { DiscourseClozeQuestion, DiscourseClozeSession } from '../../types/discourseCloze';
import { AnswerResult } from '../../types/stats';
import { playerService } from '../../services/playerService';

const mocks = vi.hoisted(() => ({
  fetchGameData: vi.fn(),
  hasCachedGameData: vi.fn(),
  buildSessionQuestions: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchClozeQuestions: vi.fn(),
  checkClozeAnswer: vi.fn(),
  getClozeExplanation: vi.fn(),
  buildDiscourseClozeSession: vi.fn(),
  buildDiscourseReviewSession: vi.fn(),
  fetchDiscourseOptionExplanations: vi.fn(),
  checkDiscourseClozeAnswer: vi.fn(),
  supabaseGetUser: vi.fn(),
  supabaseMaybeSingle: vi.fn(),
  supabaseProfileUpsert: vi.fn(),
  supabaseSnapshotUpsert: vi.fn(),
}));

vi.mock('../../hooks/useLanguagePreference', () => ({
  useLanguagePreference: () => ['eu', vi.fn()],
}));

vi.mock('../../services/lexicalService', () => ({
  fetchGameData: (...args: unknown[]) => mocks.fetchGameData(...args),
  hasCachedGameData: (...args: unknown[]) => mocks.hasCachedGameData(...args),
}));

vi.mock('../../services/questionService', () => ({
  buildSessionQuestions: (...args: unknown[]) => mocks.buildSessionQuestions(...args),
}));

vi.mock('../../services/authService', () => ({
  authService: {
    getCurrentUser: (...args: unknown[]) => mocks.getCurrentUser(...args),
    getDisplayName: (user: { user_metadata?: { username?: string; display_name?: string }; email?: string } | null) =>
      user?.user_metadata?.username || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Gonbidatua',
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
}));

vi.mock('../../services/clozeService', () => ({
  clozeService: {
    fetchClozeQuestions: (...args: unknown[]) => mocks.fetchClozeQuestions(...args),
    checkClozeAnswer: (...args: unknown[]) => mocks.checkClozeAnswer(...args),
    getClozeExplanation: (...args: unknown[]) => mocks.getClozeExplanation(...args),
  },
}));

vi.mock('../../services/discourseClozeService', () => ({
  discourseClozeService: {
    buildDiscourseClozeSession: (...args: unknown[]) => mocks.buildDiscourseClozeSession(...args),
    buildDiscourseReviewSession: (...args: unknown[]) => mocks.buildDiscourseReviewSession(...args),
    fetchDiscourseOptionExplanations: (...args: unknown[]) => mocks.fetchDiscourseOptionExplanations(...args),
    checkDiscourseClozeAnswer: (...args: unknown[]) => mocks.checkDiscourseClozeAnswer(...args),
  },
}));

vi.mock('../../lib/supabase', () => ({
  getSupabase: () => ({
    auth: {
      getUser: mocks.supabaseGetUser,
    },
    from: (table: string) => {
      if (table === 'user_profiles') {
        return {
          upsert: mocks.supabaseProfileUpsert,
        };
      }

      if (table === 'user_progress_snapshots') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mocks.supabaseMaybeSingle,
            }),
          }),
          upsert: mocks.supabaseSnapshotUpsert,
        };
      }

      return {
        upsert: vi.fn(),
      };
    },
  }),
}));

function createQuestion(id: string, groupId: number): GameQuestion {
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
    options: [
      {
        id: groupId * 10 + 1,
        word: `correct-${groupId}`,
        learner_level: null,
        frequency: null,
        register: null,
        dialect: null,
        status: 'egokia',
        note: null,
      },
      {
        id: groupId * 10 + 2,
        word: `wrong-${groupId}`,
        learner_level: null,
        frequency: null,
        register: null,
        dialect: null,
        status: 'egokia',
        note: null,
      },
    ],
    meaningEs: 'significado',
    concept: `concept-${groupId}`,
    relation: 'sinonimoa',
    grammar: 'izena',
    category: 'lexikoa',
    level: 'B1',
    explanationShortEu: 'Azalpen laburra',
    explanationLongEu: 'Azalpen luzea',
    goodExampleEu: 'Adibide zuzena',
    badExampleEu: 'Adibide okerra',
  };
}

function createClozeQuestion(): LexicalClozeQuestion {
  return {
    id: 201,
    group_id: 1,
    source_id: 1,
    level: 'B1',
    difficulty: 'easy',
    mode: 'normal',
    sentence_eu: 'Hau ______ da.',
    answer: 'ederra',
    options: ['ederra', 'okerra'],
    explanation_eu: 'Hau da aukera egokia.',
    nuance_note_eu: 'Ñabardura bat.',
    why_not_eu: 'Bestea ez da egokia.',
    register_focus: null,
    skill_focus: 'esanahia',
    quality_level: 'gold',
    risk_level: 'low',
    is_active: true,
  };
}

function createDiscourseQuestion(): DiscourseClozeQuestion {
  return {
    id: 301,
    passage_id: null,
    target_marker_id: null,
    target_function_id: null,
    level: 'B1',
    difficulty: 'easy',
    mode: 'normal',
    sentence_eu: 'Eguraldi txarra egin du.',
    sentence_with_blank_eu: 'Eguraldi txarra egin du; ______, etxean geratu gara.',
    answer: 'beraz',
    normalized_answer: 'beraz',
    options: ['beraz', 'hala ere'],
    discursive_function: 'ondorioa',
    correct_answer_reason_eu: 'Ondorioa adierazteko erabiltzen da.',
    correct_answer_reason_es: null,
    nuance_note_eu: 'Lotura logikoa.',
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

function renderWithRoutes(initialEntry: string, routes: ReactNode) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>{routes}</Routes>
    </MemoryRouter>,
  );
}

describe('critical route flows', () => {
  beforeEach(() => {
    const fakeUser = {
      id: 'user-1',
      user_metadata: {
        username: 'ikaslea',
        display_name: 'Ikaslea',
      },
    };

    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    playerService.resetProfile('auth_required');
    mocks.hasCachedGameData.mockReturnValue(false);
    mocks.getCurrentUser.mockResolvedValue(fakeUser);
    mocks.getClozeExplanation.mockReturnValue({
      eu: { explanation: 'Azalpena', nuance: 'Ñabardura', whyNot: 'Ez da egokia' },
    });
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mocks.supabaseMaybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.supabaseProfileUpsert.mockResolvedValue({ error: null });
    mocks.supabaseSnapshotUpsert.mockResolvedValue({ error: null });
  });

  it('starts a main session from the home route and navigates to /game/:mode', async () => {
    const questions = Array.from({ length: 5 }, (_, index) => createQuestion(`q-${index + 1}`, index + 1));
    mocks.fetchGameData.mockResolvedValue([{ id: 1 }]);
    mocks.buildSessionQuestions.mockResolvedValue({
      questions,
      requestedCount: 10,
      generatedCount: 5,
      fallbackUsed: false,
      discardedReasons: {
        not_enough_valid_words: 0,
        already_used_group: 0,
        already_used_prompt: 0,
        not_enough_distractors: 0,
        invalid_question_type: 0,
      },
    });

    renderWithRoutes(
      '/',
      <>
        <Route path="/" element={<HomePage onToast={vi.fn()} />} />
        <Route path="/game/:mode" element={<div>Game route reached</div>} />
      </>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Jokatu' }));

    await waitFor(() => {
      expect(screen.getByText('Game route reached')).toBeInTheDocument();
    });
    expect(JSON.parse(sessionStorage.getItem('hitzkideak_questions') || '[]')).toHaveLength(5);
  });

  it('plays a daily session and navigates from /game/:mode to /results', async () => {
    sessionStorage.setItem('hitzkideak_questions', JSON.stringify([createQuestion('daily-1', 1)]));

    renderWithRoutes(
      '/game/main',
      <>
        <Route path="/game/:mode" element={<DailyGamePage onToast={vi.fn()} />} />
        <Route path="/results" element={<div>Results route reached</div>} />
      </>,
    );

    await userEvent.click(await screen.findByRole('option', { name: /correct-1/i }));
    await userEvent.click(await screen.findByRole('button', { name: /emaitza ikusi/i }));

    await waitFor(() => {
      expect(screen.getByText('Results route reached')).toBeInTheDocument();
    });
    const storedResult = JSON.parse(sessionStorage.getItem('hitzkideak_result') || '{}');
    expect(storedResult.score).toBe(1);
    expect(storedResult.answers).toHaveLength(1);
  });

  it('hydrates /results from sessionStorage and returns to home', async () => {
    const question = createQuestion('result-1', 1);
    const answer: AnswerResult = {
      questionId: question.id,
      groupId: question.groupId,
      promptWordId: question.promptWord.id,
      correctWordId: question.correctWord.id,
      selectedOptionId: question.correctWord.id,
      correctAnswer: question.correctWord.word,
      isCorrect: true,
      answeredAt: '2026-05-05T10:00:00.000Z',
      level: 'B1',
      questionType: question.questionType,
    };

    sessionStorage.setItem('hitzkideak_result', JSON.stringify({
      score: 1,
      answers: [answer],
      questions: [question],
      mode: 'main',
    }));
    sessionStorage.setItem('hitzkideak_questions', JSON.stringify([question]));

    renderWithRoutes(
      '/results',
      <>
        <Route path="/results" element={<SessionResultPage />} />
        <Route path="/" element={<div>Home route reached</div>} />
      </>,
    );

    expect(await screen.findByText('100%')).toBeInTheDocument();
    expect(sessionStorage.getItem('hitzkideak_result')).toBeNull();
    expect(sessionStorage.getItem('hitzkideak_questions')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /hasiera/i }));
    await waitFor(() => {
      expect(screen.getByText('Home route reached')).toBeInTheDocument();
    });
  });

  it('plays a cloze session from /cloze/:size and stores the result', async () => {
    const question = createClozeQuestion();
    mocks.fetchClozeQuestions.mockResolvedValue([question]);
    mocks.checkClozeAnswer.mockReturnValue(true);

    renderWithRoutes(
      '/cloze/5',
      <>
        <Route path="/cloze/:size" element={<ClozeGamePage />} />
        <Route path="/cloze/results" element={<div>Cloze results reached</div>} />
        <Route path="/cloze" element={<div>Cloze home</div>} />
      </>,
    );

    expect(await screen.findByRole('button', { name: 'ederra' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'ederra' }));
    await userEvent.click(await screen.findByRole('button', { name: /hurrengoa/i }));

    await waitFor(() => {
      expect(screen.getByText('Cloze results reached')).toBeInTheDocument();
    });
    const stored = JSON.parse(sessionStorage.getItem('hitzkideak_cloze_result') || '{}');
    expect(stored.total).toBe(1);
    expect(stored.answers).toHaveLength(1);
  });

  it('plays a discourse session from /discourse/:size/:mode and stores the result', async () => {
    const question = createDiscourseQuestion();
    const session: DiscourseClozeSession = {
      sessionId: 'disc-session',
      type: 'discourse_cloze',
      startedAt: '2026-05-05T10:00:00.000Z',
      level: 'B1',
      questions: [question],
      answers: [],
      score: 0,
      total: 1,
      completed: false,
    };

    mocks.buildDiscourseClozeSession.mockResolvedValue(session);
    mocks.fetchDiscourseOptionExplanations.mockResolvedValue([]);
    mocks.checkDiscourseClozeAnswer.mockReturnValue({
      questionId: question.id,
      selectedAnswer: 'beraz',
      correctAnswer: 'beraz',
      isCorrect: true,
      answeredAt: '2026-05-05T10:01:00.000Z',
      level: 'B1',
      skillFocus: question.skill_focus,
      discursiveFunction: question.discursive_function,
    });

    renderWithRoutes(
      '/discourse/5/normal',
      <>
        <Route path="/discourse/:size/:mode" element={<DiscourseClozeGamePage />} />
        <Route path="/discourse/results" element={<div>Discourse results reached</div>} />
        <Route path="/discourse" element={<div>Discourse home</div>} />
      </>,
    );

    expect(await screen.findByText('Antolatzaileak')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'beraz' }));
    expect(await screen.findByText('Zuzen!')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /hurrengoa/i }));

    await waitFor(() => {
      expect(screen.getByText('Discourse results reached')).toBeInTheDocument();
    });
    const stored = JSON.parse(sessionStorage.getItem('hitzkideak_discourse_result') || '{}');
    expect(stored.score).toBe(1);
    expect(stored.answers).toHaveLength(1);
  });
});
