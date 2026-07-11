-- =========================================================================
-- Zenti Institutional Portal — Supabase PostgreSQL Database Architecture
-- Optimized for: PostgreSQL 15+ / Supabase DB (Real-time and Auth)
-- Created At: 2026-07-01
-- =========================================================================

-- Enable uuid-ossp extension for generating v4 UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- SECTION 1: CLEANUP / RESET (Optional)
-- =========================================================================
-- DROP TABLE IF EXISTS password_reset_requests CASCADE;
-- DROP TABLE IF EXISTS mock_emails CASCADE;
-- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TABLE IF EXISTS library_gate_logs CASCADE;
-- DROP TABLE IF EXISTS teacher_resources CASCADE;
-- DROP TABLE IF EXISTS exam_papers CASCADE;
-- DROP TABLE IF EXISTS book_requests CASCADE;
-- DROP TABLE IF EXISTS book_reviews CASCADE;
-- DROP TABLE IF EXISTS reading_list_books CASCADE;
-- DROP TABLE IF EXISTS reading_lists CASCADE;
-- DROP TABLE IF EXISTS reservations CASCADE;
-- DROP TABLE IF EXISTS loans CASCADE;
-- DROP TABLE IF EXISTS books CASCADE;
-- DROP TABLE IF EXISTS requisitions CASCADE;
-- DROP TABLE IF EXISTS stock_items CASCADE;
-- DROP TABLE IF EXISTS expenses CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS invoices CASCADE;
-- DROP TABLE IF EXISTS student_attendance CASCADE;
-- DROP TABLE IF EXISTS grades CASCADE;
-- DROP TABLE IF EXISTS student_enrollments CASCADE;
-- DROP TABLE IF EXISTS students CASCADE;
-- DROP TABLE IF EXISTS office_hour_slots CASCADE;
-- DROP TABLE IF EXISTS lecturer_research_interests CASCADE;
-- DROP TABLE IF EXISTS lecturer_publications CASCADE;
-- DROP TABLE IF EXISTS lecturers CASCADE;
-- DROP TABLE IF EXISTS testimonies CASCADE;
-- DROP TABLE IF EXISTS course_reviews CASCADE;
-- DROP TABLE IF EXISTS courses CASCADE;


-- =========================================================================
-- SECTION 2: RELATIONAL TABLES (POSTGRES DIALECT)
-- =========================================================================

-- 1. Courses Catalog
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration VARCHAR(50) NOT NULL, -- e.g. '1 Semester', '4 Years'
    fees NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (fees >= 0),
    thumbnail TEXT,
    faculty VARCHAR(100) NOT NULL, -- e.g. 'School of Computing', 'Engineering'
    active BOOLEAN DEFAULT TRUE NOT NULL
);

-- 2. Course Reviews (Added for Course Feedback functionality)
CREATE TABLE course_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL, -- Logical link to students table
    student_name VARCHAR(255) NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 3. Lecturer Profiles (Serves Admin, Accountants, Librarians, & Faculty Users)
CREATE TABLE lecturers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL CHECK (email LIKE '%@%.%'),
    phone VARCHAR(30) NOT NULL,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (hourly_rate >= 0),
    logged_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00 CHECK (logged_hours >= 0),
    bank_details TEXT,
    contract_length VARCHAR(100) NOT NULL, -- e.g., '2 Years', 'Permanent'
    designator_code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'LEC-402'
    bio TEXT,
    avatar TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_accountant BOOLEAN DEFAULT FALSE NOT NULL,
    is_librarian BOOLEAN DEFAULT FALSE NOT NULL,
    passcode VARCHAR(100) DEFAULT 'lecturer123' NOT NULL
);

-- 4. Lecturer Publications (Normalized 1:N)
CREATE TABLE lecturer_publications (
    id SERIAL PRIMARY KEY,
    lecturer_id UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
    publication_text TEXT NOT NULL
);

-- 5. Lecturer Research Interests (Normalized 1:N)
CREATE TABLE lecturer_research_interests (
    id SERIAL PRIMARY KEY,
    lecturer_id UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
    interest_text TEXT NOT NULL
);

