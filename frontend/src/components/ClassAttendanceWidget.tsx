import React from 'react';
import { AlertCircle, CheckCircle2, UserCheck } from 'lucide-react';
import { Student, AttendanceSession } from '../types';
import { subjectMap } from '../data';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';

interface ClassAttendanceWidgetProps {
  student: Student;
  attendanceSessions?: AttendanceSession[];
}

export default function ClassAttendanceWidget({
  student,
  attendanceSessions = [],
}: ClassAttendanceWidgetProps) {
  const attendanceRecord = student.attendance || {};

  const unitRows = student.enrolledUnits.map((code) => {
    const recorded = attendanceRecord[code];
    const hasRecord = recorded !== undefined && recorded !== null;
    return {
      code,
      name: subjectMap[code] || code,
      attendance: hasRecord ? Number(recorded) : null,
      hasRecord,
    };
  });

  const recordedRates = unitRows
    .map((r) => r.attendance)
    .filter((v): v is number => typeof v === 'number');

  const overallAvg =
    recordedRates.length > 0
      ? Math.round(recordedRates.reduce((a, b) => a + b, 0) / recordedRates.length)
      : null;

  const isEligibleForAll =
    unitRows.length > 0 &&
    unitRows.every((r) => r.hasRecord && (r.attendance as number) >= 75);

  const chartData = unitRows
    .filter((r) => r.hasRecord)
    .map((r) => ({
      code: r.code,
      name: r.name,
      attendance: r.attendance as number,
      benchmark: 75,
    }));

  const studentSessions = attendanceSessions
    .filter(
      (s) =>
        s.presentStudents?.includes(student.id) ||
        s.absentStudents?.includes(student.id)
    )
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20);

  if (student.enrolledUnits.length === 0) {
    return (
      <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">No enrolled modules</p>
        <p className="text-xs text-slate-400 mt-1">
          Register units first to see attendance from the student_attendance table.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
          overallAvg === null
            ? 'bg-slate-50 border-slate-200'
            : isEligibleForAll
              ? 'bg-emerald-50/60 border-emerald-100'
              : 'bg-amber-50/60 border-amber-100'
        }`}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Overall attendance (recorded modules only)
          </p>
          <p className="text-2xl font-black text-slate-800 font-mono mt-1">
            {overallAvg !== null ? `${overallAvg}%` : '—'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {recordedRates.length} of {unitRows.length} enrolled modules have attendance records
          </p>
        </div>
        {overallAvg !== null && (
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
              isEligibleForAll
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-amber-100 text-amber-800 border-amber-200'
            }`}
          >
            {isEligibleForAll ? 'Exam eligible (≥75% all recorded)' : 'Below eligibility on some modules'}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-150">
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Module
              </th>
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Rate
              </th>
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {unitRows.map((row) => (
              <tr key={row.code} className="hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-bold text-blue-700">{row.code}</span>
                  <span className="block text-xs text-slate-600 mt-0.5">{row.name}</span>
                </td>
                <td className="px-4 py-3 font-mono text-sm font-bold text-slate-800">
                  {row.hasRecord ? `${row.attendance}%` : '—'}
                </td>
                <td className="px-4 py-3">
                  {!row.hasRecord ? (
                    <span className="text-[10px] font-semibold text-slate-400">No record</span>
                  ) : (row.attendance as number) >= 75 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Satisfactory
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600">
                      <AlertCircle className="w-3.5 h-3.5" /> Below 75%
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {chartData.length > 0 ? (
        <div className="h-56 w-full bg-slate-50/50 rounded-xl border border-slate-100 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="code" fontSize={9} stroke="#94a3b8" />
              <YAxis domain={[0, 100]} fontSize={9} stroke="#94a3b8" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="4 4" />
              <Bar dataKey="attendance" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.code}
                    fill={entry.attendance >= 75 ? '#10b981' : '#f43f5e'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-sm font-semibold text-slate-700">No attendance rates recorded</p>
          <p className="text-xs text-slate-400 mt-1">
            Rates appear here once lecturers save entries to student_attendance.
          </p>
        </div>
      )}

      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Session check-ins
        </h4>
        {studentSessions.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500">
              No attendance session logs are available for your account. Session-level history requires
              attendance session records linked to your student ID.
            </p>
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-1.5 text-[11px]">
            {studentSessions.map((session) => {
              const present = session.presentStudents?.includes(student.id);
              return (
                <div
                  key={session.id}
                  className={`p-2 rounded-lg border flex justify-between gap-2 ${
                    present
                      ? 'bg-slate-50 border-slate-100'
                      : 'bg-rose-50/50 border-rose-100'
                  }`}
                >
                  <span className="font-mono font-bold text-slate-700">{session.subjectCode}</span>
                  <span className="text-slate-500">{session.date}</span>
                  <span
                    className={`font-bold ${present ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {present ? 'Present' : 'Absent'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
