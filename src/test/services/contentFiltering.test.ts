import { describe, expect, it } from 'vitest';
import { getAccessibleClozeLevels } from '../../services/clozeService';
import { getAccessibleDiscourseLevels } from '../../services/discourseClozeService';

describe('content filtering helpers', () => {
  it('returns unlocked cloze levels up to the current level in normal mode', () => {
    expect(getAccessibleClozeLevels('C1', 'normal')).toEqual(['B1', 'B2', 'C1']);
  });

  it('locks cloze aditua mode to aditua content only', () => {
    expect(getAccessibleClozeLevels('Aditua', 'aditua')).toEqual(['Aditua']);
  });

  it('filters discourse levels to the current unlocked range', () => {
    expect(getAccessibleDiscourseLevels('C1', ['B1', 'B2', 'C1', 'C2'])).toEqual(['B1', 'B2', 'C1']);
  });
});
