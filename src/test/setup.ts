import { vi } from 'vitest';
import '@testing-library/jest-dom';

vi.stubGlobal('crypto', {
  randomUUID: () => Math.random().toString(36).substring(2),
  getRandomValues: () => new Uint8Array(1),
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

window.scrollTo = vi.fn();