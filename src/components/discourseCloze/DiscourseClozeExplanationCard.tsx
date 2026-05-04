import { useState } from 'react';
import { cn } from '../../lib/utils';
import { DiscourseClozeQuestion, DiscourseClozeOptionExplanation } from '../../types/discourseCloze';
import { LanguagePreference } from '../../hooks/useLanguagePreference';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DiscourseClozeExplanationCardProps {
  question: DiscourseClozeQuestion;
  selectedAnswer: string;
  isCorrect: boolean;
  optionExplanations: DiscourseClozeOptionExplanation[];
  languagePreference: LanguagePreference;
  onNext: () => void;
}

const looksLikeEnglish = (text: string | null | undefined): boolean => {
  if (!text) return false;
  const t = text.toLowerCase();
  return (
    t.includes('is the') ||
    t.includes('because') ||
    t.includes('previous') ||
    t.includes('consequence') ||
    t.includes('correct option') ||
    t.includes('does not fit') ||
    t.includes('it should') ||
    t.includes('from the previous')
  );
};

export default function DiscourseClozeExplanationCard({ 
  question, 
  selectedAnswer,
  isCorrect, 
  optionExplanations,
  languagePreference, 
  onNext 
}: DiscourseClozeExplanationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const selectedOptionExplanation = optionExplanations.find(o => o.normalized_option === selectedAnswer.toLowerCase().replace(/\s+/g, ' ') || o.option_text === selectedAnswer);

  const getLocalizedExplanation = (euText?: string | null, esText?: string | null) => {
    let esContent = esText?.trim() || null;
    const euContent = euText?.trim() || null;

    if (looksLikeEnglish(esContent)) {
      console.warn("Campo *_es parece estar en inglés. Revisar datos en Supabase.", esContent);
      esContent = null;
    }

    if (languagePreference === 'eu') {
      return {
        primary: euContent || esContent,
        secondary: null,
      };
    }

    if (languagePreference === 'es') {
      if (esContent) {
        return {
          primary: esContent,
          primaryLabel: 'Gaztelaniaz:',
          secondary: null,
        };
      } else {
        return {
          primary: euContent,
          secondary: null,
        };
      }
    }

    // languagePreference === 'both'
    const primary = euContent || esContent;
    let secondary = null;
    if (euContent && esContent && euContent !== esContent) {
      secondary = esContent;
    }

    return { primary, secondary };
  };

  const ExplanationBlock = ({ title, euText, esText, isInlineTitle = false, isErrorBlock = false }: { title?: string, euText?: string | null, esText?: string | null, isInlineTitle?: boolean, isErrorBlock?: boolean }) => {
    const { primary, primaryLabel, secondary } = getLocalizedExplanation(euText, esText);
    
    if (!primary) return null;

    return (
      <div className="space-y-1">
        {title && !isInlineTitle && (
            <p className={cn("text-xs font-bold uppercase tracking-wider mb-1", isErrorBlock ? "text-red-800" : "text-slate-800")}>{title}</p>
        )}
        {primaryLabel && <p className="text-xs text-slate-500 italic mb-1">{primaryLabel}</p>}
        <p className={cn("text-sm text-slate-700", !isInlineTitle && !isErrorBlock && title === undefined ? "text-base" : "")}>
            {title && isInlineTitle && <strong>{title}: </strong>}
            {primary}
        </p>
        {secondary && <p className="text-xs text-slate-500 mt-1 italic">Gaztelaniaz: {secondary}</p>}
      </div>
    );
  };

  return (
    <div className={cn("p-6 rounded-3xl border-2 space-y-4", isCorrect ? "bg-emerald-50 border-emerald-500" : "bg-red-50 border-red-500")}>
      <h3 className={cn("text-lg font-black uppercase tracking-widest", isCorrect ? "text-emerald-700" : "text-red-700")}>
        {isCorrect ? 'Zuzen!' : 'Oker!'}
      </h3>
      
      {!isCorrect && (
          <p className="text-sm font-bold text-slate-700">Erantzun zuzena: <span className="font-black text-emerald-600">{question.answer}</span></p>
      )}

      {/* Main explanation (always show if available) */}
      <ExplanationBlock euText={question.correct_answer_reason_eu} esText={question.correct_answer_reason_es} />

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs font-black text-slate-500 uppercase flex items-center gap-1 py-1"
      >
        {isExpanded ? 'Ezkutatu azalpena' : 'Azalpen osoa ikusi'}
        {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
      </button>

      {isExpanded && (
        <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
           
           {/* Selected Option Analysis */}
           {selectedOptionExplanation && !isCorrect && (
               <div className="bg-red-100/50 p-3 rounded-xl border border-red-200">
                   <ExplanationBlock 
                       title="Aukera honen azalpena" 
                       euText={selectedOptionExplanation.why_not_eu || selectedOptionExplanation.explanation_eu} 
                       esText={selectedOptionExplanation.why_not_es || selectedOptionExplanation.explanation_es} 
                       isErrorBlock
                   />
               </div>
           )}

           <ExplanationBlock title="Ñabardura" euText={question.nuance_note_eu} esText={question.nuance_note_es} isInlineTitle />
           <ExplanationBlock title="Beste aukera batzuk" euText={question.possible_alternatives_eu} esText={question.possible_alternatives_es} isInlineTitle />
           <ExplanationBlock title="Erregistroa" euText={question.register_note_eu} esText={question.register_note_es} isInlineTitle />
           <ExplanationBlock title="Noiz ez erabili" euText={question.not_to_use_eu} esText={question.not_to_use_es} isInlineTitle />
           
        </div>
      )}

      <button onClick={onNext} className="w-full h-12 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest mt-4">
        Hurrengoa
      </button>
    </div>
  );
}
