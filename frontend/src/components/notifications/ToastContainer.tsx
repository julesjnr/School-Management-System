import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastItem } from './types';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const toastStyles = {
  success: {
    bg: 'bg-emerald-900/90 dark:bg-emerald-950/95 border-emerald-500/30 text-emerald-100',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
    bar: 'bg-emerald-500',
  },
  error: {
    bg: 'bg-rose-900/90 dark:bg-rose-950/95 border-rose-500/30 text-rose-100',
    icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
    bar: 'bg-rose-500',
  },
  warning: {
    bg: 'bg-amber-900/90 dark:bg-amber-950/95 border-amber-500/30 text-amber-100',
    icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
    bar: 'bg-amber-500',
  },
  info: {
    bg: 'bg-indigo-900/90 dark:bg-indigo-950/95 border-indigo-500/30 text-indigo-100',
    icon: <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />,
    bar: 'bg-indigo-500',
  },
};

const ToastCard: React.FC<{ toast: ToastItem; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const duration = toast.duration || 4000;
  const style = toastStyles[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: 20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`relative overflow-hidden w-full max-w-sm rounded-xl border backdrop-blur-md shadow-2xl p-4 flex gap-3 items-start ${style.bg}`}
      role="alert"
      aria-live="polite"
    >
      {style.icon}

      <div className="flex-1 min-w-0 pr-2">
        {toast.title && (
          <h5 className="font-semibold text-sm tracking-tight mb-0.5 leading-snug">
            {toast.title}
          </h5>
        )}
        <p className="text-xs text-slate-200 leading-relaxed font-normal break-words">
          {toast.message}
        </p>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10 shrink-0"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Auto-dismiss timer progress bar */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-0.5 ${style.bar} opacity-60`}
      />
    </motion.div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastCard toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