-- 6. Lecturer Office Hours Reservation Slots
CREATE TABLE office_hour_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecturer_id UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
    day VARCHAR(30) NOT NULL, -- e.g. 'Monday', '2026-06-18'
    time_slot VARCHAR(100) NOT NULL, -- e.g. '10:00 AM - 10:30 AM'
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'booked')) NOT NULL,
    student_id UUID, -- NULL if available
    student_name VARCHAR(255),
    student_email VARCHAR(255),
    student_notes TEXT
);

-- 7. Student Master Profiles
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL CHECK (email LIKE '%@%.%'),
    phone VARCHAR(30) NOT NULL,
    admission_no VARCHAR(50) UNIQUE NOT NULL,
    cohort VARCHAR(50) NOT NULL, -- e.g. '2024 Intake'
    avatar TEXT,
    passcode VARCHAR(100) DEFAULT 'student123' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. Student M:N Course Enrollments
CREATE TABLE student_enrollments (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_code VARCHAR(30) NOT NULL,
    enrolled_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (student_id, course_code)
);

-- 9. Academic Grades (Grades Tracker)
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_code VARCHAR(30) NOT NULL,
    cat_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (cat_score BETWEEN 0.00 AND 30.00),
    exam_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (exam_score BETWEEN 0.00 AND 70.00),
    graded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_student_subject UNIQUE (student_id, subject_code)
);

-- 10. Daily Attendance Logs
CREATE TABLE student_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_code VARCHAR(30) NOT NULL,
    attendance_rate INTEGER NOT NULL DEFAULT 100 CHECK (attendance_rate BETWEEN 0 AND 100),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_student_subject_attendance UNIQUE (student_id, subject_code)
);

-- 11. Fee Invoices (Financial Suite Ledger)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    invoice_no VARCHAR(50) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid')) NOT NULL
);

-- 12. Student Fee Receipts & Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('M-Pesa', 'Bank Transfer', 'Card')),
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'unreconciled' CHECK (status IN ('unreconciled', 'reconciled')) NOT NULL
);

-- 13. Institutional Operational Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL, -- e.g., 'Utility Bills', 'Marketing', 'Maintenance'
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    date DATE NOT NULL
);

-- 14. Stock Inventory Management (Supplier Registry)
CREATE TABLE stock_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    category VARCHAR(100) NOT NULL, -- e.g., 'Electronics', 'Stationery', 'Lab Equipment'
    location VARCHAR(100) NOT NULL,
    lowest_threshold INTEGER NOT NULL DEFAULT 5 CHECK (lowest_threshold >= 0)
);

-- 15. Procurement Requisitions Vouchers
CREATE TABLE requisitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    staff_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL
);

-- 16. Testimonies & Editorial News
CREATE TABLE testimonies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL, -- Alumni, Employer, Partner
    content TEXT NOT NULL,
    avatar TEXT
);

-- 17. Library Catalog & Books Registry
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(50) UNIQUE NOT NULL,
    publisher VARCHAR(100),
    edition VARCHAR(50),
    purchase_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    rack_number VARCHAR(50) NOT NULL,
    shelf_row VARCHAR(50) NOT NULL,
    library_code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) DEFAULT 'Physical Book' CHECK (type IN ('Physical Book', 'E-Book')) NOT NULL,
    e_url TEXT, -- URL link for E-Books
    copies_total INTEGER NOT NULL CHECK (copies_total >= 0),
    copies_available INTEGER NOT NULL CHECK (copies_available >= 0),
    category VARCHAR(100) NOT NULL,
    CONSTRAINT check_copies CHECK (copies_available <= copies_total)
);

-- 18. Library Book Checkout Loans
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    book_title VARCHAR(255) NOT NULL,
    patron_id UUID NOT NULL, -- Student ID or Lecturer ID
    patron_name VARCHAR(255) NOT NULL,
    patron_role VARCHAR(20) NOT NULL CHECK (patron_role IN ('student', 'lecturer')),
    checkout_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE,
    status VARCHAR(20) DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned', 'overdue', 'lost', 'damaged')) NOT NULL,
    late_fee_assessed NUMERIC(10, 2) DEFAULT 0.00 CHECK (late_fee_assessed >= 0.00) NOT NULL,
    CONSTRAINT check_dates CHECK (due_date >= checkout_date)
);

