/**
 * Expo replaces EXPO_PUBLIC_* at build time, so the bundle sees a plain
 * string. Declared here rather than pulling in @types/node, which would bring
 * a server's globals into an app that runs on a phone.
 */
declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    NODE_ENV?: 'development' | 'production' | 'test';
  };
};
