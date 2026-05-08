import { cn } from '../../lib/utils';
import { DiscourseClozeQuestion } from '../../types/discourseCloze';

interface DiscourseClozeQuestionCardProps {
  question: DiscourseClozeQuestion;
  onAnswer: (answer: string) => void;
  selectedAnswer?: string | null;
  isAnswered: boolean;
}

export default function DiscourseClozeQuestionCard({ question, onAnswer, selectedAnswer, isAnswered }: DiscourseClozeQuestionCardProps) {
  const parts = question.sentence_with_blank_eu.split('______');

  return (
    <div className="sleek-card p-6 space-y-6">
      <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest text-slate-700">
        <span className="bg-emerald-50 px-2 py-1 rounded-none border-[3px] border-brand-border shadow-[2px_2px_0px_0px_#0f172a]">{question.level}</span>
        {question.discursive_function && (
          <span className="bg-sky-50 text-sky-800 px-2 py-1 rounded-none border-[3px] border-brand-border shadow-[2px_2px_0px_0px_#0f172a]">{question.discursive_function}</span>
        )}
        {question.skill_focus && (
          <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-none border-[3px] border-brand-border shadow-[2px_2px_0px_0px_#0f172a]">{question.skill_focus}</span>
        )}
      </div>

      <p className="text-xl font-medium text-slate-900 leading-relaxed">
        {parts[0]}
        <span className={cn(
            "inline-block w-28 mx-2 border-b-[3px] text-center font-black",
            isAnswered ? "border-brand-border text-brand-text" : "border-slate-300 text-slate-500"
        )}>
          {selectedAnswer || '...'}
        </span>
        {parts[1]}
      </p>

      <div className="grid grid-cols-1 gap-2" role="group" aria-label="Antolatzaileen aukerak">
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
