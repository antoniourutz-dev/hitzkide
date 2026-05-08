import { APP_RELEASE_CHANNEL, APP_VERSION, OBSERVABILITY_SCHEMA_VERSION } from '../config/appMetadata';
import { getSupabaseClient } from '../lib/supabaseClient';
import { createClientId } from '../lib/id';

const OBSERVABILITY_STORAGE_KEY = 'hitzkideak_observability';
const OBSERVABILITY_REMOTE_SINK_STATE_KEY = 'hitzkideak_observability_remote_sink';
const INSTALLATION_STORAGE_KEY = 'hitzkideak_installation_id';
const MAX_EVENTS = 200;
const MAX_METRICS = 60;
const UNSUPPORTED_SINK_RETRY_DELAY_MS = 1000 * 60 * 30;

export type ObservabilitySeverity = 'info' | 'warning' | 'error';
export type ObservabilityCategory =
  | 'runtime'
  | 'sync'
  | 'supabase'
  | 'environment'
  | 'session'
  | 'content'
  | 'pwa';

export type LearningFeature = 'synonym' | 'cloze' | 'discourse';
export type LearningStage = 'requested' | 'started' | 'completed' | 'failed';

export interface ObservabilityEvent {
  id: string;
  name: string;
  category: ObservabilityCategory;
  severity: ObservabilitySeverity;
  createdAt: string;
  appVersion: string;
  releaseChannel: string;
  payload: Record<string, unknown>;
  flushedAt?: string;
}

export interface UsageMetric {
  key: string;
  feature: LearningFeature;
  mode: string;
  stage: LearningStage;
  count: number;
  lastSeenAt: string;
  lastPayload?: Record<string, unknown>;
}

interface ObservabilitySnapshot {
  schemaVersion: number;
  appVersion: string;
  events: ObservabilityEvent[];
  metrics: Record<string, UsageMetric>;
  lastFlushAt?: string;
}

interface RemoteSinkState {
  disabledUntil?: string;
  reason?: string;
  code?: string;
}

let isFlushing = false;
let remoteSinkUnsupported = false;

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createSnapshot(): ObservabilitySnapshot {
  return {
    schemaVersion: OBSERVABILITY_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    events: [],
    metrics: {},
  };
}

function readSnapshot(): ObservabilitySnapshot {
  const storage = getStorage();
  if (!storage) return createSnapshot();

  const rawValue = storage.getItem(OBSERVABILITY_STORAGE_KEY);
  if (!rawValue) return createSnapshot();

  try {
    const parsed = JSON.parse(rawValue) as Partial<ObservabilitySnapshot>;
    return {
      schemaVersion: OBSERVABILITY_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      events: Array.isArray(parsed.events) ? parsed.events : [],
      metrics: parsed.metrics && typeof parsed.metrics === 'object' ? parsed.metrics : {},
      lastFlushAt: parsed.lastFlushAt,
    };
  } catch {
    storage.removeItem(OBSERVABILITY_STORAGE_KEY);
    return createSnapshot();
  }
}

function writeSnapshot(snapshot: ObservabilitySnapshot): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(OBSERVABILITY_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore quota errors to avoid blocking the app.
  }
}

function createId(): string {
  return createClientId('event');
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeMessage = 'message' in error ? String(error.message) : JSON.stringify(error);
    const normalized = new Error(maybeMessage);
    if ('stack' in error && typeof error.stack === 'string') {
      normalized.stack = error.stack;
    }
    return normalized;
  }

  return new Error(String(error));
}

function buildMetricKey(feature: LearningFeature, mode: string, stage: LearningStage): string {
  return `${feature}:${mode}:${stage}`;
}

function getInstallationId(): string {
  const storage = getStorage();
  if (!storage) return 'unknown-installation';

  try {
    const existingInstallationId = storage.getItem(INSTALLATION_STORAGE_KEY);
    if (existingInstallationId) {
      return existingInstallationId;
    }

    const installationId = createId();
    storage.setItem(INSTALLATION_STORAGE_KEY, installationId);
    return installationId;
  } catch {
    return 'unknown-installation';
  }
}

function pruneMetrics(metrics: Record<string, UsageMetric>): Record<string, UsageMetric> {
  const entries = Object.entries(metrics);
  if (entries.length <= MAX_METRICS) {
    return metrics;
  }

  const trimmedEntries = entries
    .sort((left, right) => left[1].lastSeenAt.localeCompare(right[1].lastSeenAt))
    .slice(entries.length - MAX_METRICS);

  return Object.fromEntries(trimmedEntries);
}

function readRemoteSinkState(): RemoteSinkState {
  const storage = getStorage();
  if (!storage) return {};

  const rawValue = storage.getItem(OBSERVABILITY_REMOTE_SINK_STATE_KEY);
  if (!rawValue) return {};

  try {
    const parsed = JSON.parse(rawValue) as RemoteSinkState;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    storage.removeItem(OBSERVABILITY_REMOTE_SINK_STATE_KEY);
    return {};
  }
}

function writeRemoteSinkState(state: RemoteSinkState): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    if (!state.disabledUntil) {
      storage.removeItem(OBSERVABILITY_REMOTE_SINK_STATE_KEY);
      return;
    }

    storage.setItem(OBSERVABILITY_REMOTE_SINK_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore persistence failures.
  }
}

