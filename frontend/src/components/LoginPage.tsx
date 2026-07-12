import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, User, Users, GraduationCap, ArrowRight, X, 
  Library, LockKeyhole, Landmark, ChevronRight, HelpCircle, 
  BookOpen, Calculator, Sparkles, KeyRound, School
} from 'lucide-react';
import { Student, Lecturer, UserRole } from '../types';
import PasswordRecoveryModal from './PasswordRecoveryModal';

interface LoginPageProps {
  students: Student[];
  lecturers: Lecturer[];
  onLogin: (role: UserRole, userId: string) => void;
  onClose: () => void;
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

export default function LoginPage({ 
  students, 
  lecturers, 
  onLogin, 
  onClose
}: LoginPageProps) {
  const [activePortal, setActivePortal] = useState<ExtendedRole>('student');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [emailText, setEmailText] = useState<string>('');
  const [passcode, setPasscode] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);

  useEffect(() => {
    handlePortalSwitch(activePortal);
  }, []);

  const handlePortalSwitch = (portal: ExtendedRole) => {
    setActivePortal(portal);
    setErrorText('');
    setPasscode('');
    
    if (portal === 'admin') {
      setSelectedUser('admin');
      setEmailText('admin@zenti.edu');
      setPasscode('admin123');
    } else {
      setSelectedUser('');
      setEmailText('');
      if (portal === 'accountant') {
        setPasscode('acc123');
      } else if (portal === 'librarian') {
        setPasscode('lib123');
      }
    }
  };

  // Sync email text field when selected profile dropdown changes
  const handleUserSelectChange = (userId: string) => {
    setSelectedUser(userId);
    setErrorText('');
    
    if (activePortal === 'student') {
      const profile = students.find(s => s.id === userId);
      if (profile) setEmailText(profile.email);
    } else {
      const profile = lecturers.find(l => l.id === userId);
      if (profile) setEmailText(profile.email);
    }
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
      gradient: 'from-emerald-600 to-teal-955',
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
          localStorage.setItem('zenti_session_token', data.token);
          
          if (data.role === 'lecturer' && data.profile?.isAccountant) {
            onLogin('accountant', data.userId);
          } else {
            onLogin(data.role, data.userId);
          }
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

  const getRoleIcon = (roleId: ExtendedRole, size: string = "w-5 h-5") => {
    switch (roleId) {
      case 'student': return <GraduationCap className={size} />;
      case 'lecturer': return <Users className={size} />;
      case 'accountant': return <Landmark className={size} />;
      case 'librarian': return <BookOpen className={size} />;
      case 'admin': return <LockKeyhole className={size} />;
    }
  };

  const getActiveOptions = () => {
    switch (activePortal) {
      case 'student':
        return students.map(s => ({ id: s.id, name: s.name, extra: s.admissionNo }));
      case 'lecturer':
        return lecturers.filter(l => !l.isAccountant && !l.isLibrarian).map(l => ({ id: l.id, name: l.name, extra: l.designatorCode }));
      case 'accountant':
        return lecturers.filter(l => l.isAccountant).map(l => ({ id: l.id, name: l.name, extra: l.designatorCode }));
      case 'librarian':
        return (lecturers.filter(l => l.isLibrarian).length > 0 
          ? lecturers.filter(l => l.isLibrarian) 
          : [lecturers.find(l => l.id === 'l3') || lecturers[0]].filter(Boolean) as Lecturer[]
        ).map(l => ({ id: l.id, name: l.name, extra: l.designatorCode }));
      default:
        return [];
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
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white dark:bg-slate-900 transition-colors duration-300">
      
      {/* 1. LEFT SIDE - Thematic brand visual graphic/color block */}
      <div className={`w-full md:w-[45%] lg:w-[40%] bg-gradient-to-br ${currentConfig.gradient} text-white p-10 md:p-14 flex flex-col justify-between relative overflow-hidden shrink-0`}>
        
        {/* Decorative background grids */}
        <div className="absolute inset-0 opacity-10 font-mono text-[9px] select-none pointer-events-none leading-relaxed overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="whitespace-nowrap tracking-widest leading-none py-0.5">
              {`MIS_SEC_LEVEL_${activePortal.toUpperCase()}_TOKEN_STATE_0x${(i * 1234).toString(16).toUpperCase()}_VALIDATED_ACCESS_GRANTED`}
            </div>
          ))}
        </div>

