import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  getSupabase: () => ({
    auth: {
      getSession: supabaseMocks.getSession,
      getUser: supabaseMocks.getUser,
      signInWithPassword: supabaseMocks.signInWithPassword,
      signUp: supabaseMocks.signUp,
      signOut: supabaseMocks.signOut,
      onAuthStateChange: supabaseMocks.onAuthStateChange,
    },
  }),
}));

import { authService } from '../../services/authService';

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
  });

  it('resolves the current user from Supabase auth', async () => {
    supabaseMocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'ikaslea@lexikoa.app',
          user_metadata: {
            username: 'ikaslea',
          },
        },
      },
      error: null,
    });

    const user = await authService.getCurrentUser();

    expect(user?.id).toBe('user-1');
    expect(supabaseMocks.getUser).toHaveBeenCalledTimes(1);
  });

  it('falls back to the internal email prefix when metadata is missing', () => {
    const displayName = authService.getDisplayName({
      id: 'user-2',
      email: 'alumno_demo@lexikoa.app',
      user_metadata: {},
    } as never);

    expect(displayName).toBe('alumno_demo');
  });
});
