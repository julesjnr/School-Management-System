import React, { useState } from 'react';
import {
  TrendingUp,
  Sparkles,
  Calculator,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from 'lucide-react';
import { Student } from '../types';
import { subjectMap } from '../data';
import {
  buildGpaTrend,
  computeCumulativeGpa,
  gpaStandingLabel,
} from '../utils/academicMetrics';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface PerformanceInsightsProps {
  student: Student;
}

export default function PerformanceInsights({ student }: PerformanceInsightsProps) {
  const [targetGoal, setTargetGoal] = useState<number>(3.6);

  const cumulativeGPA = computeCumulativeGpa(student.grades);
  const trend = buildGpaTrend(student.grades);

  const data = trend.map((point, index) => {
    const codes = Object.keys(student.grades);
    // Approximate module list for tooltip: first N graded codes in sort order
    const codesSorted = [...Object.entries(student.grades)].sort((a, b) => {
      const da = a[1].gradedAt || '';
      const db = b[1].gradedAt || '';
      if (da && db) return da.localeCompare(db);
      return a[0].localeCompare(b[0]);
    });
    const included = codesSorted.slice(0, index + 1).map(([code]) => subjectMap[code] || code);
    return {
      semester: point.label,
      label: point.label,
      GPA: point.gpa,
      courses: included.join(', ') || 'Graded modules',
      status: index === trend.length - 1 ? 'Active' : 'Completed',
    };
  });

  const standingTitle =
    cumulativeGPA === null
      ? 'No standing yet'
      : cumulativeGPA >= 3.7
        ? 'First Class Honours'
        : cumulativeGPA >= 3.0
          ? 'Second Class (Upper Division)'
          : cumulativeGPA >= 2.0
            ? 'Second Class (Lower Division)'
            : 'Pass Division';

  const standingColor =
    cumulativeGPA === null
      ? 'text-slate-600 bg-slate-50 border-slate-200'
      : cumulativeGPA >= 3.7
        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
        : cumulativeGPA >= 3.0
          ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
          : cumulativeGPA >= 2.0
            ? 'text-amber-700 bg-amber-50 border-amber-200'
            : 'text-slate-600 bg-slate-50 border-slate-200';

  const pointsTracked = data.length;
  const momentum =
    data.length >= 2
      ? Number((data[data.length - 1].GPA - data[data.length - 2].GPA).toFixed(2))
      : 0;

  // Forecast assumes up to 8 grading checkpoints for a full programme (presentation heuristic).
  const totalProgrammePoints = 8;
  const remainingPoints = Math.max(0, totalProgrammePoints - pointsTracked);
  const gpaBase = cumulativeGPA ?? 0;
  const requiredGPA =
    remainingPoints > 0
      ? Number(((targetGoal * totalProgrammePoints - gpaBase * pointsTracked) / remainingPoints).toFixed(2))
      : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-3 shadow-xl max-w-xs space-y-1 text-xs">
          <div className="flex justify-between items-center border-b border-white/10 pb-1">
            <span className="font-bold text-blue-400 font-mono">{dataPoint.label}</span>
            <span
              className={`text-[8.5px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-bold ${
                dataPoint.status === 'Active'
                  ? 'bg-amber-600/30 text-amber-400'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {dataPoint.status}
            </span>
          </div>
          <p className="font-black text-sm text-slate-100 font-mono">
            GPA: <span className="text-white">{dataPoint.GPA.toFixed(2)} / 4.00</span>
          </p>
          <div className="text-[10px] text-slate-400 font-normal leading-relaxed">
            <span className="block font-bold text-[9px] text-slate-500 uppercase tracking-wide mt-1">
              Modules included:
            </span>
            {dataPoint.courses}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="bg-white border border-slate-150 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6"
      id="performance-insights-widget"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Academic Performance Insights</span>
            <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> GPA Trends
            </span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Cumulative GPA built from published grades in the database (ordered by graded date).
          </p>
        </div>
      </div>

      {cumulativeGPA === null ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No grades published yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Performance insights appear once CAT or exam marks are recorded for your enrolled modules.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Cumulative GPA
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-slate-850 font-mono">
                  {cumulativeGPA.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">/ 4.00</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1">{gpaStandingLabel(cumulativeGPA)}</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Academic Division
              </span>
              <span className={`text-xs font-bold mt-1.5 truncate px-1.5 py-0.5 rounded border ${standingColor}`}>
                {standingTitle}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Graded Modules
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xl font-black text-slate-855 font-mono">{pointsTracked}</span>
                <span className="text-[9px] uppercase font-semibold text-slate-400">Units</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                GPA Momentum
              </span>
              <div className="flex items-center gap-1.5 mt-1.5">
                {pointsTracked < 2 ? (
                  <span className="text-[11px] font-bold text-slate-400">Need more grades</span>
                ) : momentum >= 0 ? (
                  <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                    <span>+{momentum.toFixed(2)}</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 flex items-center gap-1">
                    <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                    <span>{momentum.toFixed(2)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 sm:p-4">
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gpaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="semester"
                    stroke="#64748b"
                    fontSize={10}
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 4.0]}
                    ticks={[0, 1.0, 2.0, 3.0, 4.0]}
                    stroke="#64748b"
                    fontSize={10}
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeDasharray: '2 2' }} />
                  <ReferenceLine
                    y={3.7}
                    stroke="#a855f7"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: 'First Class (3.70)',
                      fill: '#a855f7',
                      fontSize: 8,
                      fontWeight: 'bold',
                      position: 'top',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="GPA"
                    stroke="#2563eb"
                    strokeWidth={3.5}
                    fillOpacity={1}
                    fill="url(#gpaGradient)"
                    activeDot={{ r: 7, stroke: '#ffffff', strokeWidth: 2, fill: '#2563eb' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-2 mt-2 bg-white/70 border border-slate-100 rounded-lg p-2 text-[10px] text-slate-550">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>
                Each point is cumulative GPA after a graded module from the grades table — not simulated history.
              </span>
            </div>
          </div>

          <div className="bg-indigo-50/20 border border-indigo-100 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Target Cumulative GPA Forecaster
                </h4>
                <p className="text-[11px] text-indigo-700/80 mt-0.5 leading-relaxed">
                  Planning helper only. Assumes up to {totalProgrammePoints} graded checkpoints for a full programme until a degree plan table exists. Remaining checkpoints: {remainingPoints}.
                </p>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-150 rounded-xl space-y-4 shadow-3xs">
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-655 uppercase tracking-wider text-[9px]">
                      Your Cumulative Goal
                    </span>
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-mono font-black">
                      GPA: {targetGoal.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2.0"
                    max="4.0"
                    step="0.05"
                    value={targetGoal}
                    onChange={(e) => setTargetGoal(Number(e.target.value))}
                    className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer mt-2"
                  />
                </div>

                <div className="sm:border-l border-slate-150 sm:pl-5 flex flex-col justify-center shrink-0 min-w-[140px] text-center sm:text-left">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    Required Avg / Checkpoint
                  </span>
                  <div className="mt-1">
                    {requiredGPA <= 0 ? (
                      <span className="text-emerald-600 text-lg font-black font-mono">Already Met!</span>
                    ) : requiredGPA > 4.0 ? (
                      <span className="text-rose-500 text-sm font-black font-mono">{requiredGPA.toFixed(2)}</span>
                    ) : (
                      <span className="text-indigo-700 text-lg font-bold font-mono">{requiredGPA.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-start gap-2 text-[10.5px] leading-relaxed text-slate-600">
                <Zap
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    requiredGPA > 4.0 ? 'text-rose-500' : 'text-amber-500'
                  }`}
                />
                <div>
                  {requiredGPA <= 0 ? (
                    <span>
                      Your current cumulative GPA of <b>{cumulativeGPA.toFixed(2)}</b> already meets this goal.
                    </span>
                  ) : requiredGPA > 4.0 ? (
                    <span>
                      Target {targetGoal.toFixed(2)} needs {requiredGPA.toFixed(2)} average (above 4.0). Choose a closer goal.
                    </span>
                  ) : (
                    <span>
                      To reach <b>{targetGoal.toFixed(2)}</b>, future graded modules need about{' '}
                      <b>{requiredGPA.toFixed(2)}</b> average GPA.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
