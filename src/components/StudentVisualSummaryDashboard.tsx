import React from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Clock, 
  CreditCard, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  Award,
  Calendar,
  Layers
} from 'lucide-react';
import { Student, Course } from '../types';
import { subjectMap } from '../data';

interface StudentVisualSummaryDashboardProps {
  student: Student;
  allCourses: Course[];
  onNavigateTab: (tab: 'dashboard' | 'grades' | 'financials' | 'materials' | 'units' | 'officeHours' | 'library') => void;
}

export default function StudentVisualSummaryDashboard({
  student,
  allCourses,
  onNavigateTab
}: StudentVisualSummaryDashboardProps) {
  // Calculations
  const enrolledUnitsCount = student.enrolledUnits.length;
  
  // Pending grades are units enrolled but not yet graded (not present in student.grades)
  const pendingGradesUnits = student.enrolledUnits.filter(
    (code) => student.grades[code] === undefined
  );
  const pendingGradesCount = pendingGradesUnits.length;

  // Unpaid invoices outstanding balance
  const unpaidInvoices = student.ledger.filter(i => i.status === 'unpaid');
  const outstandingBalance = unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  // Total invoice billing history to show relative payments progress
  const totalInvoiced = student.ledger.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = student.ledger.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
  const paymentProgressPercent = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 100;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="space-y-6" id="student-visual-summary-container">
      {/* Intro Header */}
      <div className="flex items-center gap-2 mb-2" id="summary-section-title-wrapper">
        <Layers className="w-5 h-5 text-blue-600" id="summary-title-icon" />
        <h3 className="text-base font-bold text-slate-800 tracking-tight" id="summary-section-title">
          Academic & Financial Snapshot
        </h3>
      </div>

      {/* Responsive Grid Layout */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        id="summary-cards-grid"
      >
        {/* Card 1: Registered Course Units */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl border border-slate-150 p-5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          id="summary-card-enrolled-units"
        >
          <div>
            <div className="flex items-center justify-between mb-4" id="card-enrolled-header">
              <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100" id="card-enrolled-icon-container">
                <BookOpen className="w-5 h-5" id="card-enrolled-icon" />
              </div>
              <span className="text-[10px] font-bold text-indigo-650 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider" id="card-enrolled-badge">
                Current Term
              </span>
            </div>

            <div className="space-y-1" id="card-enrolled-main-stat">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Enrolled Course Units
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-800">{enrolledUnitsCount}</span>
                <span className="text-xs text-slate-500 font-medium">Registered Units</span>
              </div>
            </div>

            {/* List of enrolled units */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2" id="card-enrolled-units-list">
              {enrolledUnitsCount === 0 ? (
                <p className="text-xs text-slate-450 italic" id="card-enrolled-empty-msg">No units registered for this semester.</p>
              ) : (
                student.enrolledUnits.slice(0, 3).map((code) => (
                  <div key={code} className="flex items-center justify-between text-xs" id={`enrolled-unit-item-${code}`}>
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-150">
                      {code}
                    </span>
                    <span className="text-slate-500 truncate max-w-[150px] font-medium">
                      {subjectMap[code] || 'Course Module'}
                    </span>
                  </div>
                ))
              )}
              {enrolledUnitsCount > 3 && (
                <p className="text-[10px] text-indigo-600 font-bold text-right" id="card-enrolled-more-indicator">
                  + {enrolledUnitsCount - 3} more modules
                </p>
              )}
            </div>
          </div>

          <div className="mt-5" id="card-enrolled-action-container">
            <button
              type="button"
              onClick={() => onNavigateTab('units')}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              id="btn-navigate-to-units"
            >
              <span>Manage Unit Registrations</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </motion.div>

        {/* Card 2: Pending Grades */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl border border-slate-150 p-5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          id="summary-card-pending-grades"
        >
          <div>
            <div className="flex items-center justify-between mb-4" id="card-pending-header">
              <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100" id="card-pending-icon-container">
                <Clock className="w-5 h-5" id="card-pending-icon" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                pendingGradesCount > 0 
                  ? 'text-amber-650 bg-amber-50 border border-amber-100 animate-pulse' 
                  : 'text-emerald-700 bg-emerald-50 border border-emerald-100'
              }`} id="card-pending-badge">
                {pendingGradesCount > 0 ? 'Awaiting Grading' : 'Up to Date'}
              </span>
            </div>

            <div className="space-y-1" id="card-pending-main-stat">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Pending Final Marks
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-800">{pendingGradesCount}</span>
                <span className="text-xs text-slate-500 font-medium">Ongoing Units</span>
              </div>
            </div>

            {/* List of pending units */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2" id="card-pending-units-list">
              {pendingGradesCount === 0 ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium py-1" id="card-pending-completed-alert">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>All registered course units are fully graded!</span>
                </div>
              ) : (
                pendingGradesUnits.slice(0, 3).map((code) => (
                  <div key={code} className="flex items-center justify-between text-xs" id={`pending-unit-item-${code}`}>
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-150">
                      {code}
                    </span>
                    <span className="text-amber-600 bg-amber-50/50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-100/50">
                      Ongoing Study
                    </span>
                  </div>
                ))
              )}
              {pendingGradesCount > 3 && (
                <p className="text-[10px] text-amber-600 font-bold text-right" id="card-pending-more-indicator">
                  + {pendingGradesCount - 3} more modules
                </p>
              )}
            </div>
          </div>

          <div className="mt-5" id="card-pending-action-container">
            <button
              type="button"
              onClick={() => onNavigateTab('grades')}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              id="btn-navigate-to-grades"
            >
              <span>View Grade Audit & Transcript</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </motion.div>

        {/* Card 3: Tuition & Fees Outstanding Balance */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl border border-slate-150 p-5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          id="summary-card-financials"
        >
          <div>
            <div className="flex items-center justify-between mb-4" id="card-financials-header">
              <div className={`p-3 rounded-xl border ${
                outstandingBalance > 0 
                  ? 'bg-rose-50 text-rose-750 border-rose-100' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-100'
              }`} id="card-financials-icon-container">
                <CreditCard className="w-5 h-5" id="card-financials-icon" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                outstandingBalance > 0 
                  ? 'text-rose-700 bg-rose-50 border border-rose-100' 
                  : 'text-emerald-700 bg-emerald-50 border border-emerald-100'
              }`} id="card-financials-badge">
                {outstandingBalance > 0 ? 'Dues Outstanding' : 'Fully Settled'}
              </span>
            </div>

            <div className="space-y-1" id="card-financials-main-stat">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Total Tuition Balance
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black ${outstandingBalance > 0 ? 'text-rose-650' : 'text-slate-800'}`}>
                  KES {outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Invoiced progression bar */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2" id="card-financials-progress">
              <div className="flex justify-between items-center text-[10px] text-slate-405 font-bold uppercase tracking-wider">
                <span>Tuition Payment Progress</span>
                <span>{paymentProgressPercent}% Paid</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-150/50 shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    paymentProgressPercent >= 100 
                      ? 'bg-emerald-500' 
                      : paymentProgressPercent > 50 
                        ? 'bg-blue-500' 
                        : 'bg-amber-500'
                  }`} 
                  style={{ width: `${paymentProgressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                <span>Paid: KES {totalPaid.toLocaleString()}</span>
                <span>Invoiced: KES {totalInvoiced.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-5" id="card-financials-action-container">
            <button
              type="button"
              onClick={() => onNavigateTab('financials')}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              id="btn-navigate-to-financials"
            >
              <span>Access Financial Suite</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
