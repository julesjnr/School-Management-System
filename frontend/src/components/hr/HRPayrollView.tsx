import React, { useState, useMemo } from 'react';
import { 
  Users, UserPlus, Search, Filter, RefreshCw, DollarSign, 
  Landmark, FileText, CheckCircle2, ChevronLeft, ChevronRight, 
  Trash2, Edit, Eye, Building, Award, Shield, AlertCircle, X, CheckSquare
} from 'lucide-react';
import { Lecturer, PayrollRecord } from '../../types';
import { 
  DEPARTMENTS, 
  ACADEMIC_RANKS, 
  EMPLOYMENT_TYPES, 
  EMPLOYMENT_STATUSES, 
  PAYROLL_MONTHS, 
  PAYROLL_YEARS,
  calculatePayroll 
} from './hrData';
import { LecturerRegistrationForm } from './LecturerRegistrationForm';
import { LecturerProfileModal } from './LecturerProfileModal';
import { PayrollBreakdownModal } from './PayrollBreakdownModal';
import { PayrollReportsModal } from './PayrollReportsModal';

interface HRPayrollViewProps {
  lecturers: Lecturer[];
  onAddLecturer: (lecturer: Partial<Lecturer>) => void;
  onUpdateLecturer?: (id: string, updates: Partial<Lecturer>) => void;
  onDeleteLecturer: (id: string) => void;
}

