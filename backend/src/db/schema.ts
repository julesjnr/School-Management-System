import { pgTable, index, unique, check, uuid, varchar, text, numeric, boolean, foreignKey, integer, date, serial, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const courses = pgTable("courses", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	code: varchar({ length: 30 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	duration: varchar({ length: 50 }).notNull(),
	fees: numeric({ precision: 12, scale:  2 }).default('0.00').notNull(),
	thumbnail: text(),
	faculty: varchar({ length: 100 }).notNull(),
	active: boolean().default(true).notNull(),
}, (table) => [
	index("idx_courses_code").using("btree", table.code.asc().nullsLast().op("text_ops")),
	unique("courses_code_key").on(table.code),
	check("courses_fees_check", sql`fees >= (0)::numeric`),
]);

export const courseReviews = pgTable("course_reviews", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	courseId: uuid("course_id"),
	studentId: uuid("student_id").notNull(),
	studentName: varchar("student_name", { length: 255 }).notNull(),
	rating: integer().notNull(),
	comment: text(),
	date: date().default(sql`CURRENT_DATE`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "course_reviews_course_id_fkey"
		}).onDelete("cascade"),
	check("course_reviews_rating_check", sql`(rating >= 1) AND (rating <= 5)`),
]);

export const lecturerPublications = pgTable("lecturer_publications", {
	id: serial().primaryKey().notNull(),
	lecturerId: uuid("lecturer_id").notNull(),
	publicationText: text("publication_text").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.lecturerId],
			foreignColumns: [lecturers.id],
			name: "lecturer_publications_lecturer_id_fkey"
		}).onDelete("cascade"),
]);

export const lecturerResearchInterests = pgTable("lecturer_research_interests", {
	id: serial().primaryKey().notNull(),
	lecturerId: uuid("lecturer_id").notNull(),
	interestText: text("interest_text").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.lecturerId],
			foreignColumns: [lecturers.id],
			name: "lecturer_research_interests_lecturer_id_fkey"
		}).onDelete("cascade"),
]);

export const officeHourSlots = pgTable("office_hour_slots", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	lecturerId: uuid("lecturer_id").notNull(),
	day: varchar({ length: 30 }).notNull(),
	timeSlot: varchar("time_slot", { length: 100 }).notNull(),
	status: varchar({ length: 20 }).default('available').notNull(),
	studentId: uuid("student_id"),
	studentName: varchar("student_name", { length: 255 }),
	studentEmail: varchar("student_email", { length: 255 }),
	studentNotes: text("student_notes"),
}, (table) => [
	foreignKey({
			columns: [table.lecturerId],
			foreignColumns: [lecturers.id],
			name: "office_hour_slots_lecturer_id_fkey"
		}).onDelete("cascade"),
	check("office_hour_slots_status_check", sql`(status)::text = ANY ((ARRAY['available'::character varying, 'booked'::character varying])::text[])`),
]);

export const studentAttendance = pgTable("student_attendance", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	studentId: uuid("student_id").notNull(),
	subjectCode: varchar("subject_code", { length: 30 }).notNull(),
	attendanceRate: integer("attendance_rate").default(100).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "student_attendance_student_id_fkey"
		}).onDelete("cascade"),
	unique("uq_student_subject_attendance").on(table.studentId, table.subjectCode),
	check("student_attendance_attendance_rate_check", sql`(attendance_rate >= 0) AND (attendance_rate <= 100)`),
]);

export const expenses = pgTable("expenses", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	description: text().notNull(),
	category: varchar({ length: 100 }).notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	date: date().notNull(),
}, (table) => [
	check("expenses_amount_check", sql`amount >= (0)::numeric`),
]);

export const stockItems = pgTable("stock_items", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	quantity: integer().notNull(),
	category: varchar({ length: 100 }).notNull(),
	location: varchar({ length: 100 }).notNull(),
	lowestThreshold: integer("lowest_threshold").default(5).notNull(),
}, (table) => [
	check("stock_items_lowest_threshold_check", sql`lowest_threshold >= 0`),
	check("stock_items_quantity_check", sql`quantity >= 0`),
]);

