import React, { useState, useEffect } from 'react';
import { useNotification } from './notifications';
import { Student, Lecturer, Expense, Invoice, Payment } from '../types';
import { 
  DollarSign, FileText, Plus, CheckCircle2, AlertCircle, Trash2, ArrowRight, Save, Check, X,
  FileSpreadsheet, Clipboard, Wallet, Award, Activity, Receipt, Calendar, CreditCard, Layers, Sparkles,
  Lock, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface FinanceSuiteProps {
  students: Student[];
  lecturers: Lecturer[];
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onUpdateStudent?: (studentId: string, updatedFields: Partial<Student>) => void;
  onReconcilePayment: (paymentId: string) => void;
  isAccountantView?: boolean;
  currentUserId?: string;
}

// Supplier Interface
interface Supplier {
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
}

// Voucher Interface
interface Voucher {
  id: string;
  voucherNo: string;
  type: 'Debit' | 'Credit' | 'Journal' | 'Contra';
  category: string;
  description: string;
  amount: number;
  date: string;
  approvedBy: string;
  status?: 'Approved' | 'Pending Admin Approval';
}

// Imprest Interface
interface Imprest {
  id: string;
  staffName: string;
  amount: number;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected' | 'surrendered';
  date: string;
  voucherId?: string;
}

// Audit Trail Interface
interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  resource: string;
  status: 'Success' | 'Warning' | 'Error';
}

// Bank Statement Interface
interface BankStatement {
  id: string;
  date: string;
  reference: string;
  details: string;
  amount: number;
  isMatched: boolean;
  matchedTxId?: string;
}

interface FinanceStudentProfile {
  id: string;
  name: string;
  admissionNo?: string;
  cohort?: string;
  outstandingBalance: number;
  status: string;
}

interface RevenueFormErrors {
  billingStudentId?: string;
  billingVoteHead?: string;
  billingAmount?: string;
  billingDescription?: string;
  waiverStudentId?: string;
  waiverType?: string;
  waiverAmount?: string;
  waiverDescription?: string;
}

interface FinanceSectionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accentClassName?: string;
}

function FinanceSectionCard({
  title,
  description,
  icon,
  children,
  accentClassName = 'text-blue-600 bg-blue-50'
}: FinanceSectionCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 sm:p-6">
      <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accentClassName}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

interface FinanceFieldProps {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}

