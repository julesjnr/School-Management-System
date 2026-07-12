import React, { useState } from 'react';
import { 
  Search, GraduationCap, User, BookOpen, CreditCard, FileText, 
  Calendar, TrendingUp, Clock, ChevronDown, CheckCircle2, 
  AlertCircle, Fingerprint, Bookmark, Award, ShieldCheck, DollarSign
} from 'lucide-react';
import { Student, Book, Loan, Reservation, BookRequest, LibraryGateLog, Course, Lecturer } from '../types';

interface StudentAdmissionDossierStationProps {
  students: Student[];
  role: 'admin' | 'lecturer' | 'accountant' | 'librarian';
  books?: Book[];
  loans?: Loan[];
  reservations?: Reservation[];
  bookRequests?: BookRequest[];
  libraryGateLogs?: LibraryGateLog[];
  courses?: Course[];
  currentLecturer?: Lecturer;
}

export default function StudentAdmissionDossierStation({
  students = [],
  role,
  books = [],
  loans = [],
  reservations = [],
  bookRequests = [],
  libraryGateLogs = [],
  courses = [],
  currentLecturer
}: StudentAdmissionDossierStationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Filter students based on typed admission number
  const matchedStudents = students.filter(student => 
    student.admissionNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedStudent = students.find(s => s.id === selectedStudentId) || 
    (searchQuery ? students.find(s => s.admissionNo.toLowerCase() === searchQuery.trim().toLowerCase()) : null);

  // Calculate final grade helper
  const getGradeDetails = (cat: number, exam: number) => {
    const total = cat + exam;
    let letter = 'F';
    let color = 'text-rose-600 bg-rose-50 border-rose-100';

    if (total >= 70) {
      letter = 'A';
      color = 'text-emerald-700 bg-emerald-50 border-emerald-100';
    } else if (total >= 60) {
      letter = 'B';
      color = 'text-blue-700 bg-blue-50 border-blue-100';
    } else if (total >= 50) {
      letter = 'C';
      color = 'text-indigo-700 bg-indigo-50 border-indigo-100';
    } else if (total >= 40) {
      letter = 'D';
      color = 'text-amber-700 bg-amber-50 border-amber-100';
    }

    return { total, letter, color };
  };

  // Helper to find courses details
  const getCourseName = (code: string) => {
    const course = courses.find(c => c.code === code);
    return course ? course.title : 'General Module';
  };

  // Student specific statistics
  const studentLoans = loans.filter(l => l.patronId === selectedStudent?.id);
  const studentReservations = reservations.filter(r => r.patronId === selectedStudent?.id);
  const studentBookRequests = bookRequests.filter(r => r.suggestedBy === selectedStudent?.id || r.suggestedBy === selectedStudent?.name);
  const studentGateLogs = libraryGateLogs.filter(g => g.patronId === selectedStudent?.id);

  // Financial summary
  const totalInvoiced = selectedStudent?.ledger.reduce((sum, inv) => sum + inv.amount, 0) || 0;
  const totalPaid = selectedStudent?.ledger.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0) || 0;
  const outstandingDebt = totalInvoiced - totalPaid;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm animate-fadeIn" id="admission-dossier-root">
      
      {/* Station Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Student Admission Dossier Station
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Instantly query registered credentials, academics, financial ledger balances, and library active checkout logs by admission number.
          </p>
        </div>
        <div className="text-[10px] bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider self-start">
          Access Mode: {role === 'admin' ? 'Master Admin' : role === 'accountant' ? 'Financial Accountant' : role === 'librarian' ? 'Bibliotheca Librarian' : 'Lecturer / Advisor'}
        </div>
      </div>

      {/* SEARCH COMPONENT ONLY */}
      <div className="grid grid-cols-1 gap-4 items-center">
        <div className="relative">
          <label htmlFor="admission-search-input" className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Search Admission Number
          </label>
          <div className="relative">
            <input
              id="admission-search-input"
              type="text"
              placeholder="Enter student admission number (e.g. ED-CS-2026-048) and press Enter..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-100 font-mono"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
        </div>
      </div>

      {/* STUDENT PROFILE DOSSIER */}
      {selectedStudent ? (
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs animate-fadeIn">
          
          {/* Header Card */}
          <div className="bg-slate-900 text-white p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                {selectedStudent.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">{selectedStudent.name}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 font-mono text-[11px] text-slate-300">
                  <span>ADM: <strong className="text-indigo-400">{selectedStudent.admissionNo}</strong></span>
                  <span>•</span>
                  <span>Cohort: {selectedStudent.cohort}</span>
                </div>
              </div>
            </div>
            <div className="space-y-1 text-left md:text-right font-mono text-xs text-slate-350">
              <p>Email: {selectedStudent.email}</p>
              <p>Phone: {selectedStudent.phone}</p>
            </div>
          </div>

          <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT / CENTRAL SECTION: ACADEMICS / LIBRARY / FEE CONTEXTS */}
            <div className="lg:col-span-8 space-y-6">

              {/* 1. FINANCIAL MODULES (Visible to Admin, Accountant) */}
              {(role === 'admin' || role === 'accountant') && (
                <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-3xs">
                  <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-800 pb-2.5">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      Financial Ledger Statements & Invoices
                    </h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      outstandingDebt <= 0 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                    }`}>
                      {outstandingDebt <= 0 ? 'FEES CLEARED' : `OUTSTANDING DEBT: KES ${outstandingDebt.toLocaleString()}`}
                    </span>
                  </div>

                  {/* Summary row */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Invoiced</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">KES {totalInvoiced.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Paid</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">KES {totalPaid.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Pending Balance</span>
                      <span className={`text-xs font-bold ${outstandingDebt > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600'}`}>
                        KES {outstandingDebt.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Invoices Table */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Invoices Raised</span>
                    <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-100 dark:border-slate-800">
                            <th className="py-2 px-3">Invoice No</th>
                            <th className="py-2 px-3">Description</th>
                            <th className="py-2 px-3">Issue Date</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                            <th className="py-2 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {selectedStudent.ledger.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-3 text-center text-slate-400 italic">No invoices logged.</td>
                            </tr>
                          ) : (
                            selectedStudent.ledger.map(inv => (
                              <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                <td className="py-2 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">{inv.invoiceNo}</td>
                                <td className="py-2 px-3 text-slate-900 dark:text-slate-100 font-semibold">{inv.description}</td>
                                <td className="py-2 px-3 text-slate-500">{inv.date}</td>
                                <td className="py-2 px-3 text-right font-bold text-slate-800 dark:text-slate-200">KES {inv.amount.toLocaleString()}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    inv.status === 'paid' 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/30' 
                                      : 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-900/30'
                                  }`}>
                                    {inv.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payments Table */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Payments Logged</span>
                    <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-100 dark:border-slate-800">
                            <th className="py-2 px-3">Receipt Ref</th>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Method</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                            <th className="py-2 px-3 text-center">Reconciliation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {selectedStudent.payments?.length === 0 || !selectedStudent.payments ? (
                            <tr>
                              <td colSpan={5} className="py-3 text-center text-slate-400 italic">No financial transactions logged.</td>
                            </tr>
                          ) : (
                            selectedStudent.payments.map(p => (
                              <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300 font-extrabold">{p.transactionId}</td>
                                <td className="py-2 px-3 text-slate-500">{p.date}</td>
                                <td className="py-2 px-3 text-slate-650 dark:text-slate-350">{p.paymentMethod}</td>
                                <td className="py-2 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">KES {p.amount.toLocaleString()}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    p.status === 'reconciled' 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                      : 'bg-amber-50 text-amber-700 border border-amber-150 animate-pulse'
                                  }`}>
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. LIBRARY WORKSPACE (Visible to Admin, Librarian) */}
              {(role === 'admin' || role === 'librarian') && (
                <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-3xs">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-150 dark:border-slate-800 pb-2.5">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    Bibliotheca Hold Requests & Checkout Logs
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Active Book Loans */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                        <Bookmark className="w-3 h-3 text-blue-500" />
                        Current Checked Out Books ({studentLoans.length})
                      </span>
                      <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden text-[11px] divide-y divide-slate-100 dark:divide-slate-800">
                        {studentLoans.length === 0 ? (
                          <div className="p-3 text-center text-slate-400 italic">No checked-out books.</div>
                        ) : (
                          studentLoans.map(loan => (
                            <div key={loan.id} className="p-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 flex justify-between items-start">
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200 block line-clamp-1">{loan.bookTitle}</span>
                                <span className="text-[10px] text-slate-400">Due: {loan.dueDate}</span>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                loan.status === 'overdue' 
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100 animate-pulse' 
                                  : 'bg-blue-50 text-blue-700 border border-blue-100'
                              }`}>
                                {loan.status.toUpperCase()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Pending Holds */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-indigo-500" />
                        Active Holds & Reservations ({studentReservations.length})
                      </span>
                      <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden text-[11px] divide-y divide-slate-100 dark:divide-slate-800">
                        {studentReservations.length === 0 ? (
                          <div className="p-3 text-center text-slate-400 italic">No active reservations.</div>
                        ) : (
                          studentReservations.map(res => (
                            <div key={res.id} className="p-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 flex justify-between items-center">
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200 block line-clamp-1">{res.bookTitle}</span>
                                <span className="text-[10px] text-slate-400">Reserved: {res.reservationDate}</span>
                              </div>
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold">
                                {res.status.toUpperCase()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Gate Entry Log Swipes */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                      <Fingerprint className="w-3.5 h-3.5 text-rose-500" />
                      Biometric & RFID Security Gate Access Swipes
                    </span>
                    <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-100 dark:border-slate-800">
                            <th className="py-2 px-3">Timestamp</th>
                            <th className="py-2 px-3">Gate Action</th>
                            <th className="py-2 px-3">Verification Method</th>
                            <th className="py-2 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {studentGateLogs.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-2.5 text-center text-slate-400 italic">No access logs verified at physical turnstiles.</td>
                            </tr>
                          ) : (
                            studentGateLogs.slice(0, 4).map(log => (
                              <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                <td className="py-2 px-3 text-slate-500 font-mono">{log.timestamp}</td>
                                <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">{log.gateAction}</td>
                                <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-mono text-[10px]">
                                  {log.authMethod.replace('_', ' ').toUpperCase()}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    log.status === 'success' 
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20' 
                                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20'
                                  }`}>
                                    {log.status.toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. ACADEMICS & GRADES MODULES (Visible to Admin, Lecturer) */}
              {(role === 'admin' || role === 'lecturer') && (
                <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-3xs">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-150 dark:border-slate-800 pb-2.5">
                    <Award className="w-4 h-4 text-indigo-600" />
                    Semester Roster Units & Grades Transcripts
                  </h4>

                  {/* Unit Enrolment Grid */}
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Registered Units</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedStudent.enrolledUnits.length === 0 ? (
                        <div className="sm:col-span-2 p-3 text-center text-slate-400 italic border border-dashed rounded-lg">
                          No units registered for this semester.
                        </div>
                      ) : (
                        selectedStudent.enrolledUnits.map(unitCode => {
                          const hasGrade = selectedStudent.grades && selectedStudent.grades[unitCode];
                          const catVal = hasGrade ? selectedStudent.grades[unitCode].cat : 0;
                          const examVal = hasGrade ? selectedStudent.grades[unitCode].exam : 0;
                          const { total, letter, color } = getGradeDetails(catVal, examVal);
                          const isTaughtByLecturer = currentLecturer?.subjects.includes(unitCode);

                          return (
                            <div 
                              key={unitCode} 
                              className={`p-3 rounded-xl border flex justify-between items-center transition-all ${
                                isTaughtByLecturer 
                                  ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800' 
                                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-mono font-black text-slate-800 dark:text-slate-200">{unitCode}</span>
                                  {isTaughtByLecturer && (
                                    <span className="text-[8px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-black tracking-wider uppercase">
                                      MY CLASS
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500 font-bold block truncate max-w-48">
                                  {getCourseName(unitCode)}
                                </span>
                                {selectedStudent.attendance && selectedStudent.attendance[unitCode] !== undefined && (
                                  <span className="text-[10px] text-slate-400 font-semibold block">
                                    Attendance rate: <strong className="text-slate-600 dark:text-slate-300">{selectedStudent.attendance[unitCode]}%</strong>
                                  </span>
                                )}
                              </div>

                              {/* Grade display */}
                              <div className="text-right">
                                {hasGrade ? (
                                  <div className="space-y-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${color}`}>
                                      Grade {letter} ({total}%)
                                    </span>
                                    <span className="text-[9px] text-slate-400 block font-mono">
                                      CAT: {catVal} • EXAM: {examVal}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-slate-400 italic bg-slate-100 dark:bg-slate-850 py-1 px-2 rounded">
                                    Not Graded
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* RIGHT SIDEBAR PANEL: CONTEXTUAL STUDENT TELEMETRY */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Quick Profile Summary Badge */}
              <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-3xs">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-150 dark:border-slate-800 pb-2.5">
                  <User className="w-4 h-4 text-slate-500" />
                  Account Security & Roster Check
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-450 font-bold">Portal Access Passcode</span>
                    <span className="font-mono bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 px-2 py-0.5 rounded text-[11px] font-black text-slate-800 dark:text-slate-200">
                      {selectedStudent.passcode || 'student123'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-450 font-bold">Roster Unit Count</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedStudent.enrolledUnits.length} Classes
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-450 font-bold">Invoiced Amount</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      KES {totalInvoiced.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-450 font-bold">Pending Outstanding Balance</span>
                    <span className={`font-mono font-bold ${outstandingDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      KES {outstandingDebt.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notice card */}
              <div className="bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 p-4 space-y-2 text-xs leading-relaxed text-slate-600">
                <div className="flex items-center gap-1.5 text-slate-750 font-bold">
                  <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Dossier Synchronization</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Information displayed inside this station represents active system records. Student registry and fee payment adjustments are managed by Accountant or Admin workflows.
                </p>
              </div>

            </div>

          </div>

        </div>
      ) : (
        /* Empty Search State */
        <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto animate-pulse" />
          <h4 className="text-xs uppercase font-bold text-slate-500 tracking-wider">No Student Admission Profile Loaded</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Input a matching student admission number in the query bar above or pick an active student profile from the Quick Select menu to review transaction histories, transcripts, and gate swipes.
          </p>
        </div>
      )}

    </div>
  );
}
