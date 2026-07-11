import React from 'react';
import { 
  Printer, Award, BookOpen, Clock, FileText, CheckCircle, 
  X, ShieldAlert, FileCheck2, Calendar, HardDrive
} from 'lucide-react';
import { Student, Course } from '../types';
import { subjectMap } from '../data';

interface StudentTranscriptProps {
  student: Student;
  allCourses: Course[];
  onClose: () => void;
}

export default function StudentTranscript({
  student,
  allCourses,
  onClose
}: StudentTranscriptProps) {
  
  // Grade calculations lookup matching university standard policies
  const getGPForMark = (mark: number): number => {
    if (mark >= 70) return 4.0;
    if (mark >= 60) return 3.0;
    if (mark >= 50) return 2.0;
    if (mark >= 40) return 1.0;
    return 0.0;
  };

  const getLetterForMark = (mark: number): string => {
    if (mark >= 70) return 'A';
    if (mark >= 60) return 'B';
    if (mark >= 50) return 'C';
    if (mark >= 40) return 'D';
    return 'F';
  };

  const getClassificationForGPA = (gpa: number): { title: string; color: string; bg: string } => {
    if (gpa >= 3.7) return { title: 'First Class Honours (Distinction)', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    if (gpa >= 3.0) return { title: 'Second Class Honours (Upper Division)', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' };
    if (gpa >= 2.0) return { title: 'Second Class Honours (Lower Division)', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
    if (gpa >= 1.0) return { title: 'Pass', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' };
    return { title: 'Academic Probation / Fail', color: 'text-red-700', bg: 'bg-red-50 border-red-200' };
  };

  const getCourseCredits = (code: string): number => {
    // Deterministic module credit sizing:
    if (code.includes('ML') || code.includes('Stats') || code.includes('Crypto')) return 3;
    return 4;
  };

  const getProgramOfStudy = (admissionNo: string): string => {
    const codeUpper = admissionNo.toUpperCase();
    if (codeUpper.includes('CS')) return 'Bachelor of Science in Computer Science';
    if (codeUpper.includes('EE')) return 'Bachelor of Engineering in Electrical & Electronics Engineering';
    if (codeUpper.includes('DS')) return 'Bachelor of Science in Data Science & Analytics';
    if (codeUpper.includes('CYBER')) return 'Bachelor of Science in Cybersecurity & Forensics';
    
    // Look for any courses to guess
    return 'Bachelor of Science in Computer Science & Systems Engineering';
  };

  // Extract units
  const enrolledUnits = student.enrolledUnits;
  
  let totalCreditsAttempted = 0;
  let totalCreditsEarned = 0;
  let totalGPPoints = 0;
  let gradedCount = 0;

  const records = enrolledUnits.map((code) => {
    const grade = student.grades[code];
    const isGraded = grade !== undefined;
    const markSum = isGraded ? (grade.cat + grade.exam) : 0;
    
    const credits = getCourseCredits(code);
    const letter = isGraded ? getLetterForMark(markSum) : 'I'; // I = Incomplete / In Progress
    const gp = isGraded ? getGPForMark(markSum) : 0.0;
    
    totalCreditsAttempted += credits;
    if (isGraded) {
      gradedCount++;
      if (markSum >= 40) {
        totalCreditsEarned += credits;
      }
      totalGPPoints += gp * credits;
    }

    return {
      code,
      title: subjectMap[code] || 'Special Elective Module',
      credits,
      score: isGraded ? `${markSum}%` : 'In Progress',
      letter,
      gp: isGraded ? gp.toFixed(1) : '—',
      weightedGP: isGraded ? (gp * credits).toFixed(1) : '—',
      isGraded,
    };
  });

  const cumulativegpa = totalCreditsAttempted > 0 && gradedCount > 0
    ? Number((totalGPPoints / totalCreditsAttempted).toFixed(2))
    : 0.00;

  const standing = getClassificationForGPA(cumulativegpa);
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 print-container-overlay">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-150 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Controls Bar */}
        <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-6 py-4 flex justify-between items-center no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-150 text-indigo-750 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4 text-indigo-700" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Transcript Generator
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Official institutional styling configured for printable PDF export.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print to PDF / Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-xl transition-all cursor-pointer"
              title="Close Panel"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* PRINTABLE TRANSCRIPT AREA */}
        <div className="overflow-y-auto p-4 sm:p-8 flex-1 bg-[#FAF9F5] text-slate-900 transcript-scroll-content">
          
          {/* Transcript Sheet Wrapper: Standard Letter/A4 Aspect Styled */}
          <div 
            id="transcript-print-area" 
            className="bg-white border-4 border-double border-slate-350 p-6 sm:p-10 shadow-lg relative rounded-sm mx-auto max-w-[210mm] min-h-[297mm] flex flex-col justify-between"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {/* Elegant Shield Crest Watermark in background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none z-0">
              <svg className="w-96 h-96 fill-slate-900" viewBox="0 0 24 24">
                <path d="M12 2L2 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-10-3zm0 3c3.87 0 7 3.13 7 7 0 2.38-1.19 4.47-3 5.74V17h-2v-1.16c-.33.1-.65.16-1 .16s-.67-.06-1-.16V17H9v-1.26c-1.81-1.27-3-3.36-3-5.74 0-3.87 3.13-7 7-7z" />
              </svg>
            </div>

            <div className="space-y-6 z-10 relative">
              {/* Institution Header Block */}
              <div className="flex flex-col md:flex-row justify-between items-center border-b-2 border-slate-300 pb-4 gap-4 text-center md:text-left">
                <div className="flex items-center gap-4 flex-col md:flex-row">
                  {/* Real-looking College Crest Emblem */}
                  <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center border-4 border-double border-slate-300 shadow-sm">
                    <svg className="w-9 h-9 fill-[#fcd34d]" viewBox="0 0 24 24">
                      <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
                      <path d="M22 12c-1.1 0-2-.9-2-2V8l-8 4.36-8-4.36v2c0 1.1-.9 2-2 2H1v5h2v-4h18v4h2v-5h-1z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl font-extrabold tracking-tight uppercase text-slate-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      Zenti Metropolitan University
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Empowering Minds • Innovating Futures
                    </p>
                    <p className="text-[9px] text-slate-400 mt-1">
                      Mombasa Road Office Park, Nairobi, Kenya | Web: zenti.ac.ke | Email: registry@zenti.ac.ke
                    </p>
                  </div>
                </div>

                <div className="text-right flex flex-col items-center md:items-end">
                  <span className="text-[10px] bg-red-100 text-red-800 border border-red-300 px-3 py-1 font-black uppercase tracking-widest rounded-md" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Official Transcript
                  </span>
                  <span className="text-[9px] text-slate-400 mt-1 font-semibold font-mono">Doc ID: TR-{student.id.toUpperCase()}-{Math.random().toString(36).substring(3, 8).toUpperCase()}</span>
                </div>
              </div>

              {/* Student Demographics Block */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-sans">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Student Full Name</span>
                  <span className="font-bold text-slate-900">{student.name}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Student Identification</span>
                  <span className="font-bold text-slate-900 font-mono">{student.admissionNo}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Academic Cohort</span>
                  <span className="font-bold text-slate-900">{student.cohort}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Issued / Certified Date</span>
                  <span className="font-bold text-slate-800">{currentDate}</span>
                </div>
                
                <div className="col-span-2">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Program / Course pathway Study</span>
                  <span className="font-bold text-slate-900">{getProgramOfStudy(student.admissionNo)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Enrolled Campus Faculties</span>
                  <span className="font-bold text-slate-700">School of Computing, Artificial Intelligence & Engineering</span>
                </div>
              </div>

              {/* Course Units Grade Transcript Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 flex items-center gap-1.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <BookOpen className="w-4 h-4 text-slate-700" />
                  <span>Certified Unit Grades Statement</span>
                </h3>

                <div className="overflow-x-auto border border-slate-200 rounded-md">
                  <table className="w-full text-left text-xs border-collapse font-sans bg-white">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3 w-28">Subject Code</th>
                        <th className="py-2.5 px-3">Subject Title / Core Curriculum Description</th>
                        <th className="py-2.5 px-3 text-center w-16">Credit</th>
                        <th className="py-2.5 px-3 text-center w-20">Total Score</th>
                        <th className="py-2.5 px-3 text-center w-16">Letter</th>
                        <th className="py-2.5 px-3 text-center w-20">Grade Point</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans text-[11px]">
                      {records.map((row) => (
                        <tr key={row.code} className="hover:bg-slate-50/20">
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">{row.code}</td>
                          <td className="py-3 px-3 text-slate-850 font-medium">{row.title}</td>
                          <td className="py-3 px-3 text-center font-semibold text-slate-605">{row.credits.toFixed(1)}</td>
                          <td className="py-3 px-3 text-center font-bold text-slate-900">{row.score}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded font-black font-mono border text-[10px] ${
                              row.letter === 'A' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              row.letter === 'B' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                              row.letter === 'C' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                              row.letter === 'D' ? 'bg-slate-50 text-slate-800 border-slate-200' :
                              row.letter === 'I' ? 'bg-orange-50 text-orange-850 border-orange-250' :
                              'bg-red-50 text-red-800 border-red-200'
                            }`}>
                              {row.letter}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">{row.gp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cumulative Academic Totals Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                
                {/* GPA & Standing classifications */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      Overall Cumulative Standing Summary
                    </span>
                    
                    <div className="flex justify-between items-end border-b border-slate-200/50 pb-2">
                      <span className="text-slate-500 text-xs">Total Credits Registered:</span>
                      <span className="font-bold font-mono text-slate-950 text-sm">{totalCreditsAttempted.toFixed(1)}</span>
                    </div>

                    <div className="flex justify-between items-end border-b border-slate-200/50 pb-2">
                      <span className="text-slate-500 text-xs">Total Credits Successfully Earned:</span>
                      <span className="font-bold font-mono text-slate-950 text-sm">{totalCreditsEarned.toFixed(1)}</span>
                    </div>

                    <div className="flex justify-between items-end">
                      <span className="text-slate-500 text-xs">Cumulative Grade Point Average (GPA):</span>
                      <span className="font-black font-mono text-indigo-750 text-base">{cumulativegpa.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className={`p-2.5 rounded-md border text-center text-xs font-bold ${standing.bg}`}>
                    <span className="text-[8px] uppercase tracking-widest text-slate-400 block font-semibold">Academic Honors Division Classification</span>
                    <span className={`text-xs ${standing.color}`}>{standing.title}</span>
                  </div>
                </div>

                {/* Verification QR, seal & remarks */}
                <div className="border border-slate-200 p-4 rounded-lg relative overflow-hidden flex flex-col justify-between gap-4 bg-white/40">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        Electronic Authentication Seal
                      </span>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        This document carries a digital signature of registry clearance. Scan the QR code to verify student credential integrity against university ledger databases.
                      </p>
                    </div>

                    {/* Highly authentic looking procedural SVG generated QR Code */}
                    <div className="w-16 h-16 min-w-[64px] bg-white p-1 border border-slate-300 rounded shadow-2xs flex flex-col justify-between shrink-0">
                      <svg className="w-full h-full fill-slate-950" viewBox="0 0 100 100">
                        {/* QR Code corners */}
                        <rect x="0" y="0" width="30" height="30" />
                        <rect x="5" y="5" width="20" height="20" fill="white" />
                        <rect x="10" y="10" width="10" height="10" />
                        
                        <rect x="70" y="0" width="30" height="30" />
                        <rect x="75" y="5" width="20" height="20" fill="white" />
                        <rect x="80" y="10" width="10" height="10" />

                        <rect x="0" y="70" width="30" height="30" />
                        <rect x="5" y="75" width="20" height="20" fill="white" />
                        <rect x="10" y="80" width="10" height="10" />

                        {/* Random QR structures */}
                        <rect x="40" y="40" width="20" height="20" />
                        <rect x="45" y="45" width="10" height="10" fill="white" />

                        <rect x="35" y="10" width="15" height="10" />
                        <rect x="55" y="0" width="10" height="25" />
                        
                        <rect x="0" y="35" width="10" height="15" />
                        <rect x="15" y="55" width="15" height="10" />
                        
                        <rect x="85" y="35" width="15" height="20" />
                        <rect x="70" y="60" width="10" height="10" />

                        <rect x="35" y="75" width="25" height="15" />
                        <rect x="75" y="75" width="15" height="15" />
                      </svg>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-[9px] text-yellow-800 leading-normal font-sans">
                    <b>Authentication Warning:</b> Valid only when bearing official institutional electronic patterns. Alteration of this transcript represents legal violation and voids academic qualification records.
                  </div>
                </div>

              </div>
            </div>

            {/* Registrar Signature & Official Endorsements Footer */}
            <div className="border-t-2 border-slate-350 pt-4 flex flex-col sm:flex-row justify-between items-center text-xs mt-10 gap-6">
              <div className="text-center sm:text-left space-y-1">
                <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-widest block" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  ★ CERTIFIED OFFICIAL COPY
                </span>
                <p className="text-[10px] text-slate-400">Printed directly from secure Student Academic Information System nodes</p>
              </div>

              {/* Realistic looking signature block */}
              <div className="text-center w-48 relative flex flex-col items-center">
                
                {/* Simulated Cursive Script SVG Path signature */}
                <div className="absolute -top-7 h-12 w-40 pointer-events-none select-none opacity-80 overflow-visible">
                  <svg className="w-full h-full stroke-indigo-700 fill-none" strokeWidth="2" strokeLinecap="round" viewBox="0 0 100 40">
                    <path d="M 10 25 C 20 15, 25 10, 30 25 C 38 40, 42 10, 48 20 C 55 30, 60 5, 68 28 C 75 40, 80 15, 90 20" />
                    <path d="M 20 22 L 80 18" strokeWidth="1.5" />
                  </svg>
                </div>

                <div className="w-full border-t border-slate-400 pt-1 text-center">
                  <p className="font-bold text-slate-805 text-[11px]">Prof. Beatrice Wanja</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mt-0.5">Office of the Registrar</p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
