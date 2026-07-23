import React, { useState, useEffect } from 'react';
import { useNotification } from './notifications';
import { 
  Users, Award, Calendar, BookOpen, Clock, 
  CheckCircle2, Save, FileSpreadsheet, Plus, 
  DollarSign, Activity, AlertCircle, Sparkles, LogOut, ChevronDown, Trash2, User, Sliders, X, Menu,
  Megaphone, UserCheck, MapPin, School, ArrowRight
 } from 'lucide-react';
import { Lecturer, Student, Grade, Course, StockItem, Book, LMSReadingList, TeacherResource, BookRequest, AttendanceSession } from '../types';
import { subjectMap } from '../data';
import GlobalSearchBar from './GlobalSearchBar';
import LecturerBooksView from './LecturerBooksView';
import StudentAdmissionDossierStation from './StudentAdmissionDossierStation';
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
  onLogHours: (lecturerId: string, hours: number) => void;
  onUpdateProfile: (lecturerId: string, updatedFields: Partial<Lecturer>) => void;
  onReserveTeacherResource: (resourceId: string, lecturerId: string, lecturerName: string) => void;
  onReleaseTeacherResource: (resourceId: string) => void;
  onAddBookRequest: (request: Omit<BookRequest, 'id' | 'date' | 'status'>) => void;
  attendanceSessions?: AttendanceSession[];
  onSaveAttendance?: (subjectCode: string, date: string, presentStudentIds: string[], absentStudentIds: string[]) => void;
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
  const [activeTab, setActiveTab] = useState<'workstation' | 'grading' | 'schedule' | 'attendance' | 'profile' | 'books'>('workstation');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

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

  const [selectedSubject, setSelectedSubject] = useState<string>(
  lecturer.subjects?.[0] ?? ''
);
  const [showBellCurve, setShowBellCurve] = useState(false);

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

  // Profile sub-tab selection state
  const [profileSubTab, setProfileSubTab] = useState<'timesheets' | 'portfolio'>('timesheets');

  // Local logged sessions list state
  const [loggedSessions, setLoggedSessions] = useState<{
    id: string;
    date: string;
    courseCode: string;
    topic: string;
    hours: number;
    status: 'Pending' | 'Approved';
  }[]>(() => {
    const saved = localStorage.getItem(`logged_sessions_${lecturer.id}`);
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', date: '2026-07-06', courseCode: lecturer.subjects?.[0] || 'CS-101-Web', topic: 'Course introduction & syllabus walkthrough', hours: 2, status: 'Approved' },
      { id: '2', date: '2026-07-08', courseCode: lecturer.subjects?.[0] || 'CS-101-Web', topic: 'DOM structure manipulation & event listeners', hours: 3, status: 'Approved' },
      { id: '3', date: '2026-07-10', courseCode: lecturer.subjects?.[1] || 'DS-202-ML', topic: 'Supervised vs Unsupervised learning methods introduction', hours: 2.5, status: 'Pending' },
    ];
  });

  useEffect(() => {
    localStorage.setItem(`logged_sessions_${lecturer.id}`, JSON.stringify(loggedSessions));
  }, [loggedSessions, lecturer.id]);

  useEffect(() => {
    setEditedBio(lecturer.bio || '');
    setEditedAvatar(lecturer.avatar || '');
    setInterests(lecturer.researchInterests || []);
    setPublications(lecturer.publications || []);
  }, [lecturer]);
  
  // Hours logging form state
  const [logSessionHours, setLogSessionHours] = useState('');
  const [logTopic, setLogTopic] = useState('');
  const [timeLoggedSuccess, setTimeLoggedSuccess] = useState(false);

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
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, boolean>>({});
  const [attendanceSuccess, setAttendanceSuccess] = useState(false);

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
        if (onUpdateProfile) {
          onUpdateProfile(lecturer.id, { passcode: newPasscode });
        }
      } else {
        setPasscodeError(data.error || 'Failed to update passcode. Verify credentials.');
      }
    } catch (err) {
      setPasscodeError('Network connection issue. Please try again.');
    } finally {
      setIsUpdatingPasscode(false);
    }
  };

  const handleLogHoursSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hrsVal = parseFloat(logSessionHours);
    if (isNaN(hrsVal) || hrsVal <= 0 || hrsVal > 12) {
      showWarning("Lesson Duration Error", 'Please log a realistic lesson duration between 0.5 and 12 hours.');
      return;
    }

    onLogHours(lecturer.id, hrsVal);

    // Add to historical list
    const newSession = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-CA'),
      courseCode: selectedSubject,
      topic: logTopic,
      hours: hrsVal,
      status: 'Pending' as const
    };
    setLoggedSessions(prev => [newSession, ...prev]);

    setLogSessionHours('');
    setLogTopic('');
    setTimeLoggedSuccess(true);
    setTimeout(() => {
      setTimeLoggedSuccess(false);
    }, 2500);
  };

  // Load existing session values on date or unit toggle
  useEffect(() => {
    if (selectedSubject && attendanceDate) {
      const existingSession = attendanceSessions.find(
        s => s.date === attendanceDate && s.subjectCode === selectedSubject
      );
      if (existingSession) {
        const records: Record<string, boolean> = {};
        existingSession.presentStudents.forEach(id => {
          records[id] = true;
        });
        existingSession.absentStudents.forEach(id => {
          records[id] = false;
        });
        setAttendanceRecords(records);
      } else {
        // Safe UX fallback: pre-check all registered students as present
        const records: Record<string, boolean> = {};
        subjectStudents.forEach(s => {
          records[s.id] = true;
        });
        setAttendanceRecords(records);
      }
    }
  }, [selectedSubject, attendanceDate, attendanceSessions, students]);

  const toggleAttendanceCheckbox = (studentId: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    const presentStudentIds = subjectStudents.filter(s => !!attendanceRecords[s.id]).map(s => s.id);
    const absentStudentIds = subjectStudents.filter(s => !attendanceRecords[s.id]).map(s => s.id);

    if (onSaveAttendance) {
      onSaveAttendance(selectedSubject, attendanceDate, presentStudentIds, absentStudentIds);
    }

    setAttendanceSuccess(true);
    setTimeout(() => {
      setAttendanceSuccess(false);
    }, 3000);
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
              <button type="button" onClick={() => { setActiveTab('workstation'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'workstation' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <Sliders className="w-4 h-4" />
                <span>My Workstation</span>
              </button>
              <button type="button" onClick={() => { setActiveTab('grading'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'grading' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <Award className="w-4 h-4" />
                <span>Assess & Grade</span>
              </button>
              <button type="button" onClick={() => { setActiveTab('schedule'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'schedule' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <Calendar className="w-4 h-4" />
                <span>Subjects Roster</span>
              </button>
              <button type="button" onClick={() => { setActiveTab('attendance'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'attendance' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <UserCheck className="w-4 h-4" />
                <span>Attendance Log</span>
              </button>
              <button type="button" onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'profile' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <User className="w-4 h-4" />
                <span>Faculty Profile</span>
              </button>
              <button type="button" onClick={() => { setActiveTab('books'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'books' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <BookOpen className="w-4 h-4" />
                <span>Reading Lists</span>
              </button>
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
      <aside className="w-64 bg-slate-900 dark:bg-slate-950 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 hidden md:flex font-sans">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-650 rounded-lg flex items-center justify-center shrink-0">
            <School className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-white block uppercase leading-none">ZENTI</span>
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block">Faculty Portal</span>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <button type="button" onClick={() => setActiveTab('workstation')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'workstation' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <Sliders className="w-4 h-4" />
            <span>My Workstation</span>
          </button>
          <button type="button" onClick={() => setActiveTab('grading')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'grading' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <Award className="w-4 h-4" />
            <span>Assess & Grade</span>
          </button>
          <button type="button" onClick={() => setActiveTab('schedule')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'schedule' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <Calendar className="w-4 h-4" />
            <span>Subjects Roster</span>
          </button>
          <button type="button" onClick={() => setActiveTab('attendance')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'attendance' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <UserCheck className="w-4 h-4" />
            <span>Attendance Log</span>
          </button>
          <button type="button" onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'profile' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <User className="w-4 h-4" />
            <span>Faculty Profile</span>
          </button>
          <button type="button" onClick={() => setActiveTab('books')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'books' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <BookOpen className="w-4 h-4" />
            <span>Reading Lists</span>
          </button>
        </nav>
        
        {/* Profile Info & Logout */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-950/40 space-y-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-650 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {lecturer.name.charAt(0)}
            </div>
            <div className="truncate max-w-[120px]">
              <h4 className="text-xs font-bold text-white leading-none truncate">{lecturer.name}</h4>
              <span className="text-[9px] text-slate-500 font-mono block mt-1 truncate">{lecturer.designatorCode}</span>
            </div>
          </div>
          <button type="button" onClick={onLogout} className="w-full py-2.5 bg-slate-800 hover:bg-rose-955/30 hover:text-rose-450 text-slate-400 hover:text-white text-xs font-bold rounded-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
            <X className="w-3.5 h-3.5" />
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
              <h2 className="text-[9px] font-bold text-slate-450 uppercase tracking-widest leading-none font-mono font-sans">Faculty Command Console</h2>
              <h1 className="text-base font-black text-slate-800 dark:text-white leading-tight">Welcome, Prof. {lecturer.name.split(' ').pop()}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            <div className="w-full sm:w-64 md:w-80">
              <GlobalSearchBar students={students} courses={courses} inventory={inventory} />
            </div>
            <span className="hidden sm:inline-block w-px h-6 bg-slate-200 dark:bg-slate-800"></span>
            
            {/* Consultation Available toggle */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-850 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-1.5 shrink-0">
              <span className={`text-[10px] font-bold ${lecturer.isActive !== false ? 'text-emerald-600' : 'text-rose-600'}`}>
                {lecturer.isActive !== false ? 'Available' : 'Away'}
              </span>
              <button
                type="button"
                onClick={() => onUpdateProfile(lecturer.id, { isActive: lecturer.isActive === false })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  lecturer.isActive !== false ? 'bg-emerald-500' : 'bg-slate-350'
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
          </div>
        </header>
        
        {/* WORKSPACE CONTENT AREA */}
        <div className="p-6 space-y-6 flex-1 bg-slate-50 dark:bg-slate-950">
          
          {/* STUDENT ADMISSION QUICK-SEARCH & DOSSIER STATION */}
          <StudentAdmissionDossierStation
            students={students}
            role="lecturer"
            courses={courses}
            currentLecturer={lecturer}
          />
          
          {/* WORKSPACE MIDDLE PANELS GRID */}
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: ACTIVE VIEW OPTIONS (TABBED) */}
            <div className={`${activeTab === 'profile' ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-6`}>
              
              <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm">
                
                {/* VIEW 0: WORKSTATION (DASHBOARD B) */}
                {activeTab === 'workstation' && (
              <div className="space-y-6">
                {/* HIGH-DENSITY SUMMARY STRIP */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 p-6 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
                  
                  {/* Assigned Subjects */}
                  <div className="flex items-center justify-between pr-4 md:pr-0 md:px-4 first:pl-0">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block font-sans">Assigned Subjects</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">{(lecturer.subjects ?? []).length} Units</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-650 dark:bg-indigo-950/20 dark:text-indigo-400">Active</span>
                      </div>
                    </div>
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 rounded-xl">
                      <Award className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Teaching Hours */}
                  <div className="flex items-center justify-between pt-4 md:pt-0 pr-4 md:pr-0 md:px-6">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block font-sans">Hours Logged</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">{lecturer.loggedHours || 0} Hrs</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400">Milestone</span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Hourly Rate */}
                  <div className="flex items-center justify-between pt-4 md:pt-0 pr-4 md:pr-0 md:px-6">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block font-sans">Hourly Rate</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">KES {(lecturer.hourlyRate || 0).toLocaleString()}</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">Standard</span>
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Estimated Payout */}
                  <div className="flex items-center justify-between pt-4 md:pt-0 pr-4 md:pr-0 md:pl-6 last:pr-0">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block font-sans">Estimated Payout</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-emerald-650 font-mono">KES {((lecturer.loggedHours || 0) * (lecturer.hourlyRate || 0)).toLocaleString()}</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">Accrued</span>
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                      <Activity className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* MIDDLE ROW: 2-column Analytics & Schedule */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Col 1: Hours Analytics Chart */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs lg:col-span-8 flex flex-col justify-between">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex justify-between items-center">
                      <div>
                        <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                          <Activity className="w-4 h-4 text-blue-600" />
                          Teaching Hours Analytics
                        </h3>
                        <p className="text-[9px] text-slate-500">Weekly teaching load telemetry and logged session milestones.</p>
                      </div>
                    </div>
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[
                          { name: 'Week 1', hours: 10 },
                          { name: 'Week 2', hours: 12 },
                          { name: 'Week 3', hours: 15 },
                          { name: 'Week 4', hours: lecturer.loggedHours ? Math.min(lecturer.loggedHours - 37, 20) : 5 }
                        ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} className="font-mono" />
                          <YAxis stroke="#94a3b8" fontSize={9} className="font-mono" />
                          <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                          <Area type="monotone" dataKey="hours" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Col 2: Next Up calendar card */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs lg:col-span-4 flex flex-col justify-between">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block font-mono">Class Roster Schedule</span>
                      <h3 className="text-xs font-bold text-slate-800 dark:text-white mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-violet-650 animate-pulse" />
                        Next Assigned Class
                      </h3>
                    </div>
                    <div className="py-4 space-y-4 flex-1 flex flex-col justify-center">
                      <div className="bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100/50 dark:border-violet-900/30 rounded-xl p-4 space-y-2">
                        <span className="text-[8px] bg-violet-100 dark:bg-violet-900 text-violet-850 dark:text-violet-250 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                          {lecturer.subjects?.[1] || 'DS-202'}
                        </span>
                        <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-205 leading-tight">
                          {subjectMap[lecturer.subjects?.[1] ?? 'DS-202'] ?? 'Intro to Machine Learning'}
                        </h4>
                        <div className="flex items-center gap-4 text-[10px] text-slate-550 font-medium font-mono pt-1">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> 11:00 AM</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Comp Lab 3</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setActiveTab('attendance')}
                      className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-violet-100 dark:shadow-none"
                    >
                      <span>Mark Class Attendance</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* BOTTOM ROW: 3-column deliverables feed, syllabus coverage gauge, focus study timer */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Column 1: Task Checklist */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between h-[360px]">
                    <div>
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex justify-between items-center">
                        <div>
                          <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                            <AlertCircle className="w-4 h-4 text-violet-650" />
                            Faculty Task List
                          </h3>
                          <p className="text-[9px] text-slate-550">Action items for this week.</p>
                        </div>
                        <span className="text-[8px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-black tracking-wider uppercase">Active</span>
                      </div>
                      <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1 text-xs">
                        <div className="flex items-start gap-2.5 p-2 bg-slate-50 dark:bg-slate-850 rounded-lg">
                          <input type="checkbox" defaultChecked className="mt-0.5 rounded text-violet-650 focus:ring-violet-500 cursor-pointer" />
                          <div className="space-y-0.5 text-xs">
                            <p className="font-bold text-slate-400 line-through">Grading Assignment 2</p>
                            <p className="text-[9.5px] text-slate-500">Graded: Cohort II results dispatched.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5 p-2 bg-slate-50 dark:bg-slate-850 rounded-lg border-l-2 border-red-500">
                          <input type="checkbox" className="mt-0.5 rounded text-violet-650 focus:ring-violet-500 cursor-pointer" />
                          <div className="space-y-0.5 text-xs">
                            <p className="font-bold text-slate-800 dark:text-slate-205">Submit Exam Drafts</p>
                            <p className="text-[9.5px] text-red-505 font-semibold">Due: In 2 days (Semester Finals)</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5 p-2 bg-slate-50 dark:bg-slate-850 rounded-lg">
                          <input type="checkbox" className="mt-0.5 rounded text-violet-650 focus:ring-violet-500 cursor-pointer" />
                          <div className="space-y-0.5 text-xs">
                            <p className="font-bold text-slate-800 dark:text-slate-205">Upload CAT Marks</p>
                            <p className="text-[9.5px] text-slate-500">Log grades for CS-101 registered profiles.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold text-center pt-2 font-mono">
                      Check tasks regularly
                    </div>
                  </div>

                  {/* Column 2: Syllabus Progress Radial Gauge */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between h-[360px] items-center">
                    <div className="w-full text-left">
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                        <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-display">
                          <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                          Course Syllabus Gauge
                        </h3>
                        <p className="text-[9px] text-slate-550">Overall curriculum coverage milestone.</p>
                      </div>
                    </div>
                    <div className="relative inline-flex items-center justify-center py-4">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle cx="64" cy="64" r="50" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="8" fill="transparent" />
                        <circle cx="64" cy="64" r="50" className="stroke-emerald-500" strokeWidth="8" fill="transparent" strokeDasharray={314.16} strokeDashoffset={314.16 - (314.16 * 55) / 100} strokeLinecap="round" />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-2xl font-black text-slate-800 dark:text-white font-mono block">55%</span>
                        <span className="text-[7.5px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full font-extrabold uppercase tracking-wide">On Track</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium text-center font-mono leading-relaxed px-4">
                      Module syllabus coverage is currently meeting standard milestone pacing.
                    </div>
                  </div>

                  {/* Column 3: Focus Study Timer */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between h-[360px]">
                    <div>
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                        <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                          Focus Study Timer
                        </h3>
                        <p className="text-[9px] text-slate-555">Pomodoro focus session timer.</p>
                      </div>
                      <div className="text-center py-4 space-y-3">
                        <div className="font-mono text-4xl font-black text-slate-800 dark:text-white tracking-widest bg-slate-55 dark:bg-slate-850 py-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                          {formatTimer(timerSeconds)}
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <span className={`text-[9.5px] uppercase font-bold px-3 py-1 rounded-full ${timerMode === 'focus' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                            {timerMode === 'focus' ? '📚 FOCUSING WORK' : '☕ SHORT BREAK'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => setTimerActive(!timerActive)}
                        className={`flex-1 py-2.5 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer shadow-xs transition-colors ${timerActive ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-650 hover:bg-violet-700'}`}
                      >
                        {timerActive ? 'Pause Session' : 'Start Focus'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setTimerActive(false); setTimerSeconds(timerMode === 'focus' ? 1500 : 300); }}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-350 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 1: GRADING SPREADSHEEET */}
            {activeTab === 'grading' && (
              <div className="space-y-6">
                
                {/* SELECT SUBJECT SELECTOR */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-105 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                      Continuous Assessment & Marks Upload
                    </h2>
                    <p className="text-xs text-slate-500">Select an assigned module to log Continuous Assessment Tests (CATs) & final exams.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label htmlFor="subject-select" className="text-xs font-bold text-slate-550">Active Subject:</label>
                    <select
                      id="subject-select"
                      value={selectedSubject}
                      onChange={(e) => { setSelectedSubject(e.target.value); setGradeInputs({}); }}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-hidden"
                    >
                      {(lecturer.subjects ?? []).map((s) => (
                        <option key={s} value={s}>
                          {subjectMap[s] || s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* LECTURER GRADE DISTRIBUTION ANALYTICS SECTION */}
                <div className="bg-slate-50/60 border border-slate-150 rounded-2xl p-4 md:p-5 space-y-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Award className="w-4.5 h-4.5 text-blue-600 animate-pulse" />
                        <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest font-mono">
                          Faculty Performance Analytics
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                        Grade distribution profile and module performance indexes across your assigned lectures.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-[10px] font-bold font-mono bg-white border border-slate-150/85 px-2.5 py-1.5 rounded-xl">
                      <span className="text-slate-400">Total Graded Modules:</span>
                      <span className="text-blue-600 font-extrabold">{(lecturer.subjects ?? []).length} Units</span>
                    </div>
                  </div>

                  {(() => {
                    let aCount = 0;
                    let bCount = 0;
                    let cCount = 0;
                    let dCount = 0;
                    let efCount = 0;
                    let totalGraded = 0;
                    const modulePerformance: Record<string, { totalScore: number; count: number }> = {};

                    const subjects = lecturer.subjects ?? [];

subjects.forEach(subj => {
                      const enrolled = students.filter(s => s.enrolledUnits.includes(subj));
                      enrolled.forEach(student => {
                        const grade = student.grades[subj];
                        if (grade) {
                          const total = grade.cat + grade.exam;
                          totalGraded++;
                          
                          // Categorize
                          if (total >= 70) aCount++;
                          else if (total >= 60) bCount++;
                          else if (total >= 50) cCount++;
                          else if (total >= 40) dCount++;
                          else efCount++;

                          // Module performance averages
                          if (!modulePerformance[subj]) {
                            modulePerformance[subj] = { totalScore: 0, count: 0 };
                          }
                          modulePerformance[subj].totalScore += total;
                          modulePerformance[subj].count += 1;
                        }
                      });
                    });

                    const distributionData = [
                      { name: 'Grade A', value: aCount, range: '70-100%', label: 'First Class', color: '#10b981' },
                      { name: 'Grade B', value: bCount, range: '60-69%', label: 'Second Upper', color: '#3b82f6' },
                      { name: 'Grade C', value: cCount, range: '50-59%', label: 'Second Lower', color: '#f59e0b' },
                      { name: 'Grade D', value: dCount, range: '40-49%', label: 'Pass', color: '#64748b' },
                      { name: 'Grade E/F', value: efCount, range: '<40%', label: 'Fail / Retake', color: '#ef4444' }
                    ];

                    const moduleAverageData = (lecturer.subjects ?? []).map(subj => {
                      const record = modulePerformance[subj];
                      return {
                        subject: subj,
                        title: subjectMap[subj] || subj,
                        average: record && record.count > 0 ? Math.round(record.totalScore / record.count) : 0,
                        studentsCount: students.filter(s => s.enrolledUnits.includes(subj)).length
                      };
                    });

                    if (totalGraded === 0) {
                      return (
                        <div className="text-center py-6 bg-white rounded-xl border border-dashed border-slate-205 text-slate-400">
                          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                          <span className="font-semibold text-xs text-slate-705 block">No live grades registered yet.</span>
                          <p className="text-[10px] mt-0.5">Grades entered into the spreadsheet below will instantly reflect in the dashboard visualizer.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        
                        {/* CHART 1: Recharts Distribution BarChart */}
                        <div className="lg:col-span-7 bg-white border border-slate-150/80 rounded-xl p-4 shadow-3xs space-y-3.5">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <span className="text-xs font-extrabold text-slate-700 tracking-tight font-mono uppercase">Grade Category Frequency Distribution</span>
                            <span className="text-[10px] bg-blue-50 text-blue-750 px-2 py-0.5 rounded-md font-mono font-bold uppercase shrink-0">
                              {totalGraded} Graded Entries
                            </span>
                          </div>

                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={distributionData}
                                margin={{ top: 15, right: 10, left: -25, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis 
                                  dataKey="name" 
                                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }} 
                                  axisLine={{ stroke: '#cbd5e1' }}
                                  tickLine={{ stroke: '#cbd5e1' }}
                                />
                                <YAxis 
                                  allowDecimals={false}
                                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} 
                                  axisLine={{ stroke: '#cbd5e1' }}
                                  tickLine={{ stroke: '#cbd5e1' }}
                                />
                                <Tooltip
                                  cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-850 shadow-xl text-xs space-y-1 font-sans">
                                          <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: data.color }} />
                                            <span className="font-bold text-xs text-slate-100">{data.name} ({data.range})</span>
                                          </div>
                                          <p className="text-slate-400 text-[10px] font-semibold">{data.label}</p>
                                          <div className="flex justify-between items-center gap-6 pt-1 text-[11px] border-t border-slate-800/80 mt-1">
                                            <span className="text-slate-400">Student Count:</span>
                                            <span className="font-bold font-mono text-white text-sm">{data.value} student(s)</span>
                                          </div>
                                          <div className="flex justify-between items-center gap-6 text-[11px]">
                                            <span className="text-slate-400">Percentage Contribution:</span>
                                            <span className="font-bold font-mono text-blue-400">{Math.round((data.value / totalGraded) * 100)}%</span>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar dataKey="value" radius={[5, 5, 0, 0]} barSize={28}>
                                  {distributionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Mini Legend & stats row */}
                          <div className="grid grid-cols-5 gap-1 pt-1.5 border-t border-slate-100 text-center select-none">
                            {distributionData.map((d, i) => (
                              <div key={i} className="space-y-0.5">
                                <span className="block text-[10px] font-black text-slate-800">{d.value}</span>
                                <span className={`block text-[8px] font-bold uppercase tracking-wider ${
                                  d.name === 'Grade A' ? 'text-emerald-650' :
                                  d.name === 'Grade B' ? 'text-blue-650' :
                                  d.name === 'Grade C' ? 'text-amber-650' :
                                  d.name === 'Grade D' ? 'text-slate-550' :
                                  'text-rose-650 animate-pulse'
                                }`}>
                                  {d.name.split(' ')[1]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* CHART 2: Recharts Performance per Module (Averages) */}
                        <div className="lg:col-span-5 bg-white border border-slate-150/80 rounded-xl p-4 shadow-3xs flex flex-col justify-between space-y-3">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                              <span className="text-xs font-extrabold text-slate-700 tracking-tight font-mono uppercase">Course Unit Average Scores</span>
                              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">Passmark ≥ 40%</span>
                            </div>

                            <div className="h-[148px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  layout="vertical"
                                  data={moduleAverageData}
                                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                  <XAxis 
                                    type="number" 
                                    domain={[0, 100]} 
                                    tick={{ fill: '#64748b', fontSize: 9 }} 
                                    axisLine={{ stroke: '#cbd5e1' }}
                                    tickLine={{ stroke: '#cbd5e1' }}
                                    ticks={[0, 40, 70, 100]}
                                  />
                                  <YAxis 
                                    dataKey="subject" 
                                    type="category" 
                                    tick={{ fill: '#475569', fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }} 
                                    axisLine={{ stroke: '#cbd5e1' }}
                                    tickLine={{ stroke: '#cbd5e1' }}
                                    width={55}
                                  />
                                  <Tooltip
                                    content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                          <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-850 shadow-xl text-xs space-y-1 font-sans">
                                            <span className="font-mono font-bold text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-blue-400 block w-max">
                                              {data.subject}
                                            </span>
                                            <p className="font-extrabold text-xs text-slate-100">{data.title}</p>
                                            <div className="flex justify-between items-center gap-6 pt-1 text-[11px] border-t border-slate-800/80 mt-1">
                                              <span className="text-slate-400">Class Average score:</span>
                                              <span className={`font-bold font-mono text-sm ${data.average >= 70 ? 'text-emerald-450' : data.average < 40 ? 'text-rose-450' : 'text-blue-450'}`}>
                                                {data.average}%
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center gap-6 text-[11px]">
                                              <span className="text-slate-400">Active Students:</span>
                                              <span className="font-bold text-slate-200">{data.studentsCount} students</span>
                                            </div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                  <ReferenceLine x={40} stroke="#ef4444" strokeDasharray="3 3" />
                                  <Bar dataKey="average" radius={[0, 4, 4, 0]} barSize={12} fill="#3b82f6">
                                    {moduleAverageData.map((entry, index) => {
                                      let color = '#3b82f6';
                                      if (entry.average >= 70) color = '#10b981';
                                      else if (entry.average < 40) color = '#ef4444';
                                      return <Cell key={`cell-${index}`} fill={color} />;
                                    })}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Summary message */}
                          <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-xl flex items-start gap-2 text-[10.5px] leading-relaxed text-slate-600 font-sans">
                            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <p>
                              Your highest average class module score is{' '}
                              <strong className="text-slate-800">
                                {Math.max(...moduleAverageData.map(d => d.average))}%
                              </strong>
                              . Maintain high compliance to meet university clearance bars.
                            </p>
                          </div>
                        </div>

                      </div>
                    );
                  })()}
                </div>

                {/* Spreadsheet grading panel */}
                {!selectedSubject ? (
                  <p className="text-xs text-slate-400 italic">No assigned courses allocated to your dashboard.</p>
                ) : subjectStudents.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-405">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm text-slate-650">No students currently registered.</p>
                    <p className="text-xs">No entries match subject code {selectedSubject} in the registration table.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Control Panel to Toggle Normal Grade Distribution Bell Curve */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-50 border border-slate-150 rounded-2xl gap-3">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Spreadsheet Analytics</span>
                        <h4 className="text-xs font-bold text-slate-800">Dynamic Grading Spreadsheet List</h4>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setShowBellCurve(!showBellCurve)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer border ${
                          showBellCurve 
                            ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 font-bold' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-bold'
                        }`}
                      >
                        <Activity className={`w-3.5 h-3.5 ${showBellCurve ? 'animate-pulse text-white' : 'text-blue-600'}`} />
                        <span>{showBellCurve ? 'Hide Bell Curve Overlay' : 'Show Grade Distribution Bell Curve'}</span>
                      </button>
                    </div>

                    {/* OVERLAY VISUALIZATION CARD */}
                    {showBellCurve && (() => {
                      const classScores = subjectStudents.map(student => {
                        const grade = student.grades[selectedSubject] || { cat: 0, exam: 0 };
                        return grade.cat + grade.exam;
                      });

                      const classCount = classScores.length;
                      const classMean = classCount > 0 
                        ? (classScores.reduce((sum, score) => sum + score, 0) / classCount) 
                        : 62;
                      const classVariance = classCount > 0 
                        ? (classScores.reduce((sum, score) => sum + Math.pow(score - classMean, 2), 0) / classCount) 
                        : 100;
                      const classStdDev = classCount > 0 ? (Math.sqrt(classVariance) || 12) : 12;

                      // Generate sample points from 10 to 100 for normal distribution curve
                      const curvePoints = [];
                      for (let xCoord = 10; xCoord <= 100; xCoord += 2.5) {
                        const densityFunc = (x: number, m: number, s: number) => {
                          const expTerm = -Math.pow(x - m, 2) / (2 * Math.pow(s, 2));
                          return (1 / (s * Math.sqrt(2 * Math.PI))) * Math.exp(expTerm);
                        };

                        // Scale the densities for beautiful representation on Recharts Area graph (multiplied by 1000 for relative view)
                        const currentClassDensity = classCount > 0 ? densityFunc(xCoord, classMean, classStdDev) * 1000 : 0;
                        const defaultBenchmarkDensity = densityFunc(xCoord, 65, 12) * 1000; // standard academic bell curve of mu=65 sd=12

                        let letterGrade = 'F';
                        if (xCoord >= 70) letterGrade = 'A';
                        else if (xCoord >= 60) letterGrade = 'B';
                        else if (xCoord >= 50) letterGrade = 'C';
                        else if (xCoord >= 40) letterGrade = 'D';

                        curvePoints.push({
                          score: xCoord,
                          'Class Curve': parseFloat(currentClassDensity.toFixed(4)),
                          'Standard Normal Curve': parseFloat(defaultBenchmarkDensity.toFixed(4)),
                          gradeLabel: letterGrade
                        });
                      }

                      return (
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-xs space-y-4 animate-fade-in">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest font-mono">
                                  Grade Distribution Bell Curve Overlay
                                </h4>
                              </div>
                              <p className="text-[10.5px] text-slate-500 mt-1">
                                Comparative visual mapping of active Class Grades against standard university distribution benchmarks (Passmark: 40%).
                              </p>
                            </div>

                            {/* Standard Percentile Badges */}
                            <div className="flex flex-wrap items-center gap-2 text-[9.5px] font-bold font-mono">
                              <span className="bg-emerald-55 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">Grade A: ≥70%</span>
                              <span className="bg-blue-55 text-blue-750 px-2 py-0.5 rounded border border-blue-100">Grade B: 60-69%</span>
                              <span className="bg-amber-55 text-amber-700 px-2 py-0.5 rounded border border-amber-100">Grade C: 50-59%</span>
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-150">Grade D: 40-49%</span>
                              <span className="bg-rose-55 text-rose-700 px-2 py-0.5 rounded border border-rose-100 animate-pulse">Grade E/F: &lt;40%</span>
                            </div>
                          </div>

                          {/* Stat Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150">
                            <div className="space-y-0.5 text-center sm:text-left">
                              <span className="block text-[9px] uppercase font-black text-slate-400">Class Ingress Size</span>
                              <span className="block text-sm font-black text-slate-800 font-mono">{classCount} Students</span>
                            </div>
                            <div className="space-y-0.5 text-center sm:text-left border-l border-slate-150 pl-0 sm:pl-3">
                              <span className="block text-[9px] uppercase font-black text-slate-400">Class Average (Mean)</span>
                              <span className="block text-sm font-black text-blue-600 font-mono">{classMean.toFixed(1)}%</span>
                            </div>
                            <div className="space-y-0.5 text-center sm:text-left border-l border-slate-150 pl-0 sm:pl-3">
                              <span className="block text-[9px] uppercase font-black text-slate-400">Variance Spread (StdDev)</span>
                              <span className="block text-sm font-black text-emerald-600 font-mono">±{classStdDev.toFixed(1)}</span>
                            </div>
                            <div className="space-y-0.5 text-center sm:text-left border-l border-slate-150 pl-0 sm:pl-3">
                              <span className="block text-[9px] uppercase font-black text-slate-400">Curve Alignment</span>
                              <span className={`block text-[11px] font-extrabold ${classMean >= 60 ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {classMean >= 65 ? 'Right-Skewed (Excellent)' : classMean >= 50 ? 'Centered (Normal)' : 'Left-Skewed (Low)'}
                              </span>
                            </div>
                          </div>

                          {/* Recharts Area Curve Chart */}
                          <div className="h-64 bg-slate-50/20 border border-slate-100 rounded-xl p-2.5">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={curvePoints}
                                margin={{ top: 15, right: 15, left: -25, bottom: 5 }}
                              >
                                <defs>
                                  <linearGradient id="classCurveGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.00}/>
                                  </linearGradient>
                                  <linearGradient id="benchmarkCurveGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.10}/>
                                    <stop offset="95%" stopColor="#64748b" stopOpacity={0.00}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis 
                                  dataKey="score" 
                                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }} 
                                  axisLine={{ stroke: '#cbd5e1' }}
                                  tickLine={{ stroke: '#cbd5e1' }}
                                  domain={[10, 100]}
                                  type="number"
                                  ticks={[10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                                />
                                <YAxis 
                                  tick={{ fill: '#64748b', fontSize: 9 }} 
                                  axisLine={{ stroke: '#cbd5e1' }}
                                  tickLine={{ stroke: '#cbd5e1' }}
                                />
                                <Tooltip
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="bg-slate-900 border border-slate-800 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                                          <p className="font-extrabold text-[11px] text-slate-100 font-mono">Grade Score Point: {data.score}%</p>
                                          <div className="flex justify-between items-center gap-6 text-[10px]">
                                            <span className="text-slate-400">Class Frequency Density:</span>
                                            <span className="font-bold text-blue-400">{payload[0] ? payload[0].value : 0}</span>
                                          </div>
                                          {payload[1] && (
                                            <div className="flex justify-between items-center gap-6 text-[10px]">
                                              <span className="text-slate-400">Standard Norm Density:</span>
                                              <span className="font-bold text-slate-400">{payload[1].value}</span>
                                            </div>
                                          )}
                                          <div className="flex justify-between items-center gap-6 pt-1 text-[10px] border-t border-slate-800">
                                            <span className="text-slate-400">Standard Percentile:</span>
                                            <span className="font-extrabold text-emerald-400">Grade {data.gradeLabel}</span>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Legend 
                                  wrapperStyle={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }} 
                                  verticalAlign="top"
                                  height={36}
                                />
                                
                                {/* Vertical threshold indicators representing standard university percentiles */}
                                <ReferenceLine 
                                  x={70} 
                                  stroke="#10b981" 
                                  strokeDasharray="3 3" 
                                  label={{ value: 'A (70%)', fill: '#10b981', position: 'top', fontSize: 9, fontWeight: 800, fontFamily: 'monospace' }} 
                                />
                                <ReferenceLine 
                                  x={60} 
                                  stroke="#3b82f6" 
                                  strokeDasharray="3 3" 
                                  label={{ value: 'B (60%)', fill: '#3b82f6', position: 'top', fontSize: 9, fontWeight: 800, fontFamily: 'monospace' }} 
                                />
                                <ReferenceLine 
                                  x={50} 
                                  stroke="#f59e0b" 
                                  strokeDasharray="3 3" 
                                  label={{ value: 'C (50%)', fill: '#f59e0b', position: 'top', fontSize: 9, fontWeight: 800, fontFamily: 'monospace' }} 
                                />
                                <ReferenceLine 
                                  x={40} 
                                  stroke="#ef4444" 
                                  strokeWidth={1.5}
                                  strokeDasharray="3 3" 
                                  label={{ value: 'Pass Bar (40%)', fill: '#ef4444', position: 'top', fontSize: 9, fontWeight: 900, fontFamily: 'monospace' }} 
                                />

                                <Area 
                                  type="monotone" 
                                  dataKey="Class Curve" 
                                  stroke="#2563eb" 
                                  strokeWidth={2.5} 
                                  fillOpacity={1} 
                                  fill="url(#classCurveGrad)" 
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="Standard Normal Curve" 
                                  stroke="#64748b" 
                                  strokeWidth={1.5} 
                                  strokeDasharray="4 4" 
                                  fillOpacity={1} 
                                  fill="url(#benchmarkCurveGrad)" 
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="text-[10px] bg-slate-50 border border-slate-100 p-3 rounded-xl text-slate-550 leading-relaxed font-sans">
                            <strong>Interpretation Guide:</strong> The <span className="text-blue-600 font-bold">Class Curve</span> represents actual student score distribution, calculated dynamically using continuous marks. The <span className="text-slate-600 font-bold">Standard Normal Curve</span> simulates an ideal academic cohort performance with an average score of 65% and spread of ±12%. Comparing these curves highlights cohort grade skewness and identifies potential Grade Inflation or Remedial Intervention gaps.
                          </div>
                        </div>
                      );
                    })()}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                            <th className="py-3 px-4">Student Name</th>
                            <th className="py-3 px-4">Admission No.</th>
                            <th className="py-3 px-4 text-center">CAT Grade (Max 30)</th>
                            <th className="py-3 px-4 text-center">Final Exam (Max 70)</th>
                            <th className="py-3 px-4 text-center">Calculated Total</th>
                            <th className="py-3 px-4 text-right">Synchronization Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {subjectStudents.map((student) => {
                            const currentGrade = student.grades[selectedSubject] || { cat: 0, exam: 0 };
                            const targetInput = gradeInputs[student.id];
                            const totalPercentage = currentGrade.cat + currentGrade.exam;

                            return (
                              <tr key={student.id} className="hover:bg-slate-50/40">
                                <td className="py-4 px-4 font-bold text-slate-800">{student.name}</td>
                                <td className="py-4 px-4 font-mono text-slate-500">{student.admissionNo}</td>
                                
                                {/* CAT scores input */}
                                <td className="py-3 px-4 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="30"
                                    placeholder={String(currentGrade.cat)}
                                    value={targetInput?.cat !== undefined ? targetInput.cat : ''}
                                    onChange={(e) => handleGradeInputChange(student.id, 'cat', e.target.value)}
                                    className="w-16 bg-white border border-slate-220 text-center rounded p-1 text-xs text-slate-850 font-bold focus:outline-hidden focus:border-blue-500"
                                  />
                                </td>

                                {/* Exam scores input */}
                                <td className="py-3 px-4 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="70"
                                    placeholder={String(currentGrade.exam)}
                                    value={targetInput?.exam !== undefined ? targetInput.exam : ''}
                                    onChange={(e) => handleGradeInputChange(student.id, 'exam', e.target.value)}
                                    className="w-16 bg-white border border-slate-220 text-center rounded p-1 text-xs text-slate-850 font-bold focus:outline-hidden focus:border-blue-500"
                                  />
                                </td>

                                <td className="py-4 px-4 text-center bg-slate-50/40">
                                  <span className="font-extrabold text-sm text-slate-900">{totalPercentage}%</span>
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveStudentGrade(student)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white hover:text-white px-3 py-1.5 rounded-md font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Sync Grade</span>
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
              </div>
            )}

            {/* VIEW 2: ROSTERS AND SCHEDULES */}
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
                    {(lecturer.subjects ?? []).map(code => {
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
                                {subjectMap[code] || "General Elective"}
                              </h4>
                            </div>

                            <div className="text-[11px] text-slate-500 space-y-1">
                              <p>Students Enrolled: {matchedStudents.length}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                          Weekly progression of class attendance rates for <span className="font-semibold text-slate-700 font-mono">{selectedSubject}</span> ({subjectMap[selectedSubject] || 'Selected Module'}) against registration limits.
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
                      const classAttendanceAverage = totalStudentsCount > 0
                        ? Math.round(subjectStudents.reduce((sum, s) => {
                            const val = s.attendance?.[selectedSubject] !== undefined ? s.attendance[selectedSubject] : 85; 
                            return sum + val;
                          }, 0) / totalStudentsCount)
                        : 85;

                      const checkedPresentCount = subjectStudents.filter(s => attendanceRecords[s.id]).length;
                      const hasActiveInteraction = Object.keys(attendanceRecords).length > 0;
                      const liveSessionRate = totalStudentsCount > 0 
                        ? Math.round((checkedPresentCount / totalStudentsCount) * 100) 
                        : classAttendanceAverage;

                      const week12Rate = hasActiveInteraction ? liveSessionRate : classAttendanceAverage;

                      // Clearance metrics
                      const studentsCleared = totalStudentsCount > 0
                        ? Math.round((subjectStudents.filter(s => {
                            const val = s.attendance?.[selectedSubject] !== undefined ? s.attendance[selectedSubject] : 85;
                            return val >= 75;
                          }).length / totalStudentsCount) * 100)
                        : 100;

                      // Generate deterministic 12-week progression based on module code
                      let seed = 0;
                      for (let i = 0; i < selectedSubject.length; i++) {
                        seed += selectedSubject.charCodeAt(i);
                      }

                      const trendData = Array.from({ length: 12 }, (_, index) => {
                        const weekNum = index + 1;
                        if (weekNum === 12) {
                          return {
                            week: 'Wk 12 (Live)',
                            'Participation Rate': week12Rate,
                            'Minimum Threshold': 75,
                            'Class Average': classAttendanceAverage,
                          };
                        }

                        // Fluctuations around the class average percentage
                        const offset = Math.sin(weekNum + seed) * 4.5 + Math.cos(weekNum * 0.8) * 2;
                        const computedRate = Math.min(100, Math.max(55, Math.round(classAttendanceAverage + offset)));

                        return {
                          week: `Wk ${weekNum}`,
                          'Participation Rate': computedRate,
                          'Minimum Threshold': 75,
                          'Class Average': classAttendanceAverage,
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
                              <span className="block text-base font-extrabold text-blue-600 font-mono">{classAttendanceAverage}%</span>
                              <span className="block text-[10px] text-slate-500">Weekly cohort average</span>
                            </div>
                            <div className="space-y-0.5 border-t border-slate-100 pt-2 col-span-2 lg:col-span-1">
                              <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono">Exam Attendance clearance</span>
                              <span className="block text-base font-extrabold text-emerald-600 font-mono">{studentsCleared}% Cleared</span>
                              <span className="block text-[10px] text-slate-500">Satisfy standard hours (≥75%)</span>
                            </div>
                            <div className="space-y-0.5 border-t border-slate-100 pt-2 col-span-2 lg:col-span-1">
                              <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono">Week 12 Live Rate</span>
                              <span className="block text-base font-extrabold text-indigo-600 font-mono">{week12Rate}%</span>
                              <span className="block text-[10px] text-slate-500">
                                {hasActiveInteraction ? 'Recalculating live roll call' : 'Awaiting roll call inputs'}
                              </span>
                            </div>
                          </div>

                          {/* Recharts Line Chart */}
                          <div className="lg:col-span-9 bg-white border border-slate-150/80 rounded-xl p-3 h-64 shadow-xs">
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
                        onChange={(e) => { setSelectedSubject(e.target.value); setAttendanceRecords({}); }}
                        className="bg-white border border-slate-200 rounded p-1.5 text-xs text-slate-800 font-bold focus:outline-hidden"
                        title="Choose active class"
                      >
                       {(lecturer.subjects ?? []).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
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
                  ) : (
                    <div className="space-y-3">
                      <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white">
                        {subjectStudents.map((s) => {
                          const isPresent = !!attendanceRecords[s.id];
                          return (
                            <div key={s.id} className="p-3.5 flex justify-between items-center text-xs hover:bg-slate-50/30">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-800 text-smblock">{s.name}</span>
                                <span className="text-slate-400 font-mono text-[10px] block">{s.admissionNo} • Registered</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleAttendanceCheckbox(s.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                  isPresent
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {isPresent ? '✓ Mark Present' : '○ Mark Absent'}
                              </button>
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
                            const total = session.presentStudents.length + session.absentStudents.length;
                            const rate = total > 0 ? Math.round((session.presentStudents.length / total) * 100) : 0;
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
                                    {session.presentStudents.length} present, {session.absentStudents.length} absent ({total} total)
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

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
                    <User className="w-5 h-5 text-blue-600" />
                    Faculty workspace profile & logs
                  </h2>
                  <p className="text-xs text-slate-500">Manage payroll logs, timesheets, and customize research portfolio data shown on directory.</p>
                </div>

                {/* Sub-tab navigation */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl gap-2">
                  <button
                    type="button"
                    onClick={() => setProfileSubTab('timesheets')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      profileSubTab === 'timesheets'
                        ? 'bg-white dark:bg-slate-950 text-blue-650 dark:text-blue-450 shadow-3xs'
                        : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-350'
                    }`}
                  >
                    Timesheets & Academic Logs
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileSubTab('portfolio')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      profileSubTab === 'portfolio'
                        ? 'bg-white dark:bg-slate-950 text-blue-650 dark:text-blue-450 shadow-3xs'
                        : 'text-slate-400 hover:text-slate-655 dark:hover:text-slate-350'
                    }`}
                  >
                    Public Profile & Research Portfolio
                  </button>
                </div>

                {profileSubTab === 'timesheets' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
                    {/* Hours Submitter (Left: 5 Cols) */}
                    <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 space-y-6 shadow-xs">
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                        <h3 className="font-extrabold text-slate-905 dark:text-white text-sm flex items-center gap-1.5 uppercase tracking-wide">
                          <Activity className="w-4 h-4 text-blue-600" />
                          Hours Log Submitter
                        </h3>
                        <p className="text-[11px] text-slate-500">Record a completed lecturing slot for payment computation.</p>
                      </div>

                      {timeLoggedSuccess && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 p-3 rounded-xl text-xs font-medium">
                          Session logged to payroll database!
                        </div>
                      )}

                      <form onSubmit={handleLogHoursSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                          <label htmlFor="log-class" className="block text-[11px] font-bold text-slate-650 dark:text-slate-400">Select Session Course</label>
                          <select
                            id="log-class"
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-205 focus:outline-hidden"
                            required
                          >
                            {(lecturer.subjects ?? []).map(s => (
                              <option key={s} value={s}>{subjectMap[s] || s}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="log-topic" className="block text-[11px] font-bold text-slate-650 dark:text-slate-400">Session Topic Delivered</label>
                          <input
                            id="log-topic"
                            type="text"
                            value={logTopic}
                            onChange={(e) => setLogTopic(e.target.value)}
                            placeholder="Introduced Big-O notation & graphs theory"
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl p-2.5 text-xs text-slate-850 dark:text-slate-200 focus:outline-hidden"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="log-hours" className="block text-[11px] font-bold text-slate-650 dark:text-slate-400">Duration (Hourly)</label>
                          <input
                            id="log-hours"
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="10"
                            value={logSessionHours}
                            onChange={(e) => setLogSessionHours(e.target.value)}
                            placeholder="3"
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl p-2.5 text-xs text-slate-850 dark:text-slate-200 focus:outline-hidden font-mono"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 rounded-xl text-xs cursor-pointer transition-colors shadow-sm"
                        >
                          Log Lecturing Session
                        </button>
                      </form>

                      {/* Pay-Stub Snippet */}
                      <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-150 dark:border-slate-850 text-xs space-y-3 font-mono">
                        <div className="border-b border-dashed border-slate-200 dark:border-slate-800 pb-2 mb-2">
                          <span className="font-sans font-black text-slate-800 dark:text-slate-200 block text-xs uppercase tracking-wider">Official Pay-Stub Calculation</span>
                          <span className="text-[10px] text-slate-405">Zenti Faculty Payroll System</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                          <span>Your Hourly Rate:</span>
                          <span className="font-extrabold text-slate-900 dark:text-white bg-slate-150 dark:bg-slate-800 px-2 py-0.5 rounded">KES {lecturer.hourlyRate.toLocaleString()} / hr</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                          <span>Accumulated Hours:</span>
                          <span className="font-extrabold text-slate-900 dark:text-white">{lecturer.loggedHours} Hrs</span>
                        </div>
                        <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-3 mt-2 flex justify-between font-black text-sm text-slate-900 dark:text-white">
                          <span>Calculated Total:</span>
                          <span className="text-emerald-600 dark:text-emerald-400">KES {((lecturer.loggedHours || 0) * (lecturer.hourlyRate || 0)).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Historical Table (Right: 7 Cols) */}
                    <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xs">
                      <div>
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                          Historical Logged Sessions
                        </h3>
                        <p className="text-[11px] text-slate-505 mt-1">Review the list of your active teaching log reports.</p>
                      </div>

                      <div className="overflow-x-auto border border-slate-150 dark:border-slate-800 rounded-2xl">
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
                  </div>
                ) : (
                  // Tab B: Public Profile & Research Portfolio Editor
                  <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-xs animate-fadeIn">
                    {profileSuccess && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-805 border border-emerald-100 dark:border-emerald-900/50 p-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 mb-6">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Your academic profile portfolio has been synchronized and saved to storage!</span>
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
                        setTimeout(() => {
                          setProfileSuccess(false);
                        }, 3000);
                      }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* FILE UPLOADER FOR PROFILE PIC */}
                        <div className="space-y-3">
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Faculty Profile Avatar</label>
                          <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-850">
                            <img 
                              src={editedAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'} 
                              alt="Avatar Preview" 
                              className="w-16 h-16 rounded-full object-cover border-2 border-blue-500/30 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 w-full text-center sm:text-left space-y-2">
                              <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-3 text-center transition-all cursor-pointer">
                                <input 
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const dummyUrls = [
                                        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
                                        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
                                        "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
                                        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                                      ];
                                      const selectedUrl = dummyUrls[Math.floor(Math.random() * dummyUrls.length)];
                                      setEditedAvatar(selectedUrl);
                                      showToast("File uploaded successfully into Faculty CDN storage!", "success");
                                    }
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                  Click to upload picture
                                </div>
                                <div className="text-[9px] text-slate-400">
                                  JPG, PNG or GIF up to 5MB
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* BIO WRAPPER */}
                        <div className="space-y-2">
                          <label className="block text-[11px] font-bold text-slate-605 dark:text-slate-400 uppercase tracking-wider">Professional Biography Brief</label>
                          <textarea 
                            rows={3}
                            value={editedBio}
                            onChange={(e) => setEditedBio(e.target.value)}
                            placeholder="Introduce your academic focus, departments, and industry experience at Zenti Metro University..."
                            className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-750 rounded-xl p-2.5 text-xs text-slate-850 dark:text-slate-200 focus:outline-hidden resize-none leading-relaxed"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 dark:border-slate-805 pt-6">
                        {/* SPECIALIZATION BADGES */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-[11px] font-bold text-slate-605 dark:text-slate-450 uppercase tracking-wider flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                              <span>Specialization & Core Interests</span>
                            </label>
                            <span className="text-[10px] font-bold text-slate-400">{interests.length} Area(s)</span>
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newInterest}
                              onChange={(e) => setNewInterest(e.target.value)}
                              placeholder="e.g. Adaptive Distributed Consensus Topologies"
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl px-2.5 py-2 text-xs text-slate-855 dark:text-slate-200 focus:outline-hidden"
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
                              className="bg-blue-50 dark:bg-blue-950/30 text-blue-605 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-3 py-2 rounded-xl font-bold text-xs font-sans select-none border border-blue-100 dark:border-blue-900/50 cursor-pointer"
                            >
                              Add
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-850">
                            {interests.length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic">No research domains catalogued. Add some above!</p>
                            ) : (
                              interests.map((interest, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs font-semibold border border-blue-100 dark:border-blue-900/50">
                                  <span>{interest}</span>
                                  <button
                                    type="button"
                                    onClick={() => setInterests(prev => prev.filter((_, i) => i !== idx))}
                                    className="hover:bg-blue-200 dark:hover:bg-blue-900/80 p-0.5 rounded-full text-blue-500 hover:text-blue-750 dark:text-blue-405 shrink-0 cursor-pointer"
                                    title="Remove item"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        {/* ACADEMIC PUBLICATIONS */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-[11px] font-bold text-slate-605 dark:text-slate-450 uppercase tracking-wider flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Academic Publications</span>
                            </label>
                            <span className="text-[10px] font-bold text-slate-400">{publications.length} Publication(s)</span>
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newPublication}
                              onChange={(e) => setNewPublication(e.target.value)}
                              placeholder="e.g. Vance, M. (2500). 'Adaptive Algorithms in Microcomputing.'"
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl px-2.5 py-2 text-xs text-slate-855 dark:text-slate-205 focus:outline-hidden"
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
                              className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-105 dark:hover:bg-indigo-900/40 px-3 py-2 rounded-xl font-bold text-xs select-none border border-indigo-100 dark:border-indigo-900/50 cursor-pointer"
                            >
                              Add
                            </button>
                          </div>

                          <div className="space-y-2 max-h-[150px] overflow-y-auto">
                            {publications.length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic">No academic bibliography listed yet.</p>
                            ) : (
                              publications.map((pub, idx) => (
                                <div key={idx} className="flex justify-between items-start p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs text-slate-800 dark:text-slate-205">
                                  <span className="text-[11px] leading-snug mr-3 break-words flex-1 font-mono">{pub}</span>
                                  <button
                                    type="button"
                                    onClick={() => setPublications(prev => prev.filter((_, i) => i !== idx))}
                                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-1 rounded-lg shrink-0 cursor-pointer"
                                    title="Remove item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-105 dark:border-slate-800 pt-5 flex justify-end">
                        <button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md shadow-blue-500/10"
                        >
                          <Save className="w-4 h-4" />
                          <span>Synchronize Profile Credentials</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
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
        {activeTab !== 'profile' && (
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
              <label htmlFor="log-class" className="block text-[11px] font-bold text-slate-650">Select Session Course</label>
              <select
                id="log-class"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-hidden"
                required
              >
                {(lecturer.subjects ?? []).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="log-topic" className="block text-[11px] font-bold text-slate-650">Session Topic Delivered</label>
              <input
                id="log-topic"
                type="text"
                value={logTopic}
                onChange={(e) => setLogTopic(e.target.value)}
                placeholder="Introduced Big-O notation & graphs theory"
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-850 focus:outline-hidden"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="log-hours" className="block text-[11px] font-bold text-slate-650">Duration (Hourly)</label>
              <input
                id="log-hours"
                type="number"
                step="0.5"
                min="0.5"
                max="10"
                value={logSessionHours}
                onChange={(e) => setLogSessionHours(e.target.value)}
                placeholder="3"
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-850 focus:outline-hidden"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
            >
              Log Active Lecturing Session
            </button>
          </form>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-[11px] text-slate-605 space-y-2">
            <span className="font-bold text-slate-800 block text-xs">Payout Calculations Detail:</span>
            <div className="flex justify-between">
              <span>Your Hourly Rate:</span>
              <span className="font-bold text-slate-900">KES {lecturer.hourlyRate.toLocaleString()} / hr</span>
            </div>
            <div className="flex justify-between">
              <span>Logged Hours:</span>
              <span className="font-bold text-slate-900">{lecturer.loggedHours} Hrs</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
              <span>Calculated Total:</span>
              <span>KES {((lecturer.loggedHours || 0) * (lecturer.hourlyRate || 0)).toLocaleString()}</span>
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
