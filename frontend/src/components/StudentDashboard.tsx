import React, { useState, useEffect } from 'react';
import { 
  User, Award, FileText, CreditCard, BookOpen, 
  CheckCircle2, AlertCircle, Sparkles, Send, Download, 
  Trash2, Landmark, Smartphone, Coins, ListFilter, Plus, RefreshCw,
  Printer, Sliders, TrendingUp, TrendingDown, Gauge, Calculator, Clock, Calendar,
  GripVertical, ChevronUp, ChevronDown, ArrowRight, UserCheck, Camera, X, CameraOff,
  Search, MapPin, ArrowUpRight, School, Library, Menu, LogOut
} from 'lucide-react';
import { Student, Course, Grade, Invoice, Payment, StockItem, Lecturer, CourseReview, Book, Loan, Reservation, LMSReadingList, BookReview, BookRequest, ExamPaper, LibraryGateLog, AttendanceSession } from '../types';
import { subjectMap } from '../data';
import StudentTranscript from './StudentTranscript';
import PerformanceInsights from './PerformanceInsights';
import DegreeProgress from './DegreeProgress';
import CourseReviewModal from './CourseReviewModal';
import StudentLibraryView from './StudentLibraryView';
import StudentVisualSummaryDashboard from './StudentVisualSummaryDashboard';
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
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

interface StudentDashboardProps {
  student: Student;
  allCourses: Course[];
  students?: Student[];
  inventory?: StockItem[];
  lecturers?: Lecturer[];
  reviews?: CourseReview[];
  books?: Book[];
  loans?: Loan[];
  reservations?: Reservation[];
  readingLists?: LMSReadingList[];
  bookReviews?: BookReview[];
  bookRequests?: BookRequest[];
  examPapers?: ExamPaper[];
  libraryGateLogs?: LibraryGateLog[];
  attendanceSessions?: AttendanceSession[];
  onReserveBook?: (bookId: string, patronId: string, patronName: string) => void;
  onCancelReservation?: (resId: string) => void;
  onAddReview?: (courseId: string, studentId: string, studentName: string, rating: number, comment: string) => void;
  onBookOfficeHour?: (lecturerId: string, slotId: string, bookingDetails: { studentId: string; studentName: string; studentEmail: string; studentNotes: string }) => void;
  onCancelOfficeHour?: (lecturerId: string, slotId: string) => void;
  onAddPayment: (payment: Omit<Payment, 'id' | 'date' | 'status'>) => void;
  onRegisterUnit: (unitCode: string) => void;
  onDeregisterUnit: (unitCode: string) => void;
  onUpdateProfile?: (studentId: string, updatedFields: Partial<Student>) => void;
  onAddBookReview: (review: Omit<BookReview, 'id' | 'date'>) => void;
  onAddBookRequest: (request: Omit<BookRequest, 'id' | 'date' | 'status'>) => void;
  onTriggerGateLog: (log: Omit<LibraryGateLog, 'id' | 'timestamp'>) => void;
  onCheckoutBook: (bookId: string, patronId: string, patronName: string, patronRole: 'student' | 'lecturer', loanDays?: number) => void;
  onReturnBook: (loanId: string, returnStatus: 'returned' | 'damaged' | 'lost', damageFee?: number) => void;
  onLogout: () => void;
}

