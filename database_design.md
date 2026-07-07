# Zenti Portal — Microsoft SQL Server Database Architecture

This document outlines the production-ready relational database schema design (Transact-SQL / T-SQL dialect) and analytical queries crafted specifically for **Microsoft SQL Server** and **SQL Server Management Studio (SSMS)**.

The schema mirrors the core entities of the Zenti Multi-Role Institutional Management Platform, enforcing rigorous relational constraints, indexing, and high-performance querying in the SQL Server ecosystem.

---

## Part 1: Relational Database Schemas (T-SQL DDL)

Copy and execute these SQL statements in **SQL Server Management Studio (SSMS)** to provision the tables, foreign keys, default constraints, and performance-optimizing indexes.

### 1. Academics & Course Administration
```sql
-- Course Modules Catalog
CREATE TABLE courses (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    code VARCHAR(30) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    duration VARCHAR(50) NOT NULL, -- e.g., '1 Semester', '4 Years'
    fees DECIMAL(12, 2) NOT NULL CHECK (fees >= 0),
    thumbnail NVARCHAR(MAX),
    faculty VARCHAR(100) NOT NULL, -- e.g., 'School of Computing', 'Engineering'
    active BIT DEFAULT 1 NOT NULL
);

CREATE INDEX idx_courses_faculty ON courses(faculty);
```

### 2. User & Access Control Management
```sql
-- Lecturer Profiles (also serves Accountant, Librarian, Admin users)
CREATE TABLE lecturers (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL CHECK (email LIKE '%@%.%'),
    phone VARCHAR(30) NOT NULL,
    hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (hourly_rate >= 0),
    logged_hours DECIMAL(6, 2) NOT NULL DEFAULT 0.00 CHECK (logged_hours >= 0),
    bank_details NVARCHAR(MAX),
    contract_length VARCHAR(100) NOT NULL, -- e.g., '2 Years', 'Permanent'
    designator_code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'LEC-402'
    bio NVARCHAR(MAX),
    avatar NVARCHAR(MAX),
    is_active BIT DEFAULT 1 NOT NULL,
    is_accountant BIT DEFAULT 0 NOT NULL,
    is_librarian BIT DEFAULT 0 NOT NULL
);

-- Lecturer Publications (Normalized 1:N)
CREATE TABLE lecturer_publications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    lecturer_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES lecturers(id) ON DELETE CASCADE,
    publication_text NVARCHAR(MAX) NOT NULL
);

-- Lecturer Research Interests (Normalized 1:N)
CREATE TABLE lecturer_research_interests (
    id INT IDENTITY(1,1) PRIMARY KEY,
    lecturer_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES lecturers(id) ON DELETE CASCADE,
    interest_text NVARCHAR(MAX) NOT NULL
);

-- Lecturer Office Hour Reservation Slots
CREATE TABLE office_hour_slots (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    lecturer_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES lecturers(id) ON DELETE CASCADE,
    day VARCHAR(30) NOT NULL, -- e.g., 'Monday', '2026-06-18'
    time_slot VARCHAR(100) NOT NULL, -- e.g., '10:00 AM - 10:30 AM'
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'booked')) NOT NULL,
    student_id UNIQUEIDENTIFIER, -- NULL if available
    student_name VARCHAR(255),
    student_email VARCHAR(255),
    student_notes NVARCHAR(MAX)
);

CREATE INDEX idx_office_lecturer ON office_hour_slots(lecturer_id);
CREATE INDEX idx_office_status ON office_hour_slots(status);
```

