import { cn } from '../../lib/utils';
import { LexicalClozeQuestion } from '../../types/cloze';

interface ClozeQuestionCardProps {
  question: LexicalClozeQuestion;
  onAnswer: (answer: string) => void;
  selectedAnswer?: string | null;
  isAnswered: boolean;
}

export default function ClozeQuestionCard({ question, onAnswer, selectedAnswer, isAnswered }: ClozeQuestionCardProps) {
  const parts = question.sentence_eu.split('______');

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm space-y-6">
      <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">
        <span className="bg-emerald-50 px-2 py-1 rounded-md">{question.level}</span>
        {question.skill_focus && (
          <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{question.skill_focus}</span>
        )}
      </div>

      <p className="text-xl font-medium text-slate-800 leading-relaxed">
        {parts[0]}
        <span className="inline-block w-24 mx-2 border-b-2 border-emerald-500 text-center font-bold text-emerald-700">
          {selectedAnswer || '...'}
        </span>
        {parts[1]}
      </p>

      <div className="grid grid-cols-1 gap-3" role="group" aria-label="Cloze aukerak">
        {question.options.map((option) => (
          <button
            key={option}
            onClick={() => !isAnswered && onAnswer(option)}
            disabled={isAnswered}
            aria-pressed={selectedAnswer === option}
            aria-label={option}
            className={cn(
              "w-full py-4 px-6 rounded-2xl text-left font-bold transition-all",
              isAnswered && option === question.answer ? "bg-emerald-100 border-emerald-500 text-emerald-800" :
              isAnswered && option === selectedAnswer && option !== question.answer ? "bg-red-100 border-red-500 text-red-800" :
              selectedAnswer === option ? "bg-emerald-50 border-emerald-500 text-emerald-800" :
              "bg-slate-50 hover:bg-slate-100 border-transparent text-slate-700"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
