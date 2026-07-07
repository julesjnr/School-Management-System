import React, { useState, useEffect } from 'react';
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

export default function FinanceSuite({
  students,
  lecturers,
  expenses,
  onAddExpense,
  onUpdateStudent,
  onReconcilePayment,
  isAccountantView = true,
  currentUserId = ''
}: FinanceSuiteProps) {
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
    return saved ? JSON.parse(saved) : [
      { id: 'v-1', voucherNo: 'VOU-101', type: 'Debit', category: 'Utility Bills', description: 'Settled internet fiber bill for Computing Block', amount: 35000, date: '2026-06-10', approvedBy: 'Grace Wanjiku (Accountant)' },
      { id: 'v-2', voucherNo: 'VOU-102', type: 'Credit', category: 'General Administration', description: 'Interest accumulated on fixed asset capital fund', amount: 8400, date: '2026-06-12', approvedBy: 'Grace Wanjiku (Accountant)' },
      { id: 'v-3', voucherNo: 'VOU-103', type: 'Contra', category: 'General Administration', description: 'Transferred petty cash to main bank ledger', amount: 20000, date: '2026-06-15', approvedBy: 'Grace Wanjiku (Accountant)' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('zenti_vouchers', JSON.stringify(vouchers));
  }, [vouchers]);

  // Imprests
  const [imprests, setImprests] = useState<Imprest[]>(() => {
    const saved = localStorage.getItem('zenti_imprests');
    return saved ? JSON.parse(saved) : [
      { id: 'imp-1', staffName: 'Dr. Jane Mugo', amount: 5000, purpose: 'Lab Chemical Supplies emergency procurement', status: 'approved', date: '2026-06-14' },
      { id: 'imp-2', staffName: 'Prof. Nelson', amount: 15000, purpose: 'Travel allowance for national academic symposium', status: 'pending', date: '2026-06-16' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('zenti_imprests', JSON.stringify(imprests));
  }, [imprests]);

  // Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
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

  // Bank statements for manual/automatic bank reconciliations
  const [bankStatements, setBankStatements] = useState<BankStatement[]>(() => {
    const saved = localStorage.getItem('zenti_bank_statements');
    return saved ? JSON.parse(saved) : [
      { id: 'bs-1', date: '2026-06-14', reference: 'MPESA-TX901-CS', details: 'FEE DEP BY ST-1002', amount: 45000, isMatched: false },
      { id: 'bs-2', date: '2026-06-15', reference: 'BANK-TRF-66723', details: 'FEE PAY BY ST-1001', amount: 20000, isMatched: false },
      { id: 'bs-3', date: '2026-06-16', reference: 'MPESA-TX982-ED', details: 'FEE RECON BY ST-1003', amount: 15400, isMatched: false },
      { id: 'bs-4', date: '2026-06-17', reference: 'BANK-DEP-77341', details: 'SCHOLARSHIP CO-FUND DEPOSIT', amount: 120000, isMatched: false }
    ];
  });

  useEffect(() => {
    localStorage.setItem('zenti_bank_statements', JSON.stringify(bankStatements));
  }, [bankStatements]);

  // Audit Trails
  const [audits, setAudits] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('zenti_audit_trails');
    return saved ? JSON.parse(saved) : [
      { id: 'aud-1', timestamp: '2026-06-17 08:30:12', user: 'Grace Wanjiku', role: 'Accountant', action: 'RUN_RECONCILIATION', resource: 'Matched student statement records', status: 'Success' },
      { id: 'aud-2', timestamp: '2026-06-17 09:15:33', user: 'Grace Wanjiku', role: 'Accountant', action: 'ALLOCATE_BUDGET', resource: 'Increased Academic Affairs budget ceiling limit', status: 'Success' },
      { id: 'aud-3', timestamp: '2026-06-17 10:02:44', user: 'System Engine', role: 'Security', action: 'PORTAL_PRIVILEGE_UPGRADE', resource: 'Granted Accountant role to ACC-404 Wanjiku', status: 'Success' }
    ];
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

  // --- FORM STATES ---
  // Student Billing Cockpit
  const [billingStudentId, setBillingStudentId] = useState(students[0]?.id || '');
  const [billingVoteHead, setBillingVoteHead] = useState<'Tuition' | 'Boarding' | 'Transport' | 'Lab Fee'>('Tuition');
  const [billingAmount, setBillingAmount] = useState('');
  const [billingDescription, setBillingDescription] = useState('');

  // Discount/Waiver Application
  const [waiverStudentId, setWaiverStudentId] = useState(students[0]?.id || '');
  const [waiverType, setWaiverType] = useState<'Scholarship' | 'Sibling Discount' | 'Bursary'>('Bursary');
  const [waiverAmount, setWaiverAmount] = useState('');
  const [waiverDescription, setWaiverDescription] = useState('Bursary Award');

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
  const handleGenerateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingStudentId || !billingAmount || isNaN(Number(billingAmount))) {
      alert('Please select a student and input a valid bill amount.');
      return;
    }
    const student = students.find(s => s.id === billingStudentId);
    if (!student) return;

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNo: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      description: `[${billingVoteHead}] ${billingDescription || 'Semester Tuition and Accommodation Fees'}`,
      amount: Number(billingAmount),
      date: new Date().toISOString().substring(0, 10),
      status: 'unpaid'
    };

    const updatedLedger = [...(student.ledger || []), newInvoice];
    onUpdateStudent?.(student.id, { ledger: updatedLedger });

    logAudit('CREATE_INVOICE', `Billed KES ${newInvoice.amount.toLocaleString()} to ${student.name} (${newInvoice.invoiceNo})`);
    
    setBillingAmount('');
    setBillingDescription('');
    alert(`Success: Assigned invoice ${newInvoice.invoiceNo} representing ${billingVoteHead} of KES ${Number(billingAmount).toLocaleString()} into student ledger.`);
  };

  // Record Waivers, Discounts, Bursaries
  const handleApplyWaiver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waiverStudentId || !waiverAmount || isNaN(Number(waiverAmount))) {
      alert('Must select student and specify a correct discount credit.');
      return;
    }
    const student = students.find(s => s.id === waiverStudentId);
    if (!student) return;

    const discountValue = Number(waiverAmount);
    
    // To record scholarship or bursary directly, we make a ledger entry representing a negative amount
    // or credit towards their outstanding balance.
    const waiverInvoice: Invoice = {
      id: `waiver-${Date.now()}`,
      invoiceNo: `CRD-${Math.floor(1000 + Math.random() * 9000)}`,
      description: `[${waiverType} Approved] ${waiverDescription || 'Bursary Aid allocation'}`,
      amount: -discountValue, // negative to credit the ledger!
      date: new Date().toISOString().substring(0, 10),
      status: 'paid'
    };

    const updatedLedger = [...(student.ledger || []), waiverInvoice];
    onUpdateStudent?.(student.id, { ledger: updatedLedger });

    logAudit('WAIVER_GRANTED', `Approved KES ${discountValue.toLocaleString()} ${waiverType} for student ${student.name}`);
    
    setWaiverAmount('');
    setWaiverDescription('');
    alert(`Account Ledger Credited: Successfully issued KES ${discountValue.toLocaleString()} in credit aid for ${student.name}.`);
  };

  // Add Operational Expense
  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(expenseAmount);
    if (!expenseDesc || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Ensure Description and operational cost are properly logged.');
      return;
    }

    const targetDept = getDeptForCategory(expenseCategory);
    const currentSpent = departmentTotals[targetDept] || 0;
    const currentCeiling = budgets[targetDept] || 0;

    if (currentSpent + parsedAmount > currentCeiling) {
      const confirmSpend = window.confirm(`WARNING: Adding this expense of KES ${parsedAmount.toLocaleString()} will OVERFLOW the ${targetDept} approved budget limit of KES ${currentCeiling.toLocaleString()}.\n\nDo you want to authorize this bypass?`);
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
    alert('Operational College Expense logged and allocated successfully.');
  };

  // Submit Multi-Entry Journal Voucher
  const handleAddVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vouDesc || !vouAmount || isNaN(Number(vouAmount))) {
      alert('Please fill out descriptions and voucher costs accurately.');
      return;
    }
    const val = Number(vouAmount);
    const newVou: Voucher = {
      id: `v-${Date.now()}`,
      voucherNo: `VOU-${Math.floor(100 + Math.random() * 900)}`,
      type: vouType,
      category: vouCategory,
      description: vouDesc,
      amount: val,
      date: vouDate,
      approvedBy: 'Grace Wanjiku (Accountant)'
    };

    setVouchers(prev => [newVou, ...prev]);

    // If it is operational debit, we also log it directly as a system expense under corporate outlays
    if (vouType === 'Debit') {
      onAddExpense({
        description: `[Voucher ${newVou.voucherNo}] ${vouDesc} (Payee: ${vouPayee || 'Internal'})`,
        category: vouCategory,
        amount: val,
        date: vouDate
      });
    }

    logAudit('CREATE_VOUCHER', `Created ${vouType} Voucher ${newVou.voucherNo} for KES ${val.toLocaleString()} (${catLabel(vouCategory)})`);
    setVouDesc('');
    setVouAmount('');
    setVouPayee('');
    alert(`Success: Multi-entry Journal Voucher ${newVou.voucherNo} finalized and cross-balanced.`);
  };

  const catLabel = (c: string) => c;

  // Imprest Petty Cash Workflow
  const handleRequestImprest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!impStaff || !impAmount || isNaN(Number(impAmount))) {
      alert('Provide Staff identifier and valid petty amount.');
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
    alert('Petty cash dispatch proposal logged.');
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
    alert(`Registered supplier ${newSup.companyName} successfully.`);
  };

  const handleRaisePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplierId || !poItem || !poAmt || isNaN(Number(poAmt))) {
      alert('Select direct partner supplier and correct balance value.');
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
    alert(`Successfully registered Purchase order ${newPO.poNo} and credited supplier ledger.`);
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
            const paymentVoucher: Voucher = {
              id: `v-${Date.now()}`,
              voucherNo: journalNo,
              type: 'Debit',
              category: 'Utility Bills',
              description: `[Supplier PO Settlement] Paid KES ${po.amount.toLocaleString()} to ${sup.companyName} for invoice matching ${po.poNo}`,
              amount: po.amount,
              date: new Date().toISOString().substring(0, 10),
              approvedBy: 'Grace Wanjiku (Accountant)'
            };
            setVouchers(v => [paymentVoucher, ...v]);
            onAddExpense({
              description: `[PO Payee ${po.poNo}] Cleared Apex/Labs supplier contract`,
              category: 'Utility Bills',
              amount: po.amount,
              date: new Date().toISOString().substring(0, 10)
            });

            logAudit('SETTLE_SUPPLIER_ACCOUNT', `Issued cash ledger payout KES ${po.amount.toLocaleString()} matching PO ${po.poNo}`, 'Success');
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
      alert('Provide authorized ceiling numerical value.');
      return;
    }
    const val = Number(editBudgetLimit);
    setBudgets(prev => ({
      ...prev,
      [editBudgetDept]: val
    }));
    logAudit('REALLOCATE_BUDGET', `Adjusted ${editBudgetDept} budget ceiling to KES ${val.toLocaleString()}`);
    setEditBudgetLimit('');
    alert(`Successfully configured direct budget ceiling guidelines.`);
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
    alert(`Successfully matched bank deposit! Student ${student.name}'s invoice marked PAID and payment record logged.`);
  };

  // Run automated bulk reconciliation matching
  const handleRunAutoReconciliation = () => {
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
      alert('Double matching executed. No new automatic statement patterns matched exact financial values.');
      return;
    }

    setBankStatements(updatedStatements);
    logAudit('RUN_AUTO_RECON', `Bulk matched ${matchCount} payments against live bank statement streams automatically.`, 'Success');
    alert(`Auto-Reconciliation complete. Successfully linked and matched ${matchCount} outstanding financial deposits.`);
  };

  // --- CSV EXPORT CAPABILITY ---
  const handleExportCSVFile = (type: 'vouchers' | 'payroll' | 'audit' | 'suppliers') => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let nameFilter = '';

    if (type === 'vouchers') {
      headers = ['Voucher No', 'Type', 'Category', 'Description', 'Amount (KES)', 'Date', 'Authorized By'];
      rows = vouchers.map(v => [v.voucherNo, v.type, v.category, v.description, String(v.amount), v.date, v.approvedBy]);
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
        const nssf = 1080; 
        const nhif = 1700;
        const taxable = Math.max(0, gross - nssf);
        const paye = taxable > 24000 ? Math.round(taxable * 0.3) : 0;
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
      <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-wrap gap-2 justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            💰
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">Financial & Accounts Headquarters</h2>
            <p className="text-[10px] text-slate-400">Institutional Revenue Ledger, Double-Entry Vouchers, Statutory Payroll, and Compliance Auditing</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => setSubTab('revenue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${subTab === 'revenue' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'}`}
          >
            Fees & Revenue
          </button>
          <button
            type="button"
            onClick={() => setSubTab('vouchers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${subTab === 'vouchers' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'}`}
          >
            Vouchers & Petty Cash
          </button>
          <button
            type="button"
            onClick={() => setSubTab('budgets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${subTab === 'budgets' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'}`}
          >
            Ceilings & Reconciled Bank
          </button>
          <button
            type="button"
            onClick={() => setSubTab('payroll')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${subTab === 'payroll' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'}`}
          >
            Payroll Compliance
          </button>
          <button
            type="button"
            onClick={() => setSubTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${subTab === 'audit' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'}`}
          >
            Audit Trail
          </button>
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
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* COLUMN 1: STUDENT INVOICING / BILLING */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Generate Student Bill</h3>
                <p className="text-[10px] text-slate-400">Debit personalized vote-heads on student accounts.</p>
              </div>
            </div>

            <form onSubmit={handleGenerateInvoice} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Target College Student</label>
                <select
                  value={billingStudentId}
                  onChange={(e) => setBillingStudentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-medium focus:border-slate-400"
                >
                  <option value="">-- Choose Student Recipient --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.admissionNo}) - Outstanding Debt
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Vote-Head Allocation</label>
                  <select
                    value={billingVoteHead}
                    onChange={(e) => setBillingVoteHead(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-medium text-xs focus:border-slate-400"
                  >
                    <option value="Tuition">Tuition Fees</option>
                    <option value="Boarding">Boarding / Hostels</option>
                    <option value="Transport">Transport Levy</option>
                    <option value="Lab Fee">Lab & Research Levy</option>
                  </select>
                </div>

                <div className="space-y-1 border border-transparent">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Billing Amount (KES)</label>
                  <input
                    type="number"
                    placeholder="e.g. 45000"
                    value={billingAmount}
                    onChange={(e) => setBillingAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none text-slate-900 font-bold focus:border-slate-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Billing Invoice Description</label>
                <textarea
                  placeholder="Details for invoice reporting..."
                  value={billingDescription}
                  onChange={(e) => setBillingDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none min-h-[60px] focus:border-slate-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Debit Student Ledger Account</span>
              </button>
            </form>
          </div>

          {/* COLUMN 2: DISCOUNTS & WAIVERS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Award className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Scholarships & Discounts</h3>
                <p className="text-[10px] text-slate-400">Award bursaries, grants and adjusted school waivers.</p>
              </div>
            </div>

            <form onSubmit={handleApplyWaiver} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Select Target Student Portfolio</label>
                <select
                  value={waiverStudentId}
                  onChange={(e) => setWaiverStudentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-medium focus:border-slate-400"
                >
                  <option value="">-- Choose Student Portfolio --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.cohort})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Discount Typology</label>
                  <select
                    value={waiverType}
                    onChange={(e) => setWaiverType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-medium focus:border-slate-400"
                  >
                    <option value="Bursary">CDF / Government Bursary</option>
                    <option value="Scholarship">Academic Merit Scholarship</option>
                    <option value="Sibling Discount">Family Sibling Discount</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Credit Value (KES)</label>
                  <input
                    type="number"
                    placeholder="e.g. 15000"
                    value={waiverAmount}
                    onChange={(e) => setWaiverAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none text-indigo-700 font-bold focus:border-slate-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Waiver Allocation Narrative</label>
                <textarea
                  placeholder="Record of approval/reason index..."
                  value={waiverDescription}
                  onChange={(e) => setWaiverDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none min-h-[60px] focus:border-slate-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Authorize Disbursal Grant</span>
              </button>
            </form>
          </div>

          {/* COLUMN 3: AUTOMATED PAYMENTS SYNC & LIVE STATS */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                Payments Stream Matching
              </h3>
              <p className="text-[10px] text-slate-400">Validate real-time student M-Pesa & Card matches.</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-150 space-y-3 text-xs shadow-3xs">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-500 font-semibold uppercase">Pending Portal Approvals</span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-black">
                  {unreconciledPayments.length} Items Open
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Reconciliation engine links physical bank statement references with student billing logs instantly.
              </p>
              <button
                type="button"
                onClick={activePermissions.canReconcile ? handleRunAutoReconciliation : () => alert("Permission Denied: Your accountant role does not have authorization to reconcile payments.")}
                disabled={!activePermissions.canReconcile}
                className={`w-full font-bold py-2 rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-transform ${
                  activePermissions.canReconcile 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95' 
                    : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {activePermissions.canReconcile ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{activePermissions.canReconcile ? 'Run Broad Matching Sync' : 'Reconciliation Locked'}</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Unresolved Student Audits</span>
              
              {unreconciledPayments.length === 0 ? (
                <div className="p-4 bg-white rounded-lg text-center border">
                  <p className="text-xs text-slate-400 italic">No unreconciled student ledger audits flagged.</p>
                </div>
              ) : (
                unreconciledPayments.map(p => {
                  const s = students.find(stud => stud.id === p.studentId);
                  return (
                    <div key={p.id} className="p-2.5 bg-white rounded-lg border border-slate-150 flex justify-between items-center text-[11px] hover:border-slate-350 transition-colors">
                      <div className="space-y-0.5">
                        <span className="font-bold block text-slate-900">{s?.name || 'Student Profile'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Ref: {p.transactionId} • {p.paymentMethod}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold block text-slate-800">KES {p.amount.toLocaleString()}</span>
                        {!activePermissions.canReconcile ? (
                          <span className="text-[9px] font-black bg-slate-100 text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded cursor-not-allowed inline-flex items-center gap-1" title="Locked by Administrator Permissions">
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { onReconcilePayment(p.id); logAudit('RECONCILE_PAYMENT', `Manually reconciled matching payload for ${s?.name || 'unknown'}`); }}
                            className="text-[10px] bg-amber-100 hover:bg-amber-150 text-amber-900 font-extrabold px-1.5 py-0.5 rounded cursor-pointer"
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
                className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg cursor-pointer"
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
                            className="bg-sky-600 hover:bg-sky-700 text-white text-[9px] p-1 rounded font-bold cursor-pointer"
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
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 rounded text-[10px] cursor-pointer"
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
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg cursor-pointer transition-colors"
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
                                  alert('Please specify student invoice matching target.');
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

          <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-xs">
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
                  const nssf = 1080;
                  const nhif = 1700;
                  const taxable = Math.max(0, grossPay - nssf);
                  const paye = taxable > 24000 ? Math.round(taxable * 0.3) : 0;
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
          const nssf = 1080;
          const nhif = 1700;
          const taxable = Math.max(0, grossPay - nssf);
          const paye = taxable > 24000 ? Math.round(taxable * 0.3) : 0;
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
                      <span>PAYE State Withholding Tax (30.0% fixed tier above KES 24,000)</span>
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
