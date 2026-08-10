import { apiFetch } from '../config/api';
import { formatIraqiPhone } from '../utils/phone';

export { formatIraqiPhone };

export interface OtpResponse {
  success: boolean;
  code?: string;
  directUrl?: string;
  message?: string;
}

export interface OtpVerifyResult {
  success: boolean;
  message?: string;
  /**
   * Single-use proof, issued by the backend, that this phone number was just
   * verified. `loginWithPhone` must send it back — without it the server
   * refuses to open a session, so nobody can sign in as a number they don't own.
   */
  verificationToken?: string;
}
// Local session cache as fallback if server is offline during dev
const activeSessions: Record<string, { code: string; expiresAt: number }> = {};

/**
 * Verification tokens for numbers verified during this page session.
 *
 * Kept in memory only (never localStorage): they are short-lived proofs of a
 * just-completed OTP check, and the checkout has several code paths that log
 * the customer in a step or two after the modal closes.
 */
const verifiedPhones: Record<string, { token: string; expiresAt: number }> = {};

export const rememberPhoneVerification = (rawPhone: string, token?: string): void => {
  if (!token) return;
  verifiedPhones[formatIraqiPhone(rawPhone)] = {
    token,
    // The server keeps the token for 10 minutes; expire a little earlier.
    expiresAt: Date.now() + 9 * 60 * 1000,
  };
};

/** Returns (and forgets) the token for a number — tokens are single use. */
export const takePhoneVerification = (rawPhone: string): string | undefined => {
  const key = formatIraqiPhone(rawPhone);
  const entry = verifiedPhones[key];
  if (!entry) return undefined;
  delete verifiedPhones[key];
  return Date.now() > entry.expiresAt ? undefined : entry.token;
};

/**
 * Sends OTP request to Laravel Backend (/send-otp) to deliver SMS to customer's mobile
 */
export const sendCheckoutOtp = async (
  rawPhone: string,
  channel: 'whatsapp' | 'sms' = 'sms',
  language: string = 'ku'
): Promise<OtpResponse> => {
  const safeRawPhone = typeof rawPhone === 'string' ? rawPhone : String(rawPhone || '');
  const safeChannel: 'whatsapp' | 'sms' = typeof channel === 'string' && channel === 'whatsapp' ? 'whatsapp' : 'sms';
  const safeLang = typeof language === 'string' ? language : 'ku';

  const formattedPhone = formatIraqiPhone(safeRawPhone);
  const localCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Cache fallback code locally
  activeSessions[formattedPhone] = {
    code: localCode,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };

  try {
    const res = await apiFetch('send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: formattedPhone, channel: safeChannel, raw_phone: safeRawPhone }),
    });

    const data = await res.json().catch(() => ({} as any));

    if (res.ok) {
      return {
        success: true,
        message: data.message || (safeLang === 'ku' ? 'کۆدەکە بۆ مۆبایلەکەت نێردرا' : 'OTP sent to your phone'),
      };
    }

    // The server answered and refused (invalid number, or the resend cooldown
    // is still running). Report that instead of quietly generating a local code
    // the server would never accept.
    return {
      success: false,
      message: data.message || (safeLang === 'ku'
        ? 'ناردنی کۆد سەرکەوتوو نەبوو. تکایە دواتر هەوڵ بدەرەوە.'
        : safeLang === 'ar'
        ? 'تعذر إرسال الرمز. يرجى المحاولة لاحقاً.'
        : 'Could not send the code. Please try again shortly.'),
    };
  } catch (err) {
    console.warn('Backend /send-otp request note:', err);
  }

  // Direct channel link fallback if Laravel API is not reachable
  const messageText =
    safeLang === 'ku'
      ? `کۆدی پشتڕاستکردنەوەی ژمارەی مۆبایلەکەت بۆ داواکاری: [ ${localCode} ]`
      : safeLang === 'ar'
      ? `رمز التحقق الخاص بك لطلبك هو: [ ${localCode} ]`
      : `Your order verification code is: [ ${localCode} ]`;

  let directUrl = '';
  if (safeChannel === 'whatsapp') {
    directUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
  } else {
    directUrl = `sms:${formattedPhone}?body=${encodeURIComponent(messageText)}`;
  }

  return {
    success: true,
    code: localCode,
    directUrl,
    message: safeLang === 'ku' ? 'کۆدەکە ئامادەکرا' : 'OTP Code sent',
  };
};

/**
 * Verifies submitted OTP code with Laravel Backend (/verify-otp)
 */
export const verifyCheckoutOtp = async (
  rawPhone: string,
  submittedCode: string
): Promise<OtpVerifyResult> => {
  const safeRawPhone = typeof rawPhone === 'string' ? rawPhone : String(rawPhone || '');
  const safeSubmittedCode = typeof submittedCode === 'string' ? submittedCode : String(submittedCode || '');

  const formattedPhone = formatIraqiPhone(safeRawPhone);
  const cleanCode = safeSubmittedCode.trim();

  try {
    const res = await apiFetch('verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: formattedPhone, code: cleanCode, raw_phone: safeRawPhone }),
    });

    const data = await res.json().catch(() => ({} as any));

    if (res.ok && (data.success || data.verified)) {
      delete activeSessions[formattedPhone];
      return { success: true, verificationToken: data.verification_token };
    }

    // A 4xx from the server is a definitive answer (wrong/expired code) —
    // don't fall through to the offline path and accept the code anyway.
    return {
      success: false,
      message: data.message || 'کۆدی داخڵکراو هەڵەیە. تکایە دووبارە تاقیبکەرەوە.',
    };
  } catch (err) {
    console.warn('Backend /verify-otp request note:', err);
  }

  // Offline fallback: only reached when the API is unreachable. It can confirm
  // the code the browser generated locally, but it cannot produce a
  // verification token, so the server will still refuse to open a session.
  const session = activeSessions[formattedPhone];
  if (session) {
    if (Date.now() > session.expiresAt) {
      return {
        success: false,
        message: 'کۆدەکە بەسەرچووە. تکایە دووبارە کۆد داوا بکەرەوە.',
      };
    }
    if (session.code === cleanCode) {
      delete activeSessions[formattedPhone];
      return { success: true };
    }
  }

  return {
    success: false,
    message: 'کۆدی داخڵکراو هەڵەیە. تکایە دووبارە تاقیبکەرەوە.',
  };
};
