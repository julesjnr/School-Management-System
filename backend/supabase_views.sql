-- ==========================================================
-- HIGH-PERFORMANCE DATABASE VIEWS & MATERIALIZED VIEWS
-- Optimized for Zenti School Portal Analytics & Dashboards
-- ==========================================================

-- 1. Student Financial Ledger Summary (Dynamic View)
-- Compiles financial statistics per student for instant billing dashboards.
CREATE OR REPLACE VIEW student_financial_summary AS
SELECT 
    s.id AS student_id,
    s.name AS student_name,
    s.admission_no,
    COALESCE(SUM(CASE WHEN i.status = 'unpaid' THEN i.amount ELSE 0 END), 0) AS total_unpaid_amount,
    COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0) AS total_paid_amount,
    COALESCE(SUM(i.amount), 0) AS total_invoiced,
    COALESCE(SUM(CASE WHEN p.status = 'reconciled' THEN p.amount ELSE 0 END), 0) AS total_payments_reconciled,
    COALESCE(SUM(i.amount), 0) - COALESCE(SUM(CASE WHEN p.status = 'reconciled' THEN p.amount ELSE 0 END), 0) AS outstanding_balance
FROM students s
LEFT JOIN invoices i ON s.id = i.student_id
LEFT JOIN payments p ON s.id = p.student_id
GROUP BY s.id, s.name, s.admission_no;

-- 2. Course Academic Performance Metrics (Dynamic View)
-- Computes real-time grading averages, CAT/exam score summaries, and cohort counters.
CREATE OR REPLACE VIEW course_performance_metrics AS
SELECT 
    c.id AS course_id,
    c.code AS course_code,
    c.title AS course_title,
    c.faculty AS course_faculty,
    COUNT(DISTINCT se.student_id) AS enrolled_students_count,
    ROUND(AVG(g.cat_score + g.exam_score), 2) AS average_score,
    MAX(g.cat_score + g.exam_score) AS highest_score,
    MIN(g.cat_score + g.exam_score) AS lowest_score
FROM courses c
LEFT JOIN student_enrollments se ON c.code = se.course_code
LEFT JOIN grades g ON se.student_id = g.student_id AND c.code = g.subject_code
GROUP BY c.id, c.code, c.title, c.faculty;

-- 3. Library Circulation Analytics (Materialized View for Read-Heavy Queries)
-- Computes loan frequencies, overdue ratios, and reserve logs.
-- Refresh periodically via: REFRESH MATERIALIZED VIEW CONCURRENTLY library_circulation_analytics;
CREATE MATERIALIZED VIEW library_circulation_analytics AS
SELECT 
    b.id AS book_id,
    b.title AS book_title,
    b.author AS book_author,
    b.category AS book_category,
    b.copies_total,
    b.copies_available,
    COUNT(l.id) AS total_loans_recorded,
    COUNT(CASE WHEN l.status = 'borrowed' THEN 1 END) AS active_loans_count,
    COUNT(CASE WHEN l.status = 'overdue' THEN 1 END) AS overdue_loans_count,
    COUNT(CASE WHEN l.status = 'lost' THEN 1 END) AS lost_books_count
FROM books b
LEFT JOIN loans l ON b.id = l.book_id
GROUP BY b.id, b.title, b.author, b.category, b.copies_total, b.copies_available;

-- Create unique index to allow CONCURRENT REFRESH without locking table reads
CREATE UNIQUE INDEX idx_lib_circulation_book_id ON library_circulation_analytics(book_id);

-- 4. Executive Overview Dashboard Metrics (Dynamic View)
-- Consolidates system-wide analytics for administration overview.
CREATE OR REPLACE VIEW dashboard_executive_overview AS
WITH student_stats AS (
    SELECT COUNT(*) AS total_students FROM students
),
lecturer_stats AS (
    SELECT COUNT(*) AS total_faculty FROM lecturers
),
attendance_stats AS (
    SELECT COALESCE(AVG(attendance_rate), 0) AS daily_attendance_rate FROM student_attendance
),
finance_stats AS (
    SELECT 
        COALESCE(SUM(amount), 0) AS total_invoiced,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS total_collected
    FROM invoices
)
SELECT 
    COALESCE(st.total_students, 0) AS total_students,
    COALESCE(le.total_faculty, 0) AS total_faculty,
    ROUND(COALESCE(att.daily_attendance_rate, 0.00), 2) AS daily_attendance_percentage,
    ROUND(
        COALESCE(
            (fin.total_collected * 100.0) / NULLIF(fin.total_invoiced, 0),
            0.00
        ),
        2
    ) AS fees_collected_percentage
FROM student_stats st
CROSS JOIN lecturer_stats le
CROSS JOIN attendance_stats att
CROSS JOIN finance_stats fin;
