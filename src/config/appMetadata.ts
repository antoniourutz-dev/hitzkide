export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev';
export const APP_RELEASE_CHANNEL = import.meta.env.DEV ? 'development' : 'production';
export const OBSERVABILITY_SCHEMA_VERSION = 1;
