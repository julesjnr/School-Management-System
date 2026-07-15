import React, { useState, useEffect } from 'react';
import { 
  Course, Lecturer, Student, Expense, StockItem, Requisition, Payment, Invoice,
  Book, Loan, Reservation, BookRequest, LibraryGateLog, PasswordResetRequest, MockEmail
} from '../types';
import { 
  BookOpen, Users, DollarSign, Package, FileText, Plus, CheckCircle2, 
  AlertCircle, Bookmark, ClipboardCheck, ArrowRight, Save, Trash2, Check, X,
  Shield, Lock, Fingerprint, Library, Link, Copy, KeyRound, RefreshCw,
  TrendingUp, Calendar, Clock, MapPin, UserCheck, AlertTriangle, Info, School, Landmark, Sliders, Award, Activity, User, LogOut, Menu
} from 'lucide-react';
import { subjectMap } from '../data';
import GlobalSearchBar from './GlobalSearchBar';
import FinanceSuite from './FinanceSuite';
import LibraryHQ from './LibraryHQ';
import { toast } from 'react-hot-toast';
import SystemDiagnostics from './SystemDiagnostics';
import StudentAdmissionDossierStation from './StudentAdmissionDossierStation';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

interface AdminDashboardProps {
  courses: Course[];
  lecturers: Lecturer[];
  students: Student[];
  expenses: Expense[];
  inventory: StockItem[];
  requisitions: Requisition[];
  currentUserId?: string;
  onAddCourse: (course: Omit<Course, 'id' | 'active'>) => void;
  onToggleCourseActive: (courseId: string) => void;
  onAllocateSubject: (lecturerId: string, subjectCode: string) => void;
  onReconcilePayment: (paymentId: string) => void;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onAddStockItem: (item: Omit<StockItem, 'id'>) => void;
  onUpdateStockQuantity: (itemId: string, increment: number) => void;
  onProcessRequisition: (requisitionId: string, status: 'approved' | 'rejected') => void;
  onAddLecturer: (lecturer: Omit<Lecturer, 'id' | 'loggedHours'>) => void;
  onAddStudent?: (student: Omit<Student, 'id' | 'enrolledUnits' | 'grades' | 'ledger' | 'payments' | 'attendance'>) => void;
  onDeleteLecturer?: (lecturerId: string) => void;
  onDeleteStudent?: (studentId: string) => void;
  onLogout: () => void;
  onUpdateLecturer?: (lecturerId: string, updatedFields: Partial<Lecturer>) => void;
  onUpdateStudent?: (studentId: string, updatedFields: Partial<Student>) => void;
  isAccountantView?: boolean;
  isLibrarianView?: boolean;
  books?: Book[];
  loans?: Loan[];
  reservations?: Reservation[];
  bookRequests?: BookRequest[];
  libraryGateLogs?: LibraryGateLog[];
  onAddBook?: (book: Omit<Book, 'id'>) => void;
  onUpdateBook?: (bookId: string, updatedFields: Partial<Book>) => void;
  onCheckoutBook?: (bookId: string, patronId: string, patronName: string, patronRole: 'student' | 'lecturer', loanDays: number) => void;
  onReturnBook?: (loanId: string, returnStatus: 'returned' | 'damaged' | 'lost', damageFee: number) => void;
  onUpdateBookRequestStatus?: (requestId: string, status: 'approved' | 'rejected', adminFeedback?: string) => void;
  onTriggerGateLog?: (log: Omit<LibraryGateLog, 'id' | 'timestamp'>) => void;
  mockEmails?: MockEmail[];
  onTriggerOverdueScan?: () => number;
}

