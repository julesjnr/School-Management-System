import React, { useState } from 'react';
import {
  Search,
  GraduationCap,
  User,
  Award,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ClipboardList,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { Lecturer } from '../types';
import { useStudentLookup } from '../hooks/useStudentLookup';

interface StudentLookupPageProps {
  lecturer: Lecturer;
}

export default function StudentLookupPage({ lecturer }: StudentLookupPageProps) {
  const {
    directory,
    selected,
    isLoadingDirectory,
    isLookingUp,
    error,
    lookupStudent,
    clearSelection,
  } = useStudentLookup(lecturer.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const matchedStudents = directory.filter(
    (student) =>
      student.admissionNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = async (studentId: string, admissionNo: string) => {
    setSearchQuery(admissionNo);
    setIsDropdownOpen(false);
    try {
      await lookupStudent({ studentId, admissionNo });
    } catch {
      /* error surfaced via hook */
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const exact = directory.find(
      (s) => s.admissionNo.toLowerCase() === searchQuery.trim().toLowerCase()
    );
    if (exact) {
      await handleSelect(exact.id, exact.admissionNo);
      return;
    }
    if (searchQuery.trim()) {
      try {
        await lookupStudent({ admissionNo: searchQuery.trim() });
      } catch {
        /* error surfaced via hook */
      }
    }
  };

  const gradeColor = (letter: string) => {
    switch (letter) {
      case 'A':
        return 'text-emerald-700 bg-emerald-50 border-emerald-100';
      case 'B':
        return 'text-blue-700 bg-blue-50 border-blue-100';
      case 'C':
        return 'text-indigo-700 bg-indigo-50 border-indigo-100';
      case 'D':
        return 'text-amber-700 bg-amber-50 border-amber-100';
      default:
        return 'text-rose-600 bg-rose-50 border-rose-100';
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <GraduationCap className="w-5 h-5 text-violet-600" />
            Student Lookup
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Teaching-relevant academic records for students in your classes.
          </p>
        </div>
        {selected && (
          <button
            type="button"
            onClick={() => {
              clearSelection();
              setSearchQuery('');
            }}
            className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            Clear selection
          </button>
        )}
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
      >
        <div className="md:col-span-2 relative">
          <label
            htmlFor="lecturer-student-search"
            className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5"
          >
            Search Admission Number
          </label>
          <div className="relative">
            <input
              id="lecturer-student-search"
              type="text"
              placeholder="e.g. ADM-000001"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(false);
              }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-hidden focus:ring-1 focus:ring-violet-500 text-slate-850 dark:text-slate-100 font-mono"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            {searchQuery && matchedStudents.length > 0 && (
              <div className="absolute left-0 right-0 z-50 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl mt-1 shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {matchedStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleSelect(student.id, student.admissionNo)}
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-violet-50 dark:hover:bg-slate-750 flex justify-between items-center transition-colors cursor-pointer text-slate-850 dark:text-slate-200 font-mono border-none"
                  >
                    <span className="font-sans font-bold">{student.name}</span>
                    <span className="text-violet-600 dark:text-violet-400 font-bold">
                      {student.admissionNo}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Quick Select
          </label>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={isLoadingDirectory}
            className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl py-2.5 px-4 text-xs font-semibold text-slate-850 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            <span>
              {isLoadingDirectory
                ? 'Loading…'
                : selected
                  ? selected.name
                  : 'Select student…'}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-450 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {isDropdownOpen && (
            <div className="absolute right-0 z-50 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl mt-1 shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {directory.length === 0 ? (
                <div className="px-4 py-3 text-xs text-slate-400 italic">
                  No students enrolled in your assigned subjects.
                </div>
              ) : (
                directory.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleSelect(student.id, student.admissionNo)}
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-violet-50 dark:hover:bg-slate-750 flex justify-between items-center transition-colors cursor-pointer text-slate-850 dark:text-slate-200 font-mono border-none"
                  >
                    <span className="font-sans font-semibold">{student.name}</span>
                    <span className="text-slate-400 text-[10px]">{student.admissionNo}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </form>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {isLookingUp && (
        <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading student academic record…
        </div>
      )}

      {!isLookingUp && selected && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="bg-slate-900 text-white p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              {selected.avatar ? (
                <img
                  src={selected.avatar}
                  alt=""
                  className="w-14 h-14 rounded-xl object-cover border border-white/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black text-lg">
                  {selected.name.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="text-base font-bold tracking-tight">{selected.name}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 font-mono text-[11px] text-slate-300">
                  <span>
                    ADM:{' '}
                    <strong className="text-violet-300">{selected.admissionNo}</strong>
                  </span>
                  <span>•</span>
                  <span>{selected.cohort}</span>
                </div>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                selected.financeStatus === 'Finance Cleared'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {selected.financeStatus}
            </span>
          </div>

          <div className="p-5 bg-slate-50/50 dark:bg-slate-900/30 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetaChip label="Course / Programme" value={selected.course} />
              <MetaChip
                label="Department"
                value={selected.department || '—'}
              />
              <MetaChip
                label="Year of Study"
                value={selected.yearOfStudy ? `Year ${selected.yearOfStudy}` : '—'}
              />
              <MetaChip label="Semester" value={selected.semester || '—'} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    GPA
                  </span>
                  <span className="text-lg font-black text-slate-800 dark:text-white font-mono">
                    {selected.gpa != null ? selected.gpa.toFixed(2) : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Academic Standing
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-white">
                    {selected.academicStanding}
                  </span>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Registered Units
                  </span>
                  <span className="text-lg font-black text-slate-800 dark:text-white font-mono">
                    {selected.registeredUnits.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Award className="w-4 h-4 text-violet-600" />
                Registered Units, Attendance & Grades
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selected.registeredUnits.length === 0 ? (
                  <div className="sm:col-span-2 p-3 text-center text-slate-400 italic border border-dashed rounded-lg text-xs">
                    No units registered.
                  </div>
                ) : (
                  selected.registeredUnits.map((unit) => (
                    <div
                      key={unit.code}
                      className={`p-3 rounded-xl border flex justify-between items-center ${
                        unit.isMyClass
                          ? 'bg-violet-50/50 border-violet-200 dark:bg-violet-950/20 dark:border-violet-800'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-black text-slate-800 dark:text-slate-200">
                            {unit.code}
                          </span>
                          {unit.isMyClass && (
                            <span className="text-[8px] bg-violet-600 text-white px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                              My Class
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 font-bold block truncate">
                          {unit.title}
                        </span>
                        {unit.attendanceRate != null && (
                          <span className="text-[10px] text-slate-400 font-semibold block">
                            Attendance:{' '}
                            <strong className="text-slate-600 dark:text-slate-300">
                              {unit.attendanceRate}%
                            </strong>
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        {unit.grade ? (
                          <div className="space-y-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${gradeColor(unit.grade.letter)}`}
                            >
                              {unit.grade.letter} ({unit.grade.total}%)
                            </span>
                            <span className="text-[9px] text-slate-400 block font-mono">
                              CAT: {unit.grade.cat} · EXAM: {unit.grade.exam}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic bg-slate-100 dark:bg-slate-850 py-1 px-2 rounded">
                            Not graded
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <ClipboardList className="w-4 h-4 text-slate-500" />
                Advisor Notes
              </h4>
              {selected.advisorNotes.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No advisor notes recorded for this student in your office hours.
                </p>
              ) : (
                <div className="space-y-2">
                  {selected.advisorNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs"
                    >
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                        <span>
                          {note.day} · {note.timeSlot}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        &ldquo;{note.notes}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!isLookingUp && !selected && (
        <div className="border border-dashed border-violet-200 dark:border-violet-900/40 rounded-2xl p-8 bg-violet-50/40 dark:bg-violet-950/10 text-center space-y-2">
          <User className="w-10 h-10 text-violet-400 mx-auto" />
          <h4 className="text-xs uppercase font-bold text-violet-700 dark:text-violet-300 tracking-wider">
            Ready to look up a student
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Search by admission number or pick a student enrolled in your assigned
            subjects. Only teaching-relevant academic information is shown.
          </p>
          {!error && (
            <p className="text-[10px] text-emerald-600 font-semibold flex items-center justify-center gap-1 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Auth and detailed finance records are withheld by RBAC
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
        {label}
      </span>
      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2">
        {value}
      </span>
    </div>
  );
}
