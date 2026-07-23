import { Lecturer, PayrollRecord, BankingInfo } from '../../types';

export const DEPARTMENTS = [
  { id: 'dept-1', code: 'CS', name: 'Department of Computer Science & Software Engineering' },
  { id: 'dept-2', code: 'IT', name: 'Department of Information Technology & Cyber Security' },
  { id: 'dept-3', code: 'DS', name: 'Department of Data Science & Artificial Intelligence' },
  { id: 'dept-4', code: 'BIS', name: 'Department of Business Information Systems' },
  { id: 'dept-5', code: 'EEE', name: 'Department of Electrical & Electronic Engineering' }
];

export const ACADEMIC_RANKS = [
  { id: 'rank-1', code: 'tutorial_fellow', title: 'Tutorial Fellow', defaultRate: 1200 },
  { id: 'rank-2', code: 'assistant_lecturer', title: 'Assistant Lecturer', defaultRate: 1600 },
  { id: 'rank-3', code: 'lecturer', title: 'Lecturer', defaultRate: 2000 },
  { id: 'rank-4', code: 'senior_lecturer', title: 'Senior Lecturer', defaultRate: 2500 },
  { id: 'rank-5', code: 'associate_professor', title: 'Associate Professor', defaultRate: 3200 },
  { id: 'rank-6', code: 'professor', title: 'Professor', defaultRate: 4000 }
];

export const EMPLOYMENT_TYPES: Lecturer['employmentType'][] = [
  'Permanent',
  'Contract',
  'Part-Time',
  'Adjunct',
  'Visiting Lecturer',
  'Temporary'
];

export const EMPLOYMENT_STATUSES: Lecturer['employmentStatus'][] = [
  'Active',
  'Suspended',
  'On Leave',
  'Retired',
  'Resigned'
];

export const SYSTEM_ROLES = [
  'Lecturer',
  'Head of Department',
  'Dean',
  'Accountant',
  'Librarian',
  'Registrar',
  'HR Officer',
  'Principal',
  'System Administrator'
];

export const KENYA_BANKS = [
  { code: 'EQTY', name: 'Equity Bank Kenya', swift: 'EQBLKENA' },
  { code: 'KCB', name: 'KCB Bank Kenya', swift: 'KCBLKENA' },
  { code: 'COOP', name: 'Co-operative Bank of Kenya', swift: 'COOPKENA' },
  { code: 'NCBA', name: 'NCBA Bank Kenya', swift: 'CBAFKENN' },
  { code: 'ABSA', name: 'Absa Bank Kenya', swift: 'BARCKENA' },
  { code: 'STAN', name: 'Stanbic Bank Kenya', swift: 'SBICKENA' },
  { code: 'SCB', name: 'Standard Chartered Bank', swift: 'SCBLKENX' },
  { code: 'DTB', name: 'Diamond Trust Bank Kenya', swift: 'DTKENNA' },
  { code: 'IMB', name: 'I&M Bank Kenya', swift: 'IMBLKENA' },
  { code: 'FAM', name: 'Family Bank Kenya', swift: 'FABLKENA' }
];

export const PAYROLL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const PAYROLL_YEARS = [2026, 2025, 2024];

/**
 * Gets default hourly rate based on Academic Rank
 */
export function getDefaultHourlyRate(rankTitle: string): number {
  const match = ACADEMIC_RANKS.find(
    r => r.title.toLowerCase() === rankTitle?.toLowerCase() || r.code === rankTitle
  );
  return match ? match.defaultRate : 2000;
}

/**
 * Auto-generates unique staff number e.g., STF-2026-001
 */
export function generateStaffNumber(existingCount: number = 0): string {
  const nextNum = (existingCount + 1).toString().padStart(3, '0');
  return `STF-2026-${nextNum}`;
}

/**
 * Calculates statutory Kenyan payroll taxes & deductions (2026 standards)
 * - NSSF: Tier I (420) + Tier II (1740) = 2,160 max (or 6% of gross)
 * - SHIF: 2.75% of Gross Salary
 * - PAYE: Kenyan Monthly Tax Brackets
 *   - First 24,000 @ 10%
 *   - Next 8,333 @ 25%
 *   - Next 467,667 @ 30%
 *   - Next 300,000 @ 32.5%
 *   - Above 800,000 @ 35%
 *   - Less Personal Relief KES 2,400/month
 */
