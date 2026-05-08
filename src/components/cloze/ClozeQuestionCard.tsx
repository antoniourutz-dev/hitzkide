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
    <div className="sleek-card p-6 space-y-6">
      <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest text-slate-700">
        <span className="bg-emerald-50 px-2 py-1 rounded-none border-[3px] border-brand-border shadow-[2px_2px_0px_0px_#0f172a]">{question.level}</span>
        {question.skill_focus && (
          <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-none border-[3px] border-brand-border shadow-[2px_2px_0px_0px_#0f172a]">{question.skill_focus}</span>
        )}
      </div>

      <p className="text-xl font-medium text-slate-900 leading-relaxed">
        {parts[0]}
        <span className="inline-block w-24 mx-2 border-b-[3px] border-brand-border text-center font-black text-brand-text">
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
              "sleek-btn-option w-full flex items-center justify-between gap-4 text-left",
              isAnswered && option === question.answer ? "bg-emerald-500 text-white border-emerald-700 shadow-[5px_5px_0px_0px_#047857]" :
              isAnswered && option === selectedAnswer && option !== question.answer ? "bg-rose-500 text-white border-rose-700 shadow-[5px_5px_0px_0px_#be123c]" :
              selectedAnswer === option ? "bg-emerald-50 text-emerald-900 border-emerald-700 shadow-[5px_5px_0px_0px_#047857]" :
              "bg-white text-slate-900 border-brand-border shadow-[5px_5px_0px_0px_#0f172a] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0px_0px_#0f172a]"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
