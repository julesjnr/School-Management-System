import React, { useState, useEffect, useMemo } from 'react';
import { useNotification } from './notifications';
import { 
  Users, Award, Calendar, BookOpen, Clock, 
  CheckCircle2, Save, FileSpreadsheet, Plus, 
  Activity, AlertCircle, Sparkles, LogOut, ChevronDown, Trash2, User, Sliders, X, Menu,
  UserCheck, School, GraduationCap, Bell, Search, MapPin
 } from 'lucide-react';
import { Lecturer, Student, Grade, Course, StockItem, Book, LMSReadingList, TeacherResource, BookRequest, AttendanceSession } from '../types';
import LecturerBooksView from './LecturerBooksView';
import StudentLookupPage from './StudentLookupPage';
import LecturerAssessmentWorkspace from './LecturerAssessmentWorkspace';
import LecturerWorkstationDashboard, {
  LecturerWorkstationLoading,
  LecturerWorkstationError,
} from './LecturerWorkstationDashboard';
import { useLecturerDashboard } from '../hooks/useLecturerDashboard';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  AreaChart,
  Area,
  Line,
  LineChart
} from 'recharts';

interface LecturerDashboardProps {
  lecturer: Lecturer;
  students: Student[];
  courses?: Course[];
  inventory?: StockItem[];
  books?: Book[];
  readingLists?: LMSReadingList[];
  teacherResources?: TeacherResource[];
  bookRequests?: BookRequest[];
  onUpdateReadingList?: (subjectCode: string, lecturerId: string, bookIds: string[], notes?: string) => void;
  onCancelOfficeHour?: (lecturerId: string, slotId: string, removeEntirely?: boolean) => void;
  onAddOfficeHourSlot?: (lecturerId: string, day: string, time: string) => void;
  onUpdateGrades: (studentId: string, subjectCode: string, grade: Grade) => void;
  onLogHours: (lecturerId: string, hours: number, absolute?: boolean) => void;
  onUpdateProfile: (lecturerId: string, updatedFields: Partial<Lecturer>) => void;
  onReserveTeacherResource: (resourceId: string, lecturerId: string, lecturerName: string) => void;
  onReleaseTeacherResource: (resourceId: string) => void;
  onAddBookRequest: (request: Omit<BookRequest, 'id' | 'date' | 'status'>) => void;
  attendanceSessions?: AttendanceSession[];
  onSaveAttendance?: (subjectCode: string, date: string, presentStudentIds: string[], absentStudentIds: string[], lateStudentIds?: string[]) => void | Promise<void>;
  onLogout: () => void;
}