function isRemoteSinkTemporarilyDisabled(): boolean {
  const state = readRemoteSinkState();
  if (!state.disabledUntil) {
    remoteSinkUnsupported = false;
    return false;
  }

  const disabledUntilTime = new Date(state.disabledUntil).getTime();
  if (Number.isNaN(disabledUntilTime)) {
    writeRemoteSinkState({});
    remoteSinkUnsupported = false;
    return false;
  }

  if (disabledUntilTime <= Date.now()) {
    writeRemoteSinkState({});
    remoteSinkUnsupported = false;
    return false;
  }

  remoteSinkUnsupported = true;
  return true;
}

function suppressRemoteSink(reason: string, code?: string): void {
  remoteSinkUnsupported = true;
  writeRemoteSinkState({
    disabledUntil: new Date(Date.now() + UNSUPPORTED_SINK_RETRY_DELAY_MS).toISOString(),
    reason,
    code,
  });
}

function clearRemoteSinkSuppression(): void {
  remoteSinkUnsupported = false;
  writeRemoteSinkState({});
}

function isUnsupportedRemoteSinkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as {
    code?: string;
    message?: string;
    details?: string;
    status?: number;
  };

  const code = maybeError.code || '';
  const status = maybeError.status;
  const message = `${maybeError.message || ''} ${maybeError.details || ''}`.toLowerCase();

  return (
    code === '42P01' ||
    code === '42501' ||
    code === 'PGRST205' ||
    status === 404 ||
    message.includes('client_observability_events') ||
    message.includes('schema cache') ||
    message.includes('could not find the table')
  );
}

export const observabilityService = {
  getSnapshot(): ObservabilitySnapshot {
    return readSnapshot();
  },

  trackEvent(
    name: string,
    category: ObservabilityCategory,
    payload: Record<string, unknown> = {},
    severity: ObservabilitySeverity = 'info'
  ): void {
    const snapshot = readSnapshot();
    const event: ObservabilityEvent = {
      id: createId(),
      name,
      category,
      severity,
      createdAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      releaseChannel: APP_RELEASE_CHANNEL,
      payload,
    };

    snapshot.events = [...snapshot.events, event].slice(-MAX_EVENTS);
    snapshot.appVersion = APP_VERSION;
    snapshot.schemaVersion = OBSERVABILITY_SCHEMA_VERSION;
    writeSnapshot(snapshot);
  },

  captureError(
    name: string,
    category: ObservabilityCategory,
    error: unknown,
    payload: Record<string, unknown> = {}
  ): void {
    const normalizedError = normalizeError(error);
    this.trackEvent(
      name,
      category,
      {
        ...payload,
        message: normalizedError.message,
        stack: normalizedError.stack,
      },
      'error'
    );
  },

  trackFeatureUsage(
    feature: LearningFeature,
    mode: string,
    stage: LearningStage,
    payload: Record<string, unknown> = {}
  ): void {
    const snapshot = readSnapshot();
    const key = buildMetricKey(feature, mode, stage);
    const now = new Date().toISOString();
    const currentMetric = snapshot.metrics[key];

    snapshot.metrics[key] = {
      key,
      feature,
      mode,
      stage,
      count: currentMetric ? currentMetric.count + 1 : 1,
      lastSeenAt: now,
      lastPayload: payload,
    };
    snapshot.metrics = pruneMetrics(snapshot.metrics);

    writeSnapshot(snapshot);
    this.trackEvent(`${feature}.${mode}.${stage}`, 'session', payload, stage === 'failed' ? 'warning' : 'info');
  },

  trackSync(stage: 'started' | 'success' | 'error', payload: Record<string, unknown> = {}): void {
    const severity: ObservabilitySeverity = stage === 'error' ? 'error' : 'info';
    this.trackEvent(`sync.${stage}`, 'sync', payload, severity);
  },

  trackSupabase(name: string, payload: Record<string, unknown> = {}, severity: ObservabilitySeverity = 'warning'): void {
    this.trackEvent(name, 'supabase', payload, severity);
  },

  async flushEventsToSupabase(reason: string = 'manual'): Promise<boolean> {
    if (isFlushing || remoteSinkUnsupported || isRemoteSinkTemporarilyDisabled()) {
      return false;
    }

    const snapshot = readSnapshot();
    const pendingEvents = snapshot.events.filter((event) => !event.flushedAt).slice(0, 25);

    if (pendingEvents.length === 0) {
      return false;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    isFlushing = true;

    try {
      const { error } = await supabase
        .from('client_observability_events')
        .insert(pendingEvents.map((event) => ({
          user_id: user.id,
          installation_id: getInstallationId(),
          app_version: event.appVersion,
          event_name: event.name,
          category: event.category,
          severity: event.severity,
          payload: {
            ...event.payload,
            createdAt: event.createdAt,
            releaseChannel: event.releaseChannel,
            flushReason: reason,
          },
        })));

      if (error) {
        const code = (error as { code?: string }).code;
        const status = (error as { status?: number }).status;
        
        if (isUnsupportedRemoteSinkError(error) || status === 404 || code === 'PGRST204') {
          suppressRemoteSink('unsupported_remote_sink', code);
        }
        return false;
      }

      const flushedAt = new Date().toISOString();
      snapshot.events = snapshot.events.map((event) =>
        pendingEvents.some((pending) => pending.id === event.id)
          ? { ...event, flushedAt }
          : event
      );
      snapshot.lastFlushAt = flushedAt;
      writeSnapshot(snapshot);
      clearRemoteSinkSuppression();
      return true;
    } finally {
      isFlushing = false;
    }
  },
};
