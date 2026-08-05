import React, { useState } from 'react';
import { ArrowLeft, UploadCloud, CheckCircle2 } from 'lucide-react';
import { useNotification } from './notifications';
import { Course, ApplicationDocument } from '../types';

interface ApplicationPageProps {
  courses: Course[];
  onCancel: () => void;
}

const initialDocumentState: ApplicationDocument[] = [
  { id: 'passport_photo', applicationId: '', documentType: 'passport_photo', fileName: '', mimeType: 'image/jpeg', fileUrl: '', sizeBytes: 0, createdAt: new Date().toISOString() },
  { id: 'national_id', applicationId: '', documentType: 'national_id', fileName: '', mimeType: 'image/jpeg', fileUrl: '', sizeBytes: 0, createdAt: new Date().toISOString() },
  { id: 'kcse_certificate', applicationId: '', documentType: 'kcse_certificate', fileName: '', mimeType: 'application/pdf', fileUrl: '', sizeBytes: 0, createdAt: new Date().toISOString() },
];

export default function ApplicationPage({ courses, onCancel }: ApplicationPageProps) {
  const { showSuccess, showError } = useNotification();
  const [form, setForm] = useState({
    fullName: '',
    nationalId: '',
    dateOfBirth: '',
    gender: '',
    nationality: '',
    phone: '',
    email: '',
    postalAddress: '',
    previousSchool: '',
    highestQualification: '',
    meanGrade: '',
    graduationYear: '',
    firstChoiceCourseId: '',
    secondChoiceCourseId: '',
    preferredIntake: '',
    documents: initialDocumentState,
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDocumentChange = (index: number, field: keyof ApplicationDocument, value: string) => {
    setForm((prev) => {
      const documents = [...prev.documents];
      const updated = { ...documents[index], [field]: value };
      if (field === 'fileUrl') {
        updated.fileName = value.split('/').pop() || updated.fileName;
      }
      documents[index] = updated;
      return { ...prev, documents };
    });
  };

  const validate = () => {
    if (!form.fullName || !form.nationalId || !form.dateOfBirth || !form.gender || !form.nationality || !form.phone || !form.email || !form.postalAddress || !form.previousSchool || !form.highestQualification || !form.meanGrade || !form.graduationYear || !form.firstChoiceCourseId || !form.preferredIntake) {
      showError('Application Error', 'Please complete all required fields before submitting.');
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      showError('Application Error', 'Enter a valid email address.');
      return false;
    }
    const requiredDocs = ['passport_photo', 'national_id', 'kcse_certificate'];
    if (!requiredDocs.every((type) => form.documents.some((doc) => doc.documentType === type && doc.fileUrl.trim()))) {
      showError('Application Error', 'Please provide all required documents.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSuccessMessage('');

    try {
      const payload = {
        fullName: form.fullName,
        nationalId: form.nationalId,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        nationality: form.nationality,
        phone: form.phone,
        email: form.email,
        postalAddress: form.postalAddress,
        previousSchool: form.previousSchool,
        highestQualification: form.highestQualification,
        meanGrade: form.meanGrade,
        graduationYear: Number(form.graduationYear),
        firstChoiceCourseId: form.firstChoiceCourseId,
        secondChoiceCourseId: form.secondChoiceCourseId || null,
        preferredIntake: form.preferredIntake,
        documents: form.documents.map((doc) => ({
          documentType: doc.documentType,
          fileName: doc.fileName || `${doc.documentType}.pdf`,
          mimeType: doc.mimeType,
          fileUrl: doc.fileUrl,
          sizeBytes: doc.fileUrl ? 1024 : 0,
        })),
      };

      const response = await fetch('/api/public/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        showError('Application Error', result?.error || 'Unable to submit application.');
      } else {
        setSuccessMessage(`Application submitted successfully! Your reference is ${result.applicationNo}.`);
        showSuccess('Application Submitted', 'Your application has been submitted successfully.');
        setForm((prev) => ({ ...prev, documents: initialDocumentState }));
      }
    } catch (error: any) {
      console.error('Application submission failed:', error);
      showError('Application Error', 'An unexpected error occurred while submitting your application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="p-8 lg:p-12 bg-gradient-to-br from-blue-600 via-slate-900 to-slate-900 text-white">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-blue-100 hover:text-white mb-6"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </button>
            <div className="space-y-6">
              <div>
                <span className="text-xs uppercase tracking-[0.3em] text-blue-200">Admissions Portal</span>
                <h1 className="mt-4 text-4xl font-black leading-tight">Apply Online for the Next Intake</h1>
              </div>
              <p className="text-sm text-blue-100 leading-relaxed">
                Complete one application for fast review by the admissions team. Submit your documents securely and we will notify you when your application is processed.
              </p>
              <div className="space-y-4 text-sm text-blue-100">
                <p className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-200 mt-1" /> Secure application submission with document tracking.</p>
                <p className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-200 mt-1" /> Dedicated admissions review for each intake.</p>
                <p className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-200 mt-1" /> You can apply for a second choice program too.</p>
              </div>
            </div>
          </div>

          <div className="p-8 lg:p-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">New Application</p>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Submit Your Admission Request</h2>
              </div>
              <div className="text-right text-xs text-slate-500">Fields marked * are required</div>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2 text-sm">
                  <span className="font-semibold">Full Name *</span>
                  <input value={form.fullName} onChange={(e) => handleChange('fullName', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-semibold">National ID *</span>
                  <input value={form.nationalId} onChange={(e) => handleChange('nationalId', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="space-y-2 text-sm">
                  <span className="font-semibold">Date of Birth *</span>
                  <input type="date" value={form.dateOfBirth} onChange={(e) => handleChange('dateOfBirth', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-semibold">Gender *</span>
                  <select value={form.gender} onChange={(e) => handleChange('gender', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-semibold">Nationality *</span>
                  <input value={form.nationality} onChange={(e) => handleChange('nationality', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2 text-sm">
                  <span className="font-semibold">Phone *</span>
                  <input value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-semibold">Email *</span>
                  <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                </label>
              </div>

              <label className="space-y-2 text-sm">
                <span className="font-semibold">Postal Address *</span>
                <textarea value={form.postalAddress} onChange={(e) => handleChange('postalAddress', e.target.value)} rows={3} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2 text-sm">
                  <span className="font-semibold">Previous School *</span>
                  <input value={form.previousSchool} onChange={(e) => handleChange('previousSchool', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-semibold">Highest Qualification *</span>
                  <input value={form.highestQualification} onChange={(e) => handleChange('highestQualification', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="space-y-2 text-sm">
                  <span className="font-semibold">Mean Grade *</span>
                  <input value={form.meanGrade} onChange={(e) => handleChange('meanGrade', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-semibold">Graduation Year *</span>
                  <input type="number" min="1900" max="2100" value={form.graduationYear} onChange={(e) => handleChange('graduationYear', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-semibold">Preferred Intake *</span>
                  <input value={form.preferredIntake} onChange={(e) => handleChange('preferredIntake', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" placeholder="e.g. January 2027" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2 text-sm">
                  <span className="font-semibold">First Choice Course *</span>
                  <select value={form.firstChoiceCourseId} onChange={(e) => handleChange('firstChoiceCourseId', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500">
                    <option value="">Choose a course</option>
                    {courses.filter((c) => c.active).map((course) => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-semibold">Second Choice Course</span>
                  <select value={form.secondChoiceCourseId} onChange={(e) => handleChange('secondChoiceCourseId', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500">
                    <option value="">Optional second choice</option>
                    {courses.filter((c) => c.active).map((course) => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                  <span>Upload Required Documents</span>
                  <span className="text-slate-500">PDF or image URLs only</span>
                </div>
                {form.documents.map((doc, index) => (
                  <div key={doc.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold capitalize">{doc.documentType.replaceAll('_', ' ')}</p>
                        <p className="text-xs text-slate-500">Enter a public link to your document file</p>
                      </div>
                      <UploadCloud className="w-5 h-5 text-blue-600" />
                    </div>
                    <input value={doc.fileUrl} onChange={(e) => handleDocumentChange(index, 'fileUrl', e.target.value)} placeholder="Document file URL" className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                  </div>
                ))}
              </div>

              {successMessage ? (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  {successMessage}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button type="button" onClick={onCancel} className="rounded-3xl border border-slate-200 bg-white text-slate-900 px-5 py-3 text-sm font-semibold transition hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="rounded-3xl bg-blue-600 text-white px-5 py-3 text-sm font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
