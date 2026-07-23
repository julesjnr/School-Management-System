import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit3, X } from 'lucide-react';
import { PromptOptions } from './types';

interface PromptModalProps {
  options: PromptOptions | null;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({ options, onSubmit, onCancel }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (options) {
      setValue(options.defaultValue || '');
      setError(null);
    }
  }, [options]);

  useEffect(() => {
    if (!options) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, onCancel]);

  if (!options) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (options.required && !value.trim()) {
      setError('This field is required.');
      return;
    }

    if (options.validate) {
      const customErr = options.validate(value);
      if (customErr) {
        setError(customErr);
        return;
      }
    }

    onSubmit(value);
  };

  const inputType = options.inputType || 'text';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9992] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10"
        >
          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 to-indigo-600" />

          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cancel prompt"
          >
            <X className="w-5 h-5" />
          </button>

          <form onSubmit={handleSubmit}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Input Required
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {options.title}
                  </h3>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                {options.message}
              </p>

              <div className="mt-2">
                {inputType === 'textarea' ? (
                  <textarea
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      if (error) setError(null);
                    }}
                    rows={4}
                    placeholder={options.placeholder || 'Enter response here...'}
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none transition-all resize-y"
                  />
                ) : (
                  <input
                    type={inputType}
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={options.placeholder || 'Enter response here...'}
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none transition-all"
                  />
                )}

                {error && (
                  <p className="mt-2 text-xs font-semibold text-rose-500 dark:text-rose-400 flex items-center gap-1">
                    <span>⚠️</span> {error}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                {options.cancelText || 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              >
                {options.confirmText || 'Submit'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
