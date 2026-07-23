export interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  duration: string;
  fees: number;
  thumbnail: string;
  faculty: string; // e.g., "School of Computing", "Engineering"
  active: boolean;
}

export interface OfficeHourSlot {
  id: string;
  day: string; // e.g., "Monday", "Wednesday", or specific date "2026-06-18"
  time: string; // e.g., "10:00 AM - 10:30 AM", "11:00 AM - 11:30 AM"
  status: 'available' | 'booked';
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  studentNotes?: string;
}

export interface BankingInfo {
  bankName: string;
  branch: string;
  accountName: string;
  accountNumber: string;
  swiftCode?: string;
  mobileMoney?: string;
}

export interface PerformanceReview {
  id: string;
  reviewerName: string;
  reviewDate: string;
  rating: number; // 1-5
  comments: string;
  goalsForNextPeriod?: string;
}

export interface StaffDocument {
  id: string;
  title: string;
  category: 'Contract' | 'Identification' | 'Academic Certificate' | 'Tax Document' | 'Other';
  uploadDate: string;
  fileUrl: string;
  fileSize?: string;
}

export interface LeaveRecord {
  id: string;
  leaveType: 'Annual Leave' | 'Sick Leave' | 'Maternity/Paternity' | 'Sabbatical' | 'Unpaid Leave';
  startDate: string;
  endDate: string;
  daysCount: number;
  status: 'Approved' | 'Pending' | 'Rejected';
  reason?: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  headOfDepartmentId?: string;
}

export interface AcademicRank {
  id: string;
  code: string;
  title: string;
  defaultHourlyRate: number;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface Lecturer {
  id: string;
  staffNumber?: string; // Auto-generated e.g. "STF-2026-001"
  name: string;
  email: string;
  phone: string;
  nationalId?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  dob?: string;
  department?: string;
  departmentId?: string;
  academicRank?: string;
  academicRankId?: string;
  employmentType?: 'Permanent' | 'Contract' | 'Part-Time' | 'Adjunct' | 'Visiting Lecturer' | 'Temporary';
  employmentDate?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  employmentStatus?: 'Active' | 'Suspended' | 'On Leave' | 'Retired' | 'Resigned';
  subjects: string[]; // Subject codes/names assigned
  hourlyRate: number;
  isRateOverridden?: boolean;
  loggedHours: number;
  overtimeHours?: number;
  bankingInfo?: BankingInfo;
  bankDetails?: string; // Legacy string fallback
  contractLength: string; // e.g., "2 Years", "Permanent"
  designatorCode: string; // e.g., "LEC-402"
  bio?: string;
  avatar?: string;
  publications?: string[];
  researchInterests?: string[];
  officeHours?: OfficeHourSlot[];
  roles?: string[]; // RBAC system roles e.g. ['Lecturer', 'Head of Department']
  performanceReviews?: PerformanceReview[];
  documents?: StaffDocument[];
  leaveHistory?: LeaveRecord[];
  isActive?: boolean;
  isAccountant?: boolean;
  isLibrarian?: boolean;
  passcode?: string;
}

export interface PayrollRecord {
  id: string;
  periodId?: string;
  lecturerId: string;
  staffNumber?: string;
  name?: string;
  department?: string;
  academicRank?: string;
  month: string;
  year: number;
  hoursWorked: number;
  hourlyRate: number;
  overtimeHours: number;
  basePay: number;
  overtimePay: number;
  houseAllowance: number;
  transportAllowance: number;
  responsibilityAllowance: number;
  otherAllowances?: number;
  grossPay: number;
  payeTax: number;
  shifDeduction: number;
  nssfDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  payrollStatus: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
  paymentStatus: 'Unpaid' | 'Pending' | 'Disbursed' | 'Paid';
  disbursedAt?: string;
}

export interface PayrollPeriod {
  id: string;
  month: string;
  year: number;
  status: 'Draft' | 'Processing' | 'Approved' | 'Disbursed';
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  staffCount: number;
  createdAt: string;
}

export interface Grade {
  cat: number;   // Max 30
  exam: number;  // Max 70
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  admissionNo: string;
  cohort: string; // e.g., "2024 Intake"
  enrolledUnits: string[]; // Code list
  grades: Record<string, Grade>; // subjectCode -> Grade
  ledger: Invoice[];
  payments: Payment[];
  attendance?: Record<string, number>; // subjectCode -> Attendance percentage (e.g. 0-100)
  avatar?: string;
  passcode?: string;
  accountStatus?: string;
  createdAt?: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  description: string;
  amount: number;
  date: string;
  status: 'unpaid' | 'paid';
}

export interface Payment {
  id: string;
  amount: number;
  invoiceId: string;
  studentId: string;
  paymentMethod: 'M-Pesa' | 'Bank Transfer' | 'Card';
  transactionId: string;
  date: string;
  status: 'unreconciled' | 'reconciled';
}

export interface Expense {
  id: string;
  description: string;
  category: string; // e.g., "Utility Bills", "Marketing", "Maintenance"
  amount: number;
  date: string;
}

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  category: string; // e.g., "Electronics", "Stationery", "Lab Equipment"
  location: string;
  lowestThreshold: number;
}

