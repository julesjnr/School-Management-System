import React, { useState } from 'react';
import { 
  ArrowLeft, Calendar, Clock, User, Mail, Phone, BookOpen, 
  MessageSquare, CheckCircle2, Copy, Printer, Video, MapPin, 
  Sparkles, ShieldCheck, HelpCircle
} from 'lucide-react';
import { Course } from '../types';
import { useNotification } from './notifications';

interface ConsultationBookingPageProps {
  courses: Course[];
  onCancel: () => void;
  onNavigateHome?: () => void;
}

const timeSlots = [
  '09:00 AM',
  '10:30 AM',
  '11:45 AM',
  '02:00 PM',
  '03:30 PM',
  '04:30 PM',
];

export default function ConsultationBookingPage({
  courses,
  onCancel,
  onNavigateHome,
}: ConsultationBookingPageProps) {
  const { showSuccess, showError } = useNotification();
  
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    courseId: '',
    courseName: '',
    preferredContactMethod: 'phone' as 'phone' | 'email' | 'physical' | 'online',
    consultationType: 'phone' as 'phone' | 'email' | 'physical' | 'online',
    preferredDate: '',
    preferredTime: '10:30 AM',
    customTime: '',
    subject: '',
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    requestNo: string;
    status: string;
    submittedAt: string;
  } | null>(null);

  // Min date set to today
  const todayStr = new Date().toISOString().split('T')[0];

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCourseChange = (courseId: string) => {
    if (!courseId) {
      setForm((prev) => ({ ...prev, courseId: '', courseName: 'General Admissions Consultation' }));
      return;
    }
    const found = courses.find((c) => c.id === courseId);
    setForm((prev) => ({
      ...prev,
      courseId,
      courseName: found ? found.title : '',
    }));
  };

  const validateForm = () => {
    if (!form.fullName.trim()) {
      showError('Validation Error', 'Please enter your full name.');
      return false;
    }
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      showError('Validation Error', 'Please enter a valid email address.');
      return false;
    }
    if (!form.phone.trim()) {
      showError('Validation Error', 'Please enter your phone number.');
      return false;
    }
    if (!form.subject.trim()) {
      showError('Validation Error', 'Please enter a subject for your consultation request.');
      return false;
    }
    if (!form.message.trim()) {
      showError('Validation Error', 'Please write a brief question or message for our admissions team.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const selectedTime = form.preferredTime === 'custom' ? form.customTime : form.preferredTime;

    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        courseId: form.courseId || null,
        courseName: form.courseName || 'General Admissions Consultation',
        preferredContactMethod: form.preferredContactMethod || form.consultationType,
        consultationType: form.preferredContactMethod || form.consultationType,
        preferredDate: form.preferredDate ? form.preferredDate : null,
        preferredTime: selectedTime || null,
        subject: form.subject.trim(),
        message: form.message.trim(),
      };

      const response = await fetch('/api/public/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        showError('Booking Error', result?.error || 'Unable to submit consultation request.');
      } else {
        setBookingResult({
          requestNo: result.requestNo || 'CON-2026-PENDING',
          status: result.status || 'pending',
          submittedAt: new Date().toISOString(),
        });
        setShowSuccessModal(true);
        showSuccess('Consultation Booked', `Reference ${result.requestNo} generated successfully.`);
      }
    } catch (err: any) {
      console.error('Consultation booking error:', err);
      showError('Booking Error', 'An unexpected error occurred while booking your consultation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyReference = () => {
    if (!bookingResult?.requestNo) return;
    navigator.clipboard.writeText(bookingResult.requestNo);
    setCopied(true);
    showSuccess('Copied to Clipboard', `Reference ${bookingResult.requestNo} copied.`);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
          <div className="text-xs font-semibold text-slate-500">
            Admissions Counseling & Guidance Portal
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-8 sm:p-10 border border-slate-800 shadow-2xl">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-500/40 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-300">
              <Sparkles className="w-4 h-4 text-blue-400" /> One-on-One Admissions Consultation
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Book an Academic Consultation
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Schedule a personalized consultation session with our admissions counselors. Get expert advice on degree programs, entry requirements, fee structures, and campus life.
            </p>
          </div>
        </div>

        {/* Booking Form Card */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Step 1: Personal Contact Details */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" /> 1. Your Contact Information
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Where can our counselor reach you?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2 text-sm font-semibold">
                  <span className="text-slate-800 dark:text-slate-200">Full Name *</span>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      placeholder="e.g. Jane Wanjiku Kamau"
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 pl-11 pr-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </label>

                <label className="space-y-2 text-sm font-semibold">
                  <span className="text-slate-800 dark:text-slate-200">Email Address *</span>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="e.g. jane.wanjiku@gmail.com"
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 pl-11 pr-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </label>

                <label className="space-y-2 text-sm font-semibold md:col-span-2">
                  <span className="text-slate-800 dark:text-slate-200">Phone Number *</span>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="e.g. +254 712 345 678"
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 pl-11 pr-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </label>
              </div>
            </div>

            {/* Step 2: Course & Mode Selection */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" /> 2. Program & Preferred Contact Method
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Select your course interest and preferred contact method</p>
              </div>

              <div className="space-y-4">
                <label className="space-y-2 text-sm font-semibold block">
                  <span className="text-slate-800 dark:text-slate-200">Interested Course</span>
                  <select
                    value={form.courseId}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                  >
                    <option value="">General Admissions / Not Sure Yet</option>
                    {courses.filter((c) => c.active).map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title} ({course.department})
                      </option>
                    ))}
                  </select>
                </label>

                {/* Preferred Contact Method Selector Cards */}
                <div className="space-y-2">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">Preferred Contact Method *</span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">

                    <button
                      type="button"
                      onClick={() => {
                        handleChange('preferredContactMethod', 'phone');
                        handleChange('consultationType', 'phone');
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 ${
                        (form.preferredContactMethod || form.consultationType) === 'phone'
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <Phone className={`w-5 h-5 mt-0.5 ${(form.preferredContactMethod || form.consultationType) === 'phone' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div>
                        <p className="text-sm font-bold">Phone Call</p>
                        <p className="text-xs opacity-75 mt-0.5">Direct phone call</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleChange('preferredContactMethod', 'email');
                        handleChange('consultationType', 'email');
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 ${
                        (form.preferredContactMethod || form.consultationType) === 'email'
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <Mail className={`w-5 h-5 mt-0.5 ${(form.preferredContactMethod || form.consultationType) === 'email' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div>
                        <p className="text-sm font-bold">Email Response</p>
                        <p className="text-xs opacity-75 mt-0.5">Detailed email reply</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleChange('preferredContactMethod', 'physical');
                        handleChange('consultationType', 'physical');
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 ${
                        (form.preferredContactMethod || form.consultationType) === 'physical'
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <MapPin className={`w-5 h-5 mt-0.5 ${(form.preferredContactMethod || form.consultationType) === 'physical' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div>
                        <p className="text-sm font-bold">Physical Visit</p>
                        <p className="text-xs opacity-75 mt-0.5">Campus appointment</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleChange('preferredContactMethod', 'online');
                        handleChange('consultationType', 'online');
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 ${
                        (form.preferredContactMethod || form.consultationType) === 'online'
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <Video className={`w-5 h-5 mt-0.5 ${(form.preferredContactMethod || form.consultationType) === 'online' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div>
                        <p className="text-sm font-bold">Video Call</p>
                        <p className="text-xs opacity-75 mt-0.5">Virtual Meet / Zoom</p>
                      </div>
                    </button>

                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Date & Time Schedule (Optional) */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" /> 3. Schedule Preference
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Optional preferred date and time slot</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2 text-sm font-semibold">
                  <span className="text-slate-800 dark:text-slate-200">Preferred Consultation Date (optional)</span>
                  <input
                    type="date"
                    min={todayStr}
                    value={form.preferredDate}
                    onChange={(e) => handleChange('preferredDate', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                  />
                </label>

                <div className="space-y-2">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">Preferred Time Slot</span>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => handleChange('preferredTime', slot)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                          form.preferredTime === slot
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Subject & Message */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" /> 4. Subject & Inquiry Message
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Let us know what specific information or guidance you need</p>
              </div>

              <label className="space-y-2 text-sm font-semibold block">
                <span className="text-slate-800 dark:text-slate-200">Subject *</span>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => handleChange('subject', e.target.value)}
                  placeholder="e.g. Admission Requirements for Software Engineering"
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </label>

              <label className="space-y-2 text-sm font-semibold block">
                <span className="text-slate-800 dark:text-slate-200">Message *</span>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  placeholder="e.g. I am interested in Bachelor of Science in Software Engineering. I would like to know the fee structure for regular intake and entry requirements for KCSE graduates."
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </label>
            </div>

            {/* Submit Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onCancel}
                className="w-full sm:w-auto rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 text-sm font-bold transition shadow-lg shadow-blue-500/30 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Booking Consultation...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Book Consultation</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

      </div>

      {/* Success Modal */}
      {showSuccessModal && bookingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                Consultation Booked!
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Your consultation request has been submitted to the admissions counseling board.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 space-y-2 text-left">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Consultation Reference</span>
                <span className="text-sm font-mono font-black text-blue-600 dark:text-blue-400">
                  {bookingResult.requestNo}
                </span>
              </div>
              <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300 pt-1">
                <p><strong>Applicant:</strong> {form.fullName}</p>
                <p><strong>Course:</strong> {form.courseName || 'General Inquiry'}</p>
                <p><strong>Schedule:</strong> {form.preferredDate} at {form.preferredTime === 'custom' ? form.customTime : form.preferredTime}</p>
                <p><strong>Mode:</strong> <span className="capitalize font-semibold text-blue-600">{form.consultationType}</span></p>
                <p><strong>Status:</strong> <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">{bookingResult.status}</span></p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleCopyReference}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-3 px-4 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition"
              >
                <Copy className="w-4 h-4 text-blue-600" />
                {copied ? 'Reference Copied!' : 'Copy Reference Number'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  if (onNavigateHome) onNavigateHome();
                  else onCancel();
                }}
                className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-6 font-bold text-sm transition shadow-lg shadow-blue-500/30"
              >
                Return to Portal Home
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
