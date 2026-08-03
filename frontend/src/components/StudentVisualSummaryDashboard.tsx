import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Award, Bell, BookOpen, CalendarDays, CheckCircle2, Clock,
  CreditCard, Library, Loader2, MapPin, TrendingUp, WalletCards,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Course, Student } from '../types';

type DashboardTab = 'dashboard' | 'grades' | 'financials' | 'materials' | 'units' | 'officeHours' | 'library';

interface DashboardSummary {
  gpa: number | null;
  gpaLabel: string;
  attendanceRate: number | null;
  activeModules: number;
  requiredUnits: number | null;
  outstandingFees: number;
  gpaTrend: Array<{ semester: string; GPA: number; label?: string }>;
  todaySchedule: Array<{ id: string; time: string; courseCode: string; unitName: string; lecturer: string | null; room: string | null }>;
  registeredUnits: Array<{ courseCode: string; unitName: string; credits: number | null; lecturer: string | null; status: string }>;
  notifications: Array<{ id: string; title: string; message: string; type: string; dateTime: string }>;
  feeSummary: { total: number; paid: number; balance: number; status: string };
}

interface StudentVisualSummaryDashboardProps {
  student: Student;
  allCourses: Course[];
  onNavigateTab: (tab: DashboardTab) => void;
}

const currency = (amount: number) => `KES ${amount.toLocaleString()}`;

