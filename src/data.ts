import { Course, Lecturer, Student, Expense, StockItem, Requisition, NewsPost, Testimony, CourseReview, Book, Loan, Reservation, LMSReadingList, BookReview, BookRequest, ExamPaper, TeacherResource, LibraryGateLog, InAppNotification } from './types';

export const initialCourses: Course[] = [
  {
    id: 'c1',
    code: 'CS-101',
    title: 'B.Sc. Computer Science',
    description: 'A comprehensive program covering software engineering, systems design, artificial intelligence, and database structures.',
    duration: '4 Years',
    fees: 150000,
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=600',
    faculty: 'School of Computing & AI',
    active: true,
  },
  {
    id: 'c2',
    code: 'EE-201',
    title: 'B.Eng. Electrical & Electronics',
    description: 'Hands-on curriculum in microcontrollers, circuit theory, power systems, and telecom network design.',
    duration: '5 Years',
    fees: 180000,
    thumbnail: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600',
    faculty: 'School of Engineering',
    active: true,
  },
  {
    id: 'c3',
    code: 'DS-202',
    title: 'B.Sc. Data Science & Analytics',
    description: 'Master statistical analysis, regression analysis, predictive modeling, machine learning, and big data techniques.',
    duration: '4 Years',
    fees: 160000,
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=600',
    faculty: 'School of Computing & AI',
    active: true,
  },
  {
    id: 'c4',
    code: 'CYBER-310',
    title: 'B.Sc. Cybersecurity & Forensics',
    description: 'Learn cyber defense, vulnerability analysis, cryptography, network pentesting, and digital forensic examination.',
    duration: '4 Years',
    fees: 170000,
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=600',
    faculty: 'School of Computing & AI',
    active: true,
  }
];

export const initialLecturers: Lecturer[] = [];
export const initialStudents: Student[] = [];
export const initialExpenses: Expense[] = [];
export const initialInventory: StockItem[] = [];
export const initialRequisitions: Requisition[] = [];

export const initialNews: NewsPost[] = [
  {
    id: 'n1',
    title: 'Semester II Academic Calendar Extension Announcement',
    content: 'The Academic Senate has extended the Semester II schedule by one week to allow sufficient time for project presentations and continuous assessments revisions. Exams will now commence on July 14, 2026.',
    date: '2026-06-10',
    category: 'Academic',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'n2',
    title: 'Zenti Annual Hackathon 2026: Registration Open',
    content: 'Calling all student software devs! This year\'s topic centers on Open Governance and Generative AI helpers. Secure your slots today. Total cash prizes aggregate KES 500,000 + sponsor tech-kits.',
    date: '2026-06-14',
    category: 'Event',
    image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'n3',
    title: 'Internal Audit: Faculty Course Materials Submissions',
    content: 'All faculty members are reminded that the portal for uploading supplementary class handouts and lecture videos will close on June 22. Submission complies with regulatory compliance audits.',
    date: '2026-06-15',
    category: 'Announcement',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=400'
  }
];

export const initialTestimonies: Testimony[] = [
  {
    id: 't1',
    name: 'Erick Cheruiyot',
    role: 'Alumni - Software Eng at Safaricom',
    content: 'Zenti completely reshaped my perspective of tech development. The lecturers provided absolute real-world coaching, and the active campus coding team with hackathons set a solid cornerstone for my software career path.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150'
  },
  {
    id: 't2',
    name: 'Tabitha Kamau',
    role: 'Engineering Director, Cytonn Investments',
    content: 'We routinely recruit junior staff from Zenti. Their graduates are consistently well-adapted, possess extensive modern framework skillsets (React, TypeScript), and possess practical accountability in technical workflows.',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150'
  }
];

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
