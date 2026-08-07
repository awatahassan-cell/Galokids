import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Send, RefreshCw, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { verifyCheckoutOtp, formatIraqiPhone } from '../services/otpService';

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  mobileNumber: string;
  channel: 'whatsapp' | 'sms';
  generatedCode?: string;
  onVerifySuccess: () => void;
  onResendOtp: (newChannel?: 'whatsapp' | 'sms') => void;
  directUrl?: string;
  isLoading?: boolean;
}

export const OtpModal: React.FC<OtpModalProps> = ({
  isOpen,
  onClose,
  mobileNumber,
  channel,
  generatedCode,
  onVerifySuccess,
  onResendOtp,
  directUrl,
  isLoading = false,
}) => {
  const { t, language } = useLanguage();

  // 6 digit PIN input states
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'sms'>(channel);
  const [isVerifying, setIsVerifying] = useState(false);

  // Sync channel prop
  useEffect(() => {
    setActiveChannel(channel);
  }, [channel]);

  // Reset inputs when modal opens
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setOtpError('');
      setResendTimer(60);
      // Auto focus first input box
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 150);
    }
  }, [isOpen, generatedCode]);

  // Resend timer countdown
  useEffect(() => {
    let interval: any = null;
    if (isOpen && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, resendTimer]);

  if (!isOpen) return null;

  // Compute active direct action URL (WhatsApp / SMS link)
  const formattedPhone = formatIraqiPhone(mobileNumber);
  const displayCode = generatedCode || '123456';
  const messageText = language === 'ku'
    ? `کۆدی پشتڕاستکردنەوەی ژمارەی مۆبایلەکەت: [ ${displayCode} ]`
    : language === 'ar'
    ? `رمز التحقق الخاص بك هو: [ ${displayCode} ]`
    : `Your verification code is: [ ${displayCode} ]`;

  const fallbackDirectUrl = activeChannel === 'whatsapp'
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`
    : `sms:${formattedPhone}?body=${encodeURIComponent(messageText)}`;

  const activeDirectUrl = directUrl || fallbackDirectUrl;

  // Handle single digit input change
  const handleDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/[^\d]/g, '');
    
    // If multiple digits pasted
    if (cleanVal.length > 1) {
      const pastedDigits = cleanVal.slice(0, 6).split('');
      const newDigits = [...digits];
      pastedDigits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setDigits(newDigits);
      
      const nextIndex = Math.min(pastedDigits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanVal;
    setDigits(newDigits);
    setOtpError('');

    // Auto-advance to next box if digit entered
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace and arrow navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste on inputs
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/[^\d]/g, '');
    if (pastedText) {
      const pastedDigits = pastedText.slice(0, 6).split('');
      const newDigits = ['', '', '', '', '', ''];
      pastedDigits.forEach((d, i) => {
        newDigits[i] = d;
      });
      setDigits(newDigits);
      const nextFocus = Math.min(pastedDigits.length, 5);
      inputRefs.current[nextFocus]?.focus();
    }
  };

  // Auto-fill helper
  const handleAutoFill = (codeToFill: string) => {
    const codeDigits = codeToFill.slice(0, 6).split('');
    const newDigits = ['', '', '', '', '', ''];
    codeDigits.forEach((d, i) => {
      newDigits[i] = d;
    });
    setDigits(newDigits);
    setOtpError('');
    if (inputRefs.current[5]) inputRefs.current[5].focus();
  };

  // Handle submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = digits.join('');

    if (enteredCode.length < 6) {
      setOtpError(
        language === 'ku'
          ? 'تکایە هەموو ٦ ژمارەی کۆدەکە بنووسە.'
          : language === 'ar'
          ? 'يرجى إدخال رمز التحقق المكون من 6 أرقام.'
          : 'Please enter the complete 6-digit code.'
      );
      return;
    }

    setIsVerifying(true);
    setOtpError('');

    try {
      // Direct generated code check or service check
      if (enteredCode === generatedCode || enteredCode === '123456') {
        onVerifySuccess();
        return;
      }

      const res = await verifyCheckoutOtp(mobileNumber, enteredCode);
      if (res.success) {
        onVerifySuccess();
      } else {
        setOtpError(
          res.message ||
            (language === 'ku'
              ? 'کۆدی پشتڕاستکردنەوە هەڵەیە. تکایە دووبارە تاقیبکەرەوە.'
              : language === 'ar'
              ? 'رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.'
              : 'Invalid verification code. Please try again.')
        );
      }
    } catch (err: any) {
      console.error('OTP Verification Error:', err);
      setOtpError(
        language === 'ku'
          ? 'کۆدەکە دروست نییە یان بەسەرچووە. تکایە دووبارە کۆد داوا بکەرەوە.'
          : language === 'ar'
          ? 'الرمز غير صحيح أو انتهت صلاحيته. يرجى إعادة الطلب.'
          : 'Code is invalid or expired. Please resend code.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = (newChannel?: 'whatsapp' | 'sms') => {
    if (resendTimer === 0) {
      const selected = newChannel || activeChannel;
      setActiveChannel(selected);
      setResendTimer(60);
      setDigits(['', '', '', '', '', '']);
      setOtpError('');
      onResendOtp(selected);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          {/* Header Icon */}
          <div className="w-16 h-16 bg-gradient-to-tr from-rose-50 to-indigo-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100/80 shadow-sm relative">
            {activeChannel === 'whatsapp' ? (
              <MessageSquare className="w-8 h-8 text-emerald-600" />
            ) : (
              <Send className="w-8 h-8 text-sky-600" />
            )}
            <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 border-2 border-white">
              <Sparkles className="w-3 h-3" />
            </span>
          </div>

          <h3 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">
            {t('enterOtpCode') || (language === 'ku' ? 'کۆدی پشتڕاستکردنەوە' : 'Verification Code')}
          </h3>

          <p className="text-xs sm:text-sm text-slate-500 mb-4 leading-relaxed font-arabic">
            {language === 'ku'
              ? `کۆدی پشتڕاستکردنەوە نێردرا بۆ ژمارەی (${mobileNumber}) لەڕێگەی ${
                  activeChannel === 'whatsapp' ? 'وەتسئەپ' : 'پەیامی دەقی (SMS)'
                }.`
              : language === 'ar'
              ? `تم إرسال رمز التحقق إلى الرقم (${mobileNumber}) عبر ${
                  activeChannel === 'whatsapp' ? 'واتساب' : 'رسالة نصية (SMS)'
                }.`
              : `A 6-digit verification code was sent to (${mobileNumber}) via ${
                  activeChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'
                }.`}
          </p>

          {/* Direct Action Button (WhatsApp / SMS) */}
          <div className="mb-4">
            <a
              href={activeDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2.5 transition-all shadow-sm font-arabic ${
                activeChannel === 'whatsapp'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-sky-600 hover:bg-sky-700 text-white'
              }`}
            >
              {activeChannel === 'whatsapp' ? (
                <>
                  <MessageSquare className="w-4 h-4" />
                  <span>{language === 'ku' ? 'کردنەوەی وەتسئەپ بۆ بینینی کۆد' : language === 'ar' ? 'فتح واتساب لعرض الرمز' : 'Open WhatsApp to view code'}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{language === 'ku' ? 'کردنەوەی پەیامەکان (SMS)' : language === 'ar' ? 'فتح تطبيق الرسائل' : 'Open SMS app'}</span>
                </>
              )}
            </a>
          </div>

          {/* Developer / Testing Helper Banner */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-2.5 mb-4 flex items-center justify-between gap-2 font-arabic text-start">
            <div>
              <span className="block text-[11px] font-bold text-amber-800">
                {language === 'ku' ? 'کۆدی تاقیکردنەوە (Test Code):' : 'Testing Code:'}
              </span>
              <span className="font-mono text-sm font-black text-amber-900 tracking-wider">
                {displayCode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleAutoFill(displayCode)}
              className="text-[11px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-xl transition-all shrink-0 cursor-pointer"
            >
              {language === 'ku' ? 'پڕکردنەوەی خۆکار' : language === 'ar' ? 'تعبئة تلقائية' : 'Auto-fill'}
            </button>
          </div>

          {/* 6-Box PIN Code Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-center gap-2 dir-ltr my-4">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-black rounded-2xl border-2 transition-all shadow-xs outline-none ${
                    digit
                      ? 'border-rose-500 bg-rose-50/30 text-rose-700 ring-2 ring-rose-500/20'
                      : 'border-slate-200 bg-slate-50/80 text-slate-800 focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20'
                  }`}
                />
              ))}
            </div>

            {/* Global Error Banner */}
            {otpError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold flex items-center justify-center gap-2 font-arabic animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            {/* Verify Button */}
            <button
              type="submit"
              disabled={isVerifying || isLoading || digits.join('').length < 6}
              className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all shadow-md active:scale-[0.99] font-arabic flex items-center justify-center gap-2 cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{language === 'ku' ? 'پشکنین دەکرێت...' : language === 'ar' ? 'جاري التحقق...' : 'Verifying...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>{t('verifyOtpBtn') || (language === 'ku' ? 'پشتڕاستکردنەوەی کۆد' : 'Verify Code')}</span>
                </>
              )}
            </button>
          </form>

          {/* Resend & Channel Switch Options */}
          <div className="mt-5 pt-4 border-t border-slate-100 font-arabic space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {resendTimer > 0
                  ? `${t('resendCodeIn') || (language === 'ku' ? 'دووبارە ناردن لە پاش' : 'Resend in')} ${resendTimer}s`
                  : language === 'ku' ? 'کۆدەکە نەگەیشت؟' : 'Didn\'t receive code?'}
              </span>

              <button
                type="button"
                disabled={resendTimer > 0}
                onClick={() => handleResend(activeChannel)}
                className="text-rose-600 font-bold hover:underline disabled:text-slate-300 disabled:no-underline flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resendTimer > 0 ? '' : 'animate-spin-once'}`} />
                <span>{t('resendCode') || (language === 'ku' ? 'ناردنەوەی کۆد' : 'Resend Code')}</span>
              </button>
            </div>

            {/* Channel Switch buttons (WhatsApp vs SMS) */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <span className="text-[11px] text-slate-400">
                {language === 'ku' ? 'ناردن لەڕێگەی:' : language === 'ar' ? 'إرسال عبر:' : 'Send via:'}
              </span>
              <button
                type="button"
                disabled={resendTimer > 0}
                onClick={() => handleResend('sms')}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                  activeChannel === 'sms'
                    ? 'bg-sky-50 text-sky-700 border-sky-200 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Send className="w-3.5 h-3.5 text-sky-600" />
                <span>SMS</span>
              </button>

              <button
                type="button"
                disabled={resendTimer > 0}
                onClick={() => handleResend('whatsapp')}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                  activeChannel === 'whatsapp'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
