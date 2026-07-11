import React from 'react';
import { ShieldAlert, Lock, ArrowLeft, RefreshCw, AlertOctagon, Terminal } from 'lucide-react';

interface Forbidden403Props {
  onBackToDashboard: () => void;
  attemptedRoute?: string;
  activeRole?: string;
}

export default function Forbidden403({ onBackToDashboard, attemptedRoute = "/admin", activeRole = "student" }: Forbidden403Props) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 select-none font-sans relative overflow-hidden">
      {/* Absolute visual ambient security glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-rose-900/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 opacity-5 pointer-events-none font-mono text-[9px] text-slate-400">
        SYS_RBAC_STATE: CRITICAL_ABORT_TRIPPED
      </div>

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative z-10">
        
        {/* Animated Warning Icon Banner */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="relative">
            <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-500/20 animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center text-amber-500">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-1.5 mt-2">
            <span className="text-[10px] font-mono tracking-widest font-black text-rose-500 uppercase bg-rose-500/5 px-2.5 py-1 rounded-full border border-rose-500/10">
              HTTP ERROR 403: FORBIDDEN
            </span>
            <h2 className="text-2xl font-black font-display tracking-tight text-white mt-1">
              Access Refused by Security Rules
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Your role identification does not possess the credentials required to request or access administrative routes.
            </p>
          </div>
        </div>

        {/* Technical Audit trail parameters card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4.5 space-y-3 font-mono">
          <div className="flex items-center gap-2 border-b border-slate-900 pb-2 mb-1">
            <Terminal className="w-4 h-4 text-rose-400" />
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Security Intercept Ledger</span>
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Attempted Route:</span>
              <span className="text-rose-400 font-bold bg-rose-950/20 border border-rose-900/30 px-2 py-0.5 rounded">
                {attemptedRoute}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">User Active Role:</span>
              <span className="text-amber-400 font-semibold bg-amber-950/20 border border-amber-900/30 px-2 py-0.5 rounded capitalize">
                {activeRole}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Validation System:</span>
              <span className="text-emerald-400 font-medium">RBAC Gate Guard v2.4</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Gateway Response:</span>
              <span className="text-rose-500 font-extrabold uppercase flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5" />
                BLOCKED (403)
              </span>
            </div>
          </div>
        </div>

        {/* Security Warning Information block */}
        <p className="text-[10.5px] leading-relaxed text-slate-500 text-center font-light">
          This system uses fully enforced Role-Based Access Control (RBAC). Administrative panels are restricted to authorized personnel. Attempted unauthorized transitions are automatically registered in secure audit database system logs.
        </p>

        {/* Actions Button */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="w-full bg-slate-800 hover:bg-slate-700 active:scale-98 text-white font-extrabold py-3 px-6 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Student Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="w-full bg-transparent hover:bg-slate-800/40 text-slate-400 hover:text-white font-semibold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer text-center border border-slate-800"
          >
            Return to Public Campus Hub
          </button>
        </div>

      </div>
    </div>
  );
}
