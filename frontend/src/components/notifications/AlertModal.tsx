import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { AlertOptions } from './types';

interface AlertModalProps {
  options: AlertOptions | null;
  onClose: () => void;
}

const typeStyles = {
  success: {
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
    icon: <CheckCircle2 className="w-8 h-8" />,
    btn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 focus:ring-emerald-500',
    headerTitle: 'Success',
  },
  error: {
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    iconBg: 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 ring-rose-500/20',
    icon: <AlertCircle className="w-8 h-8" />,
    btn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 focus:ring-rose-500',
    headerTitle: 'Error Encountered',
  },
  warning: {
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    iconBg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 ring-amber-500/20',
    icon: <AlertTriangle className="w-8 h-8" />,
    btn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 focus:ring-amber-500',
    headerTitle: 'Attention Required',
  },
  info: {
    badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    iconBg: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20',
    icon: <Info className="w-8 h-8" />,
    btn: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 focus:ring-indigo-500',
    headerTitle: 'Notice',
  },
};

export const AlertModal: React.FC<AlertModalProps> = ({ options, onClose }) => {
  useEffect(() => {
    if (!options) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, onClose]);

  if (!options) return null;

  const modalType = options.type || 'info';
  const style = typeStyles[modalType];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10"
        >
          {/* Top border highlight line */}
          <div className={`h-1.5 w-full ${style.btn}`} />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className={`p-3 rounded-2xl ring-4 shrink-0 ${style.iconBg}`}>
              {style.icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.badge}`}>
                  {style.headerTitle}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                {options.title}
              </h3>

              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line">
                {options.message}
              </p>

              {options.details && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto break-all">
                  {options.details}
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              autoFocus
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${style.btn}`}
            >
              {options.confirmText || 'Acknowledge'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