export default function AdminDashboard({
  courses,
  lecturers,
  students,
  expenses,
  inventory,
  requisitions,
  books = [],
  loans = [],
  reservations = [],
  bookRequests = [],
  libraryGateLogs = [],
  onAddBook = () => {},
  onUpdateBook = () => {},
  onCheckoutBook = () => {},
  onReturnBook = () => {},
  onUpdateBookRequestStatus = () => {},
  onTriggerGateLog = () => {},
  onAddCourse,
  onToggleCourseActive,
  onAllocateSubject,
  onReconcilePayment,
  onAddExpense,
  onAddStockItem,
  onUpdateStockQuantity,
  onProcessRequisition,
  onAddLecturer,
  onAddStudent = () => {},
  onDeleteLecturer = () => {},
  onDeleteStudent = () => {},
  onLogout,
  onUpdateLecturer,
  onUpdateStudent,
  isAccountantView = false,
  isLibrarianView = false,
  currentUserId = '',
  mockEmails = [],
  onTriggerOverdueScan
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'academics' | 'finances' | 'payroll' | 'inventory' | 'roles' | 'library' | 'diagnostics'>(() => {
    if (isLibrarianView) return 'library';
    if (isAccountantView) return 'finances';
    return 'overview';
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState<boolean>(true);

  useEffect(() => {
    const fetchRecentTransactions = async () => {
      try {
        const response = await fetch('/api/transactions');
        if (response.ok) {
          const data = await response.json();
          setRecentTransactions(data);
        }
      } catch (error) {
        console.error('Failed to load recent transactions:', error);
      } finally {
        setLoadingTransactions(false);
      }
    };
    fetchRecentTransactions();
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else {
      toast(message);
    }
  };

  const [financeSubTab, setFinanceSubTab] = useState<'revenue' | 'vouchers' | 'budgets' | 'payroll' | 'audit'>('revenue');

  // Interactive dynamic states for the Accountant suite
  const [vouchers, setVouchers] = useState<Array<{
    id: string;
    voucherNo: string;
    type: 'Debit' | 'Credit' | 'Journal' | 'Contra';
    category: string;
    description: string;
    amount: number;
    date: string;
    approvedBy: string;
  }>>(() => {
    const saved = localStorage.getItem('zenti_vouchers');
    return saved ? JSON.parse(saved) : [
      { id: 'v-1', voucherNo: 'VOU-101', type: 'Debit', category: 'Utility Bills', description: 'Power Outage Generator Fuel purchase', amount: 12000, date: '2026-06-10', approvedBy: 'Grace Wanjiku (Accountant)' },
      { id: 'v-2', voucherNo: 'VOU-102', type: 'Journal', category: 'Salaries', description: 'Accrued lecturer overtime hours settlement', amount: 45000, date: '2026-06-12', approvedBy: 'John Doe (Admin)' },
      { id: 'v-3', voucherNo: 'VOU-103', type: 'Contra', category: 'General Administration', description: 'Transferred petty cash to main bank ledger', amount: 20000, date: '2026-06-15', approvedBy: 'Grace Wanjiku (Accountant)' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('zenti_vouchers', JSON.stringify(vouchers));
  }, [vouchers]);

  const [imprests, setImprests] = useState<Array<{
    id: string;
    staffName: string;
    amount: number;
    purpose: string;
    status: 'pending' | 'approved' | 'rejected' | 'surrendered';
    date: string;
    voucherId?: string;
  }>>(() => {
    const saved = localStorage.getItem('zenti_imprests');
    return saved ? JSON.parse(saved) : [
      { id: 'imp-1', staffName: 'Dr. Jane Mugo', amount: 5000, purpose: 'Lab Chemical Supplies emergency procurement', status: 'approved', date: '2026-06-14' },
      { id: 'imp-2', staffName: 'Prof. Nelson', amount: 15000, purpose: 'Travel allowance for national academic symposium', status: 'pending', date: '2026-06-16' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('zenti_imprests', JSON.stringify(imprests));
  }, [imprests]);

  const [suppliers, setSuppliers] = useState<Array<{
    id: string;
    companyName: string;
    contactPerson: string;
    status: 'Active' | 'Inactive';
    balance: number;
    purchaseOrders: Array<{
      id: string;
      poNo: string;
      itemName: string;
      amount: number;
      status: 'pending' | 'approved' | 'paid';
      date: string;
    }>;
  }>>(() => {
    const saved = localStorage.getItem('zenti_suppliers');
    return saved ? JSON.parse(saved) : [
      {
        id: 'sup-1',
        companyName: 'Apex Office Supplies Ltd',
        contactPerson: 'Samuel Kamau',
        status: 'Active',
        balance: 32000,
        purchaseOrders: [
          { id: 'po-1', poNo: 'PO-9092', itemName: 'Premium Whiteboard Markers & Erasers', amount: 12000, status: 'paid', date: '2026-06-05' },
          { id: 'po-2', poNo: 'PO-9097', itemName: 'A4 Printing Papers (50 Reams)', amount: 20000, status: 'approved', date: '2026-06-11' }
        ]
      },
      {
        id: 'sup-2',
        companyName: 'ChemLabs East Africa',
        contactPerson: 'Dr. Evelyn Atieno',
        status: 'Active',
        balance: 75000,
        purchaseOrders: [
          { id: 'po-3', poNo: 'PO-9110', itemName: 'Physics Lab Resistors, Ammeters & Voltmeters', amount: 75000, status: 'pending', date: '2026-06-15' }
        ]
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('zenti_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  const [budgetPlan, setBudgetPlan] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('zenti_budgets');
    return saved ? JSON.parse(saved) : {
      'Operations & IT': 150000,
      'Estates & Facilities': 100000,
      'Admissions & Outreach': 150000,
      'Academic Affairs': 600000,
      'General Administration': 80005
    };
  });

  useEffect(() => {
    localStorage.setItem('zenti_budgets', JSON.stringify(budgetPlan));
  }, [budgetPlan]);

  const [bankReconStatements, setBankReconStatements] = useState<Array<{
    id: string;
    date: string;
    reference: string;
    details: string;
    amount: number;
    isMatched: boolean;
    matchedTxId?: string;
  }>>(() => {
    const saved = localStorage.getItem('zenti_bank_statements');
    return saved ? JSON.parse(saved) : [
      { id: 'bs-1', date: '2026-06-14', reference: 'MPESA-TX901-CS', details: 'FEE DEP BY ST-1002', amount: 45000, isMatched: false },
      { id: 'bs-2', date: '2026-06-15', reference: 'BANK-TRF-66723', details: 'FEE PAY BY ST-1001', amount: 20000, isMatched: false },
      { id: 'bs-3', date: '2026-06-16', reference: 'MPESA-TX982-ED', details: 'FEE RECON BY ST-1003', amount: 15400, isMatched: false }
    ];
  });

  useEffect(() => {
    localStorage.setItem('zenti_bank_statements', JSON.stringify(bankReconStatements));
  }, [bankReconStatements]);

  const [auditTrails, setAuditTrails] = useState<Array<{
    id: string;
    timestamp: string;
    user: string;
    role: string;
    action: string;
    resource: string;
    status: 'Success' | 'Warning' | 'Error';
  }>>(() => {
    const saved = localStorage.getItem('zenti_audit_trails');
    return saved ? JSON.parse(saved) : [
      { id: 'aud-1', timestamp: '2026-06-17 08:30:12', user: 'Admin Grace', role: 'Accountant', action: 'RUN_RECONCILIATION', resource: 'Student Payments matched automatically (3 entries)', status: 'Success' },
      { id: 'aud-2', timestamp: '2026-06-17 09:15:33', user: 'Admin Grace', role: 'Accountant', action: 'ALLOCATE_BUDGET', resource: 'Increased Academic Affairs budget ceiling', status: 'Success' },
      { id: 'aud-3', timestamp: '2026-06-17 10:02:44', user: 'System Engine', role: 'Security', action: 'PORTAL_PRIVILEGE_UPGRADE', resource: 'Granted Restricted Accountant role to Lecturer ACC-404', status: 'Success' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('zenti_audit_trails', JSON.stringify(auditTrails));
  }, [auditTrails]);

  // General audit log function
  const logAudit = (action: string, resource: string, status: 'Success' | 'Warning' | 'Error' = 'Success') => {
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
    setAuditTrails(prev => [
      {
        id: `aud-${Date.now()}`,
        timestamp,
        user: isLibrarianView ? 'Dr. Sarah Kendi (Librarian)' : isAccountantView ? 'Grace Wanjiku (Accountant)' : 'Admin Master',
        role: isLibrarianView ? 'Librarian' : isAccountantView ? 'Accountant' : 'Administrator',
        action,
        resource,
        status
      },
      ...prev
    ]);
  };

  // Password reset request decision execution
  const handleActionResetRequest = async (requestId: string, action: 'approve' | 'reject') => {
    const reqItem = resetRequests.find(r => r.id === requestId);
    if (!reqItem) return;

    const feedback = resetFeedbackMap[requestId] || '';
    const passcode = resetPasscodeMap[requestId] || '';

    try {
      const res = await fetch(`/api/admin/reset-requests/${requestId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, feedback, passcode })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Trigger the parent props callbacks to update state across Zenti
          const finalPass = data.request.temporaryPasscode || passcode || 'default123';
          if (reqItem.role === 'student') {
            if (onUpdateStudent) {
              onUpdateStudent(reqItem.userId, { passcode: finalPass });
            }
          } else {
            if (onUpdateLecturer) {
              onUpdateLecturer(reqItem.userId, { passcode: finalPass });
            }
          }

          logAudit(
            `Password reset request for ${reqItem.name} (${reqItem.role}) was ${action === 'approve' ? 'Approved' : 'Rejected'}`,
            'Authentication Access Control'
          );

          // Clear local maps
          setResetFeedbackMap(prev => {
            const copy = { ...prev };
            delete copy[requestId];
            return copy;
          });
          setResetPasscodeMap(prev => {
            const copy = { ...prev };
            delete copy[requestId];
            return copy;
          });

          alert(`Reset request successfully ${action === 'approve' ? 'approved' : 'rejected'}.`);
          fetchResetRequests();
        } else {
          alert(data.error || 'Failed to process request');
        }
      } else {
        alert('Server returned an error.');
      }
    } catch (err) {
      alert('Failed to connect to administrative server.');
    }
  };

  // Student Search / Records filter states
  const [studentSearch, setStudentSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');

  // Password reset requests administrative state
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [isFetchingResets, setIsFetchingResets] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetFeedbackMap, setResetFeedbackMap] = useState<Record<string, string>>({});
  const [resetPasscodeMap, setResetPasscodeMap] = useState<Record<string, string>>({});

  const fetchResetRequests = async () => {
    setIsFetchingResets(true);
    setResetError('');
    try {
      const res = await fetch('/api/admin/reset-requests');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setResetRequests(data.requests || []);
        } else {
          setResetError(data.error || 'Failed to fetch reset requests');
        }
      } else {
        setResetError('Failed to load reset requests from server.');
      }
    } catch (err) {
      setResetError('Network error connecting to reset gateway.');
    } finally {
      setIsFetchingResets(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'roles') {
      fetchResetRequests();
    }
  }, [activeTab]);

  // Student registration states
  const [regStudentName, setRegStudentName] = useState('');
  const [regStudentEmail, setRegStudentEmail] = useState('');
  const [regStudentPhone, setRegStudentPhone] = useState('');
  const [regStudentAdmission, setRegStudentAdmission] = useState('');
  const [regStudentCohort, setRegStudentCohort] = useState('2026 Intake');
  const [regStudentPasscode, setRegStudentPasscode] = useState('');

  // Academic form states
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDuration, setNewDuration] = useState('4 Years');
  const [newFees, setNewFees] = useState('');
  const [newFaculty, setNewFaculty] = useState('School of Computing & AI');
  const [newThumbnail, setNewThumbnail] = useState('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=600');

  // Allocation subject states
  const [allocateLecturerId, setAllocateLecturerId] = useState('');
  const [allocateSubjectCode, setAllocateSubjectCode] = useState('');

  // Financial form states
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Utility Bills');
  const [expenseAmount, setExpenseAmount] = useState('');

  // Advanced Financial sub-tab states
  const [billingStudentId, setBillingStudentId] = useState(students[0]?.id || '');
  const [billingVoteHead, setBillingVoteHead] = useState<'Tuition' | 'Boarding' | 'Transport' | 'Lab Fee'>('Tuition');
  const [billingAmount, setBillingAmount] = useState('');
  const [billingDescription, setBillingDescription] = useState('');

  const [waiverStudentId, setWaiverStudentId] = useState(students[0]?.id || '');
  const [waiverAmount, setWaiverAmount] = useState('');
  const [waiverDescription, setWaiverDescription] = useState('Bursary Award');

  const [vouType, setVouType] = useState<'Debit' | 'Credit' | 'Journal' | 'Contra'>('Debit');
  const [vouCategory, setVouCategory] = useState('Utility Bills');
  const [vouDesc, setVouDesc] = useState('');
  const [vouAmount, setVouAmount] = useState('');
  const [vouPayee, setVouPayee] = useState('');
  const [vouDate, setVouDate] = useState('2026-06-17');

  const [impStaff, setImpStaff] = useState('');
  const [impAmount, setImpAmount] = useState('');
  const [impPurpose, setImpPurpose] = useState('');

  const [activeSupplierId, setActiveSupplierId] = useState('');
  const [poItem, setPoItem] = useState('');
  const [poAmt, setPoAmt] = useState('');
  const [newSupName, setNewSupName] = useState('');
  const [newSupContact, setNewSupContact] = useState('');

  // Editing budget ceilings
  const [editBudgetDept, setEditBudgetDept] = useState('Operations & IT');
  const [editBudgetLimit, setEditBudgetLimit] = useState('');

  // Active Payslip & Receipt Modal objects
  const [activePayslipLecturer, setActivePayslipLecturer] = useState<Lecturer | null>(null);
  const [activeReceiptStudent, setActiveReceiptStudent] = useState<{ student: Student; payment: any } | null>(null);

  // Inventory form states
  const [newItemName, setNewItemName] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newItemCate, setNewItemCate] = useState('Stationery');
  const [newItemLoc, setNewItemLoc] = useState('');
  const [newItemThresh, setNewItemThresh] = useState('5');

  // HR form states
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRate, setStaffRate] = useState('');
  const [staffBank, setStaffBank] = useState('');
  const [staffContract, setStaffContract] = useState('Permanent');
  const [staffDesignation, setStaffDesignation] = useState('');
  const [staffIsAccountant, setStaffIsAccountant] = useState(false);
  const [staffIsLibrarian, setStaffIsLibrarian] = useState(false);
  const [staffPasscode, setStaffPasscode] = useState('');

  // Auto-Reconciliation stats helper
  const allPayments = students.flatMap(s => s.payments);
  const unreconciledPayments = allPayments.filter(p => p.status === 'unreconciled');
  const lowStockItems = inventory.filter(item => item.quantity <= item.lowestThreshold);

  // --- ACCOUNTANT RECONCILIATION AND BUDGETING STATE ---
  const deptBudgets = budgetPlan;

  const getDeptForCategory = (cat: string): string => {
    switch (cat) {
      case 'Utility Bills': return 'Operations & IT';
      case 'Maintenance': return 'Estates & Facilities';
      case 'Marketing': return 'Admissions & Outreach';
      case 'Salaries': return 'Academic Affairs';
      default: return 'General Administration';
    }
  };

  const departmentTotals = expenses.reduce((acc, exp) => {
    const dept = getDeptForCategory(exp.category);
    acc[dept] = (acc[dept] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const currentMonthExpensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Line Chart Data for the last 6 months
  const monthlyExpenditures = [
    { name: 'Jan 2026', Expenditures: 105000 },
    { name: 'Feb 2026', Expenditures: 142000 },
    { name: 'Mar 2026', Expenditures: 115000 },
    { name: 'Apr 2026', Expenditures: 198000 }, // Seasonal intake spending
    { name: 'May 2026', Expenditures: 125000 },
    { name: 'Jun 2026', Expenditures: currentMonthExpensesTotal }, // Dynamic
  ];

  const handleExportDepartmentalReportCSV = () => {
    const headers = [
      'Department',
      'Expense Categories Group',
      'Approved Budget (KES)',
      'Current Monthly Expenditures (KES)',
      'Remaining Budget Balance (KES)',
      'Utilization Rate (%)'
    ];

    const rows = Object.entries(deptBudgets).map(([dept, budget]) => {
      const budgetNum = Number(budget);
      const expensesTotal = departmentTotals[dept] || 0;
      const remaining = budgetNum - expensesTotal;
      const utilization = ((expensesTotal / budgetNum) * 100).toFixed(1);
      
      let catGroup = '';
      if (dept === 'Operations & IT') catGroup = 'Utility Bills';
      else if (dept === 'Estates & Facilities') catGroup = 'Maintenance';
      else if (dept === 'Admissions & Outreach') catGroup = 'Marketing';
      else if (dept === 'Academic Affairs') catGroup = 'Salaries';
      else catGroup = 'Miscellaneous Operations';

      return [
        dept,
        catGroup,
        String(budget),
        String(expensesTotal),
        String(remaining),
        `${utilization}%`
      ];
    });

    downloadCSV(headers, rows, `departmental_financial_budget_report_${new Date().toLocaleDateString('en-CA')}.csv`);
  };

  // Student record listing filter and evaluation
  const filteredStudents = students.filter(s => {
    const term = studentSearch.toLowerCase();
    return s.name.toLowerCase().includes(term) ||
           s.admissionNo.toLowerCase().includes(term) ||
           s.cohort.toLowerCase().includes(term) ||
           s.email.toLowerCase().includes(term);
  });

  // Generic CSV Generator Utility
  const downloadCSV = (headers: string[], rows: string[][], filename: string) => {
    const escapeCell = (cell: string) => {
      const stringified = String(cell ?? '');
      if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n') || stringified.includes('\r')) {
        return `"${stringified.replace(/"/g, '""')}"`;
      }
      return stringified;
    };

    const headerString = headers.map(escapeCell).join(',');
    const rowStrings = rows.map(row => row.map(escapeCell).join(','));
    const csvContent = [headerString, ...rowStrings].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportStudentsCSV = () => {
    const headers = [
      'Admission Number',
      'Full Name',
      'Email Address',
      'Phone Contact',
      'Cohort Group',
      'Registered Units Count',
      'Registered Units (Pills)',
      'Total Invoiced (KES)',
      'Paid Fees (KES)',
      'Pending Balance (KES)'
    ];

    const rows = filteredStudents.map(stud => {
      const totalInvoiced = stud.ledger.reduce((sum, inv) => sum + inv.amount, 0);
      const totalPaid = stud.ledger.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
      const outstandingBal = totalInvoiced - totalPaid;
      return [
        stud.admissionNo,
        stud.name,
        stud.email,
        stud.phone,
        stud.cohort,
        String(stud.enrolledUnits.length),
        stud.enrolledUnits.join('; '),
        String(totalInvoiced),
        String(totalPaid),
        String(outstandingBal)
      ];
    });

    downloadCSV(headers, rows, `student_records_master_${new Date().toLocaleDateString('en-CA')}.csv`);
  };

  const handleExportPaymentsCSV = () => {
    const headers = [
      'Student Full Name',
      'Student Admission No',
      'Transaction Identifier',
      'Amount Disbursed (KES)',
      'Payment Modality',
      'Date of Submission',
      'Ledger Reconciliation Status'
    ];

    const rows = allPayments.map(p => {
      const stud = students.find(s => s.id === p.studentId);
      return [
        stud?.name || 'Unknown Student',
        stud?.admissionNo || 'N/A',
        p.transactionId,
        String(p.amount),
        p.paymentMethod,
        p.date,
        p.status
      ];
    });

    downloadCSV(headers, rows, `financials_payments_ledger_${new Date().toLocaleDateString('en-CA')}.csv`);
  };

  const handleExportExpensesCSV = () => {
    const headers = [
      'Ledger ID',
      'Expenditure Category',
      'Outlay Description',
      'Cost Logged (KES)',
      'Transaction Date'
    ];

    const rows = expenses.map(exp => [
      exp.id,
      exp.category,
      exp.description,
      String(exp.amount),
      exp.date
    ]);

    downloadCSV(headers, rows, `institutional_expenses_ledger_${new Date().toLocaleDateString('en-CA')}.csv`);
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedFees = parseInt(newFees);
    if (!newTitle || !newCode || isNaN(parsedFees)) {
      alert('Syllabus title, duration fees, and degree code are strictly required.');
      return;
    }
    onAddCourse({
      code: newCode,
      title: newTitle,
      description: newDesc || 'No course syllabus overview published.',
      duration: newDuration,
      fees: parsedFees,
      thumbnail: newThumbnail,
      faculty: newFaculty
    });
    // Clear fields
    setNewTitle('');
    setNewCode('');
    setNewDesc('');
    setNewFees('');
    triggerToast(`Course "${newTitle}" registered successfully! It is now published live on the public landing page.`, 'success');
  };

  const handleAllocateSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocateLecturerId || !allocateSubjectCode) {
      triggerToast('Please choose matching lecturer and class module codes.', 'error');
      return;
    }
    onAllocateSubject(allocateLecturerId, allocateSubjectCode);
    triggerToast('Subject allocated successfully. Module added to targeted lecturer.', 'success');
    setAllocateLecturerId('');
    setAllocateSubjectCode('');
  };

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(expenseAmount);
    if (!expenseDesc || isNaN(amountVal)) {
      alert('Operational description and expenditure amount are required.');
      return;
    }
    onAddExpense({
      description: expenseDesc,
      category: expenseCategory,
      amount: amountVal,
      date: new Date().toLocaleDateString('en-CA')
    });
    setExpenseDesc('');
    setExpenseAmount('');
    alert('College utility expense logged successfully into digital ledger.');
  };

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regStudentName || !regStudentEmail || !regStudentAdmission) {
      triggerToast('Please fill out all student profile credentials.', 'error');
      return;
    }
    onAddStudent({
      name: regStudentName,
      email: regStudentEmail,
      phone: regStudentPhone,
      admissionNo: regStudentAdmission,
      cohort: regStudentCohort,
      passcode: regStudentPasscode || 'student123'
    });
    setRegStudentName('');
    setRegStudentEmail('');
    setRegStudentPhone('');
    setRegStudentAdmission('');
    setRegStudentCohort('2026 Intake');
    setRegStudentPasscode('');
    triggerToast(`Student profile for ${regStudentName} enrolled successfully!`, 'success');
  };

  const handleAddLecturer = (e: React.FormEvent) => {
    e.preventDefault();
    const rateVal = parseFloat(staffRate);
    if (!staffName || !staffEmail || isNaN(rateVal) || !staffDesignation) {
      triggerToast('Please fill out all staff contract directories.', 'error');
      return;
    }
    onAddLecturer({
      name: staffName,
      email: staffEmail,
      phone: staffPhone || '+254 700 000000',
      hourlyRate: rateVal,
      bankDetails: staffBank || 'NCBA Bank - Acc Locked',
      contractLength: staffContract,
      designatorCode: staffDesignation,
      subjects: [],
      isAccountant: staffIsAccountant,
      isLibrarian: staffIsLibrarian,
      passcode: staffPasscode || (staffIsAccountant ? 'acc123' : staffIsLibrarian ? 'lib123' : 'staff123')
    });
    setStaffName('');
    setStaffEmail('');
    setStaffPhone('');
    setStaffRate('');
    setStaffBank('');
    setStaffDesignation('');
    setStaffIsAccountant(false);
    setStaffIsLibrarian(false);
    setStaffPasscode('');
    triggerToast('Faculty registrar profile compiled successfully.', 'success');
  };

  const handleAddStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyVal = parseInt(newQuantity);
    const threshVal = parseInt(newItemThresh);
    if (!newItemName || isNaN(qtyVal) || isNaN(threshVal)) {
      alert('Please fill outstanding computer or stock attributes.');
      return;
    }
    onAddStockItem({
      name: newItemName,
      quantity: qtyVal,
      category: newItemCate,
      location: newItemLoc || 'Main Campus Cupboards',
      lowestThreshold: threshVal
    });
    setNewItemName('');
    setNewQuantity('');
    setNewItemLoc('');
    alert('Asset successfully logged into college inventory.');
  };

  const handleAutoReconciliationRun = () => {
    if (unreconciledPayments.length === 0) {
      alert('No outstanding unreconciled student statements flagged.');
      return;
    }
    
    // Automatically match all unreconciled payments
    const copyList = [...unreconciledPayments];
    copyList.forEach(p => {
      onReconcilePayment(p.id);
    });
alert(`Auto-Reconciliation Engine successful:\nMatched ${copyList.length} billing statement IDs. Fees receipts reconciled.`);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300 w-full animate-fade-in" id="admin-dashboard-root">
      
      {/* MOBILE NAVIGATION DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden font-sans">
          {/* Backdrop */}
          <button 
            type="button" 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity cursor-default border-none w-full h-full"
            aria-label="Close Menu"
          />
          
          {/* Drawer Content */}
          <div className="relative flex w-full max-w-xs flex-col bg-slate-900 dark:bg-slate-950 p-6 text-slate-300 shadow-xl focus:outline-none z-10">
            {/* Close Button */}
            <button 
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Brand Header */}
            <div className="pb-6 border-b border-slate-800 flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center shrink-0 border border-slate-700">
                <School className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-black tracking-tight text-white block uppercase leading-none">ZENTI</span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block">Admin Console</span>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 space-y-1.5 overflow-y-auto pr-2">
              {isLibrarianView ? (
                <button type="button" onClick={() => { setActiveTab('library'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold bg-amber-600 text-white shadow-md uppercase tracking-wider cursor-pointer">
                  <Library className="w-4 h-4" />
                  <span>Library Registry</span>
                </button>
              ) : isAccountantView ? (
                <>
                  <button type="button" onClick={() => { setActiveTab('finances'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'finances' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                    <Landmark className="w-4 h-4" />
                    <span>Ledger & Finances</span>
                  </button>
                  <button type="button" onClick={() => { setActiveTab('payroll'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'payroll' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                    <DollarSign className="w-4 h-4" />
                    <span>HR & Payroll</span>
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                    <Sliders className="w-4 h-4" />
                    <span>Overview</span>
                  </button>
                  <button type="button" onClick={() => { setActiveTab('academics'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'academics' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                    <Award className="w-4 h-4" />
                    <span>Academics Allocation</span>
                  </button>
                  <button type="button" onClick={() => { setActiveTab('finances'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'finances' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                    <Landmark className="w-4 h-4" />
                    <span>Ledger & Finances</span>
                  </button>
                  <button type="button" onClick={() => { setActiveTab('payroll'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'payroll' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                    <DollarSign className="w-4 h-4" />
                    <span>HR & Payroll</span>
                  </button>
                  <button type="button" onClick={() => { setActiveTab('inventory'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                    <Activity className="w-4 h-4" />
                    <span>Procurement Stock</span>
                  </button>
                  <button type="button" onClick={() => { setActiveTab('roles'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'roles' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                    <User className="w-4 h-4" />
                    <span>Role Management</span>
                  </button>
                  <button type="button" onClick={() => { setActiveTab('library'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'library' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                    <Library className="w-4 h-4" />
                    <span>Library Registry</span>
                  </button>
                  <button type="button" onClick={() => { setActiveTab('diagnostics'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'diagnostics' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Diagnostics</span>
                  </button>
                </>
              )}
            </nav>

            {/* Profile Info & Logout */}
            <div className="p-4 border-t border-slate-800/60 bg-slate-950/40 space-y-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-sm shrink-0 border border-slate-700">
                  {isLibrarianView ? 'L' : isAccountantView ? 'A' : 'M'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-none">
                    {isLibrarianView ? 'Sarah Kendi' : isAccountantView ? 'Grace Wanjiku' : 'Admin Master'}
                  </h4>
                  <span className="text-[9px] text-slate-500 font-mono block mt-1">
                    {isLibrarianView ? 'Librarian' : isAccountantView ? 'Accountant' : 'Administrator'}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => { setMobileMenuOpen(false); onLogout(); }} className="w-full py-2.5 bg-slate-800 hover:bg-rose-955/30 hover:text-rose-455 text-slate-400 hover:text-white text-xs font-bold rounded-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout Portal</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-slate-900 dark:bg-slate-950 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 hidden md:flex font-sans">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center shrink-0 border border-slate-700">
            <School className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-white block uppercase leading-none">ZENTI</span>
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block">Admin Console</span>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {isLibrarianView ? (
            <button type="button" onClick={() => setActiveTab('library')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold bg-amber-600 text-white shadow-md uppercase tracking-wider cursor-pointer">
              <Library className="w-4 h-4" />
              <span>Library Registry</span>
            </button>
          ) : isAccountantView ? (
            <>
              <button type="button" onClick={() => setActiveTab('finances')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'finances' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
                <Landmark className="w-4 h-4" />
                <span>Ledger & Finances</span>
              </button>
              <button type="button" onClick={() => setActiveTab('payroll')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'payroll' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
                <DollarSign className="w-4 h-4" />
                <span>HR & Payroll</span>
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
                <Sliders className="w-4 h-4" />
                <span>Overview</span>
              </button>
              <button type="button" onClick={() => setActiveTab('academics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'academics' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
                <Award className="w-4 h-4" />
                <span>Academics Allocation</span>
              </button>
              <button type="button" onClick={() => setActiveTab('finances')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'finances' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
                <Landmark className="w-4 h-4" />
                <span>Ledger & Finances</span>
              </button>
              <button type="button" onClick={() => setActiveTab('payroll')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'payroll' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
                <DollarSign className="w-4 h-4" />
                <span>HR & Payroll</span>
              </button>
              <button type="button" onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
                <Activity className="w-4 h-4" />
                <span>Procurement Stock</span>
              </button>
              <button type="button" onClick={() => setActiveTab('roles')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'roles' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
                <User className="w-4 h-4" />
                <span>Role Management</span>
              </button>
              <button type="button" onClick={() => setActiveTab('library')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'library' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
                <Library className="w-4 h-4" />
                <span>Library Registry</span>
              </button>
              <button type="button" onClick={() => setActiveTab('diagnostics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'diagnostics' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
                <CheckCircle2 className="w-4 h-4" />
                <span>Diagnostics</span>
              </button>
            </>
          )}
        </nav>
        
        {/* Profile Info & Logout */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-950/40 space-y-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-sm shrink-0 border border-slate-700">
              {isLibrarianView ? 'L' : isAccountantView ? 'A' : 'M'}
            </div>
            <div className="truncate max-w-[120px]">
              <h4 className="text-xs font-bold text-white leading-none truncate">
                {isLibrarianView ? 'Sarah Kendi' : isAccountantView ? 'Grace Wanjiku' : 'Admin Master'}
              </h4>
              <span className="text-[9px] text-slate-500 font-mono block mt-1 truncate">
                {isLibrarianView ? 'Librarian' : isAccountantView ? 'Accountant' : 'Administrator'}
              </span>
            </div>
          </div>
          <button type="button" onClick={onLogout} className="w-full py-2.5 bg-slate-800 hover:bg-rose-955/30 hover:text-rose-455 text-slate-400 hover:text-white text-xs font-bold rounded-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout Portal</span>
          </button>
        </div>
      </aside>
      
      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950">
        {/* TOP UTILITY BAR */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs shrink-0 font-sans">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 cursor-pointer"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="space-y-0.5 text-left">
              <h2 className="text-[9px] font-bold text-slate-450 uppercase tracking-widest leading-none font-mono">Restricted MIS Console</h2>
              <h1 className="text-base font-black text-slate-800 dark:text-white leading-tight font-display">
                {isLibrarianView ? 'Archival & Textbook Catalog' : isAccountantView ? 'Billing & Ledger Registry' : 'Master School Management'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            <div className="w-full sm:w-64 md:w-80">
              <GlobalSearchBar students={students} courses={courses} inventory={inventory} />
            </div>
            <span className="hidden sm:inline-block w-px h-6 bg-slate-200 dark:bg-slate-800"></span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono">Management Mode</span>
            </div>
          </div>
        </header>
        
        {/* WORKSPACE CONTENT AREA */}
        <div className="p-6 space-y-6 flex-1 bg-slate-50 dark:bg-slate-950">
          
          {/* Restricted Mode Alert Notice Box */}
          {(isLibrarianView || isAccountantView) && (
            <div className={`border rounded-xl p-4 flex items-center justify-between text-xs font-medium ${isLibrarianView ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-blue-50 border-blue-150 text-blue-800'}`}>
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse shrink-0 ${isLibrarianView ? 'bg-amber-600' : 'bg-blue-600'}`}></span>
                <div>
                  <span className="font-bold block">{isLibrarianView ? 'Restricted Librarian Privilege Enabled' : 'Restricted Accountant Privilege Enabled'}</span>
                  <span>{isLibrarianView ? 'You have access to hold requests, checkouts, and text catalogs only.' : 'You have access to payrolls, expense logs and student billings only.'}</span>
                </div>
              </div>
            </div>
          )}

          {/* WARNING BANNER FOR LOW STOCK ALERTS */}
          {lowStockItems.length > 0 && !isLibrarianView && !isAccountantView && (
            <div className="bg-amber-50 text-amber-900 border border-amber-250 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs leading-relaxed">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Internal Low Stock Warning Level!</span>
                  <span>The following college properties have depleted below thresholds: {lowStockItems.map(i => `"${i.name}"`).join(', ')}.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className="text-xs text-amber-955 font-bold hover:underline bg-white/50 py-1.5 px-3 rounded border border-amber-200 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                Manage Stock Inventory
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm flex-1">
        
        {/* TAB 0: OVERVIEW WORKSPACE (DASHBOARD A) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* STUDENT ADMISSION QUICK-SEARCH & LEDGER STATION */}
            <StudentAdmissionDossierStation
              students={students}
              role={isLibrarianView ? 'librarian' : isAccountantView ? 'accountant' : 'admin'}
              books={books}
              loans={loans}
              reservations={reservations}
              bookRequests={bookRequests}
              libraryGateLogs={libraryGateLogs}
              courses={courses}
            />
            {/* HIGH-DENSITY SUMMARY STRIP */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 p-6 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
              
              {/* Card 1: Total Students */}
              <div className="flex items-center justify-between pr-4 md:pr-0 md:px-4 first:pl-0">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Students</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-850 dark:text-white font-mono">{students.length || 1482}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">+3.2%</span>
                  </div>
                  <span className="text-[9px] text-slate-550 block">Active admissions this semester</span>
                </div>
                <div className="w-10 h-10 bg-blue-500/10 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              {/* Card 2: Total Faculty */}
              <div className="flex items-center justify-between pt-4 md:pt-0 pr-4 md:pr-0 md:px-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Faculty</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-850 dark:text-white font-mono">{lecturers.length || 64}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Stable</span>
                  </div>
                  <span className="text-[9px] text-slate-550 block">Registered lecturers & staff</span>
                </div>
                <div className="w-10 h-10 bg-indigo-500/10 text-indigo-650 rounded-lg flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              {/* Card 3: Daily Attendance % */}
              <div className="flex items-center justify-between pt-4 md:pt-0 pr-4 md:pr-0 md:px-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Daily Attendance %</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-855 dark:text-white font-mono">94.2%</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">▲ 0.8%</span>
                  </div>
                  <span className="text-[9px] text-slate-555 block">Average system-wide scan today</span>
                </div>
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-650 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              {/* Card 4: Fees Collected % */}
              <div className="flex items-center justify-between pt-4 md:pt-0 pr-4 md:pr-0 md:pl-6 last:pr-0">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fees Collected %</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-855 dark:text-white font-mono">87.5%</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400">Target: 90%</span>
                  </div>
                  <span className="text-[9px] text-slate-555 block">Relative to outstanding ledger balance</span>
                </div>
                <div className="w-10 h-10 bg-amber-500/10 text-amber-650 rounded-lg flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

            </div>

            {/* Main Content Layout (Two Columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: daily attendance chart and upcoming events */}
              <div className="lg:col-span-8 space-y-6">
                {/* Visual daily attendance chart component */}
                <div className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        Daily Attendance Analytics (By Faculty)
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-sans">Real-time attendance rates recorded from digital classroom scans.</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block" />
                        <span className="text-slate-650 font-bold">Computing & AI</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full inline-block" />
                        <span className="text-slate-650 font-bold">Engineering</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { name: 'Mon', CS: 94, EE: 89 },
                        { name: 'Tue', CS: 96, EE: 91 },
                        { name: 'Wed', CS: 92, EE: 90 },
                        { name: 'Thu', CS: 95, EE: 92 },
                        { name: 'Fri', CS: 97, EE: 93 },
                      ]}>
                        <defs>
                          <linearGradient id="adminColorCS" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="adminColorEE" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis domain={[80, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />
                        <Area type="monotone" dataKey="CS" name="Computing & AI" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#adminColorCS)" />
                        <Area type="monotone" dataKey="EE" name="Engineering" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#adminColorEE)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Upcoming school events timeline widget */}
                <div className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Institutional Events & Deadlines Calendar
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-sans">Chronological timeline of upcoming academic and staff administration events.</p>
                  </div>
                  <div className="relative pl-6 border-l border-slate-100 dark:border-slate-850 space-y-5 py-2 font-sans">
                    <div className="relative">
                      <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 bg-blue-600 border-2 border-white dark:border-slate-900 rounded-full" />
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                        <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100">Semester II Exam Period Commences</h4>
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50">July 14, 2026</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-sans">Official examination booklets distributed to departmental chairs. Invigilation roster published.</p>
                    </div>
                    <div className="relative">
                      <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 bg-emerald-600 border-2 border-white dark:border-slate-900 rounded-full" />
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                        <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100">Zenti Annual Hackathon 2026 Pitching</h4>
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50">July 18, 2026</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-sans">Student development project panels present before guest judges. Awards ceremony starts at 04:00 PM.</p>
                    </div>
                    <div className="relative">
                      <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 bg-purple-600 border-2 border-white dark:border-slate-900 rounded-full" />
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                        <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100">Board of Trustees Budget Review</h4>
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50">July 22, 2026</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-sans">Financial auditor presents Semester I reconciliations and Semester II requisitions approvals.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: critical system alerts and financial transactions */}
              <div className="lg:col-span-4 space-y-6">
                {/* Critical system/staff alerts widget */}
                <div className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                      Critical Alerts & Alarms
                    </h3>
                    <p className="text-[9px] text-slate-500">Real-time system telemetry and action requirements.</p>
                  </div>
                  <div className="space-y-3 font-sans">
                    <div className="p-3 bg-rose-50/45 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-lg text-xs flex gap-2.5 items-start text-rose-850">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-medium leading-relaxed text-[11px]">System Backup failure detected on secondary cluster Node-B.</p>
                        <span className="text-[9px] opacity-75 font-mono">12 mins ago</span>
                      </div>
                    </div>
                    <div className="p-3 bg-amber-50/45 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-lg text-xs flex gap-2.5 items-start text-amber-850">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-medium leading-relaxed text-[11px]">3 Faculty member timesheets awaiting approval for Period II.</p>
                        <span className="text-[9px] opacity-75 font-mono">40 mins ago</span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50/45 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-lg text-xs flex gap-2.5 items-start text-blue-850">
                      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-medium leading-relaxed text-[11px]">Automatic library loan scan completed: 18 overdue books auto-notified.</p>
                        <span className="text-[9px] opacity-75 font-mono">2 hours ago</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent financial transactions module */}
                <div className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Recent Financial Transactions
                    </h3>
                    <p className="text-[9px] text-slate-500 font-sans">Live ledger invoices and outgoing purchase accounts.</p>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-sans">
                    {loadingTransactions ? (
                      <p className="text-[10px] text-slate-400 py-3 text-center">Loading transactions...</p>
                    ) : recentTransactions.length === 0 ? (
                      <p className="text-[10px] text-slate-400 py-3 text-center">No recent transactions found.</p>
                    ) : (
                      recentTransactions.map((tx) => {
                        const isIncome = Number(tx.amount) >= 0;
                        return (
                          <div key={tx.id || tx.reference_no} className="py-2.5 first:pt-0 flex items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-1.5 font-bold">
                                <span>{tx.recipient_sender}</span>
                                <span className="text-[9px] font-mono text-slate-400">{tx.reference_no}</span>
                              </div>
                              <p className="text-[9px] text-slate-500 font-sans">
                                {tx.description} •{' '}
                                <span className="font-mono text-slate-400">
                                  {tx.created_at ? new Date(tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent'}
                                </span>
                              </p>
                            </div>
                            <span className={`font-bold font-mono text-right ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isIncome ? '+' : ''}{tx.currency || 'KES'} {Math.abs(Number(tx.amount)).toLocaleString()}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* TAB 1: ACADEMICS WORKSPACE */}
        {activeTab === 'academics' && (
          <div className="space-y-8">
            
            <div className="grid md:grid-cols-2 gap-8 items-start">
              
              {/* Course Creator Form Component */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                    <Plus className="w-5 h-5 text-blue-600" />
                    Publish Live Course Syllabus
                  </h3>
                  <p className="text-xs text-slate-500">Creating a course here instantly lists the program inside the public landing page portfolio grid.</p>
                </div>

                <form onSubmit={handleCreateCourse} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="course-title" className="block text-[11px] font-bold text-slate-650">Course Program Name</label>
                      <input
                        id="course-title"
                        type="text"
                        placeholder="B.Sc. Mechanical Eng"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-hidden"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="course-code" className="block text-[11px] font-bold text-slate-650">Program Subject Code</label>
                      <input
                        id="course-code"
                        type="text"
                        placeholder="MECH-401"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-hidden"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="course-desc" className="block text-[11px] font-bold text-slate-650">Syllabus Narrative Description</label>
                    <textarea
                      id="course-desc"
                      placeholder="Comprehensive study of thermodynamics, physical fluids, machine mechanisms, CAD modeling..."
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-hidden h-20"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="course-dur" className="block text-[11px] font-bold text-slate-650">Duration Title</label>
                      <select
                        id="course-dur"
                        value={newDuration}
                        onChange={(e) => setNewDuration(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-hidden"
                      >
                        <option>3 Years</option>
                        <option>4 Years</option>
                        <option>5 Years</option>
                        <option>2 Years</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="course-fees" className="block text-[11px] font-bold text-slate-650">Fees (KES)</label>
                      <input
                        id="course-fees"
                        type="number"
                        placeholder="160000"
                        value={newFees}
                        onChange={(e) => setNewFees(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-hidden"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="course-fac" className="block text-[11px] font-bold text-slate-650">School Faculty</label>
                      <select
                        id="course-fac"
                        value={newFaculty}
                        onChange={(e) => setNewFaculty(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-hidden"
                      >
                        <option>School of Computing & AI</option>
                        <option>School of Engineering</option>
                        <option>School of Science Studies</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs cursor-pointer"
                  >
                    Publish Course Live
                  </button>
                </form>
              </div>

              {/* Subject Allocator Dropdown Engine */}
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                    <ClipboardCheck className="w-5 h-5 text-blue-600" />
                    Class & Lecturer Unit Allocator
                  </h3>
                  <p className="text-xs text-slate-500">Assign corresponding classes and subjects directly to certified lecturers inside rosters.</p>
                </div>

                <form onSubmit={handleAllocateSubjectSubmit} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="space-y-1.5">
                    <label htmlFor="alloc-lecturer" className="block text-[11px] font-bold text-slate-650">Certified Lecturer</label>
                    <select
                      id="alloc-lecturer"
                      value={allocateLecturerId}
                      onChange={(e) => setAllocateLecturerId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden"
                      required
                    >
                      <option value="">-- Choose Lecturer profile --</option>
                      {lecturers.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.designatorCode})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="alloc-subject" className="block text-[11px] font-bold text-slate-650">Subject Class Codes</label>
                    <select
                      id="alloc-subject"
                      value={allocateSubjectCode}
                      onChange={(e) => setAllocateSubjectCode(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden"
                      required
                    >
                      <option value="">-- Choose Class code --</option>
                      {Object.entries(subjectMap).map(([code, name]) => (
                        <option key={code} value={code}>{code} - {name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-650 hover:bg-slate-900 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
                  >
                    Allocate Lecturer Subject
                  </button>
                </form>
              </div>

            </div>

            {/* Course Catalog list table */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Course Catalog Database Status</h3>
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left font-sans text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                      <th className="py-3 px-4">Subject Code</th>
                      <th className="py-3 px-4">Syllabus Title</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-5">Fees</th>
                      <th className="py-3 px-4">Portal Visibility status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {courses.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/20">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{c.code}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{c.title}</td>
                        <td className="py-3.5 px-4 text-slate-505">{c.duration}</td>
                        <td className="py-3.5 px-5 font-bold text-slate-850">KES {c.fees.toLocaleString()}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            c.active 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {c.active ? 'Visible Landing Grid' : 'Hidden Archival'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => onToggleCourseActive(c.id)}
                            className={`text-[10px] font-bold px-3 py-1 rounded transition-colors cursor-pointer ${
                              c.active 
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' 
                                : 'bg-slate-900 text-white hover:bg-slate-805'
                            }`}
                          >
                            {c.active ? 'Disable Listing' : 'Set Active'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/*  REGISTER NEW STUDENT ACCOUNT UNIT */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm animate-fadeIn mt-6">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="p-2 bg-indigo-50 dark:bg-slate-820 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Plus className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Enrol New Undergraduate Student Account</h3>
                  <p className="text-[11px] text-slate-500">Newly added student records will instantly appear below, enabled for complete ledger tracking and instant credential lookup.</p>
                </div>
              </div>

              <form onSubmit={handleAddStudentSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                <div className="space-y-1">
                  <label htmlFor="reg-std-name" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Full Student Name</label>
                  <input
                    id="reg-std-name"
                    type="text"
                    placeholder="Mary Wambui"
                    value={regStudentName}
                    onChange={(e) => setRegStudentName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg p-2 text-xs focus:outline-hidden text-slate-850 dark:text-slate-100"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="reg-std-email" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
                  <input
                    id="reg-std-email"
                    type="email"
                    placeholder="m.wambui@student.edu"
                    value={regStudentEmail}
                    onChange={(e) => setRegStudentEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg p-2 text-xs focus:outline-hidden text-slate-850 dark:text-slate-100"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="reg-std-adm" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Admission No (ED-X)</label>
                  <input
                    id="reg-std-adm"
                    type="text"
                    placeholder="ED-CS-2026-048"
                    value={regStudentAdmission}
                    onChange={(e) => setRegStudentAdmission(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg p-2 text-xs focus:outline-hidden text-slate-850 dark:text-slate-100"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="reg-std-cohort" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Intake Cohort</label>
                  <select
                    id="reg-std-cohort"
                    value={regStudentCohort}
                    onChange={(e) => setRegStudentCohort(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg p-2 text-xs focus:outline-hidden text-slate-850 dark:text-slate-100 h-9"
                  >
                    <option>2026 Intake</option>
                    <option>2025 Intake</option>
                    <option>2024 Intake</option>
                    <option>Graduating cohort</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="reg-std-passcode" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Account Passcode</label>
                  <input
                    id="reg-std-passcode"
                    type="password"
                    placeholder="Default: student123"
                    value={regStudentPasscode}
                    onChange={(e) => setRegStudentPasscode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg p-2 text-xs focus:outline-hidden text-slate-850 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold py-2 px-3 rounded-lg text-xs tracking-wider uppercase transition-colors cursor-pointer"
                  >
                    Enrol Student
                  </button>
                </div>
              </form>
            </div>

            {/* Registered Student Records Section */}
            <div className="space-y-4 pt-6 border-t border-slate-150">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Registered Student Records Database</h3>
                  <p className="text-[11px] text-slate-500">Query student credentials and financial statement balances offline.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    placeholder="Search students (name, adm, cohort)..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-850 focus:outline-hidden focus:border-blue-500 w-full sm:w-64"
                  />
                  <button
                    type="button"
                    onClick={handleExportStudentsCSV}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs px-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap transition-all hover:shadow-md"
                  >
                     <FileText className="w-3.5 h-3.5" />
                     <span>Export to CSV</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left font-sans text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                      <th className="py-3 px-4">Admission No</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Cohort</th>
                      <th className="py-3 px-4">Passcode</th>
                      <th className="py-3 px-4">Registered Units</th>
                      <th className="py-3 px-4 text-right">Invoiced (KES)</th>
                      <th className="py-3 px-4 text-right">Total Paid (KES)</th>
                      <th className="py-3 px-4 text-right">Outstanding Debt</th>
                      <th className="py-3 px-4 text-center">System Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 px-4 text-center text-slate-450 italic">
                          No registered student files found matching search parameters.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((stud) => {
                        const totalInvoiced = stud.ledger.reduce((sum, inv) => sum + inv.amount, 0);
                        const totalPaid = stud.ledger.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
                        const outstandingBal = totalInvoiced - totalPaid;
                        return (
                          <tr key={stud.id} className="hover:bg-slate-50/20">
                            <td className="py-3 px-4 font-mono font-bold text-blue-700">{stud.admissionNo}</td>
                            <td className="py-3 px-4 font-semibold text-slate-900">{stud.name}</td>
                            <td className="py-3 px-4 text-slate-505 font-medium">{stud.cohort}</td>
                            <td className="py-3 px-4 font-mono text-[11px] text-indigo-600 font-bold">{stud.passcode || 'student123'}</td>
                            <td className="py-3 px-4">
                              <span className="bg-slate-100 text-slate-705 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                                {stud.enrolledUnits.length} Units ({stud.enrolledUnits.join(', ') || 'None'})
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-slate-750">KES {totalInvoiced.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">KES {totalPaid.toLocaleString()}</td>
                            <td className={`py-3 px-4 text-right font-mono font-black ${outstandingBal > 0 ? 'text-rose-650' : 'text-slate-400'}`}>KES {outstandingBal.toLocaleString()}</td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Are you absolutely sure you want to dismiss the academic file for ${stud.name} (${stud.admissionNo}) from Zenti systems? This cannot be undone.`)) {
                                    onDeleteStudent(stud.id);
                                  }
                                }}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-750 text-[9px] font-black uppercase tracking-wider py-1 px-2 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                                title="Dismiss active record"
                              >
                                Purge Account
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: FINANCIAL RECONCILIATION & ACCOUNTING HQ */}
        {activeTab === 'finances' && (
          <FinanceSuite
            students={students}
            lecturers={lecturers}
            expenses={expenses}
            onAddExpense={onAddExpense}
            onUpdateStudent={onUpdateStudent}
            onReconcilePayment={onReconcilePayment}
            isAccountantView={isAccountantView}
            currentUserId={currentUserId}
          />
        )}

        {/* TAB 3: HR & PAYROLL CONVERSIONS */}
        {activeTab === 'payroll' && (
          <div className="space-y-8">
            
            <div className="grid md:grid-cols-2 gap-8 items-start">
              
              {/* Register staff contract folder */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-5 h-5 text-blue-600" />
                    Certified Faculty Contract Registry
                  </h3>
                  <p className="text-xs text-slate-500">Record digital profiles tracking job designator codes, contract lengths, bank detail, allowances, hourly rates.</p>
                </div>

                <form onSubmit={handleAddLecturer} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="staff-name" className="block text-[11px] font-bold text-slate-650">Lecturer Full Name</label>
                      <input
                        id="staff-name"
                        type="text"
                        placeholder="Dr. Allan Kiprop"
                        value={staffName}
                        onChange={(e) => setStaffName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden text-slate-800"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="staff-code" className="block text-[11px] font-bold text-slate-650">Staff Designator Code</label>
                      <input
                        id="staff-code"
                        type="text"
                        placeholder="LEC-912"
                        value={staffDesignation}
                        onChange={(e) => setStaffDesignation(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="staff-email" className="block text-[11px] font-bold text-slate-650">Institutional Email</label>
                      <input
                        id="staff-email"
                        type="email"
                        placeholder="a.kiprop@zenti.edu"
                        value={staffEmail}
                        onChange={(e) => setStaffEmail(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden text-slate-800"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="staff-phone" className="block text-[11px] font-bold text-slate-650">Mobile Contacts</label>
                      <input
                        id="staff-phone"
                        type="text"
                        placeholder="+254 755 000 000"
                        value={staffPhone}
                        onChange={(e) => setStaffPhone(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="staff-rate" className="block text-[11px] font-bold text-slate-650">Lecturer Hourly Rate (KES)</label>
                      <input
                        id="staff-rate"
                        type="number"
                        placeholder="1600"
                        value={staffRate}
                        onChange={(e) => setStaffRate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden text-slate-800"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="staff-contract" className="block text-[11px] font-bold text-slate-650">Contract Length Status</label>
                      <select
                        id="staff-contract"
                        value={staffContract}
                        onChange={(e) => setStaffContract(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden text-slate-800"
                      >
                        <option>Permanent</option>
                        <option>2 Year Contract</option>
                        <option>1 Year Contract</option>
                        <option>Part Timer</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="staff-bank" className="block text-[11px] font-bold text-slate-650">Staff Bank Settlement account info</label>
                    <input
                      id="staff-bank"
                      type="text"
                      placeholder="Cooperative Bank - Acc: 90238123"
                      value={staffBank}
                      onChange={(e) => setStaffBank(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="staff-passcode" className="block text-[11px] font-bold text-slate-650">Account Passcode</label>
                    <input
                      id="staff-passcode"
                      type="password"
                      placeholder="Default: staff123 (or acc123 / lib123 based on roles)"
                      value={staffPasscode}
                      onChange={(e) => setStaffPasscode(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden text-slate-800 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5 mt-1.5">
                    <span className="block text-[11px] font-bold text-slate-650">Select System Role Assignment:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 py-2 bg-slate-50 border border-slate-100 rounded-xl px-3 cursor-pointer select-none">
                        <input
                          id="staff-is-accountant"
                          type="checkbox"
                          checked={staffIsAccountant}
                          onChange={(e) => {
                            setStaffIsAccountant(e.target.checked);
                            if (e.target.checked) setStaffIsLibrarian(false); // Make them exclusive or primary
                          }}
                          className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-550 cursor-pointer"
                        />
                        <label htmlFor="staff-is-accountant" className="text-[11px] font-bold text-slate-750 cursor-pointer select-none">
                          Accountant Role Access
                        </label>
                      </div>

                      <div className="flex items-center gap-2 py-2 bg-slate-50 border border-slate-100 rounded-xl px-3 cursor-pointer select-none">
                        <input
                          id="staff-is-librarian"
                          type="checkbox"
                          checked={staffIsLibrarian}
                          onChange={(e) => {
                            setStaffIsLibrarian(e.target.checked);
                            if (e.target.checked) setStaffIsAccountant(false); // Make them exclusive or primary
                          }}
                          className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-550 cursor-pointer"
                        />
                        <label htmlFor="staff-is-librarian" className="text-[11px] font-bold text-slate-750 cursor-pointer select-none">
                          Librarian Role Access
                        </label>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">
                      * If neither Accountant nor Librarian is checked, the user will be registered as a standard **Lecturer**.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-3xs"
                  >
                    Register Lecturer / Staff Profile
                  </button>
                </form>
              </div>

              {/* Dynamic Payroll Calculator */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-800">Operational Monthly Payroll Accountant</h3>
                  <p className="text-xs text-slate-500">Automatically aggregates base hourly rates, allowances, and mandatory taxes.</p>
                </div>

                <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 space-y-4 text-xs font-mono">
                  <div className="flex justify-between items-center text-blue-400 font-bold border-b border-slate-800 pb-2.5">
                    <span>MONTHLY RUN SUMMARY</span>
                    <span>JUNE 2026</span>
                  </div>

                  <div className="space-y-2 truncate">
                    {/* List payroll computations */}
                    {lecturers.map(l => {
                      const hours = l.loggedHours || 0;
                      const basePay = hours * l.hourlyRate;
                      const allowance = Math.round(basePay * 0.1); // 10% allowance
                      const kRA_Tax = Math.round((basePay + allowance) * 0.15); // 15% statutory withholding
                      const netPay = (basePay + allowance) - kRA_Tax;

                      return (
                        <div key={l.id} className="border-b border-slate-800/60 pb-2 text-[11px]">
                          <p className="text-slate-300 font-bold">{l.name} ({l.designatorCode})</p>
                          <div className="grid grid-cols-2 text-slate-400 text-[10px] mt-1">
                            <span>Hours: {hours} hrs @ {l.hourlyRate}/hr</span>
                            <span className="text-right">Allow: +KES {allowance.toLocaleString()}</span>
                            <span>Withholding Tax: -15%</span>
                            <span className="text-right text-emerald-400 font-bold">Net: KES {netPay.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => alert('Proceeding to dispatch payments directly to staff bank details via EFT gateway.')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 text-xs rounded-xl font-sans tracking-wide transition-colors cursor-pointer text-center block"
                  >
                    Disburse Bank Settlements
                  </button>
                </div>
              </div>

            </div>

            {/* Lecturers Staff Directories database list */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Certified Faculty Staff Record Directories</h3>
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left font-sans text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                      <th className="py-3 px-4">Designator ID</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Passcode</th>
                      <th className="py-3 px-4">Subjects Allocated</th>
                      <th className="py-3 px-4">Base Payout Rate</th>
                      <th className="py-3 px-4">Contract Status</th>
                      <th className="py-3 px-5 text-center">System Role Assignment</th>
                      <th className="py-3 px-4 text-center">System Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lecturers.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/20">
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{l.designatorCode}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{l.name}</td>
                        <td className="py-3 px-4 text-slate-505">{l.email}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-indigo-600 font-bold">{l.passcode || (l.isAccountant ? 'acc123' : (l.isLibrarian || l.id === 'l3') ? 'lib123' : 'staff123')}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(l.subjects ?? []).length === 0 ? (
                              <span className="text-slate-400 italic">No assigned courses</span>
                            ) : (
                             (l.subjects ?? []).map(s => (
                                <span key={s} className="bg-blue-50 text-blue-750 border border-blue-100 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">{s}</span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">KES {l.hourlyRate}/hour</td>
                        <td className="py-3 px-4 text-slate-600 italic font-medium">{l.contractLength}</td>
                        <td className="py-3 px-5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateLecturer) {
                                  onUpdateLecturer(l.id, { isAccountant: !l.isAccountant });
                                }
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-black cursor-pointer transition-colors ${
                                l.isAccountant 
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-250 border border-emerald-200' 
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                              }`}
                              title="Toggle Accountant access authority"
                            >
                              {l.isAccountant ? '✓ Accountant' : '+ Accountant'}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateLecturer) {
                                  onUpdateLecturer(l.id, { isLibrarian: !l.isLibrarian });
                                }
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-black cursor-pointer transition-colors ${
                                l.isLibrarian 
                                  ? 'bg-amber-100 text-amber-850 hover:bg-amber-250 border border-amber-200' 
                                  : 'bg-slate-100 text-slate-705 hover:bg-slate-200 border border-slate-200'
                              }`}
                              title="Toggle Librarian inventory authority"
                            >
                              {l.isLibrarian ? '✓ Librarian' : '+ Librarian'}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you absolutely sure you want to dismiss faculty record for ${l.name}? This will revoke their online login access and clean current assignments.`)) {
                                onDeleteLecturer(l.id);
                              }
                            }}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-750 text-[9px] font-black uppercase tracking-wider py-1 px-2 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                            title="Purge staff record"
                          >
                            Dismiss Staff
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: ASSETS & STOCK MANAGEMENT */}
        {activeTab === 'inventory' && (
          <div className="space-y-8">
            
            <div className="grid md:grid-cols-2 gap-8 items-start">
              
              {/* College property asset registrar form */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                    <Package className="w-5 h-5 text-blue-600" />
                    Asset Properties Registry Log
                  </h3>
                  <p className="text-xs text-slate-500">Track desktops, textbooks, dry erase pens, laboratory chemicals, and stationery levels.</p>
                </div>

                <form onSubmit={handleAddStockSubmit} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="stock-item" className="block text-[11px] font-bold text-slate-650">Asset Property Name</label>
                      <input
                        id="stock-item"
                        type="text"
                        placeholder="Erlenmeyer Flasks 250ml"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden text-slate-800"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="stock-qty" className="block text-[11px] font-bold text-slate-650">Quantity</label>
                      <input
                        id="stock-qty"
                        type="number"
                        placeholder="50"
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden text-slate-850"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="stock-cat" className="block text-[11px] font-bold text-slate-650">Store Category</label>
                      <select
                        id="stock-cat"
                        value={newItemCate}
                        onChange={(e) => setNewItemCate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden border-slate-200 text-slate-800"
                      >
                        <option>Electronics</option>
                        <option>Lab Equipment</option>
                        <option>Stationery</option>
                      </select>
                    </div>

                    <div className="space-y-1 col-span-2">
                      <label htmlFor="stock-loc" className="block text-[11px] font-bold text-slate-650">Warehouse Location / Shelf</label>
                      <input
                        id="stock-loc"
                        type="text"
                        placeholder="Science Annex Block Shelf B4"
                        value={newItemLoc}
                        onChange={(e) => setNewItemLoc(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="stock-thresh" className="block text text-[11px] font-bold text-slate-650">Lowest Warning Quantity Threshold</label>
                    <input
                      id="stock-thresh"
                      type="number"
                      placeholder="10"
                      value={newItemThresh}
                      onChange={(e) => setNewItemThresh(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden text-slate-850"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-650 hover:bg-blue-750 text-white font-bold py-2 rounded-lg text-xs shadow-xs"
                  >
                    Add Property to Database
                  </button>
                </form>
              </div>

              {/* Digital Requisitionsapprovals list */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-800">Faculty Procurement & Requisition approvals</h3>
                  <p className="text-xs text-slate-500">Approve or reject digital store requests submitted by on-campus personnel.</p>
                </div>

                {requisitions.length === 0 ? (
                  <p className="text-xs italic text-slate-400">No student or lecturers requests logged in catalog.</p>
                ) : (
                  <div className="space-y-3">
                    {requisitions.map((req) => (
                      <div key={req.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs text-xs space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="bg-slate-105 bg-slate-50 border px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-500">
                              {req.status}
                            </span>
                            <h4 className="font-extrabold text-slate-900 text-sm mt-1">{req.itemName}</h4>
                            <p className="text-[10px] text-slate-400">Requested by: {req.staffName} • {req.date}</p>
                          </div>
                          
                          <span className="font-extrabold text-slate-900 text-sm">Qty: {req.quantity} units</span>
                        </div>

                        {req.status === 'pending' && (
                          <div className="flex gap-2 pt-1 border-t border-slate-50">
                            <button
                              type="button"
                              onClick={() => { onProcessRequisition(req.id, 'approved'); alert('Requisition certified. Inventory dispatched.'); }}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-850 hover:text-emerald-900 px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold text-[10px] cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Authorize Dispatch</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => { onProcessRequisition(req.id, 'rejected'); alert('Procurement query rejected.'); }}
                              className="bg-red-50 hover:bg-red-105 text-red-650 hover:text-red-900 px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold text-[10px] cursor-pointer border"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Complete stock inventory table database */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Physical Store Stock Database Registers</h3>
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left font-sans text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                      <th className="py-3 px-4">Inventory Property Name</th>
                      <th className="py-3 px-4">Log Category</th>
                      <th className="py-3 px-4">Warehouse Location</th>
                      <th className="py-3 px-4 text-center">Remaining Quantity</th>
                      <th className="py-3 px-4 text-center">Threshold Alert Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventory.map((item) => {
                      const isLow = item.quantity <= item.lowestThreshold;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/20">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">{item.name}</td>
                          <td className="py-3.5 px-4 text-slate-505">{item.category}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">{item.location}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-900">{item.quantity} units</td>
                          
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              isLow 
                                ? 'bg-red-50 text-red-650 border-red-200 animate-pulse' 
                                : 'bg-emerald-50 text-emerald-800 border-emerald-100'
                            }`}>
                              {isLow ? 'LOW STOCK RESTOCK NOW' : 'STOCK STABLE'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onUpdateStockQuantity(item.id, 10)}
                                className="bg-blue-600 hover:bg-slate-900 text-white font-bold p-1 px-2.5 rounded text-[10px] cursor-pointer"
                                title="Add 10 items"
                              >
                                +10 units
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'roles' && (
          <div className="space-y-8 animate-fadeIn" id="role-management-workspace">
            {/* Header Description Info card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Role & System Access Control Panel
                </h3>
                <p className="text-xs text-slate-500">
                  Assign user roles and configure restricted Accountant access to the college's balance ledgers & financial outlays.
                </p>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-900 border border-blue-200 px-3 py-1 rounded font-mono font-bold uppercase tracking-wider">
                Access Engine Status: Active
              </span>
            </div>

            {/* PORTAL ACCESS LINKS FOR STAFF */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900/65 dark:to-indigo-950/20 border border-blue-150 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-3xs" id="admin-portal-links-dispatcher">
              <div className="flex items-start gap-3">
                <Link className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">Administrative Portal Access Link Dispatcher</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-4xl">
                    Standard visitors are restricted to the Student login workspace. To allow faculty members, accountants, librarians, or administrators to access their respective workspaces, click to copy and distribute these secure access URLs.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { label: 'Lecturer Faculty Portal', param: 'lecturer', desc: 'Syllabus, Grades, Hours Logs' },
                  { label: 'Finance Accountant Portal', param: 'accountant', desc: 'Fee Statements, Ledgers, Reports' },
                  { label: 'Bibliotheca Librarian Portal', param: 'librarian', desc: 'LMS Reading List, Loans, Stock' },
                  { label: 'Master Admin Portal', param: 'admin', desc: 'Global Control, Accounts, Payroll' },
                  { label: 'General Staff Switchboard', param: 'staff', desc: 'Allows selection of all staff roles' },
                ].map((item) => {
                  const secureUrl = `${window.location.origin}/?portal=${item.param}`;
                  return (
                    <div key={item.param} className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex flex-col justify-between gap-3 shadow-3xs hover:shadow-2xs transition-all">
                      <div className="space-y-1">
                        <span className="text-xs font-black text-slate-750 dark:text-slate-200 block tracking-tight leading-tight">{item.label}</span>
                        <span className="text-[10px] text-slate-450 dark:text-slate-500 block font-light leading-snug">{item.desc}</span>
                        <code className="text-[10px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 px-1.5 py-0.5 rounded font-mono text-indigo-600 dark:text-indigo-400 block mt-1.5 select-all break-all leading-tight">
                          ?portal={item.param}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(secureUrl);
                          alert(`Copied secure portal link for ${item.label} to clipboard:\n${secureUrl}`);
                        }}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 font-extrabold py-2 px-3 rounded-xl text-[10.5px] cursor-pointer transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy URL</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid layout of Roles Mapping Matrix */}
            <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">
              {/* Role Matrix Explanation */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5 mb-11">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    College Role Permissions Matrix
                  </h4>
                  <p className="text-[11px] text-slate-400">Current security guidelines for the Zenti College portal system roles.</p>
                </div>
                
                <div className="space-y-3.5 text-xs">
                  {/* Row 1: Admin */}
                  <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/40">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        Master Administrator (Admin)
                      </span>
                      <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-black uppercase">FULL ACCESS</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Syllabus creation, student records modification, lecturer payroll conversions, bank disbursements, and global system configurations.
                    </p>
                  </div>

                  {/* Row 2: Accountant */}
                  <div className="border border-slate-100 rounded-xl p-3 bg-blue-50/10 border-blue-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-blue-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Restricted Accountant
                      </span>
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-black uppercase">RESTRICTED FINANCES</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Assigned to specific staff. Grants exclusive access to the ledger entries, department expenditure summaries, payment reconciliation, and CSV reporting tools while locking out all other administrative panels.
                    </p>
                  </div>

                  {/* Row 3: Lecturer */}
                  <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/40">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        Lecturer / Faculty
                      </span>
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black uppercase">ACADEMICS ONLY</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Manage course reviews, review enrolled student grades, and submit hourly logs for payment processing.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fast Lookup and Accountant Promotion Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5 mb-11">
                    <Fingerprint className="w-4 h-4 text-blue-600" />
                    Quick Accountant Assignment
                  </h4>
                  <p className="text-[11px] text-slate-400">Instantly toggle restricted Accountant access permissions for registered staff accounts.</p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                      
                    </span>
                    <input
                      type="text"
                      placeholder="Search accounts by name or staff code..."
                      value={roleSearch}
                      onChange={(e) => setRoleSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden text-slate-800 animate-fadeIn"
                      id="input-roles-search"
                    />
                    {roleSearch && (
                      <button
                        type="button"
                        onClick={() => setRoleSearch('')}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 font-bold text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {lecturers.filter(l => 
                      l.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
                      l.designatorCode.toLowerCase().includes(roleSearch.toLowerCase())
                    ).map(l => (
                      <div key={l.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-150 text-xs text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={l.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'} 
                            alt={l.name}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full border border-slate-200 object-cover opacity-80"
                          />
                          <div>
                            <span className="font-bold block text-slate-800">{l.name}</span>
                            <span className="font-mono text-[9px] text-slate-400">{l.designatorCode}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (onUpdateLecturer) {
                              onUpdateLecturer(l.id, { isAccountant: !l.isAccountant });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${
                            l.isAccountant 
                              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-3xs' 
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {l.isAccountant ? '✓ Accountant Assigned' : 'Grant Accountant'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Accountant Creation Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5 mb-1 text-emerald-850">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    Register New Accountant Staff
                  </h4>
                  <p className="text-[11px] text-slate-400">Add a dedicated financial staff directory folder with direct Accountant level clearance.</p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const targetName = (e.currentTarget.elements.namedItem('acc-name') as HTMLInputElement).value;
                  const targetEmail = (e.currentTarget.elements.namedItem('acc-email') as HTMLInputElement).value;
                  const targetCode = (e.currentTarget.elements.namedItem('acc-code') as HTMLInputElement).value;
                  const targetRate = parseFloat((e.currentTarget.elements.namedItem('acc-rate') as HTMLInputElement).value);
                  const targetPasscode = (e.currentTarget.elements.namedItem('acc-passcode') as HTMLInputElement).value;

                  if (!targetName || !targetEmail || !targetCode || isNaN(targetRate)) {
                    alert('Please provide complete accountant data.');
                    return;
                  }

                  onAddLecturer({
                    name: targetName,
                    email: targetEmail,
                    phone: '+254 711 000000',
                    hourlyRate: targetRate,
                    bankDetails: 'NCBA Bank - Accountant Settlement',
                    contractLength: 'Permanent',
                    designatorCode: targetCode,
                    subjects: [],
                    isAccountant: true,
                    passcode: targetPasscode || 'acc123'
                  });

                  e.currentTarget.reset();
                  alert(`Accountant ${targetName} registered with designator code ${targetCode}.`);
                }} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label htmlFor="acc-name" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                      <input
                        id="acc-name"
                        name="acc-name"
                        type="text"
                        placeholder="Grace Wanjiku"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden text-slate-800"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="acc-code" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Designation ID</label>
                      <input
                        id="acc-code"
                        name="acc-code"
                        type="text"
                        placeholder="ACC-404"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label htmlFor="acc-email" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                      <input
                        id="acc-email"
                        name="acc-email"
                        type="email"
                        placeholder="g.wanjiku@zenti.edu"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden text-slate-800"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="acc-rate" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hourly Pay (KES)</label>
                      <input
                        id="acc-rate"
                        name="acc-rate"
                        type="number"
                        placeholder="1800"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="acc-passcode" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Account Passcode</label>
                    <input
                      id="acc-passcode"
                      name="acc-passcode"
                      type="password"
                      placeholder="Default: acc123"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden text-slate-800 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-3xs"
                  >
                    Create Accountant Account
                  </button>
                </form>
              </div>
            </div>

            {/* List Table of System Access Directory */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Comprehensive Account Access Catalog</h4>
                  <p className="text-[11px] text-slate-400">View and audit general, administrative, and financial authorization tokens of all personnel.</p>
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  Total Active Personnel: {lecturers.length}
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-150 rounded-2xl bg-white shadow-3xs animate-fadeIn">
                <table className="w-full text-left font-sans text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                      <th className="py-3.5 px-5">Designation ID</th>
                      <th className="py-3.5 px-5">Personnel Name</th>
                      <th className="py-3.5 px-5">Email Address</th>
                      <th className="py-3.5 px-5">Primary System Role</th>
                      <th className="py-3.5 px-5">Accountant Access Control</th>
                      <th className="py-3.5 px-5 text-center">Security Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lecturers.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/30">
                        <td className="py-4 px-5 font-mono text-[11px] font-bold text-slate-500">
                          {l.designatorCode}
                        </td>
                        <td className="py-4 px-5 font-semibold text-slate-900">
                          {l.name}
                        </td>
                        <td className="py-4 px-5 text-slate-505 font-medium">
                          {l.email}
                        </td>
                        <td className="py-4 px-5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase text-slate-700 bg-slate-100 border border-slate-200">
                            LECTURER
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${l.isAccountant ? 'bg-emerald-500' : 'bg-slate-350'}`}></span>
                            <span className={`font-semibold ${l.isAccountant ? 'text-emerald-700' : 'text-slate-500'}`}>
                              {l.isAccountant ? 'Authorized Accountant Account' : 'Standard Access'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (onUpdateLecturer) {
                                onUpdateLecturer(l.id, { isAccountant: !l.isAccountant });
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition-colors ${
                              l.isAccountant 
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200' 
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                            }`}
                          >
                            {l.isAccountant ? 'Revoke accountant Role' : 'Grant Accountant Role'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Password Reset Requests Section */}
            <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-wide flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                    <span>Password Reset Requests Queue</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Review and action password reset requests submitted by students and faculty staff.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchResetRequests}
                  disabled={isFetchingResets}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingResets ? 'animate-spin' : ''}`} />
                  <span>Refresh Queue</span>
                </button>
              </div>

              {resetError && (
                <div className="bg-red-50 text-red-600 border border-red-100 text-xs p-3 rounded-xl">
                  {resetError}
                </div>
              )}

              {resetRequests.length === 0 ? (
                <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center bg-slate-50/20">
                  <KeyRound className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-450 dark:text-slate-500">No password reset requests are currently pending review.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {resetRequests.map((req) => (
                    <div 
                      key={req.id} 
                      className={`rounded-2xl border p-4.5 space-y-3.5 bg-white dark:bg-slate-950 transition-all ${
                        req.status === 'pending' 
                          ? 'border-blue-150 shadow-3xs hover:border-blue-300' 
                          : 'border-slate-200 dark:border-slate-850 opacity-80'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider block uppercase">{req.date}</span>
                          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">{req.name}</h5>
                          <p className="text-[11px] text-slate-500">{req.email}</p>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border uppercase font-mono ${
                          req.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : req.status === 'resolved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {req.status}
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-400 block font-bold font-mono tracking-wider uppercase mb-1">Reason for request:</span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 italic">" {req.reason} "</p>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <span>Role: <strong className="capitalize">{req.role}</strong> (UID: {req.userId})</span>
                      </div>

                      {/* Pending actions form */}
                      {req.status === 'pending' && (
                        <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3.5 space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Assigned Temporary Passcode</label>
                              <input
                                type="text"
                                placeholder="e.g. 5831 (Empty for random)"
                                value={resetPasscodeMap[req.id] || ''}
                                onChange={(e) => setResetPasscodeMap(prev => ({ ...prev, [req.id]: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs focus:outline-hidden text-slate-800"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Admin Response Feedback</label>
                              <input
                                type="text"
                                placeholder="Optional instructions..."
                                value={resetFeedbackMap[req.id] || ''}
                                onChange={(e) => setResetFeedbackMap(prev => ({ ...prev, [req.id]: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs focus:outline-hidden text-slate-800"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleActionResetRequest(req.id, 'reject')}
                              className="flex-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                            >
                              Decline Request
                            </button>
                            <button
                              type="button"
                              onClick={() => handleActionResetRequest(req.id, 'approve')}
                              className="flex-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                              <span>Approve & Reset</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Resolved State Details */}
                      {req.status === 'resolved' && (
                        <div className="bg-emerald-50/20 border border-emerald-100/50 rounded-xl p-3 space-y-1.5 text-xs text-slate-650">
                          <p className="font-semibold text-emerald-850 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Request Approved & Passcode Reset</span>
                          </p>
                          <p>
                            <span className="font-bold text-slate-500">Temporary Passcode:</span> <code className="font-mono bg-white border border-emerald-150 px-1.5 py-0.5 rounded text-emerald-700 font-black">{req.temporaryPasscode}</code>
                          </p>
                          {req.adminFeedback && (
                            <p className="text-[11px] leading-relaxed"><span className="font-bold text-slate-500">Note:</span> {req.adminFeedback}</p>
                          )}
                        </div>
                      )}

                      {/* Rejected State Details */}
                      {req.status === 'rejected' && (
                        <div className="bg-rose-50/20 border border-rose-100/50 rounded-xl p-3 space-y-1 text-xs text-slate-650">
                          <p className="font-semibold text-rose-850 dark:text-rose-400 flex items-center gap-1">
                            <X className="w-3.5 h-3.5" />
                            <span>Request Declined by Administrator</span>
                          </p>
                          {req.adminFeedback && (
                            <p className="text-[11px] leading-relaxed"><span className="font-bold text-slate-500">Reason:</span> {req.adminFeedback}</p>
                          )}
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'library' && (
          <LibraryHQ
            books={books}
            loans={loans}
            reservations={reservations}
            students={students}
            lecturers={lecturers}
            bookRequests={bookRequests}
            libraryGateLogs={libraryGateLogs}
            onAddBook={onAddBook}
            onUpdateBook={onUpdateBook}
            onCheckoutBook={onCheckoutBook}
            onReturnBook={onReturnBook}
            onUpdateBookRequestStatus={onUpdateBookRequestStatus}
            onTriggerGateLog={onTriggerGateLog}
          />
        )}

        {activeTab === 'diagnostics' && (
          <SystemDiagnostics
            courses={courses}
            students={students}
            mockEmails={mockEmails}
            onTriggerOverdueScan={onTriggerOverdueScan}
          />
        )}

      </div>

    </div></div></div>
  );
}
