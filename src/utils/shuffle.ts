/**
 * Deterministically shuffles an array based on a seed string.
 */
export function deterministicShuffle<T>(array: T[], seed: string): T[] {
  const shuffled = [...array];
  let seedNum = hashString(seed);

  for (let i = shuffled.length - 1; i > 0; i--) {
    // Linear Congruential Generator for deterministic pseudo-randomness
    seedNum = (seedNum * 16807) % 2147483647;
    const j = seedNum % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
