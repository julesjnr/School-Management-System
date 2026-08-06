import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, UploadCloud, CheckCircle2, XCircle, Image as ImageIcon } from 'lucide-react';
import { useNotification } from './notifications';
import { Course, ApplicationDocument } from '../types';

interface ApplicationPageProps {
  courses: Course[];
  onCancel: () => void;
  onSubmitted?: (submittedData: any) => void;
}

const gradeOptions = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E', 'O', 'P', 'F'];
const DRAFT_STORAGE_KEY = 'zenti_school_application_draft_v1';

const initialDocumentState: ApplicationDocument[] = [
  { id: 'passport_photo', applicationId: '', documentType: 'passport_photo', fileName: '', mimeType: '', fileUrl: '', sizeBytes: 0, createdAt: new Date().toISOString(), uploadStatus: 'pending', uploadProgress: 0 },
  { id: 'national_id', applicationId: '', documentType: 'national_id', fileName: '', mimeType: '', fileUrl: '', sizeBytes: 0, createdAt: new Date().toISOString(), uploadStatus: 'pending', uploadProgress: 0 },
  { id: 'kcse_certificate', applicationId: '', documentType: 'kcse_certificate', fileName: '', mimeType: '', fileUrl: '', sizeBytes: 0, createdAt: new Date().toISOString(), uploadStatus: 'pending', uploadProgress: 0 },
];

const requiredDocuments = ['passport_photo', 'national_id', 'kcse_certificate'];

