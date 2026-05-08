import { describe, expect, it } from 'vitest';
import { getConceptLabel, humanizeInternalCode } from '../../utils/labels';

describe('labels', () => {
  it('humanizes internal concept codes for product-facing UI', () => {
    expect(getConceptLabel('salneurria_eta_prezioa')).toBe('Salneurria eta prezioa');
    expect(getConceptLabel('sarekada_edo_operazio_antolatua')).toBe('Sarekada edo operazio antolatua');
  });

  it('preserves already readable labels without forcing them to lowercase', () => {
    expect(getConceptLabel('Azkar')).toBe('Azkar');
    expect(humanizeInternalCode('Polita')).toBe('Polita');
  });
});
