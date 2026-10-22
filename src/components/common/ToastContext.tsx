import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, Info, WifiOff, Wifi, RefreshCw, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'info' | 'error' | 'offline' | 'online' | 'sync';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => string;
  dismissToast: (id: string) => void;
  success: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = 'toast-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
      const newToast: ToastMessage = {
        ...toast,
        id,
        duration: toast.duration ?? (toast.type === 'offline' ? 6000 : 4500),
      };

      setToasts((prev) => {
        // Prevent stacking duplicate offline or online toasts
        if (toast.type === 'offline' || toast.type === 'online') {
          const filtered = prev.filter((t) => t.type !== toast.type);
          return [...filtered, newToast];
        }
        return [...prev.slice(-4), newToast]; // Keep at most 5 toasts visible
      });

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, newToast.duration);
      }

      return id;
    },
    [dismissToast]
  );

  const success = useCallback(
    (title: string, description?: string) => showToast({ type: 'success', title, description }),
    [showToast]
  );

  const warning = useCallback(
    (title: string, description?: string) => showToast({ type: 'warning', title, description }),
    [showToast]
  );

  const info = useCallback(
    (title: string, description?: string) => showToast({ type: 'info', title, description }),
    [showToast]
  );

  const error = useCallback(
    (title: string, description?: string) => showToast({ type: 'error', title, description }),
    [showToast]
  );

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'offline':
        return <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'online':
        return <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'sync':
        return <RefreshCw className="w-4 h-4 text-cyan-400 shrink-0 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-cyan-400 shrink-0" />;
    }
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'offline':
        return 'bg-[#181308] border-amber-500/40 text-amber-200 shadow-amber-950/40';
      case 'online':
        return 'bg-[#0A1A14] border-emerald-500/40 text-emerald-200 shadow-emerald-950/40';
      case 'sync':
        return 'bg-[#0B1728] border-cyan-500/40 text-cyan-200 shadow-cyan-950/40';
      case 'success':
        return 'bg-[#0A1A14] border-emerald-500/40 text-emerald-200 shadow-emerald-950/40';
      case 'warning':
        return 'bg-[#181308] border-amber-500/40 text-amber-200 shadow-amber-950/40';
      case 'error':
        return 'bg-[#1F0A10] border-rose-500/40 text-rose-200 shadow-rose-950/40';
      case 'info':
      default:
        return 'bg-[#0E1526] border-cyan-500/40 text-cyan-200 shadow-slate-950/50';
    }
  };

  const contextValue = useMemo(
    () => ({
      toasts,
      showToast,
      dismissToast,
      success,
      warning,
      info,
      error,
    }),
    [toasts, showToast, dismissToast, success, warning, info, error]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Floating Toast Container */}
      <aside
        aria-label="Notifications"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-slide-up ${getToastStyles(
              toast.type
            )}`}
          >
            <div className="pt-0.5">{getToastIcon(toast.type)}</div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="text-xs font-semibold tracking-wide text-white font-['Plus_Jakarta_Sans']">
                {toast.title}
              </div>
              {toast.description && (
                <div className="text-[11px] text-slate-300/90 mt-0.5 leading-relaxed font-sans">
                  {toast.description}
                </div>
              )}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 shrink-0 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </aside>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
