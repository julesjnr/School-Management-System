import React, { useState, useEffect } from 'react';
import { 
  X, Mail, KeyRound, ArrowRight, ShieldCheck, 
  CheckCircle2, AlertCircle, RefreshCw, Send, History, UserCheck, HelpCircle
} from 'lucide-react';
import { Student, Lecturer } from '../types';

interface PasswordRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  students: Student[];
  lecturers: Lecturer[];
}

export default function PasswordRecoveryModal({ 
  isOpen, 
  onClose, 
  onSwitchToLogin,
  students, 
  lecturers 
}: PasswordRecoveryModalProps) {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [step, setStep] = useState<'identify' | 'request_flow'>('identify');
  
  const [detectedUser, setDetectedUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: 'student' | 'lecturer' | 'accountant' | 'librarian' | 'admin';
  } | null>(null);

  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset state on open
      setEmail('');
      setReason('');
      setStep('identify');
      setDetectedUser(null);
      setRequests([]);
      setErrorText('');
      setSuccessText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Query server to fetch user reset history
  const fetchRequestHistory = async (targetEmail: string) => {
    try {
      const res = await fetch(`/api/auth/reset-requests?email=${encodeURIComponent(targetEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRequests(data.requests || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch reset history:', err);
    }
  };

  // Step 1: Search and Identify account
  const handleIdentifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const searchEmail = email.trim().toLowerCase();

    if (!searchEmail) {
      setErrorText('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setErrorText('');
    setSuccessText('');

    let foundUser = false;
    let name = '';
    let role: 'admin' | 'accountant' | 'librarian' | 'student' | 'lecturer' = 'student';
    let userId = '';

    // Check Lecturers & Staff
    const matchLec = lecturers.find(l => l.email.toLowerCase() === searchEmail);
    if (matchLec) {
      foundUser = true;
      name = matchLec.name;
      userId = matchLec.id;
      if (matchLec.isAccountant) {
        role = 'accountant';
      } else if (matchLec.isLibrarian || matchLec.id === 'l3') {
        role = 'librarian';
      } else {
        role = 'lecturer';
      }
    } 
    // Check Students
    else {
      const matchStud = students.find(s => s.email.toLowerCase() === searchEmail);
      if (matchStud) {
        foundUser = true;
        name = matchStud.name;
        userId = matchStud.id;
        role = 'student';
      }
    }

    // Special fallback to help with mock entries
    if (!foundUser) {
      if (searchEmail === 'admin@zenti.edu') {
        foundUser = true;
        name = 'System Administrator';
        userId = 'admin';
        role = 'admin';
      }
    }

    if (!foundUser) {
      setErrorText(`We could not locate any registered account with email "${email}". Please enter a valid student or staff email.`);
      setIsLoading(false);
      return;
    }

    setDetectedUser({
      id: userId,
      name,
      email: searchEmail,
      role
    });

    await fetchRequestHistory(searchEmail);
    setStep('request_flow');
    setIsLoading(false);
  };

  // Step 2: Submit Reset Request
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detectedUser) return;

    setIsLoading(true);
    setErrorText('');
    setSuccessText('');

    try {
      const res = await fetch('/api/auth/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: detectedUser.email,
          reason: reason.trim() || 'Forgotten password'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessText('Your password reset request has been successfully queued for administrative review.');
        setReason('');
        await fetchRequestHistory(detectedUser.email);
      } else {
        setErrorText(data.error || 'Failed to submit password reset request.');
      }
    } catch (err) {
      setErrorText('Network error: Failed to reach the system administrator gateway.');
    } finally {
      setIsLoading(false);
    }
  };

  // Utility to determine badge style
  const getStatusBadge = (status: 'pending' | 'resolved' | 'rejected') => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/55';
      case 'resolved':
        return 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/55';
      case 'rejected':
        return 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/55';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Global System Administrator';
      case 'accountant': return 'Finance Accountant Staff';
      case 'librarian': return 'Librarian Staff';
      case 'lecturer': return 'Faculty Instructor';
      case 'student': return 'Enrolled Student';
      default: return role;
    }
  };

  const hasPendingRequest = requests.some(r => r.status === 'pending');

  return (
    <div className="fixed inset-0 bg-slate-950/80 dark:bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 relative overflow-hidden my-8">
        
        {/* Top background accent details */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600" />

        {/* Brand Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
              ED
            </div>
            <div>
              <span className="font-mono text-[9px] tracking-widest text-slate-400 font-bold block uppercase leading-none">Security Suite</span>
              <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-none">Password Recovery Gateway</span>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info alerts */}
        {errorText && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs px-3.5 py-3 rounded-xl border border-red-100/60 dark:border-red-950/50 mb-4 font-medium animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <span>{errorText}</span>
          </div>
        )}

        {successText && (
          <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs px-3.5 py-3 rounded-xl border border-emerald-100/60 dark:border-emerald-950/50 mb-4 font-medium animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
            <span>{successText}</span>
          </div>
        )}

        {/* STEP 1: Identify Account */}
        {step === 'identify' && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1">
              <h3 className="font-sans font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>1. Identify Your Registered Account</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                To request a password reset, enter your registered email. We will verify your credentials and lookup any existing admin request states.
              </p>
            </div>

            <form onSubmit={handleIdentifySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-450 uppercase tracking-widest font-mono">
                  Registered Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrorText(''); }}
                    placeholder="e.g. jdoe@zenti.edu or standard student email"
                    className="w-full bg-slate-50 dark:bg-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pl-10 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-sans"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3 px-6 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Searching Directories...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Account & Check Status</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: Request Reset & Status View */}
        {step === 'request_flow' && detectedUser && (
          <div className="space-y-6 animate-fade-in">
            {/* Account Info Details Card */}
            <div className="bg-slate-50 dark:bg-slate-850/60 border border-slate-150 dark:border-slate-800/85 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 font-mono tracking-wider">Identified Profile</span>
                <span className="text-[10px] bg-blue-50 dark:bg-blue-950/45 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">
                  ID: {detectedUser.id}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{detectedUser.name}</h4>
                <p className="text-xs text-slate-550 dark:text-slate-450 mt-0.5">{detectedUser.email}</p>
              </div>
              <div className="pt-2 border-t border-slate-200/50 dark:border-slate-850 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-450">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="font-medium">{getRoleLabel(detectedUser.role)}</span>
              </div>
            </div>

            {/* Existing Requests & History Status Tracker */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-extrabold text-slate-450 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-indigo-500" />
                <span>Your Reset Requests Status Tracker</span>
              </h4>

              {requests.length === 0 ? (
                <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                  <p className="text-xs text-slate-400 dark:text-slate-500">No previous password reset requests submitted for this account.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {requests.map((req) => (
                    <div key={req.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl p-3.5 space-y-2 shadow-3xs">
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-0.5">
                          <p className="text-[10px] text-slate-400 font-mono leading-none">{req.date}</p>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 italic">" {req.reason} "</p>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border capitalize shrink-0 ${getStatusBadge(req.status)}`}>
                          {req.status}
                        </span>
                      </div>

                      {/* Resolved Details: Reveal temporary password */}
                      {req.status === 'resolved' && (
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/30 rounded-xl p-2.5 mt-2 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-emerald-850 dark:text-emerald-400">
                            <KeyRound className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-[10.5px] font-bold">New Temporary Passcode Assigned:</span>
                          </div>
                          <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-emerald-200/50 dark:border-emerald-950 px-3 py-1.5 rounded-lg">
                            <code className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 tracking-widest select-all">
                              {req.temporaryPasscode}
                            </code>
                            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono font-bold">Use to Sign In</span>
                          </div>
                          {req.adminFeedback && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal font-light">
                              <span className="font-semibold text-slate-600 dark:text-slate-300">Admin Response:</span> {req.adminFeedback}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Rejected Details */}
                      {req.status === 'rejected' && req.adminFeedback && (
                        <div className="bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/30 rounded-xl p-2.5 mt-2">
                          <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-normal font-light">
                            <span className="font-bold text-rose-700 dark:text-rose-400">Admin Response:</span> {req.adminFeedback}
                          </p>
                        </div>
                      )}

                      {/* Pending Details */}
                      {req.status === 'pending' && (
                        <div className="flex items-center gap-1 text-[10.5px] text-amber-600 dark:text-amber-500 mt-1.5 bg-amber-50/30 dark:bg-amber-950/10 p-1.5 px-2 rounded-lg">
                          <span className="relative flex h-1.5 w-1.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                          </span>
                          <span>Awaiting review by the System Administrator. Check back shortly.</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Send New Reset Request Form */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-extrabold text-slate-450 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-blue-500" />
                <span>Submit New Password Reset Request</span>
              </h4>

              {hasPendingRequest ? (
                <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-4 flex gap-2.5">
                  <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                    You currently have a **Pending request** under review. To submit another request, please wait until the Administrator resolves or declines your existing submission.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRequestSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-450 uppercase tracking-widest font-mono">
                      Reason or Message to Administrator
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. I lost my passcode book, or I am unable to authenticate with staff123. Please reset to default."
                      className="w-full bg-slate-50 dark:bg-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-sans"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep('identify')}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider text-center cursor-pointer transition-colors"
                    >
                      Search Another
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3 px-6 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Request to Admin</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Footer info link */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center flex flex-col sm:flex-row justify-between items-center gap-2">
          {step === 'request_flow' && (
            <button
              type="button"
              onClick={() => {
                setStep('identify');
                setErrorText('');
                setSuccessText('');
              }}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              ← Identify different account
            </button>
          )}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-xs font-bold text-slate-450 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:underline transition-colors cursor-pointer"
          >
            Return to Login Gateway
          </button>
        </div>

      </div>
    </div>
  );
}
