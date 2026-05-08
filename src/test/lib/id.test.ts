import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClientId } from '../../lib/id';

describe('createClientId', () => {
  const originalCrypto = globalThis.crypto;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses crypto.randomUUID when available', () => {
    vi.stubGlobal('crypto', {
      ...originalCrypto,
      randomUUID: () => 'uuid-123',
    });

    expect(createClientId('session')).toBe('uuid-123');
  });

  it('falls back to a prefixed id when randomUUID is not available', () => {
    vi.stubGlobal('crypto', {});

    expect(createClientId('session')).toMatch(/^session-[a-z0-9]+-[a-z0-9]+$/);
  });
});
