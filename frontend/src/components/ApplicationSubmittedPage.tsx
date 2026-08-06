import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, Copy, Printer, ArrowLeft, Clock, ShieldCheck, 
  FileText, ExternalLink, Sparkles, BookOpen, User, Mail, Phone, Calendar, Search, 
  Eye, Download, GraduationCap, Building2, MapPin, Award, Check, AlertCircle, FileCheck, Layers, Landmark
} from 'lucide-react';
import { Course, ApplicationDocument } from '../types';
import { useNotification } from './notifications';

interface SubmittedApplicationData {
  applicationNo: string;
  submittedAt: string;
  status: string;
  fullName?: string;
  gender?: string;
  dateOfBirth?: string;
  nationalId?: string;
  email?: string;
  phone?: string;
  nationality?: string;
  county?: string;
  postalAddress?: string;
  kcseGrade?: string;
  kcseYear?: string | number;
  formerSchool?: string;
  highestQualification?: string;
  firstChoiceCourseTitle?: string;
  secondChoiceCourseTitle?: string;
  preferredIntake?: string;
  campus?: string;
  studyMode?: string;
  admissionNo?: string | null;
  documents: ApplicationDocument[];
}

interface ApplicationSubmittedPageProps {
  courses?: Course[];
  submittedData?: SubmittedApplicationData | null;
  onNavigateHome: () => void;
  onApplyNew: () => void;
}

