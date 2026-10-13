import { Platform } from 'react-native';

const DEV_SERVER_PORT = 8080;

/**
 * Where the ITER backend lives.
 * - Set EXPO_PUBLIC_API_URL to point somewhere specific.
 * - In development on the web, the backend is assumed to run on the same machine as the app,
 *   so a phone on the same Wi-Fi reaches the laptop's backend automatically.
 * - In production the app and the API are served from the same address, so the base is empty.
 */
function resolveApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (!__DEV__) return '';
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${DEV_SERVER_PORT}`;
  }
  return `http://localhost:${DEV_SERVER_PORT}`;
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
  appVersion: '0.1.0',
} as const;
