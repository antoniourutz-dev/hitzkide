import { Play, Heart, BookOpen, ChevronRight, RefreshCw, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchGameData, hasCachedGameData } from '../services/lexicalService';
import { buildSessionQuestions } from '../services/questionService';
import { playerService } from '../services/playerService';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import LevelUpCelebration from '../components/LevelUpCelebration';
import { ToastData } from '../components/Toast';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { observabilityService } from '../analytics/observabilityService';
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import { SESSION_STORAGE_KEYS, writeJsonToSessionStorage } from '../lib/storage';
import { APP_BUILD_ID, APP_RELEASE_CHANNEL, APP_VERSION } from '../config/appMetadata';
import { getEnvConfig } from '../lib/env';
import { CloudProgressSnapshotMetadata } from '../services/playerService';

interface HomePageProps {
  onToast?: (message: string, type?: ToastData['type']) => void;
}

export default function HomePage({ onToast }: HomePageProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasOfflineData, setHasOfflineData] = useState(() => hasCachedGameData());
  const profile = usePlayerProfile();
  const [user, setUser] = useState<User | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [notEnoughQuestions, setNotEnoughQuestions] = useState(false);
  const [miniSessionMessage, setMiniSessionMessage] = useState<string | null>(null);
  const [cloudRefreshLoading, setCloudRefreshLoading] = useState(false);
  const [cloudSnapshotMetadata, setCloudSnapshotMetadata] = useState<CloudProgressSnapshotMetadata | null>(null);

  useEffect(() => {
    const syncConnectivityState = () => {
      setIsOnline(window.navigator.onLine);
      setHasOfflineData(hasCachedGameData());
    };

    syncConnectivityState();
    window.addEventListener('online', syncConnectivityState);
    window.addEventListener('offline', syncConnectivityState);

    authService.getCurrentUser().then(setUser);
    const { data: { subscription } } = authService.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      window.removeEventListener('online', syncConnectivityState);
      window.removeEventListener('offline', syncConnectivityState);
      subscription.unsubscribe();
    };
  }, []);

  const redirectToProfileForCloudProgress = (featureLabel: string) => {
    observabilityService.trackEvent('profile.auth_required_for_feature', 'runtime', {
      feature: featureLabel,
    }, 'warning');
    onToast?.('Aurrerapena hodeian gordetzeko, lehenengo saioa hasi behar duzu.', 'warning');
    navigate('/profile');
  };

  useEffect(() => {
    if (profile.lastLevelUp && !profile.lastLevelUp.seen) {
      setShowLevelUp(true);
    }
  }, [profile.lastLevelUp]);

  const handlePlay = async (mode: 'main' | 'quick' | 'review') => {
    if (!user) {
      observabilityService.trackFeatureUsage('synonym', mode, 'failed', {
        reason: 'auth_required',
      });
      redirectToProfileForCloudProgress(`synonym:${mode}`);
      return;
    }

    observabilityService.trackFeatureUsage('synonym', mode, 'requested', {
      online: isOnline,
      hasOfflineData,
    });

    if (!isOnline && !hasOfflineData) {
      observabilityService.trackFeatureUsage('synonym', mode, 'failed', {
        reason: 'offline_without_cached_content',
      });
      onToast?.('Konexiorik gabe zaude, eta oraindik ez dugu edukirik gorde gailu honetan.', 'warning');
      return;
    }

    setLoading(true);
    setNotEnoughQuestions(false);

    try {
      if (!isOnline && hasOfflineData) {
        onToast?.('Konexiorik gabe zaude: aurrez gordetako edukia erabiliko dugu.', 'info');
      }

      const allGroups = await fetchGameData();
      setHasOfflineData(hasCachedGameData());

      if (!allGroups || allGroups.length === 0) {
        observabilityService.trackFeatureUsage('synonym', mode, 'failed', {
          reason: 'no_groups_available',
          online: isOnline,
        });
        onToast?.(
          isOnline
            ? 'Datuak ezin izan dira kargatu. Mesedez, ziurtatu konexioa ondo dagoela.'
            : 'Konexiorik gabe zaude, eta oraindik ez dago nahikoa edukirik gordeta saioa sortzeko.',
          'warning'
        );
        setLoading(false);
        return;
      }

      const { questions, generatedCount } = await buildSessionQuestions(allGroups, profile, mode);

      let shouldNotStart = false;
      if (mode === 'main' && generatedCount < 3) shouldNotStart = true;
      if (mode === 'quick' && generatedCount < 3) shouldNotStart = true;
      if (mode === 'review' && generatedCount < 3) shouldNotStart = true;

      if (shouldNotStart) {
        observabilityService.trackFeatureUsage('synonym', mode, 'failed', {
          reason: 'not_enough_questions',
          generatedCount,
        });
        setNotEnoughQuestions(true);
        setLoading(false);
      } else {
        observabilityService.trackFeatureUsage('synonym', mode, 'started', {
          generatedCount,
          compactSession: generatedCount < 5,
        });
        if (generatedCount < 5 && (mode === 'main' || mode === 'quick')) {
            setMiniSessionMessage("Saio laburra sortu dugu. Galdera gutxiago, baina erabilgarriak.");
            setTimeout(() => {
                writeJsonToSessionStorage(SESSION_STORAGE_KEYS.questions, questions);
                navigate(`/game/${mode}`);
                setLoading(false);
            }, 2000);
        } else {
            writeJsonToSessionStorage(SESSION_STORAGE_KEYS.questions, questions);
            navigate(`/game/${mode}`);
            setLoading(false);
        }
      }
    } catch (error) {
      observabilityService.captureError('session.start_failed', 'session', error, {
        feature: 'synonym',
        mode,
      });
      observabilityService.trackFeatureUsage('synonym', mode, 'failed', {
        reason: 'unexpected_error',
      });
      onToast?.(
        isOnline
          ? 'Akats bat gertatu da jokoa kargatzean.'
          : 'Konexiorik gabe zaude, eta ezin izan dugu gordetako edukia prestatu.',
        'warning'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCloseLevelUp = () => {
    playerService.acknowledgeLevelUp();
    setShowLevelUp(false);
  };

  const progress = playerService.calculateLevelProgress(profile);
  const supabaseProjectRef = (() => {
    try {
      return new URL(getEnvConfig().supabaseUrl).hostname.split('.')[0] || 'unknown';
    } catch {
      return 'unknown';
    }
  })();
  const currentIdx = ['B1', 'B2', 'C1', 'C2', 'Aditua'].indexOf(profile.currentLevel);
  const nextLevel = ['B2', 'C1', 'C2', 'Aditua'][currentIdx] || profile.currentLevel;

  const reqQuestions = progress.missingRequirements.find(r => r.label === 'Galderak')?.isMet;
  const reqAccuracy = progress.missingRequirements.find(r => r.label === 'Akurazia')?.isMet;
  const reqReview = progress.missingRequirements.find(r => r.label === 'Berrikusteko')?.isMet;
  const reqMastery = progress.missingRequirements.find(r => r.label === 'Ezagutza')?.isMet;
  const knowledgeGap = reqQuestions && reqAccuracy && reqReview && !reqMastery;
  const synonymPlayDisabled = loading || (!isOnline && !hasOfflineData);
  const userIdShort = user?.id ? `${user.id.slice(0, 8)}…${user.id.slice(-6)}` : '-';
  const cloudUserIdShort = profile.cloudUserId ? `${profile.cloudUserId.slice(0, 8)}…${profile.cloudUserId.slice(-6)}` : '-';

  const refreshCloudSnapshotMetadata = async (userId: string) => {
    const metadata = await playerService.fetchCloudSnapshotMetadata(userId);
    setCloudSnapshotMetadata(metadata);
  };

  useEffect(() => {
    if (!showDetails || !user?.id) {
      return;
    }

    void refreshCloudSnapshotMetadata(user.id);
  }, [profile.lastCloudSyncAt, profile.stats.totalQuestions, showDetails, user?.id]);

  const refreshCloudProfile = async () => {
    if (!user?.id || cloudRefreshLoading) return;

    setCloudRefreshLoading(true);
    try {
      const currentUser = await authService.getCurrentUser();
      const userId = currentUser?.id || user.id;
      setUser(currentUser || user);
      await playerService.synchronizeAuthenticatedProfile(userId);
      await refreshCloudSnapshotMetadata(userId);
      onToast?.('Hodeiko profila berritu dugu.', 'success');
    } catch (error) {
      observabilityService.captureError('home.manual_cloud_refresh_failed', 'sync', error, {
        userId: user.id,
      });
      onToast?.('Ezin izan dugu hodeiko profila berritu.', 'warning');
    } finally {
      setCloudRefreshLoading(false);
    }
  };

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
        <div className="w-20 h-20 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center border-[3px] border-brand-border shadow-[6px_6px_0px_0px_#0f172a]">
          <BookOpen strokeWidth={2.5} size={36} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-brand-text tracking-tight">Ez dago nahikoa galdera</h2>
          <p className="text-slate-700 font-medium">Ez dago nahikoa galdera saio oso bat sortzeko.</p>
          <p className="text-slate-600 font-medium">Saiatu errepaso moduan edo gehitu datu gehiago.</p>
        </div>
        
        <div className="w-full space-y-3 pt-6 max-w-xs">
          <button
            onClick={() => handlePlay('review')}
            className="w-full sleek-btn-primary bg-emerald-600"
          >
            Errepasoa egin
          </button>
          <button
            onClick={() => setNotEnoughQuestions(false)}
            className="w-full sleek-btn-secondary"
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
            className="fixed top-20 left-4 right-4 z-50 bg-amber-50 border-[3px] border-brand-border text-amber-900 p-3 shadow-[6px_6px_0px_0px_#0f172a] text-center"
            role="status"
            aria-live="polite"
          >
            <p className="text-xs font-bold">{miniSessionMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* User Greeting Mini-Badge */}
      <div className="flex justify-between items-center px-1">
         <div className="flex flex-col">
            <span className="text-xl font-black text-brand-text tracking-tight">
               {user ? `Kaixo, ${authService.getDisplayName(user)}` : 'Kaixo, Gonbidatua'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-1">
               {user && profile.syncStatus === 'synced' ? (
                 <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Sinkronizatuta</>
               ) : user && profile.syncStatus === 'pending' ? (
                 <><div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div> Sinkronizatzeko zain</>
               ) : user && profile.syncStatus === 'error' ? (
                 <><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Sinkronizazio errorea</>
               ) : user && profile.syncStatus === 'auth_required' ? (
                 <><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Profila prestatzen</>
               ) : user && profile.syncStatus === 'loading' ? (
                 <><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Profila kargatzen</>
               ) : (
                 'Saioa hasi hodeiko aurrerapena aktibatzeko'
               )}
            </span>
         </div>
      </div>

      {!user && (
        <div className="sleek-card p-4 bg-sky-50" role="status" aria-live="polite">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-700">Premium profila</p>
          <p className="mt-1 text-sm font-semibold leading-relaxed">
            Aurrerapena ez galtzeko, saioa hasi edo kontua sortu. Joko saioak Supabasen gordeko ditugu.
          </p>
        </div>
      )}

      {!isOnline && (
        <div
          className={cn(
            "sleek-card p-4",
            hasOfflineData ? "bg-emerald-50" : "bg-amber-50"
          )}
          role="status"
          aria-live="polite"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em]">
            {hasOfflineData ? 'Offline prest' : 'Konexiorik gabe'}
          </p>
          <p className="mt-1 text-sm font-semibold leading-relaxed">
            {hasOfflineData
              ? 'Aurreko saioetan gordetako edukiarekin jokatu dezakezu. Sinkronizazioa berriro konektatzean egingo da.'
              : 'Aplikazioa zure gailuan dago, baina lehenengo edukia konektatuta kargatu behar dugu sinonimo saio berriak sortzeko.'}
          </p>
        </div>
      )}

      {/* Progress Card */}
      <div className="sleek-card p-4 space-y-3">
        <div className="flex flex-col items-center text-center space-y-0.5">
           <span className="text-[9px] font-black text-brand-accent uppercase tracking-widest">{profile.currentLevel} MAILA</span>
           <h2 className="text-base font-bold text-slate-800">{nextLevel} mailara bidean</h2>
        </div>
        
        <div className="space-y-1.5">
          <div className="relative h-2 bg-slate-100 overflow-hidden border-[3px] border-brand-border">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress.totalProgress}%` }}
              className="h-full bg-brand-primary transition-all duration-1000"
            />
          </div>
          <div className="flex justify-between items-center px-0.5">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate mr-2">{getMoto(progress.totalProgress, progress)}</span>
            <span className="text-sm font-black text-brand-text">{progress.totalProgress}%</span>
          </div>
        </div>

        <div className="pt-0.5">
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="w-full text-[8px] font-black text-slate-600 uppercase tracking-widest hover:text-brand-primary transition-colors flex items-center justify-center gap-1"
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
                className="overflow-hidden bg-slate-50 mt-2 divide-y divide-slate-200 border-[3px] border-brand-border shadow-[6px_6px_0px_0px_#0f172a]"
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
                <div className="space-y-2 p-2">
                  <button
                    onClick={() => void refreshCloudProfile()}
                    disabled={!user || cloudRefreshLoading}
                    className="w-full sleek-btn-secondary text-[9px] md:text-[9px] py-2 px-3 text-emerald-700 disabled:opacity-50"
                  >
                    {cloudRefreshLoading ? 'Hodeitik berritzen...' : 'Hodeitik berritu'}
                  </button>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] font-bold text-slate-500">
                    <span>Bertsioa</span>
                    <span className="text-right text-slate-700">{APP_VERSION} · {APP_RELEASE_CHANNEL}</span>
                    <span>Build</span>
                    <span className="text-right text-slate-700">{APP_BUILD_ID}</span>
                    <span>Supabase</span>
                    <span className="text-right text-slate-700">{supabaseProjectRef}</span>
                    <span>Ikasle IDa</span>
                    <span className="text-right text-slate-700">{userIdShort}</span>
                    <span>Cloud IDa</span>
                    <span className="text-right text-slate-700">{cloudUserIdShort}</span>
                    <span>Sync</span>
                    <span className="text-right text-slate-700">{profile.syncStatus || '-'}</span>
                    <span>Azken hodeia</span>
                    <span className="text-right text-slate-700">{profile.lastCloudSyncAt ? new Date(profile.lastCloudSyncAt).toLocaleString() : '-'}</span>
                    <span>DB azkena</span>
                    <span className="text-right text-slate-700">{cloudSnapshotMetadata?.lastSyncedAt ? new Date(cloudSnapshotMetadata.lastSyncedAt).toLocaleString() : '-'}</span>
                    <span>Saioak</span>
                    <span className="text-right text-slate-700">{profile.stats.totalSessions}</span>
                    <span>Galderak</span>
                    <span className="text-right text-slate-700">{profile.stats.totalQuestions}</span>
                    <span>Erantzun berriak</span>
                    <span className="text-right text-slate-700">{profile.recentAnswers.length}</span>
                    <span>DB saioak</span>
                    <span className="text-right text-slate-700">{cloudSnapshotMetadata?.progressTotalSessions ?? '-'}</span>
                    <span>DB galderak</span>
                    <span className="text-right text-slate-700">{cloudSnapshotMetadata?.progressTotalQuestions ?? '-'}</span>
                    <span>DB erantzunak</span>
                    <span className="text-right text-slate-700">{cloudSnapshotMetadata?.progressRecentAnswers ?? '-'}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button
          onClick={() => handlePlay('main')}
          disabled={synonymPlayDisabled}
          className="w-full sleek-btn-primary bg-brand-primary disabled:opacity-50"
        >
          <div className="flex items-center justify-center gap-2 w-full h-full text-white">
            <span className="text-xl font-black tracking-tight uppercase">Jokatu</span>
            <div className="w-5 flex items-center justify-center">
               {loading ? <RefreshCw size={20} className="animate-spin" aria-hidden="true" /> : <Play size={20} fill="currentColor" aria-hidden="true" />}
            </div>
          </div>
        </button>

        <button
          onClick={() => user ? navigate('/cloze') : redirectToProfileForCloudProgress('cloze')}
          className="sleek-card-interactive flex items-center justify-between p-5 bg-sky-50"
        >
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-sky-100 text-sky-700 rounded-none border-[3px] border-brand-border shadow-[3px_3px_0px_0px_#0f172a]">
              <BookOpen size={20} />
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-black text-slate-700">Cloze testak</span>
                <span className="text-[10px] font-bold text-sky-700">Testuinguruan hitz egokia</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-slate-600" />
        </button>

        <button
          onClick={() => user ? navigate('/discourse') : redirectToProfileForCloudProgress('discourse')}
          className="sleek-card-interactive flex items-center justify-between p-5 bg-indigo-50 mt-4"
        >
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-none border-[3px] border-brand-border shadow-[3px_3px_0px_0px_#0f172a]">
              <List size={20} />
            </div>
            <div className="flex flex-col text-left">
                <span className="text-sm font-black text-slate-700">Antolatzaileak</span>
                <span className="text-[10px] font-bold text-indigo-700 mt-0.5">Testua lotu eta ideiak antolatu</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-slate-600" />
        </button>

      {/* Removed unused quick/review/vocab/stats tiles */}

        <button
          onClick={() => navigate('/favorites')}
          className="sleek-card-interactive flex items-center justify-between p-5"
        >
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-rose-50 text-rose-700 rounded-none border-[3px] border-brand-border shadow-[3px_3px_0px_0px_#0f172a]">
              <Heart size={20} fill={profile.stats.totalSessions > 0 ? "currentColor" : "none"} />
            </div>
            <span className="text-sm font-black text-slate-700">Gogokoak</span>
          </div>
          <ChevronRight size={20} className="text-slate-600" />
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
