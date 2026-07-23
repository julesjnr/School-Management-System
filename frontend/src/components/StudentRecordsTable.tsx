import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNotification } from './notifications';
import { Student } from '../types';
import { 
  FileText, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  ChevronUp, ChevronDown, ArrowUpDown, RefreshCw, AlertCircle, Users, X, KeyRound, Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface StudentRecordsTableProps {
  onDeleteStudent?: (studentId: string) => void;
  onUpdateStudent?: (studentId: string, updatedFields: Partial<Student>) => void;
  refetchTrigger?: number;
}

export default function StudentRecordsTable({
  onDeleteStudent,
  onUpdateStudent,
  refetchTrigger = 0
}: StudentRecordsTableProps) {
  const { showConfirm } = useNotification();
  // State for paginated data
  const [students, setStudents] = useState<Student[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Filters & Search state
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [cohortFilter, setCohortFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [unitsFilter, setUnitsFilter] = useState<string>('all');

  // Sorting state
  const [sortBy, setSortBy] = useState<string>('admissionNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Password Reset Modal state
  const [resetModal, setResetModal] = useState<{
    isOpen: boolean;
    studentName: string;
    passcode: string;
  } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  const handleCohortChange = (val: string) => {
    setCohortFilter(val);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleUnitsChange = (val: string) => {
    setUnitsFilter(val);
    setPage(1);
  };

  const handleLimitChange = (val: number) => {
    setLimit(val);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCohortFilter('all');
    setStatusFilter('all');
    setUnitsFilter('all');
    setSortBy('admissionNo');
    setSortOrder('asc');
    setPage(1);
  };

  // Fetch paginated student records from backend
  const fetchStudents = useCallback(async () => {
    // Cancel previous in-flight request if present
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (cohortFilter && cohortFilter !== 'all') params.set('cohort', cohortFilter);
      if (statusFilter && statusFilter !== 'all') params.set('accountStatus', statusFilter);
      if (unitsFilter && unitsFilter !== 'all') params.set('registeredUnits', unitsFilter);
      if (sortBy) params.set('sortBy', sortBy);
      if (sortOrder) params.set('sortOrder', sortOrder);

      const response = await fetch(`/api/students?${params.toString()}`, {
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();

      if (abortController.signal.aborted) return;

      if (Array.isArray(data)) {
        setStudents(data);
        setTotalRecords(data.length);
        setTotalPages(Math.ceil(data.length / limit) || 1);
      } else {
        setStudents(data.students || []);
        setTotalRecords(data.totalRecords ?? (data.students?.length || 0));
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Failed to fetch student records:', err);
      setError(err.message || 'Unable to connect to the student database.');
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [page, limit, debouncedSearch, cohortFilter, statusFilter, unitsFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchStudents();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchStudents, refetchTrigger]);

  // Handle column header click sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Reset Student Password Action
  const handleResetPassword = async (studentId: string, studentName: string) => {
    try {
      const res = await fetch(`/api/students/${studentId}/reset-password`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error('Failed to reset passcode');
      }
      const data = await res.json();
      const code = data.temporaryPasscode || data.passcode || 'ZENTI-TEMP-PASS';
      
      setResetModal({
        isOpen: true,
        studentName,
        passcode: code,
      });

      toast.success(`Passcode generated for ${studentName}`);
      fetchStudents();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to reset student passcode.');
    }
  };

  // Purge Student Account Action
  const handlePurgeAccount = async (studentId: string, studentName: string, admissionNo: string) => {
    const confirmed = await showConfirm({
      title: 'Dismiss Academic File',
      message: `Are you absolutely sure you want to dismiss the academic file for ${studentName} (${admissionNo}) from Zenti systems? This cannot be undone.`,
      confirmText: 'Dismiss Student Record',
      variant: 'danger'
    });
    if (!confirmed) {
      return;
    }

    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': 'admin',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to purge student record');
      }

      toast.success(`Account for ${studentName} (${admissionNo}) purged.`);
      if (onDeleteStudent) {
        onDeleteStudent(studentId);
      }

      // Adjust page if deleting last item on current page
      if (students.length === 1 && page > 1) {
        setPage(p => p - 1);
      } else {
        fetchStudents();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to purge student account.');
    }
  };

  // Export to CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('all', 'true');
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (cohortFilter && cohortFilter !== 'all') params.set('cohort', cohortFilter);
      if (statusFilter && statusFilter !== 'all') params.set('accountStatus', statusFilter);
      if (unitsFilter && unitsFilter !== 'all') params.set('registeredUnits', unitsFilter);
      if (sortBy) params.set('sortBy', sortBy);
      if (sortOrder) params.set('sortOrder', sortOrder);

      const res = await fetch(`/api/students?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch full student export');

      const data = await res.json();
      const exportList: Student[] = Array.isArray(data) ? data : (data.students || []);

      const headers = [
        'Admission Number',
        'Full Name',
        'Email Address',
        'Phone Contact',
        'Cohort Group',
        'Account Status',
        'Registered Units Count',
        'Registered Units List',
        'Total Invoiced (KES)',
        'Paid Fees (KES)',
        'Pending Balance (KES)',
        'Registration Date'
      ];

      const rows = exportList.map(stud => {
        const totalInvoiced = (stud.ledger || []).reduce((sum, inv) => sum + inv.amount, 0);
        const totalPaid = (stud.ledger || []).filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
        const outstandingBal = totalInvoiced - totalPaid;
        return [
          stud.admissionNo || '',
          stud.name || '',
          stud.email || '',
          stud.phone || '',
          stud.cohort || '',
          stud.accountStatus || 'Active',
          String((stud.enrolledUnits || []).length),
          (stud.enrolledUnits || []).join('; '),
          String(totalInvoiced),
          String(totalPaid),
          String(outstandingBal),
          stud.createdAt || ''
        ];
      });

      const escapeCell = (cell: string) => {
        const str = String(cell ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvContent = [
        headers.map(escapeCell).join(','),
        ...rows.map(row => row.map(escapeCell).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `registered_students_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${exportList.length} student records to CSV`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export students CSV');
    } finally {
      setIsExporting(false);
    }
  };

  // Render header column with sort icon
  const renderSortableHeader = (label: string, field: string, align: 'left' | 'center' | 'right' = 'left') => {
    const isSorted = sortBy === field;
    const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
    const flexAlignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

    return (
      <th 
        className={`py-3 px-4 ${alignClass} cursor-pointer select-none hover:bg-slate-100/70 transition-colors group text-[11px] font-bold text-slate-500 uppercase tracking-wider`}
        onClick={() => handleSort(field)}
        title={`Click to sort by ${label}`}
      >
        <div className={`flex items-center gap-1.5 ${flexAlignClass}`}>
          <span>{label}</span>
          <span className="text-slate-400 group-hover:text-slate-700 transition-colors">
            {isSorted ? (
              sortOrder === 'asc' ? (
                <ChevronUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity" />
            )}
          </span>
        </div>
      </th>
    );
  };

  // Intelligent pagination window builder
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const startRange = totalRecords === 0 ? 0 : (page - 1) * limit + 1;
  const endRange = Math.min(page * limit, totalRecords);

  const hasActiveFilters = Boolean(search || cohortFilter !== 'all' || statusFilter !== 'all' || unitsFilter !== 'all');

  return (
    <div className="space-y-4 pt-6 border-t border-slate-150">
      {/* Top Bar: Title & Primary Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            Registered Student Records Database
          </h3>
          <p className="text-[11px] text-slate-500">
            Query student credentials, enrolled units, and financial statement balances efficiently with server-side pagination.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchStudents}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs px-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap transition-all hover:shadow-md disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export to CSV'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-150 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Direct Database Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Name, Adm No, Email, or Cohort..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl py-1.5 pl-9 pr-8 text-xs text-slate-850 focus:outline-hidden focus:border-blue-500 w-full"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* Cohort Filter */}
          <select
            value={cohortFilter}
            onChange={(e) => handleCohortChange(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-750 focus:outline-hidden focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Cohorts</option>
            <option value="Class of 2024">Class of 2024</option>
            <option value="Class of 2025">Class of 2025</option>
            <option value="Class of 2026">Class of 2026</option>
            <option value="Class of 2027">Class of 2027</option>
            <option value="Class of 2028">Class of 2028</option>
          </select>

          {/* Account Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-750 focus:outline-hidden focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending Setup">Pending Setup</option>
            <option value="Suspended">Suspended</option>
          </select>

          {/* Registered Units Filter */}
          <select
            value={unitsFilter}
            onChange={(e) => handleUnitsChange(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-750 focus:outline-hidden focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Registered Units</option>
            <option value="0">0 Units (Unenrolled)</option>
            <option value="1">1 Unit</option>
            <option value="2">2 Units</option>
            <option value="3+">3+ Units</option>
          </select>

          {/* Page Limit Selector */}
          <select
            value={limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs text-slate-750 focus:outline-hidden focus:border-blue-500 font-mono cursor-pointer"
            title="Records per page"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Student Records Table */}
      <div className="overflow-x-auto border border-slate-100 rounded-xl relative min-h-[320px] bg-white">
        {/* Loading Spinner Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-7 h-7 text-blue-600 animate-spin" />
            <span className="text-xs font-semibold text-slate-600">Querying PostgreSQL database...</span>
          </div>
        )}

        <table className="w-full text-left font-sans text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
              {renderSortableHeader('Admission No', 'admissionNo', 'left')}
              {renderSortableHeader('Full Name', 'name', 'left')}
              {renderSortableHeader('Cohort', 'cohort', 'left')}
              {renderSortableHeader('Account Status', 'accountStatus', 'left')}
              {renderSortableHeader('Registered Units', 'registeredUnits', 'left')}
              <th className="py-3 px-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Invoiced (KES)</th>
              <th className="py-3 px-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Paid (KES)</th>
              <th className="py-3 px-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Outstanding Debt</th>
              <th className="py-3 px-4 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">System Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {error ? (
              <tr>
                <td colSpan={9} className="py-12 px-4 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 text-rose-600">
                    <AlertCircle className="w-8 h-8" />
                    <p className="text-xs font-bold">{error}</p>
                    <button
                      type="button"
                      onClick={fetchStudents}
                      className="mt-2 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Request</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : students.length === 0 && !loading ? (
              <tr>
                <td colSpan={9} className="py-12 px-4 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Users className="w-10 h-10 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">No students found</p>
                    <p className="text-xs text-slate-450 max-w-sm">
                      No registered student records matched your current query or active filters.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="mt-2 text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                      >
                        Clear active filters & search query
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              students.map((stud) => {
                const totalInvoiced = (stud.ledger || []).reduce((sum, inv) => sum + inv.amount, 0);
                const totalPaid = (stud.ledger || []).filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
                const outstandingBal = totalInvoiced - totalPaid;
                const enrolledUnitsList = stud.enrolledUnits || [];

                return (
                  <tr key={stud.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{stud.admissionNo}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{stud.name}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{stud.cohort}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        stud.accountStatus === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-250'
                          : 'bg-amber-50 text-amber-700 border-amber-250'
                      }`}>
                        {stud.accountStatus || 'Pending Setup'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-750 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                        {enrolledUnitsList.length} Units ({enrolledUnitsList.join(', ') || 'None'})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-750">
                      KES {totalInvoiced.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                      KES {totalPaid.toLocaleString()}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-black ${outstandingBal > 0 ? 'text-rose-650' : 'text-slate-400'}`}>
                      KES {outstandingBal.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleResetPassword(stud.id, stud.name)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-650 hover:text-indigo-800 text-[9px] font-black uppercase tracking-wider py-1 px-2 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                          title="Generate temporary passcode"
                        >
                          Reset Password
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePurgeAccount(stud.id, stud.name, stud.admissionNo)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-750 text-[9px] font-black uppercase tracking-wider py-1 px-2 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                          title="Dismiss active record"
                        >
                          Purge Account
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar Below Table */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 pb-2">
        {/* Showing text */}
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{startRange}–{endRange}</span> of{' '}
          <span className="font-bold text-slate-800">{totalRecords}</span> students
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-1.5">
          {/* First Button */}
          <button
            type="button"
            onClick={() => setPage(1)}
            disabled={page === 1 || loading}
            className="px-2.5 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
            title="First page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">First</span>
          </button>

          {/* Previous Button */}
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="px-2.5 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
            title="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1 px-1">
            {getPageNumbers().map((pageNum, idx) => {
              if (pageNum === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-slate-400 select-none">
                    ...
                  </span>
                );
              }

              const isCurrent = pageNum === page;
              return (
                <button
                  key={`page-${pageNum}`}
                  type="button"
                  onClick={() => setPage(pageNum as number)}
                  disabled={loading}
                  className={`min-w-[32px] h-8 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="px-2.5 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
            title="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last Button */}
          <button
            type="button"
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages || loading}
            className="px-2.5 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
            title="Last page"
          >
            <span className="hidden sm:inline">Last</span>
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Password Reset Result Modal */}
      {resetModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <KeyRound className="w-4 h-4" />
                <span>Temporary Credentials Generated</span>
              </div>
              <button
                onClick={() => setResetModal(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Passcode reset successfully for <strong className="text-slate-900">{resetModal.studentName}</strong>. 
              Provide this temporary passcode to the student for activation:
            </p>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
              <span className="font-mono text-base font-black text-indigo-700 tracking-wider">
                {resetModal.passcode}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resetModal.passcode);
                  toast.success('Passcode copied to clipboard');
                }}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Copy Passcode
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setResetModal(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2 rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
