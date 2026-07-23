import React, { useState } from 'react';
import { 
  User, Mail, Phone, Shield, Building, Award, Briefcase, Calendar, 
  DollarSign, Landmark, BookOpen, Clock, FileText, CheckCircle, 
  X, AlertCircle, Award as Medal, ShieldCheck, Download, ExternalLink, RefreshCw
} from 'lucide-react';
import { Lecturer, PayrollRecord } from '../../types';
import { calculatePayroll } from './hrData';

interface LecturerProfileModalProps {
  lecturer: Lecturer;
  onClose: () => void;
  onEdit?: (lecturer: Lecturer) => void;
  allPayrollRecords?: PayrollRecord[];
}

export const LecturerProfileModal: React.FC<LecturerProfileModalProps> = ({
  lecturer,
  onClose,
  onEdit,
  allPayrollRecords = []
}) => {
  const [activeTab, setActiveTab] = useState<
    'personal' | 'employment' | 'subjects' | 'timetable' | 'payroll' | 
    'publications' | 'reviews' | 'documents' | 'leave'
  >('personal');

  // Filter or compute payroll records for this lecturer
  const lecturerPayrolls = allPayrollRecords.filter(p => p.lecturerId === lecturer.id);
  const currentPayroll = calculatePayroll(lecturer, 'June', 2026);

  // Mock performance reviews if empty
  const reviews = lecturer.performanceReviews || [
    {
      id: 'rev-1',
      reviewerName: 'Prof. Harrison Njuguna (Dean of Computing)',
      reviewDate: '2025-11-20',
      rating: 4.8,
      comments: 'Exemplary teaching performance in Software Architecture & Algorithms. High student evaluations.',
      goalsForNextPeriod: 'Publish 2 peer-reviewed journal papers and launch AI research lab.'
    }
  ];

  // Mock documents if empty
  const documents = lecturer.documents || [
    {
      id: 'doc-1',
      title: 'Signed Faculty Employment Contract 2024-2027',
      category: 'Contract',
      uploadDate: '2024-01-15',
      fileUrl: '#',
      fileSize: '1.8 MB'
    },
    {
      id: 'doc-2',
      title: 'National Identity Card (Verified)',
      category: 'Identification',
      uploadDate: '2024-01-10',
      fileUrl: '#',
      fileSize: '420 KB'
    },
    {
      id: 'doc-3',
      title: 'PhD Academic Certificate & Transcripts',
      category: 'Academic Certificate',
      uploadDate: '2024-01-12',
      fileUrl: '#',
      fileSize: '3.4 MB'
    },
    {
      id: 'doc-4',
      title: 'KRA PIN & Tax Compliance Certificate',
      category: 'Tax Document',
      uploadDate: '2024-01-14',
      fileUrl: '#',
      fileSize: '890 KB'
    }
  ];

  // Mock leave history if empty
  const leaveHistory = lecturer.leaveHistory || [
    {
      id: 'leave-1',
      leaveType: 'Annual Leave',
      startDate: '2025-12-15',
      endDate: '2026-01-05',
      daysCount: 14,
      status: 'Approved',
      reason: 'End of year academic break'
    },
    {
      id: 'leave-2',
      leaveType: 'Sick Leave',
      startDate: '2026-03-10',
      endDate: '2026-03-12',
      daysCount: 3,
      status: 'Approved',
      reason: 'Medical treatment'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        
        {/* HEADER BRANDING BANNER */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/30 border-2 border-blue-400/40 flex items-center justify-center text-white font-bold text-2xl overflow-hidden shrink-0 shadow-lg">
                {lecturer.avatar ? (
                  <img src={lecturer.avatar} alt={lecturer.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{lecturer.name.split(' ').map(n => n[0]).join('')}</span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black tracking-tight">{lecturer.name}</h2>
                  <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                    {lecturer.staffNumber || lecturer.designatorCode}
                  </span>
                </div>
                <p className="text-xs text-blue-200 mt-0.5">
                  {lecturer.academicRank} • {lecturer.department}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(lecturer.roles || ['Lecturer']).map(role => (
                    <span key={role} className="bg-white/15 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md border border-white/20">
                      {role}
                    </span>
                  ))}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    lecturer.employmentStatus === 'Active' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/30' : 'bg-amber-500/30 text-amber-300'
                  }`}>
                    {lecturer.employmentStatus || 'Active'}
                  </span>
                </div>
              </div>
            </div>

            {onEdit && (
              <button
                onClick={() => { onClose(); onEdit(lecturer); }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 self-start md:self-center cursor-pointer"
              >
                Edit Staff Profile
              </button>
            )}
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 py-2 overflow-x-auto flex gap-1 shrink-0">
          {[
            { id: 'personal', label: 'Personal Details', icon: User },
            { id: 'employment', label: 'Employment History', icon: Briefcase },
            { id: 'subjects', label: 'Assigned Subjects', icon: BookOpen },
            { id: 'timetable', label: 'Timetable & Office Hours', icon: Clock },
            { id: 'payroll', label: 'Payroll History', icon: DollarSign },
            { id: 'publications', label: 'Publications & Research', icon: FileText },
            { id: 'reviews', label: 'Performance Reviews', icon: ShieldCheck },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'leave', label: 'Leave History', icon: Calendar }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
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

        {/* TAB CONTENT BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* 1. PERSONAL INFORMATION */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Full Name</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{lecturer.name}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Institutional Email</span>
                  <p className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">{lecturer.email}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone Number</span>
                  <p className="text-sm font-mono font-semibold text-slate-900 dark:text-white">{lecturer.phone}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">National ID / Passport</span>
                  <p className="text-sm font-mono font-semibold text-slate-900 dark:text-white">{lecturer.nationalId || '33892014'}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Gender</span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{lecturer.gender || 'Male'}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Date of Birth</span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{lecturer.dob || '1988-05-14'}</p>
                </div>
              </div>

              {/* Bio & Banking summary */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-xs uppercase font-bold text-slate-500">Academic Biography</h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {lecturer.bio || `${lecturer.name} is a certified faculty member in the ${lecturer.department} specializing in advanced instruction, academic mentoring, and institutional research.`}
                </p>
              </div>

              <div className="bg-blue-50/60 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-200 dark:border-blue-900 space-y-3">
                <h4 className="text-xs uppercase font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" /> Normalized Settlement Banking Info
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Bank Name</span>
                    <span className="font-bold text-slate-900 dark:text-white">{lecturer.bankingInfo?.bankName || 'Equity Bank Kenya'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Branch</span>
                    <span className="font-bold text-slate-900 dark:text-white">{lecturer.bankingInfo?.branch || 'Nairobi Central'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Account Name</span>
                    <span className="font-bold text-slate-900 dark:text-white">{lecturer.bankingInfo?.accountName || lecturer.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Account Number</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{lecturer.bankingInfo?.accountNumber || '01109283746500'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">SWIFT Code</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{lecturer.bankingInfo?.swiftCode || 'EQBLKENA'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Mobile Money</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{lecturer.bankingInfo?.mobileMoney || lecturer.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. EMPLOYMENT HISTORY */}
          {activeTab === 'employment' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Staff Number</span>
                  <p className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">{lecturer.staffNumber || lecturer.designatorCode}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Department</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{lecturer.department}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Academic Rank</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{lecturer.academicRank}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Employment Type</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{lecturer.employmentType}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Employment Date</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{lecturer.employmentDate || '2024-01-15'}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Hourly Rate & Status</span>
                  <p className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    KES {lecturer.hourlyRate?.toLocaleString()}/hr {lecturer.isRateOverridden ? '(HR Overridden)' : '(Auto)'}
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-xs uppercase font-bold text-slate-500">Employment Timeline & Contract Milestones</h4>
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  <div className="relative pl-8 space-y-1">
                    <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900"></div>
                    <span className="text-[10px] font-mono text-slate-400">{lecturer.employmentDate || '2024-01-15'}</span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">Joined Zenti Faculty as {lecturer.academicRank}</h5>
                    <p className="text-[11px] text-slate-500">Initial appointment under {lecturer.department} with base rate KES {lecturer.hourlyRate}/hr.</p>
                  </div>
                  {lecturer.contractStartDate && (
                    <div className="relative pl-8 space-y-1">
                      <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900"></div>
                      <span className="text-[10px] font-mono text-slate-400">{lecturer.contractStartDate}</span>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">Contract Period Executed</h5>
                      <p className="text-[11px] text-slate-500">Contract valid until {lecturer.contractEndDate || '2027-01-15'}.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. ASSIGNED SUBJECTS */}
          {activeTab === 'subjects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase font-bold text-slate-500">Currently Allocated Academic Units</h4>
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-900">
                  Total Units: {(lecturer.subjects || []).length}
                </span>
              </div>

              {(lecturer.subjects || []).length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                  <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No subjects currently assigned</p>
                  <p className="text-[11px] text-slate-400 mt-1">Assign course units via Academics Allocation tab in Admin Dashboard.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(lecturer.subjects || []).map(code => (
                    <div key={code} className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 block">{code}</span>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">Instruction Unit</h5>
                        <p className="text-[10px] text-slate-400">Semester 1 & 2 Core Curriculum</p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-[10px] font-bold px-2 py-1 rounded-lg">
                        Active Teaching
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. TIMETABLE & OFFICE HOURS */}
          {activeTab === 'timetable' && (
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold text-slate-500">Student Consultation & Office Hours Slots</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {lecturer.officeHours && lecturer.officeHours.length > 0 ? (
                  lecturer.officeHours.map(slot => (
                    <div key={slot.id} className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">{slot.day}</span>
                        <span className="text-xs font-mono text-blue-600 dark:text-blue-400 block">{slot.time}</span>
                        {slot.studentName && (
                          <span className="text-[10px] text-slate-500 block">Booked by: {slot.studentName}</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                        slot.status === 'booked' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                      }`}>
                        {slot.status.toUpperCase()}
                      </span>
                    </div>
                  ))
                ) : (
                  [
                    { id: 'o1', day: 'Monday', time: '10:00 AM - 12:00 PM', status: 'available' },
                    { id: 'o2', day: 'Wednesday', time: '02:00 PM - 04:00 PM', status: 'available' },
                    { id: 'o3', day: 'Friday', time: '11:00 AM - 01:00 PM', status: 'booked', studentName: 'Kevin Kamau' }
                  ].map(slot => (
                    <div key={slot.id} className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">{slot.day}</span>
                        <span className="text-xs font-mono text-blue-600 dark:text-blue-400 block">{slot.time}</span>
                        {slot.studentName && (
                          <span className="text-[10px] text-slate-500 block">Booked by: {slot.studentName}</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                        slot.status === 'booked' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                      }`}>
                        {slot.status.toUpperCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 5. PAYROLL HISTORY */}
          {activeTab === 'payroll' && (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">CURRENT MONTHLY PAYROLL ESTIMATE</span>
                  <h3 className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                    KES {currentPayroll.netSalary.toLocaleString()} <span className="text-xs text-slate-300 font-sans font-normal">(Net Salary)</span>
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs font-mono border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Gross Salary</span>
                    <span className="font-bold text-white">KES {currentPayroll.grossPay.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">PAYE Tax</span>
                    <span className="font-bold text-rose-400">KES {currentPayroll.payeTax.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Total Deductions</span>
                    <span className="font-bold text-rose-400">KES {currentPayroll.totalDeductions.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <h4 className="text-xs uppercase font-bold text-slate-500">Historical Disbursed Payroll Records</h4>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="p-3">Period</th>
                      <th className="p-3">Logged Hours</th>
                      <th className="p-3">Hourly Rate</th>
                      <th className="p-3">Gross Pay</th>
                      <th className="p-3">PAYE</th>
                      <th className="p-3">SHIF</th>
                      <th className="p-3">NSSF</th>
                      <th className="p-3">Net Salary</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {[
                      currentPayroll,
                      { ...currentPayroll, id: 'pay-prev-1', month: 'May', year: 2026 },
                      { ...currentPayroll, id: 'pay-prev-2', month: 'April', year: 2026 }
                    ].map(rec => (
                      <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">{rec.month} {rec.year}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{rec.hoursWorked} hrs</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">KES {rec.hourlyRate}</td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">KES {rec.grossPay.toLocaleString()}</td>
                        <td className="p-3 text-rose-600 dark:text-rose-400">KES {rec.payeTax.toLocaleString()}</td>
                        <td className="p-3 text-rose-600 dark:text-rose-400">KES {rec.shifDeduction.toLocaleString()}</td>
                        <td className="p-3 text-rose-600 dark:text-rose-400">KES {rec.nssfDeduction.toLocaleString()}</td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">KES {rec.netSalary.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full">
                            Disbursed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. RESEARCH PUBLICATIONS */}
          {activeTab === 'publications' && (
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold text-slate-500">Peer-Reviewed Publications & Academic Research</h4>
              {(lecturer.publications || []).length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                    "Optimizing Distributed High-Throughput Microservice Networks" — International Journal of Computer Engineering (2025).
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                    "Machine Learning Models for Kenyan Agricultural Yield Forecasting" — East Africa IEEE Tech Review (2024).
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {(lecturer.publications || []).map((pub, idx) => (
                    <li key={idx} className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2">
                      <span className="font-bold text-blue-600">•</span>
                      <span>{pub}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* 7. PERFORMANCE REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold text-slate-500">Annual Academic & Operational Reviews</h4>
              <div className="space-y-3">
                {reviews.map(rev => (
                  <div key={rev.id} className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{rev.reviewerName}</span>
                      <div className="flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full text-xs font-bold">
                        ★ {rev.rating} / 5.0
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block">{rev.reviewDate}</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300">{rev.comments}</p>
                    {rev.goalsForNextPeriod && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-blue-600 dark:text-blue-400">
                        <strong>Target Goals:</strong> {rev.goalsForNextPeriod}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold text-slate-500">Staff Institutional Compliance Documents</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {documents.map(doc => (
                  <div key={doc.id} className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">{doc.title}</h5>
                        <span className="text-[10px] text-slate-400 font-mono">{doc.category} • {doc.fileSize}</span>
                      </div>
                    </div>
                    <button type="button" className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. LEAVE HISTORY */}
          {activeTab === 'leave' && (
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold text-slate-500">Leave & Absence Records</h4>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="p-3">Leave Type</th>
                      <th className="p-3">Start Date</th>
                      <th className="p-3">End Date</th>
                      <th className="p-3">Days</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {leaveHistory.map(lh => (
                      <tr key={lh.id}>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{lh.leaveType}</td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{lh.startDate}</td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{lh.endDate}</td>
                        <td className="p-3 font-mono font-bold">{lh.daysCount} days</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{lh.reason || 'N/A'}</td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {lh.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            Staff Number: <strong className="font-mono text-slate-700 dark:text-slate-300">{lecturer.staffNumber || lecturer.designatorCode}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close Profile
          </button>
        </div>

      </div>
    </div>
  );
};
