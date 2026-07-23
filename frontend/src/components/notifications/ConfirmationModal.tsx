import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, HelpCircle, ShieldAlert, X } from 'lucide-react';
import { ConfirmOptions } from './types';

interface ConfirmationModalProps {
  options: ConfirmOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantStyles = {
  danger: {
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    iconBg: 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 ring-rose-500/20',
    icon: <Trash2 className="w-8 h-8" />,
    confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 focus:ring-rose-500',
    defaultConfirmText: 'Delete Permanently',
  },
  warning: {
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    iconBg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 ring-amber-500/20',
    icon: <ShieldAlert className="w-8 h-8" />,
    confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 focus:ring-amber-500',
    defaultConfirmText: 'Proceed Anyway',
  },
  info: {
    badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    iconBg: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20',
    icon: <HelpCircle className="w-8 h-8" />,
    confirmBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 focus:ring-indigo-500',
    defaultConfirmText: 'Confirm',
  },
  primary: {
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    iconBg: 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 ring-blue-500/20',
    icon: <AlertTriangle className="w-8 h-8" />,
    confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 focus:ring-blue-500',
    defaultConfirmText: 'Confirm Action',
  },
};

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ options, onConfirm, onCancel }) => {
  useEffect(() => {
    if (!options) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, onConfirm, onCancel]);

  if (!options) return null;

  const variant = options.variant || 'danger';
  const style = variantStyles[variant];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9991] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
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
          {/* Top colored accent line */}
          <div className={`h-1.5 w-full ${style.confirmBtn}`} />

          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cancel confirmation"
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
                  Action Confirmation
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                {options.title}
              </h3>

              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line">
                {options.message}
              </p>

              {options.details && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto">
                  {options.details}
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {options.cancelText || 'Cancel'}
            </button>
            <button
              onClick={onConfirm}
              autoFocus
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${style.confirmBtn}`}
            >
              {options.confirmText || style.defaultConfirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
