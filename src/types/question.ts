import { LexicalWord } from './lexical';

export interface GameQuestion {
  id: string;
  groupId: number;
  sourceId: number | null;
  questionType: string;
  promptWord: LexicalWord;
  correctWord: LexicalWord;
  options: LexicalWord[];
  meaningEs: string | null;
  concept: string | null;
  relation: string | null;
  grammar: string | null;
  category: string | null;
  level?: string;
  contentLevel?: string | null;
  playerLevelAtGeneration?: string;
  reviewStatus?: string;
  riskLevel?: 'low' | 'medium' | 'high' | null;
  qualityLevel?: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
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
}
