import { Play, TrendingUp, Heart, BookOpen, ChevronRight, Zap, RefreshCw, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchGameData } from '../services/lexicalService';
import { buildSessionQuestions } from '../services/questionService';
import { playerService } from '../services/playerService';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import LevelUpCelebration from '../components/LevelUpCelebration';
import { ToastData } from '../components/Toast';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

interface HomePageProps {
  onToast?: (message: string, type?: ToastData['type']) => void;
}

export default function HomePage({ onToast }: HomePageProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [profile, setProfile] = useState(playerService.getProfile());
  const [user, setUser] = useState<User | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [notEnoughQuestions, setNotEnoughQuestions] = useState(false);
  const [miniSessionMessage, setMiniSessionMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (profile.lastLevelUp && !profile.lastLevelUp.seen) {
      setShowLevelUp(true);
    }

    authService.getCurrentUser().then(setUser);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [profile]);

  const handlePlay = async (mode: 'main' | 'quick' | 'review') => {
    if (!isOnline) return;
    setLoading(true);
    setNotEnoughQuestions(false);
    try {
      const allGroups = await fetchGameData();
      if (!allGroups || allGroups.length === 0) {
        onToast?.('Datuak ezin izan dira kargatu. Mesedez, ziurtatu konexioa ondo dagoela.', 'warning');
        setLoading(false);
        return;
      }

      const { questions, generatedCount } = await buildSessionQuestions(allGroups, profile, mode);

      let shouldNotStart = false;
      if (mode === 'main' && generatedCount < 3) shouldNotStart = true;
      if (mode === 'quick' && generatedCount < 3) shouldNotStart = true;
      if (mode === 'review' && generatedCount < 3) shouldNotStart = true;

      if (shouldNotStart) {
        setNotEnoughQuestions(true);
        setLoading(false);
      } else {
        if (generatedCount < 5 && (mode === 'main' || mode === 'quick')) {
            setMiniSessionMessage("Saio laburra sortu dugu. Galdera gutxiago, baina erabilgarriak.");
            setTimeout(() => {
                sessionStorage.setItem('hitzkideak_questions', JSON.stringify(questions));
                navigate(`/game/${mode}`);
                setLoading(false);
            }, 2000);
        } else {
            sessionStorage.setItem('hitzkideak_questions', JSON.stringify(questions));
            navigate(`/game/${mode}`);
            setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error starting game:', error);
      onToast?.('Akats bat gertatu da jokoa kargatzean.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseLevelUp = () => {
    playerService.acknowledgeLevelUp();
    setProfile(playerService.getProfile());
    setShowLevelUp(false);
  };

  const progress = playerService.calculateLevelProgress();
  const currentIdx = ['B1', 'B2', 'C1', 'C2', 'Aditua'].indexOf(profile.currentLevel);
  const nextLevel = ['B2', 'C1', 'C2', 'Aditua'][currentIdx] || profile.currentLevel;

  const reqQuestions = progress.missingRequirements.find(r => r.label === 'Galderak')?.isMet;
  const reqAccuracy = progress.missingRequirements.find(r => r.label === 'Akurazia')?.isMet;
  const reqReview = progress.missingRequirements.find(r => r.label === 'Berrikusteko')?.isMet;
  const reqMastery = progress.missingRequirements.find(r => r.label === 'Ezagutza')?.isMet;
  const knowledgeGap = reqQuestions && reqAccuracy && reqReview && !reqMastery;

  const getMoto = (p: number, prog: import('../types/stats').LevelProgress) => {
    if (knowledgeGap) return "Ia prest zaude: talde batzuk gehiago sendotu behar dituzu.";
    if (p > 85) return "Maila berritik oso gertu zaude!";
    if (prog.accuracyProgress > 0.9 && prog.questionProgress < 0.8) return "Akurazia bikaina da; galdera gehiago behar dituzu.";
    if (prog.questionProgress > 0.8 && prog.masteryProgress < 0.6) return "Hitz gehiago sendotu behar dituzu.";
    if (p < 30) return "Oinarriak lantzen ari zara.";
    if (p < 60) return "Aurrera zoaz.";
    return "Gertuago zaude.";
  };

  if (notEnoughQuestions) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4">
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center shadow-sm">
          <BookOpen strokeWidth={2.5} size={36} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Ez dago nahikoa galdera</h2>
          <p className="text-slate-500 font-medium">Ez dago nahikoa galdera saio oso bat sortzeko.</p>
          <p className="text-slate-500 font-medium italic">Saiatu errepaso moduan edo gehitu datu gehiago.</p>
        </div>
        
        <div className="w-full space-y-3 pt-6 max-w-xs">
          <button
            onClick={() => handlePlay('review')}
            className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold tracking-wide active:scale-95 transition-all shadow-md shadow-emerald-200"
          >
            Errepasoa egin
          </button>
          <button
            onClick={() => setNotEnoughQuestions(false)}
            className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold tracking-wide active:scale-95 transition-all"
          >
            Hasierara itzuli
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 py-2">
      <AnimatePresence>
        {miniSessionMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-4 right-4 z-50 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl shadow-lg text-center"
          >
            <p className="text-xs font-bold">{miniSessionMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* User Greeting Mini-Badge */}
      <div className="flex justify-between items-center px-1">
         <div className="flex flex-col">
            <span className="text-xl font-black text-slate-800 tracking-tight">
               {user ? `Kaixo, ${user.user_metadata?.username || user.user_metadata?.display_name || 'Erabiltzaile'}` : 'Kaixo, Gonbidatua'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-1">
               {user && profile.syncStatus === 'synced' ? (
                 <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Sinkronizatuta</>
               ) : user && profile.syncStatus === 'pending' ? (
                 <><div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div> Sinkronizatzeko zain</>
               ) : user && profile.syncStatus === 'error' ? (
                 <><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Sinkronizazio errorea</>
               ) : (
                 'Aurrerapena gailu honetan gordeta'
               )}
            </span>
         </div>
      </div>

      {/* Progress Card */}
      <div className="card p-4 bg-white border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col items-center text-center space-y-0.5">
           <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{profile.currentLevel} MAILA</span>
           <h2 className="text-base font-bold text-slate-700">{nextLevel} mailara bidean</h2>
        </div>
        
        <div className="space-y-1.5">
          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress.totalProgress}%` }}
              className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-1000"
            />
          </div>
          <div className="flex justify-between items-center px-0.5">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate mr-2">{getMoto(progress.totalProgress, progress)}</span>
            <span className="text-sm font-black text-slate-800">{progress.totalProgress}%</span>
          </div>
        </div>

        <div className="pt-0.5">
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="w-full text-[8px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-500 transition-colors flex items-center justify-center gap-1"
          >
            Xehetasunak
            <motion.div animate={{ rotate: showDetails ? 180 : 0 }}>
              <ChevronRight size={9} className="rotate-90" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {showDetails && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-slate-50 rounded-xl mt-2 divide-y divide-slate-100"
              >
                {progress.missingRequirements.map((req, i) => (
                  <div key={i} className="flex justify-between items-center p-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">{req.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-slate-700">{req.current} / {req.target}</span>
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        req.isMet ? "bg-emerald-500" : "bg-slate-300"
                      )} />
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button
          onClick={() => handlePlay('main')}
          disabled={loading}
          className="group relative h-14 bg-emerald-500 rounded-2xl overflow-hidden shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <div className="flex items-center justify-center gap-2 relative z-10 w-full h-full text-white">
            <span className="text-xl font-black tracking-tight uppercase">Jokatu</span>
            <div className="w-5 flex items-center justify-center">
               {loading ? <RefreshCw size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" />}
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/cloze')}
          className="group card flex items-center justify-between p-5 bg-sky-50 border-sky-100 hover:border-sky-300 transition-all active:scale-95 border-dashed"
        >
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-sky-100 text-sky-600 rounded-xl">
              <BookOpen size={20} />
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-black text-slate-700">Cloze testak</span>
                <span className="text-[10px] font-bold text-sky-700">Testuinguruan hitz egokia</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-slate-300 group-hover:text-sky-500 transition-colors" />
        </button>

        <button
          onClick={() => navigate('/discourse')}
          className="group card flex items-center justify-between p-5 bg-indigo-50 border-indigo-100 hover:border-indigo-300 transition-all active:scale-95 border-dashed mt-4"
        >
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <List size={20} />
            </div>
            <div className="flex flex-col text-left">
                <span className="text-sm font-black text-slate-700">Antolatzaileak</span>
                <span className="text-[10px] font-bold text-indigo-700 mt-0.5">Testua lotu eta ideiak antolatu</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
        </button>

      <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => handlePlay('quick')}
            disabled={loading}
            className="card flex flex-col items-center justify-center p-4 bg-amber-50 border-amber-100/50 hover:bg-amber-100 transition-all active:scale-95 opacity-95 disabled:opacity-50 h-24 w-full"
          >
            <div className="h-6 flex items-center justify-center">
              {loading ? <Zap size={20} className="text-amber-500 animate-pulse" /> : <Zap size={20} className="text-amber-500" />}
            </div>
            <div className="h-5 flex items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Saio azkarra</span>
            </div>
          </button>
          
          <button
            onClick={() => handlePlay('review')}
            disabled={loading}
            className="card flex flex-col items-center justify-center p-4 bg-blue-50 border-blue-100/50 hover:bg-blue-100 transition-all active:scale-95 disabled:opacity-50 h-24 w-full"
          >
            <div className="h-6 flex items-center justify-center">
              {loading ? <RefreshCw size={20} className="text-blue-600 animate-spin" /> : <RefreshCw size={20} className="text-blue-600" />}
            </div>
            <div className="h-5 flex items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Errepasoa</span>
            </div>
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/review')}
            className="card flex flex-col items-center justify-center py-2 bg-slate-50 border-slate-200/50 hover:bg-slate-100 transition-all active:scale-95 h-20 w-full"
          >
            <div className="h-6 flex items-center justify-center">
              <BookOpen size={18} className="text-slate-500" />
            </div>
            <div className="h-5 flex items-center justify-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Hiztegia</span>
            </div>
          </button>

          <button
            onClick={() => navigate('/stats')}
            className="card flex flex-col items-center justify-center py-2 bg-slate-50 border-slate-200/50 hover:bg-slate-100 transition-all active:scale-95 h-20 w-full"
          >
             <div className="h-6 flex items-center justify-center">
              <TrendingUp size={18} className="text-slate-500" />
            </div>
            <div className="h-5 flex items-center justify-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Estatistikak</span>
            </div>
          </button>
        </div>

        <button
          onClick={() => navigate('/favorites')}
          className="group card flex items-center justify-between p-5 hover:border-slate-300 transition-all active:scale-95 border-dashed"
        >
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-red-50 text-red-500 rounded-xl">
              <Heart size={20} fill={profile.stats.totalSessions > 0 ? "currentColor" : "none"} />
            </div>
            <span className="text-sm font-black text-slate-700">Gogokoak</span>
          </div>
          <ChevronRight size={20} className="text-slate-300 group-hover:text-red-500 transition-colors" />
        </button>
      </div>

      <AnimatePresence>
        {showLevelUp && profile.lastLevelUp && (
          <LevelUpCelebration 
            from={profile.lastLevelUp.fromLevel}
            to={profile.lastLevelUp.toLevel}
            onClose={handleCloseLevelUp}
            onNavigateStats={() => {
              handleCloseLevelUp();
              navigate('/stats');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