export default function StudentVisualSummaryDashboard({ student, onNavigateTab }: StudentVisualSummaryDashboardProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!student.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/student/dashboard-summary?studentId=${encodeURIComponent(student.id)}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Failed to load dashboard data');
      setSummary(body);
    } catch (err: any) {
      setSummary(null);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [student.id]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const firstName = student.name.trim().split(/\s+/)[0] || 'Student';
  const programme = student.programme || student.department || student.cohort || 'Programme not recorded';
  const dateLabel = useMemo(() => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()), []);

  if (isLoading) {
    return <div className="min-h-[360px] rounded-xl border border-slate-200 bg-white flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /> Loading dashboard…</div>;
  }
  if (!summary) {
    return <div className="rounded-xl border border-rose-200 bg-white p-8 text-center"><AlertCircle className="mx-auto h-7 w-7 text-rose-600" /><p className="mt-3 text-sm font-semibold text-slate-900">Dashboard data could not be loaded</p><p className="mt-1 text-xs text-slate-500">{error}</p><button onClick={fetchSummary} className="mt-4 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Retry</button></div>;
  }

  const metricCards = [
    { label: 'CGPA', value: summary.gpa === null ? '—' : summary.gpa.toFixed(2), detail: summary.gpa === null ? 'No grades published' : summary.gpaLabel, icon: Award, tone: 'text-blue-600 bg-blue-50' },
    { label: 'Registered Units', value: summary.requiredUnits ? `${summary.activeModules}/${summary.requiredUnits}` : String(summary.activeModules), detail: summary.requiredUnits ? 'Active / catalogue' : 'Active units', icon: BookOpen, tone: 'text-indigo-600 bg-indigo-50' },
    { label: 'Attendance', value: summary.attendanceRate === null ? '—' : `${summary.attendanceRate}%`, detail: summary.attendanceRate === null ? 'No attendance recorded' : summary.attendanceRate >= 75 ? 'On track' : 'Needs attention', icon: CheckCircle2, tone: summary.attendanceRate !== null && summary.attendanceRate < 75 ? 'text-amber-700 bg-amber-50' : 'text-emerald-600 bg-emerald-50' },
    { label: 'Outstanding Fees', value: currency(summary.outstandingFees), detail: summary.outstandingFees > 0 ? 'Payment required' : 'Account clear', icon: CreditCard, tone: summary.outstandingFees > 0 ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50' },
    { label: 'Next Class', value: summary.todaySchedule[0]?.time || '—', detail: summary.todaySchedule[0]?.courseCode || 'No class today', icon: Clock, tone: 'text-blue-600 bg-blue-50' },
  ];

  return (
    <div className="space-y-5 font-sans" aria-live="polite">
      <header className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-700 to-blue-600 px-5 py-5 text-white shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-medium text-blue-100">Student portal</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Good day, {firstName}</h1><p className="mt-1 text-sm text-blue-100">{programme}</p><p className="mt-1 text-xs text-blue-200">Academic period: {student.cohort || 'Not recorded'}</p></div>
          <div className="flex items-center gap-2 text-xs text-blue-100"><CalendarDays className="h-4 w-4" />{dateLabel}</div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Academic summary">
        {metricCards.map(({ label, value, detail, icon: Icon, tone }) => <div key={label} className="min-h-[108px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div><span className={`rounded-lg p-2 ${tone}`}><Icon className="h-4 w-4" /></span></div></div>)}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Today’s schedule</h2><p className="mt-0.5 text-xs text-slate-500">Classes assigned to your registered units</p></div><CalendarDays className="h-5 w-5 text-blue-600" /></div>{summary.todaySchedule.length === 0 ? <Empty message="No classes scheduled today." /> : <div className="divide-y divide-slate-100">{summary.todaySchedule.map((item) => <div key={item.id} className="grid grid-cols-[86px_1fr] gap-3 py-3 text-sm sm:grid-cols-[100px_1fr_1fr_110px]"><span className="font-medium text-slate-700">{item.time}</span><span><b className="font-medium text-slate-900">{item.courseCode}</b><span className="block text-xs text-slate-500">{item.unitName}</span></span><span className="text-slate-600">{item.lecturer || 'Lecturer not assigned'}</span><span className="flex items-center gap-1 text-slate-600"><MapPin className="h-3.5 w-3.5 text-slate-400" />{item.room || 'Room not set'}</span></div>)}</div>}</section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Notifications</h2><p className="mt-0.5 text-xs text-slate-500">Latest university updates</p></div><Bell className="h-5 w-5 text-blue-600" /></div>{summary.notifications.length === 0 ? <Empty message="No new notifications." /> : <div className="space-y-3">{summary.notifications.map((notification) => <article key={notification.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0"><p className="text-xs font-semibold text-slate-800">{notification.title}</p><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{notification.message}</p><time className="mt-1 block text-[11px] text-slate-400">{new Date(notification.dateTime).toLocaleDateString('en-GB')}</time></article>)}</div>}</section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Registered units</h2><p className="mt-0.5 text-xs text-slate-500">Manage registration from the Unit Registration page.</p></div><button onClick={() => onNavigateTab('units')} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Manage units</button></div>{summary.registeredUnits.length === 0 ? <Empty message="No registered units. Register units to begin your semester." action="Register units" onAction={() => onNavigateTab('units')} /> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead className="border-y border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2.5">Unit code</th><th className="px-3 py-2.5">Unit name</th><th className="px-3 py-2.5">Credits</th><th className="px-3 py-2.5">Lecturer</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5 text-right">Action</th></tr></thead><tbody>{summary.registeredUnits.map((unit) => <tr key={unit.courseCode} className="border-b border-slate-100 last:border-0"><td className="px-3 py-3 font-medium text-slate-800">{unit.courseCode}</td><td className="px-3 py-3 text-slate-700">{unit.unitName}</td><td className="px-3 py-3 text-slate-600">{unit.credits ?? '—'}</td><td className="px-3 py-3 text-slate-600">{unit.lecturer || 'Not assigned'}</td><td className="px-3 py-3"><span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">{unit.status}</span></td><td className="px-3 py-3 text-right"><button onClick={() => onNavigateTab('units')} className="mr-3 font-semibold text-blue-700 hover:underline">View</button><button onClick={() => onNavigateTab('units')} className="font-semibold text-rose-700 hover:underline">Drop / request drop</button></td></tr>)}</tbody></table></div>}</section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-blue-600" /><div><h2 className="text-sm font-semibold text-slate-900">Academic progress</h2><p className="text-xs text-slate-500">CGPA history</p></div></div>{summary.gpaTrend.length >= 2 ? <div className="h-48"><ResponsiveContainer width="100%" height="100%"><AreaChart data={summary.gpaTrend}><defs><linearGradient id="gpaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.22}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3"/><XAxis dataKey="label" fontSize={10}/><YAxis domain={[0, 4]} fontSize={10}/><Tooltip/><Area type="monotone" dataKey="GPA" stroke="#2563eb" strokeWidth={2} fill="url(#gpaFill)"/></AreaChart></ResponsiveContainer></div> : <div className="flex min-h-[192px] flex-col items-center justify-center text-center"><Award className="h-7 w-7 text-blue-200"/><p className="mt-3 text-2xl font-semibold text-slate-900">{summary.gpa === null ? '—' : summary.gpa.toFixed(2)}</p><p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-500">More semesters are required before displaying trends.</p></div>}</section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3"><section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Fee summary</h2><p className="mt-0.5 text-xs text-slate-500">Current finance ledger</p></div><WalletCards className="h-5 w-5 text-blue-600" /></div><dl className="mt-4 space-y-2.5 text-sm"><Row label="Total fees" value={currency(summary.feeSummary.total)} /><Row label="Paid" value={currency(summary.feeSummary.paid)} success /><Row label="Balance" value={currency(summary.feeSummary.balance)} danger={summary.feeSummary.balance > 0} /><Row label="Status" value={summary.feeSummary.status} /></dl><button onClick={() => onNavigateTab('financials')} className="mt-5 w-full rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">Pay fees</button></section><section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"><h2 className="text-sm font-semibold text-slate-900">Quick actions</h2><p className="mt-0.5 text-xs text-slate-500">Go directly to a student service.</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">{[{ label: 'Register Units', tab: 'units', icon: BookOpen }, { label: 'View Results', tab: 'grades', icon: Award }, { label: 'Timetable', tab: 'units', icon: CalendarDays }, { label: 'Library', tab: 'library', icon: Library }, { label: 'Study Materials', tab: 'materials', icon: BookOpen }].map(({ label, tab, icon: Icon }) => <button key={label} onClick={() => onNavigateTab(tab as DashboardTab)} className="flex min-h-[92px] flex-col items-center justify-center rounded-lg border border-slate-200 px-2 text-center text-xs font-medium text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"><Icon className="mb-2 h-5 w-5 text-blue-600" />{label}</button>)}</div></section></div>
    </div>
  );
}

function Empty({ message, action, onAction }: { message: string; action?: string; onAction?: () => void }) { return <div className="flex min-h-[140px] flex-col items-center justify-center text-center"><p className="text-sm font-medium text-slate-600">{message}</p>{action && <button onClick={onAction} className="mt-3 text-xs font-semibold text-blue-700 hover:underline">{action}</button>}</div>; }
function Row({ label, value, success, danger }: { label: string; value: string; success?: boolean; danger?: boolean }) { return <div className="flex justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className={success ? 'font-medium text-emerald-700' : danger ? 'font-medium text-rose-700' : 'font-medium text-slate-800'}>{value}</dd></div>; }
