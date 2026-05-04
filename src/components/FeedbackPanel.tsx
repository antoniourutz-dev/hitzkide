import { useState } from 'react';
import { motion } from 'motion/react';
import { LexicalWord } from '../types/lexical';
import { cn } from '../lib/utils';
import AnswerExplanationCard from './AnswerExplanationCard';
import { LanguagePreference } from '../hooks/useLanguagePreference';

interface FeedbackPanelProps {
  isCorrect: boolean;
  explanationShort?: string | null;
  explanationLong?: string | null;
  usageWarning?: string | null;
  goodExample?: string | null;
  badExample?: string | null;
  contrastNote?: string | null;
  teachingTip?: string | null;
  explanationShortEu?: string | null;
  explanationLongEu?: string | null;
  usageWarningEu?: string | null;
  goodExampleEu?: string | null;
  badExampleEu?: string | null;
  contrastNoteEu?: string | null;
  teachingTipEu?: string | null;
  languagePreference: LanguagePreference;
  onNext: () => void;
  isLast: boolean;
}

export default function FeedbackPanel({ 
  isCorrect, 
  explanationShort,
  explanationLong,
  usageWarning,
  goodExample,
  badExample,
  contrastNote,
  teachingTip,
  explanationShortEu,
  explanationLongEu,
  usageWarningEu,
  goodExampleEu,
  badExampleEu,
  contrastNoteEu,
  teachingTipEu,
  languagePreference,
  onNext, 
  isLast 
}: FeedbackPanelProps) {
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);

  return (
    <div className="flex flex-col flex-1 mt-2 space-y-4">
      <button 
        onClick={onNext} 
        className={cn(
          "w-full h-16 rounded-3xl font-black text-lg transition-all active:scale-98 shadow-lg",
          isCorrect 
            ? "bg-emerald-500 text-white shadow-emerald-100" 
            : "bg-slate-800 text-white shadow-slate-200"
        )}
      >
        {isLast ? "Emaitza ikusi" : "Jarraitu"}
      </button>

      <button
        onClick={() => setIsExplanationOpen(!isExplanationOpen)}
        className="w-full text-center text-xs font-black text-slate-400 uppercase tracking-widest py-2 active:bg-slate-50 transition-colors"
      >
        {isExplanationOpen ? "Ezkutatu azalpena" : "Azalpena ikusi"}
      </button>

      {isExplanationOpen && (
        <AnswerExplanationCard
          isCorrect={isCorrect}
          explanationShort={explanationShort}
          explanationLong={explanationLong}
          usageWarning={usageWarning}
          goodExample={goodExample}
          badExample={badExample}
          contrastNote={contrastNote}
          teachingTip={teachingTip}
          explanationShortEu={explanationShortEu}
          explanationLongEu={explanationLongEu}
          usageWarningEu={usageWarningEu}
          goodExampleEu={goodExampleEu}
          badExampleEu={badExampleEu}
          contrastNoteEu={contrastNoteEu}
          teachingTipEu={teachingTipEu}
          languagePreference={languagePreference}
        />
      )}

      <div className="flex-grow" />
    </div>
  );
}
