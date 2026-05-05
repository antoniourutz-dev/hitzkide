import { getSupabase } from '../lib/supabase';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

const AUTH_DOMAIN = "lexikoa.app";

export function normalizeUsername(username: string): string {
  let normalized = username.trim().toLowerCase();
  normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  normalized = normalized.replace(/[^a-z0-9._-]/g, "");
  return normalized;
}

export const authService = {
  usernameToInternalEmail(username: string): string {
    return `${normalizeUsername(username)}@${AUTH_DOMAIN}`;
  },

  validateUsername(username: string): string {
    const norm = normalizeUsername(username);
    if (norm.length < 3) throw new Error('Erabiltzaile-izenak gutxienez 3 karaktere izan behar ditu.');
    if (norm.length > 24) throw new Error('Erabiltzaile-izenak gehienez 24 karaktere izan behar ditu.');
    if (norm !== username.trim().replace(/\s+/g, '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")) {
       throw new Error('Erabili letrak, zenbakiak, puntua, gidoia edo azpimarra soilik.');
    }
    return norm;
  },

  async getCurrentUser(): Promise<User | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getSession(): Promise<Session | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async signUpWithUsername(username: string, password: string) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Konexio errorea (Supabase prestatu gabe).');
    
    const normalizedUsername = this.validateUsername(username);
    const internalEmail = this.usernameToInternalEmail(normalizedUsername);
    
    const { data, error } = await supabase.auth.signUp({
      email: internalEmail,
      password,
      options: {
        data: {
          username: normalizedUsername,
          display_name: normalizedUsername,
          auth_type: "internal_username"
        }
      }
    });

    if (error) {
      throw new Error(this.translateAuthError(error.message));
    }
    return data;
  },

  async signInWithUsername(username: string, password: string) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Konexio errorea (Supabase prestatu gabe).');

    try {
      this.validateUsername(username);
    } catch {
      throw new Error('Erabiltzaile edo pasahitz okerra.');
    }
    const internalEmail = this.usernameToInternalEmail(username);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password,
    });

    if (error) {
      throw new Error(this.translateAuthError(error.message));
    }
    return data;
  },

  async signOut() {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    const supabase = getSupabase();
    if (!supabase) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase.auth.onAuthStateChange(callback);
  },

  translateAuthError(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('invalid login credentials')) return 'Erabiltzaile edo pasahitz okerra.';
    if (msg.includes('user already registered')) return 'Erabiltzaile-izen hori erabilita dago.';
    if (msg.includes('password should be at least')) return 'Pasahitzak gutxienez 6 karaktere izan behar ditu.';
    if (msg.includes('email format is invalid')) return 'Erabiltzaile izen okerra.';
    if (msg.includes('network request failed')) return 'Konexio errorea. Saiatu berriro geroago.';
    return 'Ezin izan da prozesua burutu. Saiatu berriro geroago.';
  }
};

