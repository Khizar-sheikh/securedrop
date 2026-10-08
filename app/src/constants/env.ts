export interface AppEnv {
  /** Base URL of the SecureDrop API. */
  apiBaseUrl: string;
  /** True when running in a development build / Expo Go. */
  dev: boolean;
}

const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const env: AppEnv = {
  apiBaseUrl: rawApiBaseUrl.replace(/\/+$/, ''),
  dev: __DEV__,
};
