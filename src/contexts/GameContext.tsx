import { createContext, useContext, ReactNode } from 'react';
import { GameQuestion } from '../types/question';
import { SessionResult } from '../types/stats';

interface GameContextValue {
  questions: GameQuestion[];
  setQuestions: (q: GameQuestion[]) => void;
  sessionResult: SessionResult | null;
  setSessionResult: (r: SessionResult | null) => void;
  gameMode: string;
  setGameMode: (m: string) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}