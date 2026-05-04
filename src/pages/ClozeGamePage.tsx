import { useState, useEffect } from 'react';
import { LexicalClozeQuestion, ClozeSession } from '../types/cloze';
import { clozeService } from '../services/clozeService';
import ClozeQuestionCard from '../components/cloze/ClozeQuestionCard';
import ClozeExplanationCard from '../components/cloze/ClozeExplanationCard';
import { useLanguagePreference } from '../hooks/useLanguagePreference';
import { playerService } from '../services/playerService';
import { X } from 'lucide-react';

export default function ClozeGamePage({ onFinish, onBack, sessionSize }: { onFinish: (session: ClozeSession) => void, onBack: () => void, sessionSize: number }) {
  const [questions, setQuestions] = useState<LexicalClozeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [languagePreference] = useLanguagePreference();
  const profile = playerService.getProfile();

  useEffect(() => {
    clozeService.fetchClozeQuestions({ currentLevel: profile.currentLevel, mode: 'normal', limit: sessionSize })
      .then(setQuestions);
  }, [profile.currentLevel, sessionSize]);

  const currentQuestion = questions[currentIndex];

  const handleAnswer = (selectedAnswer: string) => {
    const isCorrect = clozeService.checkClozeAnswer(currentQuestion, selectedAnswer);
    setAnswers([...answers, { questionId: currentQuestion.id, selectedAnswer, isCorrect }]);
    setIsAnswered(true);
    
    // Update mastery
    playerService.updateClozeMastery(currentQuestion.id, isCorrect, currentQuestion.level);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsAnswered(false);
    } else {
        // Build session and finish
        const session: ClozeSession = {
            sessionId: crypto.randomUUID(),
            type: 'cloze',
            startedAt: new Date().toISOString(),
            level: currentQuestion.level,
            questions,
            answers,
            score: answers.filter(a => a.isCorrect).length,
            total: questions.length,
            completed: true
        };
        playerService.saveClozeSession(session);
        onFinish(session);
    }
  };

  if (questions.length === 0) return <div className="p-6">Kargatzen...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center px-1">
        <div className="flex flex-col">
           <h2 className="text-2xl font-black">Cloze testak</h2>
           <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{currentIndex + 1} / {questions.length}</span>
        </div>
        <button onClick={onBack} className="p-2 -mr-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <X size={24} />
        </button>
      </div>
      <ClozeQuestionCard 
        question={currentQuestion} 
        onAnswer={handleAnswer} 
        selectedAnswer={isAnswered ? answers[currentIndex].selectedAnswer : null}
        isAnswered={isAnswered}
      />
      {isAnswered && (
        <ClozeExplanationCard
          question={currentQuestion}
          isCorrect={answers[currentIndex].isCorrect}
          languagePreference={languagePreference}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