export default function LecturerDashboard({
  lecturer,
  students,
  courses = [],
  inventory = [],
  books = [],
  readingLists = [],
  teacherResources = [],
  bookRequests = [],
  onUpdateReadingList = () => {},
  onCancelOfficeHour,
  onAddOfficeHourSlot,
  onUpdateGrades,
  onLogHours,
  onUpdateProfile,
  onReserveTeacherResource = () => {},
  onReleaseTeacherResource = () => {},
  onAddBookRequest = () => {},
  attendanceSessions = [],
  onSaveAttendance,
  onLogout
}: LecturerDashboardProps) {
  const { showToast, showWarning, showConfirm } = useNotification();
  const [activeTab, setActiveTab] = useState<'workstation' | 'grading' | 'classlist' | 'schedule' | 'attendance' | 'lookup' | 'books'>('workstation');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const {
    summary,
    isLoading: dashboardLoading,
    error: dashboardError,
    isLogging,
    refresh: refreshDashboard,
    logTeachingSession,
  } = useLecturerDashboard(lecturer.id);

  const assignedSubjects = summary?.assignedSubjects ?? [];
  const assignedCodes = assignedSubjects.map((s) => s.code);
  const liveLoggedHours = summary?.loggedHours ?? lecturer.loggedHours ?? 0;
  const liveHourlyRate = summary?.hourlyRate ?? lecturer.hourlyRate ?? 0;
  const liveEstimatedPayout =
    summary?.estimatedPayout ?? liveLoggedHours * liveHourlyRate;

  const resolveSubjectTitle = (code: string) => {
    const fromSummary = assignedSubjects.find((s) => s.code === code);
    if (fromSummary) return fromSummary.title;
    const fromCourses = courses.find((c) => c.code === code);
    return fromCourses?.title || code;
  };

  const subjectLabel = (code: string) => `${code} – ${resolveSubjectTitle(code)}`;

  const [timerSeconds, setTimerSeconds] = useState<number>(1500);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');

  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
      if (timerMode === 'focus') {
        setTimerMode('break');
        setTimerSeconds(300);
      } else {
        setTimerMode('focus');
        setTimerSeconds(1500);
      }
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds, timerMode]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [showBellCurve, setShowBellCurve] = useState(false);

  // Keep selected subject in sync with live assigned subjects
  useEffect(() => {
    if (assignedCodes.length === 0) {
      setSelectedSubject('');
      return;
    }
    if (!assignedCodes.includes(selectedSubject)) {
      setSelectedSubject(assignedCodes[0]);
    }
  }, [assignedCodes.join('|'), selectedSubject]);

  // Form states for adding open consultation time-blocks
  const [newSlotDay, setNewSlotDay] = useState('Monday');
  const [newSlotTime, setNewSlotTime] = useState('09:00 AM - 09:30 AM');
  const [useCustomSlot, setUseCustomSlot] = useState(false);
  const [customSlotDay, setCustomSlotDay] = useState('');
  const [customSlotTime, setCustomSlotTime] = useState('');
  const [slotCreatedFeedback, setSlotCreatedFeedback] = useState<string | null>(null);
  
  // Profile Editor state (auto-reinitialized when lecturer changes)
  const [editedBio, setEditedBio] = useState(lecturer.bio || '');
  const [editedAvatar, setEditedAvatar] = useState(lecturer.avatar || '');
  const [interests, setInterests] = useState<string[]>(lecturer.researchInterests || []);
  const [publications, setPublications] = useState<string[]>(lecturer.publications || []);
  const [newInterest, setNewInterest] = useState('');
  const [newPublication, setNewPublication] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Workstation sub-section: portfolio editor (timesheets live in sidebar + recent sessions)
  const [workstationSubTab, setWorkstationSubTab] = useState<'dashboard' | 'portfolio'>('dashboard');

  // Historical sessions from PostgreSQL (via dashboard summary)
  const loggedSessions = summary?.recentSessions ?? [];

  useEffect(() => {
    setEditedBio(lecturer.bio || '');
    setEditedAvatar(lecturer.avatar || '');
    setInterests(lecturer.researchInterests || []);
    setPublications(lecturer.publications || []);
  }, [lecturer]);
  
  // Hours logging form state
  const [logTopic, setLogTopic] = useState('');
  const [logSessionDate, setLogSessionDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [logStartTime, setLogStartTime] = useState('09:00');
  const [logEndTime, setLogEndTime] = useState('11:00');
  const [logTeachingMode, setLogTeachingMode] = useState<'Physical' | 'Online' | 'Hybrid'>('Physical');
  const [logRoom, setLogRoom] = useState('');
  const [logRemarks, setLogRemarks] = useState('');
  const [timeLoggedSuccess, setTimeLoggedSuccess] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');

  // Passcode updating state
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [passcodeSuccess, setPasscodeSuccess] = useState('');
  const [isUpdatingPasscode, setIsUpdatingPasscode] = useState(false);

  // Grade compilation inputs: studentId -> Grade
  const [gradeInputs, setGradeInputs] = useState<Record<string, { cat: string; exam: string }>>({});

  // Attendance simulation states
  const [attendanceDate, setAttendanceDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, 'present' | 'late' | 'absent'>>({});
  const [attendanceSessionOpen, setAttendanceSessionOpen] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState(false);

  const handleModuleSelection = (code: string, resetGradeInputs = false) => {
    setSelectedSubject(code);
    if (resetGradeInputs) setGradeInputs({});
    void refreshDashboard();
  };

  // Filter students who are registered for the selected subject
  const subjectStudents = students.filter(s => s.enrolledUnits.includes(selectedSubject));

  const handleGradeInputChange = (studentId: string, field: 'cat' | 'exam', value: string) => {
    setGradeInputs(prev => ({
      ...prev,
      [studentId]: {
        ...((prev[studentId]) || { cat: '', exam: '' }),
        [field]: value
      }
    }));
  };

  const handleSaveStudentGrade = (student: Student) => {
    const input = gradeInputs[student.id];
    const currentGrade = student.grades[selectedSubject] || { cat: 0, exam: 0 };
    
    // Fallback to existing grades if input fields are empty
    const catVal = input?.cat !== undefined && input.cat !== '' ? parseInt(input.cat) : currentGrade.cat;
    const examVal = input?.exam !== undefined && input.exam !== '' ? parseInt(input.exam) : currentGrade.exam;

    if (isNaN(catVal) || catVal < 0 || catVal > 30) {
      showWarning("CAT Score Error", 'Continuous Assessment Test (CAT) must be a numeric score between 0 and 30.');
      return;
    }
    if (isNaN(examVal) || examVal < 0 || examVal > 70) {
      showWarning("Exam Score Error", 'Final Exam score must be a numeric score between 0 and 70.');
      return;
    }

    onUpdateGrades(student.id, selectedSubject, { cat: catVal, exam: examVal });
    
    // Clear targeted inputs
    setGradeInputs(prev => {
      const copy = { ...prev };
      delete copy[student.id];
      return copy;
    });

    // Notify user with elegant alert alternative
    showToast(`Successfully synchronized grade for ${student.name} under module ${selectedSubject}. (CAT: ${catVal}/30, Final: ${examVal}/70)`, 'success');
  };

  const handleChangePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError('');
    setPasscodeSuccess('');
    if (!currentPasscode || !newPasscode) {
      setPasscodeError('Please fill in all passcode input fields.');
      return;
    }
    setIsUpdatingPasscode(true);
    try {
      const response = await fetch('/api/auth/change-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'lecturer',
          userId: lecturer.id,
          currentPasscode,
          newPasscode
        })
      });
      const data = await response.json();
      if (data.success) {
        setPasscodeSuccess('Your access passcode has been updated successfully!');
        setCurrentPasscode('');
        setNewPasscode('');
      } else {
        setPasscodeError(data.error || 'Failed to update passcode. Verify credentials.');
      }
    } catch (err) {
      setPasscodeError('Network connection issue. Please try again.');
    } finally {
      setIsUpdatingPasscode(false);
    }
  };

  const computedSessionDuration = useMemo(() => {
    const [sh, sm] = logStartTime.split(':').map(Number);
    const [eh, em] = logEndTime.split(':').map(Number);
    const start = (sh || 0) * 60 + (sm || 0);
    const end = (eh || 0) * 60 + (em || 0);
    const mins = end - start;
    if (mins <= 0) return 0;
    return Number((mins / 60).toFixed(2));
  }, [logStartTime, logEndTime]);

  const handleLogHoursSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assignedCodes.length === 0 || !selectedSubject) {
      showWarning("No Assigned Subjects", 'You have no assigned subjects. Ask an administrator to allocate modules first.');
      return;
    }
    if (!assignedCodes.includes(selectedSubject)) {
      showWarning("Invalid Subject", 'Selected subject is not assigned to your faculty profile.');
      return;
    }
    const hrsVal = computedSessionDuration;
    if (isNaN(hrsVal) || hrsVal <= 0 || hrsVal > 12) {
      showWarning("Lesson Duration Error", 'Set a valid start and end time so duration is between 0.5 and 12 hours.');
      return;
    }
    if (!logTopic.trim()) {
      showWarning("Topic Required", 'Please enter the lesson topic for this teaching session.');
      return;
    }

    const topicPayload = [
      logTopic.trim(),
      `[mode=${logTeachingMode}`,
      `room=${logRoom.trim() || 'N/A'}`,
      `remarks=${logRemarks.trim() || 'None'}]`,
    ].join(' | ');

    try {
      const result = await logTeachingSession({
        subjectCode: selectedSubject,
        topic: topicPayload,
        durationHours: hrsVal,
        sessionDate: logSessionDate || new Date().toLocaleDateString('en-CA'),
        sessionTime: `${logStartTime}-${logEndTime}`,
      });

      onLogHours(lecturer.id, result.loggedHours, true);
      onUpdateProfile(lecturer.id, {
        loggedHours: result.loggedHours,
        subjects: assignedCodes,
        hourlyRate: result.hourlyRate,
      });

      setLogTopic('');
      setLogRemarks('');
      setLogRoom('');
      setTimeLoggedSuccess(true);
      showToast('Teaching session saved to the database.', 'success');
      setTimeout(() => {
        setTimeLoggedSuccess(false);
      }, 2500);
    } catch (err: any) {
      showWarning("Session Log Failed", err.message || 'Could not save teaching session.');
    }
  };

  // Load existing session values on date or unit toggle
  useEffect(() => {
    setAttendanceSessionOpen(false);
    if (selectedSubject && attendanceDate) {
      const existingSession = attendanceSessions.find(
        s => s.date === attendanceDate && s.subjectCode === selectedSubject
      );
      if (existingSession) {
        const records: Record<string, 'present' | 'late' | 'absent'> = {};
        existingSession.presentStudents.forEach(id => {
          records[id] = 'present';
        });
        (existingSession.lateStudents || []).forEach(id => {
          records[id] = 'late';
        });
        existingSession.absentStudents.forEach(id => {
          records[id] = 'absent';
        });
        setAttendanceRecords(records);
      } else {
        const records: Record<string, 'present' | 'late' | 'absent'> = {};
        subjectStudents.forEach(s => {
          records[s.id] = 'present';
        });
        setAttendanceRecords(records);
      }
    }
  }, [selectedSubject, attendanceDate, attendanceSessions, students]);

  const setAttendanceStatus = (studentId: string, status: 'present' | 'late' | 'absent') => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const openAttendanceSession = () => {
    if (!selectedSubject || assignedCodes.length === 0) {
      showWarning('No Assigned Modules', 'Select one of your assigned modules before opening attendance.');
      return;
    }
    if (subjectStudents.length === 0) {
      showWarning('No Students Enrolled', 'This module has no enrolled students to mark.');
      return;
    }
    setAttendanceSessionOpen(true);
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || assignedCodes.length === 0) {
      showWarning("No Assigned Subjects", "Select an assigned subject before saving attendance.");
      return;
    }
    const presentStudentIds = subjectStudents
      .filter(s => attendanceRecords[s.id] === 'present')
      .map(s => s.id);
    const lateStudentIds = subjectStudents
      .filter(s => attendanceRecords[s.id] === 'late')
      .map(s => s.id);
    const absentStudentIds = subjectStudents
      .filter(s => attendanceRecords[s.id] === 'absent' || !attendanceRecords[s.id])
      .map(s => s.id);

    try {
      if (onSaveAttendance) {
        await onSaveAttendance(selectedSubject, attendanceDate, presentStudentIds, absentStudentIds, lateStudentIds);
      }
      await refreshDashboard();
      setAttendanceSessionOpen(false);
      setAttendanceSuccess(true);
      showToast("Attendance session saved to the database.", "success");
      setTimeout(() => {
        setAttendanceSuccess(false);
      }, 3000);
    } catch (err: any) {
      showWarning("Attendance Save Failed", err.message || "Could not save attendance session.");
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300 w-full animate-fade-in" id="lecturer-dashboard-root">
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
              <div className="w-8 h-8 bg-violet-650 rounded-lg flex items-center justify-center shrink-0">
                <School className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-black tracking-tight text-white block uppercase leading-none">ZENTI</span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block">Faculty Portal</span>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 space-y-1.5 overflow-y-auto pr-2">
              <p className="px-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Dashboard</p>
              <button type="button" onClick={() => { setActiveTab('workstation'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'workstation' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <Sliders className="w-4 h-4" />
                <span>My Workstation</span>
              </button>
              <p className="px-2 pt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Teaching</p>
              <button type="button" onClick={() => { setActiveTab('grading'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'grading' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <Award className="w-4 h-4" />
                <span>Assessment & Grading</span>
              </button>
              <button type="button" onClick={() => { setActiveTab('attendance'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'attendance' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <UserCheck className="w-4 h-4" />
                <span>Attendance</span>
              </button>
              <button type="button" onClick={() => { setActiveTab('classlist'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'classlist' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <Users className="w-4 h-4" />
                <span>Class List</span>
              </button>
              <button type="button" onClick={() => { setActiveTab('schedule'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'schedule' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <Calendar className="w-4 h-4" />
                <span>Subjects Roster</span>
              </button>
              <p className="px-2 pt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Students</p>
              <button type="button" onClick={() => { setActiveTab('lookup'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'lookup' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <GraduationCap className="w-4 h-4" />
                <span>Student Lookup</span>
              </button>
              <p className="px-2 pt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Resources</p>
              <button type="button" onClick={() => { setActiveTab('books'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'books' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <BookOpen className="w-4 h-4" />
                <span>Reading Lists</span>
              </button>
              <p className="px-2 pt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Account</p>
            </nav>

            {/* Profile Info & Logout */}
            <div className="p-4 border-t border-slate-800/60 bg-slate-950/40 space-y-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-650 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {lecturer.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-none">{lecturer.name}</h4>
                  <span className="text-[9px] text-slate-500 font-mono block mt-1">{lecturer.designatorCode}</span>
                </div>
              </div>
              <button type="button" onClick={() => { setMobileMenuOpen(false); onLogout(); }} className="w-full py-2.5 bg-slate-800 hover:bg-rose-955/30 hover:text-rose-450 text-slate-400 hover:text-white text-xs font-bold rounded-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout Portal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex flex-col border-r border-slate-100 dark:border-slate-800 shrink-0 hidden md:flex font-sans justify-between p-4 shadow-sm z-10">
        {/* Brand Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 bg-[#2563EB] rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <School className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-base font-black tracking-tight text-slate-900 dark:text-white block uppercase leading-none truncate">ZENTI ACADEMY</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">Faculty Portal</span>
            </div>
          </div>
          
          {/* Navigation Menu */}
          <nav className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-220px)]">
            <p className="px-3 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Dashboard</p>
            <button type="button" onClick={() => setActiveTab('workstation')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${activeTab === 'workstation' ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
              <Sliders className="w-4 h-4" />
              <span>My Workstation</span>
            </button>
            <p className="px-3 pt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Teaching</p>
            <button type="button" onClick={() => setActiveTab('grading')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${activeTab === 'grading' ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
              <Award className="w-4 h-4" />
              <span>Assessment & Grading</span>
            </button>
            <button type="button" onClick={() => setActiveTab('attendance')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${activeTab === 'attendance' ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
              <UserCheck className="w-4 h-4" />
              <span>Attendance</span>
            </button>
            <button type="button" onClick={() => setActiveTab('classlist')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${activeTab === 'classlist' ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
              <Users className="w-4 h-4" />
              <span>Class List</span>
            </button>
            <button type="button" onClick={() => setActiveTab('schedule')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${activeTab === 'schedule' ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
              <Calendar className="w-4 h-4" />
              <span>Subjects Roster</span>
            </button>
            <p className="px-3 pt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Students</p>
            <button type="button" onClick={() => setActiveTab('lookup')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${activeTab === 'lookup' ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
              <GraduationCap className="w-4 h-4" />
              <span>Student Lookup</span>
            </button>
            <p className="px-3 pt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Resources</p>
            <button type="button" onClick={() => setActiveTab('books')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${activeTab === 'books' ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
              <BookOpen className="w-4 h-4" />
              <span>Reading Lists</span>
            </button>
            <p className="px-3 pt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Account</p>
          </nav>
        </div>
        
        {/* Profile Info & Logout */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 shrink-0">
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              {lecturer.name.charAt(0)}
            </div>
            <div className="truncate min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-none truncate">{lecturer.name}</h4>
              <span className="text-[10px] text-slate-400 font-medium block mt-1 truncate">{lecturer.designatorCode}</span>
            </div>
          </div>
          <button type="button" onClick={onLogout} className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer">
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout Portal</span>
          </button>
        </div>
      </aside>
      
      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto bg-[#F5F7FB] dark:bg-slate-950">
        {/* TOP UTILITY BAR */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs shrink-0 font-sans sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="space-y-0.5 text-left">
              <h2 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Faculty Portal</h2>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Welcome, Prof. {lecturer.name.split(' ').pop()}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            <div className="w-full sm:w-64 md:w-80">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  placeholder="Search your students by name or admission no."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <span className="hidden sm:inline-block w-px h-6 bg-slate-200 dark:bg-slate-800"></span>
            
            {/* Notification Bell Icon */}
            <div className="relative">
              <button 
                type="button" 
                className="relative p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>

            {/* Consultation Available toggle */}
            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-1.5 shrink-0">
              <span className={`text-[10px] font-bold ${lecturer.isActive !== false ? 'text-emerald-600' : 'text-rose-600'}`}>
                {lecturer.isActive !== false ? 'Available' : 'Away'}
              </span>
              <button
                type="button"
                onClick={() => onUpdateProfile(lecturer.id, { isActive: lecturer.isActive === false })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  lecturer.isActive !== false ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
                role="switch"
                aria-checked={lecturer.isActive !== false}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    lecturer.isActive !== false ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Profile badge */}
            <div className="hidden md:flex items-center gap-3 pl-2">
              <div className="w-9 h-9 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {lecturer.name.charAt(0)}
              </div>
              <div className="text-left leading-tight">
                <span className="block text-xs font-bold text-slate-900 dark:text-white">{lecturer.name}</span>
                <span className="block text-[10px] text-slate-400 font-medium">Lecturer ({lecturer.designatorCode})</span>
              </div>
            </div>
          </div>
        </header>
        
        {/* WORKSPACE CONTENT AREA */}
        <div className="p-8 space-y-8 flex-1 bg-[#F5F7FB] dark:bg-slate-950">
          
          {/* WORKSPACE MIDDLE PANELS GRID */}
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: ACTIVE VIEW OPTIONS (TABBED) */}
            <div className={`${activeTab === 'lookup' ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-8`}>
              
              <div className="space-y-8">
                
                {/* VIEW 0: WORKSTATION (DASHBOARD B) */}
                {activeTab === 'workstation' && (
                  <div className="space-y-6">
                    <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl gap-2">
                      <button
                        type="button"
                        onClick={() => setWorkstationSubTab('dashboard')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                          workstationSubTab === 'dashboard'
                            ? 'bg-white dark:bg-slate-950 text-violet-700 dark:text-violet-400 shadow-3xs'
                            : 'text-slate-400 hover:text-slate-650'
                        }`}
                      >
                        Teaching Dashboard
                      </button>
                      <button
                        type="button"
                        onClick={() => setWorkstationSubTab('portfolio')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                          workstationSubTab === 'portfolio'
                            ? 'bg-white dark:bg-slate-950 text-violet-700 dark:text-violet-400 shadow-3xs'
                            : 'text-slate-400 hover:text-slate-650'
                        }`}
                      >
                        Research & Portfolio
                      </button>
                    </div>

                    {workstationSubTab === 'dashboard' ? (
                      dashboardLoading ? (
                        <LecturerWorkstationLoading />
                      ) : dashboardError || !summary ? (
                        <LecturerWorkstationError
                          message={dashboardError || 'Unknown error'}
                          onRetry={refreshDashboard}
                        />
                      ) : (
                        <>
                          <LecturerWorkstationDashboard
                            summary={summary}
                            timerSeconds={timerSeconds}
                            timerActive={timerActive}
                            timerMode={timerMode}
                            formatTimer={formatTimer}
                            setTimerActive={setTimerActive}
                            setTimerSeconds={setTimerSeconds}
                            onOpenAttendance={() => setActiveTab('attendance')}
                          />
                          {/* Historical teaching sessions (timesheets) */}
                          <div className="border border-slate-150 dark:border-slate-800 rounded-2xl p-5 space-y-3">
                            <div>
                              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                                Teaching Session History
                              </h3>
                              <p className="text-[11px] text-slate-500 mt-1">Logged hours and session topics from PostgreSQL.</p>
                            </div>
                            <div className="overflow-x-auto border border-slate-150 dark:border-slate-800 rounded-xl">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4">Course</th>
                                    <th className="py-3 px-4">Topic</th>
                                    <th className="py-3 px-4 text-center">Hours</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                  {loggedSessions.length === 0 ? (
                                    <tr>
                                      <td colSpan={5} className="py-8 px-4 text-center text-slate-400 italic">No teaching sessions logged yet.</td>
                                    </tr>
                                  ) : (
                                    loggedSessions.map((session) => (
                                      <tr key={session.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 font-mono">
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{session.date}</td>
                                        <td className="py-3 px-4 font-bold text-slate-850 dark:text-slate-205">{session.courseCode}</td>
                                        <td className="py-3 px-4 font-sans text-slate-700 dark:text-slate-350 truncate max-w-[150px]" title={session.topic}>{session.topic}</td>
                                        <td className="py-3 px-4 text-center font-bold">{session.hours} hrs</td>
                                        <td className="py-3 px-4 text-center">
                                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                            session.status === 'Approved'
                                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                                          }`}>
                                            {session.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      )
                    ) : (
                      <div className="space-y-4 animate-fadeIn">
                        {profileSuccess && (
                          <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 border border-emerald-100 dark:border-emerald-900/50 p-4 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Profile saved successfully.</span>
                          </div>
                        )}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            onUpdateProfile(lecturer.id, {
                              bio: editedBio,
                              avatar: editedAvatar,
                              researchInterests: interests,
                              publications: publications
                            });
                            setProfileSuccess(true);
                            setTimeout(() => setProfileSuccess(false), 3000);
                          }}
                          className="space-y-6"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Avatar URL</label>
                              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-850">
                                {editedAvatar ? (
                                  <img
                                    src={editedAvatar}
                                    alt=""
                                    className="w-16 h-16 rounded-full object-cover border-2 border-violet-500/30 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-full bg-violet-600 text-white flex items-center justify-center font-black text-xl shrink-0">
                                    {lecturer.name.charAt(0)}
                                  </div>
                                )}
                                <input
                                  type="url"
                                  value={editedAvatar}
                                  onChange={(e) => setEditedAvatar(e.target.value)}
                                  placeholder="https://…"
                                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl px-2.5 py-2 text-xs text-slate-850 dark:text-slate-200 focus:outline-hidden"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="block text-[11px] font-bold text-slate-605 dark:text-slate-400 uppercase tracking-wider">Professional Biography</label>
                              <textarea
                                rows={3}
                                value={editedBio}
                                onChange={(e) => setEditedBio(e.target.value)}
                                placeholder="Academic focus and teaching experience…"
                                className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-750 rounded-xl p-2.5 text-xs text-slate-850 dark:text-slate-200 focus:outline-hidden resize-none leading-relaxed"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 dark:border-slate-805 pt-6">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <label className="text-[11px] font-bold text-slate-605 dark:text-slate-450 uppercase tracking-wider flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                                  <span>Research Interests</span>
                                </label>
                                <span className="text-[10px] font-bold text-slate-400">{interests.length}</span>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newInterest}
                                  onChange={(e) => setNewInterest(e.target.value)}
                                  placeholder="Add interest…"
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl px-2.5 py-2 text-xs focus:outline-hidden"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (newInterest.trim()) {
                                        setInterests(prev => [...prev, newInterest.trim()]);
                                        setNewInterest('');
                                      }
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (newInterest.trim()) {
                                      setInterests(prev => [...prev, newInterest.trim()]);
                                      setNewInterest('');
                                    }
                                  }}
                                  className="bg-violet-50 text-violet-700 hover:bg-violet-100 px-3 py-2 rounded-xl font-bold text-xs border border-violet-100 cursor-pointer"
                                >
                                  Add
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-850">
                                {interests.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 italic">No research interests listed.</p>
                                ) : (
                                  interests.map((interest, idx) => (
                                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold border border-violet-100">
                                      <span>{interest}</span>
                                      <button type="button" onClick={() => setInterests(prev => prev.filter((_, i) => i !== idx))} className="hover:bg-violet-200 p-0.5 rounded-full text-violet-500 shrink-0 cursor-pointer" title="Remove">
                                        <X className="w-3 h-3" />
                                      </button>
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <label className="text-[11px] font-bold text-slate-605 dark:text-slate-450 uppercase tracking-wider flex items-center gap-1">
                                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Publications</span>
                                </label>
                                <span className="text-[10px] font-bold text-slate-400">{publications.length}</span>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newPublication}
                                  onChange={(e) => setNewPublication(e.target.value)}
                                  placeholder="Add publication citation…"
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl px-2.5 py-2 text-xs focus:outline-hidden"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (newPublication.trim()) {
                                        setPublications(prev => [...prev, newPublication.trim()]);
                                        setNewPublication('');
                                      }
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (newPublication.trim()) {
                                      setPublications(prev => [...prev, newPublication.trim()]);
                                      setNewPublication('');
                                    }
                                  }}
                                  className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-2 rounded-xl font-bold text-xs border border-indigo-100 cursor-pointer"
                                >
                                  Add
                                </button>
                              </div>
                              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                {publications.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 italic">No publications listed.</p>
                                ) : (
                                  publications.map((pub, idx) => (
                                    <div key={idx} className="flex justify-between items-start p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs">
                                      <span className="text-[11px] leading-snug mr-3 break-words flex-1 font-mono">{pub}</span>
                                      <button type="button" onClick={() => setPublications(prev => prev.filter((_, i) => i !== idx))} className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg shrink-0 cursor-pointer" title="Remove">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-slate-105 dark:border-slate-800 pt-5 flex justify-end">
                            <button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-md">
                              <Save className="w-4 h-4" />
                              <span>Save Portfolio</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )}

            {activeTab === 'grading' && (
              <LecturerAssessmentWorkspace
                lecturerId={lecturer.id}
                assignedSubjects={assignedSubjects}
                selectedSubject={selectedSubject}
                onSelectSubject={(code) => handleModuleSelection(code, true)}
                students={students}
                onUpdateGrades={onUpdateGrades}
                showToast={showToast}
                showWarning={showWarning}
              />
            )}

            {activeTab === 'classlist' && (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      Class List
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Students enrolled in your selected module.</p>
                  </div>
                  <select
                    value={selectedSubject}
                    onChange={(e) => handleModuleSelection(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                    disabled={assignedCodes.length === 0}
                  >
                    {assignedCodes.length === 0 ? (
                      <option value="">No assigned modules</option>
                    ) : (
                      assignedSubjects.map((subject) => (
                        <option key={subject.code} value={subject.code}>
                          {subject.code} – {subject.title}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                {subjectStudents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                    <p className="text-sm font-semibold text-slate-700">No students assigned.</p>
                    <p className="mt-1 text-xs text-slate-500">No enrolled students for this module yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Admission Number</th>
                          <th className="px-4 py-3">Student Name</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectStudents
                          .filter((student) => {
                            const term = headerSearch.trim().toLowerCase();
                            if (!term) return true;
                            return student.name.toLowerCase().includes(term) || student.admissionNo.toLowerCase().includes(term);
                          })
                          .map((student) => (
                          <tr key={student.id} className="border-b border-slate-100 last:border-0">
                            <td className="px-4 py-3 font-mono font-semibold text-slate-800">{student.admissionNo}</td>
                            <td className="px-4 py-3 font-medium text-slate-800">{student.name}</td>
                            <td className="px-4 py-3 text-slate-600">{student.email}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${student.grades[selectedSubject] ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                {student.grades[selectedSubject] ? 'Graded' : 'Pending grades'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="space-y-8">
                {/* 2.1 SUBJECTS TIMETABLE */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5 font-display">
                      <Calendar className="w-5 h-5 text-blue-600 animate-pulse" />
                      Assigned Faculty Subjects & Timetable Rosters
                    </h2>
                    <p className="text-xs text-slate-500">Review schedule rosters and academic intake parameters for subjects allocated under your ID.</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {assignedCodes.length === 0 ? (
                      <div className="sm:col-span-2 border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
                        No subjects assigned yet. Allocations from <span className="font-mono">lecturer_subjects</span> will appear here.
                      </div>
                    ) : (
                      assignedCodes.map(code => {
                      const matchedStudents = students.filter(
                        s => s.enrolledUnits.includes(code)
                      );

                      return (
                        <div
                          key={code}
                          className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-start gap-4"
                        >
                          <div className="w-10 h-10 bg-blue-50 text-blue-800 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border border-blue-105">
                            {code.split("-")[0] || code}
                          </div>

                          <div className="space-y-2">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                {code}
                              </span>
                              <h4 className="font-extrabold text-slate-800 text-sm">
                                {resolveSubjectTitle(code)}
                              </h4>
                            </div>

                            <div className="text-[11px] text-slate-500 space-y-1">
                              <p>Students Enrolled: {matchedStudents.length}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                    )}
                  </div>
                </div>
                {/* 2.2 OFFICE HOURS PLANNER */}
                <div className="border-t border-slate-150 pt-8 space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5 font-display">
                      <Clock className="w-5 h-5 text-blue-600" />
                      Office Hours Consultation Slots Planner
                    </h2>
                    <p className="text-xs text-slate-500">Add, delete, or manage 30-minute consultation slot availability. Students use this log to book homework and revision sessions.</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    
                    {/* Column 1: Add New Slot Form */}
                    <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-5 space-y-4">
                      <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Plus className="w-4 h-4 text-blue-600" />
                        Add Availability Slot
                      </h3>

                      <div className="space-y-3 text-xs">
                        <div className="space-y-1">
                          <label className="block font-semibold text-slate-705">Choose Day</label>
                          <select 
                            value={newSlotDay}
                            onChange={(e) => {
                              setNewSlotDay(e.target.value);
                              if (e.target.value === 'custom') {
                                setUseCustomSlot(true);
                              } else {
                                setUseCustomSlot(false);
                              }
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-hidden"
                          >
                            <option value="Monday">Monday</option>
                            <option value="Tuesday">Tuesday</option>
                            <option value="Wednesday">Wednesday</option>
                            <option value="Thursday">Thursday</option>
                            <option value="Friday">Friday</option>
                            <option value="custom">-- Custom Day --</option>
                          </select>
                        </div>

                        {useCustomSlot && (
                          <div className="space-y-1">
                            <label className="block font-semibold text-slate-705">Type Custom Day</label>
                            <input 
                              type="text"
                              value={customSlotDay}
                              onChange={(e) => setCustomSlotDay(e.target.value)}
                              placeholder="e.g. Saturday"
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-hidden"
                            />
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="block font-semibold text-slate-705">Choose Time Frame</label>
                          <select 
                            value={newSlotTime}
                            onChange={(e) => {
                              setNewSlotTime(e.target.value);
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-hidden"
                          >
                            <option value="09:00 AM - 09:30 AM">09:00 AM - 09:30 AM</option>
                            <option value="09:30 AM - 10:00 AM">09:30 AM - 10:00 AM</option>
                            <option value="10:00 AM - 10:30 AM">10:00 AM - 10:30 AM</option>
                            <option value="10:30 AM - 11:00 AM">10:30 AM - 11:00 AM</option>
                            <option value="11:00 AM - 11:30 AM">11:00 AM - 11:30 AM</option>
                            <option value="11:30 AM - 12:00 PM">11:30 AM - 12:00 PM</option>
                            <option value="02:00 PM - 02:30 PM">02:00 PM - 02:30 PM</option>
                            <option value="02:30 PM - 03:00 PM">02:30 PM - 03:00 PM</option>
                            <option value="custom">-- Custom Time Frame --</option>
                          </select>
                        </div>

                        {newSlotTime === 'custom' && (
                          <div className="space-y-1">
                            <label className="block font-semibold text-slate-705">Type Custom Hour Block</label>
                            <input 
                              type="text"
                              value={customSlotTime}
                              onChange={(e) => setCustomSlotTime(e.target.value)}
                              placeholder="e.g. 04:30 PM - 05:00 PM"
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-hidden"
                            />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const finalDay = newSlotDay === 'custom' ? customSlotDay : newSlotDay;
                            const finalTime = newSlotTime === 'custom' ? customSlotTime : newSlotTime;

                            if (!finalDay.trim() || !finalTime.trim()) {
                              showWarning("Slot Info Required", 'Please provide valid day and time information.');
                              return;
                            }

                            onAddOfficeHourSlot?.(lecturer.id, finalDay, finalTime);
                            
                            // reset states
                            if (newSlotDay === 'custom') setCustomSlotDay('');
                            if (newSlotTime === 'custom') setCustomSlotTime('');
                            
                            setSlotCreatedFeedback(`Slot created on ${finalDay} at ${finalTime}!`);
                            setTimeout(() => setSlotCreatedFeedback(null), 3500);
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold p-2.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer mt-2.5"
                        >
                          Publish Available Slot
                        </button>

                        {slotCreatedFeedback && (
                          <p className="bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-100 font-bold text-center text-[11px] animate-fade-in mt-2 gap-1 flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {slotCreatedFeedback}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Column 2 & 3: Calendar Slots Roster */}
                    <div className="md:col-span-2 space-y-4">
                      {/* Active Bookings list */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Active Student Consultation Sessions
                        </h4>

                        {(() => {
                          const bookedList = (lecturer.officeHours || []).filter(s => s.status === 'booked');
                          if (bookedList.length === 0) {
                            return (
                              <div className="bg-slate-50 border border-slate-100 text-center text-xs text-slate-400 p-6 rounded-xl italic">
                                No active consultations booked by students. Available times are published on the students portal.
                              </div>
                            );
                          }

                          return (
                            <div className="grid sm:grid-cols-2 gap-3.5">
                              {bookedList.map(s => (
                                <div key={s.id} className="bg-white border hover:border-slate-350 rounded-xl p-3.5 flex flex-col justify-between space-y-3 shadow-2xs">
                                  <div className="flex justify-between items-start gap-1">
                                    <div className="space-y-0.5">
                                      <span className="text-[8.5px] uppercase font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 font-mono">
                                        Reserved Session
                                      </span>
                                      <h5 className="font-extrabold text-slate-850 text-xs mt-1.5 flex items-center gap-1">
                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                        {s.studentName}
                                      </h5>
                                      <p className="text-[10px] text-slate-450 font-mono">{s.studentEmail}</p>
                                    </div>
                                    
                                    <div className="text-right text-[10px] font-bold text-slate-700">
                                      <p>{s.day}</p>
                                      <p className="text-blue-600 font-mono text-[9px]">{s.time}</p>
                                    </div>
                                  </div>

                                  {s.studentNotes && (
                                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-[10px] text-slate-600">
                                      <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 block mb-0.5">Focus Inquiry Notes:</span>
                                      "{s.studentNotes}"
                                    </div>
                                  )}

                                  <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-50">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const confirmed = await showConfirm({
                                          title: 'Cancel Appointment',
                                          message: 'Cancel this student appointment and return this slot to available?',
                                          confirmText: 'Cancel Booking',
                                          variant: 'warning'
                                        });
                                        if (confirmed) {
                                          onCancelOfficeHour?.(lecturer.id, s.id, false);
                                        }
                                      }}
                                      className="px-2.5 py-1.5 border border-red-250 hover:bg-red-50 text-red-650 hover:text-red-700 font-bold text-[9.5px] uppercase rounded-lg transition-all cursor-pointer"
                                    >
                                      Cancel Booking
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Open Active Times list */}
                      <div className="space-y-3 pt-2">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Unbooked Published Times
                        </h4>

                        {(() => {
                          const availableList = (lecturer.officeHours || []).filter(s => s.status === 'available');
                          if (availableList.length === 0) {
                            return (
                              <div className="bg-slate-50 border border-slate-100 text-center text-xs text-slate-400 p-4 rounded-xl italic">
                                No open available slots listed. Use the builder form on the left to add office hour consultation hours.
                              </div>
                            );
                          }

                          return (
                            <div className="flex flex-wrap gap-2">
                              {availableList.map(s => (
                                <div key={s.id} className="bg-emerald-50/20 border border-emerald-100 rounded-lg pl-3 pr-1.5 py-1.5 flex items-center gap-3.5 text-xs text-slate-750">
                                  <div className="leading-tight">
                                    <span className="font-extrabold text-slate-800">{s.day}</span>
                                    <span className="text-[10.5px] text-slate-500 font-semibold block">{s.time}</span>
                                  </div>
                                  
                                  <button
                                    type="button"
                                    onClick={async () => {
                                       const confirmed = await showConfirm({
                                         title: 'Delete Office Hour Slot',
                                         message: 'Delete this available slot completely?',
                                         confirmText: 'Delete Slot',
                                         variant: 'danger'
                                       });
                                       if (confirmed) {
                                         onCancelOfficeHour?.(lecturer.id, s.id, true);
                                       }
                                     }}
                                    className="p-1 hover:bg-red-105 text-red-650 hover:text-red-700 rounded-md transition-all cursor-pointer"
                                    title="Delete custom slot"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: ATTENDANCE TRACKER */}
            {activeTab === 'attendance' && (
              <div className="space-y-6">
                
                {/*  SEMESTER STUDENT ATTENDANCE TREND LINE CHART */}
                {selectedSubject && (
                  <div className="bg-white border border-slate-150 rounded-2xl p-4 md:p-5 shadow-3xs space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-4.5 h-4.5 text-blue-600" />
                          <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest font-mono">
                            Semester Attendance Participation Trend
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                          Weekly progression of class attendance rates for <span className="font-semibold text-slate-700 font-mono">{selectedSubject}</span> ({resolveSubjectTitle(selectedSubject) || 'Selected Module'}) against registration limits.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[9.5px] font-bold font-mono">
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          Present Marked
                        </span>
                        <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-150">
                          Min Req: 75%
                        </span>
                      </div>
                    </div>

                    {(() => {
                      const totalStudentsCount = subjectStudents.length;
                      const recordedRates = subjectStudents
                        .map((s) => s.attendance?.[selectedSubject])
                        .filter((v): v is number => typeof v === "number");

                      const classAttendanceAverage =
                        recordedRates.length > 0
                          ? Math.round(
                              recordedRates.reduce((sum, val) => sum + val, 0) /
                                recordedRates.length
                            )
                          : null;

                      const checkedPresentCount = subjectStudents.filter(
                        (s) => attendanceRecords[s.id] === 'present' || attendanceRecords[s.id] === 'late'
                      ).length;
                      const hasActiveInteraction =
                        Object.keys(attendanceRecords).length > 0;
                      const liveSessionRate =
                        totalStudentsCount > 0 && hasActiveInteraction
                          ? Math.round(
                              (checkedPresentCount / totalStudentsCount) * 100
                            )
                          : null;

                      const studentsCleared =
                        recordedRates.length > 0
                          ? Math.round(
                              (recordedRates.filter((val) => val >= 75).length /
                                recordedRates.length) *
                                100
                            )
                          : null;

                      const pastSessions = (attendanceSessions || [])
                        .filter((s) => s.subjectCode === selectedSubject)
                        .slice()
                        .sort((a, b) => a.date.localeCompare(b.date));

                      const trendData = pastSessions.map((session) => {
                          const total =
                          (session.presentStudents?.length || 0) +
                          (session.lateStudents?.length || 0) +
                          (session.absentStudents?.length || 0);
                        const rate =
                          total > 0
                            ? Math.round(
                                (((session.presentStudents?.length || 0) + (session.lateStudents?.length || 0)) / total) *
                                  100
                              )
                            : 0;
                        return {
                          week: session.date,
                          "Participation Rate": rate,
                          "Minimum Threshold": 75,
                          "Class Average": classAttendanceAverage ?? rate,
                        };
                      });

                      if (totalStudentsCount === 0) {
                        return (
                          <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="font-semibold text-xs text-slate-700">No student enrollment registered for {selectedSubject}.</p>
                            <p className="text-[10px] mt-1 text-slate-450">Trend visualizers require active student registries to compute rolling averages.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                          
                          {/* Live interactive metrics */}
                          <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-3 bg-slate-50 border border-slate-150 p-4 rounded-xl">
                            <div className="space-y-0.5">
                              <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Cohort Size</span>
                              <span className="block text-base font-extrabold text-slate-800 font-mono">{totalStudentsCount} Students</span>
                              <span className="block text-[10px] text-slate-500">Currently enrolled</span>
                            </div>
                            <div className="space-y-0.5 border-t lg:border-t lg:border-l-0 border-l border-slate-200 pt-2 lg:pt-2 pl-3 lg:pl-0">
                              <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono">Semester Cum. Average</span>
                              <span className="block text-base font-extrabold text-blue-600 font-mono">
                                {classAttendanceAverage !== null ? `${classAttendanceAverage}%` : "—"}
                              </span>
                              <span className="block text-[10px] text-slate-500">
                                {recordedRates.length > 0
                                  ? `${recordedRates.length} recorded rate${recordedRates.length === 1 ? "" : "s"}`
                                  : "No rates in student_attendance yet"}
                              </span>
                            </div>
                            <div className="space-y-0.5 border-t border-slate-100 pt-2 col-span-2 lg:col-span-1">
                              <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono">Exam Attendance clearance</span>
                              <span className="block text-base font-extrabold text-emerald-600 font-mono">
                                {studentsCleared !== null ? `${studentsCleared}% Cleared` : "—"}
                              </span>
                              <span className="block text-[10px] text-slate-500">Satisfy standard hours (≥75%)</span>
                            </div>
                            <div className="space-y-0.5 border-t border-slate-100 pt-2 col-span-2 lg:col-span-1">
                              <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono">Live Session Rate</span>
                              <span className="block text-base font-extrabold text-indigo-600 font-mono">
                                {liveSessionRate !== null ? `${liveSessionRate}%` : "—"}
                              </span>
                              <span className="block text-[10px] text-slate-500">
                                {hasActiveInteraction ? "Recalculating live roll call" : "Awaiting roll call inputs"}
                              </span>
                            </div>
                          </div>

                          {/* Recharts Line Chart */}
                          <div className="lg:col-span-9 bg-white border border-slate-150/80 rounded-xl p-3 h-64 shadow-xs">
                            {trendData.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-slate-400">
                                <Activity className="w-8 h-8 opacity-40" />
                                <p className="text-xs font-semibold text-slate-600">
                                  No attendance sessions recorded yet
                                </p>
                                <p className="text-[10px] max-w-sm">
                                  Submit a roll-call below to plot participation rates from PostgreSQL attendance_sessions.
                                </p>
                              </div>
                            ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={trendData}
                                margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis 
                                  dataKey="week" 
                                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }} 
                                  axisLine={{ stroke: '#cbd5e1' }}
                                  tickLine={{ stroke: '#cbd5e1' }}
                                />
                                <YAxis 
                                  domain={[0, 100]}
                                  ticks={[0, 20, 40, 60, 75, 80, 100]}
                                  tick={{ fill: '#64748b', fontSize: 9 }} 
                                  axisLine={{ stroke: '#cbd5e1' }}
                                  tickLine={{ stroke: '#cbd5e1' }}
                                />
                                <Tooltip
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="bg-slate-900 border border-slate-850 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 font-sans">
                                          <p className="font-extrabold font-mono text-xs text-blue-400">{data.week}</p>
                                          <div className="flex justify-between items-center gap-6 text-[11px] pt-1 border-t border-slate-800">
                                            <span className="text-slate-400 font-medium">Participation Rate:</span>
                                            <span className="font-mono font-bold text-blue-400 text-sm">{payload[0].value}%</span>
                                          </div>
                                          {payload[1] && (
                                            <div className="flex justify-between items-center gap-6 text-[11px]">
                                              <span className="text-slate-400 font-medium font-sans">Semester Average benchmark:</span>
                                              <span className="font-mono text-slate-300 font-semibold">{payload[1].value}%</span>
                                            </div>
                                          )}
                                          <div className="flex justify-between items-center gap-6 text-[11px]">
                                            <span className="text-rose-400 font-bold font-mono">Academic Pass threshold:</span>
                                            <span className="text-rose-450 font-black">75%</span>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Legend 
                                  wrapperStyle={{ fontSize: 9.5, fontWeight: 700, fontFamily: 'monospace' }} 
                                  verticalAlign="top"
                                  height={36}
                                />
                                <ReferenceLine 
                                  y={75} 
                                  stroke="#ef4444" 
                                  strokeDasharray="4 4" 
                                  strokeWidth={1.5}
                                  label={{ value: 'Clearance Guard (75%)', fill: '#ef4444', position: 'insideBottomRight', fontSize: 9, fontWeight: 800, fontFamily: 'monospace' }} 
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="Participation Rate" 
                                  stroke="#2563eb" 
                                  strokeWidth={3} 
                                  activeDot={{ r: 6, fill: '#1d4ed8' }}
                                  dot={{ r: 4, stroke: '#2563eb', strokeWidth: 1.5, fill: '#ffffff' }}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="Class Average" 
                                  stroke="#a8a29e" 
                                  strokeWidth={1.5} 
                                  strokeDasharray="5 5" 
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                            )}
                          </div>

                        </div>
                      );
                    })()}

                  </div>
                )}

                <form onSubmit={handleSaveAttendance} className="space-y-6">
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-105 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-800">Roll-call Session Attendance Registry</h2>
                      <p className="text-xs text-slate-500">Track and submit student presence rates for auditing internal hours logs.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <label htmlFor="att-date" className="text-xs text-slate-500 font-bold">Session Date:</label>
                        <input
                          id="att-date"
                          type="date"
                          value={attendanceDate}
                          onChange={(e) => setAttendanceDate(e.target.value)}
                          className="bg-white border border-slate-200 rounded p-1.5 text-xs focus:outline-hidden"
                          required
                        />
                      </div>

                      <select
                        value={selectedSubject}
                        onChange={(e) => { handleModuleSelection(e.target.value); setAttendanceRecords({}); setAttendanceSessionOpen(false); }}
                        className="bg-white border border-slate-200 rounded p-1.5 text-xs text-slate-800 font-bold focus:outline-hidden"
                        title="Choose active class"
                        disabled={assignedCodes.length === 0}
                      >
                       {assignedCodes.length === 0 ? (
                          <option value="">No assigned subjects</option>
                        ) : (
                          assignedCodes.map(s => (
                            <option key={s} value={s}>{subjectLabel(s)}</option>
                          ))
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={openAttendanceSession}
                        disabled={assignedCodes.length === 0 || subjectStudents.length === 0}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {attendanceSessionOpen ? 'Session Open' : 'Open Session'}
                      </button>
                    </div>
                  </div>

                  {attendanceSuccess && (
  <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 animate-bounce">
    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
    <span>Attendance session records locked and uploaded successfully!</span>
  </div>
)}
                  {subjectStudents.length === 0 ? (
                    <p className="text-slate-400 italic text-xs py-8 text-center">Select an active class with registered students.</p>
                  ) : !attendanceSessionOpen ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                      <UserCheck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">Attendance session is closed.</p>
                      <p className="mt-1 text-xs text-slate-500">Open the session to mark Present, Late, or Absent.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white">
                        {subjectStudents.map((s) => {
                          const status = attendanceRecords[s.id] || 'absent';
                          return (
                            <div key={s.id} className="p-3.5 flex justify-between items-center text-xs hover:bg-slate-50/30">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-800 text-smblock">{s.name}</span>
                                <span className="text-slate-400 font-mono text-[10px] block">{s.admissionNo} • Registered</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {([
                                  ['present', 'Present', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
                                  ['late', 'Late', 'bg-amber-50 text-amber-700 border-amber-200'],
                                  ['absent', 'Absent', 'bg-rose-50 text-rose-700 border-rose-200'],
                                ] as const).map(([value, label, activeClass]) => (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => setAttendanceStatus(s.id, value)}
                                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all ${status === value ? activeClass : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                                  >
                                    {status === value ? '✓ ' : ''}{label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-xl text-xs w-full flex items-center justify-center gap-1 tracking-wide cursor-pointer"
                      >
                        Submit Session Attendance Roll
                      </button>
                    </div>
                  )}

                </form>

                {/* VISUAL ATTENDANCE HISTORY LIST */}
                {selectedSubject && (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5 font-mono">
                      <Calendar className="w-4 h-4 text-blue-600 animate-pulse" />
                      <span>Saved Roll-Call Logs: {selectedSubject}</span>
                    </h4>
                    {(() => {
                      const pastSessions = (attendanceSessions || []).filter(
                        s => s.subjectCode === selectedSubject
                      );
                      if (pastSessions.length === 0) {
                        return (
                          <p className="text-xs text-slate-405 italic py-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-center">
                            No attendance logs have been recorded for this unit code yet.
                          </p>
                        );
                      }
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {pastSessions.map(session => {
                            const lateCount = session.lateStudents?.length || 0;
                            const total = session.presentStudents.length + lateCount + session.absentStudents.length;
                            const rate = total > 0 ? Math.round(((session.presentStudents.length + lateCount) / total) * 100) : 0;
                            return (
                              <div 
                                key={session.id} 
                                onClick={() => {
                                  setAttendanceDate(session.date);
                                }}
                                className="bg-white hover:bg-slate-50 border border-slate-150 rounded-2xl p-4 flex justify-between items-center transition-all cursor-pointer hover:border-slate-350 shadow-2xs"
                              >
                                <div>
                                  <span className="text-xs font-bold text-slate-850 block">{session.date}</span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {session.presentStudents.length} present, {lateCount} late, {session.absentStudents.length} absent ({total} total)
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full uppercase tracking-wider ${
                                    rate >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                    rate >= 75 ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                    'bg-rose-50 text-rose-700 border border-rose-100'
                                  }`}>
                                    {rate}%
                                  </span>
                                  <span className="block text-[8px] text-slate-400 mt-1.5 uppercase font-bold tracking-wider">Click to Edit</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

              </div>
            )}

            {activeTab === 'lookup' && (
              <StudentLookupPage lecturer={lecturer} />
            )}

            {activeTab === 'books' && (
              <LecturerBooksView
                lecturer={lecturer}
                books={books}
                readingLists={readingLists}
                teacherResources={teacherResources}
                bookRequests={bookRequests}
                onUpdateReadingList={onUpdateReadingList}
                onReserveTeacherResource={onReserveTeacherResource}
                onReleaseTeacherResource={onReleaseTeacherResource}
                onAddBookRequest={onAddBookRequest}
              />
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: TIMECARDS AND HOUR LOGGING */}
        {activeTab !== 'lookup' && (
          <div className="lg:col-span-4 bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-6">
          
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-600" />
              Lecturer Internal Hours Submitter
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Increment teaching hours based on weekly lessons.</p>
          </div>

          {timeLoggedSuccess && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-3 rounded-xl text-xs font-medium">
              Class session locked into payroll queue!
            </div>
          )}

          <form onSubmit={handleLogHoursSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="sidebar-log-class" className="block text-[11px] font-bold text-slate-650">Module</label>
              <select
                id="sidebar-log-class"
                value={selectedSubject}
                onChange={(e) => handleModuleSelection(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-hidden"
                required
                disabled={assignedCodes.length === 0}
              >
                {assignedCodes.length === 0 ? (
                  <option value="">No assigned subjects</option>
                ) : (
                  assignedCodes.map(s => (
                    <option key={s} value={s}>{subjectLabel(s)}</option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="sidebar-log-date" className="block text-[11px] font-bold text-slate-650">Date</label>
                <input
                  id="sidebar-log-date"
                  type="date"
                  value={logSessionDate}
                  onChange={(e) => setLogSessionDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-850 focus:outline-hidden"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-650">Duration</label>
                <output className={`block w-full rounded-lg border p-2.5 text-xs font-bold ${computedSessionDuration > 0 ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                  {computedSessionDuration > 0 ? `${computedSessionDuration} hour${computedSessionDuration === 1 ? '' : 's'} (automatic)` : 'Set a valid time range'}
                </output>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="sidebar-log-start" className="block text-[11px] font-bold text-slate-650">Start Time</label>
                <input id="sidebar-log-start" type="time" value={logStartTime} onChange={(e) => setLogStartTime(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-850 focus:outline-hidden" required />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="sidebar-log-end" className="block text-[11px] font-bold text-slate-650">End Time</label>
                <input id="sidebar-log-end" type="time" value={logEndTime} onChange={(e) => setLogEndTime(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-850 focus:outline-hidden" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="sidebar-log-room" className="block text-[11px] font-bold text-slate-650">Room</label>
                <input id="sidebar-log-room" type="text" value={logRoom} onChange={(e) => setLogRoom(e.target.value)} placeholder={logTeachingMode === 'Online' ? 'Online / virtual room' : 'e.g. Lab 2'} className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-850 focus:outline-hidden" required />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="sidebar-log-mode" className="block text-[11px] font-bold text-slate-650">Mode</label>
                <select id="sidebar-log-mode" value={logTeachingMode} onChange={(e) => setLogTeachingMode(e.target.value as 'Physical' | 'Online' | 'Hybrid')} className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-850 focus:outline-hidden">
                  <option value="Physical">Physical</option>
                  <option value="Online">Online</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sidebar-log-topic" className="block text-[11px] font-bold text-slate-650">Topic</label>
              <input id="sidebar-log-topic" type="text" value={logTopic} onChange={(e) => setLogTopic(e.target.value)} placeholder="Introduced Big-O notation and graph theory" className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-850 focus:outline-hidden" required />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sidebar-log-remarks" className="block text-[11px] font-bold text-slate-650">Remarks</label>
              <textarea id="sidebar-log-remarks" value={logRemarks} onChange={(e) => setLogRemarks(e.target.value)} placeholder="Optional notes about the session" rows={3} className="w-full resize-y rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-850 focus:outline-hidden" />
            </div>

            <button
              type="submit"
              disabled={assignedCodes.length === 0 || isLogging || computedSessionDuration <= 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
            >
              {isLogging ? 'Saving Session…' : 'Save Teaching Session'}
            </button>
          </form>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-[11px] text-slate-605 space-y-2">
            <span className="font-bold text-slate-800 block text-xs">Payout Calculations Detail:</span>
            <div className="flex justify-between">
              <span>Your Hourly Rate:</span>
              <span className="font-bold text-slate-900">KES {liveHourlyRate.toLocaleString()} / hr</span>
            </div>
            <div className="flex justify-between">
              <span>Logged Hours:</span>
              <span className="font-bold text-slate-900">{liveLoggedHours} Hrs</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
              <span>Calculated Total:</span>
              <span>KES {liveEstimatedPayout.toLocaleString()}</span>
            </div>
          </div>
        </div>
        )}

      </div>

      {/* CHANGE PASSCODE SECURITY MODAL */}
      {isPasscodeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in" id="passcode-modal-overlay">
          <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden flex flex-col transform transition-all">
            {/* Header */}
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-150 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wide">Change Portal Passcode</h3>
              </div>
              <button
                type="button"
                onClick={() => { setIsPasscodeModalOpen(false); setPasscodeError(''); setPasscodeSuccess(''); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-205 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePasscodeSubmit} className="flex-1 flex flex-col">
              {/* Form Body */}
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  You can change your portal passcode below to secure your account. Please keep this passcode private and secure.
                </p>

                {passcodeError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-[11px] text-rose-750 font-medium">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{passcodeError}</span>
                  </div>
                )}

                {passcodeSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-[11px] text-emerald-750 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{passcodeSuccess}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Passcode</label>
                  <input
                    type="password"
                    required
                    value={currentPasscode}
                    onChange={(e) => setCurrentPasscode(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-105 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">New Secure Passcode</label>
                  <input
                    type="password"
                    required
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                    placeholder="Enter new passcode"
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-105 font-mono"
                  />
                </div>
              </div>

              {/* Action Bar */}
              <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-150 dark:border-slate-800 flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setIsPasscodeModalOpen(false); setPasscodeError(''); setPasscodeSuccess(''); }}
                  className="bg-white hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
                >
                  Close Window
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPasscode}
                  className="bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50"
                >
                  {isUpdatingPasscode ? 'Updating passcode...' : 'Update Passcode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div></div></div>
  );
}