export function calculatePayroll(lecturer: Lecturer, month: string = 'June', year: number = 2026): PayrollRecord {
  const hours = Number(lecturer.loggedHours) || 0;
  const rate = Number(lecturer.hourlyRate) || getDefaultHourlyRate(lecturer.academicRank);
  const overtimeHrs = Number(lecturer.overtimeHours) || 0;

  const basePay = Math.round(hours * rate);
  const overtimePay = Math.round(overtimeHrs * (rate * 1.5));

  // Statutory & Institutional Allowances based on rank and roles
  let houseAllowance = 15000;
  let transportAllowance = 8000;
  let responsibilityAllowance = 0;

  const roles = lecturer.roles || [];
  if (roles.includes('Head of Department') || roles.includes('Dean') || roles.includes('Principal')) {
    responsibilityAllowance = 25000;
  }

  const rank = lecturer.academicRank || 'Lecturer';
  if (rank === 'Professor' || rank === 'Associate Professor') {
    houseAllowance = 35000;
    transportAllowance = 15000;
  } else if (rank === 'Senior Lecturer') {
    houseAllowance = 25000;
    transportAllowance = 10000;
  } else if (rank === 'Tutorial Fellow') {
    houseAllowance = 10000;
    transportAllowance = 5000;
  }

  const grossPay = basePay + overtimePay + houseAllowance + transportAllowance + responsibilityAllowance;

  // NSSF Calculation (6% up to KES 2,160 max)
  const nssfDeduction = Math.min(2160, Math.round(grossPay * 0.06));

  // SHIF Calculation (2.75% of Gross)
  const shifDeduction = Math.round(grossPay * 0.0275);

  // Taxable Pay for PAYE (Gross minus allowable pension NSSF)
  const taxablePay = Math.max(0, grossPay - nssfDeduction);

  // KRA Monthly PAYE Tax Bracket Computation
  let grossPAYE = 0;
  let remainingTaxable = taxablePay;

  // Band 1: First 24,000 @ 10%
  const band1 = Math.min(remainingTaxable, 24000);
  grossPAYE += band1 * 0.10;
  remainingTaxable -= band1;

  // Band 2: Next 8,333 @ 25%
  if (remainingTaxable > 0) {
    const band2 = Math.min(remainingTaxable, 8333);
    grossPAYE += band2 * 0.25;
    remainingTaxable -= band2;
  }

  // Band 3: Next 467,667 @ 30%
  if (remainingTaxable > 0) {
    const band3 = Math.min(remainingTaxable, 467667);
    grossPAYE += band3 * 0.30;
    remainingTaxable -= band3;
  }

  // Band 4: Next 300,000 @ 32.5%
  if (remainingTaxable > 0) {
    const band4 = Math.min(remainingTaxable, 300000);
    grossPAYE += band4 * 0.325;
    remainingTaxable -= band4;
  }

  // Band 5: Above 800,000 @ 35%
  if (remainingTaxable > 0) {
    grossPAYE += remainingTaxable * 0.35;
  }

  // Less Monthly Personal Relief (KES 2,400)
  const personalRelief = 2400;
  const payeTax = Math.max(0, Math.round(grossPAYE - personalRelief));

  const otherDeductions = 0;
  const totalDeductions = payeTax + shifDeduction + nssfDeduction + otherDeductions;
  const netSalary = Math.max(0, grossPay - totalDeductions);

  return {
    id: `pay-${lecturer.id}-${month}-${year}`,
    periodId: `period-${month.toLowerCase()}-${year}`,
    lecturerId: lecturer.id,
    staffNumber: lecturer.staffNumber || lecturer.designatorCode || `STF-2026-000`,
    name: lecturer.name,
    department: lecturer.department || 'General Faculty',
    academicRank: lecturer.academicRank || 'Lecturer',
    month,
    year,
    hoursWorked: hours,
    hourlyRate: rate,
    overtimeHours: overtimeHrs,
    basePay,
    overtimePay,
    houseAllowance,
    transportAllowance,
    responsibilityAllowance,
    otherAllowances: 0,
    grossPay,
    payeTax,
    shifDeduction,
    nssfDeduction,
    otherDeductions,
    totalDeductions,
    netSalary,
    payrollStatus: 'Approved',
    paymentStatus: 'Pending',
  };
}
