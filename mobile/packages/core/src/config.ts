/**
 * Defaults. The app that uses this package decides the rest.
 *
 * `EXPO_PUBLIC_API_URL` is deliberately NOT read here, and this is the one
 * thing in the package worth reading twice.
 *
 * Expo inlines `EXPO_PUBLIC_*` at build time, but skips files under
 * node_modules — and npm workspaces links this package into node_modules, so
 * from the bundler's point of view that is exactly where it lives. Reading the
 * variable here therefore compiles to `undefined` and falls through to the
 * literal below, silently: a build made for staging would talk to production
 * and nothing would say so.
 *
 * So each app reads it in its own code, which is not in node_modules, and
 * hands the result to `configureApi`. See `useSession` / `useAccount`.
 */
export const API_BASE_URL = 'https://galo.prodental.dev/API/api';

/** The till's own name, printed on receipts and used for invoice numbers. */
export const DEVICE_ID_KEY = 'galokids.device_id';

/** Where each app keeps its token. */
export const AUTH_TOKEN_KEY = 'galokids.auth_token';
export const AUTH_USER_KEY = 'galokids.auth_user';
