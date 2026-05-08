import { getSupabase } from '../lib/supabase';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

const AUTH_DOMAIN = "lexikoa.app";
const AUTH_READ_TIMEOUT_MS = 4000;
const AUTH_WRITE_TIMEOUT_MS = 12000;

export function normalizeUsername(username: string): string {
  let normalized = username.trim().toLowerCase();
  normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  normalized = normalized.replace(/[^a-z0-9._-]/g, "");
  return normalized;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        globalThis.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        globalThis.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export const authService = {
  getDisplayName(user: User | null | undefined): string {
    if (!user) {
      return 'Gonbidatua';
    }

    const metadataName = user.user_metadata?.username || user.user_metadata?.display_name;
    if (typeof metadataName === 'string' && metadataName.trim().length > 0) {
      return metadataName.trim();
    }

    const emailPrefix = user.email?.split('@')[0]?.trim();
    if (emailPrefix) {
      return emailPrefix;
    }

    return 'Ikaslea';
  },

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
    try {
      const session = await this.getSession();
      return session?.user ?? null;
    } catch {
      return null;
    }
  },

  async getSession(): Promise<Session | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data: { session }, error } = await withTimeout(
        Promise.resolve(supabase.auth.getSession()),
        AUTH_READ_TIMEOUT_MS,
        'auth.get_session'
      );
      if (error) {
        return null;
      }

      return session;
    } catch {
      return null;
    }
  },

  async signUpWithUsername(username: string, password: string) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Konexio errorea (Supabase prestatu gabe).');
    
    const normalizedUsername = this.validateUsername(username);
    const internalEmail = this.usernameToInternalEmail(normalizedUsername);
    
    const { data, error } = await withTimeout(
      Promise.resolve(
        supabase.auth.signUp({
          email: internalEmail,
          password,
          options: {
            data: {
              username: normalizedUsername,
              display_name: normalizedUsername,
              auth_type: "internal_username"
            }
          }
        })
      ),
      AUTH_WRITE_TIMEOUT_MS,
      'auth.sign_up'
    );

    if (error) {
      throw new Error(this.translateAuthError(error.message));
    }

    if (!data.session) {
      const session = await this.getSession();
      return {
        ...data,
        session,
      };
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

    const { data, error } = await withTimeout(
      Promise.resolve(
        supabase.auth.signInWithPassword({
          email: internalEmail,
          password,
        })
      ),
      AUTH_WRITE_TIMEOUT_MS,
      'auth.sign_in'
    );

    if (error) {
      throw new Error(this.translateAuthError(error.message));
    }

    if (!data.session) {
      const session = await this.getSession();
      return {
        ...data,
        session,
      };
    }

    return data;
  },

  async signOut() {
    const supabase = getSupabase();
    if (!supabase) return;
    await withTimeout(
      Promise.resolve(supabase.auth.signOut()),
      AUTH_WRITE_TIMEOUT_MS,
      'auth.sign_out'
    );
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
    if (msg.includes('timed out after')) return 'Konexioak gehiegi iraun du. Saiatu berriro.';
    return 'Ezin izan da prozesua burutu. Saiatu berriro geroago.';
  }
};
