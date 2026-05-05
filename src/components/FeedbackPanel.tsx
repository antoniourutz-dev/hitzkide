import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
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
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    nextButtonRef.current?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onNext();
    }
  };

  return (
    <div className="flex flex-col flex-1 mt-2 space-y-4">
      <button
        ref={nextButtonRef}
        onClick={onNext}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full h-16 rounded-3xl font-black text-lg transition-all active:scale-98 shadow-lg",
          isCorrect
            ? "bg-emerald-500 text-white shadow-emerald-100"
            : "bg-slate-800 text-white shadow-slate-200"
        )}
        aria-label={isLast ? "Emaitza ikusi" : "Jarraitu hurrengo galderara"}
      >
        {isLast ? "Emaitza ikusi" : "Jarraitu"}
      </button>

      <button
        onClick={() => setIsExplanationOpen(!isExplanationOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExplanationOpen(!isExplanationOpen);
          }
        }}
        className="w-full text-center text-xs font-black text-slate-400 uppercase tracking-widest py-2 active:bg-slate-50 transition-colors"
        aria-expanded={isExplanationOpen}
        aria-controls="explanation-content"
      >
        {isExplanationOpen ? "Ezkutatu azalpena" : "Azalpena ikusi"}
      </button>

      {isExplanationOpen && (
        <div id="explanation-content" role="region" aria-label="Azalpena">
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
        </div>
      )}

      <div className="flex-grow" />
    </div>
  );
}