export const requisitions = pgTable("requisitions", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	itemName: varchar("item_name", { length: 255 }).notNull(),
	quantity: integer().notNull(),
	staffName: varchar("staff_name", { length: 255 }).notNull(),
	date: date().notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
}, (table) => [
	check("requisitions_quantity_check", sql`quantity > 0`),
	check("requisitions_status_check", sql`(status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])`),
]);

export const testimonies = pgTable("testimonies", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	avatar: text(),
});

export const books = pgTable("books", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	author: varchar({ length: 255 }).notNull(),
	isbn: varchar({ length: 50 }).notNull(),
	publisher: varchar({ length: 100 }),
	edition: varchar({ length: 50 }),
	purchasePrice: numeric("purchase_price", { precision: 10, scale:  2 }).default('0.00').notNull(),
	rackNumber: varchar("rack_number", { length: 50 }).notNull(),
	shelfRow: varchar("shelf_row", { length: 50 }).notNull(),
	libraryCode: varchar("library_code", { length: 50 }).notNull(),
	type: varchar({ length: 20 }).default('Physical Book').notNull(),
	eUrl: text("e_url"),
	copiesTotal: integer("copies_total").notNull(),
	copiesAvailable: integer("copies_available").notNull(),
	category: varchar({ length: 100 }).notNull(),
}, (table) => [
	index("idx_books_isbn").using("btree", table.isbn.asc().nullsLast().op("text_ops")),
	unique("books_isbn_key").on(table.isbn),
	unique("books_library_code_key").on(table.libraryCode),
	check("books_copies_available_check", sql`copies_available >= 0`),
	check("books_copies_total_check", sql`copies_total >= 0`),
	check("books_type_check", sql`(type)::text = ANY ((ARRAY['Physical Book'::character varying, 'E-Book'::character varying])::text[])`),
	check("check_copies", sql`copies_available <= copies_total`),
]);

export const loans = pgTable("loans", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	bookId: uuid("book_id").notNull(),
	bookTitle: varchar("book_title", { length: 255 }).notNull(),
	patronId: uuid("patron_id").notNull(),
	patronName: varchar("patron_name", { length: 255 }).notNull(),
	patronRole: varchar("patron_role", { length: 20 }).notNull(),
	checkoutDate: date("checkout_date").notNull(),
	dueDate: date("due_date").notNull(),
	returnDate: date("return_date"),
	status: varchar({ length: 20 }).default('borrowed').notNull(),
	lateFeeAssessed: numeric("late_fee_assessed", { precision: 10, scale:  2 }).default('0.00').notNull(),
}, (table) => [
	index("idx_loans_patron").using("btree", table.patronId.asc().nullsLast().op("uuid_ops")),
	index("idx_loans_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.bookId],
			foreignColumns: [books.id],
			name: "loans_book_id_fkey"
		}).onDelete("cascade"),
	check("check_dates", sql`due_date >= checkout_date`),
	check("loans_late_fee_assessed_check", sql`late_fee_assessed >= 0.00`),
	check("loans_patron_role_check", sql`(patron_role)::text = ANY ((ARRAY['student'::character varying, 'lecturer'::character varying])::text[])`),
	check("loans_status_check", sql`(status)::text = ANY ((ARRAY['borrowed'::character varying, 'returned'::character varying, 'overdue'::character varying, 'lost'::character varying, 'damaged'::character varying])::text[])`),
]);

export const reservations = pgTable("reservations", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	bookId: uuid("book_id").notNull(),
	bookTitle: varchar("book_title", { length: 255 }).notNull(),
	patronId: uuid("patron_id").notNull(),
	patronName: varchar("patron_name", { length: 255 }).notNull(),
	reservationDate: date("reservation_date").default(sql`CURRENT_DATE`).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.bookId],
			foreignColumns: [books.id],
			name: "reservations_book_id_fkey"
		}).onDelete("cascade"),
	check("reservations_status_check", sql`(status)::text = ANY ((ARRAY['pending'::character varying, 'fulfilled'::character varying, 'cancelled'::character varying])::text[])`),
]);

export const readingLists = pgTable("reading_lists", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	subjectCode: varchar("subject_code", { length: 30 }).notNull(),
	lecturerId: uuid("lecturer_id").notNull(),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.lecturerId],
			foreignColumns: [lecturers.id],
			name: "reading_lists_lecturer_id_fkey"
		}).onDelete("cascade"),
]);

