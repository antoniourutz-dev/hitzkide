import { useState, useEffect } from 'react';
import { DiscourseClozeSession, DiscourseClozeOptionExplanation, DiscourseClozeAnswerResult } from '../types/discourseCloze';
import { discourseClozeService } from '../services/discourseClozeService';
import DiscourseClozeQuestionCard from '../components/discourseCloze/DiscourseClozeQuestionCard';
import DiscourseClozeExplanationCard from '../components/discourseCloze/DiscourseClozeExplanationCard';
import { useLanguagePreference } from '../hooks/useLanguagePreference';
import { playerService } from '../services/playerService';
import { RefreshCw, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { observabilityService } from '../analytics/observabilityService';
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import { SESSION_STORAGE_KEYS, writeJsonToSessionStorage } from '../lib/storage';
import { authService } from '../services/authService';

export default function DiscourseClozeGamePage() {
  const { size, mode } = useParams<{ size: string; mode: string }>();
  const navigate = useNavigate();
  const sessionSize = parseInt(size || '5', 10);
  const sessionMode = mode as 'aditua' | 'review' | 'normal' | undefined;

  const [session, setSession] = useState<DiscourseClozeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<DiscourseClozeAnswerResult | null>(null);
  const [optionExplanations, setOptionExplanations] = useState<DiscourseClozeOptionExplanation[]>([]);
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
    observabilityService.trackFeatureUsage('discourse', sessionMode || 'normal', 'requested', {
      sessionSize,
      level: profile.currentLevel,
    });
    setLoading(true);
    setError(false);
    setSession(null);

    const initSession = async () => {
      try {
        const discourseMasteryEntries = Object.values(profile.discourseClozeMastery || {}) as Array<{
          lastSeenAt: string | null;
          questionId: number;
        }>;
        const recentlySeenIds = discourseMasteryEntries
           .sort((a, b) => new Date(b.lastSeenAt || 0).getTime() - new Date(a.lastSeenAt || 0).getTime())
           .slice(0, 20)
           .map(m => m.questionId);

        let newSession;
        if (sessionMode === 'review') {
           newSession = await discourseClozeService.buildDiscourseReviewSession(profile, {
             currentLevel: profile.currentLevel,
             unlockedLevels: profile.unlockedLevels,
             sessionSize: sessionSize,
           });
        } else {
           newSession = await discourseClozeService.buildDiscourseClozeSession({
             currentLevel: profile.currentLevel,
             unlockedLevels: profile.unlockedLevels,
             sessionSize: sessionSize as 5|10|15,
             mode: sessionMode || 'normal',
             recentlySeenQuestionIds: recentlySeenIds
           });
        }

        if (mounted) {
            if (newSession) {
                setSession(newSession);
                observabilityService.trackFeatureUsage('discourse', sessionMode || 'normal', 'started', {
                  sessionSize: newSession.total,
                  level: profile.currentLevel,
                });
            } else {
                setError(true);
                observabilityService.trackFeatureUsage('discourse', sessionMode || 'normal', 'failed', {
                  reason: 'no_session_available',
                  sessionSize,
                  level: profile.currentLevel,
                });
            }
            setLoading(false);
        }
      } catch (err) {
          observabilityService.captureError('session.discourse_prepare_failed', 'session', err, {
            mode: sessionMode || 'normal',
            sessionSize,
            level: profile.currentLevel,
          });
          if (mounted) {
             setError(true);
             observabilityService.trackFeatureUsage('discourse', sessionMode || 'normal', 'failed', {
               reason: 'unexpected_error',
               sessionSize,
               level: profile.currentLevel,
             });
             setLoading(false);
          }
      }
    };

    initSession();

    return () => { mounted = false; };
  }, [accessChecked, loadAttempt, sessionSize, sessionMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFinish = (finalSession: DiscourseClozeSession) => {
    writeJsonToSessionStorage(SESSION_STORAGE_KEYS.discourseResult, finalSession);
    navigate('/discourse/results');
  };

  if (!accessChecked || loading) {
      return (
          <div className="flex flex-col items-center justify-center p-12 space-y-4" role="status" aria-live="polite">
              <RefreshCw className="animate-spin text-brand-primary" size={32} aria-hidden="true" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Kargatzen...</p>
          </div>
      );
  }

  if (error || !session || session.questions.length === 0) {
      return (
          <div className="p-6 space-y-6">
              <div className="sleek-card p-6 bg-rose-50 text-rose-900">
                  <p className="font-bold">Ezin izan dira antolatzaileen galderak kargatu edo ez dago nahikorik maila honetarako.</p>
                  {!navigator.onLine && (
                    <p className="mt-2 text-sm font-medium text-red-700">
                      Konexiorik gabe bazaude, aurrez gordetako edukia baino ezin dugu erabili.
                    </p>
                  )}
              </div>
              <div className="space-y-3">
                  <button onClick={() => setLoadAttempt((value) => value + 1)} className="w-full sleek-btn-secondary">
                      Berriro saiatu
                  </button>
                  <button onClick={() => navigate('/')} className="w-full sleek-btn-secondary bg-emerald-50 text-emerald-900">
                      Sinonimoak landu
                  </button>
                  <button onClick={() => navigate('/discourse')} className="w-full sleek-btn-primary bg-slate-900">
                      Hasierara itzuli
                  </button>
              </div>
          </div>
      );
  }

  const currentQuestion = session.questions[currentIndex];
  const persistedCurrentAnswer = session.answers.find((answer) => answer.questionId === currentQuestion.id);
  const resolvedCurrentAnswer = currentAnswer || persistedCurrentAnswer || null;

  const handleAnswer = async (selectedAnswer: string) => {
      const result = discourseClozeService.checkDiscourseClozeAnswer(currentQuestion, selectedAnswer);

      const existingAnswers = session.answers.filter((answer) => answer.questionId !== currentQuestion.id);
      const newAnswers = [...existingAnswers, result];
      const newScore = newAnswers.filter((answer) => answer.isCorrect).length;

      setSession({ ...session, answers: newAnswers, score: newScore });
      setCurrentAnswer(result);
      setIsAnswered(true);

      const explanations = await discourseClozeService.fetchDiscourseOptionExplanations(currentQuestion.id);
      setOptionExplanations(explanations);
  };

  const handleNext = async () => {
      if (isFinishing) {
        return;
      }

      if (currentIndex < session.questions.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setIsAnswered(false);
          setCurrentAnswer(null);
          setOptionExplanations([]);
          setCompletionError(null);
      } else {
          const finalAnswers = resolvedCurrentAnswer && !session.answers.some((answer) => answer.questionId === resolvedCurrentAnswer.questionId)
            ? [...session.answers, resolvedCurrentAnswer]
            : session.answers;
          const finalSession = {
            ...session,
            answers: finalAnswers,
            score: finalAnswers.filter((answer) => answer.isCorrect).length,
            completed: true,
            finishedAt: new Date().toISOString(),
          };
          setIsFinishing(true);
          setCompletionError(null);

          try {
            await playerService.persistDiscourseClozeSession(finalSession);
            handleFinish(finalSession);
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

  return (
    <div className="space-y-6">
      {completionError && (
        <div className="sleek-card p-4 bg-amber-50 text-sm font-semibold text-amber-900">
          {completionError}
        </div>
      )}
      <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400">
          <div className="flex flex-col">
            <span className="text-brand-text text-lg">Antolatzaileak</span>
            <span>{currentIndex + 1} / {session.total}</span>
          </div>
          <button
            onClick={() => navigate('/discourse')}
            className="p-2 -mr-2 rounded-full text-slate-700 hover:text-rose-700 transition-colors"
            aria-label="Antolatzaileen hasierara itzuli"
          >
              <X size={24} aria-hidden="true" />
          </button>
      </div>

      <DiscourseClozeQuestionCard
        question={currentQuestion}
        onAnswer={handleAnswer}
        selectedAnswer={isAnswered ? resolvedCurrentAnswer?.selectedAnswer : null}
        isAnswered={isAnswered}
      />

      {isAnswered && (
        <DiscourseClozeExplanationCard
          question={currentQuestion}
          selectedAnswer={resolvedCurrentAnswer?.selectedAnswer || ''}
          isCorrect={resolvedCurrentAnswer?.isCorrect || false}
          optionExplanations={optionExplanations}
          languagePreference={languagePreference}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
