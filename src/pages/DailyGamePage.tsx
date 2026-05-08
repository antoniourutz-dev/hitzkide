import { useState, useEffect } from 'react';
import { GameQuestion } from '../types/question';
import { LexicalWord } from '../types/lexical';
import OptionButton from '../components/OptionButton';
import FeedbackPanel from '../components/FeedbackPanel';
import FavoriteButton from '../components/FavoriteButton';
import { favoritesService } from '../services/favoritesService';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguagePreference } from '../hooks/useLanguagePreference';
import { useNavigate, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { AnswerResult } from '../types/stats';
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import { authService } from '../services/authService';
import {
  SESSION_STORAGE_KEYS,
  readJsonFromSessionStorage,
  removeSessionStorageItem,
  writeJsonToSessionStorage,
} from '../lib/storage';

interface DailyGamePageProps {
  onToast: (message: string, type?: 'success' | 'info' | 'warning' | 'achievement') => void;
}

export default function DailyGamePage({ onToast }: DailyGamePageProps) {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<LexicalWord | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<AnswerResult[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [sessionStreak, setSessionStreak] = useState(0);
  const [languagePreference] = useLanguagePreference();
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [accessChecked, setAccessChecked] = useState(false);

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

    const parsed = readJsonFromSessionStorage<GameQuestion[]>(SESSION_STORAGE_KEYS.questions);
    if (Array.isArray(parsed) && parsed.length > 0) {
      setQuestions(parsed);
    } else {
        navigate('/');
    }
  }, [accessChecked, navigate]);

  const currentQuestion = questions[currentIndex];
  const profile = usePlayerProfile();

  useEffect(() => {
    if (currentQuestion) {
      setIsFavorite(favoritesService.isFavorite(currentQuestion.groupId));
    }
  }, [currentIndex, currentQuestion]);

  const handleSelect = (word: LexicalWord) => {
    if (isAnswered || !currentQuestion) return;

    setSelectedWord(word);
    setIsAnswered(true);

    const isCorrect = word.id === currentQuestion.correctWord.id;
    if (isCorrect) {
      setScore(s => s + 1);
      const newStreak = sessionStreak + 1;
      setSessionStreak(newStreak);
      if (newStreak === 5) {
        onToast('5 jarraian zuzen!', 'achievement');
      }
    } else {
      setSessionStreak(0);
    }

    const answer: AnswerResult = {
      questionId: currentQuestion.id,
      groupId: currentQuestion.groupId,
      promptWordId: currentQuestion.promptWord.id,
      correctWordId: currentQuestion.correctWord.id,
      correctAnswer: currentQuestion.correctWord.word,
      selectedOptionId: word.id,
      isCorrect,
      answeredAt: new Date().toISOString(),
      level: profile.currentLevel,
      questionType: currentQuestion.questionType
    };
    setAnswers(prev => [...prev, answer]);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsAnswered(false);
      setSelectedWord(null);
    } else {
      writeJsonToSessionStorage(SESSION_STORAGE_KEYS.result, { score, answers, questions, mode });
      navigate('/results');
    }
  };

  const handleQuit = () => {
    removeSessionStorageItem(SESSION_STORAGE_KEYS.questions);
    navigate('/');
  };

  const toggleFav = () => {
    if (!currentQuestion) return;
    favoritesService.toggleFavorite({
      id: currentQuestion.groupId,
      source_id: currentQuestion.sourceId,
      concept: currentQuestion.concept,
      meaning_es: currentQuestion.meaningEs,
      category: currentQuestion.category,
      subcategory: null,
      grammar: currentQuestion.grammar,
      relation: null,
      reviewed_level: null,
      recommended_question_type: currentQuestion.questionType,
      review_status: 'reviewed_safe',
      is_active: true,
      words: [currentQuestion.correctWord],
    });
    setIsFavorite(!isFavorite);
  };

  if (!accessChecked || !currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-[3px] border-brand-border border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-brand-text bg-white px-2 py-0.5 rounded-none border-[3px] border-brand-border shadow-[2px_2px_0px_0px_#0f172a]">
              {profile.currentLevel}
            </span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{currentIndex + 1} / {questions.length}</span>
          </div>
          <div className="flex items-center gap-3">
            <FavoriteButton isFavorite={isFavorite} onClick={toggleFav} />
            <button
              onClick={handleQuit}
              className="p-2 rounded-full text-slate-700 hover:text-rose-700 transition-colors"
              aria-label="Saioa utzi eta hasierara itzuli"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="h-2 bg-slate-100 overflow-hidden border-b-[3px] border-brand-border">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-brand-primary"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex-1 flex flex-col space-y-6 pb-4"
        >
          <div className="text-center space-y-2 pt-2">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
              Zein da sinonimo egokia?
            </p>
            <h2 className="text-3xl sm:text-5xl font-black text-brand-text leading-tight tracking-tighter uppercase px-2">
              {currentQuestion.promptWord.word}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-1">
              {currentQuestion.reviewStatus === 'reviewed_register_sensitive' && (
                <div className="px-2 py-0.5 bg-purple-50 text-[8px] font-black text-purple-700 rounded-none border-[3px] border-brand-border uppercase tracking-widest shadow-[2px_2px_0px_0px_#0f172a]">
                  Erregistroa
                </div>
              )}
              {currentQuestion.questionType === 'intensity_question' && (
                <div className="px-2 py-0.5 bg-orange-50 text-[8px] font-black text-orange-700 rounded-none border-[3px] border-brand-border uppercase tracking-widest shadow-[2px_2px_0px_0px_#0f172a]">
                  Erronka
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {currentQuestion.options.map((option) => (
              <div key={option.id}>
                <OptionButton
                  word={option}
                  onClick={() => handleSelect(option)}
                  disabled={isAnswered}
                  status={
                    isAnswered
                      ? (option.id === currentQuestion.correctWord.id ? 'correct' : (selectedWord?.id === option.id ? 'incorrect' : 'neutral'))
                      : 'neutral'
                  }
                />
              </div>
            ))}
          </div>

          {isAnswered && (
            <FeedbackPanel
              isCorrect={selectedWord?.id === currentQuestion.correctWord.id}
              explanationShort={currentQuestion.explanationShort}
              explanationLong={currentQuestion.explanationLong}
              usageWarning={currentQuestion.usageWarning}
              goodExample={currentQuestion.goodExample}
              badExample={currentQuestion.badExample}
              contrastNote={currentQuestion.contrastNote}
              teachingTip={currentQuestion.teachingTip}
              explanationShortEu={currentQuestion.explanationShortEu}
              explanationLongEu={currentQuestion.explanationLongEu}
              usageWarningEu={currentQuestion.usageWarningEu}
              goodExampleEu={currentQuestion.goodExampleEu}
              badExampleEu={currentQuestion.badExampleEu}
              contrastNoteEu={currentQuestion.contrastNoteEu}
              teachingTipEu={currentQuestion.teachingTipEu}
              languagePreference={languagePreference}
              onNext={handleNext}
              isLast={currentIndex === questions.length - 1}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