export const bookReviews = pgTable("book_reviews", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	bookId: uuid("book_id").notNull(),
	studentId: uuid("student_id").notNull(),
	studentName: varchar("student_name", { length: 255 }).notNull(),
	rating: integer().notNull(),
	comment: text(),
	date: date().default(sql`CURRENT_DATE`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.bookId],
			foreignColumns: [books.id],
			name: "book_reviews_book_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "book_reviews_student_id_fkey"
		}).onDelete("cascade"),
	check("book_reviews_rating_check", sql`(rating >= 1) AND (rating <= 5)`),
]);

export const bookRequests = pgTable("book_requests", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	author: varchar({ length: 255 }).notNull(),
	isbn: varchar({ length: 50 }),
	suggestedBy: varchar("suggested_by", { length: 255 }).notNull(),
	suggestorRole: varchar("suggestor_role", { length: 20 }).notNull(),
	date: date().default(sql`CURRENT_DATE`).notNull(),
	reason: text(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	adminFeedback: text("admin_feedback"),
}, (table) => [
	check("book_requests_status_check", sql`(status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])`),
	check("book_requests_suggestor_role_check", sql`(suggestor_role)::text = ANY ((ARRAY['student'::character varying, 'lecturer'::character varying])::text[])`),
]);

export const examPapers = pgTable("exam_papers", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	subjectCode: varchar("subject_code", { length: 30 }).notNull(),
	year: integer().notNull(),
	semester: varchar({ length: 50 }).notNull(),
	examType: varchar("exam_type", { length: 50 }).notNull(),
	downloadUrl: text("download_url").notNull(),
	downloadsCount: integer("downloads_count").default(0).notNull(),
}, (table) => [
	check("exam_papers_exam_type_check", sql`(exam_type)::text = ANY ((ARRAY['Midterm'::character varying, 'Final'::character varying, 'National Exam (KCSE/IGCSE)'::character varying])::text[])`),
]);

export const teacherResources = pgTable("teacher_resources", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	category: varchar({ length: 100 }).notNull(),
	serialNo: varchar("serial_no", { length: 100 }).notNull(),
	status: varchar({ length: 20 }).default('available').notNull(),
	reservedByLecturerId: uuid("reserved_by_lecturer_id"),
	reservedByLecturerName: varchar("reserved_by_lecturer_name", { length: 255 }),
	reservationDate: date("reservation_date"),
}, (table) => [
	foreignKey({
			columns: [table.reservedByLecturerId],
			foreignColumns: [lecturers.id],
			name: "teacher_resources_reserved_by_lecturer_id_fkey"
		}).onDelete("set null"),
	unique("teacher_resources_serial_no_key").on(table.serialNo),
	check("teacher_resources_category_check", sql`(category)::text = ANY ((ARRAY['Instructional Guide'::character varying, 'Lab Manual'::character varying, 'Hardware/Projector'::character varying, 'Scientific Kit'::character varying])::text[])`),
	check("teacher_resources_status_check", sql`(status)::text = ANY ((ARRAY['available'::character varying, 'reserved'::character varying])::text[])`),
]);

export const libraryGateLogs = pgTable("library_gate_logs", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	patronName: varchar("patron_name", { length: 255 }).notNull(),
	patronId: uuid("patron_id").notNull(),
	role: varchar({ length: 20 }).notNull(),
	authMethod: varchar("auth_method", { length: 50 }).notNull(),
	gateAction: varchar("gate_action", { length: 20 }).notNull(),
	status: varchar({ length: 20 }).default('success').notNull(),
	reason: text(),
}, (table) => [
	index("idx_gate_logs_timestamp").using("btree", table.timestamp.asc().nullsLast().op("timestamptz_ops")),
	check("library_gate_logs_auth_method_check", sql`(auth_method)::text = ANY ((ARRAY['biometric_fingerprint'::character varying, 'biometric_facial'::character varying, 'rfid_tap'::character varying])::text[])`),
	check("library_gate_logs_gate_action_check", sql`(gate_action)::text = ANY ((ARRAY['Entry'::character varying, 'Exit'::character varying])::text[])`),
	check("library_gate_logs_role_check", sql`(role)::text = ANY ((ARRAY['student'::character varying, 'lecturer'::character varying])::text[])`),
	check("library_gate_logs_status_check", sql`(status)::text = ANY ((ARRAY['success'::character varying, 'denied'::character varying])::text[])`),
]);

