import React, { useState } from 'react';
import { useNotification } from './notifications';
import { Lecturer, Book, LMSReadingList, TeacherResource, BookRequest } from '../types';
import { BookOpen, Save, Cpu, Calendar, Plus, Send, CheckCircle2, AlertCircle, ShoppingBag, Grid } from 'lucide-react';

interface LecturerBooksViewProps {
  lecturer: Lecturer;
  books: Book[];
  readingLists: LMSReadingList[];
  teacherResources: TeacherResource[];
  bookRequests: BookRequest[];
  onUpdateReadingList: (subjectCode: string, lecturerId: string, bookIds: string[], notes?: string) => void;
  onReserveTeacherResource: (resourceId: string, lecturerId: string, lecturerName: string) => void;
  onReleaseTeacherResource: (resourceId: string) => void;
  onAddBookRequest: (request: Omit<BookRequest, 'id' | 'date' | 'status'>) => void;
}

type LecturerBookTab = 'readinglist' | 'equipment' | 'procurement';

export default function LecturerBooksView({
  lecturer,
  books = [],
  readingLists = [],
  teacherResources = [],
  bookRequests = [],
  onUpdateReadingList,
  onReserveTeacherResource,
  onReleaseTeacherResource,
  onAddBookRequest
}: LecturerBooksViewProps) {
  const { showToast, showWarning } = useNotification();
  
  const [activeSubTab, setActiveSubTab] = useState<LecturerBookTab>('readinglist');
  
  // States for Syllabus Lists
  const [lecSubject, setLecSubject] = useState(lecturer.subjects[0] || '');
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>(() => {
    const existing = readingLists.find(rl => rl.subjectCode === (lecturer.subjects[0] || ''));
    return existing ? existing.bookIds : [];
  });
  const [notes, setNotes] = useState(() => {
    const existing = readingLists.find(rl => rl.subjectCode === (lecturer.subjects[0] || ''));
    return existing ? existing.notes || '' : '';
  });

  // States for Procurement Suggestion
  const [pTitle, setPTitle] = useState('');
  const [pAuthor, setPAuthor] = useState('');
  const [pIsbn, setPIsbn] = useState('');
  const [pReason, setPReason] = useState('');
  const [pSuccessMsg, setPSuccessMsg] = useState('');

  const handleSubjectChange = (subj: string) => {
    setLecSubject(subj);
    const existing = readingLists.find(rl => rl.subjectCode === subj);
    setSelectedBookIds(existing ? existing.bookIds : []);
    setNotes(existing ? existing.notes || '' : '');
  };

  const handleSaveReadingList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lecSubject) {
      showWarning("Course Selection Error", 'Please select a syllabus course.');
      return;
    }
    onUpdateReadingList(lecSubject, lecturer.id, selectedBookIds, notes);
    showToast(`Syllabus assigned reading list for course [${lecSubject}] updated across all enrolled student portals.`, 'success');
  };

  const handleProcurementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pTitle.trim() || !pAuthor.trim()) {
      showWarning("Incomplete Book Request", 'Please fill out the title and editor of the book.');
      return;
    }
    onAddBookRequest({
      title: pTitle.trim(),
      author: pAuthor.trim(),
      isbn: pIsbn.trim() || undefined,
      suggestedBy: lecturer.name,
      suggestorRole: 'lecturer',
      reason: pReason.trim() || undefined
    });
    setPTitle('');
    setPAuthor('');
    setPIsbn('');
    setPReason('');
    setPSuccessMsg('Procurement acquisition suggestion submitted securely to the library budget board.');
    setTimeout(() => setPSuccessMsg(''), 5000);
  };

  return (
    <div className="space-y-6 text-xs bg-white p-5 rounded-xl border border-slate-100">
      
      {/* TABS HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
        <div>
          <h2 className="text-base font-black text-slate-850 flex items-center gap-1.5 leading-normal">
            <Cpu className="w-5 h-5 text-blue-600 animate-pulse" />
            Lecturer Resource & Equipment Hub
          </h2>
          <p className="text-xs text-slate-500 mt-1">Curate course syllabus mappings, reserve teacher hardware kits, and request professional volume acquisitions.</p>
        </div>

        {/* SUBTAB SELECTOR */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('readinglist')}
            className={`px-3 py-1.5 rounded-lg text-[10.5px] font-extrabold cursor-pointer transition-all ${
              activeSubTab === 'readinglist' ? 'bg-slate-900 text-white' : 'text-slate-650 hover:text-slate-900'
            }`}
          >
            Syllabus Reading Curator
          </button>
          
          <button
            type="button"
            onClick={() => setActiveSubTab('equipment')}
            className={`px-3 py-1.5 rounded-lg text-[10.5px] font-extrabold cursor-pointer transition-all ${
              activeSubTab === 'equipment' ? 'bg-blue-600 text-white' : 'text-slate-650 hover:text-slate-900'
            }`}
          >
            Teacher Resource Kits
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('procurement')}
            className={`px-3 py-1.5 rounded-lg text-[10.5px] font-extrabold cursor-pointer transition-all ${
              activeSubTab === 'procurement' ? 'bg-amber-600 text-white' : 'text-slate-650 hover:text-slate-900'
            }`}
          >
            Library suggestions
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE LEVEL */}
      {activeSubTab === 'readinglist' && (
        <form onSubmit={handleSaveReadingList} className="space-y-4">
          <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 space-y-1">
            <h4 className="font-extrabold text-blue-900 text-xs">Assign Recommended Course Literature</h4>
            <p className="text-slate-500 text-[10.5px]">Link physical library codes or digital textbook readers to any of your active assign classroom codes.</p>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-655 block">Choose Classroom Syllabus Code</label>
            <select
              value={lecSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="bg-white border p-2.5 rounded-xl font-bold text-xs cursor-pointer focus:outline-hidden"
            >
              {lecturer.subjects.map(s => (
                <option key={s} value={s}>{s} Syllabus Course</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <span className="text-[10.5px] font-bold text-slate-600 block">Select Textbooks from Library HQ Catalogue:</span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto p-2 bg-slate-50/55 rounded-xl border">
              {books.map(book => {
                const isAssigned = selectedBookIds.includes(book.id);
                return (
                  <div 
                    key={book.id} 
                    onClick={() => {
                      if (isAssigned) {
                        setSelectedBookIds(prev => prev.filter(id => id !== book.id));
                      } else {
                        setSelectedBookIds(prev => [...prev, book.id]);
                      }
                    }}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer hover:bg-white select-none transition-all ${
                      isAssigned ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={() => {}} // clickable parent handles
                      className="w-4 h-4 rounded text-blue-600 shrink-0 cursor-pointer"
                    />
                    <div className="space-y-0.5 truncate flex-1">
                      <p className="font-extrabold text-slate-800 truncate text-[11px] leading-tight-none">{book.title}</p>
                      <p className="text-[9.5px] text-slate-450">by {book.author} | Classification: {book.category}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-655 block">Curator Directives / Required Reading Chapters</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Read Chapters 3 and 4 in preparation for your midterm assignment. Code review guidelines are attached on e-Learning."
              className="w-full bg-white border rounded-xl p-3 text-xs leading-normal font-medium focus:outline-hidden"
            />
          </div>

          <button
            type="submit"
            className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase tracking-wider px-5 py-3 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Synchronize Class Reading Guides</span>
          </button>
        </form>
      )}

      {activeSubTab === 'equipment' && (
        <div className="space-y-4">
          <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 space-y-1">
            <h4 className="font-extrabold text-blue-900 text-xs">Simulated Classroom Equipment & Teacher Resource Kits</h4>
            <p className="text-slate-500 text-[10.5px]">Librarians stock advanced demonstration equipment, robotics kits, and sensory lab modules. Submit classroom holds here.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teacherResources.map(res => {
              const isReservedByMe = res.reservedByLecturerId === lecturer.id;
              const isAvailable = res.status === 'available';

              return (
                <div 
                  key={res.id} 
                  className={`border rounded-2xl p-4.5 flex flex-col justify-between space-y-4 transition-all hover:shadow-xs ${
                    isReservedByMe ? 'bg-blue-50/15 border-blue-300' : 'bg-slate-50/50 border-slate-150'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[9px] font-mono text-slate-450 uppercase font-bold tracking-wider">{res.id}</span>
                      <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {res.status}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-800 text-[12px] leading-snug">{res.name}</h4>
                    <p className="text-[10px] text-slate-500 leading-normal font-light">Category: {res.category}</p>
                  </div>

                  <div className="border-t pt-3 flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-400">S/N: <strong className="font-mono text-slate-650">{res.serialNo}</strong></span>
                    
                    {isAvailable ? (
                      <button
                        type="button"
                        onClick={() => onReserveTeacherResource(res.id, lecturer.id, lecturer.name)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9px] uppercase tracking-wide px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        Reserve Kit
                      </button>
                    ) : isReservedByMe ? (
                      <button
                        type="button"
                        onClick={() => onReleaseTeacherResource(res.id)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[9px] uppercase tracking-wide px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        Release Kit Hold
                      </button>
                    ) : (
                      <span className="text-[9.5px] italic text-slate-450">Reserved by {res.reservedByLecturerName || 'Lecturer'}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSubTab === 'procurement' && (
        <form onSubmit={handleProcurementSubmit} className="space-y-4">
          <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/10 space-y-1">
            <h4 className="font-extrabold text-amber-900 text-xs">Acquisition suggestions & Smart Procurement</h4>
            <p className="text-slate-500 text-[10.5px]">Suggest reference manuals, advanced research journals, or library book replacements for your academic departments.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 space-y-3">
              {pSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-150 text-emerald-800 p-3 rounded-xl font-bold">
                  {pSuccessMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-655 block">Proposed Title *</label>
                  <input
                    type="text"
                    required
                    value={pTitle}
                    onChange={(e) => setPTitle(e.target.value)}
                    placeholder="e.g. Distributed Consensus Implementations"
                    className="w-full bg-white border p-2 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-655 block">Author / Principal Editor *</label>
                  <input
                    type="text"
                    required
                    value={pAuthor}
                    onChange={(e) => setPAuthor(e.target.value)}
                    placeholder="e.g. Leslie Lamport"
                    className="w-full bg-white border p-2 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-655 block">ISBN Code (Optional)</label>
                  <input
                    type="text"
                    value={pIsbn}
                    onChange={(e) => setPIsbn(e.target.value)}
                    placeholder="e.g. 978-0201624984"
                    className="w-full bg-white border p-2 rounded-xl font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-655 block">Acquisitions Justification *</label>
                  <input
                    type="text"
                    required
                    value={pReason}
                    onChange={(e) => setPReason(e.target.value)}
                    placeholder="e.g. Recommended syllabus reading for B.Sc CyberSecurity Semester 2 course."
                    className="w-full bg-white border p-2 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-5 py-3 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Submit Procurement Request</span>
              </button>
            </div>

            {/* Previous suggestions */}
            <div className="bg-slate-55 p-4 rounded-xl border flex flex-col space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Your logged Acquisition suggestions ({bookRequests.filter(r => r.suggestedBy === lecturer.name).length})</span>
              
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {bookRequests
                  .filter(r => r.suggestedBy === lecturer.name)
                  .map(req => {
                    const isApproved = req.status === 'approved';
                    const isPending = req.status === 'pending';
                    return (
                      <div key={req.id} className="bg-white p-3 border rounded-xl space-y-1.5 text-[10.5px]">
                        <div className="flex justify-between items-start gap-1">
                          <h5 className="font-bold text-slate-800 line-clamp-2 leading-tight">{req.title}</h5>
                          <span className={`text-[8px] font-mono font-bold px-1 rounded uppercase ${
                            isApproved ? 'bg-emerald-55 text-emerald-700 border border-emerald-250' :
                            isPending ? 'bg-amber-55 text-amber-700 border border-amber-250' :
                            'bg-rose-55 text-rose-700 border border-rose-250'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[9.5px]">by {req.author}</p>
                        {req.adminFeedback && (
                          <div className="bg-slate-50 p-2 rounded-lg text-[9px] italic text-slate-600 leading-relaxed font-semibold">
                            <strong>Note:</strong> "{req.adminFeedback}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                {bookRequests.filter(r => r.suggestedBy === lecturer.name).length === 0 && (
                  <p className="text-slate-400 italic text-center py-2">No procurement items suggested yet.</p>
                )}
              </div>
            </div>

          </div>
        </form>
      )}

    </div>
  );
}
