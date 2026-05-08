import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, User as UserIcon, RefreshCw, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { playerService } from '../services/playerService';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { observabilityService } from '../analytics/observabilityService';
import { usePlayerProfile } from '../hooks/usePlayerProfile';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Akats ezezaguna gertatu da.';
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const profile = usePlayerProfile();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'info' | 'login' | 'register'>('info');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncAuthenticatedProfile = useCallback(async (userId: string) => {
    setIsSyncing(true);
    try {
      await playerService.synchronizeAuthenticatedProfile(userId);
    } catch (error) {
      observabilityService.captureError('profile.login_sync_failed', 'sync', error, {
        userId,
      });
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const startAuthenticatedProfileSync = useCallback((userId: string) => {
    void syncAuthenticatedProfile(userId);
  }, [syncAuthenticatedProfile]);

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await authService.getCurrentUser();

      setUser(currentUser);
      if (currentUser?.id) {
        startAuthenticatedProfileSync(currentUser.id);
      } else {
        playerService.handleSignedOutState();
      }
    } catch (e) {
      observabilityService.captureError('profile.load_user_failed', 'runtime', e);
    } finally {
      setLoading(false);
    }
  }, [startAuthenticatedProfileSync]);

  useEffect(() => {
    void loadUser();

    // Subscribe to auth changes
    const { data: { subscription } } = authService.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        startAuthenticatedProfileSync(session.user.id);
      } else {
        setUser(null);
        playerService.handleSignedOutState();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUser, startAuthenticatedProfileSync]);

  useEffect(() => {
    if (user?.id && profile.syncStatus === 'auth_required' && !isSyncing) {
      startAuthenticatedProfileSync(user.id);
    }
  }, [isSyncing, profile.syncStatus, startAuthenticatedProfileSync, user?.id]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      if (user) {
         await playerService.synchronizeAuthenticatedProfile(user.id);
      }
    } catch (error) {
      observabilityService.captureError('profile.manual_sync_failed', 'sync', error, {
        userId: user?.id,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    try {
      const authResult = await authService.signInWithUsername(username, password);
      const signedInUser = authResult.user ?? await authService.getCurrentUser();
      if (!signedInUser) {
        throw new Error('Saioa ezin izan da ireki. Saiatu berriro.');
      }

      setUser(signedInUser);
      setUsername('');
      setPassword('');
      setView('info');
      startAuthenticatedProfileSync(signedInUser.id);
      navigate('/');
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (password.length < 6) {
      setAuthError('Pasahitzak gutxienez 6 karaktere izan behar ditu.');
      return;
    }
    setIsSubmitting(true);
    try {
      const authResult = await authService.signUpWithUsername(username, password);
      const signedUpUser = authResult.user ?? await authService.getCurrentUser();
      if (!signedUpUser) {
        throw new Error('Kontua sortu da, baina saioa ez da ireki. Saiatu saioa hasten.');
      }

      setUser(signedUpUser);
      setUsername('');
      setPassword('');
      setView('info');
      startAuthenticatedProfileSync(signedUpUser.id);
      navigate('/');
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setIsSubmitting(true);
    try {
      await authService.signOut();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-40">
        <RefreshCw className="animate-spin text-sky-500" />
      </div>
    );
  }

  // View: Login / Register
  const isLogin = view === 'login';
  const isValidUsername = username.trim().length >= 3;
  const isValidPassword = password.length >= 6;
  const isFormValid = isLogin ? (username.trim().length > 0 && password.length > 0) : (isValidUsername && isValidPassword);

  if (!user && (view === 'login' || view === 'register')) {
    return (
      <div className="p-6 space-y-6 pb-20 max-w-sm mx-auto">
        <button onClick={() => { setView('info'); setAuthError(''); }} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
          <ArrowLeft />
        </button>
        
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">
            {isLogin ? 'Saioa hasi' : 'Kontua sortu'}
          </h2>
          <p className="text-sm font-bold text-sky-600">
            Hodeiko profila eta aurrerapen segurua aktibatu
          </p>
        </div>

        {authError && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-bold flex items-center gap-2">
            <AlertCircle size={16} />
            {authError}
          </div>
        )}

        <form onSubmit={isLogin ? handleSignIn : handleSignUp} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500">Erabiltzailea</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-sky-500 transition-colors"
              placeholder="zure_izena"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500">Pasahitza</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-sky-500 transition-colors"
              placeholder="••••••••"
            />
            {!isLogin && (
              <p className={`text-[10px] font-bold mt-1 pl-1 ${
                password.length === 0 ? 'text-slate-400' :
                password.length < 6 ? 'text-amber-500' :
                'text-emerald-500'
              }`}>
                {password.length === 0 ? 'Gutxienez 6 karaktere' :
                 password.length < 6 ? 'Oraindik karaktere gehiago behar dira' :
                 'Pasahitza egokia da'}
              </p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || !isFormValid}
            className="w-full mt-4 py-4 bg-sky-500 hover:bg-sky-600 active:scale-[0.98] transition-all text-white rounded-2xl font-black shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex justify-center items-center gap-2"
          >
            {isSubmitting && <RefreshCw size={16} className="animate-spin" />}
            {isLogin ? 'Sartu' : 'Kontua sortu'}
          </button>
        </form>
      </div>
    );
  }

  // View: Info / Dashboard
  return (
    <div className="p-6 space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
          <ArrowLeft />
        </button>
      </div>
      
      <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Nire profila</h2>
          <p className="text-sm font-bold text-slate-500">
            {user ? 'Zure aurrerapena Supabasen gordetzen da.' : 'Konturik gabe ezin dugu aurrerapena modu premiumean gorde.'}
          </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col items-center space-y-4 shadow-sm relative overflow-hidden">
        {user && <div className="absolute top-0 right-0 p-4 opacity-5 bg-sky-500 rounded-full blur-2xl w-32 h-32 -mr-10 -mt-10 pointer-events-none"></div>}
        
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${user ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400'}`}>
           <UserIcon size={40} />
        </div>
        
        <div className="text-center">
           <h3 className="font-black text-xl text-slate-800">
             {authService.getDisplayName(user)}
           </h3>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
             Maila: <span className="text-sky-600">{profile.currentLevel}</span>
           </p>
        </div>

        {!user && (
          <div className="w-full pt-4 space-y-3">
             <div className="text-center text-xs font-bold text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                 Premium moduan jokatzeko eta aurrerapena ez galtzeko, kontua behar duzu.
             </div>
             <button onClick={() => setView('login')} className="w-full py-3 bg-sky-500 text-white rounded-xl font-black hover:bg-sky-600 transition">
                 Saioa hasi
             </button>
             <button onClick={() => setView('register')} className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black hover:bg-slate-50 transition">
                 Kontua sortu
             </button>
          </div>
        )}

        {user && (
          <div className="w-full pt-4 space-y-4">
             <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-3">
                   <p className="font-black text-slate-800 text-xl">{profile.stats.totalSessions}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Saioak</p>
                </div>
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-3">
                   <p className="font-black text-slate-800 text-xl">{Math.round(profile.stats.globalAccuracy)}%</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Asmatze tasa</p>
                </div>
             </div>

             <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                 <div className="flex items-center gap-2">
                     {profile.syncStatus === 'synced' ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                     ) : profile.syncStatus === 'error' ? (
                        <AlertCircle size={16} className="text-red-500" />
                     ) : profile.syncStatus === 'auth_required' ? (
                        <AlertCircle size={16} className="text-amber-500" />
                     ) : (
                        <RefreshCw size={16} className="text-sky-500" />
                     )}
                     <div className="flex flex-col">
                         <span className="text-xs font-bold text-slate-700">
                             {profile.syncStatus === 'synced'
                               ? 'Sinkronizatuta'
                               : profile.syncStatus === 'error'
                                 ? 'Ezin izan da sinkronizatu'
                                 : profile.syncStatus === 'auth_required'
                                   ? (user ? 'Profila prestatzen' : 'Saioa behar da')
                                   : profile.syncStatus === 'loading'
                                     ? 'Profila kargatzen'
                                     : 'Sinkronizatzeko zain'}
                         </span>
                         <span className="text-[9px] font-bold text-slate-400">
                             {profile.lastCloudSyncAt ? new Date(profile.lastCloudSyncAt).toLocaleString() : 'Sekula ez'}
                         </span>
                     </div>
                 </div>
                 
                 <button 
                    onClick={handleManualSync} 
                    disabled={isSyncing}
                    className="p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors disabled:opacity-50"
                 >
                     <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                 </button>
             </div>

             <button 
                onClick={handleSignOut}
                disabled={isSubmitting} 
                className="w-full py-3 bg-white border border-red-100 text-red-500 rounded-xl font-black hover:bg-red-50 transition flex items-center justify-center gap-2 mt-4"
             >
                 {isSubmitting && <RefreshCw size={16} className="animate-spin" />}
                 {!isSubmitting && <LogOut size={16} />}
                 Saioa itxi
             </button>
          </div>
        )}
      </div>

    </div>
  );
}
