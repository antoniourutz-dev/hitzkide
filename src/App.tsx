import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense, useCallback, useMemo } from 'react';
import { Home, BarChart2, List, User as UserIcon, BookOpen, WifiOff, X, Settings } from 'lucide-react';
import { cn } from './lib/utils';
import Layout from './components/Layout';
import ReloadPrompt from './components/ReloadPrompt';
import RequireStudentAuth from './components/RequireStudentAuth';
import Toast, { ToastData } from './components/Toast';
import { authService } from './services/authService';
import { playerService } from './services/playerService';
import { observabilityService } from './analytics/observabilityService';
import { createClientId } from './lib/id';

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
const AdminCorpusCoveragePage = lazy(() => import('./pages/AdminCorpusCoveragePage'));

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Edukia prestatzen</p>
    </div>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = createClientId('toast');
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

  useEffect(() => {
    const synchronizeProfile = async (userId?: string) => {
      if (!userId) {
        return;
      }

      try {
        await playerService.synchronizeAuthenticatedProfile(userId);
      } catch (error) {
        observabilityService.captureError('profile.bootstrap_sync_failed', 'sync', error, {
          userId,
        });
      }
    };

    const startProfileSynchronization = (userId?: string) => {
      void synchronizeProfile(userId);
    };

    const bootstrapProfile = async () => {
      try {
        const currentUser = await authService.getCurrentUser().catch(() => null);
        if (currentUser?.id) {
          startProfileSynchronization(currentUser.id);
        } else {
          playerService.handleSignedOutState();
        }
      } catch (error) {
        observabilityService.captureError('profile.bootstrap_failed', 'runtime', error);
        playerService.handleSignedOutState();
      }
    };

    void bootstrapProfile();

    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        return;
      }

      if (session?.user) {
        startProfileSynchronization(session.user.id);
      } else {
        playerService.handleSignedOutState();
      }
    });

    return () => {
      subscription.unsubscribe();
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
            aria-label="Jokoa utzi eta hasierara itzuli"
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
        {!isGame && location.pathname === '/' && (
          <button
            onClick={() => navigate('/settings')}
            className="p-2 text-slate-500 hover:text-emerald-500 transition-colors"
            aria-label="Ezarpenak ireki"
          >
            <Settings size={20} aria-hidden="true" />
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
            <Route path="/" element={<RequireStudentAuth><HomePage onToast={addToast} /></RequireStudentAuth>} />
            <Route path="/game/:mode" element={<RequireStudentAuth><DailyGamePage onToast={addToast} /></RequireStudentAuth>} />
            <Route path="/results" element={<RequireStudentAuth><SessionResultPage onToast={addToast} /></RequireStudentAuth>} />
            <Route path="/stats" element={<RequireStudentAuth><StatsPage /></RequireStudentAuth>} />
            <Route path="/favorites" element={<RequireStudentAuth><FavoritesPage /></RequireStudentAuth>} />
            <Route path="/review" element={<RequireStudentAuth><ReviewPage /></RequireStudentAuth>} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/cloze" element={<RequireStudentAuth><ClozeSelectionPage /></RequireStudentAuth>} />
            <Route path="/cloze/:size" element={<RequireStudentAuth><ClozeGamePage /></RequireStudentAuth>} />
            <Route path="/cloze/results" element={<RequireStudentAuth><ClozeResultPage /></RequireStudentAuth>} />
            <Route path="/discourse" element={<RequireStudentAuth><DiscourseClozeHomePage /></RequireStudentAuth>} />
            <Route path="/discourse/:size/:mode" element={<RequireStudentAuth><DiscourseClozeGamePage /></RequireStudentAuth>} />
            <Route path="/discourse/results" element={<RequireStudentAuth><DiscourseClozeResultPage /></RequireStudentAuth>} />
            <Route path="/admin/corpus-coverage" element={<RequireStudentAuth><AdminCorpusCoveragePage /></RequireStudentAuth>} />
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
