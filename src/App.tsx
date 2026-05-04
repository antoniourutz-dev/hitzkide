import { Suspense, lazy, useEffect, useState } from 'react';
import { Home, BarChart2, Heart, Settings, BookOpen, WifiOff, X, List } from 'lucide-react';
import { cn } from './lib/utils';
import Layout from './components/Layout';
import LoadingState from './components/LoadingState';
import ReloadPrompt from './components/ReloadPrompt';
import { ClozeSession } from './types/cloze';
import { playerService } from './services/playerService';
import { GameQuestion } from './types/question';
import { SessionResult, MasteryStatus } from './types/stats';
import Toast, { ToastData } from './components/Toast';

type Page = 'home' | 'game' | 'results' | 'stats' | 'favorites' | 'review' | 'settings' | 'cloze' | 'cloze-game' | 'cloze-results' | 'discourse-home' | 'discourse-game' | 'discourse-results';

const HomePage = lazy(() => import('./pages/HomePage'));
const DailyGamePage = lazy(() => import('./pages/DailyGamePage'));
const SessionResultPage = lazy(() => import('./pages/SessionResultPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ClozeSelectionPage = lazy(() => import('./pages/ClozeSelectionPage'));
const ClozeGamePage = lazy(() => import('./pages/ClozeGamePage'));
const ClozeResultPage = lazy(() => import('./pages/ClozeResultPage'));
const DiscourseClozeHomePage = lazy(() => import('./pages/DiscourseClozeHomePage'));
const DiscourseClozeGamePage = lazy(() => import('./pages/DiscourseClozeGamePage'));
const DiscourseClozeResultPage = lazy(() => import('./pages/DiscourseClozeResultPage'));

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  
  // Cloze state
  const [clozeSession, setClozeSession] = useState<any>(null); // Use proper type
  const [clozeSessionSize, setClozeSessionSize] = useState<number>(5);
  
  // Discourse Cloze state
  const [discourseSession, setDiscourseSession] = useState<any>(null);
  const [discourseSessionSize, setDiscourseSessionSize] = useState<number>(5);
  const [discourseSessionMode, setDiscourseSessionMode] = useState<'normal'|'aditua'>('normal');

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const [gameMode, setGameMode] = useState<string>('main');

  const addToast = (message: string, type: ToastData['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleStartGame = (gameQuestions: GameQuestion[], mode: string = 'main') => {
    setQuestions(gameQuestions);
    setGameMode(mode);
    setSessionResult(null);
    setCurrentPage('game');
  };

  const handleFinishGame = (score: number, answers: any[]) => {
    const profileBefore = playerService.getProfile();
    const result = playerService.updateSession(score, questions, answers, gameMode);
    const profileAfter = playerService.getProfile();

    setSessionResult(result);
    setCurrentPage('results');

    // Trigger micro-celebrations
    if (score === questions.length && score > 0) {
      addToast('🏆 Saio perfektua!', 'achievement');
    }

    // Detect status changes for toasts
    const totalKnownBefore = Object.values(profileBefore.groupMastery).filter(m => m.status === 'known').length;
    const totalKnownAfter = Object.values(profileAfter.groupMastery).filter(m => m.status === 'known').length;
    if (totalKnownAfter > totalKnownBefore) {
      addToast('✨ Hitz bat ezaguna!', 'achievement');
    }

    const totalMasteredBefore = Object.values(profileBefore.groupMastery).filter(m => m.status === 'mastered').length;
    const totalMasteredAfter = Object.values(profileAfter.groupMastery).filter(m => m.status === 'mastered').length;
    if (totalMasteredAfter > totalMasteredBefore) {
      addToast('⭐ Talde bat menperatu duzu!', 'achievement');
    }
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'Hasiera' },
    { id: 'stats', icon: BarChart2, label: 'Estat.' },
    { id: 'favorites', icon: Heart, label: 'Gogo.' },
    { id: 'review', icon: List, label: 'Berri.' },
  ];

  const isGame = currentPage === 'game';
  const isResults = currentPage === 'results';
  
  const header = (
    <>
      <div className={cn("flex items-center gap-2", isGame && "scale-90 origin-left")}>
        {!isGame ? (
          <>
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-black text-slate-800 text-lg tracking-tight uppercase">Hitzkideak</h1>
          </>
        ) : (
          <h1 className="font-black text-slate-600 text-sm tracking-tight uppercase">Jolasten</h1>
        )}
      </div>

      <div className="flex items-center gap-1">
        {!isOnline && (
          <div className="flex items-center space-x-1.5 bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100">
            <WifiOff size={10} strokeWidth={3} />
            <span className="text-[8px] font-black uppercase tracking-widest">Konexiorik gabe</span>
          </div>
        )}
        {(isGame || isResults) && isOnline && (
          <div className="flex items-center bg-slate-100 px-2 py-0.5 rounded-full">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">
              {isGame ? 'Jolasean' : 'Emaitza'}
            </span>
          </div>
        )}
        {isGame && (
          <button
            onClick={() => setCurrentPage('home')}
            className="p-2 -mr-2 text-slate-500 hover:text-red-500 transition-colors"
          >
            <X size={20} />
          </button>
        )}
        {!isGame && currentPage === 'home' && (
          <button
            onClick={() => setCurrentPage('settings')}
            className="p-2 text-slate-500 hover:text-emerald-500 transition-colors"
          >
            <Settings size={20} />
          </button>
        )}
      </div>
    </>
  );

  const footer = currentPage !== 'game' ? (
    <>
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setCurrentPage(item.id as Page)}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            currentPage === item.id || (currentPage === 'results' && item.id === 'home')
              ? "text-emerald-600 scale-110" 
              : "text-slate-400 opacity-40 hover:opacity-100"
          )}
        >
          <item.icon size={20} />
          <span className="text-[9px] font-black tracking-widest uppercase">{item.label}</span>
        </button>
      ))}
    </>
  ) : null;

  return (
    <>
    <Layout header={header} footer={footer}>
      <Suspense fallback={<LoadingState />}>
        {currentPage === 'home' && (
          <HomePage 
            onStartGame={handleStartGame} 
            onNavigate={(p) => setCurrentPage(p as Page)} 
          />
        )}
        
        {currentPage === 'game' && questions.length > 0 && (
          <DailyGamePage 
            questions={questions} 
            onFinish={handleFinishGame}
            onQuit={() => setCurrentPage('home')}
            onToast={addToast}
          />
        )}

        {currentPage === 'results' && sessionResult && (
          <SessionResultPage 
            result={sessionResult} 
            onPlayAgain={() => {
              // Trigger home to search for a new session
              // Or better: trigger the same logic as handlePlay in HomePage
              // But for now, returning home is safe, or we can add a 'loading' state
              setCurrentPage('home');
            }}
            onReview={() => setCurrentPage('review')}
            onHome={() => setCurrentPage('home')}
          />
        )}

        {currentPage === 'stats' && (
          <StatsPage onBack={() => setCurrentPage('home')} />
        )}

        {currentPage === 'favorites' && (
          <FavoritesPage onBack={() => setCurrentPage('home')} />
        )}

        {currentPage === 'review' && (
          <ReviewPage onBack={() => setCurrentPage('home')} />
        )}

        {currentPage === 'settings' && (
          <SettingsPage onBack={() => setCurrentPage('home')} />
        )}

        {currentPage === 'cloze' && (
          <ClozeSelectionPage 
            onBack={() => setCurrentPage('home')}
            onStart={(size) => {
               setClozeSessionSize(size);
               setCurrentPage('cloze-game');
            }}
          />
        )}

        {currentPage === 'cloze-game' && (
          <ClozeGamePage 
            sessionSize={clozeSessionSize}
            onFinish={(session) => {
              setClozeSession(session);
              setCurrentPage('cloze-results');
            }}
            onBack={() => setCurrentPage('cloze')}
          />
        )}

        {currentPage === 'cloze-results' && clozeSession && (
          <ClozeResultPage 
            session={clozeSession}
            onBack={() => setCurrentPage('home')} 
          />
        )}

        {currentPage === 'discourse-home' && (
          <DiscourseClozeHomePage 
            onBack={() => setCurrentPage('home')}
            onStats={() => setCurrentPage('stats')}
            reviewCount={playerService.getDiscourseClozeStats(playerService.getProfile()).questionsToReview}
            isAdituaUnlocked={playerService.getProfile().unlockedLevels.includes('Aditua')}
            onStart={(size, mode) => {
               setDiscourseSessionSize(size);
               if (mode) setDiscourseSessionMode(mode);
               else setDiscourseSessionMode('normal');
               setCurrentPage('discourse-game');
            }}
          />
        )}

        {currentPage === 'discourse-game' && (
          <DiscourseClozeGamePage 
            sessionSize={discourseSessionSize}
            mode={discourseSessionMode}
            onBack={() => setCurrentPage('discourse-home')}
            onGoToSynonyms={() => setCurrentPage('game')}
            onFinish={(session) => {
               setDiscourseSession(session);
               setCurrentPage('discourse-results');
            }}
          />
        )}

        {currentPage === 'discourse-results' && discourseSession && (
          <DiscourseClozeResultPage 
            session={discourseSession}
            onRetry={() => setCurrentPage('discourse-home')}
            onGoToHome={() => setCurrentPage('home')}
            onGoToDiscourse={() => setCurrentPage('discourse-home')}
            onGoToStats={() => setCurrentPage('stats')}
            onStart={(size, mode) => {
               setDiscourseSessionSize(size);
               if (mode) setDiscourseSessionMode(mode);
               else setDiscourseSessionMode('normal');
               setCurrentPage('discourse-game');
            }}
          />
        )}
      </Suspense>
    </Layout>
    <Toast toasts={toasts} onRemove={removeToast} />
    <ReloadPrompt />
  </>
  );
}
