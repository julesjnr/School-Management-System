import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Clock,
  CreditCard,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  Loader2,
  MapPin,
} from 'lucide-react';
import { Student, Course } from '../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface DashboardSummary {
  gpa: number | null;
  gpaLabel: string;
  attendanceRate: number | null;
  activeModules: number;
  outstandingFees: number;
  gpaTrend: Array<{ semester: string; GPA: number; label?: string }>;
  degreeProgress: {
    completed: number;
    required: number;
    percent: number;
    note?: string;
  };
  deliverables: Array<{
    id: string;
    title: string;
    detail: string;
    priority: 'high' | 'normal' | 'done';
    type: string;
  }>;
  nextLecture: null;
  scheduleAvailable: boolean;
}

interface StudentVisualSummaryDashboardProps {
  student: Student;
  allCourses: Course[];
  onNavigateTab: (
    tab: 'dashboard' | 'grades' | 'financials' | 'materials' | 'units' | 'officeHours' | 'library'
  ) => void;
  timerSeconds: number;
  setTimerSeconds: React.Dispatch<React.SetStateAction<number>>;
  timerActive: boolean;
  setTimerActive: React.Dispatch<React.SetStateAction<boolean>>;
  timerMode: 'focus' | 'break';
  setTimerMode: React.Dispatch<React.SetStateAction<'focus' | 'break'>>;
  formatTimer: (secs: number) => string;
}

