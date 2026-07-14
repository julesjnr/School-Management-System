import React, { useState, useEffect } from 'react';
import { ShieldAlert, LogOut, ShieldCheck } from 'lucide-react';

interface SessionTimeoutProps {
  isAuthenticated: boolean;
  onLogout: (isTimeout: boolean) => void;
  timeoutMinutes?: number; // Configurable inactivity duration
  warningSeconds?: number; // Configurable warning countdown duration
}

export default function SessionTimeout({
  isAuthenticated,
  onLogout,
  timeoutMinutes = 15,
  warningSeconds = 60
}: SessionTimeoutProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(warningSeconds);
  const lastActivityKey = 'zenti_last_activity';

  // Retrieve last recorded activity time
  const getLastActivity = (): number => {
    const stored = localStorage.getItem(lastActivityKey);
    return stored ? parseInt(stored, 10) : Date.now();
  };

  // Record a new activity time
  const setLastActivity = (time: number) => {
    localStorage.setItem(lastActivityKey, time.toString());
  };

  // Reset inactivity timer and warning modal
  const resetTimer = () => {
    if (!isAuthenticated) return;
    setLastActivity(Date.now());
    if (showWarning) {
      setShowWarning(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setShowWarning(false);
      localStorage.removeItem(lastActivityKey);
      return;
    }

    // Set initial activity time
    setLastActivity(Date.now());

    // Throttled event handler for user activity
    let throttleTimeout: NodeJS.Timeout | null = null;
    const handleActivity = () => {
      if (throttleTimeout) return;

      throttleTimeout = setTimeout(() => {
        resetTimer();
        throttleTimeout = null;
      }, 1000); // Throttle activity checks to once per second
    };

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = warningSeconds * 1000;

    // Check inactivity status every second
    const interval = setInterval(() => {
      const lastActivity = getLastActivity();
      const now = Date.now();
      const inactiveDuration = now - lastActivity;

      if (inactiveDuration >= timeoutMs) {
        // Log out immediately
        clearInterval(interval);
        setShowWarning(false);
        localStorage.removeItem(lastActivityKey);
        onLogout(true);
      } else if (inactiveDuration >= timeoutMs - warningMs) {
        // Show session warning countdown modal
        setShowWarning(true);
        const remainingSeconds = Math.max(
          0,
          Math.ceil((timeoutMs - inactiveDuration) / 1000)
        );
        setCountdown(remainingSeconds);
      } else {
        // Active session, ensure warning is closed
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (throttleTimeout) clearTimeout(throttleTimeout);
      clearInterval(interval);
    };
  }, [isAuthenticated, timeoutMinutes, warningSeconds, showWarning]);

  if (!isAuthenticated || !showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/70 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl max-w-md w-full shadow-2xl p-6 text-slate-800 dark:text-slate-100 font-sans space-y-5 animate-scaleUp">
        <div className="flex items-center gap-3.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Session Security Alert</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-none mt-0.5">Inactivity warning</p>
          </div>
        </div>

        <div className="space-y-3 leading-relaxed">
          <p className="text-xs text-slate-600 dark:text-slate-350">
            You have been inactive for a while. To protect your academic and financial records, your portal session will automatically terminate soon.
          </p>
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Session expires in</span>
            <span className="text-3xl font-black font-mono text-amber-600 dark:text-amber-400 tracking-tight">
              {countdown} <span className="text-sm font-bold font-sans">seconds</span>
            </span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={resetTimer}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 rounded-xl text-xs tracking-wider uppercase transition-colors cursor-pointer shadow-3xs flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Stay Logged In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowWarning(false);
              onLogout(false);
            }}
            className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold py-2.5 rounded-xl text-xs tracking-wider uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