export default function StudentDashboard({
  student,
  allCourses,
  students = [],
  inventory = [],
  lecturers = [],
  reviews = [],
  books = [],
  loans = [],
  reservations = [],
  readingLists = [],
  bookReviews = [],
  bookRequests = [],
  examPapers = [],
  libraryGateLogs = [],
  attendanceSessions = [],
  onReserveBook = () => {},
  onCancelReservation = () => {},
  onAddReview,
  onBookOfficeHour,
  onCancelOfficeHour,
  onAddPayment,
  onRegisterUnit,
  onDeregisterUnit,
  onUpdateProfile,
  onAddBookReview,
  onAddBookRequest,
  onTriggerGateLog,
  onCheckoutBook,
  onReturnBook,
  onLogout
}: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'grades' | 'financials' | 'materials' | 'units' | 'officeHours' | 'library'>('dashboard');
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

  // Drag and Drop custom widget preferences states
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(`widget_order_${student.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && !parsed.includes('class-attendance')) {
          parsed.splice(3, 0, 'class-attendance');
          localStorage.setItem(`widget_order_${student.id}`, JSON.stringify(parsed));
        }
        return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return ['progress-bar', 'performance-insights', 'enrolled-units', 'class-attendance', 'office-hours'];
  });

  const [collapsedWidgets, setCollapsedWidgets] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(`widget_collapsed_${student.id}`);
    return saved ? JSON.parse(saved) : {};
  });

  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedWidget(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedWidget) {
      setDragOverWidget(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverWidget(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetId) return;

    const newOrder = [...widgetOrder];
    const dragIdx = newOrder.indexOf(draggedWidget);
    const targetIdx = newOrder.indexOf(targetId);

    if (dragIdx !== -1 && targetIdx !== -1) {
      newOrder.splice(dragIdx, 1);
      newOrder.splice(targetIdx, 0, draggedWidget);
      setWidgetOrder(newOrder);
      localStorage.setItem(`widget_order_${student.id}`, JSON.stringify(newOrder));
    }

    setDraggedWidget(null);
    setDragOverWidget(null);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
    setDragOverWidget(null);
  };

  const toggleWidgetCollapse = (id: string) => {
    const next = { ...collapsedWidgets, [id]: !collapsedWidgets[id] };
    setCollapsedWidgets(next);
    localStorage.setItem(`widget_collapsed_${student.id}`, JSON.stringify(next));
  };

  const resetWidgetLayout = () => {
    const defaultOrder = ['progress-bar', 'performance-insights', 'enrolled-units', 'class-attendance', 'office-hours'];
    setWidgetOrder(defaultOrder);
    setCollapsedWidgets({});
    localStorage.setItem(`widget_order_${student.id}`, JSON.stringify(defaultOrder));
    localStorage.setItem(`widget_collapsed_${student.id}`, JSON.stringify({}));
  };
  
  // Office Hour Booking states
  const [selectedLecturerId, setSelectedLecturerId] = useState<string>(lecturers[0]?.id || '');
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSuccessMessage, setBookingSuccessMessage] = useState<string | null>(null);

  // Attendance details state
  const [expandedAttendanceUnit, setExpandedAttendanceUnit] = useState<string | null>(null);

  // Heatmap interactive state
  const [selectedHeatmapUnit, setSelectedHeatmapUnit] = useState<string>('all');
  const [selectedHeatmapDateStr, setSelectedHeatmapDateStr] = useState<string | null>('2026-06-24');

  // Camera Capture state & handles
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [passcodeSuccess, setPasscodeSuccess] = useState('');
  const [isUpdatingPasscode, setIsUpdatingPasscode] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const startCamera = async () => {
    setIsCameraLoading(true);
    setCameraError(null);
    setCapturedPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: 'user' }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(pErr => console.error("Play error:", pErr));
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError(
        err.name === 'NotAllowedError' 
          ? 'Camera access denied. Please grant permission in your browser.' 
          : 'Could not access camera. Please make sure no other web tab is using your camera.'
      );
    } finally {
      setIsCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  // Sync video's srcObject whenever cameraStream changes
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 400;
      canvas.height = video.videoHeight || 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedPhoto(dataUrl);
      }
    }
  };

  const handleSavePhoto = () => {
    if (capturedPhoto && onUpdateProfile) {
      onUpdateProfile(student.id, { avatar: capturedPhoto });
    }
    setIsCameraModalOpen(false);
    stopCamera();
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
          role: 'student',
          userId: student.id,
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
          onUpdateProfile(student.id, { passcode: newPasscode });
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

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  const selectedLecturer = lecturers.find(l => l.id === selectedLecturerId);

  // Sync selectedLecturerId if lecturers list changes or is loaded
  useEffect(() => {
    if (!selectedLecturerId && lecturers.length > 0) {
      setSelectedLecturerId(lecturers[0].id);
    }
  }, [lecturers, selectedLecturerId]);

  // Payment gateway modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'M-Pesa' | 'Bank Transfer' | 'Card'>('M-Pesa');
  const [phoneNumber, setPhoneNumber] = useState(student.phone);
  const [bankTxRef, setBankTxRef] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [activeReviewCourse, setActiveReviewCourse] = useState<Course | null>(null);

  // New unit registration selection
  const [selectedUnitCode, setSelectedUnitCode] = useState('');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // 🔮 PREDICTIVE GPA SIMULATOR STATE
  const [simulatedGrades, setSimulatedGrades] = useState<Record<string, number>>({});
  const [hypotheticalUnits, setHypotheticalUnits] = useState<string[]>([]);
  const [simulationMode, setSimulationMode] = useState<'momentum' | 'custom'>('momentum');
  const [enableProjection, setEnableProjection] = useState<boolean>(true);

  // Reset simulation whenever active student changes
  useEffect(() => {
    setSimulatedGrades({});
    setHypotheticalUnits([]);
  }, [student.id]);

  // Course Materials listing
  const mockStudyMaterials = [
    { title: 'Lecture 1: Intro to DOM Manipulation & Responsive Structures', unit: 'CS-101-Web', file: 'Intro_DOM_v2.pdf', size: '2.4 MB' },
    { title: 'Supplementary Lab Exercises: Advanced Flexbox & Tailwind Utilities', unit: 'CS-101-Web', file: 'Tailwind_LabEx.zip', size: '15.1 MB' },
    { title: 'Exam Formula Sheet: Big-O Notations & Sorting Algorithms', unit: 'CS-101-Algo', file: 'Sorting_CheatSheet.pdf', size: '940 KB' },
    { title: 'Syllabus Overview & Continuous Assessment Guidelines', unit: 'CS-101-Algo', file: 'Syllabus_CS101.pdf', size: '1.2 MB' },
    { title: 'Practical Dataset: Regression Models and NumPy Matrices', unit: 'DS-202-ML', file: 'NumPy_Datasets.csv', size: '4.8 MB' },
    { title: 'Week 3 Syllabus: Differential Equations & Probability Rules', unit: 'DS-202-Stats', file: 'Prob_Stats_Syllabus.pdf', size: '1.8 MB' }
  ];

  // Calculations for total fee summary
  const unpaidInvoices = student.ledger.filter(i => i.status === 'unpaid');
  const totalInvoiced = student.ledger.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = student.ledger.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
  const outstandingBal = unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  const getGradeClassification = (cat: number, exam: number) => {
    const total = cat + exam;
    if (total >= 70) return { grade: 'A', class: 'text-emerald-600 bg-emerald-50 border-emerald-100', text: 'First Class Honors/Distinction' };
    if (total >= 60) return { grade: 'B', class: 'text-blue-600 bg-blue-50 border-blue-100', text: 'Second Class Upper' };
    if (total >= 50) return { grade: 'C', class: 'text-amber-600 bg-amber-50 border-amber-100', text: 'Second Class Lower' };
    if (total >= 40) return { grade: 'D', class: 'text-slate-600 bg-slate-50 border-slate-100', text: 'Pass' };
    return { grade: 'E/F', class: 'text-red-650 bg-red-50 border-red-100', text: 'Fail / Retake Required' };
  };

  const handleExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    setPaymentProcessing(true);
    setTimeout(() => {
      // Create random mock transaction code
      const randHex = Math.random().toString(36).substring(3, 11).toUpperCase();
      const transactionId = paymentMethod === 'M-Pesa' 
        ? `Q${randHex}` 
        : paymentMethod === 'Bank Transfer' 
          ? `TXN-BNK-${randHex}` 
          : `PAY-CRD-${randHex}`;

      onAddPayment({
        studentId: student.id,
        invoiceId: selectedInvoice.id,
        amount: selectedInvoice.amount,
        paymentMethod,
        transactionId,
      });

      setPaymentProcessing(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        setShowPaymentModal(false);
        setPaymentSuccess(false);
        setSelectedInvoice(null);
      }, 1800);
    }, 1500);
  };

  const handleAddUnitRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUnitCode) {
      onRegisterUnit(selectedUnitCode);
      setSelectedUnitCode('');
    }
  };

  // Completion metrics based on logged attendance and submitted assignments
  const getUnitAcademicProgress = (unitCode: string) => {
    let hash = 0;
    for (let i = 0; i < unitCode.length; i++) {
      hash = unitCode.charCodeAt(i) + ((hash << 5) - hash);
    }
    const absHash = Math.abs(hash);

    // Dynamic but deterministic attendance: e.g. 75% to 100%
    // 12 to 16 classes out of 16
    const totalLectures = 16;
    const attendedLectures = 12 + (absHash % 5); // 12 to 16
    const attendanceRate = Math.round((attendedLectures / totalLectures) * 100);

    // Dynamic but deterministic assignments: e.g. 3 to 5 assignments out of 5
    const totalAssignments = 5;
    const submittedAssignments = 3 + (Math.abs(hash >> 2) % 3); // 3 to 5
    const assignmentRate = Math.round((submittedAssignments / totalAssignments) * 100);

    // Combined overall progress (50% attendance weight + 50% assignment weight)
    const overallProgress = Math.round((attendanceRate + assignmentRate) / 2);

    return {
      lectures: `${attendedLectures}/${totalLectures} lectures`,
      attendanceRate,
      assignments: `${submittedAssignments}/${totalAssignments} assignments`,
      assignmentRate,
      overallProgress,
    };
  };

  // Get unregistered units list
  const allAvailableSubjectCodes = allCourses.map(c => c.code);
  const unregisteredCodes = allAvailableSubjectCodes.filter(
    code => !student.enrolledUnits.includes(code)
  );

  // Grade mapping on standard 4.0 scale
  const getGPForMark = (mark: number): number => {
    if (mark >= 70) return 4.0;
    if (mark >= 60) return 3.0;
    if (mark >= 50) return 2.0;
    if (mark >= 40) return 1.0;
    return 0.0;
  };

  const getLetterForMark = (mark: number): string => {
    if (mark >= 70) return 'A';
    if (mark >= 60) return 'B';
    if (mark >= 50) return 'C';
    if (mark >= 40) return 'D';
    return 'E/F';
  };

  // Geometric Line Chart Math Calculations
  const gradedUnits = student.enrolledUnits.filter(code => student.grades[code] !== undefined);
  const ungradedUnits = student.enrolledUnits.filter(code => student.grades[code] === undefined);

  // Calculate current baseline average and GPA
  const gradedMarkSum = gradedUnits.reduce((sum, code) => {
    const g = student.grades[code];
    return sum + (g.cat + g.exam);
  }, 0);
  const baselineAvg = gradedUnits.length > 0 ? Math.round(gradedMarkSum / gradedUnits.length) : 60;

  const currentGPATotal = gradedUnits.reduce((sum, code) => {
    const g = student.grades[code];
    return sum + getGPForMark(g.cat + g.exam);
  }, 0);
  const currentGPA = gradedUnits.length > 0 ? (currentGPATotal / gradedUnits.length) : 0.0;

  // Simple academic momentum calculator (regression model slope proxy)
  let momentumSlope = 0;
  if (gradedUnits.length >= 2) {
    const marks = gradedUnits.map(code => {
      const g = student.grades[code];
      return g.cat + g.exam;
    });
    let totalDiff = 0;
    for (let i = 1; i < marks.length; i++) {
      totalDiff += (marks[i] - marks[i - 1]);
    }
    // Limit grade variance momentum to a realistic bounds [-8 to +8]
    momentumSlope = Math.max(-8, Math.min(8, totalDiff / (marks.length - 1)));
  }

  // Projection generator based on momentum trend vs interactive sliders
  const getProjectedMark = (unitCode: string, projectedIndex: number) => {
    if (simulationMode === 'custom') {
      return simulatedGrades[unitCode] !== undefined 
        ? simulatedGrades[unitCode] 
        : Math.max(30, Math.min(100, Math.round(baselineAvg)));
    } else {
      // extrapolate baseline + (momentum * index)
      const extrapolation = baselineAvg + (momentumSlope * projectedIndex);
      return Math.max(30, Math.min(100, Math.round(extrapolation)));
    }
  };

  // Assemble full projection study plan: graded courses first, then ungraded active courses, then added hypothetical planning courses
  const simPlanUnits = enableProjection 
    ? [
        ...gradedUnits.map(code => ({ code, type: 'graded' as const })),
        ...ungradedUnits.map(code => ({ code, type: 'ungraded' as const })),
        ...hypotheticalUnits.map(code => ({ code, type: 'hypothetical' as const }))
      ]
    : gradedUnits.map(code => ({ code, type: 'graded' as const }));

  // Compute marks and running averages across the entire study simulation scope
  let runningTotalSumPlan = 0;
  let runningGPPlan = 0;
  let simulatedIndexCounter = 1;

  const simPlanChartData = simPlanUnits.map((item, index) => {
    const code = item.code;
    const isReal = item.type === 'graded';
    
    let mark = 0;
    let cat = 0;
    let exam = 0;
    
    if (isReal) {
      const g = student.grades[code];
      cat = g.cat;
      exam = g.exam;
      mark = g.cat + g.exam;
    } else {
      mark = getProjectedMark(code, simulatedIndexCounter);
      simulatedIndexCounter++;
      // standard 30%/70% continuous assessment split representation
      cat = Math.round(mark * 0.3);
      exam = Math.round(mark * 0.7);
    }
    
    runningTotalSumPlan += mark;
    const runningAvgPlan = Math.round(runningTotalSumPlan / (index + 1));
    
    const gp = getGPForMark(mark);
    runningGPPlan += gp;
    const runningGPAPlan = Number((runningGPPlan / (index + 1)).toFixed(2));
    
    return {
      code,
      subjectName: subjectMap[code] || 'Hypothetical Module',
      mark,
      runningAvg: runningAvgPlan,
      runningGPA: runningGPAPlan,
      cat,
      exam,
      type: item.type,
      gp
    };
  });

  const finalProjectedGPA = simPlanChartData.length > 0 
    ? simPlanChartData[simPlanChartData.length - 1].runningGPA 
    : 0.0;

  const chartWidth = 600;
  const chartHeight = 220;
  const paddingLeft = 45;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 35;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const getChartX = (idx: number) => {
    const N = simPlanChartData.length;
    if (N <= 1) return paddingLeft + plotWidth / 2;
    return paddingLeft + idx * (plotWidth / (N - 1));
  };

  const getChartY = (val: number) => {
    return paddingTop + plotHeight * (1 - val / 100);
  };

  // Find boundaries between graded actual and simulated futures
  const lastGradedIndex = simPlanChartData.reduce((lastIdx, d, idx) => {
    return d.type === 'graded' ? idx : lastIdx;
  }, -1);

  // SVG drawing segment generator helper
  const getAveragePath = (startIdx: number, endIdx: number) => {
    if (startIdx < 0 || endIdx < 0 || startIdx > endIdx) return '';
    let path = '';
    for (let i = startIdx; i <= endIdx; i++) {
      const d = simPlanChartData[i];
      path += `${i === startIdx ? 'M' : 'L'} ${getChartX(i)} ${getChartY(d.runningAvg)}`;
    }
    return path;
  };

  const getMarkPath = (startIdx: number, endIdx: number) => {
    if (startIdx < 0 || endIdx < 0 || startIdx > endIdx) return '';
    let path = '';
    for (let i = startIdx; i <= endIdx; i++) {
      const d = simPlanChartData[i];
      path += `${i === startIdx ? 'M' : 'L'} ${getChartX(i)} ${getChartY(d.mark)}`;
    }
    return path;
  };

  // Paths construction
  const gradedAvgPathD = getAveragePath(0, lastGradedIndex);
  const projectedAvgPathD = lastGradedIndex >= 0 
    ? getAveragePath(lastGradedIndex, simPlanChartData.length - 1) 
    : getAveragePath(0, simPlanChartData.length - 1);

  const gradedMarkPathD = getMarkPath(0, lastGradedIndex);
  const projectedMarkPathD = lastGradedIndex >= 0 
    ? getMarkPath(lastGradedIndex, simPlanChartData.length - 1) 
    : getMarkPath(0, simPlanChartData.length - 1);
  const areaPathD = simPlanChartData.length > 0
    ? `M ${getChartX(0)} ${getChartY(0)} ${simPlanChartData.map((d, i) => `L ${getChartX(i)} ${getChartY(d.runningAvg)}`).join(' ')} L ${getChartX(simPlanChartData.length - 1)} ${getChartY(0)} Z`
    : '';

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300 w-full animate-fade-in" id="student-dashboard-root">
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
              <div className="w-8 h-8 bg-blue-650 rounded-lg flex items-center justify-center shrink-0">
                <School className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-black tracking-tight text-white block uppercase leading-none">ZENTI</span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block">Student Portal</span>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 space-y-1.5 overflow-y-auto pr-2">
              <button type="button" onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <Sliders className="w-4 h-4" />
                <span>My Dashboard</span>
              </button>
              <button type="button" onClick={() => { setActiveTab('grades'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'grades' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <Award className="w-4 h-4" />
                <span>Academic Marks</span>
              </button>
              <button type="button" onClick={() => { setActiveTab('financials'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'financials' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <Landmark className="w-4 h-4" />
                <span>My Financials</span>
              </button>
              <button type="button" onClick={() => { setActiveTab('materials'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'materials' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <BookOpen className="w-4 h-4" />
                <span>Supplementary</span>
              </button>
              <button type="button" onClick={() => { setActiveTab('units'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'units' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <Plus className="w-4 h-4" />
                <span>Unit Register</span>
              </button>
              <button type="button" onClick={() => { setActiveTab('officeHours'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'officeHours' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <Clock className="w-4 h-4" />
                <span>Office Hours</span>
              </button>
              <button type="button" onClick={() => { setActiveTab('library'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'library' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}>
                <Library className="w-4 h-4" />
                <span>Library HQ</span>
              </button>
            </nav>

            {/* Profile Info & Logout */}
            <div className="p-4 border-t border-slate-800/60 bg-slate-950/40 space-y-3 shrink-0">
              <div className="flex items-center gap-3">
                {student.avatar ? (
                  <img src={student.avatar} alt={student.name} className="w-9 h-9 rounded-lg object-cover border border-slate-700" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-blue-650 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {student.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-white leading-none">{student.name}</h4>
                  <span className="text-[9px] text-slate-500 font-mono block mt-1">{student.admissionNo}</span>
                </div>
              </div>
              <button type="button" onClick={() => { setMobileMenuOpen(false); onLogout(); }} className="w-full py-2.5 bg-slate-800 hover:bg-rose-955/30 hover:text-rose-455 text-slate-400 hover:text-white text-xs font-bold rounded-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
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
          <div className="w-8 h-8 bg-blue-650 rounded-lg flex items-center justify-center shrink-0">
            <School className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-white block uppercase leading-none">ZENTI</span>
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block">Student Portal</span>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <button type="button" onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <Sliders className="w-4 h-4" />
            <span>My Dashboard</span>
          </button>
          <button type="button" onClick={() => setActiveTab('grades')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'grades' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <Award className="w-4 h-4" />
            <span>Academic Marks</span>
          </button>
          <button type="button" onClick={() => setActiveTab('financials')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'financials' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <Landmark className="w-4 h-4" />
            <span>My Financials</span>
          </button>
          <button type="button" onClick={() => setActiveTab('materials')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'materials' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <BookOpen className="w-4 h-4" />
            <span>Supplementary</span>
          </button>
          <button type="button" onClick={() => setActiveTab('units')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'units' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <Plus className="w-4 h-4" />
            <span>Unit Register</span>
          </button>
          <button type="button" onClick={() => setActiveTab('officeHours')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'officeHours' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <Clock className="w-4 h-4" />
            <span>Office Hours</span>
          </button>
          <button type="button" onClick={() => setActiveTab('library')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'library' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <Library className="w-4 h-4" />
            <span>Library HQ</span>
          </button>
        </nav>
        
        {/* Profile Info & Logout */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-950/40 space-y-3 shrink-0">
          <div className="flex items-center gap-3">
            {student.avatar ? (
              <img src={student.avatar} alt={student.name} className="w-9 h-9 rounded-lg object-cover border border-slate-700" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-blue-650 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {student.name.charAt(0)}
              </div>
            )}
            <div className="truncate max-w-[120px]">
              <h4 className="text-xs font-bold text-white leading-none truncate">{student.name}</h4>
              <span className="text-[9px] text-slate-500 font-mono block mt-1 truncate">{student.admissionNo}</span>
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
            <div className="space-y-0.5 text-center sm:text-left">
              <h2 className="text-[9px] font-bold text-slate-450 uppercase tracking-widest leading-none font-mono">Welcome back</h2>
              <h1 className="text-base font-black text-slate-800 dark:text-white leading-tight">{student.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse animate-duration-1000"></div>
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono font-sans">Telemetry Live</span>
            </div>
          </div>
        </header>
        
        {/* WORKSPACE CONTENT AREA */}
        <div className="p-6 space-y-6 flex-1 bg-slate-50 dark:bg-slate-950">
          
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm flex-1">
        
        {/* MY DASHBOARD OVERVIEW (DRAG-AND-DROP WIDGETS) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Visual Dashboard Card Summary */}
            <StudentVisualSummaryDashboard 
              student={student}
              allCourses={allCourses}
              onNavigateTab={(tab) => setActiveTab(tab)}
              timerSeconds={timerSeconds}
              setTimerSeconds={setTimerSeconds}
              timerActive={timerActive}
              setTimerActive={setTimerActive}
              timerMode={timerMode}
              setTimerMode={setTimerMode}
              formatTimer={formatTimer}
            />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-3 pt-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5 font-display">
                  <Sliders className="w-5 h-5 text-blue-600 animate-pulse" />
                  My Personal Dashboard Overview
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Drag and drop the widgets below to customize your learning workspace layout. Use the headers to expand/collapse.
                </p>
              </div>

              <button
                type="button"
                onClick={resetWidgetLayout}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-bold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Layout</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {widgetOrder.map((widgetId) => {
                const isCollapsed = collapsedWidgets[widgetId] || false;
                const isBeingDragged = draggedWidget === widgetId;
                const isDragOver = dragOverWidget === widgetId;

                return (
                  <div
                    key={widgetId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, widgetId)}
                    onDragOver={(e) => handleDragOver(e, widgetId)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, widgetId)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white rounded-2xl border transition-all duration-300 relative ${
                      isBeingDragged 
                        ? 'opacity-40 border-dashed border-blue-400 bg-slate-50 scale-[0.98]' 
                        : isDragOver
                        ? 'border-blue-500 border-2 bg-blue-50/25 scale-[1.01] shadow-md'
                        : 'border-slate-150 hover:border-slate-200 shadow-2xs'
                    }`}
                  >
                    {/* Widget Header */}
                    <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-t-2xl border-b border-slate-100 gap-3 select-none">
                      <div className="flex items-center gap-2">
                        {/* Drag Handle */}
                        <div className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing p-1 hover:bg-slate-200/50 rounded transition-colors shrink-0">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        {widgetId === 'progress-bar' && (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="font-bold text-xs text-slate-850 uppercase tracking-wider">Degree Completion Roadmap</span>
                          </div>
                        )}
                        {widgetId === 'performance-insights' && (
                          <div className="flex items-center gap-1.5">
                            <Gauge className="w-4 h-4 text-blue-600" />
                            <span className="font-bold text-xs text-slate-850 uppercase tracking-wider">Performance Insights & Grade Trends</span>
                          </div>
                        )}
                        {widgetId === 'enrolled-units' && (
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-indigo-650" />
                            <span className="font-bold text-xs text-slate-850 uppercase tracking-wider">My Registered Course Modules & CAT Grades</span>
                          </div>
                        )}
                        {widgetId === 'class-attendance' && (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                            <span className="font-bold text-xs text-slate-850 uppercase tracking-wider">Class Attendance status indicators</span>
                          </div>
                        )}
                        {widgetId === 'office-hours' && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-pink-650" />
                            <span className="font-bold text-xs text-slate-850 uppercase tracking-wider">My Lecturer Consultations & Bookings</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleWidgetCollapse(widgetId)}
                          className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 p-1 rounded-lg transition-all cursor-pointer"
                          title={isCollapsed ? 'Expand Widget' : 'Collapse Widget'}
                        >
                          {isCollapsed ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronUp className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Widget Content (Collapsible) */}
                    <div className={`transition-all duration-300 ${isCollapsed ? 'h-0 overflow-hidden py-0 border-none' : 'p-6 py-5'}`}>
                      {!isCollapsed && (
                        <>
                          {widgetId === 'progress-bar' && (
                            /* PROGRESS BAR PORTION */
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {(() => {
                                  const prgCode = student.admissionNo.toUpperCase();
                                  const reqUnits = prgCode.includes('CS') ? 12 : prgCode.includes('EE') ? 15 : prgCode.includes('DS') ? 12 : prgCode.includes('CYBER') ? 12 : 12;
                                  const cmpUnits = student.enrolledUnits.filter(c => student.grades[c] !== undefined && (student.grades[c].cat + student.grades[c].exam) >= 40).length;
                                  const devProgress = Math.round((cmpUnits / reqUnits) * 100);

                                  return (
                                    <>
                                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                                        <span className="text-[10px] text-slate-405 uppercase font-black block tracking-wider">Degree Complete</span>
                                        <div className="mt-2 flex items-baseline gap-1">
                                          <span className="text-2xl font-black text-slate-800">{devProgress}%</span>
                                          <span className="text-xs text-slate-400 font-medium">overall</span>
                                        </div>
                                        <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden shadow-inner">
                                          <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${devProgress}%` }} />
                                        </div>
                                      </div>

                                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                                        <span className="text-[10px] text-slate-405 uppercase font-black block tracking-wider">Earned Course Credits</span>
                                        <div className="mt-2">
                                          <span className="text-2xl font-black text-slate-800">{cmpUnits * 4}</span>
                                          <span className="text-xs text-slate-400 font-medium"> / {reqUnits * 4} Credits</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2">Required graduation threshold</p>
                                      </div>

                                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                                        <span className="text-[10px] text-slate-405 uppercase font-black block tracking-wider">Academic Honors Goal</span>
                                        <div className="mt-2 flex items-baseline gap-1">
                                          <span className="text-lg font-black text-blue-600 flex items-center gap-1">
                                            <Award className="w-4 h-4 text-blue-600" />
                                            First Class
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => setActiveTab('grades')}
                                          className="text-[9px] text-left text-blue-600 font-bold hover:underline mt-2 flex items-center gap-0.5"
                                        >
                                          <span>Go to grade audit transcripts</span>
                                          <ArrowRight className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>

                              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div className="space-y-0.5 text-blue-900">
                                  <h4 className="font-extrabold text-xs flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Interactive Roadmap Audit Tracker</span>
                                  </h4>
                                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-xl">
                                    For complex prerequisites and full breakdown audits, explore the full degree progress tracker on any main academic console page.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTab('grades');
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all pointer cursor-pointer"
                                >
                                  <span>View Detailed Audit Roadmap</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}

                          {widgetId === 'performance-insights' && (
                            /* PERFORMANCE INSIGHTS PORTION */
                            <div className="space-y-4">
                              <PerformanceInsights student={student} />
                              
                              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 font-mono text-[10.5px] text-slate-500 leading-relaxed">
                                <div className="flex flex-wrap items-center gap-6 justify-center">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                                    <span>Actual CAT & Exam Score</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                                    <span>First Class Pass Average (&ge; 70%)</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded bg-rose-500 animate-pulse"></span>
                                    <span>Minimum Academic Pass Margin</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {widgetId === 'enrolled-units' && (
                            /* ENROLLED UNITS PORTION */
                            <div className="space-y-4">
                              {student.enrolledUnits.length === 0 ? (
                                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                  <AlertCircle className="w-8 h-8 text-slate-350 mx-auto mb-1.5" />
                                  <span className="font-semibold text-xs text-slate-700 block">No Course Modules currently allocated.</span>
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab('units')}
                                    className="text-xs text-blue-600 hover:underline font-bold mt-1"
                                  >
                                    Register units now
                                  </button>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {student.enrolledUnits.map((code) => {
                                    const grade = student.grades[code] || { cat: 0, exam: 0 };
                                    const hasMarks = student.grades[code] !== undefined;
                                    const totalMark = grade.cat + grade.exam;
                                    const classification = getGradeClassification(grade.cat, grade.exam);

                                    return (
                                      <div key={code} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between hover:bg-slate-100/50 transition-colors">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <span className="font-mono font-extrabold text-[11px] bg-slate-200/85 px-2 py-0.5 rounded text-slate-800">
                                              {code}
                                            </span>
                                            <h4 className="font-bold text-slate-700 text-xs mt-2 line-clamp-1">
                                              {subjectMap[code] || 'Unassigned Module'}
                                            </h4>
                                          </div>
                                          {hasMarks ? (
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${classification.class}`}>
                                              Grade {classification.grade}
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-0.5 font-mono font-bold animate-pulse">
                                              Ongoing
                                            </span>
                                          )}
                                        </div>

                                        <div className="border-t border-slate-200/50 pt-2 mt-4 flex items-center justify-between text-[11px]">
                                          <div className="text-slate-500 font-medium font-mono">
                                            {hasMarks ? (
                                              <span>CAT: {grade.cat} • Exam: {grade.exam}</span>
                                            ) : (
                                              <span>Awaiting grades assignment</span>
                                            )}
                                          </div>
                                          {hasMarks && (
                                            <span className="font-black text-slate-800 text-xs text-right">
                                              {totalMark}% Avg
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {widgetId === 'class-attendance' && (
                            /* CLASS ATTENDANCE PORTION */
                            <div className="space-y-6">
                              {(() => {
                                const attendanceRecord = student.attendance || {};
                                const getAttendancePercent = (unitCode: string) => {
                                  if (attendanceRecord[unitCode] !== undefined) {
                                    return attendanceRecord[unitCode];
                                  }
                                  let hash = 0;
                                  const str = student.id + unitCode;
                                  for (let i = 0; i < str.length; i++) {
                                    hash = str.charCodeAt(i) + ((hash << 5) - hash);
                                  }
                                  return 75 + (Math.abs(hash) % 23);
                                };

                                const overallAvg = student.enrolledUnits.length > 0 
                                  ? Math.round(student.enrolledUnits.reduce((acc, code) => acc + getAttendancePercent(code), 0) / student.enrolledUnits.length) 
                                  : 0;

                                const isEligibleForAll = student.enrolledUnits.every(code => getAttendancePercent(code) >= 75);

                                const chartData = student.enrolledUnits.map(code => {
                                  const percent = getAttendancePercent(code);
                                  return {
                                    code: code,
                                    name: subjectMap[code] || code,
                                    attendance: percent,
                                    benchmark: 75,
                                  };
                                });

                                const weeksData = [];
                                for (let week = 1; week <= 12; week++) {
                                  let weekHash = 0;
                                  const key = student.id + `_week_${week}`;
                                  for (let idx = 0; idx < key.length; idx++) {
                                    weekHash = key.charCodeAt(idx) + ((weekHash << 5) - weekHash);
                                  }
                                  const variation = (Math.abs(weekHash) % 15) - 7;
                                  const weekPercent = Math.min(100, Math.max(50, overallAvg + variation));
                                  weeksData.push({
                                    week: `W${week}`,
                                    attendance: Math.round(weekPercent),
                                    benchmark: 75
                                  });
                                }

                                return (
                                  <div className="space-y-5">
                                    {/* Overall Attendance Summary Banner */}
                                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                      <div className="space-y-1">
                                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Average Class Presence</span>
                                        <div className="flex items-baseline gap-2">
                                          <span className="text-3xl font-black text-slate-800">{overallAvg}%</span>
                                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                            overallAvg >= 85 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                            overallAvg >= 75 ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                            'bg-rose-50 text-rose-700 border border-rose-200'
                                          }`}>
                                            {overallAvg >= 85 ? 'Excellent' : overallAvg >= 75 ? 'Satisfactory' : 'Needs Attention'}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                          Minimum requirement: <strong className="text-slate-700">75% attendance per unit</strong> for final exam clearance.
                                        </p>
                                      </div>

                                      <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 max-w-sm ${
                                        isEligibleForAll 
                                          ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' 
                                          : 'bg-amber-50/60 border-amber-100 text-amber-900'
                                      }`}>
                                        <div className={`p-1.5 rounded-lg shrink-0 ${isEligibleForAll ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                          <UserCheck className="w-4 h-4" />
                                        </div>
                                        <div className="text-[10.5px]">
                                          <span className="font-bold block leading-snug">
                                            {isEligibleForAll ? 'Exam Clearance Status: SAFE' : 'Pre-Exam Warning Alert'}
                                          </span>
                                          <span className="opacity-90 block mt-0.5 leading-relaxed">
                                            {isEligibleForAll 
                                              ? 'Congratulations! You satisfy attendance criteria for all current semester units.' 
                                              : 'One or more units are close to or below the 75% prerequisite. Please review your logs.'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {student.enrolledUnits.length === 0 ? (
                                      <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <AlertCircle className="w-8 h-8 text-slate-350 mx-auto mb-1.5" />
                                        <span className="font-semibold text-xs text-slate-700 block">No enrolled courses to display attendance for.</span>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {student.enrolledUnits.map((code) => {
                                          const percent = getAttendancePercent(code);
                                          const isBelowMin = percent < 75;
                                          const isExcellent = percent >= 90;
                                          
                                          // Simple present/total calculation
                                          const totalSessions = 20;
                                          const attendedSessions = Math.round((percent / 100) * totalSessions);

                                          const isExpanded = expandedAttendanceUnit === code;

                                          return (
                                            <div 
                                              key={code} 
                                              className={`bg-white border rounded-2xl p-4 flex flex-col justify-between transition-all duration-305 ${
                                                isBelowMin 
                                                  ? 'border-rose-200 bg-rose-50/10 hover:border-rose-350 shadow-rose-50/20 shadow-sm' 
                                                  : 'border-slate-150 hover:border-slate-200'
                                              }`}
                                            >
                                              <div>
                                                <div className="flex justify-between items-start gap-2">
                                                  <div>
                                                    <span className="font-mono font-extrabold text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-650 tracking-wider">
                                                      {code}
                                                    </span>
                                                    <h4 className="font-bold text-slate-800 text-xs mt-1.5 line-clamp-1">
                                                      {subjectMap[code] || 'Special Elective Module'}
                                                    </h4>
                                                  </div>
                                                  <span className={`text-xs font-black shrink-0 ${
                                                    isExcellent ? 'text-emerald-600' : isBelowMin ? 'text-rose-600 animate-pulse' : 'text-blue-600'
                                                  }`}>
                                                    {percent}%
                                                  </span>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="mt-3.5 space-y-1">
                                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                                                    <div 
                                                      className={`h-full rounded-full transition-all duration-500 ${
                                                        isExcellent ? 'bg-emerald-500' : isBelowMin ? 'bg-rose-500' : 'bg-blue-500'
                                                      }`} 
                                                      style={{ width: `${percent}%` }} 
                                                    />
                                                  </div>
                                                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                                                    <span>{attendedSessions} / {totalSessions} present</span>
                                                    <span>Min Req: 75%</span>
                                                  </div>
                                                </div>

                                                {isBelowMin && (
                                                  <div className="mt-3 bg-rose-100/65 rounded-lg border border-rose-200/50 p-2 text-rose-900 text-[10px] flex items-center gap-1.5 font-medium leading-relaxed">
                                                    <AlertCircle className="w-3.5 h-3.5 text-rose-650 shrink-0" />
                                                    <span>Exam block warning! below 75% minimum threshold.</span>
                                                  </div>
                                                )}
                                              </div>

                                              {/* Action Toggles */}
                                              <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
                                                <span className={`text-[10px] font-bold ${
                                                  isBelowMin ? 'text-rose-600' : 'text-emerald-600'
                                                }`}>
                                                  {isBelowMin ? '⛔ Status Blocked' : '✅ cleared for exam'}
                                                </span>
                                                
                                                <button
                                                  type="button"
                                                  onClick={() => setExpandedAttendanceUnit(isExpanded ? null : code)}
                                                  className="text-[10px] text-blue-600 hover:text-blue-800 font-extrabold hover:underline flex items-center gap-0.5 cursor-pointer"
                                                >
                                                  <span>{isExpanded ? 'Hide History' : 'View Logs'}</span>
                                                  <ArrowRight className={`w-3 h-3 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                </button>
                                              </div>

                                              {/* Expanded session logs */}
                                              {isExpanded && (
                                                <div className="mt-4 border-t border-slate-150 pt-3 space-y-2">
                                                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Recent check-ins</span>
                                                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-[10px] font-mono select-none">
                                                    {(() => {
                                                      const logs = [];
                                                      const daysAgo = [1, 3, 5, 8, 10, 12, 15, 17, 22, 24];
                                                      const subjectsMapInstructors: Record<string, string> = {
                                                        'CS-101-Web': 'Dr. Evelyn Carter',
                                                        'CS-101-Algo': 'Prof. Marcus Vance',
                                                        'DS-202-ML': 'Dr. Sarah Kendi',
                                                        'EE-201-Circuits': 'Dr. Arthur Pendelton',
                                                        'DS-202-Stats': 'Prof. Timothy Vance'
                                                      };
                                                      const instructor = subjectsMapInstructors[code] || 'Unit Lecturer';

                                                      for (let i = 0; i < daysAgo.length; i++) {
                                                        const isPresent = (i / daysAgo.length) < (percent / 100);
                                                        const sessionDate = new Date();
                                                        sessionDate.setDate(sessionDate.getDate() - daysAgo[i]);
                                                        const dateStr = sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                        
                                                        logs.push(
                                                          <div 
                                                            key={i} 
                                                            className={`p-1.5 rounded flex justify-between items-center transition-colors ${
                                                              isPresent ? 'bg-slate-50 border border-slate-100 hover:bg-slate-100/50' : 'bg-rose-50/40 border border-rose-100/40'
                                                            }`}
                                                          >
                                                            <div className="space-y-0.5">
                                                              <span className="font-semibold text-slate-755 block text-[10px]">
                                                                {dateStr} — {isPresent ? 'Lecture Attended' : 'Lecture Missed'}
                                                              </span>
                                                              <span className="text-slate-400 block text-[9px]">
                                                                Instructor: {instructor}
                                                              </span>
                                                            </div>
                                                            <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wide ${
                                                              isPresent ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                                            }`}>
                                                              {isPresent ? 'Present' : 'Absent'}
                                                            </span>
                                                          </div>
                                                        );
                                                      }
                                                      return logs;
                                                    })()}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* --- MONTHLY ATTENDANCE SUMMARY (REAL DATA CALCULATION) --- */}
                                      <div className="bg-white border border-slate-150 rounded-2xl p-5 space-y-4">
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <TrendingUp className="w-4 h-4 text-blue-600" />
                                            <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-widest font-mono">
                                              Monthly Attendance Performance
                                            </span>
                                          </div>
                                          <p className="text-xs text-slate-500 mt-1">
                                            A monthly breakdown of your lecture participation computed from all class roll-call registries.
                                          </p>
                                        </div>

                                        {(() => {
                                          const monthsList = [
                                            { name: 'Feb', key: '02', defaultRate: 85 },
                                            { name: 'Mar', key: '03', defaultRate: 88 },
                                            { name: 'Apr', key: '04', defaultRate: 92 },
                                            { name: 'May', key: '05', defaultRate: 84 },
                                            { name: 'Jun', key: '06', defaultRate: 90 },
                                            { name: 'Jul', key: '07', defaultRate: overallAvg || 88 }
                                          ];

                                          const monthlyData = monthsList.map(m => {
                                            const monthSessions = (attendanceSessions || []).filter(s => {
                                              const sessionMonth = s.date.split('-')[1];
                                              return sessionMonth === m.key && (s.presentStudents.includes(student.id) || s.absentStudents.includes(student.id));
                                            });

                                            let rate = m.defaultRate;
                                            if (monthSessions.length > 0) {
                                              const presentCount = monthSessions.filter(s => s.presentStudents.includes(student.id)).length;
                                              rate = Math.round((presentCount / monthSessions.length) * 100);
                                            }

                                            return {
                                              month: m.name,
                                              'Attendance %': rate,
                                              'Benchmark': 75
                                            };
                                          });

                                          return (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                              {/* Recharts Area Chart */}
                                              <div className="h-44">
                                                <ResponsiveContainer width="100%" height="100%">
                                                  <AreaChart data={monthlyData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                                                    <defs>
                                                      <linearGradient id="attendanceColor" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                                      </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={9} tickLine={false} />
                                                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={9} tickLine={false} />
                                                    <Tooltip 
                                                      contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }}
                                                    />
                                                    <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '75% Target', fill: '#ef4444', fontSize: 8, position: 'insideBottomRight' }} />
                                                    <Area type="monotone" dataKey="Attendance %" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#attendanceColor)" />
                                                  </AreaChart>
                                                </ResponsiveContainer>
                                              </div>

                                              {/* Mini Cards of month list */}
                                              <div className="grid grid-cols-3 gap-2">
                                                {monthlyData.map(m => (
                                                  <div key={m.month} className="bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-center">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{m.month}</span>
                                                    <span className={`text-sm font-extrabold block mt-0.5 ${
                                                      m['Attendance %'] >= 75 ? 'text-blue-600' : 'text-rose-600'
                                                    }`}>
                                                      {m['Attendance %']}%
                                                    </span>
                                                    <span className="text-[8px] text-slate-400 mt-0.5 block truncate">
                                                      {m['Attendance %'] >= 75 ? 'Satisfactory' : 'Below Target'}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </div>

                                      {/* --- START OF CALENDAR ATTENDANCE HEAT MAP --- */}
                                      <div className="bg-white border border-slate-150 rounded-2xl p-5 space-y-5 mt-6 animate-fadeIn">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                          <div>
                                            <div className="flex items-center gap-1.5">
                                              <Calendar className="w-4 h-4 text-emerald-600" />
                                              <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-widest font-mono">
                                                Daily Participation Heat Map
                                              </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                              Visualize daily check-in density for current units over the last 3 months.
                                            </p>
                                          </div>

                                          {/* Filters */}
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => setSelectedHeatmapUnit('all')}
                                              className={`px-2.5 py-1 text-[10.5px] font-bold rounded-lg cursor-pointer transition-all ${
                                                selectedHeatmapUnit === 'all'
                                                  ? 'bg-slate-900 text-white shadow-xs'
                                                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-150/60'
                                              }`}
                                            >
                                              All Modules
                                            </button>
                                            {student.enrolledUnits.map((code) => (
                                              <button
                                                key={code}
                                                type="button"
                                                onClick={() => setSelectedHeatmapUnit(code)}
                                                className={`px-2.5 py-1 text-[10.5px] font-bold rounded-lg cursor-pointer transition-all ${
                                                  selectedHeatmapUnit === code
                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-150/60'
                                                }`}
                                              >
                                                {code}
                                              </button>
                                            ))}
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                          {/* Heat Map Grid Panel */}
                                          <div className="lg:col-span-2 space-y-4 bg-slate-50/40 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
                                            <div className="relative overflow-x-auto scrollbar-none pb-1">
                                              {/* Month label row offset */}
                                              <div className="flex items-start gap-2 pt-5">
                                                {/* Days of week labels */}
                                                <div className="grid grid-rows-7 h-[108px] gap-1 text-[8.5px] text-slate-400 font-mono font-black uppercase select-none items-center pr-1.5 leading-none shrink-0 w-8">
                                                  <span>Sun</span>
                                                  <span className="text-transparent">Mon</span>
                                                  <span>Tue</span>
                                                  <span className="text-transparent">Wed</span>
                                                  <span>Thu</span>
                                                  <span className="text-transparent">Fri</span>
                                                  <span>Sat</span>
                                                </div>

                                                {/* Grid Columns */}
                                                <div className="flex gap-1 shrink-0">
                                                  {(() => {
                                                    const today = new Date(2026, 5, 24); // Wednesday, June 24, 2026
                                                    const currentSunday = new Date(today);
                                                    currentSunday.setDate(today.getDate() - today.getDay());
                                                    const startSunday = new Date(currentSunday);
                                                    startSunday.setDate(currentSunday.getDate() - 12 * 7);

                                                    const grid = [];
                                                    for (let week = 0; week < 13; week++) {
                                                      const weekDays = [];
                                                      for (let day = 0; day < 7; day++) {
                                                        const d = new Date(startSunday);
                                                        d.setDate(startSunday.getDate() + week * 7 + day);
                                                        weekDays.push(d);
                                                      }
                                                      grid.push(weekDays);
                                                    }

                                                    const instructors: Record<string, string> = {
                                                      'CS-101-Web': 'Dr. Evelyn Carter',
                                                      'CS-101-Algo': 'Prof. Marcus Vance',
                                                      'DS-202-ML': 'Dr. Sarah Kendi',
                                                      'EE-201-Circuits': 'Dr. Arthur Pendelton',
                                                      'DS-202-Stats': 'Prof. Timothy Vance'
                                                    };

                                                    const getDailyScheduleLocal = (date: Date) => {
                                                      const dayOfWeek = date.getDay();
                                                      const classes: { unitCode: string; unitName: string; time: string; instructor: string }[] = [];
                                                      if (dayOfWeek === 0 || dayOfWeek === 6) return classes;

                                                      student.enrolledUnits.forEach((code, index) => {
                                                        const unitName = subjectMap[code] || 'Special Elective';
                                                        const instructor = instructors[code] || 'Unit Lecturer';
                                                        
                                                        if (index === 0) {
                                                          if (dayOfWeek === 1) classes.push({ unitCode: code, unitName, time: '09:00 AM', instructor });
                                                          if (dayOfWeek === 3) classes.push({ unitCode: code, unitName, time: '02:00 PM', instructor });
                                                        } else if (index === 1) {
                                                          if (dayOfWeek === 1) classes.push({ unitCode: code, unitName, time: '11:00 AM', instructor });
                                                          if (dayOfWeek === 4) classes.push({ unitCode: code, unitName, time: '09:00 AM', instructor });
                                                        } else if (index === 2) {
                                                          if (dayOfWeek === 2) classes.push({ unitCode: code, unitName, time: '10:00 AM', instructor });
                                                          if (dayOfWeek === 4) classes.push({ unitCode: code, unitName, time: '02:00 PM', instructor });
                                                        } else if (index === 3) {
                                                          if (dayOfWeek === 2) classes.push({ unitCode: code, unitName, time: '01:00 PM', instructor });
                                                          if (dayOfWeek === 5) classes.push({ unitCode: code, unitName, time: '11:00 AM', instructor });
                                                        } else if (index === 4) {
                                                          if (dayOfWeek === 3) classes.push({ unitCode: code, unitName, time: '10:00 AM', instructor });
                                                          if (dayOfWeek === 5) classes.push({ unitCode: code, unitName, time: '03:00 PM', instructor });
                                                        } else {
                                                          if (dayOfWeek === 4) classes.push({ unitCode: code, unitName, time: '11:00 AM', instructor });
                                                          if (dayOfWeek === 5) classes.push({ unitCode: code, unitName, time: '01:00 PM', instructor });
                                                        }
                                                      });
                                                      return classes.sort((a, b) => a.time.localeCompare(b.time));
                                                    };

                                                    const isClassAttendedLocal = (unitCode: string, date: Date) => {
                                                      const dateStr = date.toISOString().split('T')[0];
                                                      const str = student.id + '_' + unitCode + '_' + dateStr;
                                                      let hash = 0;
                                                      for (let i = 0; i < str.length; i++) {
                                                        hash = str.charCodeAt(i) + ((hash << 5) - hash);
                                                      }
                                                      const roll = Math.abs(hash) % 100;
                                                      return roll < getAttendancePercent(unitCode);
                                                    };

                                                    return grid.map((weekDays, colIdx) => {
                                                      const Sun = weekDays[0];
                                                      const isFirstOfMonth = colIdx === 0 || Sun.getMonth() !== grid[colIdx - 1][0].getMonth();

                                                      return (
                                                        <div key={colIdx} className="flex flex-col gap-1 relative">
                                                          {isFirstOfMonth && (
                                                            <span className="absolute -top-4.5 left-0 text-[9px] font-black text-slate-400 font-mono uppercase tracking-wider whitespace-nowrap">
                                                              {Sun.toLocaleDateString('en-US', { month: 'short' })}
                                                            </span>
                                                          )}

                                                          {weekDays.map((date, rowIdx) => {
                                                            const dateStr = date.toISOString().split('T')[0];
                                                            const isFuture = date > today;
                                                            const isSelected = selectedHeatmapDateStr === dateStr;

                                                            let cellColor = '';
                                                            let titleTooltip = '';

                                                            if (isFuture) {
                                                              cellColor = 'bg-slate-100 border border-slate-200/20 border-dashed opacity-35 cursor-not-allowed';
                                                              titleTooltip = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (Future date)`;
                                                            } else {
                                                              const dayClasses = getDailyScheduleLocal(date);

                                                              if (selectedHeatmapUnit !== 'all') {
                                                                const targetClass = dayClasses.find(c => c.unitCode === selectedHeatmapUnit);
                                                                if (!targetClass) {
                                                                  cellColor = 'bg-slate-100 border border-slate-200/40 text-slate-350 hover:bg-slate-150';
                                                                  titleTooltip = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: No lecture scheduled for ${selectedHeatmapUnit}`;
                                                                } else {
                                                                  const attended = isClassAttendedLocal(selectedHeatmapUnit, date);
                                                                  if (attended) {
                                                                    cellColor = 'bg-emerald-500 hover:bg-emerald-600 border border-emerald-600/30 shadow-xs cursor-pointer';
                                                                    titleTooltip = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: Attended ${selectedHeatmapUnit}`;
                                                                  } else {
                                                                    cellColor = 'bg-rose-500 hover:bg-rose-600 border border-rose-600/20 shadow-xs cursor-pointer text-white';
                                                                    titleTooltip = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: Missed ${selectedHeatmapUnit}`;
                                                                  }
                                                                }
                                                              } else {
                                                                let attendedCount = 0;
                                                                dayClasses.forEach(c => {
                                                                  if (isClassAttendedLocal(c.unitCode, date)) {
                                                                    attendedCount++;
                                                                  }
                                                                });

                                                                titleTooltip = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: Attended ${attendedCount} / ${dayClasses.length} lectures`;

                                                                if (dayClasses.length === 0) {
                                                                  cellColor = 'bg-slate-100 hover:bg-slate-200 border border-slate-200/30 cursor-pointer';
                                                                } else if (attendedCount === 0) {
                                                                  cellColor = 'bg-rose-100 hover:bg-rose-200 border border-rose-200/30 cursor-pointer';
                                                                } else if (attendedCount === 1) {
                                                                  cellColor = 'bg-emerald-100 hover:bg-emerald-200 border border-emerald-200/40 cursor-pointer';
                                                                } else if (attendedCount === 2) {
                                                                  cellColor = 'bg-emerald-300 hover:bg-emerald-400 border border-emerald-400/40 cursor-pointer';
                                                                } else {
                                                                  cellColor = 'bg-emerald-600 hover:bg-emerald-700 border border-emerald-700/40 cursor-pointer';
                                                                }
                                                              }
                                                            }

                                                            return (
                                                              <div
                                                                key={rowIdx}
                                                                onClick={() => !isFuture && setSelectedHeatmapDateStr(dateStr)}
                                                                title={titleTooltip}
                                                                className={`w-3.5 h-3.5 rounded-xs transition-all duration-150 ${cellColor} ${
                                                                  isSelected ? 'ring-2 ring-blue-500 ring-offset-1 scale-110 z-10' : ''
                                                                }`}
                                                              />
                                                            );
                                                          })}
                                                        </div>
                                                      );
                                                    });
                                                  })()}
                                                </div>
                                              </div>
                                            </div>

                                            {/* Grid Legend & helper note */}
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-slate-150 text-[10.5px] text-slate-500">
                                              <span className="leading-snug">
                                                {selectedHeatmapUnit === 'all' 
                                                  ? "💡 Blocks represent classes attended (0 to 3+)" 
                                                  : `💡 Block colors: Green (Attended), Red (Missed), Gray (No Class)`}
                                              </span>
                                              <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold">
                                                <span>Less</span>
                                                {selectedHeatmapUnit === 'all' ? (
                                                  <>
                                                    <span className="w-2.5 h-2.5 rounded-xs bg-slate-100 border border-slate-200/30" title="0 Attended / No classes" />
                                                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-100 border border-emerald-200/30" title="1 Attended" />
                                                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-300 border border-emerald-300/30" title="2 Attended" />
                                                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 border border-emerald-600/30" title="3+ Attended" />
                                                  </>
                                                ) : (
                                                  <>
                                                    <span className="w-2.5 h-2.5 rounded-xs bg-slate-100 border border-slate-200/30" title="No Class Scheduled" />
                                                    <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 border border-rose-500/20" title="Missed" />
                                                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 border border-emerald-600/20" title="Attended" />
                                                  </>
                                                )}
                                                <span>More</span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Daily Attendance Log Details Panel */}
                                          <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col justify-between min-h-[200px]">
                                            {(() => {
                                              if (!selectedHeatmapDateStr) {
                                                return (
                                                  <div className="my-auto text-center py-6">
                                                    <Calendar className="w-7 h-7 text-slate-350 mx-auto mb-2" />
                                                    <span className="font-bold text-xs text-slate-700 block">Inspection Console</span>
                                                    <p className="text-[10.5px] text-slate-400 mt-1 leading-normal max-w-[200px] mx-auto">
                                                      Click any square in the heatmap calendar to view structured module lecture listings and attendance verification.
                                                    </p>
                                                  </div>
                                                );
                                              }

                                              const parts = selectedHeatmapDateStr.split('-');
                                              const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                                              const formattedDate = dateObj.toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                              });

                                              // Compute classes
                                              const instructors: Record<string, string> = {
                                                'CS-101-Web': 'Dr. Evelyn Carter',
                                                'CS-101-Algo': 'Prof. Marcus Vance',
                                                'DS-202-ML': 'Dr. Sarah Kendi',
                                                'EE-201-Circuits': 'Dr. Arthur Pendelton',
                                                'DS-202-Stats': 'Prof. Timothy Vance'
                                              };

                                              const dayOfWeek = dateObj.getDay();
                                              const classes: { unitCode: string; unitName: string; time: string; instructor: string }[] = [];
                                              
                                              if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                                                student.enrolledUnits.forEach((code, index) => {
                                                  const unitName = subjectMap[code] || 'Special Elective';
                                                  const instructor = instructors[code] || 'Unit Lecturer';
                                                  
                                                  if (index === 0) {
                                                    if (dayOfWeek === 1) classes.push({ unitCode: code, unitName, time: '09:00 AM', instructor });
                                                    if (dayOfWeek === 3) classes.push({ unitCode: code, unitName, time: '02:00 PM', instructor });
                                                  } else if (index === 1) {
                                                    if (dayOfWeek === 1) classes.push({ unitCode: code, unitName, time: '11:00 AM', instructor });
                                                    if (dayOfWeek === 4) classes.push({ unitCode: code, unitName, time: '09:00 AM', instructor });
                                                  } else if (index === 2) {
                                                    if (dayOfWeek === 2) classes.push({ unitCode: code, unitName, time: '10:00 AM', instructor });
                                                    if (dayOfWeek === 4) classes.push({ unitCode: code, unitName, time: '02:00 PM', instructor });
                                                  } else if (index === 3) {
                                                    if (dayOfWeek === 2) classes.push({ unitCode: code, unitName, time: '01:00 PM', instructor });
                                                    if (dayOfWeek === 5) classes.push({ unitCode: code, unitName, time: '11:00 AM', instructor });
                                                  } else if (index === 4) {
                                                    if (dayOfWeek === 3) classes.push({ unitCode: code, unitName, time: '10:00 AM', instructor });
                                                    if (dayOfWeek === 5) classes.push({ unitCode: code, unitName, time: '03:00 PM', instructor });
                                                  } else {
                                                    if (dayOfWeek === 4) classes.push({ unitCode: code, unitName, time: '11:00 AM', instructor });
                                                    if (dayOfWeek === 5) classes.push({ unitCode: code, unitName, time: '01:00 PM', instructor });
                                                  }
                                                });
                                              }
                                              classes.sort((a, b) => a.time.localeCompare(b.time));

                                              const isClassAttendedLocal = (unitCode: string, date: Date) => {
                                                const dateStr = date.toISOString().split('T')[0];
                                                const str = student.id + '_' + unitCode + '_' + dateStr;
                                                let hash = 0;
                                                for (let i = 0; i < str.length; i++) {
                                                  hash = str.charCodeAt(i) + ((hash << 5) - hash);
                                                }
                                                const roll = Math.abs(hash) % 100;
                                                return roll < getAttendancePercent(unitCode);
                                              };

                                              return (
                                                <div className="space-y-3.5 h-full flex flex-col justify-between">
                                                  <div>
                                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                                      <div className="space-y-0.5">
                                                        <span className="text-[10px] text-slate-400 font-extrabold uppercase font-mono tracking-widest block">Audit Report</span>
                                                        <span className="text-xs font-black text-slate-800 block">{formattedDate}</span>
                                                      </div>
                                                      <button
                                                        type="button"
                                                        onClick={() => setSelectedHeatmapDateStr(null)}
                                                        className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                                                      >
                                                        <X className="w-3.5 h-3.5" />
                                                      </button>
                                                    </div>

                                                    <div className="space-y-2 mt-3 max-h-[170px] overflow-y-auto pr-1">
                                                      {classes.length === 0 ? (
                                                        <div className="text-center py-6 text-slate-400 text-[11px]">
                                                          No lectures scheduled for this date.
                                                        </div>
                                                      ) : (
                                                        classes.map((cls, idx) => {
                                                          const attended = isClassAttendedLocal(cls.unitCode, dateObj);
                                                          return (
                                                            <div 
                                                              key={idx} 
                                                              className={`p-2 rounded-xl border text-[11px] space-y-1 transition-all ${
                                                                attended 
                                                                  ? 'bg-emerald-50/40 border-emerald-100/60' 
                                                                  : 'bg-rose-50/40 border-rose-100/60'
                                                              }`}
                                                            >
                                                              <div className="flex justify-between items-center">
                                                                <span className="font-mono font-black text-[9.5px] bg-white px-1.5 py-0.5 rounded shadow-2xs text-slate-700">
                                                                  {cls.unitCode}
                                                                </span>
                                                                <span className={`text-[9.5px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                                                                  attended 
                                                                    ? 'bg-emerald-100 text-emerald-800' 
                                                                    : 'bg-rose-100 text-rose-800'
                                                                }`}>
                                                                  {attended ? 'Present' : 'Absent'}
                                                                </span>
                                                              </div>
                                                              <div className="font-bold text-slate-800 leading-tight">
                                                                {cls.unitName}
                                                              </div>
                                                              <div className="flex justify-between items-center text-[10px] text-slate-450 pt-0.5">
                                                                <span>🕒 {cls.time}</span>
                                                                <span className="truncate max-w-[120px]">{cls.instructor}</span>
                                                              </div>
                                                            </div>
                                                          );
                                                        })
                                                      )}
                                                    </div>
                                                  </div>

                                                  {classes.length > 0 && (
                                                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                                      <span>Compliance Check:</span>
                                                      <span className="font-black text-emerald-600 font-mono text-[9px] uppercase tracking-wide">
                                                        VERIFIED
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Recharts Attendance Visualizer component representing patterns over the semester */}
                                      <div className="bg-white border border-slate-150 rounded-2xl p-5 space-y-6 mt-6">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                          <div>
                                            <div className="flex items-center gap-1.5">
                                              <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                                              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest font-mono">
                                                Semester Attendance Analytics
                                              </h4>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                              Comparative modular presence rates and historical weekly learning engagement trends.
                                            </p>
                                          </div>
                                          
                                          <div className="flex flex-wrap items-center gap-3 text-[10.5px] font-medium text-slate-550 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl font-mono">
                                            <div className="flex items-center gap-1">
                                              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                                              <span>≥90% Excellent</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <span className="w-2.5 h-2.5 rounded-xs bg-blue-500" />
                                              <span>75%-89% Safe</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 animate-pulse" />
                                              <span>&lt;75% Danger</span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                          {/* Bar chart - Unit comparative presence */}
                                          <div className="space-y-3 bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
                                            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                              <span className="text-xs font-bold text-slate-700 tracking-tight">Modular Comparative Presence</span>
                                              <span className="text-[10px] font-mono text-slate-450 uppercase">By Registration Units</span>
                                            </div>
                                            <div className="h-64 mt-2">
                                              <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                  data={chartData}
                                                  margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                                                >
                                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                  <XAxis 
                                                    dataKey="code" 
                                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }} 
                                                    axisLine={{ stroke: '#cbd5e1' }}
                                                    tickLine={{ stroke: '#cbd5e1' }}
                                                  />
                                                  <YAxis 
                                                    domain={[0, 100]} 
                                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} 
                                                    axisLine={{ stroke: '#cbd5e1' }}
                                                    tickLine={{ stroke: '#cbd5e1' }}
                                                    ticks={[0, 25, 50, 75, 100]}
                                                  />
                                                  <Tooltip
                                                    content={({ active, payload }) => {
                                                      if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                          <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-850 shadow-xl text-xs max-w-xs space-y-1">
                                                            <span className="font-mono font-bold text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-blue-400 block w-max">
                                                              {data.code}
                                                            </span>
                                                            <p className="font-bold text-xs truncate text-slate-100">{data.name}</p>
                                                            <div className="flex justify-between items-center gap-6 pt-1 text-[11px]">
                                                              <span className="text-slate-400">Current Presence:</span>
                                                              <span className={`font-bold ${data.attendance >= 90 ? 'text-emerald-400' : data.attendance < 75 ? 'text-rose-400 font-extrabold animate-pulse' : 'text-blue-400'}`}>
                                                                {data.attendance}%
                                                              </span>
                                                            </div>
                                                            <div className="flex justify-between items-center gap-6 text-[11px]">
                                                              <span className="text-slate-400">Status:</span>
                                                              <span className={`font-bold ${data.attendance >= 90 ? 'text-emerald-400' : data.attendance < 75 ? 'text-rose-400' : 'text-blue-400'}`}>
                                                                {data.attendance >= 90 ? 'Excellent' : data.attendance < 75 ? 'Blocked' : 'Cleared'}
                                                              </span>
                                                            </div>
                                                          </div>
                                                        );
                                                      }
                                                      return null;
                                                    }}
                                                  />
                                                  <ReferenceLine 
                                                    y={75} 
                                                    stroke="#ef4444" 
                                                    strokeDasharray="4 4" 
                                                    label={{ 
                                                      value: 'Exam Bar (75%)', 
                                                      position: 'top', 
                                                      fill: '#ef4444', 
                                                      fontSize: 9, 
                                                      fontWeight: 700, 
                                                      fontFamily: 'monospace' 
                                                    }} 
                                                  />
                                                  <Bar dataKey="attendance" radius={[6, 6, 0, 0]} barSize={28}>
                                                    {chartData.map((entry: any, index: number) => {
                                                      const isBelowMin = entry.attendance < 75;
                                                      const isExcellent = entry.attendance >= 90;
                                                      let color = '#3b82f6'; // default blue
                                                      if (isExcellent) color = '#10b981'; // emerald
                                                      if (isBelowMin) color = '#ef4444'; // rose
                                                      return <Cell key={`cell-${index}`} fill={color} />;
                                                    })}
                                                  </Bar>
                                                </BarChart>
                                              </ResponsiveContainer>
                                            </div>
                                          </div>

                                          {/* Area chart - Weekly Engagement trends */}
                                          <div className="space-y-3 bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
                                            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                              <span className="text-xs font-bold text-slate-700 tracking-tight">Semester Engagement Timeline</span>
                                              <span className="text-[10px] font-mono text-slate-450 uppercase">Week 1 to Week 12 Active Trend</span>
                                            </div>
                                            <div className="h-64 mt-2">
                                              <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart
                                                  data={weeksData}
                                                  margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                                                >
                                                  <defs>
                                                    <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                                                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                                                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.00}/>
                                                    </linearGradient>
                                                  </defs>
                                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                  <XAxis 
                                                    dataKey="week" 
                                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }} 
                                                    axisLine={{ stroke: '#cbd5e1' }}
                                                    tickLine={{ stroke: '#cbd5e1' }}
                                                  />
                                                  <YAxis 
                                                    domain={[30, 100]} 
                                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} 
                                                    axisLine={{ stroke: '#cbd5e1' }}
                                                    tickLine={{ stroke: '#cbd5e1' }}
                                                    ticks={[30, 50, 70, 75, 90, 100]}
                                                  />
                                                  <Tooltip
                                                    content={({ active, payload }) => {
                                                      if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                          <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-850 shadow-xl text-xs space-y-1 font-sans">
                                                            <span className="font-mono font-bold text-[10px] text-blue-400">
                                                              Semester Timeline
                                                            </span>
                                                            <p className="font-extrabold text-xs text-slate-100">{data.week} Core Review</p>
                                                            <div className="flex justify-between items-center gap-6 pt-1 text-[11px]">
                                                              <span className="text-slate-400">Weekly Attendance:</span>
                                                              <span className="font-mono font-bold text-blue-400">{data.attendance}%</span>
                                                            </div>
                                                            <div className="flex justify-between items-center gap-6 text-[11px]">
                                                              <span className="text-slate-400">Prerequisite Target:</span>
                                                              <span className="font-mono text-rose-400">75%</span>
                                                            </div>
                                                          </div>
                                                        );
                                                      }
                                                      return null;
                                                    }}
                                                  />
                                                  <ReferenceLine 
                                                    y={75} 
                                                    stroke="#ef4444" 
                                                    strokeDasharray="4 4" 
                                                    label={{ 
                                                      value: 'Min Required (75%)', 
                                                      position: 'bottom', 
                                                      fill: '#ef4444', 
                                                      fontSize: 9, 
                                                      fontWeight: 700, 
                                                      fontFamily: 'monospace' 
                                                    }} 
                                                  />
                                                  <Area 
                                                    type="monotone" 
                                                    dataKey="attendance" 
                                                    stroke="#3b82f6" 
                                                    strokeWidth={3} 
                                                    fillOpacity={1} 
                                                    fill="url(#attendanceGradient)" 
                                                  />
                                                </AreaChart>
                                              </ResponsiveContainer>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {widgetId === 'office-hours' && (
                            /* OFFICE HOURS PORTION */
                            <div className="space-y-4">
                              {(() => {
                                const studentBookings = (lecturers || []).flatMap(lec => {
                                  const slots = lec.officeHours || [];
                                  return slots
                                    .filter(slot => slot.status === 'booked' && slot.studentId === student.id)
                                    .map(slot => ({
                                      ...slot,
                                      lecturer: lec
                                    }));
                                });

                                if (studentBookings.length === 0) {
                                  return (
                                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                      <Clock className="w-8 h-8 text-slate-350 mx-auto mb-1.5" />
                                      <span className="font-semibold text-xs text-slate-700 block">No consultation bookings recorded.</span>
                                      <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                                        Need help with modules, assignments guidance, or project submissions reviews?
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => setActiveTab('officeHours')}
                                        className="bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 font-bold px-3 py-1 rounded-lg text-[10.5px] mt-3.5 inline-flex items-center gap-1 shadow-3xs cursor-pointer"
                                      >
                                        <span>Reserve Office Hour Session</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {studentBookings.map((b, i) => (
                                        <div key={i} className="bg-gradient-to-br from-pink-50/20 to-slate-50 border border-pink-100 rounded-xl p-4 flex flex-col justify-between hover:border-pink-200 transition-colors">
                                          <div>
                                            <div className="flex justify-between items-center text-[10px] font-mono text-pink-700 font-bold">
                                              <span>BOOKED APPOINTMENT</span>
                                              <span>{b.day} ({b.time})</span>
                                            </div>
                                            <h4 className="font-bold text-slate-800 text-xs mt-1.5 flex items-center gap-1">
                                              <span>Dr. {b.lecturer.name}</span>
                                              <span className="text-[9px] bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-650 font-normal">
                                                {b.lecturer.subjects[0] || 'Faculty Member'}
                                              </span>
                                            </h4>
                                            <p className="text-[10.5px] text-slate-500 mt-1 italic leading-relaxed">
                                              &ldquo;{b.studentNotes || 'No specific agenda remarks provided.'}&rdquo;
                                            </p>
                                          </div>

                                          <div className="border-t border-slate-200/55 pt-2 mt-3.5 flex items-center justify-between text-[10.5px]">
                                            <span className="text-slate-400">Office room / venue:</span>
                                            <span className="font-black text-slate-800">Faculty Cab {b.lecturer.designatorCode || '104'}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    <div className="text-center py-1">
                                      <button
                                        type="button"
                                        onClick={() => setActiveTab('officeHours')}
                                        className="text-xs text-blue-600 hover:underline font-bold"
                                      >
                                        Want to book another office hour slot? Click here to view lecturers schedule.
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 1: GRADES ASSESSMENT */}
        {activeTab === 'grades' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5 font-display">
                  <Award className="w-5 h-5 text-blue-600" />
                  Academic Gradebook & Transcripts
                </h2>
                <p className="text-xs text-slate-500 mt-1">Supplementary Marks aggregated according to Continuous Assessments & Final exam records.</p>
              </div>

              {student.enrolledUnits.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTranscript(true)}
                    className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer no-print shadow-xs"
                  >
                    <FileText className="w-4 h-4 text-indigo-300" />
                    <span>Generate Academic Transcript</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="bg-slate-900 hover:bg-slate-805 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer no-print shadow-xs"
                  >
                    <Printer className="w-4 h-4 text-blue-400" />
                    <span>Print Report Card</span>
                  </button>
                </div>
              )}
            </div>

            {student.enrolledUnits.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <AlertCircle className="w-10 h-10 text-slate-350 mx-auto mb-2" />
                <p className="font-semibold text-sm text-slate-700">No units currently allocated.</p>
                <p className="text-xs text-slate-400 mt-0.5">Please navigate to the Unit Registration tab to select courses.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Performance Insights Dashboard Widget */}
                <PerformanceInsights student={student} />

                {/* Recharts Bar Chart: Modular Grade Breakdown & Trends */}
                {(() => {
                  const gradeChartData = student.enrolledUnits.map((code) => {
                    const grade = student.grades[code] || { cat: 0, exam: 0 };
                    const hasMarks = student.grades[code] !== undefined;
                    const totalMark = grade.cat + grade.exam;
                    return {
                      code,
                      name: subjectMap[code] || 'Unassigned Module',
                      CAT: hasMarks ? grade.cat : 0,
                      Exam: hasMarks ? grade.exam : 0,
                      Total: hasMarks ? totalMark : 0,
                      hasMarks
                    };
                  });

                  return (
                    <div className="bg-white rounded-2xl border border-slate-150 p-5 space-y-4 shadow-3xs no-print">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 animate-pulse"></span>
                            Modular Grade Distribution & Performance Trends
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Comparative analysis of Continuous Assessments (CAT) and Final Semester Exam marks.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold tracking-wider uppercase text-slate-500 font-mono bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs bg-blue-500" />
                            <span>CAT (Max 30)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500" />
                            <span>Exam (Max 70)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                            <span>Total Mark (Max 100)</span>
                          </div>
                        </div>
                      </div>

                      {gradeChartData.some(d => d.hasMarks) ? (
                        <div className="h-72 mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={gradeChartData}
                              margin={{ top: 15, right: 10, left: -25, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis 
                                dataKey="code" 
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }} 
                                axisLine={{ stroke: '#cbd5e1' }}
                                tickLine={{ stroke: '#cbd5e1' }}
                              />
                              <YAxis 
                                domain={[0, 100]} 
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} 
                                axisLine={{ stroke: '#cbd5e1' }}
                                tickLine={{ stroke: '#cbd5e1' }}
                                ticks={[0, 30, 50, 70, 100]}
                              />
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    const classification = getGradeClassification(data.CAT, data.Exam);
                                    return (
                                      <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shadow-xl text-xs max-w-xs space-y-1.5 font-sans">
                                        <span className="font-mono font-bold text-[10px] bg-slate-850 px-1.5 py-0.5 rounded text-blue-400 block w-max">
                                          {data.code}
                                        </span>
                                        <p className="font-extrabold text-xs text-slate-100 truncate">{data.name}</p>
                                        <div className="border-t border-white/10 pt-1.5 space-y-1">
                                          <div className="flex justify-between items-center gap-6 text-[11px]">
                                            <span className="text-slate-400">CAT Assessment:</span>
                                            <span className="font-mono font-bold text-blue-400">{data.CAT} / 30</span>
                                          </div>
                                          <div className="flex justify-between items-center gap-6 text-[11px]">
                                            <span className="text-slate-400">Semester Exam:</span>
                                            <span className="font-mono font-bold text-indigo-400">{data.Exam} / 70</span>
                                          </div>
                                          <div className="flex justify-between items-center gap-6 text-[11px] border-t border-white/5 pt-1">
                                            <span className="text-slate-400 font-semibold">Aggregate Total:</span>
                                            <span className="font-mono font-extrabold text-emerald-400">{data.Total}%</span>
                                          </div>
                                          <div className="flex justify-between items-center gap-6 text-[11px]">
                                            <span className="text-slate-400">Grade Class:</span>
                                            <span className={`font-black text-[10px] px-1.5 py-0.5 rounded ${classification.class}`}>
                                              {classification.grade} ({classification.text})
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="CAT" stackId="marks" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={28} />
                              <Bar dataKey="Exam" stackId="marks" fill="#6366f1" radius={[5, 5, 0, 0]} barSize={28} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                          <Sparkles className="w-8 h-8 text-blue-500/50 mx-auto animate-pulse" />
                          <p className="font-bold text-xs text-slate-800 uppercase tracking-wider">Awaiting Released Grades</p>
                          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                            There are no recorded mid-terms or end-of-semester exam marks to visualize yet. Once your subject lecturers publish assessments, your comparative grade distribution will populate here automatically.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Trend Performance Analytics Card */}
                {simPlanChartData.length > 0 ? (
                  <div className="space-y-6">
                    <div className="bg-slate-50 rounded-2xl border border-slate-150 p-5 space-y-4 no-print sm:p-6 shadow-2xs">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                            Academic Standing & Predictive GPA Trend
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Visualizing actual grades with progressive target simulations. Hover near any node to audit course details.
                          </p>
                        </div>

                        {/* Legends */}
                        <div className="flex flex-wrap gap-4 text-[9px] uppercase font-bold tracking-wider text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-0.5 border-t border-slate-350 inline-block"></span>
                            Completed Grades
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-0.5 border-t border-purple-400 border-dashed inline-block"></span>
                            Forecast Zones
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-0.5 bg-blue-600 inline-block"></span>
                            Progressive Average
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-0.5 bg-purple-500 inline-block"></span>
                            Simulated Average
                          </span>
                        </div>
                      </div>

                      {/* SVG Line Chart Workspace */}
                      <div className="relative">
                        <svg 
                          viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                          className="w-full h-auto bg-white rounded-xl border border-slate-100 p-2"
                        >
                          <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.12" />
                              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.00" />
                            </linearGradient>
                          </defs>

                          {/* Y-Axis dashed horizontal gridlines */}
                          {[100, 75, 50, 25, 0].map((v) => {
                            const yVal = getChartY(v);
                            return (
                              <g key={v}>
                                <line 
                                  x1={paddingLeft} 
                                  y1={yVal}
                                  x2={chartWidth - paddingRight} 
                                  y2={yVal} 
                                  stroke="#f1f5f9" 
                                  strokeWidth="1" 
                                />
                                <line 
                                  x1={paddingLeft} 
                                  y1={yVal}
                                  x2={chartWidth - paddingRight} 
                                  y2={yVal} 
                                  stroke="#cbd5e1" 
                                  strokeWidth="0.75" 
                                  strokeDasharray="3 3" 
                                />
                                <text 
                                  x={paddingLeft - 8} 
                                  y={yVal + 3} 
                                  textAnchor="end" 
                                  className="font-mono text-[9px] fill-slate-400 font-bold"
                                >
                                  {v}%
                                </text>
                              </g>
                            );
                          })}

                          {/* Area under progressive average */}
                          {areaPathD && (
                            <path 
                              d={areaPathD} 
                              fill="url(#chartGradient)" 
                            />
                          )}

                          {/* Actual subject mark path (dashed light blue) */}
                          {gradedMarkPathD && (
                            <path 
                              d={gradedMarkPathD} 
                              fill="none" 
                              stroke="#93c5fd" 
                              strokeWidth="1.5" 
                              strokeDasharray="4 4" 
                            />
                          )}

                          {/* Projected subject mark path (dashed light purple) */}
                          {projectedMarkPathD && (
                            <path 
                              d={projectedMarkPathD} 
                              fill="none" 
                              stroke="#c084fc" 
                              strokeWidth="1.5" 
                              strokeDasharray="2 3" 
                            />
                          )}

                          {/* Actual average progressive trend line (solid vibrant blue) */}
                          {gradedAvgPathD && (
                            <path 
                              d={gradedAvgPathD} 
                              fill="none" 
                              stroke="#2563eb" 
                              strokeWidth="3" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                            />
                          )}

                          {/* Simulated average progressive trend line (dashed vibrant purple) */}
                          {projectedAvgPathD && (
                            <path 
                              d={projectedAvgPathD} 
                              fill="none" 
                              stroke="#a855f7" 
                              strokeWidth="2.5" 
                              strokeDasharray="4 3"
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                            />
                          )}

                          {/* Nodes and ticks */}
                          {simPlanChartData.map((d, i) => {
                            const cx = getChartX(i);
                            const cyMark = getChartY(d.mark);
                            const cyAvg = getChartY(d.runningAvg);
                            const isHovered = hoveredPointIndex === i;
                            const isSimulated = d.type !== 'graded';

                            return (
                              <g key={i}>
                                {/* Course code Label coordinate */}
                                <text 
                                  x={cx} 
                                  y={chartHeight - 12} 
                                  textAnchor="middle" 
                                  className={`font-mono text-[9px] font-bold ${
                                    isHovered 
                                      ? 'fill-blue-600 font-extrabold' 
                                      : isSimulated 
                                        ? 'fill-purple-500 font-medium italic' 
                                        : 'fill-slate-500'
                                  }`}
                                >
                                  {d.code}{isSimulated ? '*' : ''}
                                </text>

                                {/* Individual mark circle */}
                                <circle 
                                  cx={cx} 
                                  cy={cyMark} 
                                  r={isHovered ? 5.5 : 3.5} 
                                  fill={isSimulated ? '#f3e8ff' : 'white'} 
                                  stroke={isSimulated ? '#c084fc' : '#60a5fa'} 
                                  strokeWidth="1.5"
                                  strokeDasharray={isSimulated ? "2 2" : undefined}
                                  className="transition-all duration-100"
                                />

                                {/* Progressive average circle */}
                                <circle 
                                  cx={cx} 
                                  cy={cyAvg} 
                                  r={isHovered ? (isSimulated ? 6 : 7) : (isSimulated ? 4.5 : 5)} 
                                  fill={isSimulated ? '#a855f7' : '#2563eb'} 
                                  stroke="white" 
                                  strokeWidth={isHovered ? 2.5 : 2} 
                                  className="transition-all duration-100 drop-shadow-xs" 
                                />

                                {/* Vertical marker on hover */}
                                {isHovered && (
                                  <line 
                                    x1={cx} 
                                    y1={paddingTop} 
                                    x2={cx} 
                                    y2={chartHeight - paddingBottom} 
                                    stroke={isSimulated ? '#c084fc' : '#3b82f6'} 
                                    strokeOpacity="0.5"
                                    strokeWidth="1" 
                                    strokeDasharray="2 2" 
                                    className="pointer-events-none"
                                  />
                                )}

                                {/* Virtual interactive hover area columns */}
                                <rect 
                                  x={cx - 20} 
                                  y={paddingTop} 
                                  width={40} 
                                  height={plotHeight} 
                                  fill="transparent" 
                                  onMouseEnter={() => setHoveredPointIndex(i)} 
                                  onMouseLeave={() => setHoveredPointIndex(null)} 
                                  className="cursor-pointer" 
                                />
                              </g>
                            );
                          })}
                        </svg>

                        {/* Interactive Dynamic floating Tooltip */}
                        {hoveredPointIndex !== null && simPlanChartData[hoveredPointIndex] && (
                          <div 
                            className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white rounded-xl p-3 shadow-xl max-w-xs space-y-1.5 pointer-events-none z-10 text-[10px] sm:text-xs"
                          >
                            <div className="flex justify-between items-center border-b border-white/10 pb-1">
                              <span className="font-mono font-bold text-blue-400">
                                {simPlanChartData[hoveredPointIndex].code} {simPlanChartData[hoveredPointIndex].type !== 'graded' ? '(*Simulated)' : '(Actual)'}
                              </span>
                              <span className="text-[8px] uppercase tracking-wider text-slate-400">Trend Assessment</span>
                            </div>
                            
                            <p className="font-bold text-white/95 truncate">
                              {simPlanChartData[hoveredPointIndex].subjectName}
                            </p>

                            <div className="grid grid-cols-2 gap-x-4 text-[10px] pt-0.5">
                              {simPlanChartData[hoveredPointIndex].type === 'graded' ? (
                                <>
                                  <p className="text-slate-350">CAT Score: <span className="font-semibold text-white">{simPlanChartData[hoveredPointIndex].cat}/30</span></p>
                                  <p className="text-slate-350 text-right">Exam Score: <span className="font-semibold text-white">{simPlanChartData[hoveredPointIndex].exam}/70</span></p>
                                </>
                              ) : (
                                <p className="text-purple-300 col-span-2 font-medium">Target Sim Score: <span className="font-bold text-white">{simPlanChartData[hoveredPointIndex].mark}%</span></p>
                              )}
                              <p className="text-slate-350 col-span-2 pt-1 border-t border-white/5 mt-1 flex justify-between">
                                  <span>Module Percentage:</span>
                                <span className={simPlanChartData[hoveredPointIndex].type === 'graded' ? 'font-bold text-emerald-400' : 'font-bold text-purple-400'}>
                                  {simPlanChartData[hoveredPointIndex].mark}%
                                </span>
                              </p>
                              <p className="text-slate-350 col-span-2 flex justify-between font-medium text-blue-300">
                                <span>Running average:</span>
                                <span className="font-bold">{simPlanChartData[hoveredPointIndex].runningAvg}%</span>
                              </p>
                              <p className="text-slate-350 col-span-2 flex justify-between font-medium text-amber-400">
                                <span>Projected GPA:</span>
                                <span className="font-bold font-mono">{simPlanChartData[hoveredPointIndex].runningGPA.toFixed(2)}</span>
                              </p>
                            </div>

                            {/* Insight Alert box */}
                            <div className="bg-white/5 px-2 py-1 rounded text-[9px] text-slate-300 text-center leading-relaxed font-medium mt-1">
                              {hoveredPointIndex === 0 ? (
                                <span>Starting course baseline.</span>
                              ) : (() => {
                                const diff = simPlanChartData[hoveredPointIndex].runningAvg - simPlanChartData[hoveredPointIndex - 1].runningAvg;
                                if (diff > 0) {
                                  return <span className="text-emerald-400 flex items-center justify-center gap-0.5">▲ Progressive average rose by {diff}%</span>;
                                } else if (diff < 0) {
                                  return <span className="text-amber-400 flex items-center justify-center gap-0.5">▼ Progressive average changed by {diff}%</span>;
                                } else {
                                  return <span className="text-slate-350">■ Stabilized from previous module.</span>;
                                }
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Interactive Sandbox GPA Simulator Widget */}
                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-6 no-print shadow-2xs">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-150 pb-4">
                        <div>
                          <h3 className="text-xs uppercase font-extrabold text-indigo-700 tracking-wider flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-indigo-600 animate-pulse" />
                            <span>Predictive GPA Forecast Sandbox</span>
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Model future performance. Choose automatic statistical trends or directly test target marks.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          {/* Enable Forecast checkbox */}
                          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-655">
                            <input 
                              type="checkbox" 
                              checked={enableProjection} 
                              onChange={(e) => setEnableProjection(e.target.checked)}
                              className="rounded text-blue-600 focus:ring-blue-500 border-slate-205 h-4 w-4 cursor-pointer"
                            />
                            <span>Show Predictive Forecasts</span>
                          </label>

                          {enableProjection && (
                            <div className="flex p-0.5 bg-slate-200/80 rounded-lg text-[10px]">
                              <button 
                                type="button"
                                onClick={() => setSimulationMode('momentum')}
                                className={`px-2.5 py-1.5 rounded-md font-bold uppercase tracking-wider transition-all cursor-pointer ${simulationMode === 'momentum' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                              >
                                Auto Trend
                              </button>
                              <button 
                                type="button"
                                onClick={() => setSimulationMode('custom')}
                                className={`px-2.5 py-1.5 rounded-md font-bold uppercase tracking-wider transition-all cursor-pointer ${simulationMode === 'custom' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                              >
                                Custom Targets
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {enableProjection ? (
                        <div className="grid md:grid-cols-3 gap-6 pt-1">
                          {/* Left Stats Indicator Column */}
                          <div className="bg-white border border-slate-150 rounded-xl p-4 space-y-4 flex flex-col justify-between">
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simulated GPA Telemetry</h4>
                              
                              <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                                <div>
                                  <span className="text-[9px] text-slate-500 block">Actual Cumulative GPA</span>
                                  <span className="text-base font-black text-slate-700">{currentGPA.toFixed(2)}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[9px] text-slate-500 block">Graded Modules</span>
                                  <span className="text-xs font-bold text-blue-600">{gradedUnits.length} Units</span>
                                </div>
                              </div>

                              <div className="flex justify-between items-center bg-purple-50/40 p-2.5 rounded-xl border border-purple-100">
                                <div>
                                  <span className="text-[9px] text-purple-600 block">Simulated Forecast GPA</span>
                                  <span className="text-xl font-black text-purple-700">{finalProjectedGPA.toFixed(2)}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[9px] text-purple-600 block">Total Projected</span>
                                  <span className="text-xs font-bold text-purple-600">{simPlanChartData.length} Units</span>
                                </div>
                              </div>
                            </div>

                            {/* Trajectory message block */}
                            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-[11px] leading-relaxed text-slate-655 space-y-1 mt-2">
                              <div className="flex items-center gap-1 font-bold text-slate-850 justify-between">
                                <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5 text-blue-500" />Standing Assessment:</span>
                              </div>
                              <div>
                                {finalProjectedGPA > currentGPA ? (
                                  <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                    ▲ Simulated settings forecast a +{((finalProjectedGPA - currentGPA)).toFixed(2)} GPA improvement.
                                  </span>
                                ) : finalProjectedGPA < currentGPA ? (
                                  <span className="text-amber-600 font-semibold">
                                    ▼ Warning: Simulated targets fall below your {currentGPA.toFixed(2)} baseline. Keep marks high!
                                  </span>
                                ) : (
                                  <span className="text-slate-600">
                                    ■ Stabilized: Forecast matches your current academic standing baseline.
                                  </span>
                                )}
                              </div>
                              {simulationMode === 'momentum' ? (
                                <p className="text-[9px] text-slate-400 pt-1.5 border-t border-slate-100 mt-1">
                                  Auto trend uses your grade variance slope ({momentumSlope > 0 ? `+${momentumSlope.toFixed(1)}%` : `${momentumSlope.toFixed(1)}%`} progress per unit) to project future entries.
                                </p>
                              ) : (
                                <p className="text-[9px] text-purple-400 pt-1.5 border-t border-slate-100 mt-1">
                                  Manual Sandbox active. Drag the sliders on the right to simulate target marks.
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right Controls Column */}
                          <div className="md:col-span-2 space-y-4">
                            {simulationMode === 'custom' ? (
                              <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                                  <span>Drag Outstanding Course Targets (%)</span>
                                  <span className="text-[9px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-mono font-bold">Simulator Tuning</span>
                                </h4>

                                {simPlanUnits.filter(u => u.type !== 'graded').length === 0 ? (
                                  <div className="text-center py-8 bg-white border border-slate-200 rounded-xl space-y-1">
                                    <p className="text-xs text-slate-500 italic">No future or un-graded units in scope.</p>
                                    <p className="text-[10px] text-slate-400">Add hypothetical classes below to simulate future terms.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                                    {simPlanUnits.filter(u => u.type !== 'graded').map((item, idx) => {
                                      const code = item.code;
                                      const currentVal = simulatedGrades[code] !== undefined 
                                        ? simulatedGrades[code] 
                                        : Math.round(baselineAvg);
                                      
                                      return (
                                        <div key={code} className="bg-white border border-slate-150 p-2.5 rounded-xl space-y-2 hover:border-slate-250 transition-colors">
                                          <div className="flex justify-between items-center text-xs">
                                            <div>
                                              <span className="font-mono font-black text-indigo-700">{code}</span>
                                              <span className="text-slate-500 text-[10px] truncate max-w-[200px] block font-medium">
                                                {subjectMap[code] || 'Planning Subject'}
                                              </span>
                                            </div>
                                            <span className="bg-purple-50 text-purple-700 border border-purple-150 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                                              {currentVal}% (Grade {getLetterForMark(currentVal)} / GP {getGPForMark(currentVal).toFixed(1)})
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <input 
                                              type="range" 
                                              min="30" 
                                              max="100" 
                                              value={currentVal} 
                                              onChange={(e) => setSimulatedGrades(prev => ({
                                                ...prev,
                                                [code]: Number(e.target.value)
                                              }))}
                                              className="flex-1 accent-purple-650 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                                            />
                                            {/* Quick grade preset shortcuts */}
                                            <div className="flex gap-1">
                                              {[55, 65, 80].map((tVal) => (
                                                <button
                                                  key={tVal}
                                                  type="button"
                                                  onClick={() => setSimulatedGrades(prev => ({ ...prev, [code]: tVal }))}
                                                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold border transition-all cursor-pointer ${
                                                    currentVal === tVal 
                                                      ? 'bg-purple-600 text-white border-purple-600' 
                                                      : 'bg-slate-50 text-slate-655 border-slate-205 hover:bg-slate-100'
                                                  }`}
                                                >
                                                  {tVal >= 80 ? 'A' : tVal >= 65 ? 'B' : 'C'} ({tVal}%)
                                                </button>
                                              ))}
                                            </div>
                                            {item.type === 'hypothetical' && (
                                              <button
                                                type="button"
                                                onClick={() => setHypotheticalUnits(prev => prev.filter(c => c !== code))}
                                                className="text-red-505 hover:text-red-700 hover:bg-red-55 p-1 rounded transition-colors cursor-pointer"
                                                title="Remove Hypothetical course"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="bg-white border border-slate-150 p-5 rounded-xl space-y-2 flex flex-col justify-center h-full text-center">
                                <TrendingUp className="w-7 h-7 text-indigo-500/80 mx-auto animate-pulse" strokeWidth={1.5} />
                                <h5 className="font-bold text-xs text-slate-850">Statistical Auto-Projection Active</h5>
                                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                                  Future semesters are extrapolated based on your historical academic momentum. Click the <b>Custom Targets</b> button in the header to modify grades manually.
                                </p>
                              </div>
                            )}

                            {/* Add Hypothetical Study Units input row */}
                            <div className="bg-white border border-slate-150 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-black block tracking-wider">Append Hypothetical Modules</span>
                                <span className="text-[10px] text-slate-500 block">Simulate grades for potential future courses.</span>
                              </div>

                              <div className="flex gap-2">
                                <select
                                  value={selectedUnitCode}
                                  onChange={(e) => setSelectedUnitCode(e.target.value)}
                                  className="bg-white border border-slate-200 rounded-xl px-2 py-1 text-[11px] text-slate-700 focus:outline-hidden focus:border-blue-500 max-w-xs cursor-pointer"
                                >
                                  <option value="">-- Select Course --</option>
                                  {unregisteredCodes.filter(c => !hypotheticalUnits.includes(c)).map((code) => (
                                    <option key={code} value={code}>
                                      [{code}] {subjectMap[code] || code}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (selectedUnitCode && !hypotheticalUnits.includes(selectedUnitCode)) {
                                      setHypotheticalUnits(prev => [...prev, selectedUnitCode]);
                                      setSelectedUnitCode('');
                                    }
                                  }}
                                  disabled={!selectedUnitCode}
                                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Simulate Courses</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white border border-dashed border-slate-250 p-4 rounded-xl text-center">
                          <p className="text-xs text-slate-500 italic">Predictive simulation details hidden. Check "Show Predictive Forecasts" to restore.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl text-center space-y-2 py-8 no-print">
                    <Sparkles className="w-8 h-8 text-blue-500/50 mx-auto" />
                    <p className="font-bold text-xs text-slate-800 uppercase tracking-wider">Awaiting academic grade entry</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      As soon as your subject lecturers publish assessments or final examination marks under their portal, your progressive learning curves and cumulative averages will activate.
                    </p>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                        <th className="py-3 px-4">Subject Code</th>
                        <th className="py-3 px-4">Class Module Title</th>
                        <th className="py-3 px-4 text-center">CAT Grade (Max 30)</th>
                        <th className="py-3 px-4 text-center">Exam Grade (Max 70)</th>
                        <th className="py-3 px-4 text-center">Invoiced Total</th>
                        <th className="py-3 px-4 text-center">Grade Classification</th>
                        <th className="py-3 px-4 text-center">Syllabus Evaluation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                    {student.enrolledUnits.map((code) => {
                      const grade = student.grades[code] || { cat: 0, exam: 0 };
                      const totalMark = grade.cat + grade.exam;
                      const hasMarks = student.grades[code] !== undefined;
                      const classification = getGradeClassification(grade.cat, grade.exam);

                      const associatedCourse = allCourses.find(c => code.startsWith(c.code)) || allCourses.find(c => c.code === code);
                      const existingReview = reviews.filter(Boolean).find(r => 
                        associatedCourse && 
                        r.studentId === student.id && 
                        (r.courseId === associatedCourse.id || r.courseId === associatedCourse.code)
                      );

                      return (
                        <tr key={code} className="hover:bg-slate-50/50">
                          <td className="py-4 px-4 font-mono font-semibold text-slate-900">{code}</td>
                          <td className="py-4 px-4 text-slate-700">{subjectMap[code] || 'Unassigned Module'}</td>
                          <td className="py-4 px-4 text-center text-slate-800 font-medium">
                            {hasMarks ? `${grade.cat} / 30` : <span className="text-slate-400">Not Uploaded</span>}
                          </td>
                          <td className="py-4 px-4 text-center text-slate-800 font-medium">
                            {hasMarks ? `${grade.exam} / 70` : <span className="text-slate-400">Not Uploaded</span>}
                          </td>
                          <td className="py-4 px-4 text-center font-bold text-slate-900 bg-slate-50/30">
                            {hasMarks ? `${totalMark}%` : 'N/A'}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {hasMarks ? (
                              <div className="flex items-center justify-center gap-2">
                                <span className={`font-black text-xs px-2.5 py-1 rounded-md border ${classification.class}`}>
                                  {classification.grade}
                                </span>
                                <span className="text-[10px] text-slate-500 hidden lg:inline">{classification.text}</span>
                              </div>
                            ) : (
                              <span className="text-slate-350 italic">Pending lecturer upload</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {hasMarks ? (
                              associatedCourse ? (
                                existingReview ? (
                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                    <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 px-2 py-0.5 rounded-lg border border-amber-200">
                                      <span className="text-amber-500 font-sans text-xs">★</span>
                                      <span className="font-extrabold text-[10px]">{existingReview.rating} / 5</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setActiveReviewCourse(associatedCourse)}
                                      className="text-[9px] text-blue-600 hover:text-blue-800 hover:underline font-bold p-0.5"
                                    >
                                      Edit Feedback
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setActiveReviewCourse(associatedCourse)}
                                    className="bg-blue-50 hover:bg-blue-100 text-blue-750 hover:text-blue-800 border border-blue-200 hover:border-blue-300 font-bold px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 mx-auto transition-all cursor-pointer shadow-3xs"
                                  >
                                    <span>Rate Course</span>
                                  </button>
                                )
                              ) : (
                                <span className="text-slate-350 italic">Modular unit</span>
                              )
                            ) : (
                              <span className="text-slate-300 italic">Awaiting grade</span>
                            )}
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

        {/* TAB 2: FINANCIAL STATEMENT */}
        {activeTab === 'financials' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-100 pb-3 gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5 animate-fade-in">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Student Ledger & Account Reconciliation
                </h2>
                <p className="text-xs text-slate-500 mt-1">Automated student bills for tuition, accommodation, and structural services.</p>
              </div>

              {outstandingBal > 0 && (
                <div className="inline-flex items-center gap-1.5 self-start sm:self-auto bg-amber-50 text-amber-800 px-3 py-1 bg-amber-10 rounded-lg text-xs font-bold border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Account Arrears Notice</span>
                </div>
              )}
            </div>

            {/* Financial Ledger statement */}
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Ledger breakdown detail */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Itemized Ledger Invoices</h3>
                <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {student.ledger.map((inv) => (
                    <div key={inv.id} className="p-4 flex justify-between items-center bg-white hover:bg-slate-50/20 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 text-sm">{inv.description}</span>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded">{inv.invoiceNo}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Generated: {inv.date}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-extrabold text-slate-900 text-sm">KES {inv.amount.toLocaleString()}</span>
                        {inv.status === 'paid' ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-sm text-[10px] font-bold">Paid</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setSelectedInvoice(inv); setShowPaymentModal(true); }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-sm shadow-xs transition-colors cursor-pointer"
                          >
                            Pay Bill
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments ledger & Statements */}
              <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Account Statements Balances</h3>
                <div className="divide-y divide-slate-200/50 text-xs text-slate-600 space-y-3 pt-1">
                  
                  <div className="flex justify-between pb-2">
                    <span>Total Invoiced Obligations:</span>
                    <span className="font-bold text-slate-900">KES {totalInvoiced.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between py-2">
                    <span>Invoices Paid:</span>
                    <span className="font-bold text-emerald-600">KES {totalPaid.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between pt-2">
                    <span className="font-semibold">Outstanding Fees:</span>
                    <span className={`text-base font-extrabold ${outstandingBal > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      KES {outstandingBal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Simulated payment transactions history */}
                <div className="border-t border-slate-200/60 pt-4 space-y-2">
                  <h4 className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Payment Attempts Log</h4>
                  
                  {student.payments.length === 0 ? (
                    <p className="text-[10px] italic text-slate-400">No payment logs found.</p>
                  ) : (
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {student.payments.map((p) => {
                        const targetInvoice = student.ledger.find(i => i.id === p.invoiceId);
                        return (
                          <div key={p.id} className="bg-white border border-slate-150 p-2.5 rounded-lg text-[10px] space-y-1">
                            <div className="flex justify-between font-bold">
                              <span className="text-slate-800 truncate max-w-[120px]">{targetInvoice?.description || 'Invoice Payment'}</span>
                              <span className="text-slate-900">KES {p.amount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 font-mono text-[9px]">
                              <span>Tx: {p.transactionId}</span>
                              <span className={p.status === 'reconciled' ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                                {p.status === 'reconciled' ? 'Reconciled' : 'Unreconciled'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: STUDY MATERIALS */}
        {activeTab === 'materials' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-blue-600" />
                Supplementary Course Materials
              </h2>
              <p className="text-xs text-slate-500 mt-1">Study handouts, files, laboratory manuals, and lecture slides allocated to your specific registered class modules.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {mockStudyMaterials
                .filter(material => student.enrolledUnits.includes(material.unit))
                .map((m, idx) => (
                  <div key={idx} className="bg-white border border-slate-150 p-4 rounded-xl shadow-2xs hover:border-blue-300 transition-all flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-50 text-blue-700 text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold">
                          {m.unit}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium font-mono">{m.size}</span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-xs lines-clamp-2 pr-4">{m.title}</h4>
                      <p className="text-[10px] text-slate-400 font-mono font-medium">Attachment: <span className="text-blue-500">{m.file}</span></p>
                    </div>

                    <button
                      type="button"
                      onClick={() => alert(`Starting simulated download process for file: "${m.file}" (${m.size})`)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-650 p-2 rounded-lg transition-colors cursor-pointer"
                      title="Download Resource Guide"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}

              {mockStudyMaterials.filter(m => student.enrolledUnits.includes(m.unit)).length === 0 && (
                <div className="sm:col-span-2 text-center py-12 bg-slate-55 rounded-xl border border-dashed border-slate-200">
                  <FileText className="w-10 h-10 text-slate-350 mx-auto mb-2" />
                  <p className="font-semibold text-sm text-slate-700">No resources available for your current units.</p>
                  <p className="text-xs text-slate-400 mt-0.5">Please check again once modules are added or lecturers publish supplementary guides.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: UNIT REGISTRATION Dropdown engine */}
        {activeTab === 'units' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Unit Module Allocator & Registration
              </h2>
              <p className="text-xs text-slate-500 mt-1">Register or drop supplementary class subjects. Enrolling instantly lists subjects in your grading sheets and gradebooks.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              
              {/* Left Column: Register New Unit */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  Add/Enroll Registered Modules
                </h3>

                {unregisteredCodes.length === 0 ? (
                  <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 text-xs">
                    <span className="font-bold block flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      All curriculum units registered.
                    </span>
                    <span>No outstanding units remain for placement this intake season.</span>
                  </div>
                ) : (
                  <form onSubmit={handleAddUnitRegister} className="space-y-3">
                    <div className="space-y-1.5">
                      <label htmlFor="unit-selector" className="block text-xs font-semibold text-slate-700">Choose Available Module</label>
                      <select
                        id="unit-selector"
                        value={selectedUnitCode}
                        onChange={(e) => setSelectedUnitCode(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-hidden"
                      >
                        <option value="">-- Choose Module --</option>
                        {unregisteredCodes.map((code) => (
                          <option key={code} value={code}>
                            {code} - {subjectMap[code] || code}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={!selectedUnitCode}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <span>Complete Registration</span>
                    </button>
                  </form>
                )}

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/40 text-[11px] text-blue-800 leading-relaxed space-y-1.5">
                  <span className="font-bold block">Academic Policy Checklist:</span>
                  <p>• Adding a unit instantly registers your index to the corresponding lecturer's spreadsheet.</p>
                  <p>• Retakes/Supplementary marks will use the same module indices.</p>
                </div>
                        {/* Right Column: Currently enrolled modules */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">My Active Module Registrations</h3>
                
                {student.enrolledUnits.length === 0 ? (
                  <p className="text-xs italic text-slate-400">No active units catalogued.</p>
                ) : (
                  <div className="space-y-4.5">
                    {student.enrolledUnits.map((code) => {
                      const progress = getUnitAcademicProgress(code);
                      return (
                        <div key={code} className="bg-slate-50 p-4.5 rounded-2xl border border-slate-150 space-y-3.5 hover:border-slate-300 transition-all shadow-3xs">
                          {/* Unit Title and Drop Action */}
                          <div className="flex justify-between items-start gap-3">
                            <div className="space-y-1">
                              <span className="font-mono font-black text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                                {code}
                              </span>
                              <h4 className="text-slate-800 font-bold block text-xs mt-1.5 leading-tight">
                                {subjectMap[code] || 'Unassigned Catalog Title'}
                              </h4>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Are you absolutely sure you want to drop unit: ${code}?\nThis will clear any uploaded grades associated with it.`)) {
                                  onDeregisterUnit(code);
                                }
                              }}
                              className="bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 p-1.5 rounded-xl border border-slate-200 hover:border-rose-200 transition-all cursor-pointer shrink-0 shadow-xs"
                              title="Deregister Module"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Attendance and Assignment Breakdown */}
                          <div className="grid grid-cols-2 gap-2.5 text-[10px]">
                            <div className="bg-white p-2.5 rounded-xl border border-slate-100 space-y-1">
                              <span className="text-slate-400 font-bold uppercase tracking-wider block text-[8px]">Attendance Log</span>
                              <div className="flex justify-between items-baseline">
                                <span className="font-extrabold text-slate-700">{progress.lectures}</span>
                                <span className="font-mono font-extrabold text-emerald-600">{progress.attendanceRate}%</span>
                              </div>
                            </div>

                            <div className="bg-white p-2.5 rounded-xl border border-slate-100 space-y-1">
                              <span className="text-slate-400 font-bold uppercase tracking-wider block text-[8px]">Assignments Submitted</span>
                              <div className="flex justify-between items-baseline">
                                <span className="font-extrabold text-slate-700">{progress.assignments}</span>
                                <span className="font-mono font-extrabold text-blue-600">{progress.assignmentRate}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Complex Visual Progress Bar */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 uppercase font-bold tracking-wider text-[8px]">Academic completion rate</span>
                              <span className="font-mono font-black text-slate-800 bg-white border border-slate-150 px-1.5 py-0.5 rounded-md">
                                {progress.overallProgress}%
                              </span>
                            </div>

                            {/* Split Segmented Bar */}
                            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex p-0.5">
                              {/* Attendance Rate component (takes up 50% max of track width, multiplied by compliance) */}
                              <div 
                                style={{ width: `${progress.attendanceRate * 0.5}%` }} 
                                className="bg-emerald-500 rounded-l-full transition-all duration-300"
                                title={`Attendance Segment: ${(progress.attendanceRate * 0.5).toFixed(0)}%`}
                              />
                              {/* Spacer to simulate segment dividing */}
                              <div className="w-[1px] bg-slate-200 shrink-0" />
                              {/* Assignment Rate component (takes up 50% max of track width, multiplied by compliance) */}
                              <div 
                                style={{ width: `${progress.assignmentRate * 0.5}%` }} 
                                className="bg-blue-600 rounded-r-gradient transition-all duration-300"
                                title={`Assignment Segment: ${(progress.assignmentRate * 0.5).toFixed(0)}%`}
                              />
                            </div>

                            <div className="flex justify-between text-[8px] uppercase tracking-wider font-bold text-slate-400 font-mono">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                Attendance Log info
                              </span>
                              <span className="flex items-center gap-1">
                                Aufgaben Tasks
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block"></span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>      </div>

            </div>
          </div>
        )}

        {/* TAB 5: OFFICE HOURS SCHEDULING (30-minute Slots Booking) */}
        {activeTab === 'officeHours' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5 font-display">
                <Clock className="w-5 h-5 text-blue-600" />
                Office Hours & Consultation Bookings
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Book personalized 30-minute face-to-face or virtual consultation slots with your course lecturers for assignments and projects.
              </p>
            </div>

            {/* List booked slots first */}
            <div className="space-y-4">
              <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Your Booked Consultations
              </h3>

              {(() => {
                const bookedByMe: Array<{ lecturer: Lecturer; slot: any }> = [];
                lecturers.forEach(l => {
                  (l.officeHours || []).forEach(slot => {
                    if (slot.status === 'booked' && slot.studentId === student.id) {
                      bookedByMe.push({ lecturer: l, slot });
                    }
                  });
                });

                if (bookedByMe.length === 0) {
                  return (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-center text-xs text-slate-400 italic">
                      You haven't scheduled any consultations yet. Browse available slots below to schedule session help.
                    </div>
                  );
                }

                return (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {bookedByMe.map(({ lecturer, slot }) => (
                      <div key={slot.id} className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-3xs">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-3">
                            <img 
                              src={lecturer.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300'} 
                              alt={lecturer.name} 
                              className="w-10 h-10 rounded-full object-cover border border-emerald-250 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm">{lecturer.name}</h4>
                              <p className="text-[10px] text-slate-450 font-mono font-bold uppercase">{lecturer.designatorCode}</p>
                            </div>
                          </div>
                          <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                            Booked Slot
                          </span>
                        </div>

                        <div className="bg-white border border-slate-150 rounded-lg p-3 space-y-1.5 text-xs text-slate-700">
                          <p className="flex items-center gap-1.5 font-bold text-slate-850">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Day: {slot.day}</span>
                          </p>
                          <p className="flex items-center gap-1.5 font-bold text-slate-850">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Time: {slot.time} (30 mins)</span>
                          </p>
                          {slot.studentNotes && (
                            <div className="border-t border-slate-100 pt-2 mt-2 text-[10.5px] leading-relaxed text-slate-600">
                              <span className="font-bold block text-slate-400 uppercase tracking-widest text-[8px]">Inquiry Notes:</span>
                              "{slot.studentNotes}"
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 pt-1 border-t border-emerald-100/50">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Are you sure you want to cancel this office hour slot reservation?')) {
                                onCancelOfficeHour?.(lecturer.id, slot.id);
                              }
                            }}
                            className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-650 hover:text-red-700 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                          >
                            Cancel Session
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Selector-based Booking Panel */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                Schedule Consultation Slots
              </h3>

              <div className="grid md:grid-cols-3 gap-6">
                
                {/* Column A: Select Teacher */}
                <div className="space-y-4 md:border-r border-slate-100 md:pr-6">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">1. Select Lecturer</span>
                  
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                    {lecturers.map(l => {
                      const isSelected = selectedLecturerId === l.id;
                      const availableCount = (l.officeHours || []).filter(s => s.status === 'available').length;
                      const isLecActive = l.isActive !== false;
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            setSelectedLecturerId(l.id);
                            setBookingSlotId(null);
                            setBookingNotes('');
                          }}
                          className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-500/20'
                              : 'bg-white border-slate-150 hover:bg-slate-50'
                          }`}
                        >
                          <div className="relative shrink-0">
                            <img 
                              src={l.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300'} 
                              alt={l.name} 
                              className="w-10 h-10 rounded-full object-cover border border-slate-100"
                              referrerPolicy="no-referrer"
                            />
                            <span 
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800 ${
                                isLecActive ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                              title={isLecActive ? 'Available' : 'Away'}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 justify-between">
                              <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-blue-700' : 'text-slate-850'}`}>{l.name}</h4>
                              <span className={`text-[8px] font-bold ${isLecActive ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {isLecActive ? 'Active' : 'Away'}
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-400 font-semibold truncate leading-tight">
                              Dept: {l.subjects.map(s => s.split('-')[0]).join(', ')}
                            </p>
                            <span className={`inline-block mt-1 text-[8.5px] px-1.5 py-px rounded-sm font-bold uppercase ${availableCount > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                              {availableCount} slots free
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Column B: Slots & Reservation */}
                <div className="md:col-span-2 space-y-4">
                  {selectedLecturer ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img 
                              src={selectedLecturer.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300'} 
                              alt={selectedLecturer.name} 
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              referrerPolicy="no-referrer"
                            />
                            <span 
                              className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white dark:border-slate-800 ${
                                selectedLecturer.isActive !== false ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8.5px] uppercase font-bold text-slate-400 font-mono tracking-wider">Active Choice</span>
                              <span className={`text-[8px] font-black uppercase px-1.5 py-px rounded-xs ${
                                selectedLecturer.isActive !== false 
                                  ? 'bg-emerald-100 text-emerald-805' 
                                  : 'bg-rose-100 text-rose-805'
                              }`}>
                                {selectedLecturer.isActive !== false ? 'Available' : 'Away'}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-850">{selectedLecturer.name}</h4>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="block text-[8.5px] text-slate-400 font-mono">CODE</span>
                          <span className="text-[10px] text-slate-500 font-bold block">{selectedLecturer.designatorCode}</span>
                        </div>
                      </div>

                      {/* Scheduling grid */}
                      <div className="space-y-4">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">2. Choose Available 30-Min Interval</span>

                        {selectedLecturer.isActive === false && (
                          <div className="bg-amber-50 text-amber-900 border border-amber-150 p-3.5 rounded-xl flex gap-2.5 text-xs">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-extrabold text-amber-950">Lecturer Consultation Status is Away</p>
                              <p className="opacity-90 text-[11px] mt-0.5">Please note that this lecturer is currently away or offline for active consultations. Bookings can still be submitted, but approvals/responses may be delayed.</p>
                            </div>
                          </div>
                        )}
                        
                        {(() => {
                          const slots = selectedLecturer.officeHours || [];
                          const availableSlots = slots.filter(s => s.status === 'available');

                          if (availableSlots.length === 0) {
                            return (
                              <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-xl p-4 flex gap-3 text-xs">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                  <p className="font-bold">No Available Slots Left</p>
                                  <p className="text-slate-650">This lecturer does not currently have any active unbooked slots. Check back soon as they update their calendars.</p>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="grid sm:grid-cols-2 gap-3">
                              {availableSlots.map(s => {
                                const isSelectingThis = bookingSlotId === s.id;
                                return (
                                  <div 
                                    key={s.id} 
                                    className={`border rounded-xl p-3.5 space-y-3 transition-all ${
                                      isSelectingThis 
                                        ? 'bg-blue-50/40 border-blue-400 shadow-sm ring-1 ring-blue-500/20' 
                                        : 'bg-white border-slate-150 hover:border-slate-350'
                                    }`}
                                  >
                                    <div className="flex justify-between items-center text-xs">
                                      <div className="space-y-0.5">
                                        <p className="font-black text-slate-800">{s.day}</p>
                                        <p className="text-[10px] text-slate-500 font-mono font-bold flex items-center gap-1">
                                          <Clock className="w-3.5 h-3.5 text-blue-500" /> {s.time}
                                        </p>
                                      </div>
                                      <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-[#bbf7d0] font-black uppercase px-2 py-0.5 rounded tracking-wide">
                                        Free
                                      </span>
                                    </div>

                                    {!isSelectingThis ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setBookingSlotId(s.id);
                                          setBookingNotes('');
                                        }}
                                        className="w-full bg-slate-900 hover:bg-slate-950 text-white py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all cursor-pointer"
                                      >
                                        Select Slot
                                      </button>
                                    ) : (
                                      <div className="border-t border-slate-100 pt-2.5 space-y-2.5">
                                        <div className="space-y-1">
                                          <label htmlFor={`notes-${s.id}`} className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            Topic / Reason for Consultation
                                          </label>
                                          <input
                                            id={`notes-${s.id}`}
                                            type="text"
                                            value={bookingNotes}
                                            onChange={(e) => setBookingNotes(e.target.value)}
                                            placeholder="e.g. Unit exam help, career pathing advice..."
                                            className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden"
                                            required
                                          />
                                        </div>

                                        <div className="flex gap-2 justify-end">
                                          <button
                                            type="button"
                                            onClick={() => setBookingSlotId(null)}
                                            className="px-2 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-[9px] uppercase tracking-wider rounded-lg"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (!bookingNotes.trim()) {
                                                alert('Please describe your consultation topic or question.');
                                                return;
                                              }
                                              onBookOfficeHour?.(selectedLecturer.id, s.id, {
                                                studentId: student.id,
                                                studentName: student.name,
                                                studentEmail: student.email,
                                                studentNotes: bookingNotes
                                              });
                                              setBookingSlotId(null);
                                              setBookingNotes('');
                                              // Simple visual trigger
                                              setBookingSuccessMessage(`Consultation scheduled successfully on ${s.day} at ${s.time}!`);
                                              setTimeout(() => setBookingSuccessMessage(null), 3000);
                                            }}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer"
                                          >
                                            <span>Reserve Slot</span>
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center text-xs text-slate-400 italic space-y-1">
                      <p>No Lecturer Selected.</p>
                      <p className="font-normal">Please pick a teacher from the left panel to display and book free office hour blocks.</p>
                    </div>
                  )}
                  
                  {bookingSuccessMessage && (
                    <div className="bg-emerald-50 text-emerald-800 border border-[#bbf7d0] p-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 animate-bounce shadow-2xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{bookingSuccessMessage}</span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 6: STUDENT E-LIBRARY CATALOG & COMPACT OPAC */}
        {activeTab === 'library' && (
          <StudentLibraryView
            student={student}
            books={books}
            loans={loans}
            reservations={reservations}
            readingLists={readingLists}
            bookReviews={bookReviews}
            bookRequests={bookRequests}
            examPapers={examPapers}
            libraryGateLogs={libraryGateLogs}
            onReserveBook={onReserveBook}
            onCancelReservation={onCancelReservation}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onAddBookReview={onAddBookReview}
            onAddBookRequest={onAddBookRequest}
            onTriggerGateLog={onTriggerGateLog}
            onCheckoutBook={onCheckoutBook}
            onReturnBook={onReturnBook}
          />
        )}

      </div>

      {/* M-PESA & METHOD BILLS PAYMENT MODAL OVERLAY */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 flex flex-col">
            <div className="h-1.5 bg-blue-600 w-full" />
            
            <div className="p-5 flex justify-between items-center border-b border-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Make Bill Payment</h3>
                <span className="text-[10px] text-slate-400">Pay: {selectedInvoice.description}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-650 font-bold p-1 hover:bg-slate-55 rounded text-xs"
              >
                Cancel
              </button>
            </div>

            {paymentSuccess ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 animate-bounce" />
                </div>
                <h4 className="font-black text-slate-800 text-sm">Payment Attempt Triggered!</h4>
                <p className="text-xs text-slate-500">Unreconciled receipt was generated in your transaction logs. Admin reconciliation will verify the receipt.</p>
              </div>
            ) : (
              <form onSubmit={handleExecutePayment} className="p-5 space-y-4">
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('M-Pesa')}
                    className={`flex-1 py-1.5 rounded-lg border font-bold text-xs flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === 'M-Pesa'
                        ? 'bg-emerald-50 text-emerald-850 border-emerald-500'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>M-Pesa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Bank Transfer')}
                    className={`flex-1 py-1.5 rounded-lg border font-bold text-xs flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === 'Bank Transfer'
                        ? 'bg-blue-50 text-blue-800 border-blue-550'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    <Landmark className="w-4 h-4 text-blue-600" />
                    <span>Bank Transfer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Card')}
                    className={`flex-1 py-1.5 rounded-lg border font-bold text-xs flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === 'Card'
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-550'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <span>Card</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-50 p-2.5 rounded-lg text-xs flex justify-between font-medium">
                    <span>Payment Bill:</span>
                    <span className="font-bold text-slate-900">KES {selectedInvoice.amount.toLocaleString()}</span>
                  </div>

                  {paymentMethod === 'M-Pesa' ? (
                    <div className="space-y-1">
                      <label htmlFor="modal-phone" className="block text-[11px] font-bold text-slate-650">Safcom M-Pesa Phone No</label>
                      <input
                        id="modal-phone"
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+254 7XX XXX XXX"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden text-slate-800"
                        required
                      />
                    </div>
                  ) : paymentMethod === 'Bank Transfer' ? (
                    <div className="space-y-2">
                      <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100 text-[10px] text-indigo-850">
                        <span className="font-bold block">Institution Bank Accounts:</span>
                        <span>Bank: NCBA Bank Upperhill • Acc: 987654321</span>
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="modal-tx-ref" className="block text-[11px] font-bold text-slate-650">Bank EFT/RTGS Tx Reference Code</label>
                        <input
                          id="modal-tx-ref"
                          type="text"
                          value={bankTxRef}
                          onChange={(e) => setBankTxRef(e.target.value)}
                          placeholder="NCB-912384"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden text-slate-800"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-650">Mock Card Details</label>
                      <input
                        type="text"
                        placeholder="4242 •••• •••• 4242"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden text-slate-800"
                        required
                        disabled
                        value="4242 4242 4242 4242"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={paymentProcessing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-xs flex justify-center gap-2 items-center cursor-pointer disabled:opacity-50"
                >
                  {paymentProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Requesting STK push / EFT...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Payment Statement</span>
                    </>
                  )}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* NATIVE PRINT DIALOG TARGET ELEMENT */}
      <div id="print-area" className="hidden font-sans p-10 bg-white text-black border-[12px] border-double border-slate-900 max-w-[800px] mx-auto my-4 text-xs">
        
        {/* Print Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-950 pb-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <div className="w-6 h-6 bg-white rotate-45"></div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase text-blue-650 font-display">Zenti Academy</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Institutional Information System</p>
              <p className="text-[9px] text-slate-400">PO Box 100-00100 Nairobi • info@zenti.edu • +254 700 000 000</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-base font-extrabold text-slate-900 leading-tight font-display">OFFICIAL ACADEMIC STATEMENT</h2>
            <span className="text-[9px] bg-slate-950 text-white font-bold px-2.5 py-0.5 uppercase tracking-wider font-mono">Semester Grade transcript</span>
          </div>
        </div>

        {/* Print Metadata */}
        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 border border-slate-205 mb-6 text-xs">
          <div className="space-y-1">
            <div>
              <span className="text-slate-400 uppercase tracking-wider text-[8px] font-bold block block">Student Full Name</span>
              <span className="font-extrabold text-slate-900 text-sm">{student.name}</span>
            </div>
            <div className="pt-1">
              <span className="text-slate-400 uppercase tracking-wider text-[8px] font-bold block">Cohort Stream group</span>
              <span className="font-semibold text-slate-700">{student.cohort}</span>
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div>
              <span className="text-slate-400 uppercase tracking-wider text-[8px] font-bold block">Official Student ID No</span>
              <span className="font-mono font-extrabold text-slate-900 text-sm">{student.admissionNo}</span>
            </div>
            <div className="pt-1">
              <span className="text-slate-400 uppercase tracking-wider text-[8px] font-bold block">Date of Issue</span>
              <span className="font-semibold text-slate-700">
                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Print Ledger Results Table */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 pb-1 border-b border-dashed border-slate-350 font-display">Registered Subject grade metric</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-950 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-2">Unit Code</th>
                <th className="py-2">Subject Class Title</th>
                <th className="py-2 text-center">CAT Score (30)</th>
                <th className="py-2 text-center font-semibold">Exam Score (70)</th>
                <th className="py-2 text-center">Total Score (100)</th>
                <th className="py-2 text-right">Academic Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {student.enrolledUnits.map((code) => {
                const grade = student.grades[code] || { cat: 0, exam: 0 };
                const totalMark = grade.cat + grade.exam;
                const hasMarks = student.grades[code] !== undefined;
                const classification = getGradeClassification(grade.cat, grade.exam);

                return (
                  <tr key={code} className="py-2.5">
                    <td className="py-2 font-mono font-bold text-slate-900">{code}</td>
                    <td className="py-2 text-slate-800">{subjectMap[code] || 'Supplementary Module'}</td>
                    <td className="py-2 text-center">
                      {hasMarks ? `${grade.cat}` : 'N/A'}
                    </td>
                    <td className="py-2 text-center">
                      {hasMarks ? `${grade.exam}` : 'N/A'}
                    </td>
                    <td className="py-2 text-center font-bold">
                      {hasMarks ? `${totalMark}%` : 'N/A'}
                    </td>
                    <td className="py-2 text-right">
                      {hasMarks ? (
                        <span className="font-bold uppercase text-slate-900">
                          {classification.grade} ({classification.text.split(' ')[0]})
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">Pending Upload</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>

        {/* Average Calculations Summary Block */}
        <div className="mt-8 pt-4 border-t-2 border-slate-950 grid grid-cols-3 gap-4 text-xs font-sans">
          <div className="p-3 bg-slate-50 border border-slate-200">
            <span className="text-slate-400 font-bold text-[8px] uppercase tracking-wider block">Aggregate grade</span>
            <span className="text-base font-black text-slate-900">
              {(() => {
                const graded = Object.values(student.grades);
                if (graded.length === 0) return 'N/A';
                const totalSum = graded.reduce((sum, g) => sum + (g.cat + g.exam), 0);
                return `${Math.round(totalSum / graded.length)}%`;
              })()}
            </span>
          </div>
          
          <div className="p-3 bg-slate-50 border border-slate-200">
            <span className="text-slate-400 font-bold text-[8px] uppercase tracking-wider block">Graded Modules count</span>
            <span className="text-base font-black text-slate-900">
              {Object.keys(student.grades).length} / {student.enrolledUnits.length} Units
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200">
            <span className="text-slate-400 font-bold text-[8px] uppercase tracking-wider block">Registrar Classification</span>
            <span className="text-base font-black text-slate-900 font-display">
              {(() => {
                const graded = Object.values(student.grades);
                if (graded.length === 0) return 'N/A';
                const totalSum = graded.reduce((sum, g) => sum + (g.cat + g.exam), 0);
                const avg = totalSum / graded.length;
                if (avg >= 70) return '1st Class division';
                if (avg >= 60) return '2nd Upper division';
                if (avg >= 50) return '2nd Lower division';
                return 'Pass division';
              })()}
            </span>
          </div>
        </div>

        {/* Bottom verification signatures & stamp placeholder */}
        <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-end">
          <div className="text-slate-400 text-[8px] space-y-1 font-mono max-w-[340px]">
            <p className="font-bold uppercase text-slate-650">Validation criteria & rules:</p>
            <p>1. Transcripts are invalid without the state verification seal of Registrar Office.</p>
            <p>2. Any manual modifications or alterations strictly invalidate this document.</p>
            <p>3. Calculated according to Kenya Higher Education Commission standard benchmarks.</p>
          </div>

          <div className="space-y-4 text-center">
            <div className="border border-dashed border-slate-350 rounded-xl p-4 w-44 h-24 flex items-center justify-center bg-slate-50 relative overflow-hidden">
              <div className="absolute inset-0 opacity-5 flex items-center justify-center">
                <svg className="w-16 h-16 text-black" viewBox="0 0 100 100">
                  <polygon points="50,15 90,85 10,85" stroke="currentColor" strokeWidth="2" fill="none" />
                  <circle cx="50" cy="55" r="20" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </div>
              <span className="text-[7px] font-black tracking-widest text-slate-400 uppercase text-center relative z-10 leading-tight">
                OFFICIAL STATE ACCREDITATION SEAL
              </span>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-800">Registrar (Academic Affairs)</p>
              <p className="text-[8px] text-slate-400 font-mono italic">Zenti Management Software verified</p>
            </div>
          </div>
        </div>
      </div>

      {showTranscript && (
        <div id="transcript-wrapper-parent">
          <StudentTranscript 
            student={student} 
            allCourses={allCourses} 
            onClose={() => setShowTranscript(false)} 
          />
        </div>
      )}

      {activeReviewCourse && (
        <CourseReviewModal
          course={activeReviewCourse}
          student={student}
          existingReview={reviews.find(r => r.studentId === student.id && (r.courseId === activeReviewCourse.id || r.courseId === activeReviewCourse.code))}
          onClose={() => setActiveReviewCourse(null)}
          onSubmit={(rating, comment) => {
            if (onAddReview) {
              onAddReview(activeReviewCourse.id, student.id, student.name, rating, comment);
            }
            setActiveReviewCourse(null);
          }}
        />
      )}

      {/* CAMERA CAPTURE PROFILE PHOTO MODAL */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in" id="camera-modal-overlay">
          <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden flex flex-col transform transition-all">
            {/* Header */}
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-150 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wide">Capture Profile Photo</h3>
              </div>
              <button
                type="button"
                onClick={() => { setIsCameraModalOpen(false); stopCamera(); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-205 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video preview / error stage */}
            <div className="p-6 flex flex-col items-center justify-center space-y-4">
              <div className="relative w-72 h-72 rounded-2xl bg-slate-900 overflow-hidden shadow-inner flex items-center justify-center border-2 border-slate-100 dark:border-slate-800">
                {isCameraLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-slate-900 text-slate-400 z-10">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="text-xs font-semibold">Initializing browser camera...</span>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-900 text-rose-400 z-10">
                    <CameraOff className="w-10 h-10 text-rose-500" />
                    <span className="text-xs font-bold leading-normal">{cameraError}</span>
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="text-[10px] bg-white text-slate-900 hover:bg-slate-100 font-extrabold px-3 py-1 rounded-md transition-all cursor-pointer"
                    >
                      Retry Camera Connection
                    </button>
                  </div>
                )}

                {capturedPhoto ? (
                  /* REVIEW COMPONENT */
                  <img
                    src={capturedPhoto}
                    alt="Captured student avatar preview"
                    className="w-full h-full object-cover animate-fade-in"
                  />
                ) : (
                  /* LIVE VIEW COMPONENT */
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                )}

                {/* Overlaid UI Guidelines on camera target */}
                {!capturedPhoto && !cameraError && !isCameraLoading && (
                  <div className="absolute inset-0 pointer-events-none border-2 border-blue-500/30 rounded-2xl m-4 flex items-center justify-center">
                    <div className="w-48 h-48 rounded-full border border-dashed border-white/45 relative">
                      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white/70 tracking-tight uppercase whitespace-nowrap bg-black/40 px-2 py-0.5 rounded-full">
                        Center face here
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions and checklist */}
              <div className="text-center space-y-1 max-w-sm px-2">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {capturedPhoto ? 'Review your new student portal portrait' : 'Say Cheese! Get ready to take your photograph'}
                </p>
                <p className="text-[10.5px] text-slate-400 leading-relaxed">
                  {capturedPhoto 
                    ? 'If you are satisfied with this picture, click on the save button to persist it. Otherwise, click retake.' 
                    : 'Ensure good lighting, keep a neutral pose, and align your face in the target circle.'}
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-150 dark:border-slate-800 flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setIsCameraModalOpen(false); stopCamera(); }}
                className="bg-white hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
              >
                Cancel
              </button>

              {capturedPhoto ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setCapturedPhoto(null); startCamera(); }}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                  >
                    Retake Picture
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePhoto}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs cursor-pointer transition-all"
                  >
                    Set Profile Picture
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={!cameraStream || !!cameraError || isCameraLoading}
                  onClick={capturePhoto}
                  className={`inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-xs cursor-pointer transition-all ${
                    (!cameraStream || cameraError || isCameraLoading) ? 'opacity-50 cursor-not-allowed bg-slate-400' : ''
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Take Snapshot</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
                  You can change your portal passcode below. The default passcode assigned to your student profile is <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800 dark:text-slate-200">student123</code> unless it has been previously modified.
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