export const notifications = pgTable("notifications", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	targetUserId: uuid("target_user_id"),
	targetUserRole: varchar("target_user_role", { length: 20 }).notNull(),
	type: varchar({ length: 30 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	message: text().notNull(),
	status: varchar({ length: 20 }).default('unread').notNull(),
	dateTime: timestamp("date_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_notifications_target").using("btree", table.targetUserId.asc().nullsLast().op("text_ops"), table.targetUserRole.asc().nullsLast().op("text_ops")),
	check("notifications_status_check", sql`(status)::text = ANY ((ARRAY['unread'::character varying, 'read'::character varying])::text[])`),
	check("notifications_target_user_role_check", sql`(target_user_role)::text = ANY ((ARRAY['student'::character varying, 'lecturer'::character varying, 'accountant'::character varying, 'librarian'::character varying, 'admin'::character varying, 'all'::character varying])::text[])`),
	check("notifications_type_check", sql`(type)::text = ANY ((ARRAY['library'::character varying, 'payment'::character varying, 'announcement'::character varying])::text[])`),
]);

export const mockEmails = pgTable("mock_emails", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	recipientTo: varchar("recipient_to", { length: 255 }).notNull(),
	subject: varchar({ length: 255 }).notNull(),
	body: text().notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	type: varchar({ length: 30 }).notNull(),
	recipientName: varchar("recipient_name", { length: 255 }).notNull(),
}, (table) => [
	check("mock_emails_type_check", sql`(type)::text = ANY ((ARRAY['invoice'::character varying, 'book_due'::character varying, 'grade_posted'::character varying])::text[])`),
]);

export const passwordResetRequests = pgTable("password_reset_requests", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 20 }).notNull(),
	date: date().default(sql`CURRENT_DATE`).notNull(),
	reason: text().notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	adminFeedback: text("admin_feedback"),
	temporaryPasscode: varchar("temporary_passcode", { length: 50 }),
}, (table) => [
	check("password_reset_requests_role_check", sql`(role)::text = ANY ((ARRAY['student'::character varying, 'lecturer'::character varying, 'accountant'::character varying, 'librarian'::character varying, 'admin'::character varying])::text[])`),
	check("password_reset_requests_status_check", sql`(status)::text = ANY ((ARRAY['pending'::character varying, 'resolved'::character varying, 'rejected'::character varying])::text[])`),
]);

export const students = pgTable("students", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	phone: varchar({ length: 30 }).notNull(),
	admissionNo: varchar("admission_no", { length: 50 }).notNull(),
	cohort: varchar({ length: 50 }).notNull(),
	avatar: text(),
	passcode: varchar({ length: 100 }).default('student123').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_students_admission").using("btree", table.admissionNo.asc().nullsLast().op("text_ops")),
	index("idx_students_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	unique("students_email_key").on(table.email),
	unique("students_admission_no_key").on(table.admissionNo),
	check("students_email_check", sql`(email)::text ~~ '%@%.%'::text`),
]);

export const lecturers = pgTable("lecturers", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	phone: varchar({ length: 30 }).notNull(),
	hourlyRate: numeric("hourly_rate", { precision: 10, scale:  2 }).default('0.00').notNull(),
	loggedHours: numeric("logged_hours", { precision: 6, scale:  2 }).default('0.00').notNull(),
	bankDetails: text("bank_details"),
	contractLength: varchar("contract_length", { length: 100 }).notNull(),
	designatorCode: varchar("designator_code", { length: 50 }).notNull(),
	bio: text(),
	avatar: text(),
	isActive: boolean("is_active").default(true).notNull(),
	isAccountant: boolean("is_accountant").default(false).notNull(),
	isLibrarian: boolean("is_librarian").default(false).notNull(),
	passcode: varchar({ length: 100 }).default('lecturer123').notNull(),
}, (table) => [
	index("idx_lecturers_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	unique("lecturers_email_key").on(table.email),
	unique("lecturers_designator_code_key").on(table.designatorCode),
	check("lecturers_email_check", sql`(email)::text ~~ '%@%.%'::text`),
	check("lecturers_hourly_rate_check", sql`hourly_rate >= (0)::numeric`),
	check("lecturers_logged_hours_check", sql`logged_hours >= (0)::numeric`),
]);
//-- lectures subjects table to link lecturers and subjects (courses)
export const lecturerSubjects = pgTable("lecturer_subjects", {
  id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),

  lecturerId: uuid("lecturer_id")
    .notNull()
    .references(() => lecturers.id, { onDelete: "cascade" }),

  subjectCode: varchar("subject_code", { length: 30 })
    .notNull()
    .references(() => courses.code),
});

