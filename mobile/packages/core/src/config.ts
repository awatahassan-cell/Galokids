/**
 * Where the API lives.
 *
 * EXPO_PUBLIC_ is how Expo exposes a value to the bundle, so a build pointed
 * at a staging server needs no code change. Without one, the production API.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') ||
  'https://galo.prodental.dev/API/api';

/** The till's own name, printed on receipts and used for invoice numbers. */
export const DEVICE_ID_KEY = 'galokids.device_id';

/** Where each app keeps its token. */
export const AUTH_TOKEN_KEY = 'galokids.auth_token';
export const AUTH_USER_KEY = 'galokids.auth_user';
