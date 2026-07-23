import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, User, Users, GraduationCap, ArrowRight, X, 
  Library, LockKeyhole, Landmark, ChevronRight, HelpCircle, 
  BookOpen, Calculator, Sparkles, KeyRound, Radio
} from 'lucide-react';
import { Student, Lecturer, UserRole } from '../types';
import PasswordRecoveryModal from './PasswordRecoveryModal';

interface LoginModalProps {
  students: Student[];
  lecturers: Lecturer[];
  onLogin: (role: UserRole, userId: string) => void;
  onClose: () => void;
  allowedPortals?: ExtendedRole[];
  initialPortal?: ExtendedRole;
}

type ExtendedRole = 'student' | 'lecturer' | 'accountant' | 'librarian' | 'admin';

interface RolePortalConfig {
  id: ExtendedRole;
  name: string;
  tagline: string;
  themeColor: 'blue' | 'violet' | 'emerald' | 'amber' | 'slate';
  themeBg: string;
  brandColor: string;
  accentBg: string;
  textColor: string;
  buttonBg: string;
  hoverBg: string;
  gradient: string;
  description: string;
  features: string[];
}

export default function LoginModal({ 
  students, 
  lecturers, 
  onLogin, 
  onClose,
  allowedPortals,
  initialPortal
}: LoginModalProps) {
  const [activePortal, setActivePortal] = useState<ExtendedRole>(() => {
    if (initialPortal) return initialPortal;
    if (allowedPortals && allowedPortals.length > 0) return allowedPortals[0];
    return 'student';
  });
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [passcode, setPasscode] = useState<string>('');
  const [errorText, setErrorText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const autoSelectUserForPortal = (portal: ExtendedRole) => {
    if (portal === 'student' && students.length > 0) {
      setSelectedUser(students[0].id);
      setPasscode('student123');
    } else if (portal === 'lecturer' && lecturers.length > 0) {
      const standardLec = lecturers.find(l => !l.isAccountant && !l.isLibrarian) || lecturers[0];
      setSelectedUser(standardLec.id);
      setPasscode('lecturer123');
    } else if (portal === 'accountant') {
      const accountantLec = lecturers.find(l => l.isAccountant) || lecturers[0];
      setSelectedUser(accountantLec ? accountantLec.id : '');
      setPasscode('acc123');
    } else if (portal === 'librarian') {
      const librarianLec = lecturers.find(l => l.isLibrarian) || lecturers.find(l => l.id === 'l3') || lecturers[0];
      setSelectedUser(librarianLec ? librarianLec.id : '');
      setPasscode('lib123');
    } else if (portal === 'admin') {
      setSelectedUser('admin');
      setPasscode('admin123');
    }
  };

  useEffect(() => {
    autoSelectUserForPortal(activePortal);
  }, [students, lecturers, activePortal]);

  // Password Recovery States
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);
  const [recoveryEmail, setRecoveryEmail] = useState<string>('');
  const [recoverySuccess, setRecoverySuccess] = useState<boolean>(false);
  const [recoveredPasscode, setRecoveredPasscode] = useState<string>('');

  // Auto-select first item when portal changes to ensure smooth UX
  const handlePortalSwitch = (portal: ExtendedRole) => {
    setActivePortal(portal);
    setErrorText('');
    autoSelectUserForPortal(portal);
  };

  const portalConfigs: Record<ExtendedRole, RolePortalConfig> = {
    student: {
      id: 'student',
      name: 'Undergraduate Student Hub',
      tagline: 'Student Academic Portal Access',
      themeColor: 'blue',
      themeBg: 'bg-blue-600',
      brandColor: 'text-blue-600',
      accentBg: 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border-blue-100 dark:border-blue-900/50',
      textColor: 'text-blue-600 dark:text-blue-400',
      buttonBg: 'bg-blue-600 hover:bg-blue-700 shadow-blue-100 dark:shadow-none',
      hoverBg: 'hover:bg-blue-50/80 dark:hover:bg-blue-950/20',
      gradient: 'from-blue-600 to-indigo-900',
      description: 'Your central hub for academic progress, lecture modules, registered units, grades, billing ledgers, and digital libraries.',
      features: [
        'Real-time grades (CAT, Exam grids)',
        'Class attendance telemetry logs',
        'Academic fee statement invoices',
        'LMS digital textbook loans & feedback',
        'Syllabus & dynamic office hours booking'
      ],
    },
    lecturer: {
      id: 'lecturer',
      name: 'Faculty Workspace Console',
      tagline: 'Academic Instructors Entrance',
      themeColor: 'violet',
      themeBg: 'bg-violet-600',
      brandColor: 'text-violet-600',
      accentBg: 'bg-violet-50 dark:bg-violet-950/30 text-violet-800 dark:text-violet-300 border-violet-100 dark:border-violet-900/50',
      textColor: 'text-violet-600 dark:text-violet-400',
      buttonBg: 'bg-violet-600 hover:bg-violet-700 shadow-violet-100 dark:shadow-none',
      hoverBg: 'hover:bg-violet-50/80 dark:hover:bg-violet-950/20',
      gradient: 'from-violet-600 to-purple-900',
      description: 'The secure gateway for course directors, professors, and adjunct faculty to administrate classes and review statistics.',
      features: [
        'Direct student grades spreadsheet editing',
        'Logged hours payroll tracking',
        'Interactive office hours slot scheduler',
        'Class research publication indices',
        'Curriculum reading list dispatch'
      ],
    },
    accountant: {
      id: 'accountant',
      name: 'Corporate Finance & Ledger',
      tagline: 'Treasury & Disbursements Office',
      themeColor: 'emerald',
      themeBg: 'bg-emerald-600',
      brandColor: 'text-emerald-600',
      accentBg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 dark:shadow-none',
      hoverBg: 'hover:bg-emerald-50/80 dark:hover:bg-emerald-950/20',
      gradient: 'from-emerald-600 to-teal-950',
      description: 'Audited double-entry ledger portal for fee reconciliation, corporate partnerships, budgeting, and operations payroll routing.',
      features: [
        'Corporate partner supplier databases',
        'Auditable debit/credit double-entry vouchers',
        'Departmental expenditure ceilings & warning alerts',
        'Financial audit trail logs with category filters',
        'Excel-compatible CSV spreadsheet export'
      ],
    },
    librarian: {
      id: 'librarian',
      name: 'Bibliotheca Catalog & Archivist',
      tagline: 'Library HQ Control Room',
      themeColor: 'amber',
      themeBg: 'bg-amber-600',
      brandColor: 'text-amber-600',
      accentBg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-100 dark:border-amber-900/50',
      textColor: 'text-amber-600 dark:text-amber-400',
      buttonBg: 'bg-amber-600 hover:bg-amber-700 shadow-amber-100 dark:shadow-none',
      hoverBg: 'hover:bg-amber-50/80 dark:hover:bg-amber-950/20',
      gradient: 'from-amber-600 to-red-950',
      description: 'Archive control station to track textbook procurement, catalog checkout logs, overdue fines, and physical gate entries.',
      features: [
        'Comprehensive textbook master catalogs',
        'Real-time checkout, return and damage audits',
        'Student hold request approval & comments',
        'Physical library gate attendance logs',
        'Procurement feedback & suggestion routing'
      ],
    },
    admin: {
      id: 'admin',
      name: 'System Administrator Gateway',
      tagline: 'Master Operational Command Station',
      themeColor: 'slate',
      themeBg: 'bg-slate-700',
      brandColor: 'text-slate-700',
      accentBg: 'bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-850',
      textColor: 'text-slate-700 dark:text-slate-300',
      buttonBg: 'bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600',
      hoverBg: 'hover:bg-slate-100 dark:hover:bg-slate-900/30',
      gradient: 'from-slate-700 to-slate-950',
      description: 'High-security master operations center granting global database reads, profile creation, and core system parameters allocation.',
      features: [
        'Global HR payroll & ledger oversight',
        'Granular role-management permission assigns',
        'Undergraduate profile registrations & removals',
        'Lecturer faculty appointments & code allocations',
        'Audit telemetry and procurement clearances'
      ],
    }
  };

  const currentConfig = portalConfigs[activePortal];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    if (activePortal !== 'admin' && !selectedUser.trim()) {
      setErrorText(`Please enter your ${activePortal === 'student' ? 'Admission Number or Email' : 'Staff ID or Email'}.`);
      return;
    }

    // Invalidate stale local sessions before starting a new authentication request
    localStorage.removeItem('zenti_session_token');
    localStorage.removeItem('zenti_pending_password_change');

    setIsSubmitting(true);

    fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: activePortal,
        userId: activePortal === 'admin' ? 'admin' : selectedUser.trim(),
        passcode: passcode,
      }),
    })
      .then(async (res) => {
        const text = await res.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(text || `Server error (Status ${res.status})`);
        }
        if (!res.ok) {
          throw new Error(data.error || `Authentication failed (Status ${res.status})`);
        }
        return data;
      })
      .then((data) => {
        if (data.success) {
          if (data.status === 'REQUIRES_PASSWORD_CHANGE') {
            localStorage.setItem('zenti_pending_password_change', JSON.stringify({
              userId: data.userId,
              role: data.role,
              email: data.email
            }));
            onClose();
            window.history.pushState({}, '', '/change-password');
            window.dispatchEvent(new Event('popstate'));
            return;
          }

          // Store security session details
          localStorage.setItem('zenti_session_token', data.token);
          
          if (data.role === 'lecturer' && data.profile?.isAccountant) {
            onLogin('accountant', data.userId);
          } else {
            onLogin(data.role, data.userId);
          }
          onClose();
        } else {
          setErrorText(data.error || 'Identity authentication failed.');
        }
      })
      .catch((err) => {
        setErrorText(err.message || 'Unable to establish secure gateway connection.');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = recoveryEmail.trim().toLowerCase();

    if (!email) {
      setErrorText('Please enter your registered email address.');
      return;
    }

    // Check for Admin
    if (email === 'admin@zenti.edu' || email === 'admin' || email === 'admin123' || email.includes('admin@')) {
      setRecoveredPasscode('admin123');
      setRecoverySuccess(true);
      setErrorText('');
      return;
    }

    // Check lecturers
    const matchedLecturer = lecturers.find(l => l.email.toLowerCase() === email);
    if (matchedLecturer) {
      if (matchedLecturer.isAccountant) {
        setRecoveredPasscode('acc123');
      } else if (matchedLecturer.isLibrarian || matchedLecturer.id === 'l3') {
        setRecoveredPasscode('lib123');
      } else {
        setRecoveredPasscode(''); // Stud / Standard Lec requiring no password
      }
      setRecoverySuccess(true);
      setErrorText('');
      return;
    }

    // Check students
    const matchedStudent = students.find(s => s.email.toLowerCase() === email);
    if (matchedStudent) {
      setRecoveredPasscode(''); // Stud requiring no password
      setRecoverySuccess(true);
      setErrorText('');
      return;
    }

    setErrorText(`We could not locate any account matching "${recoveryEmail}". Please verify or try "admin@zenti.edu" or any valid mock student/lecturer email address.`);
  };

  const getRoleIcon = (roleId: ExtendedRole, size: string = "w-5 h-5") => {
    switch (roleId) {
      case 'student': return <GraduationCap className={size} />;
      case 'lecturer': return <Users className={size} />;
      case 'accountant': return <Landmark className={size} />;
      case 'librarian': return <BookOpen className={size} />;
      case 'admin': return <LockKeyhole className={size} />;
    }
  };

  // Filter lists for custom selections
  const studentsOptions = students.map(s => ({ id: s.id, name: s.name, extra: s.admissionNo }));
  const lecturersOptions = lecturers.filter(l => !l.isAccountant && !l.isLibrarian).map(l => ({ id: l.id, name: l.name, extra: l.designatorCode }));
  const accountantsOptions = lecturers.filter(l => l.isAccountant).map(l => ({ id: l.id, name: l.name, extra: l.designatorCode }));
  // If no explicitly designated librarians exist yet, let's allow Sarah Kendi l3 or any lecturer as librarian option for safety
  const librariansOptions = (lecturers.filter(l => l.isLibrarian).length > 0 
    ? lecturers.filter(l => l.isLibrarian) 
    : [lecturers.find(l => l.id === 'l3') || lecturers[0]].filter(Boolean) as Lecturer[]
  ).map(l => ({ id: l.id, name: l.name, extra: l.designatorCode }));

  const getActiveOptions = () => {
    switch (activePortal) {
      case 'student': return studentsOptions;
      case 'lecturer': return lecturersOptions;
      case 'accountant': return accountantsOptions;
      case 'librarian': return librariansOptions;
      default: return [];
    }
  };

  if (isRecoveryMode) {
    return (
      <PasswordRecoveryModal
        isOpen={isRecoveryMode}
        onClose={() => {
          setIsRecoveryMode(false);
          onClose();
        }}
        onSwitchToLogin={() => setIsRecoveryMode(false)}
        students={students}
        lecturers={lecturers}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 dark:bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      
      {/* Immersive Login Panel Container */}
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-5xl sm:rounded-3xl shadow-2xl flex flex-col md:flex-row min-h-screen sm:min-h-[640px] max-h-none sm:max-h-[92vh] overflow-hidden border border-slate-100 dark:border-slate-800">
        
        {/* LEFT COMPARTMENT: Thematic Visual Card that dynamically updates based on the selected Portal */}
        <div className={`w-full md:w-[42%] bg-gradient-to-br ${currentConfig.gradient} text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden shrink-0`}>
          
          {/* Ambient matrix background effect */}
          <div className="absolute inset-0 opacity-10 font-mono text-[9px] select-none pointer-events-none leading-relaxed overflow-hidden">
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} className="whitespace-nowrap tracking-widest leading-none py-0.5">
                {`MIS_SEC_SEC_LEVEL_${activePortal.toUpperCase()}_TOKEN_STATE_0x${(i * 1234).toString(16).toUpperCase()}_VALIDATED_TRUE_ACCESS_GRANTED`}
              </div>
            ))}
          </div>

          <div className="relative z-10 space-y-8">
            {/* Header branding */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/25 flex items-center justify-center font-bold text-sm">
                ED
              </div>
              <div>
                <span className="font-mono text-[10px] tracking-widest text-slate-300 font-bold block uppercase leading-none">Global MIS</span>
                <span className="font-extrabold text-white text-base leading-none">Zenti Campus</span>
              </div>
            </div>

            {/* Main Presentation heading */}
            <div className="space-y-4 pt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-xs border border-white/15 text-[10px] font-black tracking-widest uppercase rounded-full">
                {getRoleIcon(activePortal, "w-3 h-3 text-amber-300")}
                <span>{currentConfig.tagline}</span>
              </div>
              <h2 className="text-3xl font-black font-display tracking-tight leading-tight">
                {currentConfig.name}
              </h2>
              <p className="text-xs text-blue-100 dark:text-slate-300 leading-relaxed font-light">
                {currentConfig.description}
              </p>
            </div>

            {/* Granular security parameters features list */}
            <div className="space-y-2.5 pt-2 border-t border-white/10">
              <span className="text-[10px] uppercase font-mono tracking-widest text-white/60 font-bold block">Authorized Gateway Scope</span>
              <ul className="space-y-1.5">
                {currentConfig.features.map((feat, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs text-blue-50/90 leading-tight">
                    <ChevronRight className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Secure SSL confirmation footer note */}
          <div className="relative z-10 pt-8 border-t border-white/5 flex items-center justify-between text-[11px] text-white/65 font-mono">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>SSL SECURE PORTAL</span>
            </div>
            <span>256-BIT CRYPTO</span>
          </div>
        </div>


        {/* RIGHT COMPARTMENT: Switchable Portals Selectors & Login Forms */}
        <div className="flex-1 p-8 md:p-10 flex flex-col justify-between bg-white dark:bg-slate-900 relative">
          
          {/* Close trigger anchor */}
          <button 
            type="button" 
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full cursor-pointer"
            title="Cancel and return to homepage"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-6">
            {isRecoveryMode ? (
              <div className="space-y-6 animate-fade-in">
                {/* Got back & header */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Credential Recovery</h4>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                    Recover your sandbox credentials using your registered email
                  </p>
                </div>

                {recoverySuccess ? (
                  <div className="space-y-5">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-905/25 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl flex flex-col items-center text-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Identity Found!</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Zenti campus secure lookup successfully validated the profile credentials.
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                      {recoveredPasscode ? (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Active Sandbox Access Code:</span>
                          <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl font-mono">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-widest">{recoveredPasscode}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(recoveredPasscode);
                              }}
                              className="text-[10px] font-mono text-blue-600 hover:underline hover:text-blue-700 cursor-pointer"
                            >
                              Copy
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-450 leading-relaxed font-light">
                            Copy this passcode, return to the login panel, select your profile, and enter it to access your workspace.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block font-mono">Instant Sandbox Authorization:</span>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-normal font-bold">
                            No passcode is required for Student and standard Faculty accounts!
                          </p>
                          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                            Simply head back to the login selector, match your profile from the pre-populated listings, and hit the <strong className="text-blue-600 dark:text-blue-400 font-extrabold font-mono hover:underline">"Authenticate"</strong> button to sign in directly.
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsRecoveryMode(false);
                        setRecoverySuccess(false);
                      }}
                      className="w-full bg-slate-855 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 text-white font-extrabold py-3 px-6 rounded-xl text-xs uppercase tracking-wider cursor-pointer text-center"
                    >
                      Return to Access Panel
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRecoverySubmit} className="space-y-4">
                    {errorText && (
                      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs px-3.5 py-3 rounded-xl border border-red-105 dark:border-red-950 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>
                        <span>{errorText}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label htmlFor="recovery-email-field" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">
                        Registered Email Address
                      </label>
                      <div className="relative">
                        <input
                          id="recovery-email-field"
                          type="email"
                          required
                          value={recoveryEmail}
                          onChange={(e) => { setRecoveryEmail(e.target.value); setErrorText(''); }}
                          placeholder="e.g. admin@zenti.edu, student email, etc."
                          className="w-full bg-slate-50 dark:bg-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-850 rounded-xl p-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-sans"
                        />
                        <HelpCircle className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                      </div>
                      <p className="text-[10.5px] text-slate-400 dark:text-slate-500 leading-normal font-light">
                        Enter any mock student/lecturer email to resolve their login requirements. For master administrative permissions, search with <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono font-bold text-slate-700 dark:text-slate-300">admin@zenti.edu</code>.
                      </p>
                    </div>

                    <div className="space-y-2 pt-1.5">
                      <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-6 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer text-center shadow-md shadow-blue-100 dark:shadow-none"
                      >
                        <span>Scan & Recover Credentials</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsRecoveryMode(false);
                          setErrorText('');
                        }}
                        className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer text-center"
                      >
                        Back to Login select
                      </button>
                    </div>

                    <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/40 dark:border-blue-900/10 rounded-xl text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                      <span className="font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-widest block mb-1 font-mono">Sandbox Passkeys Reference:</span>
                      <ul className="list-disc list-inside space-y-0.5 font-light">
                        <li>Global Admin passcode: <code className="font-mono font-bold text-slate-700 dark:text-slate-300">admin123</code></li>
                        <li>Finance Accountant passcode: <code className="font-mono font-bold text-slate-700 dark:text-slate-300">acc123</code></li>
                        <li>Bibliotheca Librarian passcode: <code className="font-mono font-bold text-slate-700 dark:text-slate-300">lib123</code></li>
                      </ul>
                    </div>
                  </form>
                )}
              </div>
            ) : (() => {
              const portalsToRender = (Object.keys(portalConfigs) as ExtendedRole[]).filter(
                roleId => !allowedPortals || allowedPortals.includes(roleId)
              );
              return (
                <>
                  {/* Title description of selection */}
                  {portalsToRender.length > 1 && (
                    <>
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Select Access Gateway</h4>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                          Choose your designated role to enter your custom login page:
                        </p>
                      </div>

                      {/* Custom Interactive 5 Roles Door Selector Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" id="role-gateway-switchboard">
                        {portalsToRender.map((roleId) => {
                          const isActive = activePortal === roleId;
                          const config = portalConfigs[roleId];
                          return (
                            <button
                              key={roleId}
                              type="button"
                              onClick={() => handlePortalSwitch(roleId)}
                              className={`p-3 rounded-xl flex flex-col items-center gap-2 border transition-all text-center cursor-pointer ${
                                isActive
                                  ? `border-${config.themeColor}-500 bg-${config.themeColor}-50 dark:bg-${config.themeColor}-950/20 text-${config.themeColor}-700 dark:text-${config.themeColor}-400 font-bold shadow-xs scale-102 ring-2 ring-${config.themeColor}-100 dark:ring-0`
                                  : 'border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100/65 dark:hover:bg-slate-800'
                              }`}
                            >
                              <div className={`p-1.5 rounded-lg ${isActive ? `bg-${config.themeColor}-200/50 text-${config.themeColor}-700 dark:text-${config.themeColor}-400` : 'text-slate-400 bg-slate-150 dark:bg-slate-800'}`}>
                                {getRoleIcon(roleId, "w-4 h-4")}
                              </div>
                              <span className="text-[11px] tracking-tight leading-tight capitalize font-medium">{roleId}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Separator decorator */}
                      <div className="h-px bg-slate-100 dark:bg-slate-800 my-4" />
                    </>
                  )}

                  {/* Portal specific Login Form */}
                  <form onSubmit={handleFormSubmit} className="space-y-4" id={`form-portal-${activePortal}`}>
                    
                    {/* Error box */}
                    {errorText && (
                      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs px-3.5 py-3 rounded-xl border border-red-100 dark:border-red-950 font-medium animate-shake">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>
                        <span>{errorText}</span>
                      </div>
                    )}

                    {/* Manual Blind Input Selection */}
                    {activePortal !== 'admin' && (
                      <div className="space-y-1.5">
                        <label htmlFor="user-identity-input" className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-widest">
                          {activePortal === 'student' ? 'Admission Number / Email' : 'Staff Code / Email'}:
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                            <User className="w-4 h-4" />
                          </span>
                          <input
                            id="user-identity-input"
                            type="text"
                            required
                            value={selectedUser}
                            onChange={(e) => {
                              setSelectedUser(e.target.value);
                              setErrorText('');
                            }}
                            placeholder={activePortal === 'student' ? 'e.g. CSC6/0639/24 or email' : 'e.g. LEC-402 or email'}
                            className="w-full bg-slate-50 dark:bg-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-850 rounded-xl pl-10 pr-3 py-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-100 focus:border-slate-400"
                          />
                        </div>
                      </div>
                    )}

                  {/* Dynamic Passcode fields for All Portals */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label htmlFor="portal-passcode-field" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {activePortal === 'admin' 
                          ? 'Master Administrative Pin' 
                          : activePortal === 'accountant' 
                            ? 'Financial Security passkey' 
                            : activePortal === 'librarian' 
                              ? 'Librarian Security passcode' 
                              : 'Account passcode'}
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        id="portal-passcode-field"
                        type="password"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 dark:bg-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-850 rounded-xl p-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-100 focus:border-slate-500 font-mono"
                        required
                      />
                      <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    </div>
                  </div>

                  {/* Submit trigger button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full mt-2 text-white font-black py-3 px-6 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer text-center ${currentConfig.buttonBg} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span>{isSubmitting ? 'Authenticating Secure Portal...' : `Authenticate ${currentConfig.name.split(' ')[0]} Portal`}</span>
                    <ArrowRight className={`w-4 h-4 ${isSubmitting ? 'animate-ping' : ''}`} />
                  </button>

                  <div className="flex justify-center mt-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecoveryMode(true);
                        setErrorText('');
                        setRecoveryEmail('');
                        setRecoverySuccess(false);
                        setRecoveredPasscode('');
                      }}
                      className="text-[10.5px] font-bold text-slate-450 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:underline transition-colors cursor-pointer"
                    >
                      Forgot Password or need login help?
                    </button>
                  </div>
                </form>
              </>
            )})()}
          </div>

          {/* Clean footer */}
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest text-center mt-6 pt-4 border-t border-slate-50 dark:border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Zenti MIS Integration Base</span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Gateway Server Live: Secure SSL</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
