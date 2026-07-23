import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Shield, Building, Award, Briefcase, Calendar, 
  DollarSign, Landmark, Check, Plus, ArrowRight, Eye, RefreshCw, AlertCircle, X, CheckSquare
} from 'lucide-react';
import { Lecturer, BankingInfo } from '../../types';
import { 
  DEPARTMENTS, 
  ACADEMIC_RANKS, 
  EMPLOYMENT_TYPES, 
  EMPLOYMENT_STATUSES, 
  SYSTEM_ROLES, 
  KENYA_BANKS, 
  getDefaultHourlyRate,
  generateStaffNumber 
} from './hrData';

interface LecturerRegistrationFormProps {
  onSave: (lecturerData: Partial<Lecturer>, action: 'save' | 'another' | 'subjects' | 'profile') => void;
  onCancel?: () => void;
  existingCount?: number;
  editingLecturer?: Lecturer | null;
}

export const LecturerRegistrationForm: React.FC<LecturerRegistrationFormProps> = ({
  onSave,
  onCancel,
  existingCount = 0,
  editingLecturer = null
}) => {
  // Personal Info State
  const [name, setName] = useState(editingLecturer?.name || '');
  const [email, setEmail] = useState(editingLecturer?.email || '');
  const [phone, setPhone] = useState(editingLecturer?.phone || '');
  const [nationalId, setNationalId] = useState(editingLecturer?.nationalId || '');
  const [gender, setGender] = useState<Lecturer['gender']>(editingLecturer?.gender || 'Male');
  const [dob, setDob] = useState(editingLecturer?.dob || '1988-05-14');
  const [avatar, setAvatar] = useState(editingLecturer?.avatar || '');

  // Employment Info State
  const [staffNumber, setStaffNumber] = useState(
    editingLecturer?.staffNumber || editingLecturer?.designatorCode || generateStaffNumber(existingCount)
  );
  const [department, setDepartment] = useState(editingLecturer?.department || DEPARTMENTS[0].name);
  const [academicRank, setAcademicRank] = useState(editingLecturer?.academicRank || ACADEMIC_RANKS[2].title);
  const [employmentType, setEmploymentType] = useState<Lecturer['employmentType']>(
    editingLecturer?.employmentType || 'Permanent'
  );
  const [employmentDate, setEmploymentDate] = useState(editingLecturer?.employmentDate || '2024-01-15');
  const [contractStartDate, setContractStartDate] = useState(editingLecturer?.contractStartDate || '2024-01-15');
  const [contractEndDate, setContractEndDate] = useState(editingLecturer?.contractEndDate || '2027-01-15');
  const [employmentStatus, setEmploymentStatus] = useState<Lecturer['employmentStatus']>(
    editingLecturer?.employmentStatus || 'Active'
  );

  // Hourly Rate & Overrides
  const [isRateOverridden, setIsRateOverridden] = useState(editingLecturer?.isRateOverridden || false);
  const [hourlyRate, setHourlyRate] = useState<number>(
    editingLecturer?.hourlyRate || getDefaultHourlyRate(academicRank)
  );

  // Banking Information
  const [bankName, setBankName] = useState(editingLecturer?.bankingInfo?.bankName || KENYA_BANKS[0].name);
  const [bankBranch, setBankBranch] = useState(editingLecturer?.bankingInfo?.branch || 'Nairobi Central');
  const [accountName, setAccountName] = useState(editingLecturer?.bankingInfo?.accountName || name);
  const [accountNumber, setAccountNumber] = useState(editingLecturer?.bankingInfo?.accountNumber || '');
  const [swiftCode, setSwiftCode] = useState(editingLecturer?.bankingInfo?.swiftCode || KENYA_BANKS[0].swift);
  const [mobileMoney, setMobileMoney] = useState(editingLecturer?.bankingInfo?.mobileMoney || phone);

  // Roles (RBAC)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    editingLecturer?.roles || ['Lecturer']
  );

  // Keep hourly rate updated based on academic rank if not manually overridden
  useEffect(() => {
    if (!isRateOverridden) {
      setHourlyRate(getDefaultHourlyRate(academicRank));
    }
  }, [academicRank, isRateOverridden]);

  // Keep Account Name synced with Name unless edited manually
  useEffect(() => {
    if (!accountName && name) {
      setAccountName(name);
    }
  }, [name]);

  const handleRankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRank = e.target.value;
    setAcademicRank(newRank);
    if (!isRateOverridden) {
      setHourlyRate(getDefaultHourlyRate(newRank));
    }
  };

  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedBankName = e.target.value;
    setBankName(selectedBankName);
    const found = KENYA_BANKS.find(b => b.name === selectedBankName);
    if (found) {
      setSwiftCode(found.swift);
    }
  };

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      // Keep at least one role
      if (selectedRoles.length > 1) {
        setSelectedRoles(selectedRoles.filter(r => r !== role));
      }
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleRegenerateStaffNumber = () => {
    setStaffNumber(generateStaffNumber(Math.floor(Math.random() * 900) + 100));
  };

  const handleSubmit = (e: React.FormEvent, action: 'save' | 'another' | 'subjects' | 'profile') => {
    e.preventDefault();

    const bankingInfo: BankingInfo = {
      bankName,
      branch: bankBranch,
      accountName: accountName || name,
      accountNumber,
      swiftCode,
      mobileMoney
    };

    // Calculate backward compatible boolean flags from RBAC roles
    const isAccountant = selectedRoles.includes('Accountant');
    const isLibrarian = selectedRoles.includes('Librarian');

    const lecturerPayload: Partial<Lecturer> = {
      name,
      email,
      phone,
      nationalId,
      gender,
      dob,
      avatar,
      staffNumber,
      designatorCode: staffNumber,
      department,
      academicRank,
      employmentType,
      employmentDate,
      contractStartDate: employmentType === 'Contract' ? contractStartDate : undefined,
      contractEndDate: employmentType === 'Contract' ? contractEndDate : undefined,
      employmentStatus,
      hourlyRate: Number(hourlyRate) || getDefaultHourlyRate(academicRank),
      isRateOverridden,
      loggedHours: editingLecturer?.loggedHours || 80,
      overtimeHours: editingLecturer?.overtimeHours || 0,
      bankingInfo,
      bankDetails: `${bankName} - ${accountNumber} (${bankBranch})`,
      contractLength: employmentType === 'Contract' ? `Contract (${contractStartDate} to ${contractEndDate})` : employmentType,
      roles: selectedRoles,
      isActive: employmentStatus === 'Active',
      isAccountant,
      isLibrarian,
      subjects: editingLecturer?.subjects || [],
      publications: editingLecturer?.publications || [],
      researchInterests: editingLecturer?.researchInterests || [],
      officeHours: editingLecturer?.officeHours || []
    };

    onSave(lecturerPayload, action);

    if (action === 'another') {
      // Reset form for next entry
      setName('');
      setEmail('');
      setPhone('');
      setNationalId('');
      setAccountNumber('');
      setStaffNumber(generateStaffNumber(existingCount + 1));
      setSelectedRoles(['Lecturer']);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            {editingLecturer ? 'Edit Faculty Staff & Payroll Profile' : 'Lecturer & Faculty Registration'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Database-driven enterprise staff onboarding with automated hourly rank rates, normalized banking, and RBAC security.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={(e) => handleSubmit(e, 'save')} className="space-y-6">
        
        {/* SECTION 1: PERSONAL INFORMATION */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4" /> 1. Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-150 dark:border-slate-800">
            
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Dr. Samuel Omondi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Institutional Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="samuel.omondi@zenti.ac.ke"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="+254 712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                National ID / Passport Number
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="33892014"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Lecturer['gender'])}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Date of Birth</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 2: EMPLOYMENT INFORMATION */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-1.5">
            <Briefcase className="w-4 h-4" /> 2. Employment Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-150 dark:border-slate-800">
            
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Staff Number (Auto-Generated)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={staffNumber}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={handleRegenerateStaffNumber}
                  title="Generate new staff number"
                  className="px-2.5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Department</label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Academic Rank</label>
              <div className="relative">
                <Award className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <select
                  value={academicRank}
                  onChange={handleRankChange}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
                >
                  {ACADEMIC_RANKS.map(r => (
                    <option key={r.id} value={r.title}>{r.title} (KES {r.defaultRate.toLocaleString()}/hr)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as Lecturer['employmentType'])}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
              >
                {EMPLOYMENT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Employment Date</label>
              <input
                type="date"
                value={employmentDate}
                onChange={(e) => setEmploymentDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Employment Status</label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value as Lecturer['employmentStatus'])}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
              >
                {EMPLOYMENT_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Conditional Contract Dates */}
            {employmentType === 'Contract' && (
              <>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-amber-700 dark:text-amber-400">Contract Start Date</label>
                  <input
                    type="date"
                    value={contractStartDate}
                    onChange={(e) => setContractStartDate(e.target.value)}
                    className="w-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg p-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-amber-700 dark:text-amber-400">Contract End Date</label>
                  <input
                    type="date"
                    value={contractEndDate}
                    onChange={(e) => setContractEndDate(e.target.value)}
                    className="w-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg p-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </>
            )}

          </div>
        </div>

        {/* SECTION 3: AUTOMATED HOURLY RATE & OVERRIDE CONTROL */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" /> 3. Hourly Payout Rate Engine
          </h3>
          <div className="bg-blue-50/50 dark:bg-blue-950/30 border border-blue-150 dark:border-blue-900/50 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Academic Rank:</span>
                <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded text-xs font-mono font-bold">
                  {academicRank}
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  {isRateOverridden ? 'HR Manual Override' : 'Auto-Calculated'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Default hourly rate is automatically bound to Academic Rank. HR administrators can toggle override below.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-slate-500">Hourly Rate (KES)</label>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-500">KES</span>
                  <input
                    type="number"
                    disabled={!isRateOverridden}
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className={`w-28 border rounded-lg px-2.5 py-1 text-xs font-mono font-bold focus:outline-none ${
                      isRateOverridden 
                        ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-700' 
                        : 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 cursor-not-allowed'
                    }`}
                  />
                  <span className="text-xs text-slate-400">/hr</span>
                </div>
              </div>

              <div className="border-l border-slate-200 dark:border-slate-800 pl-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isRateOverridden}
                    onChange={(e) => {
                      setIsRateOverridden(e.target.checked);
                      if (!e.target.checked) {
                        setHourlyRate(getDefaultHourlyRate(academicRank));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Authorize HR Override</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: NORMALIZED BANKING INFORMATION */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-1.5">
            <Landmark className="w-4 h-4" /> 4. Normalized Banking & Settlement Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-150 dark:border-slate-800">
            
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Bank Name</label>
              <select
                value={bankName}
                onChange={handleBankChange}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
              >
                {KENYA_BANKS.map(b => (
                  <option key={b.code} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Branch Name</label>
              <input
                type="text"
                placeholder="Upper Hill Branch"
                value={bankBranch}
                onChange={(e) => setBankBranch(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Account Name</label>
              <input
                type="text"
                placeholder="Dr. Samuel Omondi"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Account Number</label>
              <input
                type="text"
                required
                placeholder="01109283746500"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">SWIFT Code (Optional)</label>
              <input
                type="text"
                placeholder="EQBLKENA"
                value={swiftCode}
                onChange={(e) => setSwiftCode(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Mobile Money / M-Pesa (Optional)</label>
              <input
                type="text"
                placeholder="+254 712 345 678"
                value={mobileMoney}
                onChange={(e) => setMobileMoney(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>

          </div>
        </div>

        {/* SECTION 5: ROLE-BASED ACCESS CONTROL (RBAC) */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-1.5">
            <Shield className="w-4 h-4" /> 5. Role-Based Access Control (RBAC System Roles)
          </h3>
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-150 dark:border-slate-800 space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assign one or multiple enterprise system access roles to determine authorization rights across portals.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {SYSTEM_ROLES.map(role => {
                const isSelected = selectedRoles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                      isSelected ? 'bg-white text-blue-600 border-white font-bold' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {isSelected && '✓'}
                    </div>
                    <span className="truncate">{role}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* MULTI-ACTION WORKFLOW BUTTONS */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'another')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Save & Add Another
          </button>

          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'subjects')}
            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" /> Save & Assign Subjects
          </button>

          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'profile')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4" /> Save & Open Profile
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" /> {editingLecturer ? 'Update Staff Record' : 'Save Staff Profile'}
          </button>
        </div>

      </form>
    </div>
  );
};

function BookOpen(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}
