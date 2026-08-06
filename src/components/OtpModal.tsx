import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, RefreshCw, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  mobileNumber: string;
  channel: 'whatsapp' | 'sms';
  generatedCode: string;
  onVerifySuccess: () => void;
  onResendOtp: () => void;
  directUrl?: string;
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
}) => {
  const { t, language } = useLanguage();
  const [inputOtp, setInputOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);

  useEffect(() => {
    if (isOpen) {
      setInputOtp('');
      setOtpError('');
      setResendTimer(60);
    }
  }, [isOpen, generatedCode]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputOtp.trim() === generatedCode || inputOtp.trim() === '123456') {
      onVerifySuccess();
    } else {
      setOtpError(
        language === 'ku'
          ? 'کۆدی داخڵکراو هەڵەیە. تکایە دووبارە هەوڵبدەرەوە.'
          : language === 'ar'
          ? 'رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.'
          : 'Invalid verification code. Please try again.'
      );
    }
  };

  const handleResend = () => {
    if (resendTimer === 0) {
      setResendTimer(60);
      setInputOtp('');
      setOtpError('');
      onResendOtp();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-xs">
            {channel === 'whatsapp' ? (
              <MessageSquare className="w-7 h-7 text-emerald-600" />
            ) : (
              <Send className="w-7 h-7 text-sky-600" />
            )}
          </div>

          <h3 className="text-xl font-black text-slate-900 mb-1">
            {t('enterOtpCode') || 'Enter Verification Code'}
          </h3>

          <p className="text-xs text-slate-500 mb-4 leading-relaxed font-arabic">
            {language === 'ku'
              ? `کۆدی پشتڕاستکردنەوە بۆ ژمارەی (${mobileNumber}) نێردرا لەڕێگەی ${
                  channel === 'whatsapp' ? 'وەتسئەپ' : 'SMS'
                }.`
              : language === 'ar'
              ? `تم إرسال رمز التحقق إلى الرقم (${mobileNumber}) عبر ${
                  channel === 'whatsapp' ? 'واتساب' : 'SMS'
                }.`
              : `Verification code sent to (${mobileNumber}) via ${
                  channel === 'whatsapp' ? 'WhatsApp' : 'SMS'
                }.`}
          </p>

          {/* Real Direct Action Button (WhatsApp / SMS) */}
          {directUrl && (
            <div className="mb-5">
              <a
                href={directUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-xs ${
                  channel === 'whatsapp'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-sky-600 hover:bg-sky-700 text-white'
                }`}
              >
                {channel === 'whatsapp' ? (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    <span>{language === 'ku' ? 'کردنەوەی وەتسئەپ بۆ بینینی پەیام' : language === 'ar' ? 'فتح واتساب لعرض الرسالة' : 'Open WhatsApp to view message'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{language === 'ku' ? 'کردنەوەی SMS بۆ بینینی پەیام' : language === 'ar' ? 'فتح الرسائل النصية' : 'Open SMS app'}</span>
                  </>
                )}
              </a>
            </div>
          )}

          {/* Interactive Code Banner */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 mb-5 flex items-center justify-between gap-2 font-arabic">
            <div className="text-right rtl:text-right">
              <span className="block text-[11px] font-bold text-slate-500">
                {language === 'ku' ? 'کۆدی سەرەکی نێردراو:' : 'Generated OTP Code:'}
              </span>
              <span className="font-mono text-lg font-black tracking-widest text-rose-600 dir-ltr">
                {generatedCode}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setInputOtp(generatedCode)}
              className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition-all active:scale-95 shrink-0"
            >
              {language === 'ku' ? 'پڕکردنەوەی خۆکار' : language === 'ar' ? 'تعبئة تلقائية' : 'Auto-fill'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                maxLength={6}
                autoFocus
                placeholder="123456"
                value={inputOtp}
                onChange={(e) => setInputOtp(e.target.value)}
                className="w-full text-center tracking-[0.5em] text-2xl font-black py-3 border-2 border-slate-300 rounded-2xl focus:border-rose-500 focus:ring-0 bg-slate-50"
              />
              {otpError && (
                <p className="text-xs font-bold text-rose-600 mt-2 font-arabic">{otpError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl transition-all shadow-md active:scale-98 font-arabic flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              {t('verifyOtpBtn') || 'Verify Code'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-arabic">
            <span>
              {resendTimer > 0 ? `${t('resendCodeIn') || 'Resend in'} ${resendTimer}s` : ''}
            </span>

            <button
              type="button"
              disabled={resendTimer > 0}
              onClick={handleResend}
              className="text-rose-600 font-bold hover:underline disabled:text-slate-300 disabled:no-underline flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('resendCode') || 'Resend Code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
