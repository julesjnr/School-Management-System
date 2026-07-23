import React, { useState } from 'react';
import { useNotification } from './notifications';
import { 
  GraduationCap, Users, CheckCircle2, AlertCircle, DollarSign, Calendar, 
  Clock, ArrowRight, ChevronRight, Plus, X, Bell, CreditCard, TrendingUp, 
  MapPin, UserCheck, BookOpen, FileSpreadsheet, Megaphone, Info, RefreshCw,
  LayoutGrid, ArrowLeft, Check, Sparkles, AlertTriangle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

import { Student, Lecturer, Course, Expense, InAppNotification } from '../types';

interface DashboardShowcaseProps {
  onBack: () => void;
  students?: Student[];
  lecturers?: Lecturer[];
  courses?: Course[];
  expenses?: Expense[];
  notifications?: InAppNotification[];
}

export default function DashboardShowcase({ 
  onBack,
  students = [],
  lecturers = [],
  courses = [],
  expenses = [],
  notifications = []
}: DashboardShowcaseProps) {
  const { showToast, showInfo } = useNotification();
  const [activeLayout, setActiveLayout] = useState<'A' | 'B' | 'C'>('A');
  const [simulateEmptyState, setSimulateEmptyState] = useState<boolean>(false);
  const [announcements, setAnnouncements] = useState<Array<{ id: string; title: string; content: string; date: string }>>([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  
  // Mark Attendance state
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [markingClass, setMarkingClass] = useState<string | null>(null);

  // Homework Checklist State
  const [homeworkList, setHomeworkList] = useState<Array<{ id: string; subject: string; task: string; dueDate: string; checked: boolean }>>([]);

  // Handle Quick Action Announcements
  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle || !newAnnContent) return;
    setAnnouncements([
      {
        id: Date.now().toString(),
        title: newAnnTitle,
        content: newAnnContent,
        date: new Date().toISOString().split('T')[0]
      },
      ...announcements
    ]);
    setNewAnnTitle('');
    setNewAnnContent('');
    setShowAnnouncementModal(false);
  };

  // Toggle Homework state
  const toggleHomework = (id: string) => {
    setHomeworkList(homeworkList.map(hw => hw.id === id ? { ...hw, checked: !hw.checked } : hw));
  };

  // Dynamic DB Metrics Calculations
  const totalStudentsCount = students.length;
  const totalLecturersCount = lecturers.length;
  
  const attendanceVals = students.flatMap(s => Object.values(s.attendance || {}));
  const dailyAttendancePercentage = attendanceVals.length 
    ? (attendanceVals.reduce((sum, a) => sum + a, 0) / attendanceVals.length).toFixed(1) + '%'
    : '0.0%';

  const totalInvoiced = students.flatMap(s => s.ledger).reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = students.flatMap(s => s.ledger).filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
  const feesCollectedPercentage = totalInvoiced > 0 
    ? ((totalPaid / totalInvoiced) * 100).toFixed(1) + '%' 
    : '0.0%';

  // Attendance Chart Data derived from DB
  const attendanceChartData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => ({
    name: day,
    CS: attendanceVals.length ? Math.round(Number(dailyAttendancePercentage.replace('%', ''))) : 0,
    EE: attendanceVals.length ? Math.round(Number(dailyAttendancePercentage.replace('%', ''))) : 0,
    DS: attendanceVals.length ? Math.round(Number(dailyAttendancePercentage.replace('%', ''))) : 0,
  }));

  // Financial Transactions from DB
  const transactionData: Array<{ id: string; reference: string; student: string; desc: string; amount: string; type: string; status: string; date: string }> = [];

  // System Alerts from DB notifications
  const systemAlerts = notifications.map(n => ({
    id: n.id,
    level: (n.type as string) === 'critical' ? 'critical' : (n.type as string) === 'warning' ? 'warning' : 'info',
    msg: n.message,
    time: n.dateTime
  }));

  // Classes timetable from DB courses
  const todayClasses = courses.map(c => ({
    id: c.id,
    code: c.code,
    name: c.title,
    time: 'Scheduled Session',
    room: c.faculty,
    current: false,
    upcoming: true
  }));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-800 dark:text-slate-100 flex flex-col">
      {/* Upper Navigation bar specific to Showcase */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center cursor-pointer"
              title="Return to Main Portal"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-500/20">
                  Interactive Showcase
                </span>
                <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-purple-500/20">
                  Layout Demos
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white font-display tracking-tight mt-0.5">
                Central Dashboard Configurations & Wireframes
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">

            {/* Layout selector tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-250/20 text-xs font-bold shrink-0">
              <button
                onClick={() => setActiveLayout('A')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  activeLayout === 'A' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                }`}
              >
                <span>Layout A</span>
                <span className="text-[9px] opacity-75 font-normal hidden sm:inline">(Admin)</span>
              </button>
              <button
                onClick={() => setActiveLayout('B')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  activeLayout === 'B' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                }`}
              >
                <span>Layout B</span>
                <span className="text-[9px] opacity-75 font-normal hidden sm:inline">(Lecturer)</span>
              </button>
              <button
                onClick={() => setActiveLayout('C')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  activeLayout === 'C' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                }`}
              >
                <span>Layout C</span>
                <span className="text-[9px] opacity-75 font-normal hidden sm:inline">(Unified Portal)</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Active layout introduction */}
        <div className="bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-purple-600/5 border border-blue-500/10 dark:border-blue-500/5 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          <div className="absolute right-4 bottom-0 opacity-10 pointer-events-none">
            <LayoutGrid className="w-40 h-40 text-blue-600" />
          </div>
          <h2 className="text-sm font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest flex items-center gap-1.5 font-display">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            {activeLayout === 'A' && "Dashboard A: The Admin Overview View"}
            {activeLayout === 'B' && "Dashboard B: The Lecturer Workstation View"}
            {activeLayout === 'C' && "Dashboard C: Unified Student & Stakeholder View"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 max-w-3xl leading-relaxed">
            {activeLayout === 'A' && "Designed as a highly-dense corporate operations grid. Synthesizes campus-wide metrics, live student/faculty statistics, real-time attendance trends, institutional calendar events, critical system diagnostics, and financial transactions."}
            {activeLayout === 'B' && "Streamlined, task-focused workflow interface for faculty members. Houses high-priority quick action buttons for classroom management and grading, paired with an active chronological timetable displaying the current session and immediate links."}
            {activeLayout === 'C' && "Highly visual, mobile-first unified layout designed to reduce cognitive load. Organizes critical personal academic info: live GPA meter, pending homework checklist, daily class matrices, and outstanding fees invoice statements with inline checkout capabilities."}
          </p>
        </div>

        {/* ========================================================================= */}
        {/* DASHBOARD A: THE ADMIN OVERVIEW VIEW */}
        {/* ========================================================================= */}
        {activeLayout === 'A' && (
          <div className="space-y-6">
            
            {/* Metric Cards Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Card 1: Total Students */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 p-5 shadow-sm transition-all hover:shadow-md flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Students</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                      {totalStudentsCount}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 block">{totalStudentsCount === 0 ? "0 Students registered" : "Active admissions this semester"}</span>
                </div>
                <div className="w-10 h-10 bg-blue-500/10 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>

              {/* Card 2: Total Faculty */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 p-5 shadow-sm transition-all hover:shadow-md flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Faculty</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                      {totalLecturersCount}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 block">{totalLecturersCount === 0 ? "0 Lecturers hired" : "Lecturers & researchers hired"}</span>
                </div>
                <div className="w-10 h-10 bg-indigo-500/10 text-indigo-650 rounded-lg flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              {/* Card 3: Daily Attendance % */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 p-5 shadow-sm transition-all hover:shadow-md flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Daily Attendance %</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                      {dailyAttendancePercentage}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 block">{attendanceVals.length === 0 ? "No attendance records available" : "Average system-wide scan today"}</span>
                </div>
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-650 rounded-lg flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>

              {/* Card 4: Fees Collected % */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 p-5 shadow-sm transition-all hover:shadow-md flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fees Collected %</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                      {feesCollectedPercentage}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 block">{totalInvoiced === 0 ? "No financial data available" : "Total invoices cleared"}</span>
                </div>
                <div className="w-10 h-10 bg-amber-500/10 text-amber-650 rounded-lg flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

            </div>

            {/* Main Content Layout (Two Columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column (8 cols on lg) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Visual Daily Attendance Chart Widget */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 p-5 shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        Daily Attendance Analytics (By Faculty)
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Real-time attendance rates recorded from digital lecture hall registers.</p>
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

                  {simulateEmptyState ? (
                    <div className="h-64 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center p-6 text-center">
                      <BarChart className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No Attendance Analytics Logged</p>
                      <p className="text-[10px] text-slate-550 max-w-xs mt-1">Please log in to the lecturer portal and take attendance to populate this visualization.</p>
                    </div>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={attendanceChartData}>
                          <defs>
                            <linearGradient id="colorCS" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorEE" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis domain={[80, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />
                          <Area type="monotone" dataKey="CS" name="Computing & AI" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorCS)" />
                          <Area type="monotone" dataKey="EE" name="Engineering" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorEE)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Upcoming School Events Timeline Widget */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 p-5 shadow-sm">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Institutional Events & Deadlines Calendar
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Chronological timeline of upcoming academic and staff administration events.</p>
                  </div>

                  {simulateEmptyState ? (
                    <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center p-8 text-center">
                      <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-bold text-slate-650 dark:text-slate-400">No Events Scheduled</p>
                      <p className="text-[10px] text-slate-500 mt-1">There are no upcoming school events or calendar milestones defined.</p>
                    </div>
                  ) : (
                    <div className="relative pl-6 border-l border-slate-100 dark:border-slate-800 space-y-5 py-2">
                      {/* Event 1 */}
                      <div className="relative">
                        <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 bg-blue-600 border-2 border-white dark:border-slate-900 rounded-full" />
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                          <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100">Semester II Exam Period Commences</h4>
                          <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50">July 14, 2026</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Official examination booklets distributed to departmental chairs. Invigilation roster published.</p>
                      </div>

                      {/* Event 2 */}
                      <div className="relative">
                        <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 bg-emerald-600 border-2 border-white dark:border-slate-900 rounded-full" />
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                          <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100">Zenti Annual Hackathon 2026 Pitching</h4>
                          <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50">July 18, 2026</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Student development project panels present before guest judges. Awards ceremony starts at 04:00 PM.</p>
                      </div>

                      {/* Event 3 */}
                      <div className="relative">
                        <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 bg-purple-600 border-2 border-white dark:border-slate-900 rounded-full" />
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                          <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100">Board of Trustees Budget Review</h4>
                          <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50">July 22, 2026</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Financial auditor presents Semester I reconciliations and Semester II requisitions approvals.</p>
                      </div>

                      {/* Event 4 */}
                      <div className="relative">
                        <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 bg-slate-400 border-2 border-white dark:border-slate-900 rounded-full" />
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                          <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100">Library Holds Auto-Reconciliation Sweep</h4>
                          <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50">July 28, 2026</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Automated cron runs library gate reconciliations and scans for long overdue teacher resources.</p>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column (4 cols on lg) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Critical System/Staff Alerts Widget */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 p-5 shadow-sm">
                  <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                        Critical Alerts & Alarms
                      </h3>
                      <p className="text-[9px] text-slate-500">Real-time system telemetry and action requirements.</p>
                    </div>
                    {!simulateEmptyState && (
                      <span className="text-[9px] bg-rose-500/10 text-rose-600 px-1.5 py-0.5 rounded font-mono font-bold">
                        3 Pending
                      </span>
                    )}
                  </div>

                  {simulateEmptyState ? (
                    <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center p-6 text-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                      <p className="text-xs font-bold text-slate-650 dark:text-slate-400">All Systems Nominal</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">No critical system alarms or timesheet alerts logged.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {systemAlerts.map(alert => (
                        <div 
                          key={alert.id}
                          className={`p-3 rounded-lg border text-xs flex gap-2.5 items-start ${
                            alert.level === 'critical' 
                              ? 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-200' 
                              : alert.level === 'warning'
                              ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-200'
                              : 'bg-blue-50/40 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/30 text-blue-800 dark:text-blue-200'
                          }`}
                        >
                          {alert.level === 'critical' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                          {alert.level === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                          {alert.level === 'info' && <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />}
                          
                          <div className="space-y-0.5">
                            <p className="font-medium leading-relaxed text-[11px]">{alert.msg}</p>
                            <span className="text-[9px] opacity-75 font-mono">{alert.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Financial Transactions Module */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 p-5 shadow-sm">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Recent Financial Transactions
                    </h3>
                    <p className="text-[9px] text-slate-500">Live ledger invoices and outgoing purchase accounts.</p>
                  </div>

                  {simulateEmptyState ? (
                    <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center p-6 text-center">
                      <CreditCard className="w-10 h-10 text-slate-350 dark:text-slate-700 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-bold text-slate-650 dark:text-slate-400">No Transactions Found</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">There are no financial ledger activities logged in db.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {transactionData.map(tx => (
                        <div key={tx.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 dark:text-white">{tx.student}</span>
                              <span className="text-[9px] font-mono text-slate-400">{tx.reference}</span>
                            </div>
                            <p className="text-[10px] text-slate-500">{tx.desc} • <span className="font-mono text-[9px]">{tx.date}</span></p>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <span className={`font-bold font-mono ${tx.type === 'Credit' ? 'text-emerald-600' : 'text-slate-650'}`}>
                              {tx.type === 'Credit' ? '+' : '-'}{tx.amount}
                            </span>
                            <span className={`block text-[8px] font-bold uppercase tracking-wider ${
                              tx.status === 'Settled' 
                                ? 'text-emerald-600' 
                                : tx.status === 'Approved' 
                                ? 'text-blue-600' 
                                : 'text-amber-600'
                            }`}>{tx.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* DASHBOARD B: THE LECTURER WORKSTATION VIEW */}
        {/* ========================================================================= */}
        {activeLayout === 'B' && (
          <div className="space-y-6">
            
            {/* Action Header Banner */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Faculty Operations Panel</h3>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white font-display mt-0.5">
                  Lecturer Workstation Quick-Actions
                </h2>
                <p className="text-xs text-slate-500">Trigger daily routines instantly with these prominent administrative commands.</p>
              </div>

              {/* Action Buttons Bar */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setAttendanceMarked(false);
                    setMarkingClass('CS-101-Web');
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-500/25 active:scale-98"
                >
                  <UserCheck className="w-4 h-4 text-blue-200" />
                  <span>Mark Attendance</span>
                </button>
                <button
                  type="button"
                  onClick={() => showInfo('Grading Suite', 'Gradebook selected. Navigation triggers Tab 1 (Grading Suite).')}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-indigo-500/25 active:scale-98"
                >
                  <FileSpreadsheet className="w-4 h-4 text-indigo-200" />
                  <span>Open Gradebook</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(true)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-500/25 active:scale-98"
                >
                  <Megaphone className="w-4 h-4 text-emerald-200" />
                  <span>Post Announcement</span>
                </button>
              </div>
            </div>

            {/* Attendance Marker Interactive Simulation block */}
            {markingClass && (
              <div className="bg-blue-50/40 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex justify-between items-center border-b border-blue-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-850 dark:text-white tracking-wider">Attendance Register Session</h4>
                      <p className="text-[10px] text-slate-550">CS-101-Web Technologies II • Room 4B</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setMarkingClass(null)} 
                    className="p-1 rounded-md text-slate-400 hover:bg-slate-200/50 hover:text-slate-650 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {attendanceMarked ? (
                  <div className="py-4 text-center space-y-2">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                      <Check className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-extrabold text-slate-850 dark:text-white">Attendance Saved to Secure Ledger!</p>
                    <p className="text-[10px] text-slate-500 max-w-xs mx-auto">18 students registered present. Ledger sync completed successfully.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-150 flex justify-between items-center text-xs">
                        <span className="font-bold">Sarah Wanjiku</span>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Present</span>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-150 flex justify-between items-center text-xs">
                        <span className="font-bold">John Mwangi</span>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Present</span>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-150 flex justify-between items-center text-xs">
                        <span className="font-bold">David Kiprop</span>
                        <span className="text-[9px] bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-full font-bold">Absent</span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button 
                        onClick={() => setMarkingClass(null)} 
                        className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => setAttendanceMarked(true)} 
                        className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
                      >
                        Submit Attendance Register
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Split Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Section: daily class timetable widget */}
              <div className="lg:col-span-8 space-y-6">
                
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 p-5 shadow-sm">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      Daily Class Timetable & Schedule
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Your chronological lecture assignments mapped for today.</p>
                  </div>

                  {simulateEmptyState ? (
                    <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center p-8 text-center">
                      <Clock className="w-12 h-12 text-slate-350 dark:text-slate-700 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-bold text-slate-650 dark:text-slate-400">No Classes Scheduled Today</p>
                      <p className="text-[10px] text-slate-500 mt-1">There are no continuous class programs or subject schedules mapped for you today.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {todayClasses.map(cls => (
                        <div 
                          key={cls.id}
                          className={`p-4 rounded-xl border text-xs transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                            cls.current 
                              ? 'bg-blue-500/5 dark:bg-slate-950 border-blue-200 dark:border-blue-900/30 shadow-2xs' 
                              : 'bg-white dark:bg-slate-950 border-slate-150'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-black uppercase tracking-wider text-slate-400">{cls.code}</span>
                              {cls.current && (
                                <span className="text-[8px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded-full font-bold uppercase animate-pulse">
                                  Current Session
                                </span>
                              )}
                              {cls.upcoming && (
                                <span className="text-[8px] bg-indigo-500/10 text-indigo-650 px-1.5 py-0.5 rounded-full font-bold uppercase">
                                  Next Up
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-slate-850 dark:text-white leading-tight">{cls.name}</h4>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 opacity-70" />
                                {cls.time}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 opacity-70" />
                                {cls.room}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                            {cls.current ? (
                              <>
                                <button 
                                  onClick={() => {
                                    setAttendanceMarked(false);
                                    setMarkingClass(cls.code);
                                  }}
                                  className="w-full sm:w-auto px-3.5 py-2 rounded-lg font-bold bg-blue-600 hover:bg-blue-700 text-white text-[11px] transition-colors cursor-pointer"
                                >
                                  Register Attendance
                                </button>
                                <button 
                                  onClick={() => showToast(`Opening virtual whiteboard for ${cls.code}`, 'info')}
                                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                                  title="Open Class Whiteboard"
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={() => showToast(`Pre-viewing material dossiers for ${cls.code}`, 'info')}
                                className="w-full sm:w-auto px-3 py-2 rounded-lg font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 text-[11px] transition-colors cursor-pointer text-center"
                              >
                                View Materials
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Section: Supplemental operational state */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Active announcements log */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 p-5 shadow-sm">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                      <Megaphone className="w-4 h-4 text-emerald-600" />
                      My Published Announcements
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Broadcast alerts displayed on the student portal board.</p>
                  </div>

                  {simulateEmptyState || announcements.length === 0 ? (
                    <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center p-6 text-center">
                      <Megaphone className="w-10 h-10 text-slate-350 dark:text-slate-700 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-bold text-slate-650 dark:text-slate-400">No Announcements Posted</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">You have not published any announcements this session.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {announcements.map(ann => (
                        <div key={ann.id} className="p-3 bg-slate-50/50 dark:bg-slate-950 rounded-lg border border-slate-150/80 space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-850 dark:text-slate-100 leading-tight">{ann.title}</span>
                            <span className="text-[9px] font-mono text-slate-400">{ann.date}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed">{ann.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Performance telemetry / hours logged */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 p-5 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                        <Users className="w-4 h-4 text-indigo-650" />
                        Student Engagement
                      </h3>
                      <p className="text-[9px] text-slate-500">Live lecture parameters tracker.</p>
                    </div>
                    <span className="text-[9px] text-emerald-600 font-bold bg-emerald-100/50 px-1.5 py-0.5 rounded">Nominal</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center text-xs">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-150">
                      <span className="text-[9px] text-slate-500 uppercase block tracking-wider font-bold">Total Enrolled</span>
                      <span className="text-xl font-mono font-black text-slate-800 dark:text-white mt-1 block">
                        {simulateEmptyState ? "0" : "56"}
                      </span>
                    </div>
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-150">
                      <span className="text-[9px] text-slate-500 uppercase block tracking-wider font-bold">Grade Submissions</span>
                      <span className="text-xl font-mono font-black text-emerald-600 mt-1 block">
                        {simulateEmptyState ? "0%" : "91%"}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Post Announcement Modal Simulation */}
            {showAnnouncementModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Megaphone className="w-4.5 h-4.5 text-blue-600" />
                      Post New Class Announcement
                    </h3>
                    <button 
                      onClick={() => setShowAnnouncementModal(false)}
                      className="p-1 rounded-md text-slate-400 hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handlePostAnnouncement} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label htmlFor="ann-title" className="block font-bold text-slate-700">Announcement Title</label>
                      <input 
                        id="ann-title"
                        type="text" 
                        placeholder="e.g., Extended Lab Hours Assignment"
                        value={newAnnTitle}
                        onChange={e => setNewAnnTitle(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2.5"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="ann-content" className="block font-bold text-slate-700">Narrative Description</label>
                      <textarea 
                        id="ann-content"
                        placeholder="Write announcement details here..."
                        value={newAnnContent}
                        onChange={e => setNewAnnContent(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2.5 h-24"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                      <button 
                        type="button"
                        onClick={() => setShowAnnouncementModal(false)}
                        className="px-3.5 py-2 text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="px-4 py-2 font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-xs cursor-pointer"
                      >
                        Publish Broadcast
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* DASHBOARD C: THE STUDENT, LECTURER, ACCOUNTANT, LIBRARIAN & ADMIN VIEW */}
        {/* ========================================================================= */}
        {activeLayout === 'C' && (
          <div className="space-y-6">
            
            {/* Academic GPA Tracking & Matrix Grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* GPA Tracking Widget */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 p-5 shadow-sm flex flex-col justify-between">
                <div className="border-b border-slate-100 pb-2 mb-3">
                  <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block">Academic Standing</span>
                  <h3 className="text-xs font-bold text-slate-850 dark:text-slate-100 font-display mt-0.5">Cumulative GPA</h3>
                </div>

                <div className="py-2.5 text-center flex flex-col items-center justify-center">
                  {simulateEmptyState ? (
                    <div className="text-center py-2 space-y-1">
                      <span className="text-2xl font-black text-slate-350 dark:text-slate-700 font-mono">0.00</span>
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded block">No GPA Telemetry</span>
                    </div>
                  ) : (
                    <div className="relative inline-flex items-center justify-center">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle cx="48" cy="48" r="40" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="6" fill="transparent" />
                        <circle cx="48" cy="48" r="40" className="stroke-blue-600" strokeWidth="6" fill="transparent" strokeDasharray={251} strokeDashoffset={251 - (251 * 3.78) / 4} strokeLinecap="round" />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-2xl font-black text-slate-850 dark:text-white font-mono block">3.78</span>
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-600 px-1 rounded-full font-extrabold uppercase">First Class</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/50 text-[10px] text-slate-550 leading-relaxed text-center font-mono">
                  {simulateEmptyState 
                    ? "Register units to begin GPA computation." 
                    : "Rank: Top 5% of Software Engineering cohort."}
                </div>
              </div>

              {/* Upcoming Homework Checklist Widget */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 p-5 shadow-sm flex flex-col justify-between">
                <div className="border-b border-slate-100 pb-2 mb-3">
                  <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block">Continuous Assessment</span>
                  <h3 className="text-xs font-bold text-slate-850 dark:text-slate-100 font-display mt-0.5">Homework & Assignments</h3>
                </div>

                <div className="flex-1 space-y-2 py-1 overflow-y-auto max-h-40">
                  {simulateEmptyState || homeworkList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-4">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1" />
                      <p className="text-[11px] font-bold text-slate-650">No homework due today</p>
                      <p className="text-[9px] text-slate-450">All assignments checked off.</p>
                    </div>
                  ) : (
                    homeworkList.map(hw => (
                      <div 
                        key={hw.id} 
                        onClick={() => toggleHomework(hw.id)}
                        className="flex items-start gap-2.5 cursor-pointer p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors"
                      >
                        <input 
                          type="checkbox" 
                          checked={hw.checked}
                          onChange={() => {}} // handled by parent onClick
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0" 
                        />
                        <div className="space-y-0.5 text-xs leading-none">
                          <p className={`font-bold ${hw.checked ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>{hw.task}</p>
                          <p className="text-[9px] text-slate-500">{hw.subject} • <span className={`font-semibold ${hw.dueDate === 'Today' ? 'text-red-500' : 'text-slate-400'}`}>{hw.dueDate}</span></p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 text-[10px] text-slate-500 text-center font-bold">
                  {!simulateEmptyState && `${homeworkList.filter(h => !h.checked).length} pending coursework deliverables`}
                </div>
              </div>

              {/* Today's Schedule Matrix Widget */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 p-5 shadow-sm flex flex-col justify-between">
                <div className="border-b border-slate-100 pb-2 mb-3">
                  <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block">Lecture Matrix</span>
                  <h3 className="text-xs font-bold text-slate-850 dark:text-slate-100 font-display mt-0.5">Today's Class Schedule</h3>
                </div>

                <div className="flex-1 space-y-2.5 py-1">
                  {simulateEmptyState ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-4">
                      <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-1" />
                      <p className="text-[11px] font-bold text-slate-650">No Classes Scheduled</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-xs p-2 bg-blue-500/5 dark:bg-slate-950 rounded-lg border border-blue-200/50">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 dark:text-white">Web Technologies II</span>
                          <p className="text-[9px] text-slate-500">08:30 AM • Room 4B</p>
                        </div>
                        <span className="text-[8px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded-full font-bold">Active</span>
                      </div>

                      <div className="flex items-center justify-between text-xs p-2 bg-slate-50/50 dark:bg-slate-950 rounded-lg border border-slate-150">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 dark:text-white">Intro to Machine Learning</span>
                          <p className="text-[9px] text-slate-500">11:00 AM • Lab 3</p>
                        </div>
                        <span className="text-[8px] bg-slate-100 text-slate-550 px-1.5 py-0.5 rounded-full font-bold">11:00 AM</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-3 text-[10px] text-slate-500 text-center font-bold">
                  {!simulateEmptyState && "Average Daily Load: 4 Hours"}
                </div>
              </div>

              {/* Outstanding Fees Invoice Module */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 p-5 shadow-sm flex flex-col justify-between">
                <div className="border-b border-slate-100 pb-2 mb-3">
                  <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block">Account Statements</span>
                  <h3 className="text-xs font-bold text-slate-850 dark:text-slate-100 font-display mt-0.5">Outstanding Invoices</h3>
                </div>

                <div className="py-2.5">
                  {simulateEmptyState ? (
                    <div className="text-center py-2 space-y-1">
                      <span className="text-2xl font-black text-slate-350 dark:text-slate-700 font-mono">KES 0</span>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded block">Account Settled</span>
                    </div>
                  ) : (
                    <div className="space-y-1 text-center">
                      <span className="text-2xl font-black text-rose-600 font-mono block">KES 22,500</span>
                      <span className="text-[9px] text-slate-500 block">Semester II Tuition Fee Balance</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <button 
                    disabled={simulateEmptyState}
                    onClick={() => showToast('Initiating secure portal checkout M-Pesa API push...', 'info')}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-extrabold rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs transition-all active:scale-98"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay Outstanding Fee</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Showcase preview banner */}
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-250/20 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <p className="text-slate-650 dark:text-slate-350">
                  This mobile-friendly, grid-focused dashboard displays continuous assessment scores, homework tallies, GPA metrics, and outstanding payments to minimize cognitive fatigue.
                </p>
              </div>
              <button 
                onClick={() => setHomeworkList(homeworkList.map(h => ({ ...h, checked: false })))}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold shrink-0 cursor-pointer"
              >
                Reset Checklist States
              </button>
            </div>

          </div>
        )}

      </main>

      {/* Footer copyright */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] text-slate-400 font-mono">
          Zenti School Management System • Dashboard Layout showcase • Developed for Gemini 3.5 Flash Model Review
        </div>
      </footer>
    </div>
  );
}
