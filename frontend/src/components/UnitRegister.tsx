import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNotification } from './notifications';
import {
  BookOpen,
  Plus,
  Sparkles,
  Trash2,
  Loader2,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  GraduationCap,
  Layers,
  Hourglass,
  TrendingUp,
  CalendarDays,
  UserRound,
} from 'lucide-react';
import { Course, Lecturer } from '../types';

const CREDITS_PER_UNIT = 3;
const SEMESTER_LABEL = 'Semester 1 · 2026';

export interface EnrolledUnit {
  courseCode: string;
  courseTitle: string;
  description?: string;
  duration?: string;
  faculty?: string;
  fees?: string;
  thumbnail?: string;
  enrolledAt?: string;
  attendedLectures: number | null;
  totalLectures: number;
  lectures: string;
  attendanceRate: number | null;
  submittedAssignments: number | null;
  totalAssignments: number | null;
  assignments: string;
  assignmentRate: number | null;
  overallProgress: number | null;
  completionPercentage: number | null;
}

export interface ModuleItem {
  code: string;
  title: string;
  programmeTags: string[];
  semester: string;
  credits: number;
}

export const CURRICULUM_MODULES: ModuleItem[] = [
  { code: 'DS-202-ML', title: 'Intro to Machine Learning (DS)', programmeTags: ['Data Science', 'BDS', 'DS'], semester: 'Semester 1', credits: 3 },
  { code: 'DS-202-Stats', title: 'Computational Statistics (DS)', programmeTags: ['Data Science', 'BDS', 'DS'], semester: 'Semester 1', credits: 3 },
  { code: 'CS-101-Web', title: 'Web Technologies II (CS)', programmeTags: ['Computer Science', 'BCS', 'CS', 'Information Technology', 'BIT'], semester: 'Semester 1', credits: 3 },
  { code: 'CS-101-Algo', title: 'Design & Analysis of Algorithms (CS)', programmeTags: ['Computer Science', 'BCS', 'CS', 'Software Engineering', 'BSE'], semester: 'Semester 1', credits: 3 },
  { code: 'CYBER-310-Crypto', title: 'Applied Cryptography & Signatures (CYBER)', programmeTags: ['Cybersecurity', 'CYBER', 'Computer Science', 'BCS'], semester: 'Semester 1', credits: 3 },
  { code: 'EE-201-Circuits', title: 'Analog Circuit Analysis (EE)', programmeTags: ['Electrical Engineering', 'EE'], semester: 'Semester 1', credits: 3 },
  { code: 'BIT1101', title: 'Database Systems & Management', programmeTags: ['Information Technology', 'BIT', 'Business Information Technology', 'BBIT'], semester: 'Semester 1', credits: 3 },
  { code: 'BSE1101', title: 'Software Requirement Engineering', programmeTags: ['Software Engineering', 'BSE'], semester: 'Semester 1', credits: 3 },
];

interface UnitRegisterProps {
  studentId: string;
  allCourses: Course[];
  lecturers?: Lecturer[];
  onRegisterUnit?: (unitCode: string) => Promise<void> | void;
  onDeregisterUnit?: (unitCode: string) => Promise<void> | void;
  subjectMap?: Record<string, string>;
  studentProgramme?: string;
}