export const HRPayrollView: React.FC<HRPayrollViewProps> = ({
  lecturers,
  onAddLecturer,
  onUpdateLecturer,
  onDeleteLecturer
}) => {
  // Main Sub-Tab State
  const [activeTab, setActiveTab] = useState<'directory' | 'payroll'>('directory');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterRank, setFilterRank] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('June');
  const [filterYear, setFilterYear] = useState(2026);

  // Pagination State (25 per page - Requirement #13)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Modal Overlay States
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState<Lecturer | null>(null);
  const [selectedProfileLecturer, setSelectedProfileLecturer] = useState<Lecturer | null>(null);
  const [selectedBreakdownLecturer, setSelectedBreakdownLecturer] = useState<Lecturer | null>(null);
  const [showReportsModal, setShowReportsModal] = useState(false);

  // Instant Search & Multi-Filter Logic (Requirements #6 & #7)
  const filteredLecturers = useMemo(() => {
    return lecturers.filter(l => {
      // 1. Search Query (Name, Staff Number, Department, Email)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = l.name.toLowerCase().includes(q);
        const matchesStaff = (l.staffNumber || l.designatorCode || '').toLowerCase().includes(q);
        const matchesDept = (l.department || '').toLowerCase().includes(q);
        const matchesEmail = l.email.toLowerCase().includes(q);
        if (!matchesName && !matchesStaff && !matchesDept && !matchesEmail) {
          return false;
        }
      }

      // 2. Department Filter
      if (filterDepartment && l.department !== filterDepartment) {
        return false;
      }

      // 3. Academic Rank Filter
      if (filterRank && l.academicRank !== filterRank) {
        return false;
      }

      // 4. Employment Type Filter
      if (filterType && l.employmentType !== filterType) {
        return false;
      }

      // 5. Employment Status Filter
      if (filterStatus) {
        if (filterStatus === 'Active' && l.employmentStatus !== 'Active' && l.isActive !== true) return false;
        if (filterStatus === 'Inactive' && l.employmentStatus === 'Active') return false;
        if (filterStatus !== 'Active' && filterStatus !== 'Inactive' && l.employmentStatus !== filterStatus) return false;
      }

      return true;
    });
  }, [lecturers, searchQuery, filterDepartment, filterRank, filterType, filterStatus]);

  // Compute Pagination Pages (Requirement #13)
  const totalPages = Math.ceil(filteredLecturers.length / pageSize) || 1;
  const paginatedLecturers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLecturers.slice(start, start + pageSize);
  }, [filteredLecturers, currentPage, pageSize]);

  // Compute Dynamic Payroll for Current Month/Year (Requirement #11)
  const activePayrollRecords: PayrollRecord[] = useMemo(() => {
    return filteredLecturers.map(l => calculatePayroll(l, filterMonth, filterYear));
  }, [filteredLecturers, filterMonth, filterYear]);

  const totalGrossPayroll = activePayrollRecords.reduce((acc, r) => acc + r.grossPay, 0);
  const totalNetPayroll = activePayrollRecords.reduce((acc, r) => acc + r.netSalary, 0);
  const totalTaxWithheld = activePayrollRecords.reduce((acc, r) => acc + r.payeTax, 0);

  // Clear all filters handler
  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterDepartment('');
    setFilterRank('');
    setFilterType('');
    setFilterStatus('');
    setCurrentPage(1);
  };

  // Form Submission Handler (Requirement #8)
  const handleFormSave = (lecturerData: Partial<Lecturer>, action: 'save' | 'another' | 'subjects' | 'profile') => {
    if (editingLecturer && onUpdateLecturer) {
      onUpdateLecturer(editingLecturer.id, lecturerData);
    } else {
      onAddLecturer(lecturerData);
    }

    if (action === 'save') {
      setShowRegisterForm(false);
      setEditingLecturer(null);
    } else if (action === 'profile') {
      setShowRegisterForm(false);
      const targetLecturer = (lecturerData as Lecturer).id 
        ? (lecturerData as Lecturer) 
        : { ...lecturerData, id: 'temp-id' } as Lecturer;
      setSelectedProfileLecturer(targetLecturer);
    } else if (action === 'subjects') {
      setShowRegisterForm(false);
      alert('Staff saved! Redirecting to subjects allocation...');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* HEADER BAR & METRIC CARDS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-blue-600" />
            HR & Enterprise Payroll Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Database-driven staff registration, automated academic rank rates, normalized banking, KRA/SHIF statutory taxes, and RBAC authorization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowReportsModal(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-600" /> Reports & Exports (PDF/Excel)
          </button>

          <button
            onClick={() => { setEditingLecturer(null); setShowRegisterForm(true); }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Register New Lecturer / Staff
          </button>
        </div>
      </div>

      {/* METRIC SUMMARY STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Staff Count</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">{lecturers.length}</span>
            <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 px-2 py-0.5 rounded-full font-bold">
              {filteredLecturers.length} Displayed
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Status Staff</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {lecturers.filter(l => l.employmentStatus === 'Active' || l.isActive !== false).length}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">Faculty Verified</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Monthly Gross Payroll</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">
              KES {totalGrossPayroll.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Take-Home Payout</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              KES {totalNetPayroll.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* SEARCH AND MULTI-FILTER TOOLBAR (Requirements #6 & #7) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Instant Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Instant search by Name, Staff Number (STF-2026-001), Department, or Email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sub-Tab Navigation Switcher */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'directory'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Staff Directory
            </button>
            <button
              onClick={() => setActiveTab('payroll')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'payroll'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Payroll Ledger Summary
            </button>
          </div>
        </div>

        {/* Dropdown Filters (Requirement #7) */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Department</label>
            <select
              value={filterDepartment}
              onChange={(e) => { setFilterDepartment(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Academic Rank</label>
            <select
              value={filterRank}
              onChange={(e) => { setFilterRank(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Ranks</option>
              {ACADEMIC_RANKS.map(r => (
                <option key={r.id} value={r.title}>{r.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Employment Type</label>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Types</option>
              {EMPLOYMENT_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active Staff</option>
              <option value="Inactive">Inactive Staff</option>
              {EMPLOYMENT_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Payroll Period</label>
            <div className="flex gap-1">
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {PAYROLL_MONTHS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {PAYROLL_YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleClearFilters}
              className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer text-center"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* REGISTRATION FORM MODAL / INLINE DRAWER (Requirements #1 - #4) */}
      {showRegisterForm && (
        <LecturerRegistrationForm
          onSave={handleFormSave}
          onCancel={() => { setShowRegisterForm(false); setEditingLecturer(null); }}
          existingCount={lecturers.length}
          editingLecturer={editingLecturer}
        />
      )}

      {/* MAIN DATA TABLES */}
      {activeTab === 'directory' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              Certified Faculty & Institutional Staff Directory
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredLecturers.length)} of {filteredLecturers.length} staff
            </span>
          </div>

          {filteredLecturers.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No staff records match criteria</h4>
              <p className="text-xs text-slate-400">Try clearing filters or search term to view full faculty catalog.</p>
              <button
                onClick={handleClearFilters}
                className="mt-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 px-4">Staff No</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Academic Rank</th>
                    <th className="py-3 px-4">Employment Type</th>
                    <th className="py-3 px-4">System Roles (RBAC)</th>
                    <th className="py-3 px-4">Hourly Rate</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedLecturers.map(l => {
                    const roles = l.roles || ['Lecturer'];
                    return (
                      <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {l.staffNumber || l.designatorCode}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          <button
                            onClick={() => setSelectedProfileLecturer(l)}
                            className="hover:underline text-left cursor-pointer"
                          >
                            {l.name}
                          </button>
                          <span className="block text-[10px] font-mono text-slate-400 font-normal">{l.email}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                          {l.department}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                          {l.academicRank}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {l.employmentType}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {roles.map(r => (
                              <span key={r} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          KES {l.hourlyRate?.toLocaleString()}/hr
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            l.employmentStatus === 'Active' || l.isActive !== false
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                          }`}>
                            {l.employmentStatus || 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedProfileLecturer(l)}
                              title="View Dedicated Profile"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setEditingLecturer(l); setShowRegisterForm(true); }}
                              title="Edit Staff Record"
                              className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to dismiss faculty record for ${l.name}?`)) {
                                  onDeleteLecturer(l.id);
                                }
                              }}
                              title="Dismiss Staff Record"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* SERVER-SIDE / CLIENT-SIDE PAGINATION CONTROLS (Requirement #13) */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Page <strong className="text-slate-800 dark:text-slate-200">{currentPage}</strong> of <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> (25 records / page)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: OPERATIONAL MONTHLY PAYROLL LEDGER SUMMARY (Requirement #5) */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                Database-Driven Payroll Aggregation Ledger
              </h3>
              <p className="text-xs text-slate-400">
                Click any staff record below to open a full itemized payroll breakdown & disbursement voucher.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-900">
              {filterMonth.toUpperCase()} {filterYear}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 px-4">Staff No</th>
                  <th className="py-3 px-4">Name & Department</th>
                  <th className="py-3 px-4">Hours & Rate</th>
                  <th className="py-3 px-4">Gross Pay</th>
                  <th className="py-3 px-4">Allowances</th>
                  <th className="py-3 px-4">Overtime</th>
                  <th className="py-3 px-4">PAYE Tax</th>
                  <th className="py-3 px-4">SHIF/NHIF</th>
                  <th className="py-3 px-4">NSSF</th>
                  <th className="py-3 px-4 font-bold">Net Salary</th>
                  <th className="py-3 px-4 text-center">Payroll Status</th>
                  <th className="py-3 px-4 text-center">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                {activePayrollRecords.map(pay => {
                  const lecturer = lecturers.find(l => l.id === pay.lecturerId) || paginatedLecturers[0];
                  return (
                    <tr
                      key={pay.id}
                      onClick={() => setSelectedBreakdownLecturer(lecturer)}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-bold text-blue-600 dark:text-blue-400">
                        {pay.staffNumber}
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-slate-900 dark:text-white">
                        {pay.name}
                        <span className="block text-[10px] text-slate-400 font-normal">{pay.department}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {pay.hoursWorked} hrs @ KES {pay.hourlyRate}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        KES {pay.grossPay.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        + KES {(pay.houseAllowance + pay.transportAllowance + pay.responsibilityAllowance).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        + KES {pay.overtimePay.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-rose-600 dark:text-rose-400">
                        - KES {pay.payeTax.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-rose-600 dark:text-rose-400">
                        - KES {pay.shifDeduction.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-rose-600 dark:text-rose-400">
                        - KES {pay.nssfDeduction.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400 text-xs">
                        KES {pay.netSalary.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Approved
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        <span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OVERLAY MODAL 1: LECTURER PROFILE MODAL (Requirement #9) */}
      {selectedProfileLecturer && (
        <LecturerProfileModal
          lecturer={selectedProfileLecturer}
          onClose={() => setSelectedProfileLecturer(null)}
          onEdit={(l) => {
            setEditingLecturer(l);
            setShowRegisterForm(true);
          }}
          allPayrollRecords={activePayrollRecords}
        />
      )}

      {/* OVERLAY MODAL 2: PAYROLL BREAKDOWN MODAL (Requirement #5) */}
      {selectedBreakdownLecturer && (
        <PayrollBreakdownModal
          lecturer={selectedBreakdownLecturer}
          month={filterMonth}
          year={filterYear}
          onClose={() => setSelectedBreakdownLecturer(null)}
        />
      )}

      {/* OVERLAY MODAL 3: REPORTS SUITE (Requirement #12) */}
      {showReportsModal && (
        <PayrollReportsModal
          lecturers={filteredLecturers}
          onClose={() => setShowReportsModal(false)}
        />
      )}

    </div>
  );
};
