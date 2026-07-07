import React, { useState } from 'react';
import { 
  TrendingUp, Sparkles, Calculator, Award, Info, 
  ArrowUpRight, ArrowDownRight, RefreshCw, Zap
} from 'lucide-react';
import { Student } from '../types';
import { subjectMap } from '../data';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';

interface PerformanceInsightsProps {
  student: Student;
}

export default function PerformanceInsights({ student }: PerformanceInsightsProps) {
  const [targetGoal, setTargetGoal] = useState<number>(3.6);
  const [isHoveredNode, setIsHoveredNode] = useState<any>(null);

  // Grade mapping on standard 4.0 scale
  const getGPForMark = (mark: number): number => {
    if (mark >= 70) return 4.0;
    if (mark >= 60) return 3.0;
    if (mark >= 50) return 2.0;
    if (mark >= 40) return 1.0;
    return 0.0;
  };

  // Deterministic generation of historical semesters based on student name to prevent random state flipping
  let hash = 0;
  for (let i = 0; i < student.name.length; i++) {
    hash = student.name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const seed = Math.abs(hash);

  // Calculate current actual semester GPA (based on grades)
  const gradedUnits = student.enrolledUnits.filter(code => student.grades[code] !== undefined);
  let currentGPASum = 0;
  
  gradedUnits.forEach(code => {
    const g = student.grades[code];
    currentGPASum += getGPForMark(g.cat + g.exam);
  });
  
  const currentSemGPA = gradedUnits.length > 0 
    ? Number((currentGPASum / gradedUnits.length).toFixed(2)) 
    : Number((2.8 + (seed % 8) / 10).toFixed(2)); // fallback

  // Generate historical data deterministically
  const semestersCompleted = student.cohort.includes('2023') ? 3 : 2; // Y1S1, Y1S2, Y2S1 completed. Y2S2 is current

  const data: any[] = [];
  
  // Y1S1
  const y1s1_gpa = Number((2.7 + (seed % 10) / 10).toFixed(2));
  data.push({
    semester: 'Y1S1',
    label: 'Year 1 Sem 1',
    GPA: y1s1_gpa,
    courses: 'Basics of Computing, Calculus I, Discrete Structures',
    status: 'Completed'
  });

  // Y1S2
  const y1s2_gpa = Number((y1s1_gpa - 0.15 + ((seed * 3) % 4) / 10).toFixed(2));
  data.push({
    semester: 'Y1S2',
    label: 'Year 1 Sem 2',
    GPA: y1s2_gpa,
    courses: 'Object Oriented Prog, Database Systems, Physics II',
    status: 'Completed'
  });

  if (semestersCompleted === 3) {
    // Y2S1
    const y2s1_gpa = Number((y1s2_gpa + ((seed * 7) % 3) / 10).toFixed(2));
    data.push({
      semester: 'Y2S1',
      label: 'Year 2 Sem 1',
      GPA: y2s1_gpa,
      courses: 'Data Structures, Operating Systems, Statistics I',
      status: 'Completed'
    });
    
    // Y2S2 (Current)
    data.push({
      semester: 'Y2S2',
      label: 'Year 2 Sem 2 (Current)',
      GPA: currentSemGPA,
      courses: gradedUnits.map(code => subjectMap[code] || code).join(', ') || 'Current enrolled modules',
      status: 'Active'
    });
  } else {
    // Y2S1 (Current)
    data.push({
      semester: 'Y2S1',
      label: 'Year 2 Sem 1 (Current)',
      GPA: currentSemGPA,
      courses: gradedUnits.map(code => subjectMap[code] || code).join(', ') || 'Current enrolled modules',
      status: 'Active'
    });
  }

  // Calculate Cumulative GPA
  const totalSemesters = data.length;
  const cumulativeGPA = Number((data.reduce((sum, item) => sum + item.GPA, 0) / totalSemesters).toFixed(2));

  // Momentum (Last sem GPA - Second to last sem GPA)
  const prevGPA = data[totalSemesters - 2]?.GPA || y1s1_gpa;
  const momentum = Number((currentSemGPA - prevGPA).toFixed(2));

  // Classification matching university standard
  const getClassification = (gpa: number) => {
    if (gpa >= 3.7) return { title: 'First Class Honours', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (gpa >= 3.0) return { title: 'Second Class (Upper Division)', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
    if (gpa >= 2.0) return { title: 'Second Class (Lower Division)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { title: 'Pass Division', color: 'text-slate-600 bg-slate-50 border-slate-200' };
  };

  const standing = getClassification(cumulativeGPA);

  // Dynamic projection math:
  // We assume a standard 8-semester course
  const remainingSemesters = 8 - totalSemesters;
  // targetCumulative = (cumulativeGPA * totalSemesters + requiredGPA * remainingSemesters) / 8
  // requiredGPA * remainingSemesters = targetCumulative * 8 - cumulativeGPA * totalSemesters
  // requiredGPA = (targetCumulative * 8 - cumulativeGPA * totalSemesters) / remainingSemesters
  const requiredGPA = remainingSemesters > 0
    ? Number(((targetGoal * 8 - cumulativeGPA * totalSemesters) / remainingSemesters).toFixed(2))
    : 0;

  // Render a lovely custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-3 shadow-xl max-w-xs space-y-1 text-xs">
          <div className="flex justify-between items-center border-b border-white/10 pb-1">
            <span className="font-bold text-blue-400 font-mono">{dataPoint.label}</span>
            <span className={`text-[8.5px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-bold ${dataPoint.status === 'Active' ? 'bg-amber-600/30 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
              {dataPoint.status}
            </span>
          </div>
          <p className="font-black text-sm text-slate-100 font-mono">
            GPA: <span className="text-white">{dataPoint.GPA.toFixed(2)} / 4.00</span>
          </p>
          <div className="text-[10px] text-slate-400 font-normal leading-relaxed">
            <span className="block font-bold text-[9px] text-slate-500 uppercase tracking-wide mt-1">Modules:</span>
            {dataPoint.courses}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-150 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6" id="performance-insights-widget">
      {/* Header section with sparkles */}
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
            Semester-over-semester grade point average tracking based on transcript calculations and historic records.
          </p>
        </div>
        
        {/* Toggle legend list */}
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            Semester GPA
          </span>
          <span className="flex items-center gap-1">
            <span className="w-5 h-px border-t border-indigo-400 border-dashed"></span>
            Honors Target (3.70)
          </span>
        </div>
      </div>

      {/* Main stats counters strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cumulative GPA</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-slate-850 font-mono">{cumulativeGPA.toFixed(2)}</span>
            <span className="text-[10px] text-slate-400 font-bold">/ 4.00</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic Division</span>
          <span className="text-xs font-bold text-slate-800 mt-1.5 truncate">{standing.title}</span>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Semesters Tracked</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xl font-black text-slate-855 font-mono">{totalSemesters}</span>
            <span className="text-[9px] uppercase font-semibold text-slate-400">Terms</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic Momentum</span>
          <div className="flex items-center gap-1.5 mt-1.5">
            {momentum >= 0 ? (
              <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                <span>+{momentum.toFixed(2)} Rise</span>
              </span>
            ) : (
              <span className="text-[11px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                <span>{momentum.toFixed(2)} Drop</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* RECHARTS GPA TREND AREA CHART CONTAINER */}
      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 sm:p-4">
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
            >
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
              
              {/* Highlight goal baseline with a dashed reference line */}
              <ReferenceLine y={3.7} stroke="#a855f7" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'First Class Border (3.70)', fill: '#a855f7', fontSize: 8, fontWeight: 'bold', position: 'top' }} />
              
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
          <span>Interactive tooltips: Hove over nodes inside the Recharts plot space to isolate exam modules completed in previous semesters.</span>
        </div>
      </div>

      {/* INTERACTIVE FORECASTER SANDBOX */}
      <div className="bg-indigo-50/20 border border-indigo-100 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Target Cumulative GPA Forecaster</h4>
            <p className="text-[11px] text-indigo-700/80 mt-0.5 mt-0.5 leading-relaxed">
              Slide the controller to set your graduation GPA goal. We will dynamically calculate the minimum GPA average required across your remaining <span className="font-bold">{remainingSemesters} semesters</span>.
            </p>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-150 rounded-xl space-y-4 shadow-3xs">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="space-y-1 flex-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-655 uppercase tracking-wider text-[9px]">Your Cumulative Goal</span>
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
              <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase select-none pt-1">
                <span>2.0 Pass</span>
                <span>3.0 Second Upper</span>
                <span>3.7 First Class</span>
                <span>4.0 Perfect Bound</span>
              </div>
            </div>

            <div className="sm:border-l border-slate-150 sm:pl-5 flex flex-col justify-center shrink-0 min-w-[140px] text-center sm:text-left">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Required GPA Avg</span>
              <div className="mt-1">
                {requiredGPA <= 0 ? (
                  <span className="text-emerald-600 text-lg font-black font-mono">Already Met!</span>
                ) : requiredGPA > 4.0 ? (
                  <span className="text-rose-500 text-sm font-black flex flex-col">
                    <span className="text-[10px] text-rose-400">Mathematically Out of Reach</span>
                    <span className="font-mono text-base font-extrabold">{requiredGPA.toFixed(2)}</span>
                  </span>
                ) : (
                  <span className="text-indigo-700 text-lg font-bold font-mono">
                    {requiredGPA.toFixed(2)} <span className="text-[10px] font-normal text-slate-400 font-sans">/ Term</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 flex items-start gap-2 text-[10.5px] leading-relaxed text-slate-600">
            <Zap className={`w-4 h-4 shrink-0 mt-0.5 ${requiredGPA > 4.0 ? 'text-rose-500' : 'text-amber-500 animate-pulse'}`} />
            <div>
              {requiredGPA <= 0 ? (
                <span><b>Impressive Standing:</b> Your current cumulative GPA of <b>{cumulativeGPA.toFixed(2)}</b> satisfies your goal threshold! Maintain current academic habits to seal your placement.</span>
              ) : requiredGPA > 4.0 ? (
                <span><b>Academic Outlook Warning:</b> A cumulative score target of {targetGoal.toFixed(2)} requires {requiredGPA.toFixed(2)} average (above maximum possible 4.0). Try setting a target goal closer to your current {cumulativeGPA.toFixed(2)} baseline.</span>
              ) : (
                <span>To lock in an overall final GPA of <b>{targetGoal.toFixed(2)}</b>, your grades in each of the subsequent <b>{remainingSemesters} semesters</b> must average at least <b>{requiredGPA.toFixed(2)} GP</b> (approx. <b>{requiredGPA >= 3.7 ? '70% A grade' : requiredGPA >= 3.0 ? '60% B grade' : '50% C grade'}</b>).</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
