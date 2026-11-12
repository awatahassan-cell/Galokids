import { API_BASE_URL } from '@galokids/core';

/**
 * Where this build talks to.
 *
 * Read here, in the app's own source, and not in `@galokids/core`: Expo
 * inlines `EXPO_PUBLIC_*` at build time but skips node_modules, and npm
 * workspaces links the shared package into node_modules. Reading it there
 * compiles to `undefined` and falls through to the production default without
 * a word — so a staging build would quietly talk to the live shop.
 */
export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') || API_BASE_URL;
