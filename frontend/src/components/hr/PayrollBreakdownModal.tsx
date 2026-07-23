import React from 'react';
import { X, DollarSign, User, Building, Award, Landmark, CheckCircle2, Printer, Download } from 'lucide-react';
import { Lecturer, PayrollRecord } from '../../types';
import { calculatePayroll } from './hrData';

interface PayrollBreakdownModalProps {
  lecturer: Lecturer;
  month?: string;
  year?: number;
  onClose: () => void;
  onDisburse?: (recordId: string) => void;
}

export const PayrollBreakdownModal: React.FC<PayrollBreakdownModalProps> = ({
  lecturer,
  month = 'June',
  year = 2026,
  onClose,
  onDisburse
}) => {
  const pay = calculatePayroll(lecturer, month, year);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden my-8 flex flex-col">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Institutional Payroll Breakdown Voucher</h2>
              <p className="text-xs text-slate-400 font-mono">PERIOD: {month.toUpperCase()} {year} • VERIFIED STPAUL ERP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          
          {/* STAFF IDENTITY SUMMARY */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Staff Number</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{pay.staffNumber}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Lecturer Name</span>
              <span className="font-bold text-slate-900 dark:text-white">{pay.name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Department</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">{pay.department}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Academic Rank</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{pay.academicRank}</span>
            </div>
          </div>

          {/* PAYROLL COMPUTATION LEDGER TABLE */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider">Itemized Earnings & Allowances</h3>
            
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-100 dark:bg-slate-800/60 p-3 font-bold text-slate-700 dark:text-slate-300 flex justify-between border-b border-slate-200 dark:border-slate-800">
                <span>Description</span>
                <span className="font-mono">Amount (KES)</span>
              </div>
              <div className="p-3 space-y-2 font-mono">
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Logged Base Hours ({pay.hoursWorked} hrs @ KES {pay.hourlyRate}/hr)</span>
                  <span>KES {pay.basePay.toLocaleString()}</span>
                </div>
                {pay.overtimePay > 0 && (
                  <div className="flex justify-between text-slate-700 dark:text-slate-300">
                    <span>Overtime Hours ({pay.overtimeHours} hrs @ KES {Math.round(pay.hourlyRate * 1.5)}/hr)</span>
                    <span>KES {pay.overtimePay.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>House Allowance</span>
                  <span>+ KES {pay.houseAllowance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Commuter & Transport Allowance</span>
                  <span>+ KES {pay.transportAllowance.toLocaleString()}</span>
                </div>
                {pay.responsibilityAllowance > 0 && (
                  <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-semibold">
                    <span>Administrative Responsibility Allowance</span>
                    <span>+ KES {pay.responsibilityAllowance.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white text-sm">
                  <span>TOTAL GROSS SALARY</span>
                  <span className="text-blue-600 dark:text-blue-400">KES {pay.grossPay.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider pt-2">Statutory Deductions & Taxes (Kenyan Law 2026)</h3>
            
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-100 dark:bg-slate-800/60 p-3 font-bold text-slate-700 dark:text-slate-300 flex justify-between border-b border-slate-200 dark:border-slate-800">
                <span>Statutory Item</span>
                <span className="font-mono">Deduction (KES)</span>
              </div>
              <div className="p-3 space-y-2 font-mono">
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>KRA PAYE Income Tax (Less KES 2,400 Relief)</span>
                  <span>- KES {pay.payeTax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>SHIF Social Health Insurance (2.75% Gross)</span>
                  <span>- KES {pay.shifDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>NSSF Pension (Tier I + Tier II Max KES 2,160)</span>
                  <span>- KES {pay.nssfDeduction.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-rose-600 dark:text-rose-400">
                  <span>TOTAL STATUTORY DEDUCTIONS</span>
                  <span>- KES {pay.totalDeductions.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* NET SALARY BOX */}
            <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700 dark:text-emerald-300 block">FINAL NET TAKE-HOME SALARY</span>
                <h2 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                  KES {pay.netSalary.toLocaleString()}
                </h2>
              </div>
              <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                <div>Bank: <strong className="text-slate-800 dark:text-slate-200">{lecturer.bankingInfo?.bankName || 'Equity Bank'}</strong></div>
                <div>Account: <strong className="font-mono text-slate-800 dark:text-slate-200">{lecturer.bankingInfo?.accountNumber || '01109283746500'}</strong></div>
              </div>
            </div>

          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Payslip
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => {
                if (onDisburse) onDisburse(pay.id);
                alert(`Successfully disbursed KES ${pay.netSalary.toLocaleString()} to ${pay.name}'s account (${lecturer.bankingInfo?.bankName || 'Equity Bank'})!`);
                onClose();
              }}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Disburse Net Settlement
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
