export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev';
export const APP_BUILD_ID = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'local';
export const APP_RELEASE_CHANNEL = import.meta.env.DEV ? 'development' : 'production';
export const OBSERVABILITY_SCHEMA_VERSION = 1;
