import React, { useState } from 'react';
import { 
  GraduationCap, BookOpen, CheckCircle2, Clock, 
  Sparkles, Award, ShieldAlert, ArrowRight, Trophy
} from 'lucide-react';
import { Student, Course } from '../types';
import { subjectMap } from '../data';

interface DegreeProgressProps {
  student: Student;
  allCourses: Course[];
  setActiveTab: (tab: 'dashboard' | 'grades' | 'financials' | 'materials' | 'units' | 'officeHours') => void;
}

export default function DegreeProgress({
  student,
  allCourses,
  setActiveTab
}: DegreeProgressProps) {
  const [showDetailedAudit, setShowDetailedAudit] = useState(false);

  // 1. Detect Degree Program
  const getProgramInfo = (admissionNo: string) => {
    const code = admissionNo.toUpperCase();
    if (code.includes('CS')) {
      return {
        name: 'Bachelor of Science in Computer Science',
        code: 'B.Sc. CS',
        requiredCore: ['CS-101-Web', 'CS-101-Algo'],
        totalRequiredUnits: 12, // 12 units required for graduation
        creditsPerUnit: 4,
        minGpaToGraduate: 2.0
      };
    }
    if (code.includes('EE')) {
      return {
        name: 'Bachelor of Engineering in Electrical & Electronics Engineering',
        code: 'B.Eng. EE',
        requiredCore: ['EE-201-Circuits', 'CS-101-Algo'],
        totalRequiredUnits: 15,
        creditsPerUnit: 4,
        minGpaToGraduate: 2.0
      };
    }
    if (code.includes('DS')) {
      return {
        name: 'Bachelor of Science in Data Science & Analytics',
        code: 'B.Sc. DS',
        requiredCore: ['DS-202-ML', 'DS-202-Stats'],
        totalRequiredUnits: 12,
        creditsPerUnit: 3,
        minGpaToGraduate: 2.0
      };
    }
    if (code.includes('CYBER')) {
      return {
        name: 'Bachelor of Science in Cybersecurity & Forensics',
        code: 'B.Sc. CYBER',
        requiredCore: ['CYBER-310-Crypto', 'CS-101-Algo'],
        totalRequiredUnits: 12,
        creditsPerUnit: 4,
        minGpaToGraduate: 2.0
      };
    }
    return {
      name: 'Bachelor of Science in Computer Science & Systems Engineering',
      code: 'B.Sc. CSSE',
      requiredCore: ['CS-101-Web', 'CS-101-Algo'],
      totalRequiredUnits: 12,
      creditsPerUnit: 4,
      minGpaToGraduate: 2.0
    };
  };

  const program = getProgramInfo(student.admissionNo);

  // 2. Identify Academic States
  // A unit is completed if graded AND score (CAT + Exam) is >= 40
  const completedUnits = student.enrolledUnits.filter(code => {
    const grade = student.grades[code];
    return grade !== undefined && (grade.cat + grade.exam) >= 40;
  });

  const inProgressUnits = student.enrolledUnits.filter(code => {
    const grade = student.grades[code];
    return grade === undefined || (grade.cat + grade.exam) < 40;
  });

  // Calculate percentages
  const completionPercentage = Math.round((completedUnits.length / program.totalRequiredUnits) * 100);
  const inProgressPercentage = Math.round((inProgressUnits.length / program.totalRequiredUnits) * 100);
  const remainingPercentage = Math.max(0, 100 - completionPercentage - inProgressPercentage);

  // Credits Calculation
  const creditsEarned = completedUnits.length * program.creditsPerUnit;
  const totalCreditsRequired = program.totalRequiredUnits * program.creditsPerUnit;

  // Grade averages & classification
  const gradedList = Object.keys(student.grades);
  const gradedMarkSum = gradedList.reduce((sum, code) => {
    const g = student.grades[code];
    return sum + (g.cat + g.exam);
  }, 0);
  const avgScore = gradedList.length > 0 ? Math.round(gradedMarkSum / gradedList.length) : 60;

  const getGPA = (mark: number): number => {
    if (mark >= 70) return 4.0;
    if (mark >= 60) return 3.0;
    if (mark >= 50) return 2.0;
    if (mark >= 40) return 1.0;
    return 0.0;
  };

  const gpaTotal = gradedList.reduce((sum, code) => {
    const g = student.grades[code];
    return sum + getGPA(g.cat + g.exam);
  }, 0);
  const currentGPA = gradedList.length > 0 ? (gpaTotal / gradedList.length) : 0.0;

  const getClassification = (gpa: number) => {
    if (gpa >= 3.7) return { title: 'First Class Honours', color: 'text-emerald-700 bg-emerald-50 border-emerald-250' };
    if (gpa >= 3.0) return { title: 'Second Class Upper Division', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
    if (gpa >= 2.0) return { title: 'Second Class Lower Division', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { title: 'Pass Status', color: 'text-slate-700 bg-slate-50 border-slate-200' };
  };

  const classification = getClassification(currentGPA);

  // Color selection based on degree progress
  const getProgressColor = (pct: number) => {
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 50) return 'bg-blue-600';
    if (pct >= 25) return 'bg-indigo-650';
    return 'bg-amber-500';
  };

  const currentThemeColor = getProgressColor(completionPercentage);

  return (
    <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-xs hover:border-slate-300 transition-all space-y-5 no-print" id="degree-progress-widget">
      
      {/* 1. Card Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
            <GraduationCap className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-850 font-display">Academic Degree Progress Summary</h3>
            <p className="text-[11px] text-slate-500 font-mono font-semibold uppercase">{program.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[10px] uppercase font-bold py-1 px-2.5 rounded-lg border leading-none ${classification.color}`}>
            {classification.title}
          </span>
          <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 uppercase font-bold py-1 px-2.5 rounded-lg leading-none">
            GPA: {currentGPA.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 2. visual Progress Meter */}
      <div className="space-y-2">
        <div className="flex justify-between items-baseline text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <span>Completed Index:</span>
            <span className="font-extrabold text-slate-850 text-sm">
              {completedUnits.length} / {program.totalRequiredUnits} Modules
            </span>
            <span className="text-slate-400 font-normal">({creditsEarned} of {totalCreditsRequired} Credits)</span>
          </div>
          <span className="font-black text-slate-900 text-lg sm:text-xl font-mono leading-none">
            {completionPercentage}%
          </span>
        </div>

        {/* Compound Progress Bar */}
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200">
          {/* Completed Segment */}
          <div 
            style={{ width: `${completionPercentage}%` }} 
            className={`${currentThemeColor} transition-all duration-1000 ease-out relative`}
            title={`Completed: ${completionPercentage}%`}
          >
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent animate-pulse" />
          </div>
          {/* In Progress Segment */}
          <div 
            style={{ width: `${inProgressPercentage}%` }} 
            className="bg-amber-400 transition-all duration-1000 ease-out"
            title={`In Progress: ${inProgressPercentage}%`}
          />
        </div>

        {/* Progress Legend */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[10.5px] text-slate-505 pt-1">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-semibold">
              <span className={`w-3 h-3 rounded-full ${currentThemeColor}`}></span>
              <span>Completed ({completionPercentage}%)</span>
            </div>
            {inProgressUnits.length > 0 && (
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                <span>In Current Semester ({inProgressPercentage}%)</span>
              </div>
            )}
            {remainingPercentage > 0 && (
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300"></span>
                <span>Outstanding ({remainingPercentage}%)</span>
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-400 flex items-center gap-1 italic">
            <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Target to graduate: 100% completion & GPA ≥ {program.minGpaToGraduate.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* 3. smart Degree Audit Checklist */}
      <div className="border-t border-slate-100 pt-4.5 space-y-3">
        <div className="flex justify-between items-center gap-4">
          <button 
            type="button" 
            onClick={() => setShowDetailedAudit(!showDetailedAudit)}
            className="text-xs text-blue-650 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
          >
            {showDetailedAudit ? 'Hide Comprehensive Program Checklist' : 'Show Comprehensive Program Checklist'}
            <ArrowRight className={`w-3.5 h-3.5 transition-transform ${showDetailedAudit ? 'rotate-90' : ''}`} />
          </button>
          
          <div className="text-[10px] text-slate-400">
            {completedUnits.length >= program.totalRequiredUnits ? (
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-100 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Fully Audited
              </span>
            ) : (
              <span className="font-mono">{program.totalRequiredUnits - completedUnits.length} modules left</span>
            )}
          </div>
        </div>

        {showDetailedAudit && (
          <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-4.5 space-y-4 animate-fade-in text-xs">
            
            {/* Core Track Checklist */}
            <div className="space-y-2.5">
              <h4 className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">
                Required Core Track Specifications
              </h4>
              
              <div className="grid sm:grid-cols-2 gap-3">
                {program.requiredCore.map(code => {
                  const isEnrolled = student.enrolledUnits.includes(code);
                  const isCompleted = completedUnits.includes(code);
                  const grade = student.grades[code];

                  return (
                    <div 
                      key={code} 
                      className={`border rounded-lg p-3 flex justify-between items-center ${
                        isCompleted 
                          ? 'bg-emerald-50/40 border-emerald-150' 
                          : isEnrolled 
                            ? 'bg-amber-50/20 border-amber-200' 
                            : 'bg-white border-slate-200/80 grayscale opacity-75'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="font-mono text-[9px] font-bold text-slate-450 block">{code}</span>
                        <span className="font-extrabold text-slate-800 truncate block max-w-[150px] sm:max-w-xs text-[11px]" title={subjectMap[code]}>
                          {subjectMap[code] || 'Elective Specification'}
                        </span>
                      </div>

                      <div>
                        {isCompleted ? (
                          <div className="text-right">
                            <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded block mb-1">
                              Pass ({grade.cat + grade.exam}%)
                            </span>
                          </div>
                        ) : isEnrolled ? (
                          <button 
                            type="button"
                            onClick={() => setActiveTab('grades')}
                            className="bg-amber-550 hover:bg-amber-600 text-white font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wide cursor-pointer transition-colors"
                          >
                            In Progress
                          </button>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => setActiveTab('units')}
                            className="bg-slate-900 hover:bg-slate-950 text-white font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wide cursor-pointer transition-all hover:scale-105 flex items-center gap-0.5"
                          >
                            <span>Enroll</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* General Electives & Capstone Tracking */}
            <div className="border-t border-slate-150/60 pt-3.5 space-y-2.5">
              <h4 className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">
                Recommended Supporting Coursework
              </h4>

              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                <div className="p-3 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-700 block">General Supporting Elective Units</span>
                    <span className="text-[10px] text-slate-400">Additional supplemental coursework to hit overall units total</span>
                  </div>
                  <div className="text-right font-mono font-bold text-slate-800">
                    {completedUnits.length - completedUnits.filter(c => program.requiredCore.includes(c)).length} / {program.totalRequiredUnits - program.requiredCore.length} Completed
                  </div>
                </div>

                <div className="p-3 flex justify-between items-center">
                  <div className="space-y-0.5 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-450"></div>
                    <span className="font-semibold text-slate-700 block">Senior Final Capstone Project</span>
                  </div>
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    Year 4 Requirement
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Advisory Prompt */}
            <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-3.5 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-blue-800 text-[11px] block">Zenti Academic Pathways Assistant Suggestion</span>
                <p className="text-[10.5px] leading-relaxed text-blue-700">
                  {completionPercentage < 40 ? (
                    "Welcome to your degree pathway! Try to build solid foundational momentum. Register for required first-year core modules and keep an eye on your continuous assessment tests (CATs)."
                  ) : completionPercentage < 75 ? (
                    `Excellent! You have reached ${completionPercentage}% degree completion. Focus on maintaining a strong core track GPA. Schedule office hours with your lecturers for advisory consultation soon.`
                  ) : (
                    "Almost at the finish line! You've audited and cleared the majority of your curriculum credits. Ensure your pending invoices are settled to request graduation clearance and certified transcripts."
                  )}
                </p>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
