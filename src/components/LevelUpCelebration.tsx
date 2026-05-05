import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserLevel } from '../types/stats';

interface LevelUpCelebrationProps {
  from: UserLevel;
  to: UserLevel;
  onClose: () => void;
  onNavigateStats: () => void;
}

export default function LevelUpCelebration({ from, to, onClose, onNavigateStats }: LevelUpCelebrationProps) {
  const [showWhy, setShowWhy] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="levelup-title"
    >
      <motion.div
        ref={modalRef}
        initial={{ scale: 0.9, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-[3.5rem] p-10 text-center space-y-8 shadow-2xl relative overflow-hidden"
      >
        <div className="space-y-4">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12 }}
            className="text-6xl"
            role="img"
            aria-label=" ospakizuna"
          >
            🎉
          </motion.div>

          <div className="space-y-1">
            <h2 id="levelup-title" className="text-3xl font-black text-slate-800 tracking-tighter">Zorionak!</h2>
            <p className="text-xl font-bold text-emerald-600">{to} maila desblokeatu duzu</p>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
              {from} &rarr; {to}
            </p>
          </div>

          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            Orain sinonimo zehatzagoak eta aberatsagoak landuko dituzu.
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="w-full h-16 bg-emerald-500 text-white rounded-[2rem] font-black flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-xl shadow-emerald-100"
            aria-label="Maila berrian jokatu"
          >
            <span>Maila berrian jokatu</span>
          </button>
          <button
            onClick={onNavigateStats}
            className="w-full h-16 bg-slate-50 text-slate-600 rounded-[2.5rem] font-black flex items-center justify-center space-x-2 active:scale-95 transition-all"
            aria-label="Aurrerapena ikusi"
          >
            <span>Aurrerapena ikusi</span>
          </button>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setShowWhy(!showWhy)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowWhy(!showWhy);
              }
            }}
            className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition-colors"
            aria-expanded={showWhy}
            aria-controls="why-content"
          >
            Zergatik igo naiz?
          </button>

          <AnimatePresence>
            {showWhy && (
              <motion.div
                id="why-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
                role="region"
                aria-label="Maila igotzeko arrazoia"
              >
                <div className="pt-4 text-xs font-medium text-slate-500 leading-relaxed italic px-4">
                  Akurazia ona izan duzu, eta nahikoa talde menperatu dituzu zure mailan. Jarraitu horrela!
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
