import React, { useState, useEffect } from 'react';
import { ShieldCheck, LockKeyhole, KeyRound, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { UserRole } from '../types';

interface ChangePasswordPageProps {
  initialUserId?: string;
  initialRole?: string;
  initialEmail?: string;
  onSuccess: (role: UserRole, userId: string) => void;
  onCancel?: () => void;
}

export default function ChangePasswordPage({
  initialUserId,
  initialRole,
  initialEmail,
  onSuccess,
  onCancel
}: ChangePasswordPageProps) {
  const [userId, setUserId] = useState<string>('');
  const [role, setRole] = useState<string>('student');
  const [email, setEmail] = useState<string>('');

  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [showCurrentPass, setShowCurrentPass] = useState<boolean>(false);
  const [showNewPass, setShowNewPass] = useState<boolean>(false);
  const [showConfirmPass, setShowConfirmPass] = useState<boolean>(false);

  const [errorText, setErrorText] = useState<string>('');
  const [successText, setSuccessText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let targetUserId = initialUserId;
    let targetRole = initialRole;
    let targetEmail = initialEmail;

    if (!targetUserId || !targetRole) {
      const pendingRaw = localStorage.getItem('zenti_pending_password_change');
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw);
          targetUserId = pending.userId;
          targetRole = pending.role;
          targetEmail = pending.email;
        } catch (e) {
          console.error("Failed to parse pending password change state:", e);
        }
      }
    }

    if (targetUserId) setUserId(targetUserId);
    if (targetRole) setRole(targetRole);
    if (targetEmail) setEmail(targetEmail);
  }, [initialUserId, initialRole, initialEmail]);

  const validatePassword = () => {
    if (!currentPassword) {
      return 'Please enter your current or default password.';
    }
    if (!newPassword) {
      return 'Please enter a new password.';
    }
    if (newPassword.length < 6) {
      return 'New password must be at least 6 characters long.';
    }
    if (newPassword === currentPassword) {
      return 'New password cannot be identical to your current default password.';
    }
    if (newPassword !== confirmPassword) {
      return 'New password and confirmation do not match.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    setSuccessText('');

    const validationError = validatePassword();
    if (validationError) {
      setErrorText(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: role || 'student',
          userId: userId,
          currentPassword: currentPassword,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update password.');
      }

      // Store new JWT session token
      if (data.token) {
        localStorage.setItem('zenti_session_token', data.token);
      }
      localStorage.removeItem('zenti_pending_password_change');

      setSuccessText('Password changed successfully! Redirecting to your dashboard...');

      setTimeout(() => {
        onSuccess((data.role || role) as UserRole, data.userId || userId);
      }, 1200);

    } catch (err: any) {
      setErrorText(err.message || 'An error occurred while updating your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMinLength = newPassword.length >= 6;
  const isDifferent = newPassword !== currentPassword && newPassword.length > 0;
  const isMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic ambient gradient background */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/60 rounded-3xl p-8 shadow-2xl backdrop-blur-md relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-1">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Set Your New Password</h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Your account was created with a default password. For account security, you must establish a custom password before continuing.
          </p>
          
          {(role || userId) && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-700/50 border border-slate-600/50 text-xs font-mono text-slate-300 mt-2">
              <span className="uppercase font-bold text-blue-400">{role}</span>
              <span className="text-slate-500">•</span>
              <span>{email || userId}</span>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {errorText && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3 animate-shake">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorText}</div>
          </div>
        )}

        {/* Success Alert */}
        {successText && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-semibold">{successText}</div>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* User ID field if not set */}
          {!userId && (
            <div>
              <label htmlFor="change-pass-userid" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                User ID / Email / Admission No
              </label>
              <input
                id="change-pass-userid"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your User ID or Email"
                required
                className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          )}

          {/* Current / Default Password */}
          <div>
            <label htmlFor="change-pass-current" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Current / Default Password
            </label>
            <div className="relative">
              <input
                id="change-pass-current"
                type={showCurrentPass ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current default password"
                required
                className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors pr-11"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Custom Password */}
          <div>
            <label htmlFor="change-pass-new" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              New Custom Password
            </label>
            <div className="relative">
              <input
                id="change-pass-new"
                type={showNewPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors pr-11"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label htmlFor="change-pass-confirm" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="change-pass-confirm"
                type={showConfirmPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors pr-11"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Requirements Checklist */}
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-700/50 space-y-2 text-[11px]">
            <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1 text-[10px]">Password Criteria:</span>
            <div className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${isMinLength ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                {isMinLength ? '✓' : '•'}
              </span>
              <span className={isMinLength ? 'text-emerald-300 font-medium' : 'text-slate-400'}>
                At least 6 characters long
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${isDifferent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                {isDifferent ? '✓' : '•'}
              </span>
              <span className={isDifferent ? 'text-emerald-300 font-medium' : 'text-slate-400'}>
                Different from current default password
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${isMatch ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                {isMatch ? '✓' : '•'}
              </span>
              <span className={isMatch ? 'text-emerald-300 font-medium' : 'text-slate-400'}>
                Passwords match
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !isMinLength || !isMatch || !isDifferent}
            className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating Security Profile...
              </span>
            ) : (
              <>
                <span>Update Password & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel & Return to Login
            </button>
          )}
        </form>

      </div>
    </div>
  );
}
