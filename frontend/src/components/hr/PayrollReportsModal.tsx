import React, { useState } from 'react';
import { 
  FileText, Download, Printer, X, CheckCircle2, Filter, Table, 
  Building, DollarSign, ShieldAlert, FileSpreadsheet, PieChart
} from 'lucide-react';
import { Lecturer, PayrollRecord } from '../../types';
import { calculatePayroll, DEPARTMENTS, PAYROLL_MONTHS, PAYROLL_YEARS } from './hrData';

interface PayrollReportsModalProps {
  lecturers: Lecturer[];
  onClose: () => void;
}

export const PayrollReportsModal: React.FC<PayrollReportsModalProps> = ({
  lecturers,
  onClose
}) => {
  const [selectedReport, setSelectedReport] = useState<
    'monthly' | 'dept' | 'tax' | 'allowance' | 'deduction' | 'annual'
  >('monthly');

  const [selectedMonth, setSelectedMonth] = useState('June');
  const [selectedYear, setSelectedYear] = useState(2026);

  // Compute payroll records for all lecturers for the selected period
  const payrollRecords: PayrollRecord[] = lecturers.map(l => 
    calculatePayroll(l, selectedMonth, selectedYear)
  );

  const totalGross = payrollRecords.reduce((acc, r) => acc + r.grossPay, 0);
  const totalPAYE = payrollRecords.reduce((acc, r) => acc + r.payeTax, 0);
  const totalSHIF = payrollRecords.reduce((acc, r) => acc + r.shifDeduction, 0);
  const totalNSSF = payrollRecords.reduce((acc, r) => acc + r.nssfDeduction, 0);
  const totalDeductions = payrollRecords.reduce((acc, r) => acc + r.totalDeductions, 0);
  const totalNet = payrollRecords.reduce((acc, r) => acc + r.netSalary, 0);

  // Department Summaries
  const deptSummaries = DEPARTMENTS.map(dept => {
    const records = payrollRecords.filter(r => r.department === dept.name);
    const count = records.length;
    const gross = records.reduce((acc, r) => acc + r.grossPay, 0);
    const tax = records.reduce((acc, r) => acc + r.payeTax, 0);
    const net = records.reduce((acc, r) => acc + r.netSalary, 0);
    return { deptName: dept.name, code: dept.code, count, gross, tax, net };
  });

  // Export CSV Helper
  const exportToCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (selectedReport === 'monthly') {
      headers = ['Staff No', 'Name', 'Department', 'Rank', 'Hours', 'Rate', 'Gross Pay (KES)', 'PAYE (KES)', 'SHIF (KES)', 'NSSF (KES)', 'Net Salary (KES)'];
      rows = payrollRecords.map(r => [
        r.staffNumber || '',
        r.name || '',
        r.department || '',
        r.academicRank || '',
        r.hoursWorked.toString(),
        r.hourlyRate.toString(),
        r.grossPay.toString(),
        r.payeTax.toString(),
        r.shifDeduction.toString(),
        r.nssfDeduction.toString(),
        r.netSalary.toString()
      ]);
    } else if (selectedReport === 'dept') {
      headers = ['Department Code', 'Department Name', 'Staff Count', 'Total Gross Pay (KES)', 'Total Tax (KES)', 'Total Net Salary (KES)'];
      rows = deptSummaries.map(d => [
        d.code,
        d.deptName,
        d.count.toString(),
        d.gross.toString(),
        d.tax.toString(),
        d.net.toString()
      ]);
    } else if (selectedReport === 'tax') {
      headers = ['Staff No', 'Name', 'KRA Taxable Pay (KES)', 'Monthly PAYE Tax (KES)', 'Personal Relief (KES)', 'Net Tax Payable (KES)'];
      rows = payrollRecords.map(r => [
        r.staffNumber || '',
        r.name || '',
        (r.grossPay - r.nssfDeduction).toString(),
        (r.payeTax + 2400).toString(),
        '2400',
        r.payeTax.toString()
      ]);
    } else {
      headers = ['Staff No', 'Name', 'Department', 'Gross Pay', 'Total Deductions', 'Net Salary'];
      rows = payrollRecords.map(r => [
        r.staffNumber || '',
        r.name || '',
        r.department || '',
        r.grossPay.toString(),
        r.totalDeductions.toString(),
        r.netSalary.toString()
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `zenti_payroll_report_${selectedReport}_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Excel Helper
  const exportToExcel = () => {
    let tsv = 'Staff Number\tName\tDepartment\tGross Pay\tPAYE\tSHIF\tNSSF\tNet Salary\n';
    payrollRecords.forEach(r => {
      tsv += `${r.staffNumber}\t${r.name}\t${r.department}\t${r.grossPay}\t${r.payeTax}\t${r.shifDeduction}\t${r.nssfDeduction}\t${r.netSalary}\n`;
    });
    const blob = new Blob([tsv], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `zenti_payroll_${selectedReport}_${selectedMonth}_${selectedYear}.xls`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-slate-900 text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Enterprise Payroll & Tax Reporting Suite</h2>
              <p className="text-xs text-slate-400">Export audited monthly payroll logs, statutory KRA P10, SHIF/NSSF schedules & P9 cards.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-1.5 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-900 text-white text-xs font-bold px-2.5 py-1 rounded-lg border-none focus:outline-none"
              >
                {PAYROLL_MONTHS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-900 text-white text-xs font-bold px-2.5 py-1 rounded-lg border-none focus:outline-none"
              >
                {PAYROLL_YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* REPORT TYPE SELECTOR TABS */}
        <div className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 py-2 overflow-x-auto flex gap-1 shrink-0">
          {[
            { id: 'monthly', label: 'Monthly Payroll Report', icon: Table },
            { id: 'dept', label: 'Department Summary', icon: Building },
            { id: 'tax', label: 'Tax Report (KRA P10)', icon: ShieldAlert },
            { id: 'allowance', label: 'Allowance Schedule', icon: DollarSign },
            { id: 'deduction', label: 'Deductions & SHIF/NSSF', icon: PieChart },
            { id: 'annual', label: 'Annual P9 Certificate', icon: FileSpreadsheet }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = selectedReport === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedReport(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200 dark:border-slate-800'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* REPORT PREVIEW CONTENT */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TOP METRIC CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Faculty Staff</span>
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">{payrollRecords.length} Staff</span>
            </div>
            <div className="bg-blue-50/60 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-900">
              <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">Total Gross Payroll</span>
              <span className="text-xl font-bold font-mono text-blue-700 dark:text-blue-300">KES {totalGross.toLocaleString()}</span>
            </div>
            <div className="bg-rose-50/60 dark:bg-rose-950/40 p-4 rounded-2xl border border-rose-200 dark:border-rose-900">
              <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Statutory Withholdings</span>
              <span className="text-xl font-bold font-mono text-rose-700 dark:text-rose-300">KES {totalDeductions.toLocaleString()}</span>
            </div>
            <div className="bg-emerald-50/60 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Total Net Disbursement</span>
              <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">KES {totalNet.toLocaleString()}</span>
            </div>
          </div>

          {/* REPORT PREVIEW TABLE */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-slate-900 text-white p-3 px-4 flex items-center justify-between text-xs font-mono">
              <span className="font-bold">
                REPORT PREVIEW: {selectedReport.toUpperCase()} ({selectedMonth.toUpperCase()} {selectedYear})
              </span>
              <span className="text-slate-400">INSTITUTIONAL AUDIT COPY</span>
            </div>

            <div className="overflow-x-auto max-h-[350px]">
              {selectedReport === 'monthly' && (
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="p-3">Staff No</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Academic Rank</th>
                      <th className="p-3">Gross Pay</th>
                      <th className="p-3">PAYE Tax</th>
                      <th className="p-3">SHIF</th>
                      <th className="p-3">NSSF</th>
                      <th className="p-3">Net Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {payrollRecords.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-blue-600 dark:text-blue-400">{r.staffNumber}</td>
                        <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">{r.name}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 font-sans">{r.department}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 font-sans">{r.academicRank}</td>
                        <td className="p-3 font-semibold">KES {r.grossPay.toLocaleString()}</td>
                        <td className="p-3 text-rose-600">KES {r.payeTax.toLocaleString()}</td>
                        <td className="p-3 text-rose-600">KES {r.shifDeduction.toLocaleString()}</td>
                        <td className="p-3 text-rose-600">KES {r.nssfDeduction.toLocaleString()}</td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">KES {r.netSalary.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {selectedReport === 'dept' && (
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="p-3">Dept Code</th>
                      <th className="p-3">Department Name</th>
                      <th className="p-3">Staff Count</th>
                      <th className="p-3">Total Gross Pay</th>
                      <th className="p-3">Total PAYE Tax</th>
                      <th className="p-3">Total Net Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {deptSummaries.map(d => (
                      <tr key={d.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-blue-600">{d.code}</td>
                        <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">{d.deptName}</td>
                        <td className="p-3 font-bold">{d.count} Staff</td>
                        <td className="p-3 font-semibold">KES {d.gross.toLocaleString()}</td>
                        <td className="p-3 text-rose-600">KES {d.tax.toLocaleString()}</td>
                        <td className="p-3 font-bold text-emerald-600">KES {d.net.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {selectedReport === 'tax' && (
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="p-3">Staff No</th>
                      <th className="p-3">Staff Name</th>
                      <th className="p-3">Taxable Salary</th>
                      <th className="p-3">Gross PAYE</th>
                      <th className="p-3">Personal Relief</th>
                      <th className="p-3">Net PAYE Remittance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {payrollRecords.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-blue-600">{r.staffNumber}</td>
                        <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">{r.name}</td>
                        <td className="p-3 font-semibold">KES {(r.grossPay - r.nssfDeduction).toLocaleString()}</td>
                        <td className="p-3 text-slate-600">KES {(r.payeTax + 2400).toLocaleString()}</td>
                        <td className="p-3 text-emerald-600 font-bold">KES 2,400</td>
                        <td className="p-3 font-bold text-rose-600">KES {r.payeTax.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {selectedReport === 'allowance' && (
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="p-3">Staff No</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">House Allowance</th>
                      <th className="p-3">Transport Allowance</th>
                      <th className="p-3">Responsibility Allowance</th>
                      <th className="p-3">Total Allowances</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {payrollRecords.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-blue-600">{r.staffNumber}</td>
                        <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">{r.name}</td>
                        <td className="p-3 text-slate-700">KES {r.houseAllowance.toLocaleString()}</td>
                        <td className="p-3 text-slate-700">KES {r.transportAllowance.toLocaleString()}</td>
                        <td className="p-3 text-slate-700">KES {r.responsibilityAllowance.toLocaleString()}</td>
                        <td className="p-3 font-bold text-blue-600">KES {(r.houseAllowance + r.transportAllowance + r.responsibilityAllowance).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {(selectedReport === 'deduction' || selectedReport === 'annual') && (
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="p-3">Staff No</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">PAYE Tax</th>
                      <th className="p-3">SHIF Contribution</th>
                      <th className="p-3">NSSF Contribution</th>
                      <th className="p-3">Total Statutory Deductions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {payrollRecords.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-blue-600">{r.staffNumber}</td>
                        <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">{r.name}</td>
                        <td className="p-3 text-rose-600">KES {r.payeTax.toLocaleString()}</td>
                        <td className="p-3 text-rose-600">KES {r.shifDeduction.toLocaleString()}</td>
                        <td className="p-3 text-rose-600">KES {r.nssfDeduction.toLocaleString()}</td>
                        <td className="p-3 font-bold text-rose-700">KES {r.totalDeductions.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* FOOTER ACTION BUTTONS */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Formal PDF Report
          </button>

          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>

            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Excel (.XLS)
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
