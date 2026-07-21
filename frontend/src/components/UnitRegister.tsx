import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Sparkles, Trash2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Course } from '../types';

export interface EnrolledUnit {
  courseCode: string;
  courseTitle: string;
  description?: string;
  duration?: string;
  faculty?: string;
  fees?: string;
  thumbnail?: string;
  enrolledAt?: string;
  attendedLectures: number;
  totalLectures: number;
  lectures: string;
  attendanceRate: number;
  submittedAssignments: number;
  totalAssignments: number;
  assignments: string;
  assignmentRate: number;
  overallProgress: number;
  completionPercentage: number;
}

interface UnitRegisterProps {
  studentId: string;
  allCourses: Course[];
  onRegisterUnit?: (unitCode: string) => Promise<void> | void;
  onDeregisterUnit?: (unitCode: string) => Promise<void> | void;
  subjectMap?: Record<string, string>;
}

export const UnitRegister: React.FC<UnitRegisterProps> = ({
  studentId,
  allCourses,
  onRegisterUnit,
  onDeregisterUnit,
  subjectMap = {},
}) => {
  // Initialized with empty array state instead of hardcoded mock array defaults
  const [registeredUnits, setRegisteredUnits] = useState<EnrolledUnit[]>([]);
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Hook to fetch active module registrations from backend API
  const fetchRegisteredUnits = useCallback(async () => {
    if (!studentId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/student/registered-units?studentId=${encodeURIComponent(studentId)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch active units (${response.status})`);
      }
      const data = await response.json();
      setRegisteredUnits(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error fetching registered units:", err);
      setError(err.message || "Failed to load active unit registrations");
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchRegisteredUnits();
  }, [fetchRegisteredUnits]);

  // Handle module registration POST action
  const handleAddUnitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitCode || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/student-enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          courseCode: selectedUnitCode,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to complete module registration");
      }

      if (onRegisterUnit) {
        await onRegisterUnit(selectedUnitCode);
      }

      setSelectedUnitCode('');
      // Automatically re-trigger a fetch/refresh of active modules immediately
      await fetchRegisteredUnits();
    } catch (err: any) {
      console.error("Error registering module:", err);
      alert(err.message || "Could not register unit module");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle module deregistration DELETE action
  const handleDeregisterUnit = async (code: string) => {
    if (!confirm(`Are you absolutely sure you want to drop unit: ${code}?\nThis will clear any uploaded grades associated with it.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/student-enrollments?studentId=${encodeURIComponent(studentId)}&courseCode=${encodeURIComponent(code)}`, {
        method: "DELETE",
      });

      if (onDeregisterUnit) {
        await onDeregisterUnit(code);
      }

      await fetchRegisteredUnits();
    } catch (err: any) {
      console.error("Error dropping module:", err);
      if (onDeregisterUnit) {
        await onDeregisterUnit(code);
      }
      await fetchRegisteredUnits();
    }
  };

  // Derive unregistered unit codes from available courses and fetched registered units
  const enrolledCodes = registeredUnits.map(u => u.courseCode);
  const unregisteredCourses = allCourses.filter(c => !enrolledCodes.includes(c.code));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Unit Module Allocator & Registration
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Register or drop supplementary class subjects. Enrolling instantly lists subjects in your grading sheets and gradebooks.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchRegisteredUnits()}
          disabled={isLoading}
          className="p-2 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs"
          title="Refresh Registrations"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left Column: Register New Unit */}
        <div className="space-y-4">
          <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
            <Plus className="w-4 h-4 text-emerald-600" />
            Add/Enroll Registered Modules
          </h3>

          {unregisteredCourses.length === 0 ? (
            <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 text-xs">
              <span className="font-bold block flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                All curriculum units registered.
              </span>
              <span>No outstanding units remain for placement this intake season.</span>
            </div>
          ) : (
            <form onSubmit={handleAddUnitRegister} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="unit-selector" className="block text-xs font-semibold text-slate-700">
                  Choose Available Module
                </label>
                <select
                  id="unit-selector"
                  value={selectedUnitCode}
                  onChange={(e) => setSelectedUnitCode(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-hidden"
                >
                  <option value="">-- Choose Module --</option>
                  {unregisteredCourses.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.title || subjectMap[c.code] || c.code}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!selectedUnitCode || isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Registration...</span>
                  </>
                ) : (
                  <span>Complete Registration</span>
                )}
              </button>
            </form>
          )}

          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/40 text-[11px] text-blue-800 leading-relaxed space-y-1.5">
            <span className="font-bold block">Academic Policy Checklist:</span>
            <p>• Adding a unit instantly registers your index to the corresponding lecturer's spreadsheet.</p>
            <p>• Retakes/Supplementary marks will use the same module indices.</p>
          </div>
        </div>

        {/* Right Column: Currently enrolled modules */}
        <div className="space-y-4">
          <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            My Active Module Registrations
          </h3>

          {isLoading ? (
            <div className="flex items-center justify-center p-8 bg-slate-50 rounded-2xl border border-slate-150 text-slate-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-xs">Loading registered units...</span>
            </div>
          ) : registeredUnits.length === 0 ? (
            <p className="text-xs italic text-slate-400">No active units catalogued.</p>
          ) : (
            <div className="space-y-4.5">
              {registeredUnits.map((unit) => {
                const title = unit.courseTitle || subjectMap[unit.courseCode] || 'Unassigned Catalog Title';
                return (
                  <div
                    key={unit.courseCode}
                    className="bg-slate-50 p-4.5 rounded-2xl border border-slate-150 space-y-3.5 hover:border-slate-300 transition-all shadow-3xs"
                  >
                    {/* Unit Title and Drop Action */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="space-y-1">
                        <span className="font-mono font-black text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                          {unit.courseCode}
                        </span>
                        <h4 className="text-slate-800 font-bold block text-xs mt-1.5 leading-tight">
                          {title}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeregisterUnit(unit.courseCode)}
                        className="bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 p-1.5 rounded-xl border border-slate-200 hover:border-rose-200 transition-all cursor-pointer shrink-0 shadow-xs"
                        title="Deregister Module"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Attendance and Assignment Breakdown */}
                    <div className="grid grid-cols-2 gap-2.5 text-[10px]">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-slate-400 font-bold uppercase tracking-wider block text-[8px]">
                          Attendance Log
                        </span>
                        <div className="flex justify-between items-baseline">
                          <span className="font-extrabold text-slate-700">{unit.lectures}</span>
                          <span className="font-mono font-extrabold text-emerald-600">
                            {unit.attendanceRate}%
                          </span>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-slate-400 font-bold uppercase tracking-wider block text-[8px]">
                          Assignments Submitted
                        </span>
                        <div className="flex justify-between items-baseline">
                          <span className="font-extrabold text-slate-700">{unit.assignments}</span>
                          <span className="font-mono font-extrabold text-blue-600">
                            {unit.assignmentRate}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Complex Visual Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 uppercase font-bold tracking-wider text-[8px]">
                          Academic completion rate
                        </span>
                        <span className="font-mono font-black text-slate-800 bg-white border border-slate-150 px-1.5 py-0.5 rounded-md">
                          {unit.overallProgress}%
                        </span>
                      </div>

                      {/* Split Segmented Bar */}
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex p-0.5">
                        <div
                          className="bg-emerald-500 h-full rounded-l-full transition-all duration-500"
                          style={{ width: `${unit.attendanceRate / 2}%` }}
                          title={`Attendance: ${unit.attendanceRate}%`}
                        />
                        <div
                          className="bg-blue-500 h-full rounded-r-full transition-all duration-500"
                          style={{ width: `${unit.assignmentRate / 2}%` }}
                          title={`Assignments: ${unit.assignmentRate}%`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnitRegister;