-- 19. Library Holds & Reservations Queue
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    book_title VARCHAR(255) NOT NULL,
    patron_id UUID NOT NULL,
    patron_name VARCHAR(255) NOT NULL,
    reservation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')) NOT NULL
);

-- 20. LMS Reading Lists (Curated by Academics)
CREATE TABLE reading_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_code VARCHAR(30) NOT NULL,
    lecturer_id UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
    notes TEXT
);

-- 21. LMS Reading List Books Association (M:N)
CREATE TABLE reading_list_books (
    reading_list_id UUID NOT NULL REFERENCES reading_lists(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    PRIMARY KEY (reading_list_id, book_id)
);

-- 22. Library Book Reviews (Feedback System)
CREATE TABLE book_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 23. Catalog Procurement Suggestions
CREATE TABLE book_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(50),
    suggested_by VARCHAR(255) NOT NULL,
    suggestor_role VARCHAR(20) NOT NULL CHECK (suggestor_role IN ('student', 'lecturer')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL,
    admin_feedback TEXT
);

-- 24. Past Exam Papers Catalog
CREATE TABLE exam_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    subject_code VARCHAR(30) NOT NULL,
    year INTEGER NOT NULL,
    semester VARCHAR(50) NOT NULL,
    exam_type VARCHAR(50) NOT NULL CHECK (exam_type IN ('Midterm', 'Final', 'National Exam (KCSE/IGCSE)')),
    download_url TEXT NOT NULL,
    downloads_count INTEGER DEFAULT 0 NOT NULL
);

-- 25. Teacher Shared Academic Resources
CREATE TABLE teacher_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('Instructional Guide', 'Lab Manual', 'Hardware/Projector', 'Scientific Kit')),
    serial_no VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'reserved')) NOT NULL,
    reserved_by_lecturer_id UUID REFERENCES lecturers(id) ON DELETE SET NULL,
    reserved_by_lecturer_name VARCHAR(255),
    reservation_date DATE
);

-- 26. Biometric Security Turnstile Logs
CREATE TABLE library_gate_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    patron_name VARCHAR(255) NOT NULL,
    patron_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'lecturer')),
    auth_method VARCHAR(50) NOT NULL CHECK (auth_method IN ('biometric_fingerprint', 'biometric_facial', 'rfid_tap')),
    gate_action VARCHAR(20) NOT NULL CHECK (gate_action IN ('Entry', 'Exit')),
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'denied')) NOT NULL,
    reason TEXT
);

-- 27. Universal Alert Notifications Suite
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_user_id UUID, -- NULL indicates global notification broadcast
    target_user_role VARCHAR(20) NOT NULL CHECK (target_user_role IN ('student', 'lecturer', 'accountant', 'librarian', 'admin', 'all')),
    type VARCHAR(30) NOT NULL CHECK (type IN ('library', 'payment', 'announcement')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read')) NOT NULL,
    date_time TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 28. Simulated Outgoing Communications Log
CREATE TABLE mock_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_to VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('invoice', 'book_due', 'grade_posted')),
    recipient_name VARCHAR(255) NOT NULL
);

-- 29. Administrative Access Support Passcode Requests
CREATE TABLE password_reset_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'lecturer', 'accountant', 'librarian', 'admin')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')) NOT NULL,
    admin_feedback TEXT,
    temporary_passcode VARCHAR(50)
);


