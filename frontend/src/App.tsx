import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Users, ShieldCheck, Home, 
  ChevronRight, Sparkles, BookOpen, Clock, Tag, X, FileText,
  Sun, Moon, Landmark, Bell, BellRing, LayoutGrid
} from 'lucide-react';

import { 
  Course, Lecturer, Student, Expense, StockItem, Requisition, Payment, Grade, UserRole, CourseReview,
  Book, Loan, Reservation, LMSReadingList, BookReview, BookRequest, ExamPaper, TeacherResource, LibraryGateLog, InAppNotification, MockEmail,
  AttendanceSession
} from './types';

import { 
  initialCourses, initialLecturers, initialStudents, 
  initialExpenses, initialInventory, initialRequisitions, 
  initialNews, initialTestimonies, subjectMap, initialReviews,
  initialBooks, initialLoans, initialReservations, initialReadingLists,
  initialBookReviews, initialBookRequests, initialExamPapers, initialTeacherResources, initialLibraryGateLogs,
  initialNotifications
} from './data';

import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import StudentDashboard from './components/StudentDashboard';
import LecturerDashboard from './components/LecturerDashboard';
import AdminDashboard from './components/AdminDashboard';
import LoginModal from './components/LoginModal';
import Forbidden403 from './components/Forbidden403';
import DashboardShowcase from './components/DashboardShowcase';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('zenti_theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('zenti_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('zenti_theme', 'light');
    }
  }, [darkMode]);

  // Try loading states from localStorage, falling back to preconfigured mock databases
  const [courses, setCourses] = useState<Course[]>(() => {
    const raw = localStorage.getItem('zenti_courses');
    return raw ? JSON.parse(raw) : initialCourses;
  });

  const [lecturers, setLecturers] = useState<Lecturer[]>(() => {
    const raw = localStorage.getItem('zenti_lecturers');
    return raw ? JSON.parse(raw) : initialLecturers;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const raw = localStorage.getItem('zenti_students');
    return raw ? JSON.parse(raw) : initialStudents;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const raw = localStorage.getItem('zenti_expenses');
    return raw ? JSON.parse(raw) : initialExpenses;
  });

  const [inventory, setInventory] = useState<StockItem[]>(() => {
    const raw = localStorage.getItem('zenti_inventory');
    return raw ? JSON.parse(raw) : initialInventory;
  });

  const [requisitions, setRequisitions] = useState<Requisition[]>(() => {
    const raw = localStorage.getItem('zenti_requisitions');
    return raw ? JSON.parse(raw) : initialRequisitions;
  });

  const [reviews, setReviews] = useState<CourseReview[]>(() => {
    const raw = localStorage.getItem('zenti_reviews');
    return raw ? JSON.parse(raw) : initialReviews;
  });

  const [books, setBooks] = useState<Book[]>(() => {
    const raw = localStorage.getItem('zenti_books');
    return raw ? JSON.parse(raw) : initialBooks;
  });

  const [loans, setLoans] = useState<Loan[]>(() => {
    const raw = localStorage.getItem('zenti_loans');
    return raw ? JSON.parse(raw) : initialLoans;
  });

  const [reservations, setReservations] = useState<Reservation[]>(() => {
    const raw = localStorage.getItem('zenti_loans_reservations');
    return raw ? JSON.parse(raw) : initialReservations;
  });

  const [readingLists, setReadingLists] = useState<LMSReadingList[]>(() => {
    const raw = localStorage.getItem('zenti_reading_lists');
    return raw ? JSON.parse(raw) : initialReadingLists;
  });

  const [bookReviews, setBookReviews] = useState<BookReview[]>(() => {
    const raw = localStorage.getItem('zenti_book_reviews');
    return raw ? JSON.parse(raw) : initialBookReviews;
  });

  const [bookRequests, setBookRequests] = useState<BookRequest[]>(() => {
    const raw = localStorage.getItem('zenti_book_requests');
    return raw ? JSON.parse(raw) : initialBookRequests;
  });

  const [examPapers, setExamPapers] = useState<ExamPaper[]>(() => {
    const raw = localStorage.getItem('zenti_exam_papers');
    return raw ? JSON.parse(raw) : initialExamPapers;
  });

  const [teacherResources, setTeacherResources] = useState<TeacherResource[]>(() => {
    const raw = localStorage.getItem('zenti_teacher_resources');
    return raw ? JSON.parse(raw) : initialTeacherResources;
  });

  const [libraryGateLogs, setLibraryGateLogs] = useState<LibraryGateLog[]>(() => {
    const raw = localStorage.getItem('zenti_library_gate_logs');
    return raw ? JSON.parse(raw) : initialLibraryGateLogs;
  });

  const [notifications, setNotifications] = useState<InAppNotification[]>(() => {
    const raw = localStorage.getItem('zenti_notifications');
    return raw ? JSON.parse(raw) : initialNotifications;
  });

  const [mockEmails, setMockEmails] = useState<MockEmail[]>(() => {
    const raw = localStorage.getItem('zenti_mock_emails');
    return raw ? JSON.parse(raw) : [];
  });

  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);

  // Portal Access Gateway State
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('zenti_current_user_role') as UserRole) || null;
  });
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('zenti_current_user_id') || '';
  });

  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    // Poll location for instant route modification interception
    const interval = setInterval(handleLocationChange, 400);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      clearInterval(interval);
    };
  }, []);

  const [isBooting, setIsBooting] = useState<boolean>(true);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginAllowedPortals, setLoginAllowedPortals] = useState<('student' | 'lecturer' | 'accountant' | 'librarian' | 'admin')[]>(['student', 'lecturer', 'accountant', 'librarian', 'admin']);
  const [loginInitialPortal, setLoginInitialPortal] = useState<'student' | 'lecturer' | 'accountant' | 'librarian' | 'admin'>('student');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const portalParam = searchParams.get('portal') || new URLSearchParams(window.location.hash.substring(window.location.hash.indexOf('?'))).get('portal');
    
    if (portalParam) {
      window.history.pushState({}, '', '/login');
      setCurrentPath('/login');
    }
  }, []);

  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState<boolean>(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Load master state from the backend Express server on mount and perform session routing verification
  useEffect(() => {
    let hasError = false;

    fetch("/api/data")
      .then((res) => {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json();
      })
      .then((db) => {
        if (db) {
          if (db.courses) {
            setCourses(db.courses);
            db.courses.forEach((c: any) => {
              subjectMap[c.code] = c.title;
            });
          }
          if (db.lecturers) setLecturers(db.lecturers);
          if (db.students) setStudents(db.students);
          if (db.expenses) setExpenses(db.expenses);
          if (db.inventory) setInventory(db.inventory);
          if (db.requisitions) setRequisitions(db.requisitions);
          if (db.reviews) setReviews(db.reviews);
          if (db.books) setBooks(db.books);
          if (db.loans) setLoans(db.loans);
          if (db.reservations) setReservations(db.reservations);
          if (db.readingLists) setReadingLists(db.readingLists);
          if (db.bookReviews) setBookReviews(db.bookReviews);
          if (db.bookRequests) setBookRequests(db.bookRequests);
          if (db.examPapers) setExamPapers(db.examPapers);
          if (db.teacherResources) setTeacherResources(db.teacherResources);
          if (db.libraryGateLogs) setLibraryGateLogs(db.libraryGateLogs);
          if (db.notifications) setNotifications(db.notifications);
          if (db.attendanceSessions) setAttendanceSessions(db.attendanceSessions);

          // Verify saved session against loaded data
          const savedRole = localStorage.getItem("zenti_current_user_role") as UserRole;
          const savedId = localStorage.getItem("zenti_current_user_id");
          const validRoles: UserRole[] = ["student", "lecturer", "admin", "accountant", "librarian"];

          if (savedRole && !validRoles.includes(savedRole)) {
            hasError = true;
          }

          if (savedRole && savedRole !== "admin" && !savedId) {
            hasError = true;
          }

          if (!hasError && savedRole && savedId) {
            if (savedRole === "student") {
              const studentExists = (db.students || []).some((s: any) => s.id === savedId);
              if (!studentExists) hasError = true;
            } else if (["lecturer", "accountant", "librarian"].includes(savedRole)) {
              const lecturerExists = (db.lecturers || []).some((l: any) => l.id === savedId);
              if (!lecturerExists) hasError = true;
            } else if (savedRole === "admin") {
              if (savedId !== "admin") hasError = true;
            }
          }

          if (hasError) {
            console.warn("Structural check failed on boot: Session data malformed or missing in database. Resetting.");
            setCurrentUserRole(null);
            setCurrentUserId("");
            localStorage.removeItem("zenti_current_user_role");
            localStorage.removeItem("zenti_current_user_id");
          } else if (savedRole && savedId) {
            setCurrentUserRole(savedRole);
            setCurrentUserId(savedId);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to connect to backend server API, using local fallback databases:", err);
      })
      .finally(() => {
        setIsBooting(false);
      });
  }, [currentUserRole]);

  // Synchronize local session configuration back to localStorage
  useEffect(() => {
    if (currentUserRole) {
      localStorage.setItem("zenti_current_user_role", currentUserRole);
    } else {
      localStorage.removeItem("zenti_current_user_role");
      localStorage.removeItem("zenti_session_token");
    }
  }, [currentUserRole]);

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem("zenti_current_user_id", currentUserId);
    } else {
      localStorage.removeItem("zenti_current_user_id");
      localStorage.removeItem("zenti_session_token");
    }
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem('zenti_mock_emails', JSON.stringify(mockEmails));
  }, [mockEmails]);

  // Debounce and synchronize state modifications back to our full-stack server
  useEffect(() => {
    if (isBooting) return;

    const syncTimer = setTimeout(() => {
      fetch("/api/data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": currentUserRole || "",
          "x-user-id": currentUserId || ""
        },
        body: JSON.stringify({
          courses,
          lecturers,
          students,
          expenses,
          inventory,
          requisitions,
          reviews,
          books,
          loans,
          reservations,
          readingLists,
          bookReviews,
          bookRequests,
          examPapers,
          teacherResources,
          libraryGateLogs,
          notifications,
          attendanceSessions,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Synchronization request failed: " + res.status);
          return res.json();
        })
        .then(() => {
          console.log("Full-stack database synchronized with backend successfully.");
        })
        .catch((err) => {
          console.error("Error writing data back to the server:", err);
        });
    }, 800);

    return () => clearTimeout(syncTimer);
  }, [
    courses,
    lecturers,
    students,
    expenses,
    inventory,
    requisitions,
    reviews,
    books,
    loans,
    reservations,
    readingLists,
    bookReviews,
    bookRequests,
    examPapers,
    teacherResources,
    libraryGateLogs,
    notifications,
    attendanceSessions,
    isBooting,
  ]);

  // ==========================================
  // AUTOMATED SMTP EMAIL ALERT MOCK SERVICES
  // ==========================================
  const sendMockEmailAlert = (
    to: string,
    recipientName: string,
    subject: string,
    body: string,
    type: 'invoice' | 'book_due' | 'grade_posted'
  ) => {
    const emailId = `mail-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const newEmail: MockEmail = {
      id: emailId,
      to,
      recipientName,
      subject,
      body,
      sentAt: new Date().toLocaleString(),
      type
    };

    setMockEmails(prev => [newEmail, ...prev]);

    const notificationId = self.crypto?.randomUUID ? self.crypto.randomUUID() : `notif-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const newNotification: InAppNotification = {
      id: notificationId,
      targetUserId: '', 
      targetUserRole: 'all',
      type: type === 'invoice' ? 'payment' : 'library',
      title: subject,
      message: `${recipientName} (${to}): ${body.split('\n')[0]}`,
      status: 'unread',
      dateTime: new Date().toLocaleString()
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    console.log(`[MOCK EMAIL SENT] To: ${to} | Subject: ${subject}`);
  };

  const triggerInvoiceAlert = (student: Student, invoice: { invoiceNo: string; description: string; amount: number; date: string }) => {
    const to = `${student.name.toLowerCase().replace(/\s+/g, '.')}@zenti.edu`;
    const subject = ` [Invoice Generated] New Billing Invoice #${invoice.invoiceNo}`;
    const amountFormatted = Math.abs(invoice.amount).toLocaleString();
    const isCredit = invoice.amount < 0;
    
    const body = `Dear ${student.name},
${isCredit ? 'A ledger credit/waiver' : 'A new billing invoice'} has been posted to your student account ledger.

Ledger Entry Details:
- Entry No: ${invoice.invoiceNo}
- Item Description: ${invoice.description}
- Total Amount: KES ${amountFormatted} ${isCredit ? '(Credit / Waiver Received)' : '(Debit Due)'}
- Generation Date: ${invoice.date}

Please log in to your student portal to clear any outstanding balances before exam registration periods.

Best regards,
Zenti Finance Department`;

    sendMockEmailAlert(to, student.name, subject, body, 'invoice');
  };

  const triggerGradeAlert = (student: Student, subjectCode: string, grade: Grade) => {
    const to = `${student.name.toLowerCase().replace(/\s+/g, '.')}@zenti.edu`;
    const subject = ` [Grade Posted] New Grade for Unit ${subjectCode}`;
    const totalScore = (grade.cat || 0) + (grade.exam || 0);
    let letter = 'F';
    if (totalScore >= 70) letter = 'A';
    else if (totalScore >= 60) letter = 'B';
    else if (totalScore >= 50) letter = 'C';
    else if (totalScore >= 40) letter = 'D';

    const body = `Dear ${student.name},
An instructor has posted or updated your final grading details for unit ${subjectCode}.

Grading Summary:
- Subject Code: ${subjectCode}
- Continuous Assessment Test (CAT): ${grade.cat || 0}/30
- Final Exam: ${grade.exam || 0}/70
- Total Score: ${totalScore}% (Grade: ${letter})

Log in to your Student Dashboard to view your full unofficial transcript.

Best regards,
Zenti Academic Registrar`;

    sendMockEmailAlert(to, student.name, subject, body, 'grade_posted');
  };

  const scanOverdueLoansAndAlert = () => {
    const today = new Date();
    let sentCount = 0;

    loans.forEach(loan => {
      if (loan.status === 'borrowed' && new Date(loan.dueDate) < today) {
        if (loan.patronRole === 'student') {
          const student = students.find(s => s.id === loan.patronId);
          if (student) {
            const to = `${student.name.toLowerCase().replace(/\s+/g, '.')}@zenti.edu`;
            const subject = ` [Overdue Warning] Library Book: "${loan.bookTitle}" is PAST DUE`;
            
            // Check if alert for this exact loan id is already sent in mockEmails
            const alreadyNotified = mockEmails.some(m => m.type === 'book_due' && m.body.includes(loan.id));
            
            if (!alreadyNotified) {
              const body = `Dear ${student.name},
Our automated system shows that the book you borrowed has exceeded its return deadline.

Loan ID Reference: ${loan.id}
Book Title: ${loan.bookTitle}
Checkout Date: ${loan.checkoutDate}
Due Date: ${loan.dueDate} (OVERDUE)

Overdue fines are accumulating at a rate of KES 50.00 per day. Please return the book to the Library HQ immediately to prevent account suspension.

Best regards,
Zenti Library Services`;

              sendMockEmailAlert(to, student.name, subject, body, 'book_due');
              sentCount++;
            }
          }
        }
      }
    });

    return sentCount;
  };

  // CORE REDUCER / CONTROLLER MUTATOR FUNCTIONS:
  
  // 1. ADD NEW COURSE SYLLABUS
  const handleAddCourse = async (
  newCourse: Omit<Course, "id" | "active">
) => {
  try {
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newCourse),
    });

    if (!res.ok) {
      throw new Error("Failed to create course");
    }

    const course = await res.json();

    setCourses((prev) => [...prev, course]);
  } catch (err) {
    console.error(err);
    alert("Failed to create course.");
  }
};

  // 2. TOGGLE PORTAL LISTING VISIBILITY
  const handleToggleCourseActive = (courseId: string) => {
    setCourses(prev => prev.map(c => 
      c.id === courseId ? { ...c, active: !c.active } : c
    ));
  };

  // ADD OR UPDATE COURSE REVIEW
  const handleAddReview = (courseId: string, studentId: string, studentName: string, rating: number, comment: string) => {
    setReviews(prev => {
      const existingIdx = prev.findIndex(r => r.courseId === courseId && r.studentId === studentId);
      const newReview: CourseReview = {
        id: existingIdx >= 0 ? prev[existingIdx].id : `rev-${Date.now()}`,
        courseId,
        studentId,
        studentName,
        rating,
        comment,
        date: new Date().toLocaleDateString('en-CA')
      };
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = newReview;
        return copy;
      } else {
        return [...prev, newReview];
      }
    });
  };

  // 3. ALLOCATE SUBJECT TO LECTURER
  const handleAllocateSubject = (lecturerId: string, subjectCode: string) => {
    setLecturers(prev => prev.map(l => {
      if (l.id === lecturerId) {
        const currentSubjects = l.subjects || [];
        // Prevent duplicate assignments
        if (currentSubjects.includes(subjectCode)) return l;
        return {
          ...l,
          subjects: [...currentSubjects, subjectCode]
        };
      }
      return l;
    }));
  };

  // 4. ADD STUDENT BILLS M-PESA STATEMENT PAYMENT
  const handleAddPayment = async (
  newPay: Omit<Payment, "id" | "date" | "status">
) => {
  try {
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newPay),
    });

    if (!res.ok) {
      throw new Error("Failed to record payment");
    }

    const payment = await res.json();

    setStudents((prev) =>
      prev.map((s) =>
        s.id === payment.studentId
          ? {
              ...s,
              payments: [...s.payments, payment],
            }
          : s
      )
    );
  } catch (err) {
    console.error(err);
    alert("Failed to record payment.");
  }
};

  // 5. PROCESS AUTOMANDATED DEBT RECONCILIATION
  const handleReconcilePayment = (paymentId: string) => {
    setStudents(prev => prev.map(s => {
      const paymentExists = s.payments.some(p => p.id === paymentId);
      if (paymentExists) {
        const targetPayment = s.payments.find(p => p.id === paymentId);
        if (!targetPayment) return s;

        // Mark payment reconciled
        const updatedPayments = s.payments.map(p => 
          p.id === paymentId ? { ...p, status: 'reconciled' as const } : p
        );

        // Mark corresponding invoice as paid
        const updatedLedger = s.ledger.map(inv => 
          inv.id === targetPayment.invoiceId ? { ...inv, status: 'paid' as const } : inv
        );

        return {
          ...s,
          payments: updatedPayments,
          ledger: updatedLedger,
        };
      }
      return s;
    }));
  };

  // 6. LOG COLLEGE EXPENSES
  const handleAddExpense = (newExp: Omit<Expense, 'id'>) => {
    setExpenses(prev => [
      ...prev,
      {
        ...newExp,
        id: `exp-${Date.now()}`
      }
    ]);
  };

  // 7. RECORD ADDED STOCK ITEM
  const handleAddStockItem = (newItem: Omit<StockItem, 'id'>) => {
    setInventory(prev => [
      ...prev,
      {
        ...newItem,
        id: `inv-item-${Date.now()}`
      }
    ]);
  };

  // 8. UPDATE INVENTORY LEVEL MANUAL RECHARGE
  const handleUpdateStockQuantity = (itemId: string, increment: number) => {
    setInventory(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, quantity: Math.max(0, item.quantity + increment) } 
        : item
    ));
  };

  // 9. REQUISITIONS AND PROCUREMENT WORKFLOWS
  const handleProcessRequisition = (requisitionId: string, status: 'approved' | 'rejected') => {
    setRequisitions(prev => prev.map(r => 
      r.id === requisitionId ? { ...r, status } : r
    ));

    // If approved, decrement physical items automatically!
    if (status === 'approved') {
      const targetReq = requisitions.find(r => r.id === requisitionId);
      if (targetReq) {
        setInventory(prev => prev.map(item => {
          if (item.name.toLowerCase() === targetReq.itemName.toLowerCase()) {
            return {
              ...item,
              quantity: Math.max(0, item.quantity - targetReq.quantity)
            };
          }
          return item;
        }));
      }
    }
  };

  // 9b. LIBRARY CONTROLLER FUNCTIONS
  const handleAddBook = (newBook: Omit<Book, 'id'>) => {
    setBooks(prev => [
      ...prev,
      {
        ...newBook,
        id: `book-${Date.now()}`
      }
    ]);
  };

  const handleUpdateBook = (bookId: string, updatedFields: Partial<Book>) => {
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, ...updatedFields } : b));
  };

  const handleCheckoutBook = (bookId: string, patronId: string, patronName: string, patronRole: 'student' | 'lecturer', loanDays: number = 14) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const due = new Date();
    due.setDate(due.getDate() + loanDays);
    const dueStr = due.toLocaleDateString('en-CA');

    const book = books.find(b => b.id === bookId);
    if (!book) return;

    if (book.copiesAvailable <= 0 && book.type === 'Physical Book') {
      alert('Error: All physical copies of this book are currently loaned out.');
      return;
    }

    // Create loan
    const newLoan: Loan = {
      id: `loan-${Date.now()}`,
      bookId,
      bookTitle: book.title,
      patronId,
      patronName,
      patronRole,
      checkoutDate: todayStr,
      dueDate: dueStr,
      status: 'borrowed',
      lateFeeAssessed: 0
    };

    setLoans(prev => [newLoan, ...prev]);

    // Decrement copiesAvailable if physical
    if (book.type === 'Physical Book') {
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, copiesAvailable: Math.max(0, b.copiesAvailable - 1) } : b));
    }

    // Fulfill corresponding pending reservation if any
    setReservations(prev => prev.map(res => 
      (res.bookId === bookId && res.patronId === patronId && res.status === 'pending') 
        ? { ...res, status: 'fulfilled' as const } 
        : res
    ));

    alert(`Success: checked out "${book.title}" to ${patronName}. Due on ${dueStr}.`);
  };

  const handleReturnBook = (loanId: string, returnStatus: 'returned' | 'damaged' | 'lost', damageFee: number = 0) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    // Calculate late fees if past due and not previously returned
    const dueDate = new Date(loan.dueDate);
    const today = new Date();
    let computedLateFee = 0;
    if (today > dueDate && loan.status === 'borrowed') {
      const diffMs = today.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      computedLateFee = diffDays * 50; // KES 50 per day
    }

    // Total fees to charge
    const totalFeesCharge = computedLateFee + damageFee + (returnStatus === 'lost' ? 5000 : 0);

    // Update loan
    setLoans(prev => prev.map(l => {
      if (l.id === loanId) {
        return {
          ...l,
          status: returnStatus,
          returnDate: todayStr,
          lateFeeAssessed: (l.lateFeeAssessed || 0) + computedLateFee
        };
      }
      return l;
    }));

    // Increment copiesAvailable if back in inventory (returned or damaged)
    setBooks(prev => prev.map(b => {
      if (b.id === loan.bookId) {
        let isBack = returnStatus === 'returned' || returnStatus === 'damaged';
        return {
          ...b,
          copiesAvailable: isBack ? Math.min(b.copiesTotal, b.copiesAvailable + 1) : b.copiesAvailable,
          copiesTotal: returnStatus === 'lost' ? Math.max(0, b.copiesTotal - 1) : b.copiesTotal
        };
      }
      return b;
    }));

    // Sync to student ledger if fees exist & patron is student
    if (totalFeesCharge > 0 && loan.patronRole === 'student') {
      const student = students.find(s => s.id === loan.patronId);
      const invNo = `INV-LIB-${Date.now().toString().slice(-4)}`;
      const description = `Library Fee: ${loan.bookTitle} (${returnStatus === 'lost' ? 'Lost Book Replacement' : returnStatus === 'damaged' ? 'Structural Damage Levy' : 'Overdue Fines'})`;
      
      const newInvoice = {
        id: `inv-lib-${Date.now()}`,
        invoiceNo: invNo,
        description,
        amount: totalFeesCharge,
        date: todayStr,
        status: 'unpaid' as const
      };

      if (student) {
        triggerInvoiceAlert(student, newInvoice);
      }

      setStudents(prev => prev.map(s => {
        if (s.id === loan.patronId) {
          return {
            ...s,
            ledger: [...s.ledger, newInvoice]
          };
        }
        return s;
      }));
      alert(`Processed return. Charged KES ${totalFeesCharge.toLocaleString()} to student's billing ledger for ${returnStatus}.`);
    } else {
      alert(`Success: Checked in "${loan.bookTitle}" successfully.`);
    }
  };

  const handleReserveBook = (bookId: string, patronId: string, patronName: string) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    const newRes: Reservation = {
      id: `res-${Date.now()}`,
      bookId,
      bookTitle: book.title,
      patronId,
      patronName,
      reservationDate: todayStr,
      status: 'pending'
    };

    setReservations(prev => [newRes, ...prev]);
    alert(`Success: Placed reservation queue hold for "${book.title}".`);
  };

  const handleCancelReservation = (resId: string) => {
    setReservations(prev => prev.map(r => r.id === resId ? { ...r, status: 'cancelled' as const } : r));
    alert('Reservation cancelled successfully.');
  };

  // Advanced Kiosk Self-Service, Review, and Procurement Automation Handlers
  const handleAddBookReview = (newReview: Omit<BookReview, 'id' | 'date'>) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    setBookReviews(prev => [
      ...prev,
      {
        ...newReview,
        id: `br-${Date.now()}`,
        date: todayStr
      }
    ]);
  };

  const handleAddBookRequest = (newRequest: Omit<BookRequest, 'id' | 'date' | 'status'>) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    setBookRequests(prev => [
      ...prev,
      {
        ...newRequest,
        id: `breq-${Date.now()}`,
        date: todayStr,
        status: 'pending'
      }
    ]);
  };

  const handleUpdateBookRequestStatus = (requestId: string, status: 'approved' | 'rejected', adminFeedback?: string) => {
    setBookRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { ...req, status, adminFeedback } 
        : req
    ));
    if (status === 'approved') {
      const freq = bookRequests.find(r => r.id === requestId);
      if (freq) {
        // Automatically insert to catalog!
        handleAddBook({
          title: freq.title,
          author: freq.author,
          isbn: freq.isbn || `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          publisher: 'School Procured Editions',
          edition: '1st Edition',
          purchasePrice: 3200,
          rackNumber: 'Rack-03',
          shelfRow: 'Row-A',
          libraryCode: `LIB-PR-${Math.floor(100 + Math.random() * 900)}`,
          type: 'Physical Book',
          copiesTotal: 5,
          copiesAvailable: 5,
          category: 'Acquisitions'
        });
      }
    }
  };

  const handleReserveTeacherResource = (resourceId: string, lecturerId: string, lecturerName: string) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    setTeacherResources(prev => prev.map(res => 
      res.id === resourceId 
        ? { 
            ...res, 
            status: 'reserved', 
            reservedByLecturerId: lecturerId, 
            reservedByLecturerName: lecturerName,
            reservationDate: todayStr 
          }
        : res
    ));
  };

  const handleReleaseTeacherResource = (resourceId: string) => {
    setTeacherResources(prev => prev.map(res => 
      res.id === resourceId 
        ? { 
            ...res, 
            status: 'available', 
            reservedByLecturerId: undefined, 
            reservedByLecturerName: undefined,
            reservationDate: undefined 
          }
        : res
    ));
  };

  const handleTriggerGateLog = (log: Omit<LibraryGateLog, 'id' | 'timestamp'>) => {
    const now = new Date();
    const timeStr = now.toLocaleDateString('en-CA') + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLibraryGateLogs(prev => [
      {
        ...log,
        id: `glog-${Date.now()}`,
        timestamp: timeStr
      },
      ...prev
    ]);
  };

  const handleUpdateReadingList = (subjectCode: string, lecturerId: string, bookIds: string[], notes?: string) => {
    setReadingLists(prev => {
      const idx = prev.findIndex(rl => rl.subjectCode === subjectCode);
      const newRL: LMSReadingList = {
        id: idx >= 0 ? prev[idx].id : `rl-${Date.now()}`,
        subjectCode,
        lecturerId,
        bookIds,
        notes
      };

      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newRL;
        return copy;
      } else {
        return [...prev, newRL];
      }
    });

    alert('LMS Reading list synchronized for this classroom course syllabus!');
  };

  // 10. NEW LECTURER REGISTRAR PROFILE
  const handleAddLecturer = async (
  newLec: Omit<Lecturer, "id" | "loggedHours">
) => {
  try {
    const res = await fetch("/api/lecturers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newLec),
    });

    if (!res.ok) {
      throw new Error("Failed to register lecturer");
    }

    const lecturer = await res.json();

    setLecturers((prev) => [...prev, lecturer]);
  } catch (err) {
    console.error(err);
    alert("Failed to register lecturer.");
  }
};

  // 11. REGISTER FOR CLASS MODULE
  const handleRegisterUnit = async (unitCode: string) => {
  if (!currentUserId || currentUserRole !== "student") return;

  try {
    const res = await fetch("/api/student-enrollments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studentId: currentUserId,
        courseCode: unitCode,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to register unit");
    }

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === currentUserId) {
          if (s.enrolledUnits.includes(unitCode)) return s;

          return {
            ...s,
            enrolledUnits: [...s.enrolledUnits, unitCode],
          };
        }

        return s;
      })
    );
  } catch (err) {
    console.error(err);
    alert("Failed to register unit.");
  }
};

  // 12. DROP INTAKE SUBJECT MODULE
  const handleDeregisterUnit = (unitCode: string) => {
    if (!currentUserId || currentUserRole !== 'student') return;
    setStudents(prev => prev.map(s => {
      if (s.id === currentUserId) {
        // Drop unit and clear grade metrics associated with it
        const filteredUnits = s.enrolledUnits.filter(u => u !== unitCode);
        const gradesCopy = { ...s.grades };
        delete gradesCopy[unitCode];

        return {
          ...s,
          enrolledUnits: filteredUnits,
          grades: gradesCopy
        };
      }
      return s;
    }));
  };

  // 13. LECTURER SPREADSHEET GRADING
  const handleUpdateGrades = (studentId: string, subjectCode: string, grade: Grade) => {
    const targetStudent = students.find(s => s.id === studentId);
    if (targetStudent) {
      triggerGradeAlert(targetStudent, subjectCode, grade);
    }
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          grades: {
            ...s.grades,
            [subjectCode]: grade
          }
        };
      }
      return s;
    }));
  };

  // 13.5. ATTENDANCE MARKING AND HISTORIC UPDATES
  const handleSaveAttendance = async (
  subjectCode: string,
  date: string,
  presentStudentIds: string[],
  absentStudentIds: string[]
) => {
  setAttendanceSessions(prev => {
    const filtered = prev.filter(
      s => !(s.date === date && s.subjectCode === subjectCode)
    );

    const newSession: AttendanceSession = {
      id: `att-sess-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      date,
      subjectCode,
      presentStudents: presentStudentIds,
      absentStudents: absentStudentIds,
    };

    const updatedSessions = [newSession, ...filtered];

    // Save attendance to PostgreSQL in the background
    (async () => {
      try {
        const attendance = students
          .filter(s => s.enrolledUnits.includes(subjectCode))
          .map(student => {
            const sessions = updatedSessions.filter(
              x =>
                x.subjectCode === subjectCode &&
                (x.presentStudents.includes(student.id) ||
                  x.absentStudents.includes(student.id))
            );

            const present = sessions.filter(x =>
              x.presentStudents.includes(student.id)
            ).length;

            const rate =
              sessions.length > 0
                ? Math.round((present / sessions.length) * 100)
                : 100;

            return {
              studentId: student.id,
              subjectCode,
              attendanceRate: rate,
            };
          });

        await fetch("/api/student-attendance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(attendance),
        });
      } catch (err) {
        console.error("Failed to save attendance:", err);
      }
    })();

    setStudents(prevStudents =>
      prevStudents.map(student => {
        if (student.enrolledUnits.includes(subjectCode)) {
          const studentSessions = updatedSessions.filter(
            s =>
              s.subjectCode === subjectCode &&
              (s.presentStudents.includes(student.id) ||
                s.absentStudents.includes(student.id))
          );

          if (studentSessions.length > 0) {
            const presentCount = studentSessions.filter(s =>
              s.presentStudents.includes(student.id)
            ).length;

            return {
              ...student,
              attendance: {
                ...(student.attendance || {}),
                [subjectCode]: Math.round(
                  (presentCount / studentSessions.length) * 100
                ),
              },
            };
          }
        }

        return student;
      })
    );

    return updatedSessions;
  });
};
      // Recompute rolling rates for active class students
      
  

  // 14. LECTURER LOG SESSION HOURS
  const handleLogHours = (lecturerId: string, hours: number) => {
    setLecturers(prev => prev.map(l => {
      if (l.id === lecturerId) {
        return {
          ...l,
          loggedHours: (l.loggedHours || 0) + hours
        };
      }
      return l;
    }));
  };

  // 15. LECTURER UPDATE PROFILE (BIO, INTERESTS, PUBLICATIONS)
  const handleUpdateLecturerProfile = (lecturerId: string, updatedFields: Partial<Lecturer>) => {
    setLecturers(prev => prev.map(l => {
      if (l.id === lecturerId) {
        return {
          ...l,
          ...updatedFields
        };
      }
      return l;
    }));
  };

  // 15b. STUDENT UPDATE PROFILE (E.G. CAMERA CAPTURED PHOTO)

  const handleUpdateStudentProfile = (studentId: string, updatedFields: Partial<Student>) => {
    // If ledger is updated and contains new invoice(s), send mock email alerts!

    const targetStudent = students.find(s => s.id === studentId);
    if (targetStudent && updatedFields.ledger && updatedFields.ledger.length > targetStudent.ledger.length) {
      const newInvoices = updatedFields.ledger.filter(
        newInv => !targetStudent.ledger.some(oldInv => oldInv.id === newInv.id)
      );
      newInvoices.forEach(newInv => {
        triggerInvoiceAlert(targetStudent, newInv);
      });
    }

    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          ...updatedFields
        };
      }
      return s;
    }));
  };

  // 15c. REGISTER NEW STUDENT
  const handleAddStudent = async (
  newStud: Omit<Student, 'id' | 'enrolledUnits' | 'grades' | 'ledger' | 'payments' | 'attendance'>
) => {
  try {
    const response = await fetch("/api/students", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newStud),
    });

    if (!response.ok) {
      throw new Error("Failed to create student");
    }

    const createdStudent = await response.json();

    setStudents(prev => [
      ...prev,
      {
        ...createdStudent,
        enrolledUnits: [],
        grades: {},
        ledger: [],
        payments: [],
        attendance: {},
      },
    ]);
  } catch (err) {
    console.error("Error creating student:", err);
  }
};
  // 15d. SYSTEM DELETE LECTURER OR FAULTY CODES
  const handleDeleteLecturer = (lecturerId: string) => {
    setLecturers(prev => prev.filter(l => l.id !== lecturerId));
  };

  // 15e. SYSTEM DELETE UNDERGRADUATE STUDENT PROFILE
  const handleDeleteStudent = (studentId: string) => {
    setStudents(prev => prev.filter(s => s.id !== studentId));
  };

  // 16. BOOK LECTURER OFFICE HOUR
  const handleBookOfficeHour = (
    lecturerId: string,
    slotId: string,
    bookingDetails: { studentId: string; studentName: string; studentEmail: string; studentNotes: string }
  ) => {
    setLecturers(prev => prev.map(l => {
      if (l.id === lecturerId) {
        const updatedHours = (l.officeHours || []).map(slot => {
          if (slot.id === slotId) {
            return {
              ...slot,
              status: 'booked' as const,
              ...bookingDetails
            };
          }
          return slot;
        });
        return { ...l, officeHours: updatedHours };
      }
      return l;
    }));
  };

  // 17. CANCEL/FREE LECTURER OFFICE HOUR
  const handleCancelOfficeHour = (lecturerId: string, slotId: string, removeEntirely?: boolean) => {
    setLecturers(prev => prev.map(l => {
      if (l.id === lecturerId) {
        if (removeEntirely) {
          return {
            ...l,
            officeHours: (l.officeHours || []).filter(slot => slot.id !== slotId)
          };
        }
        const updatedHours = (l.officeHours || []).map(slot => {
          if (slot.id === slotId) {
            return {
              id: slot.id,
              day: slot.day,
              time: slot.time,
              status: 'available' as const
            };
          }
          return slot;
        });
        return { ...l, officeHours: updatedHours };
      }
      return l;
    }));
  };

  // 18. ADD NEW OFFICE HOUR AVAILABLE SLOT
  const handleAddOfficeHourSlot = (lecturerId: string, day: string, time: string) => {
    setLecturers(prev => prev.map(l => {
      if (l.id === lecturerId) {
        const newSlot = {
          id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          day,
          time,
          status: 'available' as const
        };
        return {
          ...l,
          officeHours: [...(l.officeHours || []), newSlot]
        };
      }
      return l;
    }));
  };

  // In-App Notification Center handlers
  const activeUserNotifications = notifications.filter(n => {
    if (!currentUserRole) {
      return n.targetUserRole === 'all';
    }
    if (currentUserRole === 'admin') {
      return true;
    }
    if (n.targetUserRole === 'all') return true;
    if (n.targetUserRole === currentUserRole) {
      if (n.targetUserId) {
        return n.targetUserId === currentUserId;
      }
      return true;
    }
    return false;
  });

  const unreadCount = activeUserNotifications.filter(n => n.status === 'unread').length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' as const } : n));
  };

  const handleMarkAllNotificationsAsRead = () => {
    const idsToMark = activeUserNotifications.map(n => n.id);
    setNotifications(prev => prev.map(n => idsToMark.includes(n.id) ? { ...n, status: 'read' as const } : n));
  };

  const handleClearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Demo shortcut user profiles for sandbox evaluation
  const activeStudentProfile = (students && students.length > 0) ? (students.find(s => s.id === currentUserId) || students[0]) : null;
  const activeLecturerProfile = (lecturers && lecturers.length > 0) ? (lecturers.find(l => l.id === currentUserId) || lecturers[0]) : null;

  if (isBooting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center px-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-blue-500/15 dark:bg-blue-400/15 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-full shadow-lg">
              <GraduationCap className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-pulse" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-sans font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100">
              Verifying Security Session
            </h3>
            <p className="text-xs font-light text-slate-550 dark:text-slate-400 leading-relaxed">
              Securing your connection and verifying database integrity...
            </p>
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 min-h-screen flex flex-col font-sans transition-colors duration-300">
      
      {/* Floating Dark Mode Toggle */}
      <button
        type="button"
        onClick={() => setDarkMode(!darkMode)}
        className="fixed bottom-4 right-4 p-3 rounded-full bg-slate-850 dark:bg-slate-800 hover:bg-slate-750 text-white shadow-lg z-50 border border-slate-200 dark:border-slate-750 cursor-pointer"
        title="Toggle Dark/Light Mode"
      >
        {darkMode ? (
          <Sun className="w-4 h-4 text-amber-350 animate-pulse" />
        ) : (
          <Moon className="w-4 h-4 text-blue-300" />
        )}
      </button>

      {/* CORE WORKSPACE ENTRY ROUTING */}
      <main className="flex-1 flex flex-col">
        {currentPath === '/showcase' ? (
          <DashboardShowcase 
            onBack={() => {
              window.history.pushState({}, '', '/');
              setCurrentPath('/');
            }}
          />
        ) : currentPath === '/login' ? (
          <LoginPage
            students={students}
            lecturers={lecturers}
            onLogin={(role, userId) => {
              if (role === 'lecturer') {
                const targetLecturer = lecturers.find(l => l.id === userId);
                if (targetLecturer?.isAccountant) {
                  setCurrentUserRole('accountant');
                  setCurrentUserId(userId);
                  window.history.pushState({}, '', '/');
                  setCurrentPath('/');
                  return;
                }
              }
              setCurrentUserRole(role);
              setCurrentUserId(userId);
              window.history.pushState({}, '', '/');
              setCurrentPath('/');
            }}
            onClose={() => {
              window.history.pushState({}, '', '/');
              setCurrentPath('/');
            }}
          />
        ) : currentPath.startsWith('/admin') && currentUserRole !== 'admin' && currentUserRole !== 'accountant' && currentUserRole !== 'librarian' ? (
          <Forbidden403
            onBackToDashboard={() => {
              window.history.pushState({}, '', '/');
              setCurrentPath('/');
            }}
            attemptedRoute={currentPath}
            activeRole={currentUserRole || 'anonymous'}
          />
        ) : (currentUserRole === 'student' && currentPath !== '/landing') ? (
          activeStudentProfile ? (
            <StudentDashboard
              student={activeStudentProfile}
              allCourses={courses}
              students={students}
              inventory={inventory}
              lecturers={lecturers}
              reviews={reviews}
              books={books}
              loans={loans}
              reservations={reservations}
              readingLists={readingLists}
              bookReviews={bookReviews}
              bookRequests={bookRequests}
              examPapers={examPapers}
              libraryGateLogs={libraryGateLogs}
              attendanceSessions={attendanceSessions}
              onReserveBook={handleReserveBook}
              onCancelReservation={handleCancelReservation}
              onAddReview={handleAddReview}
              onBookOfficeHour={handleBookOfficeHour}
              onCancelOfficeHour={handleCancelOfficeHour}
              onAddPayment={handleAddPayment}
              onRegisterUnit={handleRegisterUnit}
              onDeregisterUnit={handleDeregisterUnit}
              onUpdateProfile={handleUpdateStudentProfile}
              onAddBookReview={handleAddBookReview}
              onAddBookRequest={handleAddBookRequest}
              onTriggerGateLog={handleTriggerGateLog}
              onCheckoutBook={handleCheckoutBook}
              onReturnBook={handleReturnBook}
              onLogout={() => { setCurrentUserRole(null); setCurrentUserId(''); }}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50 dark:bg-slate-900">
              <GraduationCap className="w-16 h-16 text-slate-350 dark:text-slate-700 mb-4 animate-pulse" />
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 font-sans tracking-tight">No Active Student Profile Found</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                There are currently no registered student accounts. Log in to the <strong>Staff Administrator Gateway</strong> to register student profiles.
              </p>
            </div>
          )
        ) : (currentUserRole === 'lecturer' && currentPath !== '/landing') ? (
          activeLecturerProfile ? (
            <LecturerDashboard
              lecturer={activeLecturerProfile}
              students={students}
              courses={courses}
              inventory={inventory}
              books={books}
              readingLists={readingLists}
              teacherResources={teacherResources}
              bookRequests={bookRequests}
              onUpdateReadingList={handleUpdateReadingList}
              onCancelOfficeHour={handleCancelOfficeHour}
              onAddOfficeHourSlot={handleAddOfficeHourSlot}
              onUpdateGrades={handleUpdateGrades}
              onLogHours={handleLogHours}
              onUpdateProfile={handleUpdateLecturerProfile}
              onReserveTeacherResource={handleReserveTeacherResource}
              onReleaseTeacherResource={handleReleaseTeacherResource}
              onAddBookRequest={handleAddBookRequest}
              attendanceSessions={attendanceSessions}
              onSaveAttendance={handleSaveAttendance}
              onLogout={() => { setCurrentUserRole(null); setCurrentUserId(''); }}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50 dark:bg-slate-900">
              <Users className="w-16 h-16 text-slate-350 dark:text-slate-700 mb-4 animate-pulse" />
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 font-sans tracking-tight">No Active Lecturer Profile Found</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                There are currently no registered lecturer accounts. Log in to the <strong>Staff Administrator Gateway</strong> to hire faculty members.
              </p>
            </div>
          )
        ) : (currentUserRole === 'admin' && currentPath !== '/landing') ? (
          <AdminDashboard
            courses={courses}
            lecturers={lecturers}
            students={students}
            expenses={expenses}
            inventory={inventory}
            requisitions={requisitions}
            books={books}
            loans={loans}
            reservations={reservations}
            bookRequests={bookRequests}
            libraryGateLogs={libraryGateLogs}
            onAddBook={handleAddBook}
            onUpdateBook={handleUpdateBook}
            onCheckoutBook={handleCheckoutBook}
            onReturnBook={handleReturnBook}
            onAddCourse={handleAddCourse}
            onToggleCourseActive={handleToggleCourseActive}
            onAllocateSubject={handleAllocateSubject}
            onReconcilePayment={handleReconcilePayment}
            onAddExpense={handleAddExpense}
            onAddStockItem={handleAddStockItem}
            onUpdateStockQuantity={handleUpdateStockQuantity}
            onProcessRequisition={handleProcessRequisition}
            onAddLecturer={handleAddLecturer}
            onAddStudent={handleAddStudent}
            onDeleteLecturer={handleDeleteLecturer}
            onDeleteStudent={handleDeleteStudent}
            onUpdateBookRequestStatus={handleUpdateBookRequestStatus}
            onTriggerGateLog={handleTriggerGateLog}
            onLogout={() => { setCurrentUserRole(null); setCurrentUserId(''); }}
            onUpdateLecturer={handleUpdateLecturerProfile}
            onUpdateStudent={handleUpdateStudentProfile}
            mockEmails={mockEmails}
            onTriggerOverdueScan={scanOverdueLoansAndAlert}
          />
        ) : (currentUserRole === 'accountant' && currentPath !== '/landing') ? (
          <AdminDashboard
            courses={courses}
            lecturers={lecturers}
            students={students}
            expenses={expenses}
            inventory={inventory}
            requisitions={requisitions}
            books={books}
            loans={loans}
            reservations={reservations}
            bookRequests={bookRequests}
            libraryGateLogs={libraryGateLogs}
            currentUserId={currentUserId}
            onAddBook={handleAddBook}
            onUpdateBook={handleUpdateBook}
            onCheckoutBook={handleCheckoutBook}
            onReturnBook={handleReturnBook}
            onAddCourse={handleAddCourse}
            onToggleCourseActive={handleToggleCourseActive}
            onAllocateSubject={handleAllocateSubject}
            onReconcilePayment={handleReconcilePayment}
            onAddExpense={handleAddExpense}
            onAddStockItem={handleAddStockItem}
            onUpdateStockQuantity={handleUpdateStockQuantity}
            onProcessRequisition={handleProcessRequisition}
            onAddLecturer={handleAddLecturer}
            onAddStudent={handleAddStudent}
            onDeleteLecturer={handleDeleteLecturer}
            onDeleteStudent={handleDeleteStudent}
            onUpdateBookRequestStatus={handleUpdateBookRequestStatus}
            onTriggerGateLog={handleTriggerGateLog}
            onLogout={() => { setCurrentUserRole(null); setCurrentUserId(''); }}
            onUpdateLecturer={handleUpdateLecturerProfile}
            onUpdateStudent={handleUpdateStudentProfile}
            isAccountantView={true}
            mockEmails={mockEmails}
            onTriggerOverdueScan={scanOverdueLoansAndAlert}
          />
        ) : (currentUserRole === 'librarian' && currentPath !== '/landing') ? (
          <AdminDashboard
            courses={courses}
            lecturers={lecturers}
            students={students}
            expenses={expenses}
            inventory={inventory}
            requisitions={requisitions}
            books={books}
            loans={loans}
            reservations={reservations}
            bookRequests={bookRequests}
            libraryGateLogs={libraryGateLogs}
            onAddBook={handleAddBook}
            onUpdateBook={handleUpdateBook}
            onCheckoutBook={handleCheckoutBook}
            onReturnBook={handleReturnBook}
            onAddCourse={handleAddCourse}
            onToggleCourseActive={handleToggleCourseActive}
            onAllocateSubject={handleAllocateSubject}
            onReconcilePayment={handleReconcilePayment}
            onAddExpense={handleAddExpense}
            onAddStockItem={handleAddStockItem}
            onUpdateStockQuantity={handleUpdateStockQuantity}
            onProcessRequisition={handleProcessRequisition}
            onAddLecturer={handleAddLecturer}
            onAddStudent={handleAddStudent}
            onDeleteLecturer={handleDeleteLecturer}
            onDeleteStudent={handleDeleteStudent}
            onUpdateBookRequestStatus={handleUpdateBookRequestStatus}
            onTriggerGateLog={handleTriggerGateLog}
            onLogout={() => { setCurrentUserRole(null); setCurrentUserId(''); }}
            onUpdateLecturer={handleUpdateLecturerProfile}
            onUpdateStudent={handleUpdateStudentProfile}
            isLibrarianView={true}
            mockEmails={mockEmails}
            onTriggerOverdueScan={scanOverdueLoansAndAlert}
          />
        ) : (
          <LandingPage
            courses={courses}
            lecturers={lecturers}
            reviews={reviews}
            news={initialNews}
            testimonies={initialTestimonies}
            totalStudentsCount={students.length}
            onReturnToDashboard={(role, id) => {
              setCurrentUserRole(role as any);
              setCurrentUserId(id);
              window.history.pushState({}, '', '/');
              setCurrentPath('/');
            }}
            onOpenLogin={() => {
              window.history.pushState({}, '', '/login');
              setCurrentPath('/login');
            }}
            onSelectCourse={(c) => setSelectedCourse(c)}
          />
        )}
      </main>

      {/* DETAILED DYNAMIC COURSE DETAILS MODAL */}
      {selectedCourse && (() => {
        const courseReviews = reviews.filter(r => r.courseId === selectedCourse.id || r.courseId === selectedCourse.code);
        const averageRating = courseReviews.length > 0
          ? (courseReviews.reduce((sum, r) => sum + r.rating, 0) / courseReviews.length)
          : 0;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative border border-slate-100 flex flex-col max-h-[90vh]">
              <div className="relative h-48 bg-slate-100 shrink-0">
                <img src={selectedCourse.thumbnail} alt={selectedCourse.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                
                <button 
                  type="button" 
                  onClick={() => setSelectedCourse(null)}
                  className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="text-[10px] bg-blue-600 font-extrabold uppercase px-2.5 py-1 rounded tracking-wide">
                    {selectedCourse.code}
                  </span>
                  <h3 className="text-xl font-bold mt-2 leading-tight">{selectedCourse.title}</h3>
                </div>
              </div>

              <div className="p-6 space-y-4 text-xs leading-relaxed overflow-y-auto flex-1">
                <div className="space-y-1">
                  <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-blue-600">Course Syllabus Overview</h4>
                  <p className="text-slate-650 font-light">{selectedCourse.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-3.5">
                  <div>
                    <span className="text-slate-400 font-medium block">Facilitator Department</span>
                    <p className="font-extrabold text-slate-800 text-sm">{selectedCourse.faculty}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Syllabus Term Duration</span>
                    <p className="font-extrabold text-slate-800 text-sm">{selectedCourse.duration}</p>
                  </div>
                </div>

                {/* USER REVIEWS SECTION */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex justify-between items-center bg-slate-50 border border-slate-100/60 rounded-xl px-4 py-3">
                    <div>
                      <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-blue-600">Student Reviews</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex text-amber-500 font-bold text-sm">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span key={s} className="mr-0.5">{s <= Math.round(averageRating) ? '★' : '☆'}</span>
                          ))}
                        </div>
                        <span className="font-extrabold text-slate-800 text-[11px]">
                          {averageRating > 0 ? averageRating.toFixed(1) : 'No ratings yet'}
                        </span>
                        <span className="text-slate-400 font-medium text-[10px]">
                          ({courseReviews.length} {courseReviews.length === 1 ? 'review' : 'reviews'})
                        </span>
                      </div>
                    </div>
                    {averageRating >= 4.5 && (
                      <div className="bg-emerald-50 text-emerald-800 text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded border border-emerald-100 shrink-0">
                        Highly Rated
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {courseReviews.length === 0 ? (
                      <p className="text-slate-400 italic text-[11px] py-2">No student reviews have been posted for this course yet.</p>
                    ) : (
                      courseReviews.map((rev) => (
                        <div key={rev.id} className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-1 transition-colors">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800 text-[11.5px]">{rev.studentName}</span>
                            <div className="flex items-center gap-2">
                              <div className="flex text-amber-500 text-[10px]">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <span key={s} className="mr-0.5">{s <= rev.rating ? '★' : '☆'}</span>
                                ))}
                              </div>
                              <span className="text-[9px] text-slate-400 font-mono">{rev.date}</span>
                            </div>
                          </div>
                          <p className="text-slate-600 font-light text-[11px] leading-relaxed">"{rev.comment}"</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 shrink-0">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Semester Tuition Levy</span>
                    <span className="text-lg font-black text-slate-900">KES {selectedCourse.fees.toLocaleString()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCourse(null);
                      window.history.pushState({}, '', '/login');
                      setCurrentPath('/login');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-1"
                  >
                    <span>Apply Now Portal</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