### 3. Student Management & Academic Audits
```sql
-- Student Master Profiles
CREATE TABLE students (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL CHECK (email LIKE '%@%.%'),
    phone VARCHAR(30) NOT NULL,
    admission_no VARCHAR(50) UNIQUE NOT NULL,
    cohort VARCHAR(50) NOT NULL, -- e.g., '2024 Intake'
    avatar NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT SYSDATETIME() NOT NULL
);

CREATE INDEX idx_students_admission ON students(admission_no);

-- M:N Course Registration mapping (Enrolled Units)
CREATE TABLE student_enrollments (
    student_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES students(id) ON DELETE CASCADE,
    course_code VARCHAR(30) NOT NULL,
    enrolled_at DATETIME2 DEFAULT SYSDATETIME() NOT NULL,
    PRIMARY KEY (student_id, course_code)
);

-- Academic Grades/Performance Ledger
CREATE TABLE grades (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    student_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES students(id) ON DELETE CASCADE,
    subject_code VARCHAR(30) NOT NULL,
    cat_score DECIMAL(5, 2) NOT NULL DEFAULT 0.00 CHECK (cat_score BETWEEN 0.00 AND 30.00),
    exam_score DECIMAL(5, 2) NOT NULL DEFAULT 0.00 CHECK (exam_score BETWEEN 0.00 AND 70.00),
    graded_at DATETIME2 DEFAULT SYSDATETIME() NOT NULL,
    CONSTRAINT UQ_Student_Subject UNIQUE (student_id, subject_code)
);

CREATE INDEX idx_grades_student ON grades(student_id);

-- Attendance Check-ins (Daily Logs)
CREATE TABLE student_attendance (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    student_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES students(id) ON DELETE CASCADE,
    subject_code VARCHAR(30) NOT NULL,
    date DATE NOT NULL,
    attended BIT NOT NULL DEFAULT 1,
    CONSTRAINT UQ_Student_Subject_Date UNIQUE (student_id, subject_code, date)
);

CREATE INDEX idx_attendance_lookup ON student_attendance(student_id, date);
```

### 4. Financial Suite (Ledgers & Treasury)
```sql
-- Student Invoices (Fees & Sundries)
CREATE TABLE invoices (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    student_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES students(id) ON DELETE CASCADE,
    invoice_no VARCHAR(50) UNIQUE NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid')) NOT NULL
);

CREATE INDEX idx_invoices_student ON invoices(student_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Student Payments (Receipts)
CREATE TABLE payments (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    student_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES students(id) ON DELETE CASCADE,
    invoice_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES invoices(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('M-Pesa', 'Bank Transfer', 'Card')),
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'unreconciled' CHECK (status IN ('unreconciled', 'reconciled')) NOT NULL
);

CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Operating Expenditures & Vouchers
CREATE TABLE expenses (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    description NVARCHAR(MAX) NOT NULL,
    category VARCHAR(100) NOT NULL, -- e.g., 'Utility Bills', 'Marketing', 'Maintenance'
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    date DATE NOT NULL
);

CREATE INDEX idx_expenses_category_date ON expenses(category, date);
```

### 5. Library Operations & Gate Logs (OPAC Hub)
```sql
-- Library Books Catalog
CREATE TABLE books (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(50) UNIQUE NOT NULL,
    publisher VARCHAR(100),
    edition VARCHAR(50),
    purchase_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    rack_number VARCHAR(50) NOT NULL,
    shelf_row VARCHAR(50) NOT NULL,
    library_code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) DEFAULT 'Physical Book' CHECK (type IN ('Physical Book', 'E-Book')) NOT NULL,
    e_url NVARCHAR(MAX), -- NULL for physical books
    copies_total INT NOT NULL CHECK (copies_total >= 0),
    copies_available INT NOT NULL CHECK (copies_available >= 0),
    category VARCHAR(100) NOT NULL,
    CONSTRAINT check_copies CHECK (copies_available <= copies_total)
);

CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_category ON books(category);

-- Book Loans Ledger
CREATE TABLE loans (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    book_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES books(id) ON DELETE CASCADE,
    book_title VARCHAR(255) NOT NULL,
    patron_id UNIQUEIDENTIFIER NOT NULL, -- Polymorphic relation (Student or Lecturer UUID)
    patron_name VARCHAR(255) NOT NULL,
    patron_role VARCHAR(20) NOT NULL CHECK (patron_role IN ('student', 'lecturer')),
    checkout_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE, -- NULL if active loan
    status VARCHAR(20) DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned', 'overdue', 'lost', 'damaged')) NOT NULL,
    late_fee_assessed DECIMAL(10, 2) DEFAULT 0.00 CHECK (late_fee_assessed >= 0.00) NOT NULL,
    CONSTRAINT check_dates CHECK (due_date >= checkout_date)
);

CREATE INDEX idx_loans_patron ON loans(patron_id);
CREATE INDEX idx_loans_status ON loans(status);

-- Book Hold Reservations Queue
CREATE TABLE reservations (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    book_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES books(id) ON DELETE CASCADE,
    book_title VARCHAR(255) NOT NULL,
    patron_id UNIQUEIDENTIFIER NOT NULL,
    patron_name VARCHAR(255) NOT NULL,
    reservation_date DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')) NOT NULL
);

CREATE INDEX idx_reservations_queue ON reservations(book_id, reservation_date);

-- Biometric Library Entrance Access Logs
CREATE TABLE library_gate_logs (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    timestamp DATETIME2 DEFAULT SYSDATETIME() NOT NULL,
    patron_name VARCHAR(255) NOT NULL,
    patron_id UNIQUEIDENTIFIER NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'lecturer')),
    auth_method VARCHAR(50) NOT NULL CHECK (auth_method IN ('biometric_fingerprint', 'biometric_facial', 'rfid_tap')),
    gate_action VARCHAR(20) NOT NULL CHECK (gate_action IN ('Entry', 'Exit')),
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'denied')) NOT NULL,
    reason NVARCHAR(MAX)
);

CREATE INDEX idx_gate_logs_timestamp ON library_gate_logs(timestamp);
```

