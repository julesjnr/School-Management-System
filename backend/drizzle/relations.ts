import { relations } from "drizzle-orm/relations";
import { courses, courseReviews, lecturers, lecturerPublications, lecturerResearchInterests, officeHourSlots, students, studentAttendance, books, loans, reservations, readingLists, bookReviews, teacherResources, grades, invoices, payments, readingListBooks, studentEnrollments } from "./schema";

export const courseReviewsRelations = relations(courseReviews, ({one}) => ({
	course: one(courses, {
		fields: [courseReviews.courseId],
		references: [courses.id]
	}),
}));

export const coursesRelations = relations(courses, ({many}) => ({
	courseReviews: many(courseReviews),
}));

export const lecturerPublicationsRelations = relations(lecturerPublications, ({one}) => ({
	lecturer: one(lecturers, {
		fields: [lecturerPublications.lecturerId],
		references: [lecturers.id]
	}),
}));

export const lecturersRelations = relations(lecturers, ({many}) => ({
	lecturerPublications: many(lecturerPublications),
	lecturerResearchInterests: many(lecturerResearchInterests),
	officeHourSlots: many(officeHourSlots),
	readingLists: many(readingLists),
	teacherResources: many(teacherResources),
}));

export const lecturerResearchInterestsRelations = relations(lecturerResearchInterests, ({one}) => ({
	lecturer: one(lecturers, {
		fields: [lecturerResearchInterests.lecturerId],
		references: [lecturers.id]
	}),
}));

export const officeHourSlotsRelations = relations(officeHourSlots, ({one}) => ({
	lecturer: one(lecturers, {
		fields: [officeHourSlots.lecturerId],
		references: [lecturers.id]
	}),
}));

export const studentAttendanceRelations = relations(studentAttendance, ({one}) => ({
	student: one(students, {
		fields: [studentAttendance.studentId],
		references: [students.id]
	}),
}));

export const studentsRelations = relations(students, ({many}) => ({
	studentAttendances: many(studentAttendance),
	bookReviews: many(bookReviews),
	grades: many(grades),
	invoices: many(invoices),
	payments: many(payments),
	studentEnrollments: many(studentEnrollments),
}));

export const loansRelations = relations(loans, ({one}) => ({
	book: one(books, {
		fields: [loans.bookId],
		references: [books.id]
	}),
}));

export const booksRelations = relations(books, ({many}) => ({
	loans: many(loans),
	reservations: many(reservations),
	bookReviews: many(bookReviews),
	readingListBooks: many(readingListBooks),
}));

export const reservationsRelations = relations(reservations, ({one}) => ({
	book: one(books, {
		fields: [reservations.bookId],
		references: [books.id]
	}),
}));

export const readingListsRelations = relations(readingLists, ({one, many}) => ({
	lecturer: one(lecturers, {
		fields: [readingLists.lecturerId],
		references: [lecturers.id]
	}),
	readingListBooks: many(readingListBooks),
}));

export const bookReviewsRelations = relations(bookReviews, ({one}) => ({
	book: one(books, {
		fields: [bookReviews.bookId],
		references: [books.id]
	}),
	student: one(students, {
		fields: [bookReviews.studentId],
		references: [students.id]
	}),
}));

export const teacherResourcesRelations = relations(teacherResources, ({one}) => ({
	lecturer: one(lecturers, {
		fields: [teacherResources.reservedByLecturerId],
		references: [lecturers.id]
	}),
}));

export const gradesRelations = relations(grades, ({one}) => ({
	student: one(students, {
		fields: [grades.studentId],
		references: [students.id]
	}),
}));

export const invoicesRelations = relations(invoices, ({one, many}) => ({
	student: one(students, {
		fields: [invoices.studentId],
		references: [students.id]
	}),
	payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	invoice: one(invoices, {
		fields: [payments.invoiceId],
		references: [invoices.id]
	}),
	student: one(students, {
		fields: [payments.studentId],
		references: [students.id]
	}),
}));

export const readingListBooksRelations = relations(readingListBooks, ({one}) => ({
	book: one(books, {
		fields: [readingListBooks.bookId],
		references: [books.id]
	}),
	readingList: one(readingLists, {
		fields: [readingListBooks.readingListId],
		references: [readingLists.id]
	}),
}));

export const studentEnrollmentsRelations = relations(studentEnrollments, ({one}) => ({
	student: one(students, {
		fields: [studentEnrollments.studentId],
		references: [students.id]
	}),
}));