import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface FeedbackContextType {
  toast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useToast must be used within FeedbackProvider');
  return ctx.toast;
};

export const useConfirm = () => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useConfirm must be used within FeedbackProvider');
  return ctx.confirm;
};

const toastStyles: Record<ToastType, { icon: any; ring: string; iconColor: string }> = {
  success: { icon: CheckCircle, ring: 'border-emerald-200', iconColor: 'text-emerald-500' },
  error: { icon: XCircle, ring: 'border-rose-200', iconColor: 'text-rose-500' },
  info: { icon: Info, ring: 'border-sky-200', iconColor: 'text-sky-500' },
};

export const FeedbackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{ options: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>(resolve => setConfirmState({ options, resolve }));
  }, []);

  const closeConfirm = (result: boolean) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toasts */}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => {
          const s = toastStyles[t.type];
          const Icon = s.icon;
          return (
            <div key={t.id}
              className={`pointer-events-auto flex items-center gap-3 bg-white border ${s.ring} shadow-lg rounded-2xl pl-4 pr-3 py-3 min-w-[260px] max-w-sm animate-[slideIn_0.25s_ease-out]`}
              style={{ animation: 'fbSlideIn 0.25s ease-out' }}>
              <Icon className={`w-5 h-5 shrink-0 ${s.iconColor}`} />
              <p className="text-sm font-semibold text-slate-800 flex-grow">{t.message}</p>
              <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                className="text-slate-300 hover:text-slate-500 p-1 shrink-0"><X className="w-4 h-4" /></button>
            </div>
          );
        })}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-[101] bg-black/50 flex items-center justify-center p-4" onClick={() => closeConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-[fbSlideIn_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmState.options.danger ? 'bg-rose-100 text-rose-500' : 'bg-indigo-100 text-indigo-500'}`}>
                <AlertTriangle className="w-7 h-7" />
              </div>
              {confirmState.options.title && (
                <h3 className="text-lg font-bold text-slate-900 mb-1">{confirmState.options.title}</h3>
              )}
              <p className="text-sm text-slate-600 whitespace-pre-line">{confirmState.options.message}</p>
            </div>
            <div className="flex gap-3 p-4 bg-slate-50 border-t border-slate-100">
              <button onClick={() => closeConfirm(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors">
                {confirmState.options.cancelText || 'Cancel'}
              </button>
              <button onClick={() => closeConfirm(true)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-white transition-colors ${confirmState.options.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {confirmState.options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes fbSlideIn { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
    </FeedbackContext.Provider>
  );
};
