import React, { useState } from 'react';
import { 
  Student, Book, Loan, Reservation, LMSReadingList, BookReview, BookRequest, ExamPaper, LibraryGateLog 
} from '../types';
import { 
  Search, AlertCircle, Sparkles, MapPin, ArrowUpRight, Star, Fingerprint, Scan,
  Download, Plus, Award, Calendar, CheckCircle2, Cpu, FileText, Send, Grid, ListFilter
} from 'lucide-react';

interface StudentLibraryViewProps {
  student: Student;
  books: Book[];
  loans: Loan[];
  reservations: Reservation[];
  readingLists: LMSReadingList[];
  bookReviews: BookReview[];
  bookRequests: BookRequest[];
  examPapers: ExamPaper[];
  libraryGateLogs: LibraryGateLog[];
  onReserveBook: (bookId: string, patronId: string, patronName: string) => void;
  onCancelReservation: (resId: string) => void;
  onNavigateToTab: (tab: 'dashboard' | 'grades' | 'financials' | 'materials' | 'units' | 'officeHours' | 'library') => void;
  onAddBookReview: (review: Omit<BookReview, 'id' | 'date'>) => void;
  onAddBookRequest: (request: Omit<BookRequest, 'id' | 'date' | 'status'>) => void;
  onTriggerGateLog: (log: Omit<LibraryGateLog, 'id' | 'timestamp'>) => void;
  onCheckoutBook: (bookId: string, patronId: string, patronName: string, patronRole: 'student' | 'lecturer', loanDays?: number) => void;
  onReturnBook: (loanId: string, returnStatus: 'returned' | 'damaged' | 'lost', damageFee?: number) => void;
}

type LibrarySubTab = 'catalog' | 'rfid' | 'biometric' | 'lms' | 'procure' | 'analytics';

