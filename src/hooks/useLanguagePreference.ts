import { useState, useEffect } from 'react';

export type LanguagePreference = 'eu' | 'es' | 'both';

export function useLanguagePreference() {
  const [preference, setPreference] = useState<LanguagePreference>(() => {
    const saved = localStorage.getItem('explanationLanguage');
    return (saved as LanguagePreference) || 'eu';
  });

  useEffect(() => {
    localStorage.setItem('explanationLanguage', preference);
  }, [preference]);

  return [preference, setPreference] as const;
}
