import React from 'react';
import {
  Award,
  Calendar,
  Clock,
  DollarSign,
  Activity,
  AlertCircle,
  MapPin,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { LecturerDashboardSummary } from '../types';

interface LecturerWorkstationDashboardProps {
  summary: LecturerDashboardSummary;
  timerSeconds: number;
  timerActive: boolean;
  timerMode: 'focus' | 'break';
  formatTimer: (secs: number) => string;
  setTimerActive: React.Dispatch<React.SetStateAction<boolean>>;
  setTimerSeconds: React.Dispatch<React.SetStateAction<number>>;
  onOpenAttendance: () => void;
}

export default function LecturerWorkstationDashboard({
  summary,
  timerSeconds,
  timerActive,
  timerMode,
  formatTimer,
  setTimerActive,
  setTimerSeconds,
  onOpenAttendance,
}: LecturerWorkstationDashboardProps) {
  const {
    assignedSubjectsCount,
    loggedHours,
    hourlyRate,
    estimatedPayout,
    nextClass,
    weeklyHours,
    syllabusCoverage,
    tasks,
  } = summary;

  const coveragePercent = syllabusCoverage.percent;
  const gaugeOffset =
    coveragePercent == null
      ? 314.16
      : 314.16 - (314.16 * coveragePercent) / 100;

  return (
    <div className="space-y-6">
      {/* HIGH-DENSITY SUMMARY STRIP */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 p-6 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
        <div className="flex items-center justify-between pr-4 md:pr-0 md:px-4 first:pl-0">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block font-sans">
              Assigned Subjects
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                {assignedSubjectsCount} Units
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-650 dark:bg-indigo-950/20 dark:text-indigo-400">
                {assignedSubjectsCount > 0 ? 'Active' : 'None'}
              </span>
            </div>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 md:pt-0 pr-4 md:pr-0 md:px-6">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block font-sans">
              Hours Logged
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                {loggedHours} Hrs
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400">
                Sessions
              </span>
            </div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 md:pt-0 pr-4 md:pr-0 md:px-6">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block font-sans">
              Hourly Rate
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                KES {hourlyRate.toLocaleString()}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                Live
              </span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 md:pt-0 pr-4 md:pr-0 md:pl-6 last:pr-0">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block font-sans">
              Estimated Payout
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-emerald-650 font-mono">
                KES {estimatedPayout.toLocaleString()}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                Accrued
              </span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* MIDDLE ROW: Analytics & Next Class */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs lg:col-span-8 flex flex-col justify-between">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                <Activity className="w-4 h-4 text-blue-600" />
                Teaching Hours Analytics
              </h3>
              <p className="text-[9px] text-slate-500">
                Weekly teaching load from logged session records.
              </p>
            </div>
          </div>
          <div className="h-60 w-full">
            {weeklyHours.every((w) => w.hours === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-slate-400">
                <Activity className="w-8 h-8 opacity-40" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  No teaching hours logged yet
                </p>
                <p className="text-[10px] max-w-xs">
                  Log lecturing sessions to populate weekly analytics.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyHours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} className="font-mono" />
                  <YAxis stroke="#94a3b8" fontSize={9} className="font-mono" />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorHours)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs lg:col-span-4 flex flex-col justify-between">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block font-mono">
              Class Roster Schedule
            </span>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-violet-650 animate-pulse" />
              Next Assigned Class
            </h3>
          </div>
          <div className="py-4 space-y-4 flex-1 flex flex-col justify-center">
            {nextClass ? (
              <div className="bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100/50 dark:border-violet-900/30 rounded-xl p-4 space-y-2">
                <span className="text-[8px] bg-violet-100 dark:bg-violet-900 text-violet-850 dark:text-violet-250 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                  {nextClass.subjectCode}
                </span>
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-205 leading-tight">
                  {nextClass.subjectTitle}
                </h4>
                <div className="flex flex-col gap-1.5 text-[10px] text-slate-550 font-medium font-mono pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> {nextClass.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {nextClass.startTime} –{' '}
                    {nextClass.endTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {nextClass.room}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-850 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center space-y-2">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  No upcoming class scheduled
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  {assignedSubjectsCount === 0
                    ? 'Assign subjects before a class roster can appear.'
                    : 'No future timetable entries for your assigned subjects.'}
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenAttendance}
            disabled={!nextClass && assignedSubjectsCount === 0}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-violet-100 dark:shadow-none"
          >
            <span>Mark Class Attendance</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between h-[360px]">
          <div>
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                  <AlertCircle className="w-4 h-4 text-violet-650" />
                  Faculty Task List
                </h3>
                <p className="text-[9px] text-slate-550">Action items from live academic data.</p>
              </div>
              <span className="text-[8px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                {tasks.filter((t) => t.priority === 'high').length > 0 ? 'Active' : 'Clear'}
              </span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1 text-xs">
              {tasks.length === 0 ? (
                <div className="flex items-start gap-2.5 p-2 bg-slate-50 dark:bg-slate-850 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div className="space-y-0.5 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-205">All caught up</p>
                    <p className="text-[9.5px] text-slate-500">No pending faculty tasks right now.</p>
                  </div>
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-start gap-2.5 p-2 bg-slate-50 dark:bg-slate-850 rounded-lg ${
                      task.priority === 'high' ? 'border-l-2 border-red-500' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!task.completed || task.priority === 'done'}
                      readOnly
                      className="mt-0.5 rounded text-violet-650 focus:ring-violet-500 cursor-default"
                    />
                    <div className="space-y-0.5 text-xs">
                      <p
                        className={`font-bold ${
                          task.completed || task.priority === 'done'
                            ? 'text-slate-400 line-through'
                            : 'text-slate-800 dark:text-slate-205'
                        }`}
                      >
                        {task.title}
                      </p>
                      <p
                        className={`text-[9.5px] ${
                          task.priority === 'high'
                            ? 'text-red-505 font-semibold'
                            : 'text-slate-500'
                        }`}
                      >
                        {task.detail}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-semibold text-center pt-2 font-mono">
            Check tasks regularly
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between h-[360px] items-center">
          <div className="w-full text-left">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                Course Syllabus Gauge
              </h3>
              <p className="text-[9px] text-slate-550">Overall curriculum coverage milestone.</p>
            </div>
          </div>
          <div className="relative inline-flex items-center justify-center py-4">
            <svg className="w-32 h-32 transform -rotate-90">
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
                className={coveragePercent == null ? 'stroke-slate-300' : 'stroke-emerald-500'}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={314.16}
                strokeDashoffset={gaugeOffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-2xl font-black text-slate-800 dark:text-white font-mono block">
                {coveragePercent == null ? '—' : `${coveragePercent}%`}
              </span>
              <span className="text-[7.5px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
                {coveragePercent == null
                  ? 'N/A'
                  : coveragePercent >= 50
                    ? 'On Track'
                    : 'Behind'}
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-medium text-center font-mono leading-relaxed px-4">
            {syllabusCoverage.note}
            {syllabusCoverage.plannedTopics > 0 && (
              <span className="block mt-1 text-slate-400">
                {syllabusCoverage.completedSessions}/{syllabusCoverage.plannedTopics} topics
                covered
              </span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between h-[360px]">
          <div>
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                Focus Study Timer
              </h3>
              <p className="text-[9px] text-slate-555">Pomodoro focus session timer.</p>
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
                  {timerMode === 'focus' ? 'FOCUSING WORK' : 'SHORT BREAK'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTimerActive(!timerActive)}
              className={`flex-1 py-2.5 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer shadow-xs transition-colors ${
                timerActive
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-violet-650 hover:bg-violet-700'
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

export function LecturerWorkstationLoading() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
      <p className="text-sm font-medium">Loading faculty workstation…</p>
    </div>
  );
}

export function LecturerWorkstationError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 p-8 flex flex-col items-center justify-center gap-3 text-center">
      <AlertCircle className="w-8 h-8 text-rose-500" />
      <p className="text-sm font-semibold text-slate-800">Could not load faculty dashboard</p>
      <p className="text-xs text-slate-500 max-w-md">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 text-xs font-bold text-violet-600 hover:underline"
      >
        Retry
      </button>
    </div>
  );
}