export default function StudentVisualSummaryDashboard({
  student,
  onNavigateTab,
  timerSeconds,
  setTimerSeconds,
  timerActive,
  setTimerActive,
  timerMode,
  formatTimer,
}: StudentVisualSummaryDashboardProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!student.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/student/dashboard-summary?studentId=${encodeURIComponent(student.id)}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load dashboard (${res.status})`);
      }
      const data = await res.json();
      setSummary(data);
    } catch (err: any) {
      console.error('Dashboard summary error:', err);
      setError(err.message || 'Failed to load dashboard summary');
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [student.id]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Loading academic dashboard…</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 p-8 flex flex-col items-center justify-center gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-rose-500" />
        <p className="text-sm font-semibold text-slate-800">Could not load dashboard data</p>
        <p className="text-xs text-slate-500 max-w-md">{error || 'Unknown error'}</p>
        <button
          type="button"
          onClick={fetchSummary}
          className="mt-2 text-xs font-bold text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    gpa,
    gpaLabel,
    attendanceRate,
    activeModules,
    outstandingFees,
    gpaTrend,
    degreeProgress,
    deliverables,
  } = summary;

  const gpaChartData = gpaTrend.map((p) => ({
    semester: p.label || p.semester,
    GPA: p.GPA,
  }));

  const yDomain: [number, number] =
    gpaChartData.length > 0
      ? [
          Math.max(0, Math.min(...gpaChartData.map((d) => d.GPA)) - 0.5),
          Math.min(4, Math.max(...gpaChartData.map((d) => d.GPA)) + 0.3),
        ]
      : [0, 4];

  return (
    <div className="space-y-6" id="student-visual-summary-container">
      {/* HIGH-DENSITY SUMMARY STRIP */}
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 p-6 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800"
        id="summary-metrics-row"
      >
        <div className="flex items-center justify-between pr-4 md:pr-0 md:px-4 first:pl-0">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block font-sans">
              Cumulative GPA
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                {gpa !== null ? gpa.toFixed(2) : '—'}
              </span>
              {gpa !== null && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                  {gpaLabel}
                </span>
              )}
            </div>
            {gpa === null && (
              <p className="text-[10px] text-slate-400">No grades published yet</p>
            )}
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 md:pt-0 pr-4 md:pr-0 md:px-6">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block font-sans">
              Attendance Rate
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                {attendanceRate !== null ? `${attendanceRate}%` : '—'}
              </span>
              {attendanceRate !== null && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400">
                  {attendanceRate >= 75 ? 'Eligible' : 'Below 75%'}
                </span>
              )}
            </div>
            {attendanceRate === null && (
              <p className="text-[10px] text-slate-400">No attendance records yet</p>
            )}
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 md:pt-0 pr-4 md:pr-0 md:px-6">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block font-sans">
              Active Modules
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                {activeModules} Units
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-650 dark:bg-indigo-950/20 dark:text-indigo-400">
                Enrolled
              </span>
            </div>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 md:pt-0 pr-4 md:pr-0 md:pl-6 last:pr-0">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block font-sans">
              Outstanding Fees
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-xl font-black font-mono ${
                  outstandingFees > 0 ? 'text-rose-650' : 'text-slate-800 dark:text-white'
                }`}
              >
                KES {Number(outstandingFees).toLocaleString()}
              </span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  outstandingFees > 0
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'
                }`}
              >
                {outstandingFees > 0 ? 'Pending' : 'Cleared'}
              </span>
            </div>
          </div>
          <div
            className={`p-3 rounded-xl ${
              outstandingFees > 0
                ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600'
                : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-605'
            }`}
          >
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* MIDDLE ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch" id="summary-middle-row">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs lg:col-span-8 flex flex-col justify-between min-h-[280px]">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Academic Progress & GPA Trends
              </h3>
              <p className="text-[9px] text-slate-500">
                Cumulative GPA as grades are published (from the grades table).
              </p>
            </div>
          </div>
          {gpaChartData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-slate-400">
              <TrendingUp className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm font-semibold text-slate-600">No grade history yet</p>
              <p className="text-xs mt-1 max-w-xs">
                GPA trend will appear once lecturers publish CAT or exam marks for your modules.
              </p>
            </div>
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={gpaChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGpa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                  <XAxis dataKey="semester" stroke="#94a3b8" fontSize={9} className="font-mono" />
                  <YAxis stroke="#94a3b8" fontSize={9} domain={yDomain} className="font-mono" />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="GPA"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorGpa)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs lg:col-span-4 flex flex-col justify-between min-h-[280px]">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <span className="text-[9px] font-bold text-slate-455 uppercase tracking-widest block font-mono">
              Academic Schedule
            </span>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white mt-0.5 flex items-center gap-1.5 font-display">
              <Calendar className="w-4 h-4 text-blue-600" />
              Next Up Lecture
            </h3>
          </div>
          <div className="py-4 flex-1 flex flex-col items-center justify-center text-center px-2">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No timetable available</p>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Lecture schedules are not stored in the database yet. A timetable table is required before this widget can show real sessions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('materials')}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-100 dark:shadow-none"
          >
            <span>Open Study Materials</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="summary-bottom-row">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs flex flex-col h-auto min-h-[280px]">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                <AlertCircle className="w-4 h-4 text-blue-650" />
                Academic Deliverables
              </h3>
              <p className="text-[9px] text-slate-550">Generated from fees, enrollments, grades, and attendance.</p>
            </div>
            {deliverables.length > 0 && (
              <span className="text-[8px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                {deliverables.length} open
              </span>
            )}
          </div>
          {deliverables.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-slate-700">You are all caught up</p>
              <p className="text-xs mt-1">No outstanding fees, enrollment gaps, or attendance alerts.</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1 text-xs">
              {deliverables.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-850 rounded-lg ${
                    item.priority === 'high' ? 'border-l-2 border-red-500' : ''
                  }`}
                >
                  <div className="space-y-0.5 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-205">{item.title}</p>
                    <p className="text-[9.5px] text-slate-500 font-medium">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs flex flex-col items-center h-auto min-h-[280px]">
          <div className="w-full text-left">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                <Layers className="w-4 h-4 text-emerald-600" />
                Degree Audit Completion
              </h3>
              <p className="text-[9px] text-slate-550">Passed modules vs active catalogue courses.</p>
            </div>
          </div>
          <div className="relative inline-flex items-center justify-center py-4 flex-1">
            <svg className="w-32 h-32 transform -rotate-90" aria-hidden>
              <circle
                cx="64"
                cy="64"
                r="50"
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r="50"
                className="stroke-emerald-500"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={314.16}
                strokeDashoffset={314.16 - (314.16 * degreeProgress.percent) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-2xl font-black text-slate-800 dark:text-white font-mono block">
                {degreeProgress.percent}%
              </span>
              <span className="text-[7.5px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
                {degreeProgress.percent >= 70 ? 'On Track' : degreeProgress.percent > 0 ? 'In Progress' : 'Starting'}
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-medium text-center font-mono leading-relaxed px-4">
            Passed modules: {degreeProgress.completed} / {degreeProgress.required}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between h-auto min-h-[280px]">
          <div>
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-505" />
                Focus Study Timer
              </h3>
              <p className="text-[9px] text-slate-550">
                Local Pomodoro tool (not stored in the database).
              </p>
            </div>
            <div className="text-center py-4 space-y-3">
              <div className="font-mono text-4xl font-black text-slate-800 dark:text-white tracking-widest bg-slate-55 dark:bg-slate-850 py-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                {formatTimer(timerSeconds)}
              </div>
              <div className="flex items-center justify-center gap-2">
                <span
                  className={`text-[9.5px] uppercase font-bold px-3 py-1 rounded-full ${
                    timerMode === 'focus'
                      ? 'bg-amber-50 text-amber-700 border border-amber-100'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  }`}
                >
                  {timerMode === 'focus' ? 'Focusing study' : 'Short break'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTimerActive(!timerActive)}
              className={`flex-1 py-2.5 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer shadow-xs transition-colors ${
                timerActive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-650 hover:bg-blue-750'
              }`}
            >
              {timerActive ? 'Pause Session' : 'Start Focus'}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimerActive(false);
                setTimerSeconds(timerMode === 'focus' ? 1500 : 300);
              }}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-350 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
