import { useState } from 'react';
import { cn } from '../lib/utils';
import { AlertCircle, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { LanguagePreference } from '../hooks/useLanguagePreference';

interface AnswerExplanationCardProps {
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
}

export default function AnswerExplanationCard({
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
}: AnswerExplanationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getExplanation = () => {
    const showEu = languagePreference === 'eu' || languagePreference === 'both';
    const showEs = languagePreference === 'es' || languagePreference === 'both';

    const renderBlock = (
      short: string | null | undefined,
      long: string | null | undefined,
      warning: string | null | undefined,
      good: string | null | undefined,
      bad: string | null | undefined,
      contrast: string | null | undefined,
      tip: string | null | undefined,
      isEu: boolean
    ) => (
      <div className="space-y-4">
        {short && <p className="text-slate-700 font-medium">{short}</p>}
        {warning && (
          <div className="flex gap-2 text-amber-700 bg-amber-100 p-3 rounded-xl border border-amber-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-bold">
              <span className="uppercase tracking-widest">{isEu ? 'Kontuan hartu' : 'Kontuan hartu'}</span>: {warning}
            </p>
          </div>
        )}
        {good && (
          <div className="space-y-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{isEu ? 'Adibidea' : 'Adibidea'}</p>
            <p className="text-slate-800 font-bold italic bg-white p-3 rounded-xl border border-slate-200">"{good}"</p>
          </div>
        )}
        {isExpanded && (
          <div className="mt-4 space-y-4 text-sm animate-in fade-in slide-in-from-top-2">
            {long && <div className="text-slate-700 leading-relaxed">{long}</div>}
            {contrast && <div className="text-slate-600"><strong className="text-slate-800">{isEu ? 'Kontrastea' : 'Kontrastea'}:</strong> {contrast}</div>}
            {tip && (
              <div className="flex gap-2 text-emerald-800 bg-emerald-100 p-3 rounded-xl border border-emerald-200">
                <Lightbulb className="w-5 h-5 flex-shrink-0" />
                <p>{tip}</p>
              </div>
            )}
            {bad && (
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{isEu ? 'Adibide okerra' : 'Adibide okerra'}</p>
                <p className="text-slate-500 font-medium italic bg-white p-3 rounded-xl border border-slate-200 line-through">"{bad}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    );

    return (
      <div className="space-y-4">
        {showEu && renderBlock(explanationShortEu || explanationShort, explanationLongEu || explanationLong, usageWarningEu || usageWarning, goodExampleEu || goodExample, badExampleEu || badExample, contrastNoteEu || contrastNote, teachingTipEu || teachingTip, true)}
        {languagePreference === 'both' && showEs && <div className="border-t pt-4 mt-4 border-slate-200/50 opacity-75">{renderBlock(explanationShort, explanationLong, usageWarning, goodExample, badExample, contrastNote, teachingTip, false)}</div>}
        {languagePreference === 'es' && renderBlock(explanationShort, explanationLong, usageWarning, goodExample, badExample, contrastNote, teachingTip, false)}
      </div>
    );
  };

  const hasMore = explanationLong || contrastNote || teachingTip || badExample || explanationLongEu || contrastNoteEu || teachingTipEu || badExampleEu;
  const hasContent = !!(explanationShort || explanationShortEu || hasMore);

  if (!hasContent) return null;

  return (
    <div className={cn(
      "p-6 rounded-3xl border-2 space-y-4",
      isCorrect ? "bg-emerald-50 border-emerald-500" : "bg-red-50 border-red-500"
    )}>
      {getExplanation()}

      {hasMore && (
        <div className="pt-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-emerald-600 transition-colors"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Ezkutatu azalpena' : 'Azalpen osoa ikusi'}
          </button>
        </div>
      )}
    </div>
  );
}