export default function StudentLibraryView({
  student,
  books = [],
  loans = [],
  reservations = [],
  readingLists = [],
  bookReviews = [],
  bookRequests = [],
  examPapers = [],
  libraryGateLogs = [],
  onReserveBook,
  onCancelReservation,
  onNavigateToTab,
  onAddBookReview,
  onAddBookRequest,
  onTriggerGateLog,
  onCheckoutBook,
  onReturnBook
}: StudentLibraryViewProps) {
  
  const [subTab, setSubTab] = useState<LibrarySubTab>('catalog');
  
  // States for Catalog
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [activeBookReviewId, setActiveBookReviewId] = useState<string | null>(null);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');

  // States for RFID checkout
  const [rfidStudentTapped, setRfidStudentTapped] = useState(false);
  const [rfidSelectedBookId, setRfidSelectedBookId] = useState('');
  const [scanActionStatus, setScanActionStatus] = useState<string>('');

  // States for Biometrics
  const [bioMethod, setBioMethod] = useState<'fingerprint' | 'face'>('fingerprint');
  const [bioScanning, setBioScanning] = useState(false);
  const [bioStatus, setBioStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

  // States for LMS & exam paper archive search
  const [examSearch, setExamSearch] = useState('');
  const [examFilter, setExamFilter] = useState('All');
  const [localExamPapers, setLocalExamPapers] = useState<ExamPaper[]>(examPapers);

  // States for Procurement
  const [reqTitle, setReqTitle] = useState('');
  const [reqAuthor, setReqAuthor] = useState('');
  const [reqIsbn, setReqIsbn] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [procurementStatusMsg, setProcurementStatusMsg] = useState('');

  // Filters for book catalog
  const filteredBooks = books.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(search.toLowerCase()) ||
                          b.author.toLowerCase().includes(search.toLowerCase()) ||
                          b.isbn.includes(search) ||
                          b.libraryCode.toLowerCase().includes(search.toLowerCase());
    const matchesCat = catFilter === 'All' || b.category === catFilter;
    return matchesSearch && matchesCat;
  });

  const categoriesList = ['All', ...Array.from(new Set(books.map(b => b.category)))];

  // Outstanding student checks
  const myLoans = loans.filter(l => l.patronId === student.id && (l.status === 'borrowed' || l.status === 'overdue'));
  const myReservations = reservations.filter(r => r.patronId === student.id && r.status === 'pending');
  const unpaidFinesCount = student.ledger.filter(inv => inv.status === 'unpaid' && inv.description.toLowerCase().includes('library')).length;

  const isAccessBlockedByFees = unpaidFinesCount > 0;

  // Syllabi recommend notes
  const getUnitRecommendationNote = (bookId: string) => {
    const recs: string[] = [];
    readingLists.forEach(rl => {
      if (student.enrolledUnits.includes(rl.subjectCode) && rl.bookIds.includes(bookId)) {
        recs.push(rl.subjectCode);
      }
    });
    return recs.length > 0 ? `Assigned Course Textbook for active syllabus: ${recs.join(', ')}` : null;
  };

  // Submit book review
  const handleReviewSubmit = (e: React.FormEvent, bookId: string) => {
    e.preventDefault();
    if (!newReviewComment.trim()) {
      alert('Please enter a short critique or review comment first.');
      return;
    }
    onAddBookReview({
      bookId,
      studentId: student.id,
      studentName: student.name,
      rating: newReviewRating,
      comment: newReviewComment.trim()
    });
    setNewReviewComment('');
    alert('Thank you! Your peer rating has been logged instantly.');
  };

  // RFID Self-Checkout simulations
  const handleRFIDTapCard = () => {
    setRfidStudentTapped(true);
    setScanActionStatus('RFID card detected: Student ID Authorized. Please select physical textbook to place on reader array.');
  };

  const handleRFIDCheckoutExecute = () => {
    if (!rfidSelectedBookId) {
      alert('Please select a book catalog item to line up on scanner.');
      return;
    }
    const book = books.find(b => b.id === rfidSelectedBookId);
    if (!book) return;

    if (isAccessBlockedByFees) {
      setScanActionStatus('TRANSACTION DECLINED: RFID Gate controller has blocked card holder due to outstanding overdue library fines. Clear outstanding invoices first.');
      onTriggerGateLog({
        patronId: student.id,
        patronName: student.name,
        role: 'student',
        authMethod: 'rfid_tap',
        gateAction: 'Entry',
        status: 'denied',
        reason: 'Attempted self-checkout with unpaid arrears.'
      });
      return;
    }

    if (myLoans.length >= 3) {
      setScanActionStatus('TRANSACTION DECLINED: You have already borrowed your maximum library allowance of 3 concurrent textbooks. Return a volume before starting another.');
      return;
    }

    onCheckoutBook(book.id, student.id, student.name, 'student', 14);
    
    // Add gate entry log automatically
    onTriggerGateLog({
      patronId: student.id,
      patronName: student.name,
      role: 'student',
      authMethod: 'rfid_tap',
      gateAction: 'Exit',
      status: 'success'
    });

    setScanActionStatus(`RFID SUCCESS: "${book.title}" catalog has been digitally mapped to student chip. Sensor gates armed. Due in 14 days.`);
    setRfidSelectedBookId('');
  };

  const handleRFIDReturnExecute = (loanId: string) => {
    onReturnBook(loanId, 'returned', 0);
    setScanActionStatus('RFID SUCCESS: Textbook placed on return tray. Magnetic tag disabled. Loan has been checked in under current system ledger.');
    onTriggerGateLog({
      patronId: student.id,
      patronName: student.name,
      role: 'student',
      authMethod: 'rfid_tap',
      gateAction: 'Entry',
      status: 'success'
    });
  };

  // Biometric gate checkout simulator
  const handleBiometricAuthenticate = () => {
    setBioScanning(true);
    setBioStatus({ type: 'idle', message: 'Connecting to entrance biometric terminal... Place hand/face key on optical scope.' });
    
    setTimeout(() => {
      setBioScanning(false);
      if (isAccessBlockedByFees) {
        setBioStatus({
          type: 'error',
          message: `ACCESS DENIED: Biometric template match succeeded, but secure lock refused clearance. Student has ${unpaidFinesCount} outstanding unpaid overdue fine records. Please report to Finance Office.`
        });
        onTriggerGateLog({
          patronId: student.id,
          patronName: student.name,
          role: 'student',
          authMethod: bioMethod === 'fingerprint' ? 'biometric_fingerprint' : 'biometric_facial',
          gateAction: 'Entry',
          status: 'denied',
          reason: 'Access denied: library ledger balance owing.'
        });
      } else {
        setBioStatus({
          type: 'success',
          message: `ACCESS GRANTED: Hello, ${student.name}. Entrance gate lock disengaged. Check-in event cataloged in live security logs.`
        });
        onTriggerGateLog({
          patronId: student.id,
          patronName: student.name,
          role: 'student',
          authMethod: bioMethod === 'fingerprint' ? 'biometric_fingerprint' : 'biometric_facial',
          gateAction: 'Entry',
          status: 'success'
        });
      }
    }, 1500);
  };

  // Past paper simulated download counters
  const handleDownloadPaper = (id: string, url: string) => {
    setLocalExamPapers(prev => prev.map(ep => {
      if (ep.id === id) {
        return { ...ep, downloadsCount: ep.downloadsCount + 1 };
      }
      return ep;
    }));
    // Open simulating trigger
    alert(`Downloading KCSE / Syllabus Exam paper source from our high-speed cache. (Downloads logged: local copy successfully decrypted)`);
  };

  // Purchase suggestions propose
  const handleProcurementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim() || !reqAuthor.trim()) {
      alert('Please fill out the Title and Author of the procurement book.');
      return;
    }
    onAddBookRequest({
      title: reqTitle.trim(),
      author: reqAuthor.trim(),
      isbn: reqIsbn.trim() || undefined,
      suggestedBy: student.name,
      suggestorRole: 'student',
      reason: reqReason.trim() || undefined
    });
    setReqTitle('');
    setReqAuthor('');
    setReqIsbn('');
    setReqReason('');
    setProcurementStatusMsg('Success: Propose submitted securely for librarian selection and administration budgeting approval.');
    setTimeout(() => setProcurementStatusMsg(''), 5000);
  };

  // Gamified milestones badge calculator
  const calculatePersonalBadges = () => {
    const badges = [
      {
        id: 'badge-1',
        name: 'Academic Pioneer',
        desc: 'Borrow at least one Physical or Digital Computer Science catalog volume.',
        icon: Cpu,
        unlocked: loans.some(l => l.patronId === student.id && books.find(b => b.id === l.bookId)?.category === 'Computer Science'),
        tier: 'Bronze'
      },
      {
        id: 'badge-2',
        name: 'Page-Turner Alpha',
        desc: 'Log 2 or more separate borrowing events at the core resource hub.',
        icon: Award,
        unlocked: loans.filter(l => l.patronId === student.id).length >= 2,
        tier: 'Silver'
      },
      {
        id: 'badge-3',
        name: 'Curriculum Champion',
        desc: 'Open or checkout an active assigned syllabus reading recommended by your lecturer.',
        icon: Sparkles,
        unlocked: loans.some(l => l.patronId === student.id && getUnitRecommendationNote(l.bookId) !== null),
        tier: 'Gold'
      },
      {
        id: 'badge-4',
        name: 'Zero-Overdue Virtuoso',
        desc: 'Maintain pristine records with absolutely zero unreturned overdue loans right now.',
        icon: CheckCircle2,
        unlocked: myLoans.length > 0 && !myLoans.some(l => new Date() > new Date(l.dueDate)),
        tier: 'Platinum'
      },
      {
        id: 'badge-5',
        name: 'Vanguard Patron',
        desc: 'Actively construct school acquisitions by submitting a procurement suggestion.',
        icon: Send,
        unlocked: bookRequests.some(r => r.suggestedBy === student.name),
        tier: 'Bronze'
      }
    ];
    return badges;
  };

  const readingMilestones = calculatePersonalBadges();
  const unlockedCount = readingMilestones.filter(m => m.unlocked).length;

  return (
    <div className="space-y-6 text-xs">
      
      {/* HEADER HERO BOARD */}
      <div className="bg-slate-900 border border-slate-800 text-white p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="space-y-1">
          <span className="text-[9.5px] uppercase font-bold tracking-widest text-blue-400 block font-mono">INTELLIGENT HYBRID LEARNING STATION</span>
          <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-500 animate-pulse" />
            Library Resource Hub & Smart Automation
          </h2>
          <p className="text-[11px] text-slate-400 max-w-xl font-light leading-normal">
            Browse catalog indices, execute contactless RFID self-checkout scans, check entrance biometric gate parameters, run national exam archives, and track gamified badges.
          </p>
        </div>

        {isAccessBlockedByFees && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-200 p-3 rounded-xl max-w-xs text-[10px] space-y-1">
            <p className="font-extrabold flex items-center gap-1.5 uppercase text-rose-450 tracking-wider">
              <AlertCircle className="w-4 h-4 text-rose-500 animate-bounce" /> Library Block Active
            </p>
            <p className="font-light leading-snug">
              Clear outstanding library overdue arrears of <span className="font-mono font-medium">KES {unpaidFinesCount * 150}</span> in your <button type="button" onClick={() => onNavigateToTab('financials')} className="underline font-bold hover:text-white">statement page</button> to resume.
            </p>
          </div>
        )}
      </div>

      {/* HORIZONTAL MINI TAB SELECTOR */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1.5 border-b border-slate-100">
        <button
          onClick={() => setSubTab('catalog')}
          className={`px-3 py-2 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer text-[10.5px] ${
            subTab === 'catalog' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Grid className="w-4 h-4" />
          Catalog OPAC & Reviews
        </button>

        <button
          onClick={() => setSubTab('rfid')}
          className={`px-3 py-2 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer text-[10.5px] ${
            subTab === 'rfid' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scan className="w-4 h-4 text-blue-500" />
          RFID Self-Checkout Kiosk
        </button>

        <button
          onClick={() => setSubTab('biometric')}
          className={`px-3 py-2 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer text-[10.5px] ${
            subTab === 'biometric' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Fingerprint className="w-4 h-4 text-emerald-500" />
          Biometric Entrance Gate
        </button>

        <button
          onClick={() => setSubTab('lms')}
          className={`px-3 py-2 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer text-[10.5px] ${
            subTab === 'lms' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-500" />
          LMS Exam Archive
        </button>

        <button
          onClick={() => setSubTab('procure')}
          className={`px-3 py-2 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer text-[10.5px] ${
            subTab === 'procure' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Plus className="w-4 h-4 text-amber-500" />
          Procurement Propose
        </button>

        <button
          onClick={() => setSubTab('analytics')}
          className={`px-3 py-2 rounded-lg font-bold transition-all relative shrink-0 flex items-center gap-1.5 cursor-pointer text-[10.5px] ${
            subTab === 'analytics' ? 'bg-pink-600 text-white' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-pink-500 animate-bounce" />
          My Reading Badges
          {unlockedCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[8px] px-1 rounded-full">{unlockedCount}</span>
          )}
        </button>
      </div>

      {/* SUB TAB LAYOUT SWITCHER */}
      <div className="bg-slate-50/50 p-1 rounded-xl">
        
        {/* SUB TAB 1: OPAC CATALOG & REVIEWS */}
        {subTab === 'catalog' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white p-5 rounded-xl border border-slate-100">
            
            {/* Catalog Main Listing */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search books by title, author, keyword, ISBN codes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white border border-slate-205 pl-10 pr-4 py-2.5 rounded-xl font-bold"
                  />
                </div>
                <select
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  className="bg-white border border-slate-205 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer focus:outline-hidden"
                >
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat} Classification</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {filteredBooks.map(book => {
                  const isELib = book.type === 'E-Book';
                  const recommendedNote = getUnitRecommendationNote(book.id);
                  const alreadyBorrowed = myLoans.some(l => l.bookId === book.id);
                  const alreadyReserved = myReservations.some(r => r.bookId === book.id);
                  
                  // Compute rating aggregates
                  const selfReviews = bookReviews.filter(r => r.bookId === book.id);
                  const avgRating = selfReviews.length > 0
                    ? Number((selfReviews.reduce((sum, r) => sum + r.rating, 0) / selfReviews.length).toFixed(1))
                    : 5;

                  return (
                    <div 
                      key={book.id} 
                      className={`bg-white border p-4 rounded-xl space-y-3 hover:border-blue-400 transition-all ${
                        recommendedNote ? 'border-amber-200 bg-amber-50/10' : 'border-slate-100'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-[12.5px] text-slate-800 leading-snug">{book.title}</h4>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              isELib ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' : 'bg-amber-50 text-amber-700 border border-amber-150'
                            }`}>
                              {book.type}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-450 leading-relaxed font-light">
                            by <strong className="text-slate-655 font-bold">{book.author}</strong> | Category: <strong className="text-slate-600">{book.category}</strong> | ISBN: <strong className="font-mono">{book.isbn}</strong>
                          </p>

                          {recommendedNote && (
                            <div className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-800 border border-amber-500/20 font-bold px-2 py-0.5 rounded text-[9.5px]">
                              <Sparkles className="w-3 h-3 text-amber-600 animate-pulse" />
                              <span>{recommendedNote}</span>
                            </div>
                          )}

                          {!isELib && (
                            <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono pt-1">
                              <span className="flex items-center gap-0.5"><MapPin className="w-3.5 h-3.5" /> {book.rackNumber}, {book.shelfRow}</span>
                              <span>•</span>
                              <span>Shelf Code: <strong>{book.libraryCode}</strong></span>
                              <span>•</span>
                              <span className={book.copiesAvailable > 0 ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                                {book.copiesAvailable > 0 ? `${book.copiesAvailable} / ${book.copiesTotal} in stock` : 'Out of Stock'}
                              </span>
                            </div>
                          )}

                          {/* STARS AGGREGATE */}
                          <div className="flex items-center gap-2 pt-1">
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3.5 h-3.5 ${
                                    i < Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                                  }`} 
                                />
                              ))}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">
                              {avgRating} ({selfReviews.length} Peer reviews)
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveBookReviewId(activeBookReviewId === book.id ? null : book.id)}
                              className="text-blue-600 hover:underline font-bold text-[10px] ml-1.5 focus:outline-hidden cursor-pointer"
                            >
                              {activeBookReviewId === book.id ? 'Collapse Reviews' : 'View or Rate Book'}
                            </button>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isELib ? (
                            <a 
                              href={book.eUrl_aid} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-2.5 rounded-xl shadow-xs transition-all"
                            >
                              <span>Open PDF Reader</span> <ArrowUpRight className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <div className="flex flex-col items-end gap-1">
                              {book.copiesAvailable > 0 ? (
                                <span className="bg-emerald-50 text-emerald-700 font-bold text-[9.5px] px-2 py-1 rounded border border-emerald-150">Available</span>
                              ) : alreadyReserved ? (
                                <span className="bg-slate-100 text-slate-500 text-[10px] font-mono px-2 py-1 rounded">Hold Queue Placed</span>
                              ) : alreadyBorrowed ? (
                                <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded">Checked Out</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onReserveBook(book.id, student.id, student.name)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl shadow-xs cursor-pointer transition-all"
                                >
                                  Join Hold Queue
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SUB REVIEWS DISPLAY ACCORDION */}
                      {activeBookReviewId === book.id && (
                        <div className="border-t border-slate-100 pt-3 mt-2 bg-slate-50/50 p-3 rounded-xl space-y-3 transition-all">
                          <h5 className="font-extrabold text-slate-700 text-[10.5px]">Peer Commentary feed:</h5>
                          
                          <div className="space-y-2 max-h-36 overflow-y-auto">
                            {selfReviews.map(r => (
                              <div key={r.id} className="bg-white p-2.5 rounded-lg border border-slate-105 leading-relaxed text-[10px]">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-extrabold text-slate-700">{r.studentName}</span>
                                  <div className="flex items-center gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                                    ))}
                                  </div>
                                </div>
                                <p className="text-slate-500 italic">"{r.comment}"</p>
                              </div>
                            ))}
                            {selfReviews.length === 0 && (
                              <p className="text-[10px] text-slate-400 italic">No ratings logged yet. Be the first to leave a feedback rating below!</p>
                            )}
                          </div>

                          {/* Write Review Form */}
                          <form onSubmit={(e) => handleReviewSubmit(e, book.id)} className="border-t pt-2 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-600 text-[10px]">Your Rating:</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => setNewReviewRating(val)}
                                    className="focus:outline-hidden cursor-pointer"
                                  >
                                    <Star className={`w-4 h-4 ${val <= newReviewRating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={newReviewComment}
                                onChange={(e) => setNewReviewComment(e.target.value)}
                                placeholder="Write your anonymous book feedback (e.g. Read Chapters 2-4, very helpful for algorithms exam)..."
                                className="flex-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[10.5px] font-medium"
                              />
                              <button
                                type="submit"
                                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-[9.5px] uppercase"
                              >
                                Submit
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Status Sidebar */}
            <div className="space-y-4">
              <div className="bg-slate-100/40 p-4 rounded-xl border border-slate-200/50 space-y-4">
                <h4 className="font-extrabold text-[11px] text-slate-800 uppercase tracking-widest">Active Textbook Loans ({myLoans.length})</h4>
                
                <div className="space-y-2">
                  {myLoans.map(l => (
                    <div key={l.id} className="bg-white p-3 border border-slate-150 rounded-xl space-y-1">
                      <p className="font-bold text-slate-800 leading-tight truncate">{l.bookTitle}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Due date: <strong className="text-rose-600">{l.dueDate}</strong></p>
                    </div>
                  ))}
                  {myLoans.length === 0 && (
                    <p className="text-slate-400 italic py-1">Zero books out currently.</p>
                  )}
                </div>
              </div>

              <div className="bg-slate-100/40 p-4 rounded-xl border border-slate-200/50 space-y-4">
                <h4 className="font-extrabold text-[11px] text-slate-800 uppercase tracking-widest">Pending Queues ({myReservations.length})</h4>
                <div className="space-y-2">
                  {myReservations.map(r => (
                    <div key={r.id} className="bg-white p-3 border border-slate-150 rounded-xl flex justify-between items-center">
                      <div className="truncate pr-2">
                        <p className="font-bold text-slate-800 truncate text-[10.5px]">{r.bookTitle}</p>
                        <p className="text-[9px] text-slate-400 font-mono">Placed: {r.reservationDate}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onCancelReservation(r.id)}
                        className="bg-slate-100 text-slate-600 font-bold text-[9px] px-2 py-1 rounded inline-block cursor-pointer hover:bg-slate-200"
                      >
                        Cancel Hold
                      </button>
                    </div>
                  ))}
                  {myReservations.length === 0 && (
                    <p className="text-slate-400 italic py-1">No pending reserves queue.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB TAB 2: RFID SELF-CHECKOUT KIOSK */}
        {subTab === 'rfid' && (
          <div className="bg-white p-6 rounded-xl border border-slate-100 space-y-6">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
              <div>
                <h3 className="text-base font-black text-slate-850 flex items-center gap-1.5">
                  <Cpu className="w-5 h-5 text-blue-600 animate-pulse" />
                  RFID Self-Service Checkout & Return Kiosk Desk
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Use Contactless Radio Frequency identification to self-borrow and return library resources instantly.</p>
              </div>
              <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                RFID Desk Terminal: Online
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Simulator Hardware Console */}
              <div className="lg:col-span-2 bg-slate-950 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-5">
                <span className="text-[9px] uppercase font-bold tracking-wider font-mono text-blue-450 block">• Kiosk Terminal Interface •</span>
                
                {/* Interface Screen */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 min-h-36 space-y-3 font-mono leading-relaxed text-[10.5px]">
                  
                  {!rfidStudentTapped ? (
                    <div className="text-center py-6 space-y-3">
                      <div className="animate-pulse flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-blue-900/40 border border-blue-500/50 flex items-center justify-center mb-2">
                          <Fingerprint className="w-6 h-6 text-blue-400" />
                        </div>
                        <p className="text-blue-300 font-extrabold uppercase tracking-wide">Ready for patron identification card</p>
                        <p className="text-[9px] text-slate-500 mt-1">Tap your student RFID badge scanner array to request checkout authorization.</p>
                      </div>

                      <button
                        type="button"
                        onClick={handleRFIDTapCard}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] px-4 py-2.5 rounded-xl uppercase tracking-wider cursor-pointer"
                      >
                        [ Simulate Library Badge RFID Tap ]
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-blue-950/40 border border-blue-900/35 p-2 rounded-lg text-blue-200">
                        <span>💳 CHIP: COMP-STUD-{student.id}</span>
                        <span className="font-bold">AUTHORIZED: {student.name}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Selector */}
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Select textbook on tray</label>
                          <select
                            value={rfidSelectedBookId}
                            onChange={(e) => setRfidSelectedBookId(e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5 w-full font-bold focus:outline-hidden"
                          >
                            <option value="">-- Choose Book Catalog Item --</option>
                            {books.filter(b => b.type === 'Physical Book').map(b => (
                              <option key={b.id} value={b.id}>{b.title} ({b.copiesAvailable} copies left)</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleRFIDCheckoutExecute}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase py-2.5 rounded-xl cursor-pointer"
                          >
                            Execute RFID Checkout Scan
                          </button>
                        </div>

                        {/* Status logs */}
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 max-h-32 overflow-y-auto text-slate-400 text-[10px] space-y-1">
                          <strong className="text-slate-300 block mb-1">Terminal Scanner logs:</strong>
                          <p className="text-[9px] text-blue-400 font-mono">&gt; RFID Reader initialized on port dev/rfid0</p>
                          <p className="text-[9px] text-emerald-400 font-mono">&gt; Antigravity antenna gain at 25dBm</p>
                          {scanActionStatus && (
                            <p className="text-[9.5px] font-bold text-amber-500 font-mono leading-normal">&gt;&gt; {scanActionStatus}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between border-t border-slate-800 pt-3">
                        <button
                          type="button"
                          onClick={() => { setRfidStudentTapped(false); setScanActionStatus(''); }}
                          className="text-[#f451f4] hover:underline font-bold text-[10px]"
                        >
                          Lock / Log-Out Terminal
                        </button>
                        <span className="text-slate-500 text-[9px]">Transmitting to central database...</span>
                      </div>
                    </div>
                  )}

                </div>

                {/* Return Simulation Deck */}
                {myLoans.length > 0 && rfidStudentTapped && (
                  <div className="border-t border-slate-800 pt-4 space-y-3">
                    <h5 className="font-extrabold text-slate-300 text-[11px] uppercase tracking-wider font-mono">Simulate Rapid Return Drop tray</h5>
                    <p className="text-[10px] text-slate-500">Drop borrowed volume onto return belt tray. Magnetic reader scanner detects RFID barcode chips automatically.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {myLoans.map(loan => (
                        <div key={loan.id} className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex justify-between items-center text-[10px]">
                          <div className="truncate max-w-[65%]">
                            <p className="text-slate-200 font-bold truncate">{loan.bookTitle}</p>
                            <p className="text-slate-500 text-[9px] font-mono">ID: {loan.bookId}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRFIDReturnExecute(loan.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9.5px] px-2.5 py-1.5 rounded-lg uppercase cursor-pointer"
                          >
                            Drop On Scanner
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RFID Quick Instructions */}
              <div className="bg-slate-50 p-4 border rounded-2xl border-slate-200 space-y-4 text-slate-700 leading-normal">
                <span className="text-[9.5px] font-bold uppercase tracking-widest text-slate-500 block">Kiosk operation Guide</span>
                
                <h4 className="font-extrabold text-[12px] text-slate-800">Hardware Self-Checkout system</h4>
                <p className="text-[10.5px]">To borrow books via RFID checkout terminals, perform the following actions:</p>
                
                <ul className="list-disc pl-4 space-y-1.5 text-[10px] text-slate-600">
                  <li>Tap your active student library smartcard.</li>
                  <li>Verify matching photo identifier credentials on LCD.</li>
                  <li>Place the book directly onto the scanner plate array.</li>
                  <li>Click <strong>Execute RFID Checkout Scan</strong>.</li>
                  <li>Confirm status indicator glows green before passing security gates otherwise alarm will beep.</li>
                </ul>

                <div className="bg-amber-500/10 border border-amber-600/30 p-3 rounded-lg text-[9.5px] text-amber-900 space-y-1">
                  <span className="font-extrabold uppercase">Gate Security Policy Notice</span>
                  <p>In accordance with high school resource laws, students are limited to 3 textbooks. Alarm sensors verify matching digital RFID leases upon gates exit.</p>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* SUB TAB 3: BIOMETRIC ENTRANCE GATES */}
        {subTab === 'biometric' && (
          <div className="bg-white p-6 rounded-xl border border-slate-100 space-y-6">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
              <div>
                <h3 className="text-base font-black text-slate-850 flex items-center gap-1.5">
                  <Fingerprint className="w-5 h-5 text-emerald-600 animate-pulse" />
                  Library Biometric Entrance Logging Gate
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Simulates optical fingerprint key verification and facial scanner integration controls placed at physical library boundaries.</p>
              </div>
              <div className="bg-emerald-100 px-3 py-1.5 rounded-lg text-[9px] font-mono text-emerald-700 font-extrabold uppercase">
                Active Scanner: ONLINE
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Hardware simulation box */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-200 text-center space-y-4">
                
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Biometric Entrance Gate controller</span>
                
                {/* Method selector */}
                <div className="inline-flex bg-slate-800 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => { setBioMethod('fingerprint'); setBioStatus({ type: 'idle', message: '' }); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      bioMethod === 'fingerprint' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🔬 Fingerprint Scanner
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBioMethod('face'); setBioStatus({ type: 'idle', message: '' }); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      bioMethod === 'face' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    👁️ Facial Cam Scanner
                  </button>
                </div>

                {/* Optical sensor scanner panel container */}
                <div className="relative w-40 h-40 rounded-full border border-slate-700 bg-slate-950 flex items-center justify-center cursor-pointer hover:border-emerald-500 transition-all flex-col space-y-1">
                  {bioScanning ? (
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-pulse flex flex-col items-center justify-center">
                      <Scan className="w-14 h-14 text-emerald-400 animate-spin" />
                      <span className="text-[9px] tracking-wider text-emerald-300 uppercase font-bold font-mono mt-1">Acquiring template...</span>
                    </div>
                  ) : null}

                  {bioMethod === 'fingerprint' ? (
                    <Fingerprint className="w-16 h-16 text-emerald-500 hover:scale-105 transition-transform" />
                  ) : (
                    <Scan className="w-16 h-16 text-emerald-500 hover:scale-105 transition-transform" />
                  )}
                  <span className="text-[8.5px] uppercase tracking-wider font-mono text-slate-500">Tap Sensor Array</span>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleBiometricAuthenticate}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] uppercase tracking-wider px-6 py-2.5 rounded-xl shadow-xs cursor-pointer"
                  >
                    Simulate entrance Gate check-In
                  </button>
                  <p className="text-[9.5px] text-slate-500">Simulates physical walk-up check-in. Clearance evaluates negative financial metrics before trigger.</p>
                </div>

                {/* Status response panel */}
                {bioStatus.type !== 'idle' && (
                  <div className={`p-4 rounded-xl border text-[11px] max-w-md ${
                    bioStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-250' : 'bg-rose-500/10 border-rose-500/30 text-rose-250'
                  }`}>
                    {bioStatus.type === 'success' ? (
                      <div className="space-y-1">
                        <p className="font-extrabold uppercase text-emerald-400 tracking-wider flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-bounce" /> Verified entrance check-in SUCCESS
                        </p>
                        <p className="font-normal text-slate-300 leading-normal">{bioStatus.message}</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-extrabold uppercase text-rose-450 tracking-wider flex items-center justify-center gap-1">
                          <AlertCircle className="w-4 h-4 text-rose-500" /> verification failure: ACCESS REJECTED
                        </p>
                        <p className="font-normal text-slate-300 leading-normal">{bioStatus.message}</p>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Entrance Gate logs side log */}
              <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 flex flex-col space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Secure Live Entrance log streams</span>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {libraryGateLogs.map(log => {
                    const isSuccess = log.status === 'success';
                    return (
                      <div key={log.id} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1 text-[10px]">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-slate-700">{log.patronName}</span>
                          <span className={`text-[8px] font-mono px-1 rounded uppercase font-bold ${
                            isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {log.status === 'success' ? 'Granted' : 'Denied'}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400 text-[9px]">
                          <span>Method: <strong className="font-mono text-slate-600">{log.authMethod}</strong></span>
                          <span>{log.timestamp}</span>
                        </div>
                        {!isSuccess && log.reason && (
                          <p className="text-rose-500 font-medium italic mt-1 text-[9.5px]">Blocked: "{log.reason}"</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* SUB TAB 4: LMS EXAM PAPER ARCHIVE */}
        {subTab === 'lms' && (
          <div className="bg-white p-6 rounded-xl border border-slate-100 space-y-6">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
              <div>
                <h3 className="text-base font-black text-slate-850 flex items-center gap-1.5">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Past National & Internal Exam Paper Archive
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Access revision repositories, national papers (KCSE/IGCSE), and midterm/final exams matching school course modules.</p>
              </div>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2.5 py-1 rounded-lg border border-indigo-150 font-bold font-mono">
                Digitized Archive: QC-3
              </span>
            </div>

            {/* Filter Exam Papers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search exam paper indices (e.g. Midterm, KCSE Revision)..."
                  value={examSearch}
                  onChange={(e) => setExamSearch(e.target.value)}
                  className="w-full border p-2.5 pl-10 rounded-xl bg-white font-bold text-xs"
                />
              </div>

              <select
                value={examFilter}
                onChange={(e) => setExamFilter(e.target.value)}
                className="bg-white border rounded-xl px-3 text-xs font-bold cursor-pointer focus:outline-hidden"
              >
                <option value="All">All Exam classifications</option>
                <option value="Midterm">Midterm Exams</option>
                <option value="Final">Final Exams</option>
                <option value="National Exam (KCSE/IGCSE)">National Revision Papers</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {localExamPapers
                .filter(ep => {
                  const matchS = ep.title.toLowerCase().includes(examSearch.toLowerCase()) || ep.subjectCode.toLowerCase().includes(examSearch.toLowerCase());
                  const matchF = examFilter === 'All' || ep.examType === examFilter;
                  return matchS && matchF;
                })
                .map(ep => (
                  <div key={ep.id} className="bg-slate-50/50 hover:bg-white border border-slate-150 p-4 rounded-xl flex flex-col justify-between space-y-4 hover:shadow-xs hover:border-indigo-400 transition-all">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-150">
                          {ep.examType}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">{ep.year} Prep</span>
                      </div>
                      
                      <h4 className="font-extrabold text-[12px] text-slate-800 leading-snug">{ep.title}</h4>
                      
                      <p className="text-[10px] text-slate-500 font-mono">
                        Class syllabus Target: <strong className="text-slate-600">{ep.subjectCode}</strong>
                      </p>
                    </div>

                    <div className="flex justify-between items-center border-t pt-3 border-slate-100">
                      <span className="text-[9.5px] text-slate-400 font-bold font-mono">
                        {ep.downloadsCount} Decryptions
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownloadPaper(ep.id, ep.downloadUrl_aid)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[9px] tracking-wide uppercase px-3.5 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download PDF
                      </button>
                    </div>
                  </div>
                ))}
            </div>

          </div>
        )}

        {/* SUB TAB 5: PROCUREMENT PROPOSAL PORTAL */}
        {subTab === 'procure' && (
          <form onSubmit={handleProcurementSubmit} className="bg-white p-6 rounded-xl border border-slate-100 space-y-6">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
              <div>
                <h3 className="text-base font-black text-slate-850 flex items-center gap-1.5">
                  <Plus className="w-5 h-5 text-amber-500" />
                  Library Acquisitions & Procurement Suggestion Portal
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Formally propose new titles, resources, or textbook copies. Suggested approvals integrate with administrative purchase queues.</p>
              </div>
              <span className="bg-amber-50 text-amber-700 text-[9.5px] font-bold px-2.5 py-1 rounded-lg border border-amber-150">
                Live Suggestion Box
              </span>
            </div>

            {/* Procurement form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 space-y-4">
                <h4 className="font-extrabold text-[12px] text-slate-800">Propose New Textbook suggestions</h4>
                
                {procurementStatusMsg && (
                  <div className="bg-emerald-50 border border-emerald-150 text-emerald-800 p-3 rounded-xl text-[10.5px] font-bold">
                    {procurementStatusMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 block">Proposed Title *</label>
                    <input
                      type="text"
                      required
                      value={reqTitle}
                      onChange={(e) => setReqTitle(e.target.value)}
                      placeholder="e.g. Designing Data-Intensive Applications"
                      className="w-full bg-white border border-slate-205 p-2.5 rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 block">Author / Editor *</label>
                    <input
                      type="text"
                      required
                      value={reqAuthor}
                      onChange={(e) => setReqAuthor(e.target.value)}
                      placeholder="e.g. Martin Kleppmann"
                      className="w-full bg-white border border-slate-205 p-2.5 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 block">ISBN Code (Optional)</label>
                  <input
                    type="text"
                    value={reqIsbn}
                    onChange={(e) => setReqIsbn(e.target.value)}
                    placeholder="e.g. 978-1449373320"
                    className="w-full bg-white border border-slate-205 p-2.5 rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 block">Syllabus Justification / Reason *</label>
                  <textarea
                    rows={3}
                    required
                    value={reqReason}
                    onChange={(e) => setReqReason(e.target.value)}
                    placeholder="Detail why this book is critical for core units classrooms (e.g. Needed for B.Sc Semester 2 distributed systems lab coursework)..."
                    className="w-full bg-white border border-slate-205 p-2.5 rounded-xl text-xs font-semibold"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-5 py-3 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Transmit Suggestion Proposal</span>
                </button>
              </div>

              {/* Status checklist of student's own requests */}
              <div className="bg-slate-50 p-4 border rounded-2xl border-slate-200 flex flex-col space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Your Submitted recommendations ({bookRequests.filter(r => r.suggestedBy === student.name).length})</span>
                
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {bookRequests
                    .filter(r => r.suggestedBy === student.name)
                    .map(req => {
                      const isPending = req.status === 'pending';
                      const isApproved = req.status === 'approved';
                      return (
                        <div key={req.id} className="bg-white p-3 border border-slate-150 rounded-xl space-y-2 text-[10.5px]">
                          <div className="flex justify-between items-start gap-1">
                            <h5 className="font-extrabold text-slate-800 leading-snug line-clamp-2">{req.title}</h5>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono uppercase ${
                              isApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              isPending ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {req.status}
                            </span>
                          </div>
                          
                          <p className="text-slate-400 text-[10px]">by {req.author}</p>
                          
                          {req.adminFeedback && (
                            <div className="bg-slate-100 p-2 rounded-lg text-[9.5px] italic text-slate-650 leading-relaxed font-semibold">
                              <strong>Librarian comment:</strong> "{req.adminFeedback}"
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {bookRequests.filter(r => r.suggestedBy === student.name).length === 0 && (
                    <p className="text-slate-450 italic text-center py-2">No procurement suggestions logged yet.</p>
                  )}
                </div>
              </div>

            </div>

          </form>
        )}

        {/* SUB TAB 6: PERSONAL BADGES & ANALTICS */}
        {subTab === 'analytics' && (
          <div className="bg-white p-6 rounded-xl border border-slate-100 space-y-6">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
              <div>
                <h3 className="text-base font-black text-slate-850 flex items-center gap-1.5">
                  <Award className="w-5 h-5 text-pink-600" />
                  Your Personalized Reading Analytics & Gamified Milestones
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Monitor textbook circulation history metrics, checkout compliance statuses, and unlock literacy badges.</p>
              </div>
              <div className="bg-pink-50 text-pink-700 text-[10px] px-2.5 py-1 rounded-lg border border-pink-150 font-bold font-mono">
                Literacy badges Unlocked: {unlockedCount} / {readingMilestones.length}
              </div>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 border p-4.5 rounded-2xl text-center space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-450 tracking-wider block">Completed Books</span>
                <p className="text-xl font-black text-slate-800">{loans.filter(l => l.patronId === student.id && l.status === 'returned').length} titles</p>
              </div>

              <div className="bg-slate-50 border p-4.5 rounded-2xl text-center space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-455 tracking-wider block">Current checkout Active</span>
                <p className="text-xl font-black text-slate-800">{myLoans.length} active</p>
              </div>

              <div className="bg-slate-50 border p-4.5 rounded-2xl text-center space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-455 tracking-wider block">Syllabus compliance</span>
                <p className="text-xl font-black text-slate-800">
                  {Math.round(((loans.filter(l => l.patronId === student.id && getUnitRecommendationNote(l.bookId) !== null).length) / (loans.filter(l => l.patronId === student.id).length || 1)) * 100)}%
                </p>
              </div>

              <div className="bg-slate-50 border p-4.5 rounded-2xl text-center space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-455 tracking-wider block">Estimated studies Hours</span>
                <p className="text-xl font-black text-slate-800">{loans.filter(l => l.patronId === student.id).length * 15} hours</p>
              </div>
            </div>

            {/* Badges list section */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-[12.5px] text-slate-800 uppercase tracking-widest">• Literary Badge achievements •</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {readingMilestones.map(badge => {
                  const BIcon = badge.icon;
                  return (
                    <div 
                      key={badge.id}
                      className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${
                        badge.unlocked 
                          ? 'bg-gradient-to-br from-pink-50/20 to-white border-pink-200 shadow-xs' 
                          : 'bg-slate-50/50 border-slate-150 grayscale text-slate-400'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border uppercase font-black text-[9px] ${
                        badge.unlocked 
                          ? 'bg-pink-100 text-pink-600 border-pink-250 animate-pulse' 
                          : 'bg-slate-205 text-slate-400 border-slate-300'
                      }`}>
                        <BIcon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h5 className="font-extrabold text-slate-800 text-[11.5px] leading-none">{badge.name}</h5>
                          <span className={`text-[8px] font-bold px-1 py-0.2 rounded font-mono ${
                            badge.tier === 'Gold' ? 'bg-amber-100 text-amber-800' :
                            badge.tier === 'Silver' ? 'bg-slate-100 text-slate-600' :
                            badge.tier === 'Platinum' ? 'bg-blue-100 text-blue-800' :
                            'bg-orange-100 text-orange-850'
                          }`}>
                            {badge.tier}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-light leading-relaxed">{badge.desc}</p>
                        <p className="text-[9px] font-bold mt-1 font-mono">
                          {badge.unlocked ? '🔓 UNLOCKED ACCREDITATION' : '🔒 REQUIREMENT NOT MET'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
