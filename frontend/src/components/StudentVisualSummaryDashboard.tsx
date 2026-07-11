import React from 'react';
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
  MapPin
} from 'lucide-react';
import { Student, Course } from '../types';
import { subjectMap } from '../data';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface StudentVisualSummaryDashboardProps {
  student: Student;
  allCourses: Course[];
  onNavigateTab: (tab: 'dashboard' | 'grades' | 'financials' | 'materials' | 'units' | 'officeHours' | 'library') => void;
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
  allCourses,
  onNavigateTab,
  timerSeconds,
  setTimerSeconds,
  timerActive,
  setTimerActive,
  timerMode,
  setTimerMode,
  formatTimer
}: StudentVisualSummaryDashboardProps) {
  // Calculations
  const enrolledUnitsCount = student.enrolledUnits.length;
  
  // Pending grades are units enrolled but not yet graded
  const pendingGradesUnits = student.enrolledUnits.filter(
    (code) => student.grades[code] === undefined
  );
  const pendingGradesCount = pendingGradesUnits.length;

  // Unpaid invoices outstanding balance
  const unpaidInvoices = student.ledger.filter(i => i.status === 'unpaid');
  const outstandingBalance = unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  // Total invoice billing history
  const totalInvoiced = student.ledger.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = student.ledger.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
  const paymentProgressPercent = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 100;

  // Static mock data for charts matching student GPA progression
  const gpaData = [
    { semester: 'Yr 1 Sem 1', GPA: 3.4 },
    { semester: 'Yr 1 Sem 2', GPA: 3.5 },
    { semester: 'Yr 2 Sem 1', GPA: 3.6 },
    { semester: 'Yr 2 Sem 2', GPA: 3.72 }
  ];

  return (
    <div className="space-y-6" id="student-visual-summary-container">
      
      {/* HIGH-DENSITY SUMMARY STRIP */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 p-6 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800" id="summary-metrics-row">
        
        {/* GPA Metric */}
        <div className="flex items-center justify-between pr-4 md:pr-0 md:px-4 first:pl-0">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block font-sans">Cumulative GPA</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">3.72</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">Excellent</span>
            </div>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Enrolled Units Metric */}
        <div className="flex items-center justify-between pt-4 md:pt-0 pr-4 md:pr-0 md:px-6">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block font-sans">Attendance Rate</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">95.4%</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400">Regular</span>
            </div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Attendance Metric */}
        <div className="flex items-center justify-between pt-4 md:pt-0 pr-4 md:pr-0 md:px-6">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block font-sans">Active Modules</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">{enrolledUnitsCount} Units</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-650 dark:bg-indigo-950/20 dark:text-indigo-400">Enrolled</span>
            </div>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Tuition Balance Metric */}
        <div className="flex items-center justify-between pt-4 md:pt-0 pr-4 md:pr-0 md:pl-6 last:pr-0">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block font-sans">Outstanding Fees</span>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-black font-mono ${outstandingBalance > 0 ? 'text-rose-650' : 'text-slate-800 dark:text-white'}`}>
                KES {outstandingBalance.toLocaleString()}
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${outstandingBalance > 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'}`}>
                {outstandingBalance > 0 ? 'Pending' : 'Cleared'}
              </span>
            </div>
          </div>
          <div className={`p-3 rounded-xl ${outstandingBalance > 0 ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600' : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-605'}`}>
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* MIDDLE ROW: 2-Column Analytics & Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch" id="summary-middle-row">
        {/* Col 1: GPA Analytics Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs lg:col-span-8 flex flex-col justify-between">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Academic Progress & GPA Trends
              </h3>
              <p className="text-[9px] text-slate-500">Chronological GPA performance markers across completed academic semesters.</p>
            </div>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={gpaData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGpa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                <XAxis dataKey="semester" stroke="#94a3b8" fontSize={9} className="font-mono" />
                <YAxis stroke="#94a3b8" fontSize={9} domain={[3.0, 4.0]} className="font-mono" />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="GPA" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorGpa)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Col 2: Next Up schedule card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs lg:col-span-4 flex flex-col justify-between">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <span className="text-[9px] font-bold text-slate-455 uppercase tracking-widest block font-mono">Academic Schedule</span>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white mt-0.5 flex items-center gap-1.5 font-display">
              <Calendar className="w-4 h-4 text-blue-600 animate-pulse" />
              Next Up Lecture
            </h3>
          </div>
          <div className="py-4 space-y-4 flex-1 flex flex-col justify-center">
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 rounded-xl p-4 space-y-2">
              <span className="text-[8px] bg-blue-105 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                {student.enrolledUnits?.[0] || 'CS-101'}
              </span>
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-205 leading-tight">
                {subjectMap[student.enrolledUnits?.[0] ?? 'CS-101'] ?? 'Web Technologies II'}
              </h4>
              <div className="flex items-center gap-4 text-[10px] text-slate-550 font-medium font-mono pt-1">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> 08:30 AM</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Lecture Hall 4B</span>
              </div>
            </div>
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

      {/* BOTTOM ROW: 3-column deliverables feed, syllabus progress gauge, focus study timer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="summary-bottom-row">
        {/* Column 1: Task Checklist */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between h-[360px]">
          <div>
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                  <AlertCircle className="w-4 h-4 text-blue-650" />
                  Academic Deliverables
                </h3>
                <p className="text-[9px] text-slate-550">Action items for your classes.</p>
              </div>
              <span className="text-[8px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-black tracking-wider uppercase">Active</span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1 text-xs">
              <div className="flex items-start gap-2.5 p-2 bg-slate-50 dark:bg-slate-850 rounded-lg">
                <input type="checkbox" defaultChecked className="mt-0.5 rounded text-blue-650 focus:ring-blue-500 cursor-pointer" />
                <div className="space-y-0.5 text-xs">
                  <p className="font-bold text-slate-400 line-through">Register Sem II Elective</p>
                  <p className="text-[9.5px] text-slate-500">Unit registration closed.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2 bg-slate-50 dark:bg-slate-850 rounded-lg border-l-2 border-red-500">
                <input type="checkbox" className="mt-0.5 rounded text-blue-650 focus:ring-blue-500 cursor-pointer" />
                <div className="space-y-0.5 text-xs">
                  <p className="font-bold text-slate-800 dark:text-slate-205">Submit CS-101 Term Project</p>
                  <p className="text-[9.5px] text-red-505 font-semibold">Due: In 3 days (Portal Upload)</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2 bg-slate-50 dark:bg-slate-850 rounded-lg">
                <input type="checkbox" className="mt-0.5 rounded text-blue-650 focus:ring-blue-500 cursor-pointer" />
                <div className="space-y-0.5 text-xs">
                  <p className="font-bold text-slate-800 dark:text-slate-205">Settle Pending Tuition Fees</p>
                  <p className="text-[9.5px] text-slate-500 font-medium">Reconcile finance invoice balance.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-semibold text-center pt-2 font-mono">
            Check logs regularly
          </div>
        </div>

        {/* Column 2: Syllabus Progress Radial Gauge */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between h-[360px] items-center">
          <div className="w-full text-left">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                <Layers className="w-4 h-4 text-emerald-600 animate-pulse" />
                Degree Audit Completion
              </h3>
              <p className="text-[9px] text-slate-550">Overall major course requirements completion.</p>
            </div>
          </div>
          <div className="relative inline-flex items-center justify-center py-4">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="50" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="8" fill="transparent" />
              <circle cx="64" cy="64" r="50" className="stroke-emerald-500" strokeWidth="8" fill="transparent" strokeDasharray={314.16} strokeDashoffset={314.16 - (314.16 * 72) / 100} strokeLinecap="round" />
            </svg>
            <div className="absolute text-center">
              <span className="text-2xl font-black text-slate-800 dark:text-white font-mono block">72%</span>
              <span className="text-[7.5px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full font-extrabold uppercase tracking-wide">On Track</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-medium text-center font-mono leading-relaxed px-4">
            Major major core systems courses completed: 18 / 25 modules.
          </div>
        </div>

        {/* Column 3: Focus Study Timer */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between h-[360px]">
          <div>
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-505 animate-pulse" />
                Focus Study Timer
              </h3>
              <p className="text-[9px] text-slate-550">Pomodoro focus session timer.</p>
            </div>
            <div className="text-center py-4 space-y-3">
              <div className="font-mono text-4xl font-black text-slate-800 dark:text-white tracking-widest bg-slate-55 dark:bg-slate-850 py-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                {formatTimer(timerSeconds)}
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-[9.5px] uppercase font-bold px-3 py-1 rounded-full ${timerMode === 'focus' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                  {timerMode === 'focus' ? '📚 FOCUSING STUDY' : '☕ SHORT BREAK'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => setTimerActive(!timerActive)}
              className={`flex-1 py-2.5 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer shadow-xs transition-colors ${timerActive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-650 hover:bg-blue-750'}`}
            >
              {timerActive ? 'Pause Session' : 'Start Focus'}
            </button>
            <button 
              type="button" 
              onClick={() => { setTimerActive(false); setTimerSeconds(timerMode === 'focus' ? 1500 : 300); }}
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
