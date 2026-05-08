import { useState, useEffect } from 'react';
import { LexicalClozeQuestion, ClozeSession } from '../types/cloze';
import { clozeService } from '../services/clozeService';
import ClozeQuestionCard from '../components/cloze/ClozeQuestionCard';
import ClozeExplanationCard from '../components/cloze/ClozeExplanationCard';
import { useLanguagePreference } from '../hooks/useLanguagePreference';
import { playerService } from '../services/playerService';
import { useNavigate, useParams } from 'react-router-dom';
import { RefreshCw, X } from 'lucide-react';
import { observabilityService } from '../analytics/observabilityService';
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import { SESSION_STORAGE_KEYS, writeJsonToSessionStorage } from '../lib/storage';
import { authService } from '../services/authService';
import { createClientId } from '../lib/id';

export default function ClozeGamePage() {
  const { size } = useParams<{ size: string }>();
  const navigate = useNavigate();
  const sessionSize = parseInt(size || '5', 10);

  const [questions, setQuestions] = useState<LexicalClozeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: number; selectedAnswer: string; isCorrect: boolean }[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [languagePreference] = useLanguagePreference();
  const profile = usePlayerProfile();

  useEffect(() => {
    let mounted = true;

    authService.getCurrentUser()
      .then((user) => {
        if (!mounted) return;

        if (!user) {
          navigate('/profile');
          return;
        }

        setAccessChecked(true);
      })
      .catch(() => {
        if (mounted) {
          navigate('/profile');
        }
      });

    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!accessChecked) {
      return;
    }

    let mounted = true;
    observabilityService.trackFeatureUsage('cloze', 'normal', 'requested', {
      sessionSize,
      level: profile.currentLevel,
    });

    const loadQuestions = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const loadedQuestions = await clozeService.fetchClozeQuestions({
          currentLevel: profile.currentLevel,
          mode: 'normal',
          limit: sessionSize
        });

        if (!mounted) return;

        if (loadedQuestions.length === 0) {
          observabilityService.trackFeatureUsage('cloze', 'normal', 'failed', {
            reason: navigator.onLine ? 'no_questions_available' : 'offline_without_cached_content',
            sessionSize,
            level: profile.currentLevel,
          });
          setErrorMessage(
            navigator.onLine
              ? 'Ez dugu nahikoa cloze eduki aurkitu saio hau prestatzeko.'
              : 'Konexiorik gabe zaude, eta oraindik ez dago nahikoa cloze eduki gordeta gailuan.'
          );
          setQuestions([]);
          return;
        }

        setQuestions(loadedQuestions);
        observabilityService.trackFeatureUsage('cloze', 'normal', 'started', {
          sessionSize: loadedQuestions.length,
          level: profile.currentLevel,
        });
      } catch (error) {
        if (!mounted) return;

        observabilityService.captureError('session.cloze_prepare_failed', 'session', error, {
          sessionSize,
          level: profile.currentLevel,
        });
        observabilityService.trackFeatureUsage('cloze', 'normal', 'failed', {
          reason: 'unexpected_error',
          sessionSize,
          level: profile.currentLevel,
        });
        setErrorMessage('Akats bat gertatu da cloze saioa prestatzean.');
        setQuestions([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadQuestions();

    return () => {
      mounted = false;
    };
  }, [accessChecked, loadAttempt, profile.currentLevel, sessionSize]);

  const currentQuestion = questions[currentIndex];

  const handleAnswer = (selectedAnswer: string) => {
    if (!currentQuestion) return;
    const isCorrect = clozeService.checkClozeAnswer(currentQuestion, selectedAnswer);
    setAnswers((previousAnswers) => [
      ...previousAnswers,
      { questionId: currentQuestion.id, selectedAnswer, isCorrect }
    ]);
    setIsAnswered(true);
  };

  const handleNext = async () => {
    if (isFinishing) {
      return;
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsAnswered(false);
      setCompletionError(null);
    } else {
      const session: ClozeSession = {
        sessionId: createClientId('cloze-session'),
        type: 'cloze',
        startedAt: new Date().toISOString(),
        level: currentQuestion.level,
        questions,
        answers,
        score: answers.filter(a => a.isCorrect).length,
        total: questions.length,
        completed: true
      };
      setIsFinishing(true);
      setCompletionError(null);

      try {
        await playerService.persistClozeSession(session);
        writeJsonToSessionStorage(SESSION_STORAGE_KEYS.clozeResult, session);
        navigate('/cloze/results');
      } catch (error) {
        setCompletionError(
          error instanceof Error && error.message === 'auth_required'
            ? 'Saioa berriro hasi behar duzu emaitza hau Supabasen gordetzeko.'
            : 'Ezin izan dugu saioa Supabasen gorde. Saiatu berriro.'
        );
      } finally {
        setIsFinishing(false);
      }
    }
  };

  const handleBack = () => {
    navigate('/cloze');
  };

  if (!accessChecked || loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4" role="status" aria-live="polite">
        <RefreshCw className="animate-spin text-sky-500" size={32} aria-hidden="true" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Cloze saioa prestatzen</p>
      </div>
    );
  }

  if (errorMessage || !currentQuestion) {
    return (
      <div className="p-6 space-y-6">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900" role="alert">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">Cloze ez dago prest</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed">{errorMessage || 'Ez dago galderarik une honetan.'}</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => setLoadAttempt((value) => value + 1)}
            className="w-full py-4 bg-white text-slate-800 font-black rounded-2xl border border-slate-200"
          >
            Berriro saiatu
          </button>
          <button
            onClick={handleBack}
            className="w-full py-4 bg-sky-50 text-sky-700 font-black rounded-2xl border border-sky-200"
          >
            Cloze hasierara itzuli
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {completionError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          {completionError}
        </div>
      )}
      <div className="flex justify-between items-center px-1">
        <div className="flex flex-col">
           <h2 className="text-2xl font-black">Cloze testak</h2>
           <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{currentIndex + 1} / {questions.length}</span>
        </div>
        <button
          onClick={handleBack}
          className="p-2 -mr-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Cloze hasierara itzuli"
        >
          <X size={24} aria-hidden="true" />
        </button>
      </div>
      <ClozeQuestionCard
        question={currentQuestion}
        onAnswer={handleAnswer}
        selectedAnswer={isAnswered ? answers[currentIndex]?.selectedAnswer : null}
        isAnswered={isAnswered}
      />
      {isAnswered && (
        <ClozeExplanationCard
          question={currentQuestion}
          isCorrect={answers[currentIndex]?.isCorrect}
          languagePreference={languagePreference}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