### 6. Procurement & Operational Assets
```sql
-- Inventory Asset Items
CREATE TABLE stock_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity >= 0),
    category VARCHAR(100) NOT NULL, -- e.g., 'Electronics', 'Stationery', 'Lab Equipment'
    location VARCHAR(100) NOT NULL,
    lowest_threshold INT NOT NULL DEFAULT 5 CHECK (lowest_threshold >= 0)
);

-- Staff Resource Procurement Requisitions
CREATE TABLE requisitions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    item_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    staff_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL
);
```

---

## Part 2: Transact-SQL (T-SQL) Operational & Analytical Queries

These optimized Transact-SQL queries perform complex backend aggregations, automated calculations, and real-time processing specifically designed for the SQL Server engine.

### 1. Student Fee Ledger Statement & Balance Reconciliation
Aggregates a student's total invoiced amount and verified, reconciled receipts to calculate their outstanding debt. This check determines clearance limits for unit registrations.

```sql
SELECT 
    s.id AS student_id,
    s.name AS student_name,
    s.admission_no,
    COALESCE(SUM(DISTINCT i.amount), 0.00) AS total_invoiced,
    COALESCE(SUM(CASE WHEN p.status = 'reconciled' THEN p.amount ELSE 0.00 END), 0.00) AS total_payments_reconciled,
    (COALESCE(SUM(DISTINCT i.amount), 0.00) - COALESCE(SUM(CASE WHEN p.status = 'reconciled' THEN p.amount ELSE 0.00 END), 0.00)) AS outstanding_balance,
    CASE 
        WHEN (COALESCE(SUM(DISTINCT i.amount), 0.00) - COALESCE(SUM(CASE WHEN p.status = 'reconciled' THEN p.amount ELSE 0.00 END), 0.00)) <= 0 THEN 'CLEARED'
        ELSE 'DEBTOR'
    END AS clearance_status
FROM students s
LEFT JOIN invoices i ON s.id = i.student_id
LEFT JOIN payments p ON s.id = p.student_id
WHERE s.admission_no = 'AD-2024-8801' -- SSMS Filter Parameter
GROUP BY s.id, s.name, s.admission_no;
```

---

### 2. Daily Attendance Heatmap Density (Last 3 Months)
Queries aggregate daily class participation counts for a student over the last 90 days. Ideal for feeding the interactive Student Dashboard calendar-based heatmap.

```sql
SELECT 
    sa.date AS check_in_date,
    COUNT(sa.id) AS total_classes_scheduled,
    SUM(CASE WHEN sa.attended = 1 THEN 1 ELSE 0 END) AS attended_count,
    ROUND((CAST(SUM(CASE WHEN sa.attended = 1 THEN 1 ELSE 0 END) AS DECIMAL(10,2)) / NULLIF(COUNT(sa.id), 0)) * 100, 2) AS daily_attendance_percentage
FROM student_attendance sa
WHERE sa.student_id = '4f95ad76-3345-4a16-8b0d-7709718cb540' -- Target student UUID
  AND sa.date >= DATEADD(month, -3, CAST(GETDATE() AS DATE))
GROUP BY sa.date
ORDER BY sa.date ASC;
```

---

### 3. Automated Library Overdue Fine Escalator (SQL Agent Job)
Finds active loans that have exceeded their due dates, changes their status to `overdue`, and calculates late fines at a base rate of KES 50.00 per day.

```sql
UPDATE loans
SET 
    status = 'overdue',
    late_fee_assessed = DATEDIFF(day, due_date, CAST(GETDATE() AS DATE)) * 50.00
WHERE return_date IS NULL
  AND due_date < CAST(GETDATE() AS DATE)
  AND status IN ('borrowed', 'overdue');
```