function formatLecturerName(name: string): string {
  if (!name || name.toLowerCase() === 'unassigned') return 'Unassigned';
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function resolveLecturerName(code: string, lecturers: Lecturer[]): string {
  const match = lecturers.find((l) => Array.isArray(l.subjects) && l.subjects.includes(code));
  return match?.name ? formatLecturerName(match.name) : 'Unassigned';
}

function resolveUnitName(code: string, rawTitle?: string, subjectMap: Record<string, string> = {}): string {
  const catalogMatch = CURRICULUM_MODULES.find((m) => m.code === code);
  if (catalogMatch) return catalogMatch.title;
  if (subjectMap[code] && !subjectMap[code].startsWith('Bachelor of')) return subjectMap[code];
  const programMap: Record<string, string> = {
    'BDS': 'Intro to Machine Learning (DS)',
    'BCS': 'Web Technologies II (CS)',
    'BIT': 'Database Systems & Management',
    'BBIT': 'Enterprise Systems & E-Commerce',
    'BSE': 'Software Architecture & Design',
  };
  if (programMap[code]) return programMap[code];
  if (rawTitle && !rawTitle.startsWith('Bachelor of')) return rawTitle;
  return subjectMap[code] || code;
}

function registrationStatusLabel(registered: number, remaining: number): {
  label: string;
  className: string;
} {
  if (registered === 0) {
    return {
      label: 'Not Started',
      className: 'bg-slate-100 text-slate-600 border-slate-200',
    };
  }
  if (remaining <= 0) {
    return {
      label: 'Complete',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }
  return {
    label: 'In Progress',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  };
}

export const UnitRegister: React.FC<UnitRegisterProps> = ({
  studentId,
  allCourses,
  lecturers = [],
  onRegisterUnit,
  onDeregisterUnit,
  subjectMap = {},
  studentProgramme,
}) => {
  const { showError, showSuccess, showConfirm } = useNotification();
  const enrollSelectRef = useRef<HTMLSelectElement>(null);
  const enrollPanelRef = useRef<HTMLDivElement>(null);

  const [registeredUnits, setRegisteredUnits] = useState<EnrolledUnit[]>([]);
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Drop Workflow & Deadline States
  const [isPastDeadline, setIsPastDeadline] = useState<boolean>(false);
  const [registrationDeadline, setRegistrationDeadline] = useState<string>('');
  const [dropRequests, setDropRequests] = useState<any[]>([]);

  // Modal States
  const [requestDropUnit, setRequestDropUnit] = useState<EnrolledUnit | null>(null);
  const [dropReasonText, setDropReasonText] = useState<string>('');
  const [isSubmittingDropRequest, setIsSubmittingDropRequest] = useState<boolean>(false);

  const fetchRegisteredUnits = useCallback(async () => {
    if (!studentId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/student/registered-units?studentId=${encodeURIComponent(studentId)}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch active units (${response.status})`);
      }
      const data = await response.json();
      setRegisteredUnits(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching registered units:', err);
      setError(err.message || 'Failed to load active unit registrations');
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  const fetchDeadlineAndDropRequests = useCallback(async () => {
    try {
      const [deadlineRes, dropRes] = await Promise.all([
        fetch('/api/system/registration-deadline'),
        studentId ? fetch(`/api/unit-drop-requests?studentId=${encodeURIComponent(studentId)}`) : null,
      ]);

      if (deadlineRes.ok) {
        const dData = await deadlineRes.json();
        setIsPastDeadline(!!dData.isPastDeadline);
        setRegistrationDeadline(dData.deadline || '');
      }

      if (dropRes && dropRes.ok) {
        const rData = await dropRes.json();
        setDropRequests(Array.isArray(rData) ? rData : []);
      }
    } catch (err) {
      console.error('Error fetching registration deadline or drop requests:', err);
    }
  }, [studentId]);

  useEffect(() => {
    fetchRegisteredUnits();
    fetchDeadlineAndDropRequests();
  }, [fetchRegisteredUnits, fetchDeadlineAndDropRequests]);

  const handleAddUnitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitCode || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/student-enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          courseCode: selectedUnitCode,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to complete module registration');
      }

      if (onRegisterUnit) {
        await onRegisterUnit(selectedUnitCode);
      }

      setSelectedUnitCode('');
      showSuccess('Module Registered', `Successfully registered module ${selectedUnitCode}`);
      await fetchRegisteredUnits();
    } catch (err: any) {
      console.error('Error registering module:', err);
      showError('Module Registration Error', err.message || 'Could not register unit module');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct Drop Before Deadline
  const handleDirectDropUnit = async (unit: EnrolledUnit) => {
    const unitName = resolveUnitName(unit.courseCode, unit.courseTitle, subjectMap);

    // Validation: Cannot drop completed units
    if (unit.completionPercentage === 100 || unit.overallProgress === 100) {
      showError('Drop Not Allowed', `Unit ${unit.courseCode} has already been completed and cannot be dropped.`);
      return;
    }

    const confirmed = await showConfirm({
      title: 'Confirm Unit Drop',
      message: `Are you sure you want to drop unit: ${unit.courseCode} — ${unitName}?\nThis action will immediately remove your registration record.`,
      confirmText: 'Confirm Drop',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/student-enrollments?studentId=${encodeURIComponent(studentId)}&courseCode=${encodeURIComponent(unit.courseCode)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to drop unit module');
      }

      if (onDeregisterUnit) {
        await onDeregisterUnit(unit.courseCode);
      }

      showSuccess('Unit Dropped', `Unit ${unit.courseCode} has been successfully dropped.`);
      await fetchRegisteredUnits();
      await fetchDeadlineAndDropRequests();
    } catch (err: any) {
      console.error('Error dropping module:', err);
      showError('Drop Failed', err.message || 'Could not drop unit module.');
    }
  };

  // Open Request Drop Modal After Deadline
  const handleOpenRequestDropModal = (unit: EnrolledUnit) => {
    // Validation: Cannot drop completed units
    if (unit.completionPercentage === 100 || unit.overallProgress === 100) {
      showError('Drop Not Allowed', `Unit ${unit.courseCode} has already been completed and cannot be dropped.`);
      return;
    }

    // Validation: Duplicate check
    const existingPending = dropRequests.find(
      (r) => r.courseCode === unit.courseCode && r.status === 'Pending Approval'
    );
    if (existingPending) {
      showError('Duplicate Drop Request', `A drop request for unit ${unit.courseCode} is already pending approval.`);
      return;
    }

    setRequestDropUnit(unit);
    setDropReasonText('');
  };

  // Submit Drop Request After Deadline
  const handleSubmitDropRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDropUnit || isSubmittingDropRequest) return;

    const unitName = resolveUnitName(requestDropUnit.courseCode, requestDropUnit.courseTitle, subjectMap);
    const confirmed = await showConfirm({
      title: 'Confirm Drop Request',
      message: `Submit a drop request for ${requestDropUnit.courseCode} — ${unitName}? An administrator must approve it before your registration is removed.`,
      confirmText: 'Submit Request',
      variant: 'danger',
    });
    if (!confirmed) return;

    setIsSubmittingDropRequest(true);

    try {
      const res = await fetch('/api/unit-drop-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          courseCode: requestDropUnit.courseCode,
          unitName,
          reason: dropReasonText.trim() || 'Requested unit drop after registration deadline',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit unit drop request');
      }

      showSuccess('Drop Request Submitted', `Your drop request for ${requestDropUnit.courseCode} has been submitted. Status: Pending Approval.`);
      setRequestDropUnit(null);
      setDropReasonText('');
      await fetchDeadlineAndDropRequests();
    } catch (err: any) {
      console.error('Error submitting drop request:', err);
      showError('Submission Failed', err.message || 'Could not submit drop request.');
    } finally {
      setIsSubmittingDropRequest(false);
    }
  };

  const focusEnrollPanel = () => {
    enrollPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => enrollSelectRef.current?.focus(), 280);
  };

  const normalizedProg = (studentProgramme || '').toLowerCase();
  const matchedProgramModules = CURRICULUM_MODULES.filter((m) => {
    if (!normalizedProg) return true;
    return m.programmeTags.some((tag) => normalizedProg.includes(tag.toLowerCase()) || tag.toLowerCase().includes(normalizedProg));
  });
  const candidateModules = matchedProgramModules.length > 0 ? matchedProgramModules : CURRICULUM_MODULES;

  const registeredCodes = registeredUnits.map((u) => u.courseCode);
  const availableModules = candidateModules.filter((m) => {
    if (registeredCodes.includes(m.code)) return false;
    if (registeredCodes.includes('BDS') && m.code === 'DS-202-ML') return false;
    return true;
  });

  const registeredCount = registeredUnits.length;
  const creditHours = registeredCount * CREDITS_PER_UNIT;
  const totalProgramModules = candidateModules.length;
  const remainingUnits = Math.max(0, totalProgramModules - registeredCount);
  const progressPct = totalProgramModules > 0 ? Math.round((registeredCount / totalProgramModules) * 100) : 0;
  const status = registrationStatusLabel(registeredCount, remainingUnits);

  return (
    <div className="flex flex-col gap-5 w-full min-h-full">
      {/* Page header */}
      <header className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-5 sm:py-5">
        <nav className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mb-2.5" aria-label="Breadcrumb">
          <span>Student Portal</span>
          <ChevronRight className="w-3 h-3 shrink-0 opacity-60" />
          <span className="text-slate-700 font-semibold">Unit Registration</span>
        </nav>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 shrink-0" />
              Unit Registration
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
              Enroll in curriculum modules for the active semester. Registered units appear in your gradebook and lecturer class lists immediately.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
              {SEMESTER_LABEL}
            </span>
            <span
              className={`inline-flex items-center rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                isPastDeadline
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {isPastDeadline ? 'Past Deadline (Requests Only)' : 'Registration Open'}
            </span>
            <span
              className={`inline-flex items-center rounded-lg border px-2.5 py-1.5 text-xs font-bold ${status.className}`}
            >
              {status.label}
            </span>
            <button
              type="button"
              onClick={() => {
                fetchRegisteredUnits();
                fetchDeadlineAndDropRequests();
              }}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-700 transition-colors disabled:opacity-50"
              title="Refresh Registrations"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-auto">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Registered Units</p>
              <p className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">{registeredCount}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-auto">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Credit Hours</p>
              <p className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">{creditHours}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-auto">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Remaining Units</p>
              <p className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">{remainingUnits}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Hourglass className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-auto">
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Registration Progress</p>
              <p className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">{progressPct}%</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, progressPct)}%` }}
            />
          </div>
        </div>
      </section>

      {/* Body: enroll + table */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Enroll panel */}
        <div
          ref={enrollPanelRef}
          id="unit-enroll-panel"
          className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4 h-auto"
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-600" />
              Enroll in a Unit
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Select an available module from the curriculum and confirm registration.
            </p>
          </div>

          {availableModules.length === 0 ? (
            <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-xl border border-emerald-100 text-xs space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                No available modules
              </span>
              <span className="text-emerald-700/90 block">
                All available modules for your programme and semester are registered.
              </span>
            </div>
          ) : (
            <form onSubmit={handleAddUnitRegister} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="unit-selector" className="block text-xs font-semibold text-slate-700">
                  Available module
                </label>
                <select
                  id="unit-selector"
                  ref={enrollSelectRef}
                  value={selectedUnitCode}
                  onChange={(e) => setSelectedUnitCode(e.target.value)}
                  disabled={isSubmitting || availableModules.length === 0}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:opacity-60"
                >
                  <option value="">— Choose module —</option>
                  {availableModules.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.code} — {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!selectedUnitCode || isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  'Complete Registration'
                )}
              </button>
            </form>
          )}

          <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3.5 py-3 text-[11px] text-blue-900/80 leading-relaxed space-y-1">
            <p className="font-bold text-blue-900 text-xs">Academic policy & Drop Rules</p>
            <p>• Before registration deadline: Direct unit drop with instant removal.</p>
            <p>• After registration deadline: Controlled drop request submitted for Academic Admin approval.</p>
          </div>
        </div>

        {/* Registered units table */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-auto flex flex-col">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">My Registered Units</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isLoading
                  ? 'Loading enrollments…'
                  : `${registeredCount} unit${registeredCount === 1 ? '' : 's'} this semester`}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-sm">Loading registered units…</span>
            </div>
          ) : registeredUnits.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center px-6 py-14 sm:py-16">
              <div className="relative mb-5">
                <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <BookOpen className="w-9 h-9 text-slate-300" strokeWidth={1.5} />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Plus className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-800">No units registered yet</h3>
              <p className="text-sm text-slate-500 mt-1.5 max-w-sm leading-relaxed">
                Start your semester by enrolling in at least one curriculum module. Your selections will appear here as a live registration record.
              </p>
              {availableModules.length > 0 && (
                <button
                  type="button"
                  onClick={focusEnrollPanel}
                  className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Register your first unit
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-4 sm:px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Unit Code
                    </th>
                    <th className="px-4 sm:px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Unit Name
                    </th>
                    <th className="px-4 sm:px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Lecturer
                    </th>
                    <th className="px-4 sm:px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
                      Credits
                    </th>
                    <th className="px-4 sm:px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>
                    <th className="px-4 sm:px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registeredUnits.map((unit) => {
                    const unitName = resolveUnitName(unit.courseCode, unit.courseTitle, subjectMap);
                    const lecturerName = resolveLecturerName(unit.courseCode, lecturers);
                    const pendingRequest = dropRequests.find(
                      (r) => r.courseCode === unit.courseCode && r.status === 'Pending Approval'
                    );
                    const isCompleted = unit.completionPercentage === 100 || unit.overallProgress === 100;

                    return (
                      <tr
                        key={unit.courseCode}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-4 sm:px-5 py-3.5">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                            {unit.courseCode}
                          </span>
                        </td>
                        <td className="px-4 sm:px-5 py-3.5">
                          <span className="text-sm font-semibold text-slate-800 block leading-snug">
                            {unitName}
                          </span>
                          <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
                            {unit.courseCode} • Semester 1 • {CREDITS_PER_UNIT} Credits
                          </span>
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 whitespace-nowrap">
                            <UserRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {lecturerName}
                          </span>
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 text-center">
                          <span className="text-sm font-semibold text-slate-800 tabular-nums">
                            {CREDITS_PER_UNIT}
                          </span>
                        </td>
                        <td className="px-4 sm:px-5 py-3.5">
                          {pendingRequest ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                              <Hourglass className="w-3 h-3 text-amber-600 animate-pulse" />
                              Pending Approval
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 text-right">
                          {pendingRequest ? (
                            <span className="text-xs text-amber-700 font-semibold italic">Drop Requested</span>
                          ) : isPastDeadline ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRequestDropModal(unit)}
                              disabled={isCompleted}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title={isCompleted ? 'Completed units cannot be dropped' : 'Request Drop Approval'}
                            >
                              <Hourglass className="w-3.5 h-3.5" />
                              Request Drop
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDirectDropUnit(unit)}
                              disabled={isCompleted}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title={isCompleted ? 'Completed units cannot be dropped' : 'Drop Unit'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Drop
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Modal: Request Drop Reason Form (Post-Deadline Workflow) */}
      {requestDropUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden space-y-4 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Hourglass className="w-5 h-5 text-amber-600" />
                  Request Unit Drop
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Registration deadline has passed. Submitting this request sends it to Academic Administration for review.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <p className="font-semibold">Target Unit:</p>
              <p className="font-mono text-amber-800 font-bold">
                {requestDropUnit.courseCode} — {resolveUnitName(requestDropUnit.courseCode, requestDropUnit.courseTitle, subjectMap)}
              </p>
            </div>

            <form onSubmit={handleSubmitDropRequest} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="drop-reason" className="block text-xs font-semibold text-slate-700">
                  Reason for Drop Request <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  id="drop-reason"
                  rows={3}
                  value={dropReasonText}
                  onChange={(e) => setDropReasonText(e.target.value)}
                  placeholder="State reason for dropping this module after registration deadline…"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRequestDropUnit(null)}
                  disabled={isSubmittingDropRequest}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDropRequest}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isSubmittingDropRequest ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    'Submit Drop Request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitRegister;
