import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Award, BookOpen, Calculator, Download, FileText,
  Plus, RefreshCw, Save, Target, Trash2, TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Course, Student } from '../types';
import { subjectMap } from '../data';

type LetterGrade = 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'D' | 'F';

type GoalPreset = 'first_class' | 'second_upper' | 'reach_3_80' | 'custom';

interface SimPlanPoint {
  code: string;
  subjectName: string;
  mark: number;
  runningAvg: number;
  runningGPA: number;
  cat: number;
  exam: number;
  type: 'graded' | 'ungraded' | 'hypothetical';
  gp: number;
}

interface SavedScenario {
  id: string;
  name: string;
  savedAt: string;
  simulatedGrades: Record<string, number>;
  hypotheticalUnits: string[];
  predictedGpa: number;
  goalPreset: GoalPreset;
  customTarget: number;
}

interface StudentGpaPlannerProps {
  student: Student;
  allCourses: Course[];
  currentSemester: string;
  gradedUnits: string[];
  ungradedUnits: string[];
  unregisteredCodes: string[];
  hypotheticalUnits: string[];
  simulatedGrades: Record<string, number>;
  baselineAvg: number | null;
  currentGPA: number;
  finalProjectedGPA: number;
  simPlanChartData: SimPlanPoint[];
  enableProjection: boolean;
  getGPForMark: (mark: number) => number;
  getLetterForMark: (mark: number) => string;
  setSimulatedGrades: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setHypotheticalUnits: React.Dispatch<React.SetStateAction<string[]>>;
  setSimulationMode: React.Dispatch<React.SetStateAction<'momentum' | 'custom'>>;
  setEnableProjection: React.Dispatch<React.SetStateAction<boolean>>;
  onPrintReport?: () => void;
}

const LETTER_OPTIONS: LetterGrade[] = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'];

/** Representative marks that feed the existing GPA engine bands (unchanged). */
const LETTER_TO_MARK: Record<LetterGrade, number> = {
  A: 78,
  'A-': 70,
  'B+': 67,
  B: 63,
  'B-': 60,
  'C+': 57,
  C: 52,
  D: 45,
  F: 30,
};

const GOAL_OPTIONS: Array<{ id: GoalPreset; label: string; target: number | null }> = [
  { id: 'first_class', label: 'Maintain First Class', target: 3.7 },
  { id: 'second_upper', label: 'Graduate with Second Upper', target: 3.0 },
  { id: 'reach_3_80', label: 'Reach CGPA 3.80', target: 3.8 },
  { id: 'custom', label: 'Custom Target', target: null },
];

function classifyGpa(gpa: number | null): string {
  if (gpa === null || Number.isNaN(gpa)) return 'Awaiting results';
  if (gpa >= 3.7) return 'First Class';
  if (gpa >= 3.0) return 'Second Class Upper';
  if (gpa >= 2.0) return 'Second Class Lower';
  if (gpa >= 1.0) return 'Pass';
  return 'At Risk';
}

function markToLetter(mark: number): LetterGrade {
  if (mark >= 75) return 'A';
  if (mark >= 70) return 'A-';
  if (mark >= 65) return 'B+';
  if (mark >= 63) return 'B';
  if (mark >= 60) return 'B-';
  if (mark >= 55) return 'C+';
  if (mark >= 50) return 'C';
  if (mark >= 40) return 'D';
  return 'F';
}

function moduleTitle(code: string, courses: Course[]): string {
  return courses.find((course) => course.code === code)?.title || subjectMap[code] || code;
}

function confidenceLevel(gradedCount: number, plannedCount: number): { label: string; tone: string } {
  if (gradedCount === 0) return { label: 'Unavailable', tone: 'text-slate-500 bg-slate-50' };
  if (gradedCount >= 4 && plannedCount <= gradedCount) return { label: 'High', tone: 'text-emerald-700 bg-emerald-50' };
  if (gradedCount >= 2) return { label: 'Moderate', tone: 'text-amber-700 bg-amber-50' };
  return { label: 'Low', tone: 'text-rose-700 bg-rose-50' };
}

