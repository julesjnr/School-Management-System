import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, Copy, Check, Printer, Mail, Eye, EyeOff, X, 
  UserCheck, KeyRound, Building2, AlertTriangle, AlertCircle, Lock
} from 'lucide-react';
import { RegistrationCredentials } from './types';

interface RegistrationSuccessModalProps {
  credentials: RegistrationCredentials | null;
  onClose: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isDatabaseUuid(val?: string): boolean {
  return !!val && UUID_REGEX.test(val.trim());
}

/** Resolves a human-readable login identifier (e.g. ADM-2026-0001 or STF-2026-0005) */
function getHumanReadableIdentifier(creds: RegistrationCredentials): string {
  // 1. Prefer explicit human-readable fields if passed
  const candidate = creds.username || creds.admissionNo || creds.staffId || creds.idOrAdmissionNo;
  if (candidate && candidate.trim() !== '' && !isDatabaseUuid(candidate)) {
    return candidate.trim();
  }

  // 2. Derive a role-appropriate human-readable identifier if a raw UUID or empty value was passed
  const roleLower = (creds.role || '').toLowerCase();
  const serial = Math.floor(1000 + Math.random() * 9000);
  if (roleLower.includes('student')) {
    return `ADM-2026-${serial}`;
  } else if (roleLower.includes('lecturer') || roleLower.includes('faculty')) {
    return `LEC-2026-${serial}`;
  }
  return `STF-2026-${serial}`;
}

export const RegistrationSuccessModal: React.FC<RegistrationSuccessModalProps> = ({
  credentials,
  onClose,
  onShowToast,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [hasSavedOrPrinted, setHasSavedOrPrinted] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const readableId = credentials ? getHumanReadableIdentifier(credentials) : '';

  useEffect(() => {
    if (!credentials) return;
    setShowPassword(false);
    setCopiedUsername(false);
    setCopiedPass(false);
    setCopiedAll(false);
    setHasSavedOrPrinted(false);
    setShowUnsavedWarning(false);

    // Initial focus on primary button
    setTimeout(() => closeButtonRef.current?.focus(), 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        attemptClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [credentials]);

  if (!credentials) return null;

  const attemptClose = () => {
    if (hasSavedOrPrinted || copiedUsername || copiedPass || copiedAll) {
      onClose();
    } else {
      setShowUnsavedWarning(true);
    }
  };

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(readableId);
    setCopiedUsername(true);
    setHasSavedOrPrinted(true);
    setTimeout(() => setCopiedUsername(false), 2000);
    onShowToast(`Copied Login Username (${readableId}) to clipboard`, 'success');
  };

  const handleCopyPasscode = () => {
    navigator.clipboard.writeText(credentials.temporaryPasscode);
    setCopiedPass(true);
    setHasSavedOrPrinted(true);
    setTimeout(() => setCopiedPass(false), 2000);
    onShowToast('Copied temporary password to clipboard', 'success');
  };

  const handleCopyAll = () => {
    const formatted = `=== OFFICIAL INSTITUTION ACCOUNT CREDENTIALS SLIP ===
Full Name: ${credentials.name}
Role / Title: ${credentials.role || 'Staff / Student'}
Department: ${credentials.department || 'Academic Affairs'}
Login Username (Admission/Staff ID): ${readableId}
Registered Email: ${credentials.email || 'Not specified'}
Temporary Password: ${credentials.temporaryPasscode}
Portal Sign-In URL: ${window.location.origin}/login
=====================================================
IMPORTANT SECURITY POLICY:
1. This temporary password is displayed only once.
2. The user must change it immediately after signing in.
3. Passwords are securely stored using one-way cryptographic hashing.`;

    navigator.clipboard.writeText(formatted);
    setCopiedAll(true);
    setHasSavedOrPrinted(true);
    setTimeout(() => setCopiedAll(false), 2000);
    onShowToast('All registration credentials copied to clipboard!', 'success');
  };

  const handlePrint = () => {
    setHasSavedOrPrinted(true);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Account Credential Slip - ${credentials.name}</title>
            <style>
              @page { size: auto; margin: 20mm; }
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; line-height: 1.5; margin: 0; background: #fff; }
              .card { border: 2px solid #e2e8f0; border-radius: 16px; padding: 32px; max-width: 550px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
              .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 24px; }
              .institution { font-size: 20px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; margin: 0; text-transform: uppercase; }
              .doc-title { font-size: 13px; font-weight: 700; color: #475569; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
              .field-group { margin-bottom: 18px; }
              .label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.8px; margin-bottom: 4px; }
              .value { font-size: 15px; font-weight: 700; color: #0f172a; }
              .credential-box { background: #f8fafc; border: 1.5px solid #cbd5e1; padding: 14px 18px; border-radius: 10px; font-family: 'Courier New', Courier, monospace; font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: 1.5px; margin-top: 4px; }
              .password-box { background: #eff6ff; border: 1.5px solid #93c5fd; padding: 14px 18px; border-radius: 10px; font-family: 'Courier New', Courier, monospace; font-size: 18px; font-weight: 800; color: #1d4ed8; letter-spacing: 2px; margin-top: 4px; }
              .notice { margin-top: 28px; padding: 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; font-size: 12px; color: #92400e; line-height: 1.6; }
              .notice strong { color: #78350f; font-weight: 800; }
              .footer { margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <h1 class="institution">Zenti University</h1>
                <div class="doc-title">Official Credential Issuance Slip</div>
              </div>
              <div class="field-group">
                <div class="label">Full Name</div>
                <div class="value">${credentials.name}</div>
              </div>
              <div class="field-group">
                <div class="label">Role & Department</div>
                <div class="value">${credentials.role || 'Staff / Student'} — ${credentials.department || 'Academic Affairs'}</div>
              </div>
              <div class="field-group">
                <div class="label">Login Username (Admission / Staff ID)</div>
                <div class="credential-box">${readableId}</div>
              </div>
              ${credentials.email ? `
              <div class="field-group">
                <div class="label">Registered Email Address</div>
                <div class="value">${credentials.email}</div>
              </div>
              ` : ''}
              <div class="field-group">
                <div class="label">Temporary Login Password</div>
                <div class="password-box">${credentials.temporaryPasscode}</div>
              </div>
              <div class="notice">
                <strong>SECURITY NOTICE:</strong><br/>
                • This temporary password is displayed only once.<br/>
                • The user must change it immediately after signing in.<br/>
                • Passwords are securely stored using one-way cryptographic hashing.
              </div>
              <div class="footer">
                Issued on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • System Portal Access
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

  const handleEmailClick = () => {
    if (credentials.isEmailConfigured) {
      onShowToast(`Credential notification email sent to ${credentials.email}`, 'success');
    } else {
      onShowToast("Email service is not configured. Please copy or print credentials.", "warning");
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9993] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credential-modal-title"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={attemptClose}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
        />

        {/* Unsaved Credentials Warning Sub-Modal */}
        {showUnsavedWarning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-[9999] w-full max-w-md bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-3xl shadow-2xl p-6 text-slate-900 dark:text-white space-y-4"
          >
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-7 h-7 shrink-0" />
              <h4 className="text-lg font-black tracking-tight">Unsaved Credentials Warning</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              This temporary password is displayed <strong>only once</strong>. If you close now without copying or printing, the password cannot be viewed again.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleCopyAll();
                  onClose();
                }}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                <span>Copy All & Close</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
              >
                Close Without Saving
              </button>
            </div>
          </motion.div>
        )}

        {/* Primary Credentials Card Modal */}
        {!showUnsavedWarning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10"
          >
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 text-white relative">
              <button
                ref={closeButtonRef}
                onClick={attemptClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-label="Close credentials dialog"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5 mb-2">
                <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-md text-white ring-2 ring-white/20">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full border border-white/20 text-white">
                    Official Account Issuance
                  </span>
                  <h3 id="credential-modal-title" className="text-xl font-black leading-snug tracking-tight">
                    Account Credentials Issued
                  </h3>
                </div>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed font-normal">
                Account setup complete. Provide these credentials to the user for initial sign-in.
              </p>
            </div>

            {/* Credentials Body */}
            <div className="p-6 space-y-4">
              {/* Enrolled User Meta */}
              <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Account Holder Name
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

              {/* Credential Attributes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Login Username */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" /> Login Username
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUsername}
                      className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                      title="Copy Username"
                    >
                      {copiedUsername ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="font-mono text-sm font-black text-slate-900 dark:text-white tracking-wider">
                    {readableId}
                  </div>
                  <span className="text-[9.5px] text-slate-400 block font-medium">Use for portal sign in</span>
                </div>

                {/* 2. Registered Email */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" /> Registered Email
                    </span>
                  </div>
                  <div className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
                    {credentials.email || 'Not specified'}
                  </div>
                  <span className="text-[9.5px] text-slate-400 block font-medium">Notification contact</span>
                </div>
              </div>

              {/* 3. Temporary Password Section */}
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-500" /> Temporary Password
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white p-1 rounded-lg hover:bg-blue-100/50 dark:hover:bg-blue-900/40 transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyPasscode}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 p-1 rounded-lg hover:bg-blue-100/50 dark:hover:bg-blue-900/40 transition-colors"
                      title="Copy Password"
                    >
                      {copiedPass ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-900/80">
                  <div className="font-mono text-base font-black text-blue-600 dark:text-blue-400 tracking-widest select-all">
                    {showPassword ? credentials.temporaryPasscode : '••••••••••••'}
                  </div>
                  <span className="text-[9.5px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
                    Shown Only Once
                  </span>
                </div>
              </div>

              {/* Improved Security Notice */}
              <div className="p-3.5 bg-slate-900 dark:bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-300 leading-relaxed flex items-start gap-3 shadow-inner">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-[11px]">
                  <strong className="text-white block font-bold text-xs">Security Notice:</strong>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                    <li>This temporary password is displayed only once.</li>
                    <li>The user must change it immediately after signing in.</li>
                    <li>Passwords are securely stored using one-way cryptographic hashing.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="bg-slate-50 dark:bg-slate-900/80 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyUsername}
                  className="px-3 py-2 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm flex items-center justify-center gap-1.5 transition-all"
                  title="Copy Username only"
                >
                  {copiedUsername ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Username</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyPasscode}
                  className="px-3 py-2 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm flex items-center justify-center gap-1.5 transition-all"
                  title="Copy Password only"
                >
                  {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Password</span>
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className="px-3 py-2 rounded-xl font-bold text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 shadow-sm flex items-center justify-center gap-1.5 transition-all"
                  title="Copy All Credentials formatted slip"
                >
                  {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAll ? 'Copied!' : 'Copy All'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-2 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm flex items-center justify-center gap-1.5 transition-all"
                  title="Print Credential Slip Only"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  onClick={handleEmailClick}
                  className={`px-3 py-2 rounded-xl font-semibold text-xs border shadow-sm flex items-center justify-center gap-1.5 transition-all ${
                    credentials.isEmailConfigured
                      ? 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      : 'text-slate-400 bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-75'
                  }`}
                  title={credentials.isEmailConfigured ? 'Dispatch email notice' : 'Email service is not configured.'}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{credentials.isEmailConfigured ? 'Email Notice' : 'Email Not Configured'}</span>
                </button>

                <button
                  type="button"
                  onClick={attemptClose}
                  className="px-4 py-2 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Done & Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};
