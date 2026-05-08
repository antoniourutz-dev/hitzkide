import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, User as UserIcon, RefreshCw, CheckCircle2, AlertCircle, LogOut, X } from 'lucide-react';
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
      startAuthenticatedProfileSync(signedInUser.id);
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
        <RefreshCw className="animate-spin text-brand-primary" aria-hidden="true" />
      </div>
    );
  }

  const isFormValid = username.trim().length > 0 && password.length > 0;

  if (!user) {
    return (
      <div className="space-y-6 pb-20 max-w-sm mx-auto">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-slate-700 hover:text-brand-primary">
          <ArrowLeft />
        </button>
        
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-brand-text tracking-tight">Saioa hasi</h2>
          <p className="text-sm font-bold text-brand-primary">
            Ikaslearen hodeiko profila modu seguruan kargatu
          </p>
        </div>

        {authError && (
          <div className="sleek-card p-3 bg-rose-50 text-rose-800 text-sm font-bold flex items-center gap-2">
            <AlertCircle size={16} />
            {authError}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500">Erabiltzailea</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full rounded-none border-[3px] border-brand-border bg-white px-4 py-3 pr-11 font-bold shadow-[6px_6px_0px_0px_#0f172a] transition-colors focus:outline-none"
                placeholder="zure_izena"
              />
              {username.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setUsername('');
                    setAuthError('');
                  }}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  aria-label="Erabiltzailea garbitu"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500">Pasahitza</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-none border-[3px] border-brand-border bg-white px-4 py-3 pr-11 font-bold shadow-[6px_6px_0px_0px_#0f172a] transition-colors focus:outline-none"
                placeholder="••••••••"
              />
              {password.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPassword('');
                    setAuthError('');
                  }}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  aria-label="Pasahitza garbitu"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <p className="pl-1 text-[10px] font-bold text-slate-400">
              Kontua ikastetxeak edo administratzaileak emanda sartzen da.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className="mt-4 w-full sleek-btn-primary bg-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && <RefreshCw size={16} className="animate-spin" />}
            Sartu
          </button>
        </form>
      </div>
    );
  }

  // View: Info / Dashboard
  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-slate-700 hover:text-brand-primary">
          <ArrowLeft />
        </button>
      </div>
      
      <div className="space-y-1">
          <h2 className="text-3xl font-black text-brand-text tracking-tight">Nire profila</h2>
          <p className="text-sm font-bold text-slate-600">
            Zure aurrerapena Supabasen gordetzen da.
          </p>
      </div>

      <div className="sleek-card p-6 flex flex-col items-center space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 bg-sky-500 rounded-full blur-2xl w-32 h-32 -mr-10 -mt-10 pointer-events-none"></div>
        
        <div className="w-20 h-20 rounded-full flex items-center justify-center bg-brand-primary text-white border-[3px] border-brand-border shadow-[6px_6px_0px_0px_#0f172a]">
           <UserIcon size={40} />
        </div>
        
        <div className="text-center">
           <h3 className="font-black text-xl text-brand-text">
             {authService.getDisplayName(user)}
           </h3>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
             Maila: <span className="text-brand-primary">{profile.currentLevel}</span>
           </p>
        </div>

        <div className="w-full pt-4 space-y-4">
           <div className="grid grid-cols-2 gap-3 text-center">
              <div className="sleek-card p-3 bg-slate-50">
                 <p className="font-black text-brand-text text-xl">{profile.stats.totalSessions}</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Saioak</p>
              </div>
              <div className="sleek-card p-3 bg-slate-50">
                 <p className="font-black text-brand-text text-xl">{Math.round(profile.stats.globalAccuracy)}%</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Asmatze tasa</p>
              </div>
           </div>

           <div className="sleek-card flex items-center justify-between p-3 bg-slate-50">
               <div className="flex items-center gap-2">
                   {profile.syncStatus === 'synced' ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                   ) : profile.syncStatus === 'error' ? (
                      <AlertCircle size={16} className="text-red-500" />
                   ) : profile.syncStatus === 'auth_required' ? (
                      <AlertCircle size={16} className="text-amber-500" />
                   ) : (
                      <RefreshCw size={16} className="text-brand-primary" />
                   )}
                   <div className="flex flex-col">
                       <span className="text-xs font-bold text-slate-700">
                           {profile.syncStatus === 'synced'
                             ? 'Sinkronizatuta'
                             : profile.syncStatus === 'error'
                               ? 'Ezin izan da sinkronizatu'
                               : profile.syncStatus === 'auth_required'
                                 ? 'Saioa behar da'
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
                  className="p-2 text-brand-primary hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
               >
                   <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
               </button>
           </div>

           <button 
              onClick={handleSignOut}
              disabled={isSubmitting} 
              className="w-full sleek-btn-secondary bg-rose-50 text-rose-800 mt-4"
           >
               {isSubmitting && <RefreshCw size={16} className="animate-spin" />}
               {!isSubmitting && <LogOut size={16} />}
               Saioa itxi
           </button>
        </div>
      </div>

    </div>
  );
}
