import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  PhoneAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Helper to format phone numbers into E.164 (e.g., +964750XXXXXXX)
export function formatIraqiPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.slice(2);
  }
  if (cleaned.startsWith('0')) {
    return '+964' + cleaned.slice(1);
  }
  if (cleaned.startsWith('964')) {
    return '+' + cleaned;
  }
  return '+964' + cleaned;
}

// Setup Recaptcha Verifier
export function setupRecaptcha(elementId: string): RecaptchaVerifier {
  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch (e) {
      console.warn('Error clearing recaptcha verifier', e);
    }
  }

  const verifier = new RecaptchaVerifier(auth, elementId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved, allow signInWithPhoneNumber.
    },
    'expired-callback': () => {
      // Response expired. Ask user to solve reCAPTCHA again.
    }
  });

  (window as any).recaptchaVerifier = verifier;
  return verifier;
}

// Send OTP via Firebase Auth
export async function sendFirebasePhoneOtp(phone: string, recaptchaContainerId: string): Promise<ConfirmationResult> {
  const formattedPhone = formatIraqiPhoneNumber(phone);
  const recaptchaVerifier = setupRecaptcha(recaptchaContainerId);
  const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
  return confirmationResult;
}
