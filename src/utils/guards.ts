import { LexicalGroup, LexicalWord } from '../types/lexical';

export const VALID_REVIEW_STATUSES = [
  'reviewed_safe',
  'reviewed_context_needed',
  'reviewed_register_sensitive'
];

export const VALID_WORD_STATUSES = ['egokia', 'kontuz'];

export function isValidGroup(group: LexicalGroup): boolean {
  if (!group.is_active) return false;
  if (!group.review_status || !VALID_REVIEW_STATUSES.includes(group.review_status)) return false;
  if (!group.recommended_question_type || group.recommended_question_type === 'disabled') return false;
  
  // Group must have at least 2 valid words (one for question, one for answer)
  const validWords = group.words?.filter(isValidWord) || [];
  return validWords.length >= 2;
}

export function isValidWord(word: LexicalWord): boolean {
  return !!word.status && VALID_WORD_STATUSES.includes(word.status);
}