const formatSubmittedDate = (isoString?: string) => {
  if (!isoString) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

const formatFileSize = (bytes?: number) => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function ApplicationSubmittedPage({
  courses,
  submittedData: propData,
  onNavigateHome,
  onApplyNew,
}: ApplicationSubmittedPageProps) {
  const { showSuccess, showError } = useNotification();
  const [data, setData] = useState<SubmittedApplicationData | null>(propData || null);
  const [loading, setLoading] = useState<boolean>(!propData);
  const [copied, setCopied] = useState(false);
  const [searchRef, setSearchRef] = useState('');

  useEffect(() => {
    if (propData) {
      setData(propData);
      setLoading(false);
      return;
    }

    // Try loading from URL parameter ?ref=
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref');

    if (refParam) {
      fetchApplicationByRef(refParam);
      return;
    }

    // Try loading from sessionStorage
    try {
      const stored = sessionStorage.getItem('zenti_last_submitted_application');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.applicationNo) {
          setData(parsed);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Ignore parse errors
    }

    setLoading(false);
  }, [propData]);

  const fetchApplicationByRef = async (ref: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/public/applications/reference/${encodeURIComponent(ref)}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        showError('Lookup Error', `No application found for reference: ${ref}`);
      }
    } catch (err) {
      showError('Lookup Error', 'Unable to retrieve application details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReference = () => {
    if (!data?.applicationNo) return;
    navigator.clipboard.writeText(data.applicationNo);
    setCopied(true);
    showSuccess('Copied to Clipboard', `Reference ${data.applicationNo} copied.`);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadReceiptPDF = () => {
    showSuccess('Download Receipt', 'Generating PDF Application Receipt for printing/downloading...');
    window.print();
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchRef.trim()) return;
    fetchApplicationByRef(searchRef.trim());
  };

  // Determine stage progression for Timeline based on DB status
  const currentStatus = (data?.status || 'submitted').toLowerCase();
  
  const getTimelineStages = () => {
    const isSubmittedStage = true; // Always true if summary exists
    let isVerificationDone = false;
    let isVerificationActive = false;
    let isReviewDone = false;
    let isReviewActive = false;
    let isDecisionDone = false;
    let isDecisionActive = false;
    let isLetterIssued = false;
    let decisionText = "Pending Review";

    if (currentStatus === 'submitted') {
      isVerificationActive = true;
    } else if (currentStatus === 'under_review' || currentStatus === 'in_review') {
      isVerificationDone = true;
      isReviewActive = true;
    } else if (currentStatus === 'additional_documents_requested') {
      isVerificationActive = true;
      decisionText = "Action Needed: Additional Docs";
    } else if (currentStatus === 'approved' || currentStatus === 'admitted') {
      isVerificationDone = true;
      isReviewDone = true;
      isDecisionDone = true;
      isLetterIssued = true;
      decisionText = "Approved";
    } else if (currentStatus === 'waitlisted') {
      isVerificationDone = true;
      isReviewDone = true;
      isDecisionActive = true;
      decisionText = "Waitlisted";
    } else if (currentStatus === 'rejected') {
      isVerificationDone = true;
      isReviewDone = true;
      isDecisionDone = true;
      decisionText = "Declined";
    }

    return [
      {
        id: 1,
        title: 'Application Submitted',
        description: 'Application & documents recorded in database',
        status: isSubmittedStage ? 'completed' : 'pending',
      },
      {
        id: 2,
        title: 'Document Verification',
        description: currentStatus === 'additional_documents_requested' ? 'Additional documents requested by officer' : 'Identity & KCSE credentials verification',
        status: isVerificationDone ? 'completed' : isVerificationActive ? 'active' : 'pending',
      },
      {
        id: 3,
        title: 'Academic Review',
        description: 'Course prerequisites & qualification evaluation',
        status: isReviewDone ? 'completed' : isReviewActive ? 'active' : 'pending',
      },
      {
        id: 4,
        title: 'Admission Decision',
        description: decisionText,
        status: isDecisionDone ? 'completed' : isDecisionActive ? 'active' : 'pending',
      },
      {
        id: 5,
        title: 'Admission Letter Issued',
        description: isLetterIssued ? 'Official admission letter & package generated' : 'Pending final decision confirmation',
        status: isLetterIssued ? 'completed' : 'pending',
      },
    ];
  };

  const timelineStages = getTimelineStages();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-400">Loading submitted application records...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-16 px-4">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Search className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold">Find Your Application Summary</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Enter your official application reference number below to view your submission details, verified documents, and status timeline.
          </p>

          <form onSubmit={handleManualSearch} className="flex gap-2 max-w-md mx-auto">
            <input
              type="text"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              placeholder="e.g. APP-2026-A1B2C3D4"
              className="flex-1 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="rounded-2xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition"
            >
              Lookup
            </button>
          </form>

          <div className="pt-6 flex justify-center gap-4">
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Home
            </button>
            <button
              type="button"
              onClick={onApplyNew}
              className="rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition"
            >
              Start New Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8 print:py-0 print:px-0 print:bg-white print:text-black">
      
      {/* Print Stylesheet Overrides */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { shadow: none !important; box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:p-0 { padding: 0 !important; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-8 print:max-w-full print:space-y-4">

        {/* Header / Navigation */}
        <div className="flex items-center justify-between print:hidden">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
            >
              <Printer className="w-4 h-4 text-slate-500" /> Print
            </button>
            <button
              type="button"
              onClick={onApplyNew}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition shadow-sm"
            >
              New Application
            </button>
          </div>
        </div>

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-8 sm:p-10 border border-slate-800 shadow-2xl print:border print:border-slate-300 print:bg-none print:text-black print:p-4">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none print:hidden" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300 print:text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 print:text-emerald-700" /> Official Application Summary
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white print:text-black">
                {data.fullName ? `${data.fullName}'s Application` : 'Application Summary'}
              </h1>
              <p className="text-slate-300 text-sm max-w-xl leading-relaxed print:text-slate-700">
                Application reference <strong className="font-mono text-blue-400 print:text-blue-800">{data.applicationNo}</strong> has been saved and linked in the institutional database.
              </p>
            </div>

            {/* Reference Badge Box */}
            <div className="rounded-3xl bg-slate-900/90 border border-slate-700/80 p-5 flex flex-col items-center justify-center text-center space-y-2 min-w-[220px] print:border-slate-400 print:bg-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 print:text-slate-700">Application Reference</span>
              <div className="text-xl sm:text-2xl font-mono font-black text-blue-400 print:text-slate-900 tracking-wider">
                {data.applicationNo}
              </div>
              <button
                type="button"
                onClick={handleCopyReference}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300 hover:text-white bg-blue-500/20 hover:bg-blue-500/30 px-3 py-1 rounded-xl transition print:hidden"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copied!' : 'Copy Reference'}
              </button>
            </div>
          </div>
        </div>

        {/* 1. EXPANDED APPLICANT INFORMATION SECTION */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Applicant Information
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Verified Record
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Full Name */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" /> Full Name
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                {data.fullName || 'N/A'}
              </p>
            </div>

            {/* Gender */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" /> Gender
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                {data.gender || 'Not specified'}
              </p>
            </div>

            {/* Date of Birth */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date of Birth
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                {data.dateOfBirth || 'N/A'}
              </p>
            </div>

            {/* National ID Number */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> National ID Number
              </span>
              <p className="mt-1 text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                {data.nationalId || 'N/A'}
              </p>
            </div>

            {/* Email */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {data.email || 'N/A'}
              </p>
            </div>

            {/* Phone Number */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                {data.phone || 'N/A'}
              </p>
            </div>

            {/* County */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> County / Nationality
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                {data.county || data.nationality || 'Nairobi'}
              </p>
            </div>

            {/* Postal Address */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800/80 md:col-span-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> Postal Address
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                {data.postalAddress || 'N/A'}
              </p>
            </div>

            {/* KCSE Grade */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-slate-400" /> KCSE Grade
              </span>
              <p className="mt-1 text-sm font-black text-blue-600 dark:text-blue-400">
                {data.kcseGrade || 'N/A'}
              </p>
            </div>

            {/* KCSE Year */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> KCSE Year
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                {data.kcseYear || new Date().getFullYear()}
              </p>
            </div>

            {/* Former School */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" /> Former School
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                {data.formerSchool || 'N/A'}
              </p>
            </div>

            {/* Selected Course */}
            <div className="rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 p-4 border border-blue-100 dark:border-blue-900/50 lg:col-span-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-blue-500" /> Selected Course (First Choice)
              </span>
              <p className="mt-1 text-base font-extrabold text-slate-900 dark:text-slate-100">
                {data.firstChoiceCourseTitle || 'Course Selected'}
              </p>
            </div>

            {/* Campus */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-slate-400" /> Campus
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                {data.campus || 'Main Campus'}
              </p>
            </div>

            {/* Intake */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" /> Preferred Intake
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                {data.preferredIntake || 'N/A'}
              </p>
            </div>

            {/* Study Mode */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-slate-400" /> Study Mode
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                {data.studyMode || 'Full-Time (Regular)'}
              </p>
            </div>

          </div>
        </div>

        {/* 2. IMPROVED UPLOADED DOCUMENTS SECTION */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Uploaded Documents ({data.documents?.length || 0})
              </h2>
              <p className="text-xs text-slate-500 mt-1">Verified files stored in database storage</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Storage Confirmed
            </span>
          </div>

          <div className="grid gap-4">
            {data.documents && data.documents.length > 0 ? (
              data.documents.map((doc: any, idx: number) => {
                const docTypeClean = (doc.documentType || doc.document_type || 'document').replaceAll('_', ' ');
                const fileName = doc.fileName || doc.file_name || 'Attached file';
                const sizeBytes = Number(doc.sizeBytes || doc.size_bytes || 0);
                const fileUrl = doc.fileUrl || doc.file_url;
                const uploadDate = doc.createdAt || doc.created_at || data.submittedAt;

                return (
                  <div
                    key={doc.id || idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-blue-200 dark:hover:border-blue-900/60 transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-3 rounded-2xl bg-blue-100/80 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold capitalize text-slate-900 dark:text-slate-100">
                          {docTypeClean}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span><strong className="font-semibold text-slate-700 dark:text-slate-300">File Name:</strong> {fileName}</span>
                          <span><strong className="font-semibold text-slate-700 dark:text-slate-300">Size:</strong> {formatFileSize(sizeBytes)}</span>
                          <span><strong className="font-semibold text-slate-700 dark:text-slate-300">Uploaded:</strong> {formatSubmittedDate(uploadDate)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 self-end sm:self-center">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 px-3.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Uploaded & Linked
                      </span>
                      
                      {fileUrl ? (
                        <div className="flex items-center gap-2 print:hidden">
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> View
                          </a>
                          <a
                            href={fileUrl}
                            download={fileName}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white transition shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500 italic p-6 text-center">No documents uploaded with this application.</p>
            )}
          </div>
        </div>

        {/* 3. DYNAMIC APPLICATION PROGRESS TIMELINE */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Application Progress Timeline
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              Current Status: <span className="font-bold capitalize text-blue-600 dark:text-blue-400">{data.status || 'Submitted'}</span>
            </span>
          </div>

          <div className="relative pt-2 pb-4">
            {/* Desktop Horizontal Line / Mobile Vertical Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
              
              {timelineStages.map((stage, idx) => {
                const isCompleted = stage.status === 'completed';
                const isActive = stage.status === 'active';

                return (
                  <div key={stage.id} className="flex md:flex-col items-start md:items-center relative gap-4 md:gap-3 text-left md:text-center">
                    
                    {/* Node circle */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0 transition-all duration-300 ${
                        isCompleted
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                          : isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-100 dark:ring-blue-900/50 animate-pulse'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : isActive ? (
                        <Clock className="w-5 h-5 text-white" />
                      ) : (
                        stage.id
                      )}
                    </div>

                    {/* Text Details */}
                    <div className="space-y-1">
                      <h4
                        className={`text-sm font-bold ${
                          isCompleted
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : isActive
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-500 dark:text-slate-500'
                        }`}
                      >
                        {stage.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                        {stage.description}
                      </p>
                      {isActive ? (
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full mt-1">
                          Current Stage
                        </span>
                      ) : null}
                    </div>

                  </div>
                );
              })}

            </div>
          </div>
        </div>

        {/* 4. THREE ACTION BUTTONS AT THE BOTTOM */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 dark:border-slate-800 print:hidden">
          <button
            type="button"
            onClick={handleDownloadReceiptPDF}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 text-sm font-bold transition shadow-lg shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" /> Download Application Receipt (PDF)
          </button>
          
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-6 py-3.5 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Printer className="w-4 h-4 text-slate-500" /> Print Application
          </button>

          <button
            type="button"
            onClick={onNavigateHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 text-sm font-bold transition shadow-lg shadow-blue-500/20"
          >
            <ArrowLeft className="w-4 h-4" /> Return Home
          </button>
        </div>

      </div>
    </div>
  );
}