-- =========================================================================
-- SECTION 3: PERFORMANCE OPTIMIZING INDEXES
-- =========================================================================
CREATE INDEX idx_students_admission ON students(admission_no);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_lecturers_email ON lecturers(email);
CREATE INDEX idx_courses_code ON courses(code);
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_invoices_student ON invoices(student_id);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_loans_patron ON loans(patron_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_gate_logs_timestamp ON library_gate_logs(timestamp);
CREATE INDEX idx_notifications_target ON notifications(target_user_id, target_user_role);


-- =========================================================================
-- SECTION 4: ROW-LEVEL SECURITY & POLICIES (SUPABASE AUTH INTEGRATION)
-- =========================================================================
-- Supabase uses PostgreSQL Row-Level Security (RLS) to restrict read/write access.
-- Below is a standard template matching students to their private profiles, while
-- granting read/write capabilities to institutional staff (Admin/Lecturers/Accountants).

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy examples:
-- 1. Student can read their own profile
-- CREATE POLICY student_read_own ON students 
--     FOR SELECT USING (auth.jwt() ->> 'email' = email);

-- 2. Student can read their own grades
-- CREATE POLICY student_read_grades ON grades 
--     FOR SELECT USING (student_id = (SELECT id FROM students WHERE email = auth.jwt() ->> 'email'));


-- =========================================================================
-- SECTION 5: HIGH-FIDELITY SEED DATA (ALIGNED WITH SYSTEM STATE)
-- =========================================================================

-- Insert Sample Courses
INSERT INTO courses (id, code, title, description, duration, fees, thumbnail, faculty, active) VALUES
('c1111111-1111-1111-1111-111111111111', 'CS-101', 'Introduction to Computer Science', 'Fundamental concepts of programming, algorithms, and logical design using Python.', '1 Semester', 35000.00, 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97', 'School of Computing', TRUE),
('c2222222-2222-2222-2222-222222222222', 'CS-202', 'Data Structures & Algorithms', 'In-depth study of stacks, queues, hash tables, trees, graphs, and optimization analysis.', '1 Semester', 40000.00, 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4', 'School of Computing', TRUE),
('c3333333-3333-3333-3333-333333333333', 'ENG-301', 'Fluid Mechanics for Engineers', 'Introduction to fluid properties, hydrostatics, and computational dynamic workflows.', '2 Semesters', 52000.00, 'https://images.unsplash.com/photo-1581092160607-ee22621dd758', 'Engineering', TRUE);

-- Insert Sample Lecturers (Includes specialized accountant & librarian assignments)
INSERT INTO lecturers (id, name, email, phone, hourly_rate, logged_hours, bank_details, contract_length, designator_code, bio, avatar, is_active, is_accountant, is_librarian, passcode) VALUES
('d1111111-1111-1111-1111-111111111111', 'Dr. Alvina Vance', 'vance.alvina@zenti.edu', '+254712000999', 4500.00, 45.00, 'KCB Bank Acc: 1109485732', 'Permanent', 'LEC-101', 'Pioneer researcher in applied artificial intelligence and symbolic parsing systems.', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2', TRUE, FALSE, FALSE, 'vance123'),
('d2222222-2222-2222-2222-222222222222', 'Prof. Silas Stone', 'silas.stone@zenti.edu', '+254722888777', 5200.00, 38.00, 'Equity Bank Acc: 011039485721', '2 Years', 'LEC-102', 'Specialist in dynamic structural integrity and mechanical design optimization.', 'https://images.unsplash.com/photo-1560250097-0b93528c311a', TRUE, FALSE, FALSE, 'stone123'),
('d3333333-3333-3333-3333-333333333333', 'Mr. Robert Financials', 'finance@zenti.edu', '+254701234567', 3500.00, 160.00, 'Cooperative Bank Acc: 440938472', 'Permanent', 'ACC-101', 'Chief University Accountant overseeing student ledgers, audits, and statutory tax reconciliation.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e', TRUE, TRUE, FALSE, 'finance123'),
('d4444444-4444-4444-4444-444444444444', 'Mrs. Beatrice Bibliotheca', 'library@zenti.edu', '+254733444555', 3500.00, 150.00, 'Standard Chartered Acc: 902847291', 'Permanent', 'LIB-101', 'Lead Librarian overseeing catalog indices, physical turnstile security check-ins, and E-Book streams.', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2', TRUE, FALSE, TRUE, 'library123');

-- Insert Sample Students
INSERT INTO students (id, name, email, phone, admission_no, cohort, avatar, passcode) VALUES
('a1111111-1111-1111-1111-111111111111', 'Ochieng Julius', 'julius@zenti.edu', '+254799000111', 'ED-CS-2026-048', '2026 Cohort', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6', 'julius123'),
('a2222222-2222-2222-2222-222222222222', 'Amara Patel', 'amara@zenti.edu', '+254744111222', 'ED-CS-2026-052', '2026 Cohort', 'https://images.unsplash.com/photo-1517841905240-472988babdf9', 'amara123');

-- Insert Student Course Enrollments
INSERT INTO student_enrollments (student_id, course_code) VALUES
('a1111111-1111-1111-1111-111111111111', 'CS-101'),
('a1111111-1111-1111-1111-111111111111', 'CS-202'),
('a2222222-2222-2222-2222-222222222222', 'CS-101');

-- Insert Academic Grades
INSERT INTO grades (student_id, subject_code, cat_score, exam_score) VALUES
('a1111111-1111-1111-1111-111111111111', 'CS-101', 25.50, 62.00),
('a1111111-1111-1111-1111-111111111111', 'CS-202', 21.00, 54.50),
('a2222222-2222-2222-2222-222222222222', 'CS-101', 28.00, 65.00);

-- Insert Student Attendance rate
INSERT INTO student_attendance (student_id, subject_code, attendance_rate) VALUES
('a1111111-1111-1111-1111-111111111111', 'CS-101', 95),
('a1111111-1111-1111-1111-111111111111', 'CS-202', 88),
('a2222222-2222-2222-2222-222222222222', 'CS-101', 100);

-- Insert Fee Invoices
INSERT INTO invoices (id, student_id, invoice_no, description, amount, date, status) VALUES
('e1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'INV-2026-001', 'First Semester Standard Tuition Fee', 35000.00, '2026-01-05', 'paid'),
('e2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'INV-2026-002', 'LMS Digital Technology Surcharge', 5000.00, '2026-02-10', 'unpaid'),
('e3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', 'INV-2026-003', 'First Semester Standard Tuition Fee', 35000.00, '2026-01-05', 'paid');

-- Insert Student Payments
INSERT INTO payments (id, student_id, invoice_id, amount, payment_method, transaction_id, date, status) VALUES
('f1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 35000.00, 'M-Pesa', 'MPESA-QRTZ72891', '2026-01-06', 'reconciled'),
('f2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'e3333333-3333-3333-3333-333333333333', 35000.00, 'Bank Transfer', 'BANK-99201948', '2026-01-06', 'reconciled');

-- Insert Library Catalog Books
INSERT INTO books (id, title, author, isbn, publisher, edition, purchase_price, rack_number, shelf_row, library_code, type, e_url, copies_total, copies_available, category) VALUES
('b1111111-1111-1111-1111-111111111111', 'Introduction to Algorithms', 'Thomas H. Cormen', '978-0262033848', 'MIT Press', '3rd Edition', 8500.00, 'Rack-A', 'Row-2', 'LIB-ALGO-01', 'Physical Book', NULL, 5, 4, 'Computer Science'),
('b2222222-2222-2222-2222-222222222222', 'Computer Networking: A Top-Down Approach', 'James Kurose', '978-0133594140', 'Pearson', '7th Edition', 7800.00, 'Rack-B', 'Row-1', 'LIB-NET-02', 'Physical Book', NULL, 3, 3, 'Networking'),
('b3333333-3333-3333-3333-333333333333', 'Learn JavaScript Deeply', 'Addy Osmani', '978-1491950296', 'O Reilly', '1st Edition', 0.00, 'Digital Cloud', 'E-Row', 'LIB-JS-03', 'E-Book', 'https://eloquentjavascript.net/', 100, 100, 'Web Development');

-- Insert Active Book Loans
INSERT INTO loans (id, book_id, book_title, patron_id, patron_name, patron_role, checkout_date, due_date, return_date, status, late_fee_assessed) VALUES
('01111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Introduction to Algorithms', 'a1111111-1111-1111-1111-111111111111', 'Ochieng Julius', 'student', '2026-06-15', '2026-06-29', NULL, 'borrowed', 0.00);

-- Insert Biometric Gates Entries
INSERT INTO library_gate_logs (id, patron_name, patron_id, role, auth_method, gate_action, status) VALUES
('00000001-1111-1111-1111-111111111111', 'Ochieng Julius', 'a1111111-1111-1111-1111-111111111111', 'student', 'biometric_fingerprint', 'Entry', 'success'),
('00000002-2222-2222-2222-222222222222', 'Ochieng Julius', 'a1111111-1111-1111-1111-111111111111', 'student', 'biometric_fingerprint', 'Exit', 'success');

-- =========================================================================
-- END OF SCRIPT
-- =========================================================================