function graduationStatus(predictedGpa: number, gradedCount: number, futureCount: number): { label: string; tone: string } {
  if (gradedCount === 0 && futureCount === 0) return { label: 'No prediction yet', tone: 'text-slate-600' };
  if (predictedGpa >= 3.7) return { label: 'On track for First Class', tone: 'text-emerald-700' };
  if (predictedGpa >= 3.0) return { label: 'On track for Second Upper', tone: 'text-emerald-700' };
  if (predictedGpa >= 2.0) return { label: 'Progressing toward graduation', tone: 'text-amber-700' };
  return { label: 'At academic risk', tone: 'text-rose-700' };
}

export default function StudentGpaPlanner({
  student,
  allCourses,
  currentSemester,
  gradedUnits,
  ungradedUnits,
  unregisteredCodes,
  hypotheticalUnits,
  simulatedGrades,
  baselineAvg,
  currentGPA,
  finalProjectedGPA,
  simPlanChartData,
  enableProjection,
  getGPForMark,
  getLetterForMark,
  setSimulatedGrades,
  setHypotheticalUnits,
  setSimulationMode,
  setEnableProjection,
  onPrintReport,
}: StudentGpaPlannerProps) {
  const storageKey = `gpa-planner-scenarios:${student.id}`;
  const [goalPreset, setGoalPreset] = useState<GoalPreset>('first_class');
  const [customTarget, setCustomTarget] = useState(3.5);
  const [moduleToAdd, setModuleToAdd] = useState('');
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [compareId, setCompareId] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setEnableProjection(true);
    setSimulationMode('custom');
  }, [setEnableProjection, setSimulationMode, student.id]);

  // Seed expected marks for future modules so the existing projection engine has values to work with.
  useEffect(() => {
    const futureCodes = [...ungradedUnits, ...hypotheticalUnits];
    if (futureCodes.length === 0) return;
    setSimulatedGrades((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const code of futureCodes) {
        if (next[code] === undefined) {
          next[code] = baselineAvg !== null ? Math.max(30, Math.min(100, Math.round(baselineAvg))) : LETTER_TO_MARK.B;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [baselineAvg, hypotheticalUnits, setSimulatedGrades, ungradedUnits]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setSavedScenarios(raw ? (JSON.parse(raw) as SavedScenario[]) : []);
    } catch {
      setSavedScenarios([]);
    }
  }, [storageKey]);

  const goalTarget = goalPreset === 'custom'
    ? customTarget
    : GOAL_OPTIONS.find((option) => option.id === goalPreset)?.target ?? 3.7;

  const completedModules = gradedUnits.length;
  const registeredModules = student.enrolledUnits.length;
  // Equal-weight GPA engine: each module counts as one credit unit until credit hours exist in schema.
  const creditsCompleted = completedModules;
  const creditsRegistered = registeredModules;
  const creditsAfter = simPlanChartData.length;
  const hasCurrentGpa = completedModules > 0;
  const displayCurrentGpa = hasCurrentGpa ? currentGPA : null;
  const futureModules = simPlanChartData.filter((point) => point.type !== 'graded');
  const confidence = confidenceLevel(completedModules, futureModules.length);
  const graduation = graduationStatus(finalProjectedGPA, completedModules, futureModules.length);
  const classificationNow = classifyGpa(displayCurrentGpa);
  const classificationPredicted = classifyGpa(futureModules.length > 0 || hasCurrentGpa ? finalProjectedGPA : null);

  const gpaHistory = useMemo(() => {
    const points = gradedUnits.map((code, index) => {
      const grade = student.grades[code];
      const mark = (grade?.cat || 0) + (grade?.exam || 0);
      return {
        label: code,
        semester: (grade as { gradedAt?: string } | undefined)?.gradedAt
          ? new Date((grade as { gradedAt?: string }).gradedAt as string).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
          : `M${index + 1}`,
        GPA: getGPForMark(mark),
        mark,
      };
    });
    const uniquePeriods = new Set(points.map((point) => point.semester));
    return { points, hasTrend: uniquePeriods.size >= 2 && points.length >= 2 };
  }, [getGPForMark, gradedUnits, student.grades]);

  const insights = useMemo(() => {
    const messages: string[] = [];
    if (!hasCurrentGpa && futureModules.length === 0) {
      return ['No prediction can be generated yet. Register units or wait for published results.'];
    }

    const remaining = futureModules.length;
    if (remaining > 0 && goalTarget > 0) {
      const gradedGpSum = gradedUnits.reduce((sum, code) => {
        const grade = student.grades[code];
        return sum + getGPForMark((grade?.cat || 0) + (grade?.exam || 0));
      }, 0);
      const totalAfter = completedModules + remaining;
      const requiredAverageGp = Math.max(0, Math.min(4, ((goalTarget * totalAfter) - gradedGpSum) / remaining));
      const neededLetter = markToLetter(
        requiredAverageGp >= 3.7 ? 75 : requiredAverageGp >= 3 ? 65 : requiredAverageGp >= 2 ? 55 : requiredAverageGp >= 1 ? 45 : 30,
      );
      messages.push(
        requiredAverageGp > 4
          ? `Your goal of ${goalTarget.toFixed(2)} is not reachable with the remaining ${remaining} module${remaining === 1 ? '' : 's'} alone.`
          : `You need an average of about ${neededLetter} across remaining modules to reach a CGPA of ${goalTarget.toFixed(2)}.`,
      );
    }

    for (const module of futureModules.slice(0, 3)) {
      const title = moduleTitle(module.code, allCourses);
      const letter = markToLetter(module.mark);
      if (module.gp >= 3.5) {
        messages.push(`An ${letter} in ${title} helps keep your predicted CGPA near ${finalProjectedGPA.toFixed(2)}.`);
      } else if (module.gp <= 2) {
        messages.push(`A ${letter} in ${title} would reduce your predicted CGPA toward ${finalProjectedGPA.toFixed(2)}.`);
      } else {
        messages.push(`Expecting ${letter} in ${title} keeps your predicted CGPA around ${finalProjectedGPA.toFixed(2)}.`);
      }
    }

    if (finalProjectedGPA >= goalTarget) {
      messages.push(`Your current plan meets the goal of ${goalTarget.toFixed(2)} CGPA.`);
    } else if (hasCurrentGpa) {
      messages.push(`Your plan is currently ${(goalTarget - finalProjectedGPA).toFixed(2)} points below the selected goal.`);
    }

    return Array.from(new Set(messages)).slice(0, 5);
  }, [
    allCourses,
    completedModules,
    displayCurrentGpa,
    finalProjectedGPA,
    futureModules,
    getGPForMark,
    goalTarget,
    gradedUnits,
    hasCurrentGpa,
    simPlanChartData,
    student.grades,
  ]);

  const comparedScenario = savedScenarios.find((scenario) => scenario.id === compareId) || null;

  const resolveExpectedLetter = (code: string, fallbackMark: number): LetterGrade => {
    if (simulatedGrades[code] !== undefined) return markToLetter(simulatedGrades[code]);
    if (baselineAvg !== null) return markToLetter(fallbackMark);
    return 'B';
  };

  const setExpectedLetter = (code: string, letter: LetterGrade) => {
    setSimulationMode('custom');
    setEnableProjection(true);
    setSimulatedGrades((prev) => ({ ...prev, [code]: LETTER_TO_MARK[letter] }));
  };

  const resetScenario = () => {
    setSimulatedGrades({});
    setHypotheticalUnits([]);
    setModuleToAdd('');
    setCompareId('');
    setSimulationMode('custom');
    setStatusMessage('Scenario reset to defaults.');
  };

  const saveScenario = () => {
    const next: SavedScenario = {
      id: `scenario-${Date.now()}`,
      name: `Plan ${savedScenarios.length + 1}`,
      savedAt: new Date().toISOString(),
      simulatedGrades: { ...simulatedGrades },
      hypotheticalUnits: [...hypotheticalUnits],
      predictedGpa: finalProjectedGPA,
      goalPreset,
      customTarget,
    };
    const updated = [next, ...savedScenarios].slice(0, 6);
    setSavedScenarios(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setCompareId(next.id);
    setStatusMessage(`Saved “${next.name}”.`);
  };

  const loadScenario = (scenario: SavedScenario) => {
    setSimulatedGrades(scenario.simulatedGrades);
    setHypotheticalUnits(scenario.hypotheticalUnits);
    setGoalPreset(scenario.goalPreset);
    setCustomTarget(scenario.customTarget);
    setSimulationMode('custom');
    setEnableProjection(true);
    setCompareId(scenario.id);
    setStatusMessage(`Loaded “${scenario.name}”.`);
  };

  const addModule = () => {
    if (!moduleToAdd || hypotheticalUnits.includes(moduleToAdd)) return;
    setHypotheticalUnits((prev) => [...prev, moduleToAdd]);
    setModuleToAdd('');
    setSimulationMode('custom');
    setEnableProjection(true);
  };

  const impactTone = (delta: number) => {
    if (delta > 0.02) return 'text-emerald-700 bg-emerald-50';
    if (delta < -0.02) return 'text-rose-700 bg-rose-50';
    return 'text-slate-600 bg-slate-50';
  };

  return (
    <div className="space-y-5 font-sans no-print" aria-label="GPA Planner">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalculatorIcon />
            GPA Planner
          </h3>
          <p className="mt-1 text-xs text-slate-500">Plan future grades and instantly see how they affect your CGPA.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={resetScenario} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-3.5 w-3.5" /> Reset Scenario
          </button>
          <button type="button" onClick={saveScenario} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
            <Save className="h-3.5 w-3.5" /> Save Scenario
          </button>
          <button
            type="button"
            onClick={() => (onPrintReport ? onPrintReport() : window.print())}
            disabled={!hasCurrentGpa && futureModules.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            <Download className="h-3.5 w-3.5" /> Prediction Report
          </button>
        </div>
      </div>

      {statusMessage && (
        <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">{statusMessage}</p>
      )}

      {/* Current standing */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Current academic standing">
        {[
          { label: 'Current CGPA', value: displayCurrentGpa === null ? '—' : displayCurrentGpa.toFixed(2), detail: hasCurrentGpa ? 'From published marks' : 'No grades published' },
          { label: 'Credits Completed', value: String(creditsCompleted), detail: 'Passed / graded modules' },
          { label: 'Registered Credits', value: String(creditsRegistered), detail: 'Active enrollments' },
          { label: 'Completed Modules', value: String(completedModules), detail: 'With published results' },
          { label: 'Academic Classification', value: classificationNow, detail: hasCurrentGpa ? 'Based on CGPA' : 'Awaiting results' },
          { label: 'Current Semester', value: currentSemester, detail: 'From academic records' },
        ].map((card) => (
          <div key={card.label} className="min-h-[96px] rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 truncate">{card.value}</p>
            <p className="mt-1 text-[11px] text-slate-500">{card.detail}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Goal + prediction */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" />
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Academic goal</h4>
              <p className="text-[11px] text-slate-500">Choose what you are aiming for.</p>
            </div>
          </div>
          <div className="space-y-2">
            {GOAL_OPTIONS.map((option) => (
              <label key={option.id} className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-xs ${goalPreset === option.id ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                <span className="font-semibold">{option.label}</span>
                <input
                  type="radio"
                  name="gpa-goal"
                  className="accent-blue-600"
                  checked={goalPreset === option.id}
                  onChange={() => setGoalPreset(option.id)}
                />
              </label>
            ))}
          </div>
          {goalPreset === 'custom' && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600" htmlFor="custom-gpa-target">Desired CGPA</label>
              <input
                id="custom-gpa-target"
                type="number"
                min={0}
                max={4}
                step={0.01}
                value={customTarget}
                onChange={(event) => setCustomTarget(Math.max(0, Math.min(4, Number(event.target.value) || 0)))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
            Target CGPA: <span className="font-semibold text-slate-900">{goalTarget.toFixed(2)}</span>
            <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${finalProjectedGPA >= goalTarget ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {finalProjectedGPA >= goalTarget ? 'On track' : 'Needs improvement'}
            </span>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Live prediction</h4>
              <p className="text-[11px] text-slate-500">Updates automatically as you change expected grades.</p>
            </div>
          </div>
          {!enableProjection || (completedModules === 0 && futureModules.length === 0) ? (
            <EmptyState message="No prediction can be generated yet." />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <PredictionStat label="Predicted CGPA" value={finalProjectedGPA.toFixed(2)} tone={finalProjectedGPA >= goalTarget ? 'text-emerald-700' : 'text-amber-700'} />
              <PredictionStat label="Predicted Classification" value={classificationPredicted} />
              <PredictionStat label="Credits After Completion" value={String(creditsAfter)} />
              <PredictionStat label="Graduation Status" value={graduation.label} tone={graduation.tone} />
              <PredictionStat label="Confidence Level" value={confidence.label} badge={confidence.tone} />
            </div>
          )}
          {comparedScenario && (
            <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Comparing with <span className="font-semibold text-slate-900">{comparedScenario.name}</span>
              {' '}(saved {comparedScenario.predictedGpa.toFixed(2)} CGPA)
              {' → '}
              current plan {finalProjectedGPA.toFixed(2)}
              {' '}
              <span className={finalProjectedGPA >= comparedScenario.predictedGpa ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                ({finalProjectedGPA >= comparedScenario.predictedGpa ? '+' : ''}{(finalProjectedGPA - comparedScenario.predictedGpa).toFixed(2)})
              </span>
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Future modules */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Future modules</h4>
              <p className="text-[11px] text-slate-500">Set an expected grade for each ungraded or planned module.</p>
            </div>
            <div className="flex gap-2">
              <select
                value={moduleToAdd}
                onChange={(event) => setModuleToAdd(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 outline-none focus:border-blue-400"
              >
                <option value="">Add a module…</option>
                {unregisteredCodes.filter((code) => !hypotheticalUnits.includes(code)).map((code) => (
                  <option key={code} value={code}>[{code}] {moduleTitle(code, allCourses)}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={addModule}
                disabled={!moduleToAdd}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          </div>

          {futureModules.length === 0 ? (
            <EmptyState message="No future modules available." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="border-y border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5">Unit Code</th>
                    <th className="px-3 py-2.5">Unit Name</th>
                    <th className="px-3 py-2.5">Credits</th>
                    <th className="px-3 py-2.5">Expected Grade</th>
                    <th className="px-3 py-2.5 text-right"> </th>
                  </tr>
                </thead>
                <tbody>
                  {futureModules.map((module) => (
                    <tr key={`${module.type}-${module.code}`} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-3 font-mono font-semibold text-slate-800">{module.code}</td>
                      <td className="px-3 py-3 text-slate-700">{moduleTitle(module.code, allCourses)}</td>
                      <td className="px-3 py-3 text-slate-600">1</td>
                      <td className="px-3 py-3">
                        <select
                          value={resolveExpectedLetter(module.code, module.mark)}
                          onChange={(event) => setExpectedLetter(module.code, event.target.value as LetterGrade)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-400"
                        >
                          {LETTER_OPTIONS.map((letter) => (
                            <option key={letter} value={letter}>{letter}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {module.type === 'hypothetical' && (
                          <button
                            type="button"
                            onClick={() => setHypotheticalUnits((prev) => prev.filter((code) => code !== module.code))}
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                            title="Remove planned module"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-blue-600" />
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Academic insights</h4>
              <p className="text-[11px] text-slate-500">Guidance based on your current plan.</p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {insights.map((insight) => (
              <li key={insight} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-700">
                {insight}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Planning table */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-blue-600" />
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Module planning table</h4>
            <p className="text-[11px] text-slate-500">Completed results and planned grades in one place.</p>
          </div>
        </div>
        {simPlanChartData.length === 0 ? (
          <EmptyState message="No prediction can be generated yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="border-y border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Unit Code</th>
                  <th className="px-3 py-2.5">Module</th>
                  <th className="px-3 py-2.5">Credits</th>
                  <th className="px-3 py-2.5">Current Grade</th>
                  <th className="px-3 py-2.5">Predicted Grade</th>
                  <th className="px-3 py-2.5">Projected Impact</th>
                </tr>
              </thead>
              <tbody>
                {simPlanChartData.map((row, index) => {
                  const priorGpa = index === 0 ? (displayCurrentGpa ?? row.runningGPA) : simPlanChartData[index - 1].runningGPA;
                  const impact = Number((row.runningGPA - priorGpa).toFixed(2));
                  const currentLetter = row.type === 'graded' ? getLetterForMark(row.mark) : '—';
                  const predictedLetter = row.type === 'graded' ? getLetterForMark(row.mark) : markToLetter(row.mark);
                  return (
                    <tr key={`${row.type}-${row.code}-${index}`} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-3 font-mono font-semibold text-slate-800">{row.code}</td>
                      <td className="px-3 py-3 text-slate-700">{moduleTitle(row.code, allCourses)}</td>
                      <td className="px-3 py-3 text-slate-600">1</td>
                      <td className="px-3 py-3 text-slate-700">{currentLetter}</td>
                      <td className="px-3 py-3 font-semibold text-slate-800">{predictedLetter}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${impactTone(impact)}`}>
                          {impact > 0 ? '+' : ''}{impact.toFixed(2)} CGPA
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <div>
              <h4 className="text-sm font-semibold text-slate-900">GPA trend</h4>
              <p className="text-[11px] text-slate-500">Based on published results only.</p>
            </div>
          </div>
          {gpaHistory.hasTrend ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gpaHistory.points}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="semester" fontSize={10} />
                  <YAxis domain={[0, 4]} fontSize={10} />
                  <Tooltip />
                  <Line type="monotone" dataKey="GPA" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="You need more completed semesters before GPA trends can be displayed." />
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Saved scenarios</h4>
              <p className="text-[11px] text-slate-500">Compare alternate grade plans.</p>
            </div>
          </div>
          {savedScenarios.length === 0 ? (
            <EmptyState message="No saved scenarios yet." />
          ) : (
            <div className="space-y-2">
              {savedScenarios.map((scenario) => (
                <div key={scenario.id} className="rounded-lg border border-slate-100 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{scenario.name}</p>
                      <p className="text-[11px] text-slate-500">Predicted {scenario.predictedGpa.toFixed(2)} · {new Date(scenario.savedAt).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => loadScenario(scenario)} className="rounded-md px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50">Load</button>
                      <button
                        type="button"
                        onClick={() => setCompareId(scenario.id)}
                        className={`rounded-md px-2 py-1 text-[11px] font-semibold ${compareId === scenario.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        Compare
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function CalculatorIcon() {
  return <Calculator className="h-5 w-5 text-blue-600" />;
}

function PredictionStat({
  label,
  value,
  tone,
  badge,
}: {
  label: string;
  value: string;
  tone?: string;
  badge?: string;
}) {
  return (
    <div className="min-h-[88px] rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-sm font-semibold ${tone || 'text-slate-900'}`}>
        {badge ? <span className={`rounded-full px-2 py-0.5 text-[11px] ${badge}`}>{value}</span> : value}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
      <AlertCircle className="mb-2 h-5 w-5 text-slate-300" />
      <p className="text-xs font-medium text-slate-600">{message}</p>
    </div>
  );
}