---

### 4. Accountant Payroll Calculator with Statutory Tax Deductions
Computes NSSF pension funds, tiered NHIF medical contributions, PAYE tax, and net pay disbursements for all active contract lecturers.

```sql
SELECT 
    id AS lecturer_id,
    name AS lecturer_name,
    designator_code,
    logged_hours,
    hourly_rate,
    (logged_hours * hourly_rate) AS gross_salary,
    -- NSSF Pension deduction contribution (Standard limit)
    1080.00 AS deduction_nssf,
    -- Tiered NHIF Medical insurance contribution
    CASE 
        WHEN (logged_hours * hourly_rate) < 20000 THEN 500.00
        WHEN (logged_hours * hourly_rate) BETWEEN 20000 AND 50000 THEN 1000.00
        ELSE 1700.00
    END AS deduction_nhif,
    -- Direct PAYE Income tax (30% of taxable income)
    ROUND(CASE 
        WHEN (logged_hours * hourly_rate - 1080.00) * 0.30 > 0 THEN (logged_hours * hourly_rate - 1080.00) * 0.30 
        ELSE 0 
    END, 2) AS deduction_paye,
    -- Net Payout disbursed to routing parameters
    ROUND(
        (logged_hours * hourly_rate) - 1080.00 - 
        (CASE 
            WHEN (logged_hours * hourly_rate) < 20000 THEN 500.00
            WHEN (logged_hours * hourly_rate) BETWEEN 20000 AND 50000 THEN 1000.00
            ELSE 1700.00
         END) - 
        (CASE 
            WHEN (logged_hours * hourly_rate - 1080.00) * 0.30 > 0 THEN (logged_hours * hourly_rate - 1080.00) * 0.30 
            ELSE 0 
         END)
    , 2) AS net_salary_disbursed
FROM lecturers
WHERE is_active = 1;
```

---

### 5. FIFO Library Hold Reservation Fulfilment
Selects the next student waiting in queue for a physical book that has just been checked back in, facilitating immediate reservation fulfillment.

```sql
SELECT TOP 1
    r.id AS reservation_id,
    r.book_id,
    r.book_title,
    r.patron_id,
    r.patron_name,
    r.reservation_date
FROM reservations r
JOIN books b ON r.book_id = b.id
WHERE b.id = 'e2bda36a-ca81-42cb-b169-df427ff1e99a' -- Returned book ID
  AND r.status = 'pending'
  AND b.copies_available > 0
ORDER BY r.reservation_date ASC;
```

---

### 6. Academic Performance Tiering & GPA Calculator
Aggregates continuous assessment tests (CAT) and final exam grades across all courses to evaluate cumulative grade averages and classify students into honors divisions.

```sql
WITH student_aggregates AS (
    SELECT 
        s.id AS student_id,
        s.name AS student_name,
        s.admission_no,
        COUNT(g.id) AS units_graded,
        AVG(g.cat_score + g.exam_score) AS cumulative_average_score
    FROM students s
    JOIN grades g ON s.id = g.student_id
    GROUP BY s.id, s.name, s.admission_no
)
SELECT 
    student_id,
    student_name,
    admission_no,
    units_graded,
    ROUND(cumulative_average_score, 2) AS overall_average_grade,
    CASE 
        WHEN cumulative_average_score >= 70.00 THEN 'First Class Honors (A)'
        WHEN cumulative_average_score BETWEEN 60.00 AND 69.99 THEN 'Second Class Upper Division (B)'
        WHEN cumulative_average_score BETWEEN 50.00 AND 59.99 THEN 'Second Class Lower Division (C)'
        WHEN cumulative_average_score BETWEEN 40.00 AND 49.99 THEN 'Pass (D)'
        ELSE 'Fail (E)'
    END AS academic_classification
FROM student_aggregates
ORDER BY cumulative_average_score DESC;
```

---

### 7. Real-Time Library Gate Log Traffic Auditing
Analyzes hourly gate activity swipes, successes, and violations to optimize security personnel allocation and track facility utilization.

```sql
SELECT 
    FORMAT(timestamp, 'yyyy-MM-dd HH:00') AS hourly_window,
    gate_action,
    COUNT(id) AS total_swipes,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successful_verifications,
    SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) AS access_violations
FROM library_gate_logs
GROUP BY FORMAT(timestamp, 'yyyy-MM-dd HH:00'), gate_action
ORDER BY hourly_window DESC;
```