const formatUploadedAt = (isoString?: string) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const formatFileSize = (bytes?: number) => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function ApplicationPage({ courses, onCancel, onSubmitted }: ApplicationPageProps) {
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
    firstChoiceCourseId: '',
    secondChoiceCourseId: '',
    preferredIntake: '',
    documents: initialDocumentState,
  });
  const fileInputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [applicationReference, setApplicationReference] = useState('');
  const [submittedData, setSubmittedData] = useState<{
    applicationNo: string;
    submittedAt: string;
    status: string;
    fullName?: string;
    email?: string;
    phone?: string;
    nationalId?: string;
    preferredIntake?: string;
    firstChoiceCourseTitle?: string;
    secondChoiceCourseTitle?: string;
    documents: ApplicationDocument[];
  } | null>(null);

  // Hydrate form draft from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && typeof parsed === 'object') {
          setForm((prev) => ({
            ...prev,
            ...parsed,
            documents: Array.isArray(parsed.documents) && parsed.documents.length === initialDocumentState.length
              ? parsed.documents.map((doc: ApplicationDocument, i: number) => {
                  const initialDoc = initialDocumentState[i];
                  const isImage = (doc.mimeType && doc.mimeType.startsWith('image/')) || /\.(jpg|jpeg|png)$/i.test(doc.fileName || '');
                  let status = doc.uploadStatus;
                  if (status === 'uploading') {
                    status = doc.fileUrl && doc.fileUrl.trim() ? 'uploaded' : 'pending';
                  }
                  return {
                    ...initialDoc,
                    ...doc,
                    uploadStatus: status || (doc.fileUrl ? 'uploaded' : 'pending'),
                    uploadProgress: doc.fileUrl ? 100 : 0,
                    previewUrl: isImage && doc.fileUrl ? doc.fileUrl : doc.previewUrl || '',
                  };
                })
              : prev.documents,
          }));
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  // Save form draft to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
    } catch {
      // Ignore quota errors
    }
  }, [form]);

  const currentTitle = useMemo(() => {
    switch (currentStep) {
      case 0:
        return 'Personal Information';
      case 1:
        return 'Academic Background';
      case 2:
        return 'Course Selection';
      case 3:
        return 'Supporting Documents';
      default:
        return 'Review & Submit';
    }
  }, [currentStep]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDocumentChange = (index: number, field: keyof ApplicationDocument, value: string) => {
    setForm((prev) => {
      const documents = [...prev.documents];
      const updated = { ...documents[index], [field]: value };
      documents[index] = updated;
      return { ...prev, documents };
    });
  };

  const validateFile = (file: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/pjpeg'];
    const isAllowedExt = /\.(pdf|jpg|jpeg|png)$/i.test(file.name);
    if (!allowedTypes.includes(file.type) && !isAllowedExt) {
      return 'Only PDF, JPG, JPEG, and PNG files are allowed.';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File size must be 10 MB or less.';
    }
    return null;
  };

  const handleFileSelect = (index: number, file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      showError('Upload Error', validationError);
      setForm((prev) => {
        const documents = [...prev.documents];
        documents[index] = {
          ...documents[index],
          uploadStatus: 'error',
          errorMessage: validationError,
          uploadProgress: 0,
          fileUrl: '',
        };
        return { ...prev, documents };
      });
      return;
    }

    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(file.name);
    const previewUrl = isImage ? URL.createObjectURL(file) : '';
    setForm((prev) => {
      const documents = [...prev.documents];
      documents[index] = {
        ...documents[index],
        fileName: file.name,
        mimeType: file.type || (isImage ? 'image/jpeg' : 'application/pdf'),
        sizeBytes: file.size,
        fileUrl: '',
        uploadStatus: 'uploading',
        uploadProgress: 0,
        previewUrl,
        errorMessage: undefined,
      };
      return { ...prev, documents };
    });

    const targetDocType = form.documents[index]?.documentType || requiredDocuments[index] || 'passport_photo';

    const formData = new FormData();
    formData.append('documentType', targetDocType);
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/public/application-documents');

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !event.total) return;
      const progress = Math.min(95, Math.round((event.loaded / event.total) * 100));
      setForm((prev) => {
        const documents = [...prev.documents];
        if (documents[index] && documents[index].uploadStatus === 'uploading') {
          documents[index] = { ...documents[index], uploadProgress: progress };
        }
        return { ...prev, documents };
      });
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;

      if (xhr.status >= 200 && xhr.status < 300) {
        let response: any = {};
        try {
          response = JSON.parse(xhr.responseText);
        } catch {
          response = {};
        }

        const fileUrl = response.fileUrl || '';
        const rawFileName = response.fileName || file.name || 'document';
        const safeFileName = rawFileName.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 255);
        const safeMimeType = response.mimeType || file.type || (isImage ? 'image/jpeg' : 'application/pdf');
        const safeSizeBytes = Number(response.sizeBytes) || file.size || 0;
        const uploadedAt = response.uploadedAt || new Date().toISOString();

        setForm((prev) => {
          const documents = [...prev.documents];
          documents[index] = {
            ...documents[index],
            fileName: safeFileName,
            mimeType: safeMimeType,
            sizeBytes: safeSizeBytes,
            fileUrl,
            uploadedAt,
            uploadStatus: 'uploaded',
            uploadProgress: 100,
            applicationId: response.applicationId || documents[index].applicationId,
            errorMessage: undefined,
          };
          return { ...prev, documents };
        });
        showSuccess('Upload Complete', `${file.name} uploaded successfully.`);
      } else {
        let error = 'Upload failed.';
        try {
          error = JSON.parse(xhr.responseText)?.error || 'Upload failed.';
        } catch {}
        setForm((prev) => {
          const documents = [...prev.documents];
          documents[index] = {
            ...documents[index],
            uploadStatus: 'error',
            errorMessage: error,
            uploadProgress: 0,
            fileUrl: '',
          };
          return { ...prev, documents };
        });
        showError('Upload Error', error);
      }
    };

    xhr.onerror = () => {
      setForm((prev) => {
        const documents = [...prev.documents];
        documents[index] = {
          ...documents[index],
          uploadStatus: 'error',
          errorMessage: 'Upload failed. Try again.',
          uploadProgress: 0,
          fileUrl: '',
        };
        return { ...prev, documents };
      });
      showError('Upload Error', 'Upload failed. Try again.');
    };

    xhr.send(formData);
  };

  const triggerFilePicker = (index: number) => {
    fileInputsRef.current[index]?.click();
  };

  const handleRemoveFile = (index: number) => {
    setForm((prev) => {
      const documents = [...prev.documents];
      documents[index] = {
        ...documents[index],
        fileName: '',
        mimeType: '',
        fileUrl: '',
        sizeBytes: 0,
        uploadedAt: undefined,
        uploadStatus: 'pending',
        uploadProgress: 0,
        previewUrl: undefined,
        errorMessage: undefined,
      };
      return { ...prev, documents };
    });
  };

  const isValidUrl = (value: string) => {
    try {
      return Boolean(new URL(value));
    } catch {
      return false;
    }
  };

  const validateStep = (step: number) => {
    if (step === 0) {
      if (!form.fullName || !form.nationalId || !form.dateOfBirth || !form.gender || !form.nationality || !form.phone || !form.email || !form.postalAddress) {
        showError('Application Error', 'Complete all personal information fields.');
        return false;
      }
      if (!/^\S+@\S+\.\S+$/.test(form.email)) {
        showError('Application Error', 'Enter a valid email address.');
        return false;
      }
      return true;
    }

    if (step === 1) {
      if (!form.previousSchool || !form.highestQualification || !form.meanGrade || !form.preferredIntake) {
        showError('Application Error', 'Complete all academic details.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!form.firstChoiceCourseId) {
        showError('Application Error', 'Select your first choice course.');
        return false;
      }
      return true;
    }

    if (step === 3) {
      const isUploading = form.documents.some((doc) => doc.uploadStatus === 'uploading');
      if (isUploading) {
        showError('Upload Error', 'Uploads are still in progress. Please wait for all documents to finish uploading.');
        return false;
      }

      const allUploaded = requiredDocuments.every((type) =>
        form.documents.some(
          (doc) => doc.documentType === type && (doc.uploadStatus === 'completed' || doc.uploadStatus === 'uploaded') && Boolean(doc.fileUrl && doc.fileUrl.trim())
        )
      );

      if (!allUploaded) {
        showError('Application Error', 'Please upload all required documents.');
        return false;
      }
      return true;
    }

    return true;
  };

  const validateAll = () => {
    for (let step = 0; step <= 3; step += 1) {
      if (!validateStep(step)) return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateAll()) return;

    const uploadedDocs = form.documents
      .filter((doc) => (doc.uploadStatus === 'completed' || doc.uploadStatus === 'uploaded') && Boolean(doc.fileUrl && doc.fileUrl.trim()))
      .map((doc) => ({
        documentType: doc.documentType,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        fileUrl: doc.fileUrl,
        sizeBytes: doc.sizeBytes,
      }));

    const missingDocs = requiredDocuments.filter(
      (type) => !uploadedDocs.some((doc) => doc.documentType === type)
    );

    if (missingDocs.length > 0) {
      showError('Application Error', 'Passport photo, national ID, and KCSE certificate are required and must be uploaded before submitting.');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');
    setApplicationReference('');

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
        kcseGrade: form.meanGrade,
        firstChoiceCourseId: form.firstChoiceCourseId,
        secondChoiceCourseId: form.secondChoiceCourseId || null,
        preferredIntake: form.preferredIntake,
        documents: uploadedDocs,
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
        const submittedAt = result.submittedAt || new Date().toISOString();
        const applicationNo = result.applicationNo || 'APP-2026-PENDING';

        const confirmedDocs = Array.isArray(result.documents) && result.documents.length > 0
          ? result.documents.map((savedDoc: any) => ({
              id: savedDoc.id || savedDoc.document_type,
              applicationId: savedDoc.application_id || savedDoc.applicationId || '',
              documentType: savedDoc.document_type || savedDoc.documentType,
              fileName: savedDoc.file_name || savedDoc.fileName,
              mimeType: savedDoc.mime_type || savedDoc.mimeType,
              fileUrl: savedDoc.file_url || savedDoc.fileUrl,
              sizeBytes: Number(savedDoc.size_bytes || savedDoc.sizeBytes || 0),
              createdAt: savedDoc.created_at || submittedAt,
              uploadedAt: savedDoc.created_at || submittedAt,
              uploadStatus: 'uploaded' as const,
              uploadProgress: 100,
            }))
          : form.documents;

        setForm((prev) => ({
          ...prev,
          documents: confirmedDocs,
        }));

        const fullSubmittedData = {
          applicationNo,
          submittedAt,
          status: result.status || 'Submitted',
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          nationalId: form.nationalId,
          preferredIntake: form.preferredIntake,
          firstChoiceCourseTitle: courses.find((c) => c.id === form.firstChoiceCourseId)?.title || 'Selected Course',
          secondChoiceCourseTitle: courses.find((c) => c.id === form.secondChoiceCourseId)?.title,
          documents: confirmedDocs,
        };

        setSubmittedData(fullSubmittedData);

        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {}

        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error('Application submission failed:', error);
      showError('Application Error', 'An unexpected error occurred while submitting your application.');
    } finally {
      setSubmitting(false);
    }
  };

  const summaryItems = [
    { label: 'Full Name', value: form.fullName },
    { label: 'National ID', value: form.nationalId },
    { label: 'Date of Birth', value: form.dateOfBirth },
    { label: 'Gender', value: form.gender },
    { label: 'Nationality', value: form.nationality },
    { label: 'Phone', value: form.phone },
    { label: 'Email', value: form.email },
    { label: 'Postal Address', value: form.postalAddress },
    { label: 'Previous School', value: form.previousSchool },
    { label: 'Highest Qualification', value: form.highestQualification },
    { label: 'KCSE Grade', value: form.meanGrade },
    { label: 'Preferred Intake', value: form.preferredIntake },
    { label: 'First Choice', value: courses.find((course) => course.id === form.firstChoiceCourseId)?.title || 'N/A' },
    { label: 'Second Choice', value: courses.find((course) => course.id === form.secondChoiceCourseId)?.title || 'Not selected' },
  ];

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
                <p className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-200 mt-1" /> Application review starts within 3 business days.</p>
                <p className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-200 mt-1" /> Upload clear copies of your KCSE certificate and ID.</p>
                <p className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-200 mt-1" /> Need help? admissions@zenti.school.</p>
              </div>
            </div>
            <div className="mt-10 rounded-3xl bg-slate-950/20 border border-slate-800 p-5 text-sm text-slate-100">
              <h2 className="text-base font-semibold text-white">Need help?</h2>
              <p className="mt-3 text-slate-300">Our admissions team is ready to answer questions and confirm intake dates.</p>
              <div className="mt-5 space-y-3 text-slate-200">
                <div>
                  <span className="block text-xs uppercase tracking-[0.2em] text-slate-400">Email</span>
                  admissions@zenti.school
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-[0.2em] text-slate-400">Phone</span>
                  +254 700 000 000
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-[0.2em] text-slate-400">Accepted files</span>
                  PDF, JPG, PNG
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 lg:p-12">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">New Application</p>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Submit Your Admission Request</h2>
              </div>
              <div className="text-right text-xs text-slate-500">Fields marked * are required</div>
            </div>

            <div className="mb-6 grid grid-cols-5 gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
              {['Personal', 'Academic', 'Course', 'Documents', 'Review'].map((item, index) => (
                <div key={item} className={`rounded-full px-3 py-2 text-center ${index === currentStep ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {item}
                </div>
              ))}
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{currentTitle}</p>
                    <p className="text-xs text-slate-500">Complete this section to continue.</p>
                  </div>
                </div>

                {currentStep === 0 && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="font-semibold">Full Name *</span>
                      <input value={form.fullName} onChange={(e) => handleChange('fullName', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-semibold">National ID *</span>
                      <input value={form.nationalId} onChange={(e) => handleChange('nationalId', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-semibold">Date of Birth *</span>
                      <input type="date" value={form.dateOfBirth} onChange={(e) => handleChange('dateOfBirth', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-semibold">Gender *</span>
                      <select value={form.gender} onChange={(e) => handleChange('gender', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500">
                        <option value="">Choose gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-sm md:col-span-2">
                      <span className="font-semibold">Nationality *</span>
                      <input value={form.nationality} onChange={(e) => handleChange('nationality', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                    </label>
                    <label className="space-y-2 text-sm md:col-span-2">
                      <span className="font-semibold">Postal Address *</span>
                      <textarea value={form.postalAddress} onChange={(e) => handleChange('postalAddress', e.target.value)} rows={3} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-semibold">Phone *</span>
                      <input value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-semibold">Email *</span>
                      <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                    </label>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="font-semibold">Previous School *</span>
                      <input value={form.previousSchool} onChange={(e) => handleChange('previousSchool', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-semibold">Highest Qualification *</span>
                      <input value={form.highestQualification} onChange={(e) => handleChange('highestQualification', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-semibold">KCSE Grade *</span>
                      <select value={form.meanGrade} onChange={(e) => handleChange('meanGrade', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500">
                        <option value="">Select grade</option>
                        {gradeOptions.map((grade) => (
                          <option key={grade} value={grade}>{grade}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2 text-sm md:col-span-2">
                      <span className="font-semibold">Preferred Intake *</span>
                      <input value={form.preferredIntake} onChange={(e) => handleChange('preferredIntake', e.target.value)} placeholder="e.g. January 2027" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
                    </label>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="font-semibold">First Choice Course *</span>
                      <select value={form.firstChoiceCourseId} onChange={(e) => handleChange('firstChoiceCourseId', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500">
                        <option value="">Choose a course</option>
                        {courses.filter((c) => c.active).map((course) => (
                          <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-semibold">Second Choice Course</span>
                      <select value={form.secondChoiceCourseId} onChange={(e) => handleChange('secondChoiceCourseId', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500">
                        <option value="">Optional second choice</option>
                        {courses.filter((c) => c.active).map((course) => (
                          <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-4">
                    {form.documents.map((doc, index) => {
                      const isComplete = (doc.uploadStatus === 'completed' || doc.uploadStatus === 'uploaded') && Boolean(doc.fileUrl && doc.fileUrl.trim());
                      const isError = doc.uploadStatus === 'error';
                      const isUploading = doc.uploadStatus === 'uploading';

                      return (
                        <div key={doc.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold capitalize">{doc.documentType.replaceAll('_', ' ')}</p>
                              <p className="text-xs text-slate-500">Accepted: PDF, JPG, PNG - max 10MB</p>
                            </div>
                            <UploadCloud className="w-5 h-5 text-blue-600" />
                          </div>
                          <input
                            ref={(el) => {
                              fileInputsRef.current[index] = el;
                            }}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png,image/jpg"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              handleFileSelect(index, file);
                              e.target.value = '';
                            }}
                          />
                          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => triggerFilePicker(index)}
                                className="inline-flex items-center gap-2 rounded-3xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                              >
                                {isError ? 'Retry Upload' : doc.fileName ? 'Replace File' : 'Upload / Choose File'}
                              </button>
                              {doc.fileName ? (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(index)}
                                  className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                                >
                                  Remove
                                </button>
                              ) : null}
                            </div>
                            <div className="text-sm text-slate-500">
                              {doc.fileName ? <span className="font-medium text-slate-700">{doc.fileName}</span> : 'No file selected yet'}
                            </div>
                          </div>
                          {doc.previewUrl ? (
                            <div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-3">
                              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <ImageIcon className="h-4 w-4" />
                                Image preview
                              </div>
                              <img src={doc.previewUrl} alt={doc.fileName} className="max-h-48 w-full rounded-2xl object-contain" />
                            </div>
                          ) : null}

                          <div className="mt-4 text-sm">
                            {isUploading ? (
                              <div className="space-y-2">
                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                  <div className="h-full rounded-full bg-blue-600 transition-all duration-200" style={{ width: `${doc.uploadProgress ?? 0}%` }} />
                                </div>
                                <p className="text-xs text-slate-500">Uploading... {doc.uploadProgress ?? 0}%</p>
                              </div>
                            ) : isComplete ? (
                              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 space-y-1 text-xs text-emerald-900">
                                <p className="inline-flex items-center gap-2 font-semibold text-emerald-700 text-sm">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  Uploaded Successfully
                                </p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                                  <span><strong className="font-medium text-slate-700">File:</strong> {doc.fileName}</span>
                                  <span><strong className="font-medium text-slate-700">Size:</strong> {formatFileSize(doc.sizeBytes)}</span>
                                  {doc.uploadedAt ? (
                                    <span><strong className="font-medium text-slate-700">Uploaded:</strong> {formatUploadedAt(doc.uploadedAt)}</span>
                                  ) : null}
                                </div>
                              </div>
                            ) : isError ? (
                              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-3 space-y-2 text-xs">
                                <p className="font-semibold text-rose-700 text-sm">Upload Failed</p>
                                <p className="text-rose-600">{doc.errorMessage || 'Upload failed. Please try again.'}</p>
                                <button
                                  type="button"
                                  onClick={() => triggerFilePicker(index)}
                                  className="inline-flex items-center gap-1 font-semibold text-rose-700 underline hover:text-rose-800"
                                >
                                  Retry Upload
                                </button>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500">Select a supported file to upload.</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-xs text-slate-500">
                      Upload each required document directly from your device. Files are validated and stored securely.
                    </p>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5">
                      <div className="mb-4 text-sm font-semibold text-slate-900">Review your application details</div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {summaryItems.map((item) => (
                          <div key={item.label} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                            <p className="mt-2 text-sm text-slate-900">{item.value || 'Not provided'}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5">
                      <div className="mb-4 text-sm font-semibold text-slate-900">Documents</div>
                      <div className="grid gap-3">
                        {form.documents.map((doc) => {
                          const isUploaded = (doc.uploadStatus === 'completed' || doc.uploadStatus === 'uploaded') && Boolean(doc.fileName && doc.fileUrl);
                          return (
                            <div key={doc.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                              <p className="text-sm font-semibold capitalize">{doc.documentType.replaceAll('_', ' ')}</p>
                              {isUploaded ? (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Uploaded ✓
                                  </p>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                                    <span><strong className="font-medium text-slate-700">File:</strong> {doc.fileName}</span>
                                    <span><strong className="font-medium text-slate-700">Size:</strong> {formatFileSize(doc.sizeBytes)}</span>
                                    {doc.uploadedAt ? (
                                      <span><strong className="font-medium text-slate-700">Upload date:</strong> {formatUploadedAt(doc.uploadedAt)}</span>
                                    ) : null}
                                  </div>
                                </div>
                              ) : doc.uploadStatus === 'uploading' ? (
                                <p className="mt-1 text-xs text-slate-500">Uploading... {doc.uploadProgress}%</p>
                              ) : doc.uploadStatus === 'error' ? (
                                <p className="mt-1 text-xs text-rose-600">{doc.errorMessage}</p>
                              ) : (
                                <p className="mt-1 text-xs text-slate-500">No file uploaded yet</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {successMessage ? (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    {successMessage}
                    {applicationReference ? <div className="mt-2 font-semibold">Reference: {applicationReference}</div> : null}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <button type="button" onClick={onCancel} className="rounded-3xl border border-slate-200 bg-white text-slate-900 px-5 py-3 text-sm font-semibold transition hover:bg-slate-50">
                  Cancel
                </button>
                <button type="button" onClick={handleBack} disabled={currentStep === 0} className="rounded-3xl border border-slate-200 bg-white text-slate-900 px-5 py-3 text-sm font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                  Back
                </button>
                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={currentStep === 3 && (form.documents.some((doc) => doc.uploadStatus === 'uploading') || !requiredDocuments.every((type) => form.documents.some((doc) => (doc.uploadStatus === 'completed' || doc.uploadStatus === 'uploaded') && Boolean(doc.fileUrl && doc.fileUrl.trim()))))}
                    className="rounded-3xl bg-blue-600 text-white px-5 py-3 text-sm font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting || form.documents.some((doc) => doc.uploadStatus === 'uploading') || !requiredDocuments.every((type) => form.documents.some((doc) => (doc.uploadStatus === 'completed' || doc.uploadStatus === 'uploaded') && Boolean(doc.fileUrl && doc.fileUrl.trim())))}
                    className="rounded-3xl bg-blue-600 text-white px-5 py-3 text-sm font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Submitting...' : 'Confirm & Submit'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                Application Submitted!
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Your application and uploaded documents have been saved into the database.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Application Reference</span>
              <div className="text-xl font-mono font-black text-blue-600 dark:text-blue-400 tracking-wider">
                {submittedData?.applicationNo || 'APP-2026-CONFIRMED'}
              </div>
              <p className="text-xs text-slate-500">Status: <span className="font-semibold text-emerald-600 dark:text-emerald-400">Submitted</span></p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                if (onSubmitted && submittedData) {
                  onSubmitted(submittedData);
                } else {
                  try {
                    sessionStorage.setItem('zenti_last_submitted_application', JSON.stringify(submittedData));
                  } catch {}
                  window.history.pushState({}, '', `/application-submitted?ref=${submittedData?.applicationNo}`);
                }
              }}
              className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-6 font-bold text-sm transition shadow-lg shadow-blue-500/30"
            >
              View Application Summary →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
