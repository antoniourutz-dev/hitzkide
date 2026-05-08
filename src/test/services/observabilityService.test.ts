import { afterEach, describe, expect, it } from 'vitest';
import { observabilityService } from '../../analytics/observabilityService';

describe('observabilityService', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('tracks usage metrics by feature, mode and stage', () => {
    observabilityService.trackFeatureUsage('synonym', 'main', 'started', { generatedCount: 5 });
    observabilityService.trackFeatureUsage('synonym', 'main', 'started', { generatedCount: 10 });

    const snapshot = observabilityService.getSnapshot();
    const metric = snapshot.metrics['synonym:main:started'];

    expect(metric).toBeDefined();
    expect(metric?.count).toBe(2);
    expect(metric?.lastPayload).toEqual({ generatedCount: 10 });
  });

  it('captures runtime errors with metadata', () => {
    observabilityService.captureError('runtime.test_failure', 'runtime', new Error('boom'), {
      route: '/test',
    });

    const snapshot = observabilityService.getSnapshot();
    const errorEvent = snapshot.events.at(-1);

    expect(errorEvent?.name).toBe('runtime.test_failure');
    expect(errorEvent?.severity).toBe('error');
    expect(errorEvent?.payload.message).toBe('boom');
    expect(errorEvent?.payload.route).toBe('/test');
  });
});