//--grade table to link students and their grades for subjects
export const grades = pgTable("grades", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	studentId: uuid("student_id").notNull(),
	subjectCode: varchar("subject_code", { length: 30 }).notNull(),
	catScore: numeric("cat_score", { precision: 5, scale:  2 }).default('0.00').notNull(),
	examScore: numeric("exam_score", { precision: 5, scale:  2 }).default('0.00').notNull(),
	gradedAt: timestamp("graded_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_grades_student").using("btree", table.studentId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "grades_student_id_fkey"
		}).onDelete("cascade"),
	unique("uq_student_subject").on(table.studentId, table.subjectCode),
	check("grades_cat_score_check", sql`(cat_score >= 0.00) AND (cat_score <= 30.00)`),
	check("grades_exam_score_check", sql`(exam_score >= 0.00) AND (exam_score <= 70.00)`),
]);

export const invoices = pgTable("invoices", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	studentId: uuid("student_id").notNull(),
	invoiceNo: varchar("invoice_no", { length: 50 }).notNull(),
	description: text().notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	date: date().notNull(),
	status: varchar({ length: 20 }).default('unpaid').notNull(),
}, (table) => [
	index("idx_invoices_student").using("btree", table.studentId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "invoices_student_id_fkey"
		}).onDelete("cascade"),
	unique("invoices_invoice_no_key").on(table.invoiceNo),
	check("invoices_amount_check", sql`amount >= (0)::numeric`),
	check("invoices_status_check", sql`(status)::text = ANY ((ARRAY['unpaid'::character varying, 'paid'::character varying])::text[])`),
]);

export const payments = pgTable("payments", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	studentId: uuid("student_id").notNull(),
	invoiceId: uuid("invoice_id"),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	paymentMethod: varchar("payment_method", { length: 30 }).notNull(),
	transactionId: varchar("transaction_id", { length: 100 }).notNull(),
	date: date().notNull(),
	status: varchar({ length: 20 }).default('unreconciled').notNull(),
}, (table) => [
	index("idx_payments_student").using("btree", table.studentId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "payments_invoice_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "payments_student_id_fkey"
		}).onDelete("cascade"),
	unique("payments_transaction_id_key").on(table.transactionId),
	check("payments_amount_check", sql`amount > (0)::numeric`),
	check("payments_payment_method_check", sql`(payment_method)::text = ANY ((ARRAY['M-Pesa'::character varying, 'Bank Transfer'::character varying, 'Card'::character varying])::text[])`),
	check("payments_status_check", sql`(status)::text = ANY ((ARRAY['unreconciled'::character varying, 'reconciled'::character varying])::text[])`),
]);

export const systemState = pgTable("system_state", {
	id: serial().primaryKey().notNull(),
	data: jsonb().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	uid: text().notNull(),
	email: text().notNull(),
	role: text().default('student'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_uid_key").on(table.uid),
]);

export const readingListBooks = pgTable("reading_list_books", {
	readingListId: uuid("reading_list_id").notNull(),
	bookId: uuid("book_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.bookId],
			foreignColumns: [books.id],
			name: "reading_list_books_book_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.readingListId],
			foreignColumns: [readingLists.id],
			name: "reading_list_books_reading_list_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.readingListId, table.bookId], name: "reading_list_books_pkey"}),
]);

export const studentEnrollments = pgTable("student_enrollments", {
	studentId: uuid("student_id").notNull(),
	courseCode: varchar("course_code", { length: 30 }).notNull(),
	enrolledAt: timestamp("enrolled_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "student_enrollments_student_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.studentId, table.courseCode], name: "student_enrollments_pkey"}),
]);

