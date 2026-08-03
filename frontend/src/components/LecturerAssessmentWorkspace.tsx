import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Award, Download, FileSpreadsheet, FileText, Plus,
  Printer, Save, Search, Trash2, Users,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Grade, LecturerAssignedSubject, Student } from '../types';

type AssessmentKind = 'CAT1' | 'CAT2' | 'Assignment' | 'FinalExam';

interface AssessmentDef {
  id: string;
  kind: AssessmentKind;
  name: string;
  maxMarks: number;
  published: boolean;
}

interface MarkBreakdown {
  cat1: number;
  cat2: number;
  assignment: number;
  exam: number;
}

interface AssessmentAnalytics {
  average: number | null;
  highest: number | null;
  lowest: number | null;
  passRate: number | null;
  failRate: number | null;
  graded: number;
  pending: number;
  distribution: Array<{ name: string; count: number; percent: number; color: string }>;
}

interface LecturerAssessmentWorkspaceProps {
  lecturerId: string;
  assignedSubjects: LecturerAssignedSubject[];
  selectedSubject: string;
  onSelectSubject: (code: string) => void;
  students: Student[];
  onUpdateGrades: (studentId: string, subjectCode: string, grade: Grade) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  showWarning: (title: string, message: string) => void;
}

const DEFAULT_ASSESSMENTS: AssessmentDef[] = [
  { id: 'cat1', kind: 'CAT1', name: 'CAT 1', maxMarks: 10, published: false },
  { id: 'cat2', kind: 'CAT2', name: 'CAT 2', maxMarks: 10, published: false },
  { id: 'assignment', kind: 'Assignment', name: 'Assignment', maxMarks: 10, published: false },
  { id: 'final', kind: 'FinalExam', name: 'Final Exam', maxMarks: 70, published: false },
];

const KIND_OPTIONS: Array<{ kind: AssessmentKind; label: string; defaultMax: number }> = [
  { kind: 'CAT1', label: 'CAT 1', defaultMax: 10 },
  { kind: 'CAT2', label: 'CAT 2', defaultMax: 10 },
  { kind: 'Assignment', label: 'Assignment', defaultMax: 10 },
  { kind: 'FinalExam', label: 'Final Exam', defaultMax: 70 },
];

function letterGrade(total: number): string {
  if (total >= 70) return 'A';
  if (total >= 60) return 'B';
  if (total >= 50) return 'C';
  if (total >= 40) return 'D';
  return 'E/F';
}

function assessmentsKey(lecturerId: string, subject: string) {
  return `lecturer-assessments:${lecturerId}:${subject}`;
}

function marksKey(lecturerId: string, subject: string) {
  return `lecturer-mark-breakdown:${lecturerId}:${subject}`;
}

