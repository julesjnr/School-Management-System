import React, { useState } from 'react';
import { Star, X, Check, Award, Sparkles } from 'lucide-react';
import { Course, Student, CourseReview } from '../types';

interface CourseReviewModalProps {
  course: Course;
  student: Student;
  existingReview?: CourseReview;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
}

export default function CourseReviewModal({
  course,
  student,
  existingReview,
  onClose,
  onSubmit,
}: CourseReviewModalProps) {
  const storageCommentKey = `autosave_review_${course.id}_${student.id}_comment`;
  const storageRatingKey = `autosave_review_${course.id}_${student.id}_rating`;

  const [rating, setRating] = useState<number>(() => {
    const saved = localStorage.getItem(storageRatingKey);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      return !isNaN(parsed) && parsed >= 1 && parsed <= 5 ? parsed : 5;
    }
    return existingReview?.rating || 5;
  });
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>(() => {
    const saved = localStorage.getItem(storageCommentKey);
    return saved !== null ? saved : (existingReview?.comment || '');
  });
  const [error, setError] = useState<string>('');
  const [draftRestoredMsg, setDraftRestoredMsg] = useState<boolean>(() => {
    const savedComment = localStorage.getItem(storageCommentKey);
    const savedRating = localStorage.getItem(storageRatingKey);
    return savedComment !== null || savedRating !== null;
  });

  // Auto-save progress to localStorage on any state change
  React.useEffect(() => {
    localStorage.setItem(storageCommentKey, comment);
    localStorage.setItem(storageRatingKey, String(rating));
  }, [comment, rating, storageCommentKey, storageRatingKey]);

  const handleClearDraft = () => {
    localStorage.removeItem(storageCommentKey);
    localStorage.removeItem(storageRatingKey);
    setComment(existingReview?.comment || '');
    setRating(existingReview?.rating || 5);
    setDraftRestoredMsg(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5 stars.');
      return;
    }
    if (!comment.trim()) {
      setError('Please write a brief comment describing your experience with the course.');
      return;
    }
    if (comment.trim().length < 10) {
      setError('Your comment must be at least 10 characters long to provide constructive feedback.');
      return;
    }
    setError('');

    // Clear autosave keys on successful submission
    localStorage.removeItem(storageCommentKey);
    localStorage.removeItem(storageRatingKey);

    onSubmit(rating, comment.trim());
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="course-review-modal-overlay">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col transform transition-all duration-300 scale-100"
        id="course-review-modal-box"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-slate-800"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="text-[9px] bg-blue-600 uppercase font-black px-2 py-0.5 rounded tracking-wider">
            Curriculum Quality Assurance
          </span>
          <h3 className="text-base font-bold mt-1.5 leading-tight">{course.title}</h3>
          <p className="text-[10px] text-slate-350 font-mono mt-0.5">Course Code: {course.code} • Facilitator Office</p>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {draftRestoredMsg && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 flex justify-between items-center gap-2">
              <div>
                <span className="font-extrabold block text-[10.5px]">Restored draft!</span>
                <span className="text-[10px] text-slate-550 block">Your previous rating and feedback comment have been loaded.</span>
              </div>
              <button
                type="button"
                onClick={handleClearDraft}
                className="text-[10px] font-bold text-amber-700 hover:text-amber-900 hover:underline shrink-0 bg-white border border-amber-300 rounded px-2 py-0.5"
              >
                Clear draft
              </button>
            </div>
          )}

          <div className="space-y-1 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100/45 text-blue-900 leading-relaxed">
            <p className="font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Dear {student.name},</span>
            </p>
            <p className="text-[10px] text-slate-600 mt-1">
              Your academic records indicate you have completed a module associated with <strong className="text-blue-805">{course.code}</strong>. Please rate this course structure and share your experience below.
            </p>
          </div>

          {/* Star Rating Select Input */}
          <div className="space-y-2 text-center py-2 bg-slate-50 border border-slate-100 rounded-xl">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Choose Course Quality Rating
            </label>
            <div className="flex justify-center items-center gap-1.5 py-1">
              {[1, 2, 3, 4, 5].map((starVal) => {
                const isActive = starVal <= (hoveredRating !== null ? hoveredRating : rating);
                return (
                  <button
                    key={starVal}
                    type="button"
                    onClick={() => setRating(starVal)}
                    onMouseEnter={() => setHoveredRating(starVal)}
                    onMouseLeave={() => setHoveredRating(null)}
                    className="p-1 rounded-full hover:scale-110 transition-all cursor-pointer focus:outline-hidden"
                    title={`${starVal} Star${starVal > 1 ? 's' : ''}`}
                  >
                    <Star 
                      className={`w-7 h-7 transition-all ${
                        isActive 
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs' 
                          : 'text-slate-300 hover:text-slate-400'
                      }`} 
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest block">
              {['Poor Syllabus Quality', 'Below Expectations', 'Satisfactory Curriculum', 'Outstanding Program', 'Exemplary Course Support'][rating - 1]}
            </span>
          </div>

          {/* Comment input textarea */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="review-textarea" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Feedback Remarks & Comments
            </label>
            <textarea
              id="review-textarea"
              rows={4}
              maxLength={400}
              placeholder="Provide constructive feedback about modules, assignments structure, and lecturers support..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-white border border-slate-205 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 transition-colors shadow-3xs"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
              <span>Min. 10 characters</span>
              <span>{comment.length} / 400 chars</span>
            </div>
          </div>

          {error && (
            <p className="text-rose-600 bg-rose-50 border border-rose-150 p-2.5 rounded-lg font-bold text-left animate-shake">
              {error}
            </p>
          )}

          {/* Action Buttons Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-150 transition-colors font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>{existingReview ? 'Update Feedback' : 'Publish Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
