export interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  geminiProxyUrl?: string;
}

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

  if (!hasSupabaseConfig && (supabaseUrl || supabaseAnonKey)) {
    warnings.push('La configuración de Supabase está incompleta; la sincronización cloud quedará desactivada.');
  }

  if (supabaseUrl) {
    if (!supabaseUrl.startsWith('https://')) {
      errors.push('VITE_SUPABASE_URL debe ser una URL HTTPS');
    }
    if (!supabaseUrl.includes('.supabase.co')) {
      warnings.push('VITE_SUPABASE_URL no parece ser una URL de Supabase');
    }
  }

  if (supabaseAnonKey) {
    if (supabaseAnonKey.length < 20) {
      warnings.push('VITE_SUPABASE_ANON_KEY parece demasiado corta');
    }
  }

  const geminiProxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
  const isLocalGeminiProxy = Boolean(
    geminiProxyUrl && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(geminiProxyUrl)
  );

  if (geminiProxyUrl && !geminiProxyUrl.startsWith('https://') && !(import.meta.env.DEV && isLocalGeminiProxy)) {
    errors.push('VITE_GEMINI_PROXY_URL debe ser una URL HTTPS');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getEnvConfig(): EnvConfig {
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    geminiProxyUrl: import.meta.env.VITE_GEMINI_PROXY_URL || undefined,
  };
}

if (import.meta.env.DEV) {
  const result = validateEnvironment();
  if (!result.valid) {
    console.error('❌ Errores de configuración:', result.errors);
  }
  if (result.warnings.length > 0) {
    console.warn('⚠️ Advertencias de configuración:', result.warnings);
  }
}