function FinanceField({ id, label, error, children }: FinanceFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function FinanceSuite({
  students,
  lecturers,
  expenses,
  onAddExpense,
  onUpdateStudent,
  onReconcilePayment,
  isAccountantView = false,
  currentUserId
}: FinanceSuiteProps) {
  const { showToast, showError, showSuccess, showWarning, showInfo, showConfirm } = useNotification();
  // Navigation sub-tabs
  const [subTab, setSubTab] = useState<'revenue' | 'vouchers' | 'budgets' | 'payroll' | 'audit'>('revenue');

  // Interactive dynamic states for permissions
  const activePermissions = (() => {
    const defaults = {
      canReconcile: true,
      canLogExpenses: true,
      canManageBudgets: true,
      canProcessPayroll: true,
      canApproveImprests: true,
    };
    if (!isAccountantView) return defaults; // Admin has full access

    const key = `zenti_accountant_acl_${currentUserId || 'default'}`;
    const saved = localStorage.getItem(key) || localStorage.getItem('zenti_accountant_acl_default');
    if (saved) {
      try {
        return { ...defaults, ...JSON.parse(saved) };
      } catch (e) {
        return defaults;
      }
    }
    return defaults;
  })();

  // --- PERSISTENT STATE MANAGEMENT via LocalStorage ---
  
  // Department Budgets
  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('zenti_budgets');
    return saved ? JSON.parse(saved) : {
      'Operations & IT': 180000,
      'Estates & Facilities': 140000,
      'Admissions & Outreach': 150000,
      'Academic Affairs': 600000,
      'General Administration': 95000
    };
  });

  useEffect(() => {
    localStorage.setItem('zenti_budgets', JSON.stringify(budgets));
  }, [budgets]);

  // Vouchers
  const [vouchers, setVouchers] = useState<Voucher[]>(() => {
    const saved = localStorage.getItem('zenti_vouchers');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('zenti_vouchers', JSON.stringify(vouchers));
  }, [vouchers]);

  // Customizable Payroll Configuration State
  const [payrollConfig, setPayrollConfig] = useState(() => {
    const saved = localStorage.getItem('zenti_payroll_config');
    return saved ? JSON.parse(saved) : {
      nssf: 1080,
      nhif: 1700,
      payeThreshold: 24000,
      payeRate: 30
    };
  });

  useEffect(() => {
    localStorage.setItem('zenti_payroll_config', JSON.stringify(payrollConfig));
  }, [payrollConfig]);

  // Handler to approve high-value vouchers (Admin Action)
  const handleApproveVoucher = (voucherId: string) => {
    setVouchers(prev => prev.map(v => {
      if (v.id === voucherId) {
        const updated = { 
          ...v, 
          status: 'Approved' as const, 
          approvedBy: 'System Admin' 
        };
        // Log as expense if it's a Debit voucher
        if (updated.type === 'Debit') {
          onAddExpense({
            description: `[Voucher ${updated.voucherNo}] ${updated.description} (Approved by Admin)`,
            category: updated.category,
            amount: updated.amount,
            date: updated.date
          });
        }
        logAudit('APPROVE_VOUCHER', `Approved High-Value ${updated.type} Voucher ${updated.voucherNo} of KES ${updated.amount.toLocaleString()}`);
        return updated;
      }
      return v;
    }));
    showToast('Voucher approved successfully and ledger balances synchronized.', 'success');
  };

  // Imprests
  const [imprests, setImprests] = useState<Imprest[]>(() => {
    const saved = localStorage.getItem('zenti_imprests');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('zenti_imprests', JSON.stringify(imprests));
  }, [imprests]);

  // Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('zenti_suppliers');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('zenti_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  // Bank statements for manual/automatic bank reconciliations
  const [bankStatements, setBankStatements] = useState<BankStatement[]>(() => {
    const saved = localStorage.getItem('zenti_bank_statements');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('zenti_bank_statements', JSON.stringify(bankStatements));
  }, [bankStatements]);

  // Audit Trails
  const [audits, setAudits] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('zenti_audit_trails');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('zenti_audit_trails', JSON.stringify(audits));
  }, [audits]);

  // Log audit helper
  const logAudit = (action: string, resource: string, status: 'Success' | 'Warning' | 'Error' = 'Success') => {
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp,
      user: 'Grace Wanjiku (Accountant)',
      role: 'Accountant',
      action,
      resource,
      status
    };
    setAudits(prev => [newLog, ...prev]);
  };

  // Local state for finance students loaded from GET /api/finance/students
  const [financeStudents, setFinanceStudents] = useState<FinanceStudentProfile[]>([]);

  const fetchFinanceStudents = async () => {
    try {
      const res = await fetch("/api/finance/students");
      if (!res.ok) throw new Error("HTTP error " + res.status);
      const data = await res.json();
      setFinanceStudents(data);
    } catch (err) {
      console.error("Failed to load finance students dropdown data:", err);
      // Fallback: construct from parent students list
      const fallback = students.map(s => {
        const debits = (s.ledger || [])
          .filter(inv => inv.amount > 0)
          .reduce((sum, inv) => sum + inv.amount, 0);
        const credits = (s.ledger || [])
          .filter(inv => inv.amount < 0)
          .reduce((sum, inv) => sum + Math.abs(inv.amount), 0);
        const outstandingBalance = debits - credits;
        const status = outstandingBalance > 0 ? "Outstanding" : "Cleared";
        return {
          id: s.id,
          name: s.name,
          admissionNo: s.admissionNo,
          cohort: s.cohort,
          outstandingBalance,
          status
        };
      });
      setFinanceStudents(fallback);
    }
  };

  useEffect(() => {
    fetchFinanceStudents();
  }, [students]);

  // --- FORM STATES ---
  // Student Billing Cockpit
  const [billingStudentId, setBillingStudentId] = useState(students[0]?.id || '');
  const [billingVoteHead, setBillingVoteHead] = useState<'Tuition' | 'Boarding' | 'Transport' | 'Lab Fee'>('Tuition');
  const [billingAmount, setBillingAmount] = useState('');
  const [billingDescription, setBillingDescription] = useState('');
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  // Discount/Waiver Application
  const [waiverStudentId, setWaiverStudentId] = useState(students[0]?.id || '');
  const [waiverType, setWaiverType] = useState<'Scholarship' | 'Sibling Discount' | 'Bursary'>('Bursary');
  const [waiverAmount, setWaiverAmount] = useState('');
  const [waiverDescription, setWaiverDescription] = useState('Bursary Award');
  const [isAwardingScholarship, setIsAwardingScholarship] = useState(false);
  const [isSyncingPayments, setIsSyncingPayments] = useState(false);
  const [revenueFormErrors, setRevenueFormErrors] = useState<RevenueFormErrors>({});

  useEffect(() => {
    if (financeStudents.length > 0) {
      if (!billingStudentId) setBillingStudentId(financeStudents[0].id);
      if (!waiverStudentId) setWaiverStudentId(financeStudents[0].id);
    }
  }, [financeStudents]);

  // Single-entry Expense Logging (synchronized with parent state)
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Utility Bills');
  const [expenseAmount, setExpenseAmount] = useState('');

  // Multi-entry Voucher Form
  const [vouType, setVouType] = useState<'Debit' | 'Credit' | 'Journal' | 'Contra'>('Debit');
  const [vouCategory, setVouCategory] = useState('Utility Bills');
  const [vouDesc, setVouDesc] = useState('');
  const [vouAmount, setVouAmount] = useState('');
  const [vouPayee, setVouPayee] = useState('');
  const [vouDate, setVouDate] = useState('2026-06-17');

  // Imprests Request Form
  const [impStaff, setImpStaff] = useState('');
  const [impAmount, setImpAmount] = useState('');
  const [impPurpose, setImpPurpose] = useState('');

  // Suppliers Management
  const [newSupName, setNewSupName] = useState('');
  const [newSupContact, setNewSupContact] = useState('');
  const [poItem, setPoItem] = useState('');
  const [poAmt, setPoAmt] = useState('');
  const [activeSupplierId, setActiveSupplierId] = useState('');

  // Editing budget ceilings
  const [editBudgetDept, setEditBudgetDept] = useState('Operations & IT');
  const [editBudgetLimit, setEditBudgetLimit] = useState('');

  // Modals for Payslips / Student Receipts
  const [activePayslipLecturer, setActivePayslipLecturer] = useState<Lecturer | null>(null);
  const [activeReceiptStudent, setActiveReceiptStudent] = useState<{ student: Student; payment: Payment } | null>(null);

  // Search filter for audit trails
  const [auditSearch, setAuditSearch] = useState('');

  // --- STATS & COMPUTATIONS ---
  const allPayments = students.flatMap(s => s.payments || []);
  const unreconciledPayments = allPayments.filter(p => p.status === 'unreconciled');
  const matchedStatementsCount = bankStatements.filter(statement => statement.isMatched).length;
  const totalStatementsCount = bankStatements.length;
  const reconciliationHealth = totalStatementsCount === 0
    ? 'No statements imported'
    : `${matchedStatementsCount} of ${totalStatementsCount} statements matched`;
  const latestAudit = audits[0];

  const fieldClassName =
    'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';

  const feeCategoryOptions: Array<{ value: 'Tuition' | 'Boarding' | 'Transport' | 'Lab Fee'; label: string }> = [
    { value: 'Tuition', label: 'Tuition Fees' },
    { value: 'Boarding', label: 'Boarding / Hostels' },
    { value: 'Transport', label: 'Transport Levy' },
    { value: 'Lab Fee', label: 'Lab & Research Levy' }
  ];

  const scholarshipTypeOptions: Array<{ value: 'Scholarship' | 'Sibling Discount' | 'Bursary'; label: string }> = [
    { value: 'Bursary', label: 'CDF / Government Bursary' },
    { value: 'Scholarship', label: 'Academic Merit Scholarship' },
    { value: 'Sibling Discount', label: 'Family Sibling Discount' }
  ];

  const getStudentBalance = (studentId: string) => {
    const financeProfile = financeStudents.find(student => student.id === studentId);
    if (financeProfile) return financeProfile.outstandingBalance;

    const student = students.find(item => item.id === studentId);
    if (!student) return 0;
    const debits = (student.ledger || []).filter(entry => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0);
    const credits = (student.ledger || []).filter(entry => entry.amount < 0).reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
    return debits - credits;
  };

  const getStudentStatus = (studentId: string) => {
    const student = students.find(item => item.id === studentId);
    return student?.accountStatus || 'Active';
  };

  const getStudentDisplayName = (studentId: string) => {
    const financeProfile = financeStudents.find(student => student.id === studentId);
    if (financeProfile) {
      return `${financeProfile.name} (${financeProfile.admissionNo || 'N/A'})`;
    }
    const student = students.find(item => item.id === studentId);
    if (!student) return 'No student selected';
    return `${student.name} (${student.admissionNo})`;
  };

  const validateBillingForm = () => {
    const nextErrors: RevenueFormErrors = {};

    if (!billingStudentId) nextErrors.billingStudentId = 'Select a student.';
    if (!billingVoteHead) nextErrors.billingVoteHead = 'Select a fee category.';
    if (!billingAmount) {
      nextErrors.billingAmount = 'Enter an amount.';
    } else if (isNaN(Number(billingAmount)) || Number(billingAmount) <= 0) {
      nextErrors.billingAmount = 'Enter a valid amount greater than 0.';
    }
    if (!billingDescription.trim()) nextErrors.billingDescription = 'Enter an invoice description.';

    setRevenueFormErrors(prev => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const validateWaiverForm = () => {
    const nextErrors: RevenueFormErrors = {};

    if (!waiverStudentId) nextErrors.waiverStudentId = 'Select a student.';
    if (!waiverType) nextErrors.waiverType = 'Select a scholarship type.';
    if (!waiverAmount) {
      nextErrors.waiverAmount = 'Enter an award amount.';
    } else if (isNaN(Number(waiverAmount)) || Number(waiverAmount) <= 0) {
      nextErrors.waiverAmount = 'Enter a valid amount greater than 0.';
    }
    if (!waiverDescription.trim()) nextErrors.waiverDescription = 'Enter a reason.';

    setRevenueFormErrors(prev => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

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

  // Current Month Total Outlays
  const currentMonthExpensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0) + 
    vouchers.filter(v => v.type === 'Debit').reduce((sum, v) => sum + v.amount, 0);

  // Chart data for seasonal values
  const monthlyExpenditures = [
    { name: 'Jan 2026', Expenditures: 105000 },
    { name: 'Feb 2026', Expenditures: 142000 },
    { name: 'Mar 2026', Expenditures: 115000 },
    { name: 'Apr 2026', Expenditures: 198000 },
    { name: 'May 2026', Expenditures: 125000 },
    { name: 'Jun 2026', Expenditures: currentMonthExpensesTotal }
  ];

  // --- ACTIONS & SUBMISSIONS ---

  // Generate Fees / Student Bill
  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setRevenueFormErrors(prev => ({
      ...prev,
      billingStudentId: undefined,
      billingVoteHead: undefined,
      billingAmount: undefined,
      billingDescription: undefined
    }));

    if (!validateBillingForm()) {
      showToast('Please correct the billing form errors and try again.', 'error', { title: 'Validation error' });
      return;
    }

    const student = students.find((s) => s.id === billingStudentId);
    if (!student) {
      showToast('The selected student could not be found.', 'error', { title: 'Invoice error' });
      return;
    }

    setIsCreatingInvoice(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: billingStudentId,
          invoiceNo: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
          description: `[${billingVoteHead}] ${billingDescription.trim()}`,
          amount: Number(billingAmount),
          date: new Date().toISOString().substring(0, 10),
          status: "unpaid",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create invoice");
      }

      const invoice = await res.json();
      const updatedLedger = [...(student.ledger || []), invoice];
      onUpdateStudent?.(student.id, { ledger: updatedLedger });
      logAudit(
        "CREATE_INVOICE",
        `Billed KES ${invoice.amount.toLocaleString()} to ${student.name} (${invoice.invoiceNo})`
      );

      setBillingAmount("");
      setBillingDescription("");
      showToast(`Invoice ${invoice.invoiceNo} created successfully.`, 'success', { title: 'Invoice created' });
    } catch (err) {
      console.error(err);
      showToast('Failed to create invoice. Please try again.', 'error', { title: 'Invoice error' });
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  // Record Waivers, Discounts, Bursaries
  const handleApplyWaiver = async (e: React.FormEvent) => {
    e.preventDefault();
    setRevenueFormErrors(prev => ({
      ...prev,
      waiverStudentId: undefined,
      waiverType: undefined,
      waiverAmount: undefined,
      waiverDescription: undefined
    }));

    if (!validateWaiverForm()) {
      showToast('Please correct the scholarship form errors and try again.', 'error', { title: 'Validation error' });
      return;
    }
    const student = students.find(s => s.id === waiverStudentId);
    if (!student) {
      showToast('The selected student could not be found.', 'error', { title: 'Scholarship error' });
      return;
    }

    setIsAwardingScholarship(true);
    try {
      const discountValue = Number(waiverAmount);
      const waiverInvoice: Invoice = {
        id: `waiver-${Date.now()}`,
        invoiceNo: `CRD-${Math.floor(1000 + Math.random() * 9000)}`,
        description: `[${waiverType} Approved] ${waiverDescription.trim()}`,
        amount: -discountValue,
        date: new Date().toISOString().substring(0, 10),
        status: 'paid'
      };

      const updatedLedger = [...(student.ledger || []), waiverInvoice];
      onUpdateStudent?.(student.id, { ledger: updatedLedger });

      logAudit('WAIVER_GRANTED', `Approved KES ${discountValue.toLocaleString()} ${waiverType} for student ${student.name}`);
      setWaiverAmount('');
      setWaiverDescription('');
      showToast(`Awarded KES ${discountValue.toLocaleString()} to ${student.name}.`, 'success', { title: 'Scholarship awarded' });
    } catch (err) {
      console.error(err);
      showToast('Failed to award scholarship. Please try again.', 'error', { title: 'Scholarship error' });
    } finally {
      setIsAwardingScholarship(false);
    }
  };

  // Add Operational Expense
  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(expenseAmount);
    if (!expenseDesc || isNaN(parsedAmount) || parsedAmount <= 0) {
      showWarning("Expense Logging Error", 'Ensure Description and operational cost are properly logged.');
      return;
    }

    const targetDept = getDeptForCategory(expenseCategory);
    const currentSpent = departmentTotals[targetDept] || 0;
    const currentCeiling = budgets[targetDept] || 0;

    if (currentSpent + parsedAmount > currentCeiling) {
      const confirmSpend = await showConfirm({
        title: 'Budget Limit Overflow Warning',
        message: `Adding this expense of KES ${parsedAmount.toLocaleString()} will OVERFLOW the ${targetDept} approved budget limit of KES ${currentCeiling.toLocaleString()}.\n\nDo you want to authorize this bypass?`,
        confirmText: 'Authorize Bypass',
        variant: 'warning'
      });
      if (!confirmSpend) {
        logAudit('EXPENSE_DENIED', `Blocked expense overflow of KES ${parsedAmount.toLocaleString()} on ${targetDept}`, 'Warning');
        return;
      }
    }

    onAddExpense({
      description: expenseDesc,
      category: expenseCategory,
      amount: parsedAmount,
      date: new Date().toISOString().substring(0, 10)
    });

    logAudit('LOG_EXPENSE', `Logged Operational cost of KES ${parsedAmount.toLocaleString()} for ${expenseDesc}`);
    setExpenseDesc('');
    setExpenseAmount('');
    showToast('Operational College Expense logged and allocated successfully.', 'success');
  };

  // Submit Multi-Entry Journal Voucher
  const handleAddVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vouDesc || !vouAmount || isNaN(Number(vouAmount))) {
      showWarning("Voucher Form Error", 'Please fill out descriptions and voucher costs accurately.');
      return;
    }
    const val = Number(vouAmount);
    const isHighValue = val > 50000;
    const initialStatus = isHighValue ? 'Pending Admin Approval' : 'Approved';
    const newVou: Voucher = {
      id: `v-${Date.now()}`,
      voucherNo: `VOU-${Math.floor(100 + Math.random() * 900)}`,
      type: vouType,
      category: vouCategory,
      description: vouDesc,
      amount: val,
      date: vouDate,
      approvedBy: isHighValue ? 'Pending Admin Review' : 'Grace Wanjiku (Accountant)',
      status: initialStatus
    };

    setVouchers(prev => [newVou, ...prev]);

    // If it is operational debit and is immediately approved, we also log it directly as a system expense under corporate outlays
    if (vouType === 'Debit' && !isHighValue) {
      onAddExpense({
        description: `[Voucher ${newVou.voucherNo}] ${vouDesc} (Payee: ${vouPayee || 'Internal'})`,
        category: vouCategory,
        amount: val,
        date: vouDate
      });
    }

    if (isHighValue) {
      logAudit('CREATE_VOUCHER_PENDING', `Created High-Value ${vouType} Voucher ${newVou.voucherNo} of KES ${val.toLocaleString()} awaiting Admin authorization`, 'Warning');
      showInfo("Admin Dual-Authorization", `Voucher ${newVou.voucherNo} logged. Since the amount exceeds KES 50,000, it has been submitted for Admin Dual-Authorization.`);
    } else {
      logAudit('CREATE_VOUCHER', `Created ${vouType} Voucher ${newVou.voucherNo} for KES ${val.toLocaleString()} (${catLabel(vouCategory)})`);
      showToast(`Success: Multi-entry Journal Voucher ${newVou.voucherNo} finalized and cross-balanced.`, 'success');
    }
    setVouDesc('');
    setVouAmount('');
    setVouPayee('');
  };

  const catLabel = (c: string) => c;

  // Imprest Petty Cash Workflow
  const handleRequestImprest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!impStaff || !impAmount || isNaN(Number(impAmount))) {
      showWarning("Imprest Request Error", 'Provide Staff identifier and valid petty amount.');
      return;
    }
    const val = Number(impAmount);
    const newImp: Imprest = {
      id: `imp-${Date.now()}`,
      staffName: impStaff,
      amount: val,
      purpose: impPurpose,
      status: 'pending',
      date: new Date().toISOString().substring(0, 10)
    };
    setImprests(prev => [...prev, newImp]);
    logAudit('IMPREST_REQUESTED', `Petty cash requisition of KES ${val.toLocaleString()} submitted by ${impStaff}`);
    setImpStaff('');
    setImpAmount('');
    setImpPurpose('');
    showToast('Petty cash dispatch proposal logged.', 'success');
  };

  const handleUpdateImprestStatus = (id: string, newStatus: 'approved' | 'rejected' | 'surrendered') => {
    setImprests(prev => prev.map(imp => {
      if (imp.id === id) {
        if (newStatus === 'approved') {
          // generate an automatic counter Debit voucher
          const vouNo = `VOU-${Math.floor(100 + Math.random() * 900)}`;
          const autoVou: Voucher = {
            id: `v-${Date.now()}`,
            voucherNo: vouNo,
            type: 'Debit',
            category: 'General Administration',
            description: `[Automatic Petty Cash Allocation] Dispatched KES ${imp.amount.toLocaleString()} petty cash to ${imp.staffName}. Reason: ${imp.purpose}`,
            amount: imp.amount,
            date: new Date().toISOString().substring(0, 10),
            approvedBy: 'Grace Wanjiku (Accountant)'
          };
          setVouchers(v => [autoVou, ...v]);
          onAddExpense({
            description: `[Petty cash ${vouNo}] Allocated to ${imp.staffName}`,
            category: 'General Administration',
            amount: imp.amount,
            date: new Date().toISOString().substring(0, 10)
          });
          logAudit('IMPREST_APPROVED', `Dispatched imprest KES ${imp.amount.toLocaleString()} to ${imp.staffName}`, 'Success');
          return { ...imp, status: 'approved', voucherId: autoVou.id };
        } else if (newStatus === 'surrendered') {
          logAudit('IMPREST_SURRENDERED', `${imp.staffName} returned unutilized balance from imprest. Audited matching records.`);
        } else {
          logAudit('IMPREST_REJECTED', `Declined petty cash requisition for ${imp.staffName}`, 'Warning');
        }
        return { ...imp, status: newStatus };
      }
      return imp;
    }));
  };

  // Supplier & PO Management
  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName) return;
    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      companyName: newSupName,
      contactPerson: newSupContact || 'General Partner',
      status: 'Active',
      balance: 0,
      purchaseOrders: []
    };
    setSuppliers(prev => [...prev, newSup]);
    logAudit('ADD_SUPPLIER', `Registered partner supplier: ${newSupName}`);
    setNewSupName('');
    setNewSupContact('');
    showToast(`Registered supplier ${newSup.companyName} successfully.`, 'success');
  };

  const handleRaisePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplierId || !poItem || !poAmt || isNaN(Number(poAmt))) {
      showWarning("Purchase Order Error", 'Select direct partner supplier and correct balance value.');
      return;
    }
    const val = Number(poAmt);
    const newPO = {
      id: `po-${Date.now()}`,
      poNo: `PO-${Math.floor(8000 + Math.random() * 1999)}`,
      itemName: poItem,
      amount: val,
      status: 'pending' as const,
      date: new Date().toISOString().substring(0, 10)
    };

    setSuppliers(prev => prev.map(sup => {
      if (sup.id === activeSupplierId) {
        return {
          ...sup,
          balance: sup.balance + val,
          purchaseOrders: [...sup.purchaseOrders, newPO]
        };
      }
      return sup;
    }));

    logAudit('CREATE_PO', `Raised Purchase Order ${newPO.poNo} (KES ${val.toLocaleString()}) for ${poItem}`);
    setPoItem('');
    setPoAmt('');
    showToast(`Successfully registered Purchase order ${newPO.poNo} and credited supplier ledger.`, 'success');
  };

  const handleApprovePO = (supId: string, poId: string) => {
    setSuppliers(prev => prev.map(sup => {
      if (sup.id === supId) {
        const updatedPOs = sup.purchaseOrders.map(po => {
          if (po.id === poId) {
            logAudit('PO_APPROVED', `Authorized Supplier PO ${po.poNo} for delivery matching.`);
            return { ...po, status: 'approved' as const };
          }
          return po;
        });
        return { ...sup, purchaseOrders: updatedPOs };
      }
      return sup;
    }));
  };

  const handleSettleSupplierPO = (supId: string, poId: string) => {
    setSuppliers(prev => prev.map(sup => {
      if (sup.id === supId) {
        const updatedPOs = sup.purchaseOrders.map(po => {
          if (po.id === poId) {
            // Deduct supplier balance sheet
            // Generate counter Debit payment voucher matching PO settle
            const journalNo = `VOU-${Math.floor(100 + Math.random() * 900)}`;
            const isHighValue = po.amount > 50000;
            const initialStatus = isHighValue ? 'Pending Admin Approval' : 'Approved';
            const paymentVoucher: Voucher = {
              id: `v-${Date.now()}`,
              voucherNo: journalNo,
              type: 'Debit',
              category: 'Utility Bills',
              description: `[Supplier PO Settlement] Paid KES ${po.amount.toLocaleString()} to ${sup.companyName} for invoice matching ${po.poNo}`,
              amount: po.amount,
              date: new Date().toISOString().substring(0, 10),
              approvedBy: isHighValue ? 'Pending Admin Review' : 'Grace Wanjiku (Accountant)',
              status: initialStatus
            };
            setVouchers(v => [paymentVoucher, ...v]);

            if (!isHighValue) {
              onAddExpense({
                description: `[PO Payee ${po.poNo}] Cleared Apex/Labs supplier contract`,
                category: 'Utility Bills',
                amount: po.amount,
                date: new Date().toISOString().substring(0, 10)
              });
            }

            if (isHighValue) {
              logAudit('SETTLE_SUPPLIER_ACCOUNT_PENDING', `Drafted payout KES ${po.amount.toLocaleString()} matching PO ${po.poNo} awaiting Admin authorization`, 'Warning');
            } else {
              logAudit('SETTLE_SUPPLIER_ACCOUNT', `Issued cash ledger payout KES ${po.amount.toLocaleString()} matching PO ${po.poNo}`, 'Success');
            }
            return { ...po, status: 'paid' as const };
          }
          return po;
        });
        
        // Calculate new outstanding balance
        const poObj = sup.purchaseOrders.find(p => p.id === poId);
        const reduction = poObj ? poObj.amount : 0;

        return { ...sup, balance: Math.max(0, sup.balance - reduction), purchaseOrders: updatedPOs };
      }
      return sup;
    }));
    alert('Settled supplier purchase order and drafted instant payment voucher documentation.');
  };

  // Adjust Budget Ceilings
  const handleUpdateBudgetCeiling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBudgetLimit || isNaN(Number(editBudgetLimit))) {
      showWarning("Budget Form Error", 'Provide authorized ceiling numerical value.');
      return;
    }
    const val = Number(editBudgetLimit);
    setBudgets(prev => ({
      ...prev,
      [editBudgetDept]: val
    }));
    logAudit('REALLOCATE_BUDGET', `Adjusted ${editBudgetDept} budget ceiling to KES ${val.toLocaleString()}`);
    setEditBudgetLimit('');
    showToast(`Successfully configured direct budget ceiling guidelines.`, 'success');
  };

  // Bank statement manual matching logic
  const handleMatchBankStatement = (statementId: string, studentId: string, invoiceId: string) => {
    const statement = bankStatements.find(b => b.id === statementId);
    const student = students.find(s => s.id === studentId);
    if (!statement || !student) return;

    // 1. Mark transaction in statement matched
    setBankStatements(prev => prev.map(s => {
      if (s.id === statementId) {
        return { ...s, isMatched: true, matchedTxId: statement.reference };
      }
      return s;
    }));

    // 2. Mark student invoice paid
    const updatedLedger = student.ledger.map(inv => {
      if (inv.id === invoiceId) {
        return { ...inv, status: 'paid' as const };
      }
      return inv;
    });

    // 3. Create a reconciled payment entry on student records
    const newPaymentObj: Payment = {
      id: `pay-${Date.now()}`,
      amount: statement.amount,
      invoiceId: invoiceId,
      studentId: studentId,
      paymentMethod: statement.reference.includes('MPESA') ? 'M-Pesa' : 'Bank Transfer',
      transactionId: statement.reference,
      date: statement.date,
      status: 'reconciled'
    };

    const updatedPayments = [...(student.payments || []), newPaymentObj];
    onUpdateStudent?.(student.id, { 
      ledger: updatedLedger,
      payments: updatedPayments
    });

    logAudit('BANK_STATEMENT_MATCH', `Manually reconciled Statement Ref ${statement.reference} for Student ${student.name} KES ${statement.amount.toLocaleString()}`, 'Success');
    showSuccess("Bank Deposit Matched", `Successfully matched bank deposit! Student ${student.name}'s invoice marked PAID and payment record logged.`);
  };

  // Run automated bulk reconciliation matching
  const handleRunAutoReconciliation = async () => {
    setIsSyncingPayments(true);
    try {
      let matchCount = 0;
      
      // Check unmatched bank statements against unpaid invoices or open payments
      const updatedStatements = bankStatements.map(statement => {
        if (statement.isMatched) return statement;

        // Try matching by amount against unreconciled student payments
        const matchingPayment = unreconciledPayments.find(p => p.amount === statement.amount);
        if (matchingPayment) {
          onReconcilePayment(matchingPayment.id);
          matchCount++;
          return { ...statement, isMatched: true, matchedTxId: matchingPayment.transactionId };
        }
        return statement;
      });

      if (matchCount === 0) {
        showToast('No new payment matches were found during sync.', 'info', { title: 'Payments sync complete' });
        return;
      }
  
      setBankStatements(updatedStatements);
      logAudit('RUN_AUTO_RECON', `Bulk matched ${matchCount} payments against live bank statement streams automatically.`, 'Success');
      showToast(`Matched ${matchCount} payment${matchCount === 1 ? '' : 's'} successfully.`, 'success', { title: 'Payments synced' });
    } catch (err) {
      console.error(err);
      showToast('Failed to sync payments. Please try again.', 'error', { title: 'Payments sync error' });
    } finally {
      setIsSyncingPayments(false);
    }
  };

  // --- CSV EXPORT CAPABILITY ---
  const handleExportCSVFile = (type: 'vouchers' | 'payroll' | 'audit' | 'suppliers') => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let nameFilter = '';

    if (type === 'vouchers') {
      headers = ['Voucher No', 'Type', 'Category', 'Description', 'Amount (KES)', 'Date', 'Authorized By', 'Status'];
      rows = vouchers.map(v => [v.voucherNo, v.type, v.category, v.description, String(v.amount), v.date, v.approvedBy, v.status || 'Approved']);
      nameFilter = 'institutional_accounting_vouchers';
    } else if (type === 'suppliers') {
      headers = ['Supplier Company', 'Contact Person', 'Status', 'Account Balance (KES)', 'Orders Count'];
      rows = suppliers.map(s => [s.companyName, s.contactPerson, s.status, String(s.balance), String(s.purchaseOrders.length)]);
      nameFilter = 'suppliers_accounts_ledgers';
    } else if (type === 'audit') {
      headers = ['Timestamp', 'Officer', 'Role', 'Action Executed', 'Compliance Resource Involved', 'Status'];
      rows = audits.map(a => [a.timestamp, a.user, a.role, a.action, a.resource, a.status]);
      nameFilter = 'fiscal_audit_compliance_trail';
    } else {
      headers = ['Lecturer Name', 'Email Address', 'Contract Code', 'Logged Hours', 'Base Pay (KES)', 'Stat Deductions NHIF (KES)', 'NSSF Contribution (KES)', 'PAYE Tax (KES)', 'Net Disbursed (KES)'];
      rows = lecturers.map(lec => {
        const gross = lec.loggedHours * lec.hourlyRate;
        const nssf = payrollConfig.nssf; 
        const nhif = payrollConfig.nhif;
        const taxable = Math.max(0, gross - nssf);
        const paye = taxable > payrollConfig.payeThreshold ? Math.round(taxable * (payrollConfig.payeRate / 100)) : 0;
        const deductions = nssf + nhif + paye;
        const net = Math.max(0, gross - deductions);
        return [
          lec.name, lec.email, lec.contractLength, String(lec.loggedHours), String(gross), String(nhif), String(nssf), String(paye), String(net)
        ];
      });
      nameFilter = 'staff_salary_payroll_audit';
    }

    const blobString = [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([blobString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${nameFilter}_${new Date().toLocaleDateString('en-CA')}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-fadeIn" id="finance-suite-modular">
      
      {/* SECTION NAV BAR */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">Ledger & Finances</h2>
            <p className="text-sm text-slate-500">Manage student billing, scholarships, reconciliation, budgets, vouchers, payroll, and audit workflows.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-2">
          <button
            type="button"
            onClick={() => setSubTab('revenue')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-4 focus:ring-blue-100 cursor-pointer ${
              subTab === 'revenue' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            Student Finance
          </button>
          <button
            type="button"
            onClick={() => setSubTab('vouchers')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-4 focus:ring-blue-100 cursor-pointer ${
              subTab === 'vouchers' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            Vouchers & Petty Cash
          </button>
          <button
            type="button"
            onClick={() => setSubTab('budgets')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-4 focus:ring-blue-100 cursor-pointer ${
              subTab === 'budgets' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            Budgets & Bank
          </button>
          <button
            type="button"
            onClick={() => setSubTab('payroll')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-4 focus:ring-blue-100 cursor-pointer ${
              subTab === 'payroll' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            Payroll Compliance
          </button>
          <button
            type="button"
            onClick={() => setSubTab('audit')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-4 focus:ring-blue-100 cursor-pointer ${
              subTab === 'audit' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            Audit Trail
          </button>
        </div>
      </div>
      </div>

      {isAccountantView && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fadeIn">
          <div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-widest font-mono">My Account Access Policy</span>
            </div>
            <p className="text-[11px] text-slate-550 mt-1 font-medium">
              Your accountant user account is subject to system-level permissions defined by the Master Administrative Control Panel.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[9.5px] font-bold font-mono">
            <span className={`px-2.5 py-1 rounded border flex items-center gap-1 ${
              activePermissions.canReconcile ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-rose-50 text-rose-700 border-rose-150'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${activePermissions.canReconcile ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              Reconciliation: {activePermissions.canReconcile ? 'ALLOWED' : 'LOCKED'}
            </span>
            <span className={`px-2.5 py-1 rounded border flex items-center gap-1 ${
              activePermissions.canLogExpenses ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-rose-50 text-rose-700 border-rose-150'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${activePermissions.canLogExpenses ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              Vouchers/Expenses: {activePermissions.canLogExpenses ? 'ALLOWED' : 'LOCKED'}
            </span>
            <span className={`px-2.5 py-1 rounded border flex items-center gap-1 ${
              activePermissions.canManageBudgets ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-rose-50 text-rose-700 border-rose-150'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${activePermissions.canManageBudgets ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              Budgets: {activePermissions.canManageBudgets ? 'ALLOWED' : 'LOCKED'}
            </span>
            <span className={`px-2.5 py-1 rounded border flex items-center gap-1 ${
              activePermissions.canProcessPayroll ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-rose-50 text-rose-700 border-rose-150'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${activePermissions.canProcessPayroll ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              Payroll Payouts: {activePermissions.canProcessPayroll ? 'ALLOWED' : 'LOCKED'}
            </span>
            <span className={`px-2.5 py-1 rounded border flex items-center gap-1 ${
              activePermissions.canApproveImprests ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-rose-50 text-rose-700 border-rose-150'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${activePermissions.canApproveImprests ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              Imprests: {activePermissions.canApproveImprests ? 'ALLOWED' : 'LOCKED'}
            </span>
          </div>
        </div>
      )}

      {subTab === 'revenue' && (
        <div className="grid gap-6 xl:grid-cols-3">
          <FinanceSectionCard
            title="Student Billing"
            description="Create invoices for students and apply the selected fee category to their ledger."
            icon={<DollarSign className="h-5 w-5" />}
          >
            <form onSubmit={handleGenerateInvoice} className="space-y-5">
              <FinanceField id="billing-student" label="Student" error={revenueFormErrors.billingStudentId}>
                <select
                  id="billing-student"
                  value={billingStudentId}
                  onChange={(e) => {
                    setBillingStudentId(e.target.value);
                    setRevenueFormErrors(prev => ({ ...prev, billingStudentId: undefined }));
                  }}
                  className={fieldClassName}
                  aria-invalid={Boolean(revenueFormErrors.billingStudentId)}
                  aria-describedby={revenueFormErrors.billingStudentId ? 'billing-student-error' : undefined}
                >
                  <option value="">Select a student</option>
                  {financeStudents.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.admissionNo || 'N/A'})
                    </option>
                  ))}
                </select>
              </FinanceField>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p><span className="font-semibold text-slate-900">Account Status:</span> {getStudentStatus(billingStudentId)}</p>
                <p className="mt-1"><span className="font-semibold text-slate-900">Outstanding Balance:</span> KES {getStudentBalance(billingStudentId).toLocaleString()}</p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FinanceField id="billing-category" label="Fee Category" error={revenueFormErrors.billingVoteHead}>
                  <select
                    id="billing-category"
                    value={billingVoteHead}
                    onChange={(e) => {
                      setBillingVoteHead(e.target.value as 'Tuition' | 'Boarding' | 'Transport' | 'Lab Fee');
                      setRevenueFormErrors(prev => ({ ...prev, billingVoteHead: undefined }));
                    }}
                    className={fieldClassName}
                    aria-invalid={Boolean(revenueFormErrors.billingVoteHead)}
                    aria-describedby={revenueFormErrors.billingVoteHead ? 'billing-category-error' : undefined}
                  >
                    {feeCategoryOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FinanceField>

                <FinanceField id="billing-amount" label="Amount (KES)" error={revenueFormErrors.billingAmount}>
                  <input
                    id="billing-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter amount"
                    value={billingAmount}
                    onChange={(e) => {
                      setBillingAmount(e.target.value);
                      setRevenueFormErrors(prev => ({ ...prev, billingAmount: undefined }));
                    }}
                    className={fieldClassName}
                    aria-invalid={Boolean(revenueFormErrors.billingAmount)}
                    aria-describedby={revenueFormErrors.billingAmount ? 'billing-amount-error' : undefined}
                  />
                </FinanceField>
              </div>

              <FinanceField id="billing-description" label="Description" error={revenueFormErrors.billingDescription}>
                <textarea
                  id="billing-description"
                  placeholder="Enter invoice description..."
                  value={billingDescription}
                  onChange={(e) => {
                    setBillingDescription(e.target.value);
                    setRevenueFormErrors(prev => ({ ...prev, billingDescription: undefined }));
                  }}
                  className={`${fieldClassName} min-h-[120px] resize-y`}
                  aria-invalid={Boolean(revenueFormErrors.billingDescription)}
                  aria-describedby={revenueFormErrors.billingDescription ? 'billing-description-error' : undefined}
                />
              </FinanceField>

              <button
                type="submit"
                disabled={isCreatingInvoice}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-blue-300"
                aria-label="Create invoice"
              >
                {isCreatingInvoice ? (
                  <>
                    <Activity className="h-4 w-4 animate-spin" />
                    <span>Creating Invoice...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Create Invoice</span>
                  </>
                )}
              </button>
            </form>
          </FinanceSectionCard>

          <FinanceSectionCard
            title="Scholarships & Discounts"
            description="Apply scholarships, bursaries, and discounts as ledger credits for the selected student."
            icon={<Award className="h-5 w-5" />}
            accentClassName="bg-green-50 text-green-600"
          >
            <form onSubmit={handleApplyWaiver} className="space-y-5">
              <FinanceField id="waiver-student" label="Student" error={revenueFormErrors.waiverStudentId}>
                <select
                  id="waiver-student"
                  value={waiverStudentId}
                  onChange={(e) => {
                    setWaiverStudentId(e.target.value);
                    setRevenueFormErrors(prev => ({ ...prev, waiverStudentId: undefined }));
                  }}
                  className={fieldClassName}
                  aria-invalid={Boolean(revenueFormErrors.waiverStudentId)}
                  aria-describedby={revenueFormErrors.waiverStudentId ? 'waiver-student-error' : undefined}
                >
                  <option value="">Select a student</option>
                  {financeStudents.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.admissionNo || 'N/A'})
                    </option>
                  ))}
                </select>
              </FinanceField>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p><span className="font-semibold text-slate-900">Account Status:</span> {getStudentStatus(waiverStudentId)}</p>
                <p className="mt-1"><span className="font-semibold text-slate-900">Outstanding Balance:</span> KES {getStudentBalance(waiverStudentId).toLocaleString()}</p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FinanceField id="waiver-type" label="Scholarship Type" error={revenueFormErrors.waiverType}>
                  <select
                    id="waiver-type"
                    value={waiverType}
                    onChange={(e) => {
                      setWaiverType(e.target.value as 'Scholarship' | 'Sibling Discount' | 'Bursary');
                      setRevenueFormErrors(prev => ({ ...prev, waiverType: undefined }));
                    }}
                    className={fieldClassName}
                    aria-invalid={Boolean(revenueFormErrors.waiverType)}
                    aria-describedby={revenueFormErrors.waiverType ? 'waiver-type-error' : undefined}
                  >
                    {scholarshipTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FinanceField>

                <FinanceField id="waiver-amount" label="Award Amount (KES)" error={revenueFormErrors.waiverAmount}>
                  <input
                    id="waiver-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter amount"
                    value={waiverAmount}
                    onChange={(e) => {
                      setWaiverAmount(e.target.value);
                      setRevenueFormErrors(prev => ({ ...prev, waiverAmount: undefined }));
                    }}
                    className={fieldClassName}
                    aria-invalid={Boolean(revenueFormErrors.waiverAmount)}
                    aria-describedby={revenueFormErrors.waiverAmount ? 'waiver-amount-error' : undefined}
                  />
                </FinanceField>
              </div>

              <FinanceField id="waiver-description" label="Reason" error={revenueFormErrors.waiverDescription}>
                <textarea
                  id="waiver-description"
                  placeholder="Enter scholarship reason..."
                  value={waiverDescription}
                  onChange={(e) => {
                    setWaiverDescription(e.target.value);
                    setRevenueFormErrors(prev => ({ ...prev, waiverDescription: undefined }));
                  }}
                  className={`${fieldClassName} min-h-[120px] resize-y`}
                  aria-invalid={Boolean(revenueFormErrors.waiverDescription)}
                  aria-describedby={revenueFormErrors.waiverDescription ? 'waiver-description-error' : undefined}
                />
              </FinanceField>

              <button
                type="submit"
                disabled={isAwardingScholarship}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-blue-300"
                aria-label="Award scholarship"
              >
                {isAwardingScholarship ? (
                  <>
                    <Activity className="h-4 w-4 animate-spin" />
                    <span>Awarding Scholarship...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Award Scholarship</span>
                  </>
                )}
              </button>
            </form>
          </FinanceSectionCard>

          <FinanceSectionCard
            title="Payments & Reconciliation"
            description="Sync payments, review pending approvals, and track reconciliation progress from one place."
            icon={<Activity className="h-5 w-5" />}
            accentClassName="bg-orange-50 text-orange-500"
          >
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Pending Approvals</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{unreconciledPayments.length}</p>
                  <span className="mt-3 inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                    {unreconciledPayments.length === 0 ? 'All caught up' : 'Needs review'}
                  </span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Reconciliation Status</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{reconciliationHealth}</p>
                  <p className="mt-3 text-sm text-slate-500">Matched statements are kept separate from unresolved student payments.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-950">Sync Payments</h4>
                    <p className="mt-1 text-sm text-slate-500">Run payment matching against unreconciled records and imported bank statements.</p>
                  </div>
                  <button
                    type="button"
                    onClick={activePermissions.canReconcile ? handleRunAutoReconciliation : () => showToast('Your accountant role does not have permission to sync payments.', 'error', { title: 'Permission denied' })}
                    disabled={!activePermissions.canReconcile || isSyncingPayments}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                      activePermissions.canReconcile && !isSyncingPayments
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'cursor-not-allowed bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isSyncingPayments ? (
                      <>
                        <Activity className="h-4 w-4 animate-spin" />
                        <span>Syncing Payments...</span>
                      </>
                    ) : (
                      <>
                        {activePermissions.canReconcile ? <Check className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        <span>{activePermissions.canReconcile ? 'Sync Payments' : 'Reconciliation Locked'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h4 className="text-sm font-semibold text-slate-950">Pending Approvals</h4>
                  <p className="mt-1 text-sm text-slate-500">Review unreconciled student payments individually when needed.</p>
                </div>

                <div className="max-h-[320px] space-y-3 overflow-y-auto p-4">
                  {unreconciledPayments.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                      No pending payment approvals.
                    </div>
                  ) : (
                    unreconciledPayments.map(payment => {
                      const student = students.find(item => item.id === payment.studentId);
                      return (
                        <div key={payment.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{student ? getStudentDisplayName(student.id) : 'Student not found'}</p>
                            <p className="mt-1 text-sm text-slate-500">Reference: {payment.transactionId} • {payment.paymentMethod}</p>
                          </div>
                          <div className="flex items-center justify-between gap-3 sm:justify-end">
                            <p className="text-sm font-semibold text-slate-950">KES {payment.amount.toLocaleString()}</p>
                            {!activePermissions.canReconcile ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                                <Lock className="h-3 w-3" />
                                Locked
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onReconcilePayment(payment.id);
                                  logAudit('RECONCILE_PAYMENT', `Manually reconciled matching payload for ${student?.name || 'unknown'}`);
                                  showToast('Payment approved successfully.', 'success', { title: 'Payment reconciled' });
                                }}
                                className="inline-flex items-center justify-center rounded-xl bg-orange-100 px-3 py-2 text-xs font-semibold text-orange-800 transition hover:bg-orange-200 focus:outline-none focus:ring-4 focus:ring-orange-100"
                                aria-label={`Approve matching payment ${payment.transactionId}`}
                              >
                                Approve Matching
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-950">Audit Summary</h4>
                {latestAudit ? (
                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    <p><span className="font-semibold text-slate-900">Latest action:</span> {latestAudit.action}</p>
                    <p><span className="font-semibold text-slate-900">Resource:</span> {latestAudit.resource}</p>
                    <p><span className="font-semibold text-slate-900">Status:</span> {latestAudit.status}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">No audit events have been logged yet.</p>
                )}
              </div>
            </div>
          </FinanceSectionCard>
        </div>
      )}

      {subTab === 'vouchers' && (
        <div className="grid lg:grid-cols-3 gap-6">

          {/* COLUMN 1: CORPORATE JOURNAL VOUCHERS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm font-sans">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Clipboard className="w-5 h-5 text-blue-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Corporate Finance Vouchers</h3>
                <p className="text-[10px] text-slate-400">Record Debit/Credit double entry journal vouchers.</p>
              </div>
            </div>

            <form onSubmit={handleAddVoucher} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Journal Type</label>
                  <select
                    value={vouType}
                    onChange={(e) => setVouType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outfit-none font-semibold focus:border-slate-400"
                  >
                    <option value="Debit">Debit Outflow</option>
                    <option value="Credit">Credit Inflow</option>
                    <option value="Journal">General Journal Entry</option>
                    <option value="Contra">Contra Transfer</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Budget Category</label>
                  <select
                    value={vouCategory}
                    onChange={(e) => setVouCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outfit-none focus:border-slate-400"
                  >
                    <option>Utility Bills</option>
                    <option>Maintenance</option>
                    <option>Marketing</option>
                    <option>Salaries</option>
                    <option>General Administration</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Cost (KES)</label>
                <input
                  type="number"
                  placeholder="e.g. 24000"
                  value={vouAmount}
                  onChange={(e) => setVouAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none font-bold focus:border-slate-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Payee / Entity</label>
                  <input
                    type="text"
                    placeholder="e.g. Safaricom Ltd"
                    value={vouPayee}
                    onChange={(e) => setVouPayee(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-slate-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Valuation Date</label>
                  <input
                    type="date"
                    value={vouDate}
                    onChange={(e) => setVouDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Voucher Description Narrative</label>
                <textarea
                  placeholder="Official ledger matching notation..."
                  value={vouDesc}
                  onChange={(e) => setVouDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-slate-400"
                  required
                />
              </div>

              {!activePermissions.canLogExpenses ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-2 bg-slate-105 border border-slate-200 text-slate-400 font-bold rounded-lg cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" /> Issue Voucher Locked
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-750 text-white font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Issue Balanced Finance Voucher
                </button>
              )}
            </form>
          </div>

          {/* COLUMN 2: PETTY CASH & IMPRESTS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm font-sans">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Wallet className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Petty Cash Imprest Ledger</h3>
                <p className="text-[10px] text-slate-400">Request, approve, or verify staff petty cash surrenders.</p>
              </div>
            </div>

            <form onSubmit={handleRequestImprest} className="space-y-3 text-xs pb-3 border-b border-slate-100">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Staff Member ID</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Jane Mugo"
                    value={impStaff}
                    onChange={(e) => setImpStaff(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Amount (KES)</label>
                  <input
                    type="number"
                    placeholder="Max 25,000"
                    value={impAmount}
                    onChange={(e) => setImpAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Emergency Procurement Purpose</label>
                <input
                  type="text"
                  placeholder="Whiteboard marker box packs, chemicals..."
                  value={impPurpose}
                  onChange={(e) => setImpPurpose(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Log Imprest Requisition
              </button>
            </form>

            <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Imprests Balance</span>
              {imprests.map(imp => (
                <div key={imp.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-150 text-[11px] flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <div>
                      <span className="font-bold text-slate-900">{imp.staffName}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">{imp.date}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 italic">"{imp.purpose}"</p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="font-mono font-bold">KES {imp.amount.toLocaleString()}</span>
                      {imp.status === 'pending' && <span className="bg-amber-150 text-amber-900 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase">Pending</span>}
                      {imp.status === 'approved' && <span className="bg-emerald-100 text-emerald-800 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase">Dispatched</span>}
                      {imp.status === 'surrendered' && <span className="bg-slate-200 text-slate-650 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase">Surrendered & Closed</span>}
                      {imp.status === 'rejected' && <span className="bg-rose-100 text-rose-800 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase">Declined</span>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    {!activePermissions.canApproveImprests ? (
                      <span className="text-[9px] font-bold bg-slate-100 text-slate-400 border border-slate-200 p-1 rounded font-mono inline-flex items-center gap-0.5 justify-center" title="Imprests Action Locked">
                        <Lock className="w-2.5 h-2.5 text-slate-400" /> Locked
                      </span>
                    ) : (
                      <>
                        {imp.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateImprestStatus(imp.id, 'approved')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] p-1 rounded font-bold cursor-pointer"
                              title="Authorize Disbursal"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateImprestStatus(imp.id, 'rejected')}
                              className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] p-1 rounded font-bold cursor-pointer"
                              title="Deny"
                            >
                              Deny
                            </button>
                          </>
                        )}
                        {imp.status === 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateImprestStatus(imp.id, 'surrendered')}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[9px] p-1 rounded font-bold cursor-pointer"
                            title="Reconcile accounts"
                          >
                            Audited Return
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 3: SUPPLIERS LEDGER & PO DISPATCH */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm font-sans">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Layers className="w-5 h-5 text-purple-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Procurements & Supplier POs</h3>
                <p className="text-[10px] text-slate-400">Log institutional suppliers and purchase orders.</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleExportCSVFile('suppliers')}
                className="w-full py-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer"
              >
                <FileSpreadsheet className="w-3 h-3" />
                <span>Export Supplier Ledger</span>
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="space-y-2 text-xs pb-3 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Register Supplier</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Company Name"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="bg-slate-50 border p-1.5 rounded-lg text-xs"
                  required
                />
                <input
                  type="text"
                  placeholder="Contact Officer"
                  value={newSupContact}
                  onChange={(e) => setNewSupContact(e.target.value)}
                  className="bg-slate-50 border p-1.5 rounded-lg text-xs"
                />
              </div>
              {!activePermissions.canLogExpenses ? (
                <button
                  type="button"
                  disabled
                  className="w-full bg-slate-105 border border-slate-200 text-slate-400 font-bold py-1 rounded text-[10px] cursor-not-allowed flex items-center justify-center gap-1"
                >
                  <Lock className="w-3 h-3 text-slate-400" /> Supplier Hub Restricted
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 rounded text-[10px] cursor-pointer"
                >
                  Add Corporate Supplier Account
                </button>
              )}
            </form>

            <form onSubmit={handleRaisePO} className="space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Issue Purchase Order (PO)</span>
              <div className="space-y-1">
                <select
                  value={activeSupplierId}
                  onChange={(e) => setActiveSupplierId(e.target.value)}
                  className="w-full bg-slate-50 border p-1.5 rounded-lg text-xs font-semibold"
                  required
                >
                  <option value="">-- Choose Partner Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.companyName} (outstanding KES {s.balance.toLocaleString()})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Item Name / Asset Bundle"
                  value={poItem}
                  onChange={(e) => setPoItem(e.target.value)}
                  className="bg-slate-50 border p-1.5 rounded-lg text-xs"
                  required
                />
                <input
                  type="number"
                  placeholder="Value Amount (KES)"
                  value={poAmt}
                  onChange={(e) => setPoAmt(e.target.value)}
                  className="bg-slate-50 border p-1.5 rounded-lg text-xs font-bold"
                  required
                />
              </div>
              {!activePermissions.canLogExpenses ? (
                <button
                  type="button"
                  disabled
                  className="w-full bg-slate-105 border border-slate-200 text-slate-400 font-bold py-1.5 rounded-lg cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Procurement Locked
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Settle PO Contract Agreement
                </button>
              )}
            </form>

            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pending Order Confirmations</span>
              {suppliers.flatMap(sup => sup.purchaseOrders.map(po => (
                <div key={po.id} className="p-2 bg-slate-50 rounded-lg border text-[10px] flex justify-between items-center gap-2">
                  <div>
                    <span className="font-bold text-slate-900 block">{po.poNo} - {sup.companyName}</span>
                    <span className="text-slate-500">"{po.itemName}" • {po.date}</span>
                    <span className="font-semibold block text-slate-800">KES {po.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-1">
                    {po.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleApprovePO(sup.id, po.id)}
                        className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-black px-1.5 py-0.5 rounded text-[9px]"
                      >
                        Approve PO
                      </button>
                    )}
                    {po.status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => handleSettleSupplierPO(sup.id, po.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-1.5 py-0.5 rounded text-[9px]"
                      >
                        Settle Ledger
                      </button>
                    )}
                    {po.status === 'paid' && (
                      <span className="bg-slate-200 text-slate-650 px-1.5 py-0.5 rounded text-[9px] font-bold">Cleared</span>
                    )}
                  </div>
                </div>
              )))}
            </div>
          </div>
          
          {/* Vouchers Audit/Registry list */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm font-sans mt-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Institutional Vouchers Registry</h3>
                <p className="text-[10px] text-slate-400">View voucher states and authorize pending vouchers (Admin clearance required for amounts &gt; KES 50,000).</p>
              </div>
              <button
                type="button"
                onClick={() => handleExportCSVFile('vouchers')}
                className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-white font-bold text-[10px] rounded-lg cursor-pointer flex items-center gap-1 shadow-3xs"
              >
                <FileSpreadsheet className="w-3 h-3 text-emerald-400" /> Export CSV
              </button>
            </div>
            <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-xs overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs bg-white">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                    <th className="p-3">Voucher No</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Approved By</th>
                    <th className="p-3 text-center">Status</th>
                    {!isAccountantView && <th className="p-3 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-800 font-medium">
                  {vouchers.map(v => (
                    <tr key={v.id} className="hover:bg-slate-55/30 transition-colors">
                      <td className="p-3 font-bold font-mono">{v.voucherNo}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          v.type === 'Debit' ? 'bg-rose-50 text-rose-700' :
                          v.type === 'Credit' ? 'bg-emerald-50 text-emerald-700' :
                          v.type === 'Contra' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {v.type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{v.category}</td>
                      <td className="p-3 max-w-[200px] truncate" title={v.description}>{v.description}</td>
                      <td className="p-3 text-slate-400">{v.date}</td>
                      <td className="p-3 font-mono font-bold">KES {v.amount.toLocaleString()}</td>
                      <td className="p-3 text-slate-500">{v.approvedBy}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          (v.status || 'Approved') === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900 animate-pulse'
                        }`}>
                          {v.status || 'Approved'}
                        </span>
                      </td>
                      {!isAccountantView && (
                        <td className="p-3 text-center">
                          {(v.status || 'Approved') === 'Pending Admin Approval' && (
                            <button
                              type="button"
                              onClick={() => handleApproveVoucher(v.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-1 rounded text-[10px] cursor-pointer shadow-3xs"
                            >
                              Approve
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {vouchers.length === 0 && (
                    <tr>
                      <td colSpan={isAccountantView ? 8 : 9} className="p-3 text-center text-slate-400 italic">No vouchers registered.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {subTab === 'budgets' && (
        <div className="space-y-6 font-sans">
          
          {/* STATS PROGRESS BARS */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* COLUMN 1 & 2: RECHARTS BUDGET LIMIT LINE PLOT/VISUALS */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
              <div className="flex justify-between items-center pb-2 border-b">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Institutional Ceilings vs expenditures Outlays</h3>
                  <p className="text-[11px] text-slate-400">Comparing authorized college budgets vs. logged expenditures.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleExportCSVFile('vouchers')}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] rounded-lg cursor-pointer flex items-center gap-1 shadow-3xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Extract Vouchers (CSV)</span>
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                
                {/* PART A: THE PROGRESS BAR TRACKS */}
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Department Limits</span>
                  <div className="space-y-3">
                    {Object.entries(budgets).map(([dept, maxVal]) => {
                      const maxValNum = Number(maxVal);
                      const totalExpenses = departmentTotals[dept] || 0;
                      const pct = Math.min(Math.round((totalExpenses / maxValNum) * 100), 200);
                      const isOverBudg = totalExpenses > maxValNum;

                      let progressColor = 'bg-emerald-500';
                      if (pct > 100) progressColor = 'bg-rose-500 animate-pulse';
                      else if (pct > 75) progressColor = 'bg-amber-500';

                      return (
                        <div key={dept} className="space-y-1 text-xs">
                          <div className="flex justify-between font-semibold text-slate-700 text-[11px]">
                            <span>{dept}</span>
                            <span className="font-mono text-slate-400">Limit: KES {maxValNum.toLocaleString()}</span>
                          </div>

                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className={`${progressColor} h-full transition-all duration-300`} style={{ width: `${pct}%` }} />
                          </div>

                          <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                            <span className={isOverBudg ? 'text-rose-600 font-extrabold uppercase animate-pulse' : 'text-slate-500'}>
                              Spent: KES {totalExpenses.toLocaleString()}
                            </span>
                            <span className={pct > 100 ? 'text-rose-600 font-black' : 'text-slate-400'}>
                              {pct}% utilized
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* PART B: LINE PLOT ANALYSIS */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Outlay Trend Index (June 2026)</span>
                  <div className="h-44 mt-1 bg-slate-50 p-2 rounded-xl border border-slate-150">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyExpenditures} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={9} stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" fontSize={9} />
                        <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '4px' }} />
                        <Line type="monotone" dataKey="Expenditures" stroke="#2563eb" strokeWidth={2.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-2 italic text-center">
                    Reviewing seasonal patterns across quarters for executive audit board reports.
                  </p>
                </div>

              </div>
            </div>

            {/* COLUMN 3: SET ACTIVE CEILINGS FORM */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm text-xs font-sans">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-sans">Adjust Budget Limit</h3>
                  <p className="text-[10px] text-slate-400">Increase or re-allocate department ceilings.</p>
                </div>
              </div>

              <form onSubmit={handleUpdateBudgetCeiling} className="space-y-4 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Target Institution Department</label>
                  <select
                    value={editBudgetDept}
                    onChange={(e) => setEditBudgetDept(e.target.value)}
                    className="w-full bg-slate-50 border p-2.5 rounded-lg outline-none text-xs font-medium focus:border-slate-400"
                  >
                    <option value="Operations & IT">Operations & IT</option>
                    <option value="Estates & Facilities">Estates & Facilities</option>
                    <option value="Admissions & Outreach">Admissions & Outreach</option>
                    <option value="Academic Affairs">Academic Affairs</option>
                    <option value="General Administration">General Administration</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Custom Limit Ceiling (KES)</label>
                  <input
                    type="number"
                    placeholder="e.g., 200000"
                    value={editBudgetLimit}
                    onChange={(e) => setEditBudgetLimit(e.target.value)}
                    className="w-full bg-slate-50 border p-2.5 rounded-lg outline-none font-bold text-slate-900 focus:border-slate-400"
                    required
                  />
                </div>

                {!activePermissions.canManageBudgets ? (
                  <button
                    type="button"
                    disabled
                    className="w-full bg-slate-105 border border-slate-200 text-slate-400 font-bold py-2.5 rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-4 h-4 text-slate-400" /> Ceiling Adjustment Locked
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-4 h-4 text-emerald-400" />
                    <span>Update Corporate Ceiling</span>
                  </button>
                )}
              </form>
            </div>

          </div>

          {/* MANUAL BANK STATEMENT RECONCILIATION DIRECTORY */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="w-4.5 h-4.5 text-blue-500" />
                  Bank Statement Direct Reconciliation Station
                </h3>
                <p className="text-[10px] text-slate-400">Audit unlinked bank transfers and M-Pesa deposits against unpaid ledger invoices.</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full animate-pulse border border-emerald-100">
                Direct Sync Active
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-2">
              
              {/* UNLINKED DEPOSITS */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Unlinked Banking Deposits</span>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {bankStatements.filter(b => !b.isMatched).length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center border border-dashed">
                      <p className="text-xs text-slate-400 italic">Excellent! All banking statement packets reconciled.</p>
                    </div>
                  ) : (
                    bankStatements.filter(b => !b.isMatched).map(bs => (
                      <div key={bs.id} className="p-3 bg-slate-50 rounded-xl border flex flex-col justify-between hover:border-slate-350 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold block w-fit mb-1">{bs.reference}</span>
                            <span className="font-bold text-xs text-slate-800">{bs.details}</span>
                            <span className="text-[10px] text-slate-400 block pt-0.5">Deposit Date: {bs.date}</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-600 text-xs text-right">KES {bs.amount.toLocaleString()}</span>
                        </div>

                        <div className="pt-2 border-t mt-2 flex flex-col gap-1 text-[10px]">
                          <span className="text-slate-500 font-semibold uppercase">Assign Deposit to Student Invoice:</span>
                          <div className="flex gap-1.5">
                            <select
                              id={`select-match-${bs.id}`}
                              className="bg-white border rounded p-1 text-[10px] flex-1 font-medium select-none"
                              defaultValue=""
                            >
                              <option value="">-- Match Student Invoice ID --</option>
                              {students.flatMap(stud => 
                                (stud.ledger || []).filter(inv => inv.status === 'unpaid').map(inv => (
                                  <option key={inv.id} value={`${stud.id}|${inv.id}`}>
                                    {stud.name} ({stud.admissionNo}) - {inv.invoiceNo} (KES {inv.amount.toLocaleString()})
                                  </option>
                                ))
                              )}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById(`select-match-${bs.id}`) as HTMLSelectElement;
                                if (!el || !el.value) {
                                  showWarning("Match Selection Required", 'Please specify student invoice matching target.');
                                  return;
                                }
                                const [sId, invId] = el.value.split('|');
                                handleMatchBankStatement(bs.id, sId, invId);
                              }}
                              className="bg-blue-650 hover:bg-blue-750 text-white font-extrabold px-3 py-1 rounded cursor-pointer transition-transform active:scale-95"
                            >
                              Match
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* RECONCILED BANKING STREAMS */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Audited Matching Ledger</span>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {bankStatements.filter(b => b.isMatched).length === 0 ? (
                    <div className="p-4 bg-white rounded-xl text-center border border-dashed">
                      <p className="text-xs text-slate-400 italic">No banking match history logged in current session.</p>
                    </div>
                  ) : (
                    bankStatements.filter(b => b.isMatched).map(bs => (
                      <div key={bs.id} className="p-2.5 bg-emerald-50/40 rounded-xl border border-emerald-150 flex justify-between items-center text-[11px]">
                        <div>
                          <span className="font-mono text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black block w-fit mb-0.5">{bs.reference}</span>
                          <span className="font-bold text-slate-800">{bs.details}</span>
                          <span className="text-[9px] text-slate-400 block">Matched successfully against institutional records!</span>
                        </div>
                        <span className="font-mono font-black text-slate-900 shrink-0">KES {bs.amount.toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {subTab === 'payroll' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm font-sans">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Lecturers Monthly Salary Payroll</h3>
              <p className="text-xs text-slate-400">Processes payroll with automatically calculated statutory NHIF, NSSF and direct PAYE taxation deductions.</p>
            </div>
            {!activePermissions.canProcessPayroll ? (
              <button
                type="button"
                disabled
                className="px-3.5 py-2 bg-slate-105 border border-slate-200 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed flex items-center gap-2"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Payroll Processing Locked</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  handleExportCSVFile('payroll');
                  logAudit('GENERATE_PAYROLL_REPORT', 'Exported comprehensive executive staff salary ledger');
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-2 transition-all shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Generate Payroll Report (CSV)</span>
              </button>
            )}
          </div>

          {/* Statutory Tax Configurations panel */}
          {!isAccountantView ? (
            <div className="bg-slate-50 border border-slate-250 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">NSSF Fixed Deduction (KES)</label>
                <input
                  type="number"
                  value={payrollConfig.nssf}
                  onChange={(e) => setPayrollConfig(prev => ({ ...prev, nssf: Number(e.target.value) }))}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold focus:border-slate-400 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">NHIF Fixed Deduction (KES)</label>
                <input
                  type="number"
                  value={payrollConfig.nhif}
                  onChange={(e) => setPayrollConfig(prev => ({ ...prev, nhif: Number(e.target.value) }))}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold focus:border-slate-400 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">PAYE Income Threshold (KES)</label>
                <input
                  type="number"
                  value={payrollConfig.payeThreshold}
                  onChange={(e) => setPayrollConfig(prev => ({ ...prev, payeThreshold: Number(e.target.value) }))}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold focus:border-slate-400 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">PAYE Tax Rate (%)</label>
                <input
                  type="number"
                  value={payrollConfig.payeRate}
                  onChange={(e) => setPayrollConfig(prev => ({ ...prev, payeRate: Number(e.target.value) }))}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold focus:border-slate-400 outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 flex flex-wrap gap-6 text-[11px] text-slate-650 font-sans">
              <span className="font-semibold flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-slate-400" /> Statutory Tax Configurations (Admin Locked):</span>
              <span>NSSF: <strong className="text-slate-900 font-mono">KES {payrollConfig.nssf.toLocaleString()}</strong></span>
              <span>NHIF: <strong className="text-slate-900 font-mono">KES {payrollConfig.nhif.toLocaleString()}</strong></span>
              <span>PAYE Threshold: <strong className="text-slate-900 font-mono">KES {payrollConfig.payeThreshold.toLocaleString()}</strong></span>
              <span>PAYE Rate: <strong className="text-slate-900 font-mono">{payrollConfig.payeRate}%</strong></span>
            </div>
          )}

          <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-xs overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs bg-white">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                  <th className="p-3.5">Lecturer Detail</th>
                  <th className="p-3.5">Time logged</th>
                  <th className="p-3.5">Base Rate</th>
                  <th className="p-3.5">Gross Pay</th>
                  <th className="p-3.5 text-center">NSSF Deduct</th>
                  <th className="p-3.5 text-center">NHIF Deduct</th>
                  <th className="p-3.5 text-center">PAYE Tax</th>
                  <th className="p-3.5 text-right">Net salary payout</th>
                  <th className="p-3.5 text-center">Documentation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-800 font-medium">
                {lecturers.map(lec => {
                  const grossPay = lec.loggedHours * lec.hourlyRate;
                  const nssf = payrollConfig.nssf;
                  const nhif = payrollConfig.nhif;
                  const taxable = Math.max(0, grossPay - nssf);
                  const paye = taxable > payrollConfig.payeThreshold ? Math.round(taxable * (payrollConfig.payeRate / 100)) : 0;
                  const totalDeductions = nssf + nhif + paye;
                  const netPay = Math.max(0, grossPay - totalDeductions);

                  return (
                    <tr key={lec.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-3.5 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                          {lec.name.substring(0,2)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{lec.name}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">{lec.designatorCode}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-650">{lec.loggedHours} Hours</td>
                      <td className="p-3.5 font-mono">KES {lec.hourlyRate.toLocaleString()}/hr</td>
                      <td className="p-3.5 font-bold font-mono">KES {grossPay.toLocaleString()}</td>
                      <td className="p-3.5 text-center font-mono text-slate-500">KES {nssf.toLocaleString()}</td>
                      <td className="p-3.5 text-center font-mono text-slate-500">KES {nhif.toLocaleString()}</td>
                      <td className="p-3.5 text-center font-mono text-rose-600 font-semibold">KES {paye.toLocaleString()}</td>
                      <td className="p-3.5 text-right font-black font-mono text-emerald-700 text-xs">KES {netPay.toLocaleString()}</td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setActivePayslipLecturer(lec);
                            logAudit('GENERATE_PAYSLIP', `Issued official digital payslip breakdown to ${lec.name}`);
                          }}
                          className="px-2.5 py-1 bg-slate-150 hover:bg-slate-250 text-slate-755 text-[10px] font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1 mx-auto"
                        >
                          <Receipt className="w-3 h-3 text-emerald-600" />
                          <span>View Slip</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm font-sans">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Corporate Compliance Digital Audit Logs</h3>
              <p className="text-xs text-slate-400 font-sans">Immutable cryptographic logs tracking accountant waiver adjustments, budget re-allocations, purchase orders, and payment matching.</p>
            </div>
            
            <button
              type="button"
              onClick={() => handleExportCSVFile('audit')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Download Compliance Trail (CSV)</span>
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Filter audits by Executive action, Officer, or Resource keyword..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="w-full bg-slate-50 border p-2 rounded-xl text-xs outline-none focus:border-slate-350"
            />
          </div>

          <div className="border border-slate-150 rounded-xl overflow-hidden divide-y text-xs">
            {audits.filter(a => {
              const term = auditSearch.toLowerCase();
              return a.action.toLowerCase().includes(term) ||
                     a.user.toLowerCase().includes(term) ||
                     a.resource.toLowerCase().includes(term);
            }).length === 0 ? (
              <div className="p-6 bg-slate-50 text-center italic text-slate-400">
                No matching financial audit events logged.
              </div>
            ) : (
              audits.filter(a => {
                const term = auditSearch.toLowerCase();
                return a.action.toLowerCase().includes(term) ||
                       a.user.toLowerCase().includes(term) ||
                       a.resource.toLowerCase().includes(term);
              }).map(a => {
                let badgeClass = 'text-emerald-700 bg-emerald-50 border border-emerald-150';
                if (a.status === 'Warning') badgeClass = 'text-amber-800 bg-amber-50 border border-amber-200';
                if (a.status === 'Error') badgeClass = 'text-rose-700 bg-rose-50 border border-rose-205';

                return (
                  <div key={a.id} className="p-3 bg-white hover:bg-slate-50/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[10px]">{a.action}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{a.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-650 pt-0.5 font-medium">Compliance Resource: <span className="text-slate-900 font-bold">{a.resource}</span></p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div>
                        <span className="font-bold text-slate-800 text-[10px] block text-right">{a.user}</span>
                        <span className="text-[9px] text-slate-400 block text-right font-mono font-semibold uppercase">{a.role} Audit</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeClass}`}>{a.status}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: INTERACTIVE DIGITAL LECTURERS PAYSLIP INTERACTIVE TEMPLATE */}
      <AnimatePresence>
        {activePayslipLecturer && (() => {
          const lec = activePayslipLecturer;
          const grossPay = lec.loggedHours * lec.hourlyRate;
          const nssf = payrollConfig.nssf;
          const nhif = payrollConfig.nhif;
          const taxable = Math.max(0, grossPay - nssf);
          const paye = taxable > payrollConfig.payeThreshold ? Math.round(taxable * (payrollConfig.payeRate / 100)) : 0;
          const totalDeductions = nssf + nhif + paye;
          const netPay = Math.max(0, grossPay - totalDeductions);

          return (
            <div className="fixed inset-0 bg-slate-950/75 z-55 flex items-center justify-center p-4 backdrop-blur-2xs" id="invoice-payslip-modal">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl max-w-lg w-full text-xs font-sans divide-y divide-slate-150 overflow-hidden shadow-2xl border"
              >
                {/* Header card */}
                <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
                  <div className="space-y-1">
                    <span className="text-[10px] bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full font-black tracking-widest uppercase">Verified Corporate Payroll</span>
                    <h4 className="text-base font-extrabold tracking-tight">Financial Outlay Payslip Statement</h4>
                    <p className="text-[10px] text-slate-400">June 2026 Fiscal Cycle • Institutional Registry</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePayslipLecturer(null)}
                    className="p-1 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Close Sheet
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-5 text-slate-800 font-medium">
                  
                  {/* METRIC ROW */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10.5px] text-slate-400 uppercase font-bold">Officer Profile</span>
                      <span className="font-bold text-slate-900 block text-xs pt-0.5">{lec.name}</span>
                      <span className="text-slate-500 font-mono">{lec.designatorCode} • {lec.email}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10.5px] text-slate-400 uppercase font-bold">Bank Details ledger</span>
                      <span className="font-bold text-slate-900 block text-xs pt-0.5">W&T Bank Corporate Account</span>
                      <span className="text-slate-500 font-mono text-[10.5px]">{lec.bankDetails || 'Direct bank transfer routing index'}</span>
                    </div>
                  </div>

                  {/* COMPUTED TABLE BULLETINS */}
                  <div className="border border-slate-150 rounded-xl overflow-hidden divide-y">
                    <div className="p-2.5 bg-slate-50 flex justify-between">
                      <span className="text-slate-500 uppercase font-bold">Earning Segment Breakdown</span>
                      <span className="text-slate-900 uppercase font-bold">Total Earnings Index</span>
                    </div>
                    <div className="p-2.5 flex justify-between">
                      <span>Base Wages (Hours Worked: <span className="font-bold">{lec.loggedHours} hrs</span> @ KES {lec.hourlyRate.toLocaleString()}/hr)</span>
                      <span className="font-mono font-bold text-slate-950">KES {grossPay.toLocaleString()}</span>
                    </div>

                    <div className="p-2.5 bg-slate-50 flex justify-between">
                      <span className="text-slate-500 uppercase font-bold">Statutory Compliance Tax debits</span>
                      <span className="text-slate-900 uppercase font-bold">Deduct Value</span>
                    </div>
                    <div className="p-2.5 flex justify-between text-slate-650">
                      <span>Social Security Mutual Fund (NSSF flat rate)</span>
                      <span className="font-mono">KES {nssf.toLocaleString()}</span>
                    </div>
                    <div className="p-2.5 flex justify-between text-slate-650">
                      <span>National Hospital Insurance (NHIF default tier)</span>
                      <span className="font-mono">KES {nhif.toLocaleString()}</span>
                    </div>
                    <div className="p-2.5 flex justify-between text-slate-650">
                      <span>PAYE State Withholding Tax ({payrollConfig.payeRate.toFixed(1)}% tier above KES {payrollConfig.payeThreshold.toLocaleString()})</span>
                      <span className="font-mono text-rose-600 font-semibold">KES {paye.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* BOTTOM RECONCILED PAYOUT */}
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-150 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-emerald-800 uppercase font-extrabold tracking-widest block">Net Disbursed Net Salary</span>
                      <p className="text-[10px] text-slate-400">Matched successfully against bank routing parameters.</p>
                    </div>
                    <span className="font-mono font-black text-emerald-950 text-base">KES {netPay.toLocaleString()}</span>
                  </div>

                  <div className="pt-2 text-[9.5px] text-slate-400 leading-relaxed italic text-center">
                    * This is a cryptographically signed secure payroll voucher issued online via AI Zenti SMS accounting engine.
                  </div>

                </div>

                {/* PRINT EXPORT TAB */}
                <div className="p-4 bg-slate-50 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { window.print(); }}
                    className="px-4 py-2 bg-slate-900 text-white font-extrabold rounded-xl hover:bg-slate-800 transition-all cursor-pointer shadow-3xs"
                  >
                    Print Statement PDF
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
