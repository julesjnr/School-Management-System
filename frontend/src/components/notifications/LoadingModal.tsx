import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { LoadingOptions } from './types';

interface LoadingModalProps {
  options: LoadingOptions | null;
}

export const LoadingModal: React.FC<LoadingModalProps> = ({ options }) => {
  if (!options) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-center z-10"
        >
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
              <div className="relative p-4 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
              {options.title}
            </h3>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
              {options.message || 'Please hold on while we process your request securely...'}
            </p>

            <div className="mt-5 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                className="w-1/2 h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-full"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
