import { Alert as NativeAlert } from 'react-native';

/**
 * Telling the person something, or asking them to confirm it.
 *
 * On a phone this is React Native's own `Alert`. It exists as a module of its
 * own because of the browser: see `alert.web.ts`.
 */
export const Alert = NativeAlert;
