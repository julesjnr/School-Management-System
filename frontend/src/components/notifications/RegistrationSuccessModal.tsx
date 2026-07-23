import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Copy, Check, Printer, Mail, Eye, EyeOff, X, UserCheck, KeyRound, Building2 } from 'lucide-react';
import { RegistrationCredentials } from './types';

interface RegistrationSuccessModalProps {
  credentials: RegistrationCredentials | null;
  onClose: () => void;
  onShowToast: (message: string, type?: 'success' | 'info') => void;
}

export const RegistrationSuccessModal: React.FC<RegistrationSuccessModalProps> = ({
  credentials,
  onClose,
  onShowToast,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (!credentials) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [credentials, onClose]);

  if (!credentials) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(credentials.idOrAdmissionNo);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    onShowToast(`Copied ID (${credentials.idOrAdmissionNo}) to clipboard`, 'success');
  };

  const handleCopyPasscode = () => {
    navigator.clipboard.writeText(credentials.temporaryPasscode);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
    onShowToast('Copied temporary passcode to clipboard', 'success');
  };

  const handleCopyAll = () => {
    const formatted = `=== ZENTI PORTAL OFFICIAL CREDENTIALS ===
User Name: ${credentials.name}
Role: ${credentials.role || 'Staff / Student'}
Department: ${credentials.department || 'General Academic'}
Staff/Admission No: ${credentials.idOrAdmissionNo}
Temporary Passcode: ${credentials.temporaryPasscode}
System Portal URL: ${window.location.origin}
===========================================
Notice: Please request the user to change their passcode upon initial sign-in.`;

    navigator.clipboard.writeText(formatted);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    onShowToast('All registration credentials copied to clipboard!', 'success');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Registration Credentials - ${credentials.name}</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
              .card { border: 2px solid #e2e8f0; border-radius: 12px; padding: 30px; max-width: 600px; margin: auto; }
              .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px; }
              .title { font-size: 24px; font-weight: bold; color: #1e3a8a; margin: 0; }
              .subtitle { font-size: 13px; color: #64748b; margin-top: 5px; }
              .field { margin-bottom: 16px; }
              .label { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
              .value { font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 4px; }
              .code-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 18px; font-weight: bold; color: #1e293b; letter-spacing: 1px; margin-top: 4px; }
              .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <h1 class="title">Zenti Enterprise Portal</h1>
                <div class="subtitle">Official Account Registration Credentials Slip</div>
              </div>
              <div class="field">
                <div class="label">Full Name</div>
                <div class="value">${credentials.name}</div>
              </div>
              <div class="field">
                <div class="label">Role / Department</div>
                <div class="value">${credentials.role || 'Staff / Student'} — ${credentials.department || 'Academic Affairs'}</div>
              </div>
              <div class="field">
                <div class="label">Staff / Admission Number</div>
                <div class="code-box">${credentials.idOrAdmissionNo}</div>
              </div>
              <div class="field">
                <div class="label">Secure Temporary Passcode</div>
                <div class="code-box">${credentials.temporaryPasscode}</div>
              </div>
              <div class="footer">
                IMPORTANT: This temporary passcode is securely hashed in the database. Please provide this slip to the user immediately and advise them to change their passcode upon initial login.
              </div>
            </div>
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleSendEmail = () => {
    setEmailSent(true);
    onShowToast(`Credentials dispatch notice queued for ${credentials.name}`, 'info');
    setTimeout(() => setEmailSent(false), 3000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9993] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        />

        {/* Credentials Card Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10"
        >
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md text-white ring-2 ring-white/30">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full border border-white/30 text-white">
                  Registration Certified
                </span>
                <h3 className="text-xl font-black leading-snug tracking-tight">
                  Credentials Issued
                </h3>
              </div>
            </div>
            <p className="text-xs text-emerald-100 leading-relaxed font-normal">
              Official account created successfully. Store or dispatch these credentials securely.
            </p>
          </div>

          {/* Credentials Body */}
          <div className="p-6 space-y-4">
            {/* User Meta Card */}
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Enrolled User Name
                </span>
                <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {credentials.name}
                </h4>
              </div>
              {credentials.role && (
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                  {credentials.role}
                </span>
              )}
            </div>

            {/* Grid of Identifiers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Staff / Admission No */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Staff / Admission ID
                  </span>
                  <button
                    onClick={handleCopyId}
                    className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1 rounded transition-colors"
                    title="Copy ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="font-mono text-sm font-black text-slate-900 dark:text-white tracking-wider">
                  {credentials.idOrAdmissionNo}
                </div>
              </div>

              {/* Temporary Passcode */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-amber-500" /> Temporary Passcode
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded transition-colors"
                      title={showPassword ? 'Hide passcode' : 'Show passcode'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={handleCopyPasscode}
                      className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1 rounded transition-colors"
                      title="Copy Passcode"
                    >
                      {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400 tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                  {showPassword ? credentials.temporaryPasscode : '••••••••••••'}
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 leading-relaxed flex items-start gap-2">
              <span className="shrink-0 text-base">🔒</span>
              <span>
                <strong>Security Policy:</strong> Passcodes are securely stored using one-way cryptographic hashing. Provide this passcode to the user now.
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="bg-slate-50 dark:bg-slate-900/60 px-6 py-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2.5">
            <button
              onClick={handleCopyAll}
              className="px-3.5 py-2.5 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              {copiedAll ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copiedAll ? 'Copied!' : 'Copy All'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>

            <button
              onClick={handleSendEmail}
              className="px-3.5 py-2.5 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <Mail className={`w-4 h-4 ${emailSent ? 'text-blue-500' : ''}`} />
              <span>{emailSent ? 'Queued!' : 'Email Notice'}</span>
            </button>

            <button
              onClick={onClose}
              className="col-span-2 sm:col-span-1 px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              Done & Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
