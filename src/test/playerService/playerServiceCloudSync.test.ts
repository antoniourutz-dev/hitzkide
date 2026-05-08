import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerProfile, SessionResult } from '../../types/stats';

const supabaseMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  profileUpsert: vi.fn(),
  snapshotUpsert: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  getSupabase: () => ({
    auth: {
      getSession: supabaseMocks.getSession,
      getUser: supabaseMocks.getUser,
    },
    from: (table: string) => {
      if (table === 'user_profiles') {
        return {
          upsert: supabaseMocks.profileUpsert,
        };
      }

      if (table === 'user_progress_snapshots') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: supabaseMocks.maybeSingle,
            }),
          }),
          upsert: supabaseMocks.snapshotUpsert,
        };
      }

      return {
        upsert: vi.fn(),
      };
    },
  }),
}));

vi.mock('../../analytics/observabilityService', () => ({
  observabilityService: {
    trackSync: vi.fn(),
    captureError: vi.fn(),
    flushEventsToSupabase: vi.fn(),
    trackFeatureUsage: vi.fn(),
    trackSupabase: vi.fn(),
    trackEvent: vi.fn(),
  },
}));

import { playerService } from '../../services/playerService';

function createStoredSession(
  startedAt: string,
  finishedAt: string,
  score: number,
  total: number,
  mode: string = 'main'
): SessionResult {
  return {
    score,
    total,
    questions: [],
    answers: [],
    statusChanges: [],
    level: 'B1',
    mode,
    startedAt,
    finishedAt,
  };
}

function createProfile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  const base = structuredClone(playerService.getProfile());

  return {
    ...base,
    ...overrides,
    stats: {
      ...base.stats,
      ...(overrides.stats || {}),
    },
    groupMastery: { ...base.groupMastery, ...(overrides.groupMastery || {}) },
    wordMastery: { ...base.wordMastery, ...(overrides.wordMastery || {}) },
    clozeMastery: { ...base.clozeMastery, ...(overrides.clozeMastery || {}) },
    discourseClozeMastery: { ...(base.discourseClozeMastery || {}), ...(overrides.discourseClozeMastery || {}) },
    unlockedLevels: overrides.unlockedLevels ? [...overrides.unlockedLevels] : [...base.unlockedLevels],
    clozeSessions: overrides.clozeSessions ? [...overrides.clozeSessions] : [...base.clozeSessions],
    discourseClozeSessions: overrides.discourseClozeSessions ? [...overrides.discourseClozeSessions] : [...(base.discourseClozeSessions || [])],
    recentAnswers: overrides.recentAnswers ? [...overrides.recentAnswers] : [...base.recentAnswers],
    sessions: overrides.sessions ? [...overrides.sessions] : [...(base.sessions || [])],
  };
}

describe('playerService cloud synchronization', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    playerService.resetProfile('auth_required');
    supabaseMocks.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-1',
            email: 'ikaslea@lexikoa.app',
            user_metadata: {
              username: 'ikaslea',
            },
          },
        },
      },
      error: null,
    });
    supabaseMocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          user_metadata: {
            username: 'ikaslea',
          },
        },
      },
    });
    supabaseMocks.profileUpsert.mockResolvedValue({ error: null });
    supabaseMocks.snapshotUpsert.mockResolvedValue({ error: null });
    supabaseMocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('hydrates the local browser profile from cloud on authenticated bootstrap', async () => {
    const cloudProfile = createProfile({
      currentLevel: 'B2',
      unlockedLevels: ['B1', 'B2'],
      stats: {
        totalSessions: 2,
        totalQuestions: 5,
        totalCorrect: 4,
        globalAccuracy: 80,
        currentStreak: 2,
        bestStreak: 2,
        lastPlayedDate: '2026-05-05',
        dailySessionsCount: 1,
      },
      sessions: [
        createStoredSession('2026-05-04T10:00:00.000Z', '2026-05-04T10:05:00.000Z', 2, 3),
        createStoredSession('2026-05-05T10:00:00.000Z', '2026-05-05T10:05:00.000Z', 2, 2),
      ],
    });

    supabaseMocks.maybeSingle.mockResolvedValue({
      data: {
        progress: cloudProfile,
        last_synced_at: '2026-05-05T10:10:00.000Z',
      },
      error: null,
    });

    const synchronizedProfile = await playerService.synchronizeAuthenticatedProfile('user-1');

    expect(synchronizedProfile.currentLevel).toBe('B2');
    expect(synchronizedProfile.stats.totalSessions).toBe(2);
    expect(synchronizedProfile.lastCloudSyncAt).toBe('2026-05-05T10:10:00.000Z');
    expect(synchronizedProfile.syncStatus).toBe('synced');
    expect(supabaseMocks.snapshotUpsert).not.toHaveBeenCalled();
  });

  it('merges cloud progress before uploading a local snapshot', async () => {
    const localProfile = createProfile({
      stats: {
        totalSessions: 1,
        totalQuestions: 3,
        totalCorrect: 2,
        globalAccuracy: 66.6667,
        currentStreak: 1,
        bestStreak: 1,
        lastPlayedDate: '2026-05-04',
        dailySessionsCount: 1,
      },
      sessions: [createStoredSession('2026-05-04T10:00:00.000Z', '2026-05-04T10:05:00.000Z', 2, 3)],
    });
    const cloudProfile = createProfile({
      stats: {
        totalSessions: 1,
        totalQuestions: 2,
        totalCorrect: 1,
        globalAccuracy: 50,
        currentStreak: 1,
        bestStreak: 1,
        lastPlayedDate: '2026-05-05',
        dailySessionsCount: 1,
      },
      sessions: [createStoredSession('2026-05-05T10:00:00.000Z', '2026-05-05T10:05:00.000Z', 1, 2)],
    });

    supabaseMocks.maybeSingle.mockResolvedValue({
      data: {
        progress: cloudProfile,
        last_synced_at: '2026-05-05T10:10:00.000Z',
      },
      error: null,
    });

    const uploadedProfile = await playerService.syncProgressToCloud(localProfile);
    const persistedProfile = playerService.getProfile();

    expect(uploadedProfile.stats.totalSessions).toBe(2);
    expect(uploadedProfile.stats.totalQuestions).toBe(5);
    expect(uploadedProfile.stats.totalCorrect).toBe(3);
    expect(uploadedProfile.sessions).toHaveLength(2);
    expect(supabaseMocks.snapshotUpsert).toHaveBeenCalledTimes(1);
    expect(supabaseMocks.snapshotUpsert.mock.calls[0][0].progress.sessions).toHaveLength(2);
    expect(persistedProfile.stats.totalSessions).toBe(2);
    expect(persistedProfile.syncStatus).toBe('synced');
  });

  it('does not write progress when the requested user does not match the verified session', async () => {
    supabaseMocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'other-user',
          user_metadata: {
            username: 'bestea',
          },
        },
      },
      error: null,
    });

    const localProfile = createProfile({
      stats: {
        totalSessions: 1,
        totalQuestions: 3,
        totalCorrect: 2,
        globalAccuracy: 66.6667,
        currentStreak: 1,
        bestStreak: 1,
        lastPlayedDate: '2026-05-04',
        dailySessionsCount: 1,
      },
    });

    const syncedProfile = await playerService.syncProgressToCloud(localProfile, { userId: 'user-1' });

    expect(syncedProfile.syncStatus).toBe('auth_required');
    expect(supabaseMocks.profileUpsert).not.toHaveBeenCalled();
    expect(supabaseMocks.snapshotUpsert).not.toHaveBeenCalled();
  });
});