        <div className="relative z-10 space-y-12">
          {/* Brand Logo & School Header */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={onClose}>
            <div className="w-11 h-11 bg-white text-blue-600 rounded-xl flex items-center justify-center font-black shadow-lg">
              <School className="w-6 h-6" />
            </div>
            <div>
              <span className="font-mono text-[10px] tracking-widest text-slate-350 font-bold block uppercase leading-none">Management MIS</span>
              <span className="font-extrabold text-white text-lg leading-none tracking-tight">ZENTI UNIVERSITY</span>
            </div>
          </div>

          {/* Presentation Headline */}
          <div className="space-y-4 pt-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-xs border border-white/10 text-[9.5px] font-black tracking-widest uppercase rounded-full">
              {getRoleIcon(activePortal, "w-3 h-3 text-amber-300")}
              <span>{currentConfig.tagline}</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black font-display tracking-tight leading-tight">
              {currentConfig.name}
            </h2>
            <p className="text-sm text-blue-100 dark:text-slate-300 leading-relaxed font-light">
              {currentConfig.description}
            </p>
          </div>

          {/* Authorized Scope List */}
          <div className="space-y-3.5 pt-4 border-t border-white/10">
            <span className="text-[10px] uppercase font-mono tracking-widest text-white/60 font-bold block">Authorized Gateway Scope</span>
            <ul className="space-y-2">
              {currentConfig.features.map((feat, index) => (
                <li key={index} className="flex items-start gap-2.5 text-xs text-blue-50/90 leading-tight">
                  <ChevronRight className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Secure SSL confirmation footer */}
        <div className="relative z-10 pt-10 border-t border-white/5 flex items-center justify-between text-xs text-white/65 font-mono">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>SSL SECURE PORTAL</span>
          </div>
          <span>256-BIT CRYPTO</span>
        </div>
      </div>


      {/* 2. RIGHT SIDE - Switchable Portals & Login Form */}
      <div className="flex-1 p-8 md:p-14 lg:p-20 flex flex-col justify-between bg-slate-50 dark:bg-slate-900/40 relative min-h-screen md:min-h-0">
        
        {/* Top bar with back to homepage button */}
        <div className="flex justify-between items-center mb-8 shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Cancel and return to homepage"
          >
            <X className="w-4 h-4" />
            <span>Return to Homepage</span>
          </button>
          
          <span className="text-[10px] bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Portal V1.2.0
          </span>
        </div>

        <div className="max-w-md w-full mx-auto space-y-8 flex-1 flex flex-col justify-center">
          
          {/* Switchboard header */}
          <div className="space-y-2 text-center md:text-left">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Choose Portal Access</h4>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Select your gateway role</h2>
          </div>

          {/* Role Portal Selector switchboard grid */}
          <div className="grid grid-cols-5 gap-2" id="login-role-switchboard">
            {(Object.keys(portalConfigs) as ExtendedRole[]).map((roleId) => {
              const isActive = activePortal === roleId;
              const config = portalConfigs[roleId];
              return (
                <button
                  key={roleId}
                  type="button"
                  onClick={() => handlePortalSwitch(roleId)}
                  className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 border transition-all text-center cursor-pointer ${
                    isActive
                      ? `border-${config.themeColor}-500 bg-white dark:bg-slate-800 text-${config.themeColor}-700 dark:text-${config.themeColor}-400 font-bold shadow-md scale-105 ring-2 ring-${config.themeColor}-100 dark:ring-0`
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/30'
                  }`}
                  title={config.name}
                >
                  <div className={`p-1.5 rounded-xl ${isActive ? `bg-${config.themeColor}-50 dark:bg-${config.themeColor}-950/20 text-${config.themeColor}-650` : 'text-slate-400'}`}>
                    {getRoleIcon(roleId, "w-4 h-4")}
                  </div>
                  <span className="text-[10px] tracking-tight leading-none capitalize font-bold">{roleId}</span>
                </button>
              );
            })}
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800" />

          {/* Core Login Form */}
          <form onSubmit={handleFormSubmit} className="space-y-5">
            
            {/* Error notifications */}
            {errorText && (
              <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs px-4 py-3 rounded-xl border border-rose-100 dark:border-rose-950/30 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-ping"></span>
                <span>{errorText}</span>
              </div>
            )}

            {/* Manual Blind Input Selection */}
            {activePortal !== 'admin' && (
              <div className="space-y-1.5">
                <label htmlFor="login-identifier-input" className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                  {activePortal === 'student' ? 'Admission Number / Email' : 'Staff Code / Email'}:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="login-identifier-input"
                    type="text"
                    required
                    value={selectedUser}
                    onChange={(e) => {
                      setSelectedUser(e.target.value);
                      setErrorText('');
                    }}
                    placeholder={activePortal === 'student' ? 'e.g. CSC6/0639/24 or email' : 'e.g. LEC-402 or email'}
                    className="w-full bg-white dark:bg-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-3 py-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 shadow-2xs font-medium"
                  />
                </div>
              </div>
            )}

            {/* Password input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="login-password-field" className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                  Portal Passcode
                </label>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase font-medium">Auto-prefilled for demo</span>
              </div>
              <div className="relative">
                <input
                  id="login-password-field"
                  type="password"
                  value={passcode}
                  onChange={(e) => { setPasscode(e.target.value); setErrorText(''); }}
                  placeholder="Enter passcode"
                  className="w-full bg-white dark:bg-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-850 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-mono shadow-2xs"
                  required
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
            </div>

            {/* Remember me & Forgot Password Row */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-slate-550 dark:text-slate-450 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                  className="rounded-sm border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500/10" 
                />
                <span className="font-semibold">Remember Me</span>
              </label>
              
              <button
                type="button"
                onClick={() => setIsRecoveryMode(true)}
                className="font-bold text-blue-650 hover:text-blue-750 dark:text-blue-400 dark:hover:text-blue-300 hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>


            {/* Sign In primary button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full mt-2 text-white font-black py-3 px-6 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-155 cursor-pointer text-center shadow-lg hover:shadow-xl ${currentConfig.buttonBg} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>{isSubmitting ? 'Signing In...' : `Sign In`}</span>
              <ArrowRight className={`w-4 h-4 ${isSubmitting ? 'animate-ping' : ''}`} />
            </button>

          </form>
        </div>

        {/* Footer info */}
        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest text-center mt-8 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <span>ZENTI UNIVERSITY SYSTEMS</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Secure System Active</span>
          </div>
        </div>

      </div>

    </div>
  );
}