function loadAssessments(lecturerId: string, subject: string): AssessmentDef[] {
  if (!subject) return DEFAULT_ASSESSMENTS;
  try {
    const raw = localStorage.getItem(assessmentsKey(lecturerId, subject));
    if (!raw) return DEFAULT_ASSESSMENTS.map((item) => ({ ...item }));
    const parsed = JSON.parse(raw) as AssessmentDef[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ASSESSMENTS.map((item) => ({ ...item }));
  } catch {
    return DEFAULT_ASSESSMENTS.map((item) => ({ ...item }));
  }
}

function loadBreakdowns(lecturerId: string, subject: string): Record<string, MarkBreakdown> {
  if (!subject) return {};
  try {
    const raw = localStorage.getItem(marksKey(lecturerId, subject));
    return raw ? (JSON.parse(raw) as Record<string, MarkBreakdown>) : {};
  } catch {
    return {};
  }
}

function splitCat(cat: number): Pick<MarkBreakdown, 'cat1' | 'cat2' | 'assignment'> {
  const safe = Math.max(0, Math.min(30, Number(cat) || 0));
  const cat1 = Math.min(10, safe);
  const remaining = safe - cat1;
  const cat2 = Math.min(10, remaining);
  const assignment = Math.max(0, remaining - cat2);
  return { cat1, cat2, assignment };
}

function validateMarks(marks: MarkBreakdown): Partial<Record<keyof MarkBreakdown, string>> {
  const errors: Partial<Record<keyof MarkBreakdown, string>> = {};
  const continuousFields: Array<keyof Pick<MarkBreakdown, 'cat1' | 'cat2' | 'assignment'>> = ['cat1', 'cat2', 'assignment'];

  for (const field of continuousFields) {
    if (!Number.isFinite(marks[field]) || marks[field] < 0 || marks[field] > 10) {
      errors[field] = 'Enter a mark from 0 to 10.';
    }
  }

  if (!Number.isFinite(marks.exam) || marks.exam < 0 || marks.exam > 70) {
    errors.exam = 'Enter a mark from 0 to 70.';
  }

  return errors;
}

export default function LecturerAssessmentWorkspace({
  lecturerId,
  assignedSubjects,
  selectedSubject,
  onSelectSubject,
  students,
  onUpdateGrades,
  showToast,
  showWarning,
}: LecturerAssessmentWorkspaceProps) {
  const [assessments, setAssessments] = useState<AssessmentDef[]>(() => loadAssessments(lecturerId, selectedSubject));
  const [breakdowns, setBreakdowns] = useState<Record<string, MarkBreakdown>>(() => loadBreakdowns(lecturerId, selectedSubject));
  const [drafts, setDrafts] = useState<Record<string, Partial<MarkBreakdown>>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);
  const [newKind, setNewKind] = useState<AssessmentKind>('CAT1');
  const [newName, setNewName] = useState('');
  const [newMax, setNewMax] = useState(10);
  const [saveFlash, setSaveFlash] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AssessmentAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    setAssessments(loadAssessments(lecturerId, selectedSubject));
    setBreakdowns(loadBreakdowns(lecturerId, selectedSubject));
    setDrafts({});
    setSearchQuery('');
    setEditingAssessmentId(null);
  }, [lecturerId, selectedSubject]);

  useEffect(() => {
    if (!selectedSubject) {
      setAnalytics(null);
      return;
    }

    let cancelled = false;
    setAnalyticsLoading(true);
    fetch(`/api/lecturer/assessment-analytics?lecturerId=${encodeURIComponent(lecturerId)}&subjectCode=${encodeURIComponent(selectedSubject)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load analytics');
        return response.json() as Promise<AssessmentAnalytics>;
      })
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch(() => {
        if (!cancelled) setAnalytics(null);
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lecturerId, selectedSubject]);

  const selectedMeta = assignedSubjects.find((subject) => subject.code === selectedSubject);
  const subjectStudents = useMemo(
    () => students.filter((student) => student.enrolledUnits.includes(selectedSubject)),
    [students, selectedSubject],
  );

  const filteredStudents = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return subjectStudents;
    return subjectStudents.filter((student) =>
      student.name.toLowerCase().includes(term) ||
      student.admissionNo.toLowerCase().includes(term),
    );
  }, [searchQuery, subjectStudents]);

  const resolveBreakdown = (student: Student): MarkBreakdown => {
    if (drafts[student.id]) {
      const base = breakdowns[student.id] || (() => {
        const grade = student.grades[selectedSubject];
        if (!grade) return { cat1: 0, cat2: 0, assignment: 0, exam: 0 };
        return { ...splitCat(grade.cat), exam: grade.exam };
      })();
      return {
        cat1: drafts[student.id].cat1 ?? base.cat1,
        cat2: drafts[student.id].cat2 ?? base.cat2,
        assignment: drafts[student.id].assignment ?? base.assignment,
        exam: drafts[student.id].exam ?? base.exam,
      };
    }
    if (breakdowns[student.id]) return breakdowns[student.id];
    const grade = student.grades[selectedSubject];
    if (!grade) return { cat1: 0, cat2: 0, assignment: 0, exam: 0 };
    return { ...splitCat(grade.cat), exam: grade.exam };
  };

  const persistAssessments = (next: AssessmentDef[]) => {
    setAssessments(next);
    if (selectedSubject) localStorage.setItem(assessmentsKey(lecturerId, selectedSubject), JSON.stringify(next));
  };

  const persistBreakdowns = (next: Record<string, MarkBreakdown>) => {
    setBreakdowns(next);
    if (selectedSubject) localStorage.setItem(marksKey(lecturerId, selectedSubject), JSON.stringify(next));
  };

  const updateDraft = (studentId: string, field: keyof MarkBreakdown, value: string) => {
    const numeric = value === '' ? 0 : Number(value);
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: Number.isNaN(numeric) ? 0 : numeric,
      },
    }));
  };

  const saveStudentMarks = (student: Student) => {
    if (!selectedSubject) return;
    const marks = resolveBreakdown(student);
    const fieldErrors = validateMarks(marks);
    const firstError = Object.values(fieldErrors)[0];
    if (firstError) {
      showWarning('Mark invalid', firstError);
      return;
    }
    const catTotal = marks.cat1 + marks.cat2 + marks.assignment;
    if (!Number.isFinite(catTotal) || catTotal < 0 || catTotal > 30) {
      showWarning('CAT total invalid', 'CAT 1 + CAT 2 + Assignment must be between 0 and 30.');
      return;
    }
    if (marks.exam < 0 || marks.exam > 70) {
      showWarning('Exam score invalid', 'Final Exam must be between 0 and 70.');
      return;
    }
    const nextBreakdowns = { ...breakdowns, [student.id]: marks };
    persistBreakdowns(nextBreakdowns);
    onUpdateGrades(student.id, selectedSubject, { cat: catTotal, exam: marks.exam });
    setDrafts((prev) => {
      const copy = { ...prev };
      delete copy[student.id];
      return copy;
    });
    setSaveFlash(student.id);
    setTimeout(() => setSaveFlash(null), 1200);
    showToast(`Saved marks for ${student.name}.`, 'success');
  };

  const saveAllVisible = () => {
    filteredStudents.forEach((student) => saveStudentMarks(student));
  };

  const createAssessment = () => {
    const option = KIND_OPTIONS.find((item) => item.kind === newKind);
    const name = newName.trim() || option?.label || newKind;
    const maxMarks = Math.max(1, Math.min(newKind === 'FinalExam' ? 70 : 30, Number(newMax) || option?.defaultMax || 10));
    if (assessments.some((item) => item.kind === newKind)) {
      showWarning('Assessment exists', `${option?.label || newKind} is already configured for this module.`);
      return;
    }
    const next = [...assessments, { id: `${newKind.toLowerCase()}-${Date.now()}`, kind: newKind, name, maxMarks, published: false }];
    persistAssessments(next);
    setNewName('');
    showToast('Assessment created.', 'success');
  };

  const deleteAssessment = (id: string) => {
    persistAssessments(assessments.filter((item) => item.id !== id));
    showToast('Assessment removed.', 'success');
  };

  const publishAssessment = (id: string) => {
    persistAssessments(assessments.map((item) => (item.id === id ? { ...item, published: true } : item)));
    showToast('Results marked as published for this assessment.', 'success');
  };

  const reportRows = () => subjectStudents.map((student) => {
    const marks = resolveBreakdown(student);
    const total = marks.cat1 + marks.cat2 + marks.assignment + marks.exam;
    return [
      student.admissionNo,
      student.name,
      String(marks.cat1),
      String(marks.cat2),
      String(marks.assignment),
      String(marks.exam),
      String(total),
      letterGrade(total),
      student.grades[selectedSubject] ? 'Graded' : 'Pending',
    ];
  });

  const exportExcel = () => {
    if (!selectedSubject || subjectStudents.length === 0) {
      showWarning('Nothing to export', 'No students available for this module.');
      return;
    }
    const rows = [
      ['Admission Number', 'Student Name', 'CAT 1', 'CAT 2', 'Assignment', 'Final Exam', 'Total', 'Grade', 'Status'],
      ...reportRows(),
    ];
    const tsv = rows.map((row) => row.map((cell) => String(cell).replace(/\t|\r?\n/g, ' ')).join('\t')).join('\n');
    const blob = new Blob([tsv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${selectedSubject}-grade-sheet.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast('Excel grade sheet exported.', 'success');
  };

  const printGradeSheet = (forPdf = false) => {
    if (!selectedSubject || subjectStudents.length === 0) {
      showWarning('Nothing to print', 'No students available for this module.');
      return;
    }

    const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    }[character] || character));
    const rows = reportRows().map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      showWarning('Report blocked', 'Allow pop-ups to generate the grade sheet.');
      return;
    }

    reportWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(selectedSubject)} Grade Sheet</title><style>body{font-family:Arial,sans-serif;color:#172033;margin:32px}h1{font-size:20px;margin:0 0 4px}p{color:#526176;margin:0 0 20px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#eff6ff;font-weight:700}@media print{body{margin:16px}}</style></head><body><h1>${escapeHtml(selectedMeta ? `${selectedMeta.code} – ${selectedMeta.title}` : selectedSubject)} Grade Sheet</h1><p>Generated ${new Date().toLocaleString()}</p><table><thead><tr><th>Admission Number</th><th>Student Name</th><th>CAT 1</th><th>CAT 2</th><th>Assignment</th><th>Final Exam</th><th>Total</th><th>Grade</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
    if (forPdf) showToast('Choose “Save as PDF” in the print dialog to export the report.', 'info');
  };

  if (assignedSubjects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
        <p className="text-sm font-semibold text-slate-700">No modules assigned.</p>
        <p className="mt-1 text-xs text-slate-500">Ask an administrator to allocate teaching modules to your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 font-sans">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Assessment & Grading
          </h2>
          <p className="mt-1 text-xs text-slate-500">Enter marks for your assigned modules and review class performance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportExcel} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Download className="h-3.5 w-3.5" /> Export Excel
          </button>
          <button type="button" onClick={() => printGradeSheet(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
            <FileText className="h-3.5 w-3.5" /> Export PDF
          </button>
          <button type="button" onClick={() => printGradeSheet()} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
            <Printer className="h-3.5 w-3.5" /> Print Grade Report
          </button>
        </div>
      </div>

      {/* Module selector — assigned modules only */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Select module</p>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {assignedSubjects.map((subject) => {
            const active = subject.code === selectedSubject;
            return (
              <button
                key={subject.code}
                type="button"
                onClick={() => onSelectSubject(subject.code)}
                className={`rounded-lg border px-3 py-3 text-left transition ${active ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'}`}
              >
                <p className="font-mono text-xs font-bold text-slate-900">{subject.code}</p>
                <p className="mt-1 text-xs font-medium text-slate-700 line-clamp-1">{subject.title}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Semester: {subject.semester || 'Not recorded'} · Year: {subject.academicYear || 'Not recorded'}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Class analytics */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Award className="h-4 w-4 text-blue-600" />
            Class Performance Analytics
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {selectedMeta ? `${selectedMeta.code} – ${selectedMeta.title}` : 'Select a module'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {[
            { label: 'Average Score', value: analytics?.average === null || analytics?.average === undefined ? '—' : `${analytics.average}%` },
            { label: 'Highest Score', value: analytics?.highest === null || analytics?.highest === undefined ? '—' : `${analytics.highest}%` },
            { label: 'Lowest Score', value: analytics?.lowest === null || analytics?.lowest === undefined ? '—' : `${analytics.lowest}%` },
            { label: 'Pass Rate', value: analytics?.passRate === null || analytics?.passRate === undefined ? '—' : `${analytics.passRate}%` },
            { label: 'Fail Rate', value: analytics?.failRate === null || analytics?.failRate === undefined ? '—' : `${analytics.failRate}%` },
            { label: 'Students Graded', value: analytics ? String(analytics.graded) : '—' },
            { label: 'Students Pending', value: analytics ? String(analytics.pending) : '—' },
          ].map((card) => (
            <div key={card.label} className="min-h-[84px] rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{analyticsLoading ? '…' : card.value}</p>
            </div>
          ))}
        </div>

        {!analyticsLoading && (!analytics || analytics.graded === 0) ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
            <p className="text-xs font-semibold text-slate-700">No database grades available.</p>
            <p className="mt-1 text-[11px] text-slate-500">Saved grades for this module will appear here.</p>
          </div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={analytics?.distribution || []} margin={{ top: 10, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} fontSize={11} />
                <YAxis type="category" dataKey="name" width={36} fontSize={11} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload as { name: string; count: number; percent: number };
                    return (
                      <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
                        <p className="font-semibold">Grade {data.name}</p>
                        <p className="mt-1 text-slate-300">{data.count} student{data.count === 1 ? '' : 's'} · {data.percent}% of graded students</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                  <LabelList dataKey="count" position="right" className="fill-slate-600 text-[11px]" />
                  {(analytics?.distribution || []).map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Assessment management */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Assessment management</h3>
            <p className="text-xs text-slate-500">Configure CAT 1, CAT 2, Assignments, and Final Exam for this module.</p>
          </div>
        </div>
        {assessments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-xs text-slate-600">No assessments created.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="border-y border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Assessment</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Max Marks</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((assessment) => (
                  <tr key={assessment.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-3">
                      {editingAssessmentId === assessment.id ? (
                        <input
                          value={assessment.name}
                          onChange={(event) => persistAssessments(assessments.map((item) => item.id === assessment.id ? { ...item, name: event.target.value } : item))}
                          className="w-full rounded border border-slate-200 px-2 py-1"
                        />
                      ) : (
                        <span className="font-semibold text-slate-800">{assessment.name}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{assessment.kind}</td>
                    <td className="px-3 py-3">
                      {editingAssessmentId === assessment.id ? (
                        <input
                          type="number"
                          min={1}
                          max={assessment.kind === 'FinalExam' ? 70 : 30}
                          value={assessment.maxMarks}
                          onChange={(event) => persistAssessments(assessments.map((item) => item.id === assessment.id ? { ...item, maxMarks: Number(event.target.value) || 1 } : item))}
                          className="w-20 rounded border border-slate-200 px-2 py-1"
                        />
                      ) : (
                        assessment.maxMarks
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${assessment.published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {assessment.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right space-x-2">
                      <button type="button" onClick={() => setEditingAssessmentId(editingAssessmentId === assessment.id ? null : assessment.id)} className="font-semibold text-blue-700 hover:underline">
                        {editingAssessmentId === assessment.id ? 'Done' : 'Edit'}
                      </button>
                      <button type="button" onClick={() => publishAssessment(assessment.id)} className="font-semibold text-emerald-700 hover:underline">Publish</button>
                      <button type="button" onClick={() => deleteAssessment(assessment.id)} className="inline-flex items-center text-rose-600 hover:underline"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-slate-600">Type</label>
            <select value={newKind} onChange={(event) => { const kind = event.target.value as AssessmentKind; setNewKind(kind); setNewMax(KIND_OPTIONS.find((item) => item.kind === kind)?.defaultMax || 10); }} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs">
              {KIND_OPTIONS.map((option) => <option key={option.kind} value={option.kind}>{option.label}</option>)}
            </select>
          </div>
          <div className="flex-[1.4]">
            <label className="text-[11px] font-semibold text-slate-600">Name</label>
            <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Optional custom name" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs" />
          </div>
          <div className="w-28">
            <label className="text-[11px] font-semibold text-slate-600">Max</label>
            <input type="number" min={1} value={newMax} onChange={(event) => setNewMax(Number(event.target.value) || 1)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs" />
          </div>
          <button type="button" onClick={createAssessment} className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
            <Plus className="h-3.5 w-3.5" /> Create Assessment
          </button>
        </div>
      </section>

      {/* Marks entry */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Marks entry</h3>
            <p className="text-xs text-slate-500">CAT components save into continuous assessment (max 30). Final Exam saves separately (max 70).</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search admission no. or name"
                className="rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>
            <button type="button" onClick={saveAllVisible} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
              <Save className="h-3.5 w-3.5" /> Save All
            </button>
          </div>
        </div>

        {subjectStudents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No students assigned.</p>
            <p className="mt-1 text-xs text-slate-500">No enrolled students found for this module.</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-xs text-slate-600">No students match your search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead className="border-y border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Admission Number</th>
                  <th className="px-3 py-2.5">Student Name</th>
                  <th className="px-3 py-2.5 text-center">CAT 1</th>
                  <th className="px-3 py-2.5 text-center">CAT 2</th>
                  <th className="px-3 py-2.5 text-center">Assignment</th>
                  <th className="px-3 py-2.5 text-center">Final Exam</th>
                  <th className="px-3 py-2.5 text-center">Total</th>
                  <th className="px-3 py-2.5 text-center">Grade</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-right"> </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const marks = resolveBreakdown(student);
                  const total = marks.cat1 + marks.cat2 + marks.assignment + marks.exam;
                  const graded = !!student.grades[selectedSubject];
                  const fieldErrors = validateMarks(marks);
                  return (
                    <tr key={student.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2.5 font-mono font-semibold text-slate-800">{student.admissionNo}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-800">{student.name}</td>
                      {(['cat1', 'cat2', 'assignment', 'exam'] as const).map((field) => (
                        <td key={field} className="px-3 py-2.5 text-center">
                          <input
                            type="number"
                            min={0}
                            max={field === 'exam' ? 70 : 10}
                            value={marks[field]}
                            onChange={(event) => updateDraft(student.id, field, event.target.value)}
                            aria-invalid={Boolean(fieldErrors[field])}
                            title={fieldErrors[field]}
                            className={`w-16 rounded border px-2 py-1 text-center font-mono outline-none focus:ring-2 ${fieldErrors[field] ? 'border-rose-400 bg-rose-50 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'}`}
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center font-semibold text-slate-900">{total}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-slate-900">{letterGrade(total)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${graded ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {graded ? 'Graded' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => saveStudentMarks(student)}
                          className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${saveFlash === student.id ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                          {saveFlash === student.id ? 'Saved' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
