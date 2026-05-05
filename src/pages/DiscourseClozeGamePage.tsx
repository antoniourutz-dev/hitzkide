import { useState, useEffect } from 'react';
import { DiscourseClozeSession, DiscourseClozeOptionExplanation, DiscourseClozeAnswerResult } from '../types/discourseCloze';
import { discourseClozeService } from '../services/discourseClozeService';
import DiscourseClozeQuestionCard from '../components/discourseCloze/DiscourseClozeQuestionCard';
import DiscourseClozeExplanationCard from '../components/discourseCloze/DiscourseClozeExplanationCard';
import { useLanguagePreference } from '../hooks/useLanguagePreference';
import { playerService } from '../services/playerService';
import { RefreshCw, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export default function DiscourseClozeGamePage() {
  const { size, mode } = useParams<{ size: string; mode: string }>();
  const navigate = useNavigate();
  const sessionSize = parseInt(size || '5', 10);
  const sessionMode = mode as 'aditua' | 'review' | 'normal' | undefined;

  const [session, setSession] = useState<DiscourseClozeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<DiscourseClozeAnswerResult | null>(null);
  const [optionExplanations, setOptionExplanations] = useState<DiscourseClozeOptionExplanation[]>([]);
  const [languagePreference] = useLanguagePreference();

  const profile = playerService.getProfile();

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const recentlySeenIds = Object.values(profile.discourseClozeMastery || {})
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
            } else {
                setError(true);
            }
            setLoading(false);
        }
      } catch (err) {
          console.error(err);
          if (mounted) {
             setError(true);
             setLoading(false);
          }
      }
    };

    initSession();

    return () => { mounted = false; };
  }, [sessionSize, sessionMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFinish = (finalSession: DiscourseClozeSession) => {
    sessionStorage.setItem('hitzkideak_discourse_result', JSON.stringify(finalSession));
    navigate('/discourse/results');
  };

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <RefreshCw className="animate-spin text-sky-500" size={32} />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Kargatzen...</p>
          </div>
      );
  }

  if (error || !session || session.questions.length === 0) {
      return (
          <div className="p-6 space-y-6">
              <div className="bg-red-50 text-red-800 p-6 rounded-3xl border border-red-100">
                  <p className="font-bold">Ezin izan dira antolatzaileen galderak kargatu edo ez dago nahikorik maila honetarako.</p>
              </div>
              <div className="space-y-3">
                  <button onClick={() => window.location.reload()} className="w-full py-4 bg-white text-slate-800 font-black rounded-2xl border border-slate-200">
                      Berriro saiatu
                  </button>
                  <button onClick={() => navigate('/')} className="w-full py-4 bg-emerald-50 text-emerald-700 font-black rounded-2xl border border-emerald-200">
                      Sinonimoak landu
                  </button>
                  <button onClick={() => navigate('/discourse')} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl">
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

      playerService.updateDiscourseClozeMastery(
          currentQuestion.id,
          result.isCorrect,
          currentQuestion.level,
          currentQuestion.skill_focus,
          currentQuestion.discursive_function
      );
  };

  const handleNext = () => {
      if (currentIndex < session.questions.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setIsAnswered(false);
          setCurrentAnswer(null);
          setOptionExplanations([]);
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
          playerService.saveDiscourseClozeSession(finalSession);
          handleFinish(finalSession);
      }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400">
          <div className="flex flex-col">
            <span className="text-slate-800 text-lg">Antolatzaileak</span>
            <span>{currentIndex + 1} / {session.total}</span>
          </div>
          <button onClick={() => navigate('/discourse')} className="p-2 -mr-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X size={24} />
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
