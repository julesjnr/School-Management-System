import { Course, Lecturer, Student, Expense, StockItem, Requisition, NewsPost, Testimony, CourseReview, Book, Loan, Reservation, LMSReadingList, BookReview, BookRequest, ExamPaper, TeacherResource, LibraryGateLog, InAppNotification } from './types';

export const initialCourses: Course[] = [];
export const initialLecturers: Lecturer[] = [];
export const initialStudents: Student[] = [];
export const initialExpenses: Expense[] = [];
export const initialInventory: StockItem[] = [];
export const initialRequisitions: Requisition[] = [];
export const initialNews: NewsPost[] = [];
export const initialTestimonies: Testimony[] = [];

export const subjectMap: Record<string, string> = {
  'CS-101-Web': 'Web Technologies II (CS)',
  'CS-101-Algo': 'Design & Analysis of Algorithms (CS)',
  'DS-202-ML': 'Intro to Machine Learning (DS)',
  'DS-202-Stats': 'Computational Statistics (DS)',
  'CYBER-310-Crypto': 'Applied Cryptography & Signatures (CYBER)',
  'EE-201-Circuits': 'Analog Circuit Analysis (EE)'
};

export const initialReviews: CourseReview[] = [];
export const initialBooks: Book[] = [];
export const initialLoans: Loan[] = [];
export const initialReservations: Reservation[] = [];
export const initialReadingLists: LMSReadingList[] = [];
export const initialBookReviews: BookReview[] = [];
export const initialBookRequests: BookRequest[] = [];
export const initialExamPapers: ExamPaper[] = [];
export const initialTeacherResources: TeacherResource[] = [];
export const initialLibraryGateLogs: LibraryGateLog[] = [];
export const initialNotifications: InAppNotification[] = [];