export interface Requisition {
  id: string;
  itemName: string;
  quantity: number;
  staffName: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface NewsPost {
  id: string;
  title: string;
  content: string;
  date: string;
  category: 'Announcement' | 'Academic' | 'Exam Schedule' | 'Event';
  image: string;
}

export interface Testimony {
  id: string;
  name: string;
  role: string; // e.g., "Alumni - Software Eng at Google", "Employer - Tech Director"
  content: string;
  avatar: string;
}

export type UserRole = 'student' | 'lecturer' | 'admin' | 'accountant' | 'librarian' | null;

export interface CourseReview {
  id: string;
  courseId: string; // e.g. "c1" or "CS-101"
  studentId: string;
  studentName: string;
  rating: number; // 1-5 stars
  comment: string;
  date: string;
}

export interface MISState {
  courses: Course[];
  lecturers: Lecturer[];
  students: Student[];
  expenses: Expense[];
  inventory: StockItem[];
  requisitions: Requisition[];
  news: NewsPost[];
  testimonies: Testimony[];
  passwordResetRequests?: PasswordResetRequest[];
}

export interface PasswordResetRequest {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: 'student' | 'lecturer' | 'accountant' | 'librarian' | 'admin';
  date: string;
  reason: string;
  status: 'pending' | 'resolved' | 'rejected';
  adminFeedback?: string;
  temporaryPasscode?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  edition: string;
  purchasePrice: number;
  rackNumber: string;
  shelfRow: string;
  libraryCode: string;
  type: 'Physical Book' | 'E-Book';
  eUrl_aid?: string;
  copiesTotal: number;
  copiesAvailable: number;
  category: string;
}

export interface Loan {
  id: string;
  bookId: string;
  bookTitle: string;
  patronId: string;
  patronName: string;
  patronRole: 'student' | 'lecturer';
  checkoutDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'borrowed' | 'returned' | 'overdue' | 'lost' | 'damaged';
  lateFeeAssessed?: number;
}

export interface Reservation {
  id: string;
  bookId: string;
  bookTitle: string;
  patronId: string;
  patronName: string;
  reservationDate: string;
  status: 'pending' | 'fulfilled' | 'cancelled';
}

export interface LMSReadingList {
  id: string;
  subjectCode: string; // e.g. "CS-101-Web"
  lecturerId: string;
  bookIds: string[];
  notes?: string;
}

export interface BookReview {
  id: string;
  bookId: string;
  studentId: string;
  studentName: string;
  rating: number; // 1-5
  comment: string;
  date: string;
}

export interface BookRequest {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  suggestedBy: string;
  suggestorRole: 'student' | 'lecturer';
  date: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminFeedback?: string;
}

export interface ExamPaper {
  id: string;
  title: string;
  subjectCode: string;
  year: number;
  semester: string;
  examType: 'Midterm' | 'Final' | 'National Exam (KCSE/IGCSE)';
  downloadUrl_aid: string;
  downloadsCount: number;
}

export interface TeacherResource {
  id: string;
  name: string;
  category: 'Instructional Guide' | 'Lab Manual' | 'Hardware/Projector' | 'Scientific Kit';
  serialNo: string;
  status: 'available' | 'reserved';
  reservedByLecturerId?: string;
  reservedByLecturerName?: string;
  reservationDate?: string;
}

export interface LibraryGateLog {
  id: string;
  timestamp: string;
  patronName: string;
  patronId: string;
  role: 'student' | 'lecturer';
  authMethod: 'biometric_fingerprint' | 'biometric_facial' | 'rfid_tap';
  gateAction: 'Entry' | 'Exit';
  status: 'success' | 'denied';
  reason?: string;
}export interface InAppNotification {
  id: string;
  targetUserId?: string; // empty means global
  targetUserRole: 'student' | 'lecturer' | 'accountant' | 'librarian' | 'admin' | 'all';
  type: 'library' | 'payment' | 'announcement';
  title: string;
  message: string;
  status: 'unread' | 'read';
  dateTime: string;
}

export interface MockEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  type: 'invoice' | 'book_due' | 'grade_posted';
  recipientName: string;
}

export interface AttendanceSession {
  id: string;
  date: string;
  subjectCode: string;
  presentStudents: string[];
  absentStudents: string[];
}
