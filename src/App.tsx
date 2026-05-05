import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense, useCallback, useMemo } from 'react';
import { Home, BarChart2, List, User as UserIcon, BookOpen, WifiOff, X, Settings } from 'lucide-react';
import { cn } from './lib/utils';
import Layout from './components/Layout';
import ReloadPrompt from './components/ReloadPrompt';
import Toast, { ToastData } from './components/Toast';

const HomePage = lazy(() => import('./pages/HomePage'));
const DailyGamePage = lazy(() => import('./pages/DailyGamePage'));
const SessionResultPage = lazy(() => import('./pages/SessionResultPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ClozeSelectionPage = lazy(() => import('./pages/ClozeSelectionPage'));
const ClozeGamePage = lazy(() => import('./pages/ClozeGamePage'));
const ClozeResultPage = lazy(() => import('./pages/ClozeResultPage'));
const DiscourseClozeHomePage = lazy(() => import('./pages/DiscourseClozeHomePage'));
const DiscourseClozeGamePage = lazy(() => import('./pages/DiscourseClozeGamePage'));
const DiscourseClozeResultPage = lazy(() => import('./pages/DiscourseClozeResultPage'));

function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Kargatzen">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2);
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

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

  const isGame = useMemo(() => location.pathname.startsWith('/game'), [location.pathname]);
  const isResults = useMemo(() => location.pathname.startsWith('/results'), [location.pathname]);

  const navItems = useMemo(() => [
    { path: '/', icon: Home, label: 'Hasiera' },
    { path: '/stats', icon: BarChart2, label: 'Estat.' },
    { path: '/review', icon: List, label: 'Berri.' },
    { path: '/profile', icon: UserIcon, label: 'Profila' }
  ], []);

  const header = useMemo(() => (
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
            onClick={() => navigate('/')}
            className="p-2 -mr-2 text-slate-500 hover:text-red-500 transition-colors"
          >
            <X size={20} />
          </button>
        )}
        {!isGame && location.pathname === '/' && (
          <button
            onClick={() => navigate('/settings')}
            className="p-2 text-slate-500 hover:text-emerald-500 transition-colors"
          >
            <Settings size={20} />
          </button>
        )}
      </div>
    </>
  ), [isGame, isOnline, isResults, location.pathname, navigate]);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const footer = useMemo(() => !isGame ? (
    <>
      {navItems.map((item) => (
        <button
          key={item.path}
          onClick={() => handleNavigate(item.path)}
          aria-label={item.label}
          aria-current={location.pathname === item.path ? 'page' : undefined}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            location.pathname === item.path
              ? "text-emerald-600 scale-110"
              : "text-slate-400 opacity-40 hover:opacity-100"
          )}
        >
          <item.icon size={20} aria-hidden="true" />
          <span className="text-[9px] font-black tracking-widest uppercase">{item.label}</span>
        </button>
      ))}
    </>
  ) : null, [isGame, location.pathname, handleNavigate, navItems]);

  return (
    <>
      <Layout header={header} footer={footer}>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route path="/" element={<HomePage onToast={addToast} />} />
            <Route path="/game/:mode" element={<DailyGamePage onToast={addToast} />} />
            <Route path="/results" element={<SessionResultPage onToast={addToast} />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/cloze" element={<ClozeSelectionPage />} />
            <Route path="/cloze/:size" element={<ClozeGamePage />} />
            <Route path="/cloze/results" element={<ClozeResultPage />} />
            <Route path="/discourse" element={<DiscourseClozeHomePage />} />
            <Route path="/discourse/:size/:mode" element={<DiscourseClozeGamePage />} />
            <Route path="/discourse/results" element={<DiscourseClozeResultPage />} />
          </Routes>
        </Suspense>
      </Layout>
      <Toast toasts={toasts} onRemove={removeToast} />
      <ReloadPrompt />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
