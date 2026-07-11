import React, { useState } from 'react';
import { 
  Book, Loan, Reservation, Student, Lecturer, BookRequest, LibraryGateLog 
} from '../types';
import { 
  BookOpen, Plus, Search, Tag, Users, Calendar, AlertCircle, 
  CheckCircle2, XCircle, ArrowUpRight, ArrowDownLeft, FileText, 
  Barcode, MapPin, Sparkles, AlertTriangle, RefreshCw, Send, Eye, ShieldAlert
} from 'lucide-react';

interface LibraryHQProps {
  books: Book[];
  loans: Loan[];
  reservations: Reservation[];
  students: Student[];
  lecturers: Lecturer[];
  bookRequests?: BookRequest[];
  libraryGateLogs?: LibraryGateLog[];
  onAddBook: (book: Omit<Book, 'id'>) => void;
  onUpdateBook: (bookId: string, updatedFields: Partial<Book>) => void;
  onCheckoutBook: (bookId: string, patronId: string, patronName: string, patronRole: 'student' | 'lecturer', loanDays: number) => void;
  onReturnBook: (loanId: string, returnStatus: 'returned' | 'damaged' | 'lost', damageFee: number) => void;
  onUpdateBookRequestStatus?: (requestId: string, status: 'approved' | 'rejected', adminFeedback?: string) => void;
  onTriggerGateLog?: (log: Omit<LibraryGateLog, 'id' | 'timestamp'>) => void;
}

export default function LibraryHQ({
  books,
  loans,
  reservations,
  students,
  lecturers,
  bookRequests = [],
  libraryGateLogs = [],
  onAddBook,
  onUpdateBook,
  onCheckoutBook,
  onReturnBook,
  onUpdateBookRequestStatus = () => {},
  onTriggerGateLog = () => {}
}: LibraryHQProps) {
  // Navigation internal views
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'circulation' | 'reservations' | 'proposals' | 'livegatelogs'>('catalog');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // New Book Registration toggle & state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    edition: '1st Edition',
    purchasePrice: 1200,
    rackNumber: 'Rack-01',
    shelfRow: 'Row-A',
    libraryCode: '',
    type: 'Physical Book' as 'Physical Book' | 'E-Book',
    eUrl_aid: '',
    copiesTotal: 3,
    category: 'Computer Science'
  });

  // Issue/Checkout Book state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    bookId: '',
    patronId: '',
    loanDays: 14
  });

  // Check-In/Return process state
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState<Loan | null>(null);
  const [returnStatus, setReturnStatus] = useState<'returned' | 'damaged' | 'lost'>('returned');
  const [damageFee, setDamageFee] = useState<number>(0);

  // Selected physical mapping details barcode preview
  const [selectedBookBarcode, setSelectedBookBarcode] = useState<Book | null>(null);

  // Computed metrics
  const totalPhysicalBooks = books.filter(b => b.type === 'Physical Book').reduce((sum, b) => sum + b.copiesTotal, 0);
  const totalAvailablePhysical = books.filter(b => b.type === 'Physical Book').reduce((sum, b) => sum + b.copiesAvailable, 0);
  const activeBorrowedLoans = loans.filter(l => l.status === 'borrowed' || l.status === 'overdue').length;
  
  // Real-time calculated late fees
  const computeActiveLateFees = () => {
    let overdueFinesTotal = 0;
    loans.forEach(loan => {
      if (loan.status === 'borrowed') {
        const dueDate = new Date(loan.dueDate);
        const today = new Date();
        if (today > dueDate) {
          const diffMs = today.getTime() - dueDate.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          overdueFinesTotal += diffDays * 50; 
        }
      } else if (loan.status === 'overdue') {
        overdueFinesTotal += (loan.lateFeeAssessed || 450);
      }
    });
    return overdueFinesTotal;
  };

  const overdueLoansList = loans.filter(l => {
    if (l.status === 'overdue') return true;
    if (l.status === 'borrowed') {
      return new Date() > new Date(l.dueDate);
    }
    return false;
  });

  const categories = ['All', ...Array.from(new Set(books.map(b => b.category)))];

  // Filters
  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          book.isbn.includes(searchTerm) ||
                          book.libraryCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || book.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Save acquisitions handler
  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title || !newBook.author || !newBook.isbn) {
      alert('Please fill in title, author, and ISBN.');
      return;
    }
    const libCode = newBook.libraryCode || `LIB-${newBook.category.substring(0, 2).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    onAddBook({
      ...newBook,
      libraryCode: libCode,
      copiesAvailable: newBook.type === 'E-Book' ? 999 : newBook.copiesTotal
    });
    alert(`Success: Registered book "${newBook.title}" under Code: ${libCode}`);
    setShowAddForm(false);
    setNewBook({
      title: '',
      author: '',
      isbn: '',
      publisher: '',
      edition: '1st Edition',
      purchasePrice: 1200,
      rackNumber: 'Rack-01',
      shelfRow: 'Row-A',
      libraryCode: '',
      type: 'Physical Book',
      eUrl_aid: '',
      copiesTotal: 3,
      category: 'Computer Science'
    });
  };

  // Launch checkout
  const handleLaunchCheckout = (bookId: string) => {
    setCheckoutData({
      bookId,
      patronId: '',
      loanDays: 14
    });
    setShowCheckoutModal(true);
  };

  const handleProcessCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    const { bookId, patronId, loanDays } = checkoutData;
    if (!bookId || !patronId) {
      alert('Please select both a Book and a Borrower.');
      return;
    }

    const book = books.find(b => b.id === bookId);
    if (!book) return;

    // Resolve patron name and role
    const studentPatron = students.find(s => s.id === patronId || s.admissionNo === patronId);
    const lecturerPatron = lecturers.find(l => l.id === patronId || l.designatorCode === patronId);

    if (!studentPatron && !lecturerPatron) {
      alert('Error: Borrower Admission No / Staff ID code cannot be found in the current school roster.');
      return;
    }

    const patronIdResolved = studentPatron ? studentPatron.id : lecturerPatron!.id;
    const patronName = studentPatron ? studentPatron.name : lecturerPatron!.name;
    const patronRole = studentPatron ? ('student' as const) : ('lecturer' as const);

    // Enforce borrowing limits caps
    // Students capped at max 3 active loans, Lecturers max 6
    const activePatronLoansCount = loans.filter(l => l.patronId === patronIdResolved && (l.status === 'borrowed' || l.status === 'overdue')).length;
    const cap = studentPatron ? 3 : 6;
    if (activePatronLoansCount >= cap) {
      alert(`Policy Limit Block: Patron ${patronName} has reached their borrowing allowance limit cap containing ${activePatronLoansCount}/${cap} books. Please check in existing returns first.`);
      return;
    }

    // Check if the student has outstanding fine blocks!
    if (studentPatron) {
      const outstandingFines = studentPatron.ledger.filter(inv => inv.status === 'unpaid' && inv.description.toLowerCase().includes('library')).length;
      if (outstandingFines > 0) {
        alert(`Financial Block: Student ${patronName} has active unpaid library leviable fines inside their billing ledger. Outstanding balances must be cleared to resume book borrowing.`);
        return;
      }
    }

    onCheckoutBook(bookId, patronIdResolved, patronName, patronRole, loanDays);
    setShowCheckoutModal(false);
  };

  const executeReturnProcessing = () => {
    if (!selectedLoanForReturn) return;
    onReturnBook(selectedLoanForReturn.id, returnStatus, damageFee);
    setSelectedLoanForReturn(null);
    setDamageFee(0);
    setReturnStatus('returned');
  };

  return (
    <div className="space-y-6" id="library-admin-workspace">
      
      {/* HEADER ACTION SUMMARY AREA */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-blue-700 to-blue-900 border border-blue-800 text-white p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-white/10 text-white font-semibold text-[10px] tracking-widest px-2.5 py-1 rounded-full uppercase">Librarian Operations Console</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
             Core Library Inventory & Circulation
          </h2>
          <p className="text-xs text-blue-105 font-light max-w-xl">
            Register academic acquisitions, manage loan durations across student and lecturer grades, enforce fine caps, and sync accounts automatically to the central ledgers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-white hover:bg-slate-50 text-blue-900 font-extrabold text-xs uppercase tracking-wider px-4 py-3 rounded-xl transition-all shadow-sm flex items-center gap-1.5 self-stretch lg:self-auto justify-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Acquisition</span>
        </button>
      </div>

      {/* COUNTER ANALYTIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3">
          <div className="bg-blue-50 text-blue-600 p-2.5 rounded-lg shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Total Catalogued</span>
            <span className="text-lg font-black text-slate-800">{books.length} Titles</span>
            <span className="text-[10px] text-slate-500 block font-medium mt-0.5">{totalPhysicalBooks} physical copies</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3">
          <div className="bg-amber-50 text-amber-600 p-2.5 rounded-lg shrink-0">
            <Calendar className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Active Handouts</span>
            <span className="text-lg font-black text-slate-800">{activeBorrowedLoans} Books Out</span>
            <span className="text-[10px] text-emerald-600 block font-medium mt-0.5">{totalAvailablePhysical} copies remaining</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3">
          <div className="bg-rose-50 text-rose-600 p-2.5 rounded-lg shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Overdue Violations</span>
            <span className="text-lg font-black text-slate-800">{overdueLoansList.length} Accounts</span>
            <span className="text-[10px] text-rose-500 block font-mono font-bold mt-0.5">KES 50 daily rate fine</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3">
          <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-lg shrink-0">
            <AlertTriangle className="w-5 h-5 text-emerald-600 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Levied Ledger Fines</span>
            <span className="text-lg font-black text-slate-800">KES {computeActiveLateFees().toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 block font-medium mt-0.5">Synced with Accounting</span>
          </div>
        </div>

      </div>

      {/* ADD NEW BOOK FORM EXPANSION */}
      {showAddForm && (
        <form onSubmit={handleCreateBook} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-4 text-xs transition-all">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-600 block">Acquisition Form</span>
              <h3 className="text-sm font-bold text-slate-800">Register Book or Digital Asset</h3>
            </div>
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-700 font-extrabold cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-600">Resource Type</label>
              <select
                value={newBook.type}
                onChange={(e) => setNewBook({...newBook, type: e.target.value as 'Physical Book' | 'E-Book'})}
                className="w-full bg-white border border-slate-250 p-2.5 rounded-xl cursor-pointer font-medium"
              >
                <option value="Physical Book">Physical Resource (On-Shelf)</option>
                <option value="E-Book">Digital Aid / E-Book (Cloud Hosted)</option>
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="font-bold text-slate-600">Title of Book / Media</label>
              <input
                type="text"
                value={newBook.title}
                onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                placeholder="e.g. Clean Architecture: A Craftsman's Guide to Software Structure"
                className="w-full bg-white border border-slate-250 p-2.5 rounded-xl font-medium"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-600">Author(s)</label>
              <input
                type="text"
                value={newBook.author}
                onChange={(e) => setNewBook({...newBook, author: e.target.value})}
                placeholder="Robert C. Martin"
                className="w-full bg-white border border-slate-250 p-2.5 rounded-xl font-medium"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-600">ISBN Code / ID</label>
              <input
                type="text"
                value={newBook.isbn}
                onChange={(e) => setNewBook({...newBook, isbn: e.target.value})}
                placeholder="978-0134494166"
                className="w-full bg-white border border-slate-250 p-2.5 rounded-xl font-medium font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-600">Publisher</label>
              <input
                type="text"
                value={newBook.publisher}
                onChange={(e) => setNewBook({...newBook, publisher: e.target.value})}
                placeholder="Prentice Hall"
                className="w-full bg-white border border-slate-250 p-2.5 rounded-xl font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-600">Edition</label>
              <input
                type="text"
                value={newBook.edition}
                onChange={(e) => setNewBook({...newBook, edition: e.target.value})}
                placeholder="e.g. 1st Edition"
                className="w-full bg-white border border-slate-250 p-2.5 rounded-xl font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-600">Category Classification</label>
              <select
                value={newBook.category}
                onChange={(e) => setNewBook({...newBook, category: e.target.value})}
                className="w-full bg-white border border-slate-250 p-2.5 rounded-xl cursor-pointer font-medium"
              >
                <option value="Computer Science">Computer Science & Programming</option>
                <option value="Cybersecurity">Cybersecurity & Forensics</option>
                <option value="AI & Robotics">AI & Robotics</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Engineering">Engineering</option>
                <option value="Electrical Electronics">Electrical & Electronics</option>
                <option value="General Physics">General Physics</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-600">Acquisition Price (KES)</label>
              <input
                type="number"
                value={newBook.purchasePrice}
                onChange={(e) => setNewBook({...newBook, purchasePrice: Number(e.target.value)})}
                placeholder="3000"
                className="w-full bg-white border border-slate-250 p-2.5 rounded-xl font-medium"
              />
            </div>

            {newBook.type === 'Physical Book' ? (
              <>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Shelf Rack Physics Map</label>
                  <input
                    type="text"
                    value={newBook.rackNumber}
                    onChange={(e) => setNewBook({...newBook, rackNumber: e.target.value})}
                    placeholder="e.g. Rack-04"
                    className="w-full bg-white border border-slate-250 p-2.5 rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Shelf Row Assignment</label>
                  <input
                    type="text"
                    value={newBook.shelfRow}
                    onChange={(e) => setNewBook({...newBook, shelfRow: e.target.value})}
                    placeholder="e.g. Row-C"
                    className="w-full bg-white border border-slate-250 p-2.5 rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Stock Quantity (Copies)</label>
                  <input
                    type="number"
                    min={1}
                    value={newBook.copiesTotal}
                    onChange={(e) => setNewBook({...newBook, copiesTotal: Number(e.target.value)})}
                    className="w-full bg-white border border-slate-250 p-2.5 rounded-xl font-medium"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1 md:col-span-3">
                <label className="font-bold text-slate-600">Cloud Digital PDF / Journal Access Link</label>
                <input
                  type="url"
                  value={newBook.eUrl_aid}
                  onChange={(e) => setNewBook({...newBook, eUrl_aid: e.target.value})}
                  placeholder="https://e-library.zenti.edu/viewer/digital-asset.pdf"
                  className="w-full bg-white border border-slate-250 p-2.5 rounded-xl font-medium font-mono"
                  required={newBook.type === 'E-Book'}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="font-bold text-slate-600">Target Library Code (Optional)</label>
              <input
                type="text"
                value={newBook.libraryCode}
                onChange={(e) => setNewBook({...newBook, libraryCode: e.target.value.toUpperCase()})}
                placeholder="LIB-AUTO"
                className="w-full bg-white border border-slate-250 p-2.5 rounded-xl font-medium font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/50">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-slate-200 text-slate-600 font-bold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
            >
              Save to Catalog
            </button>
          </div>
        </form>
      )}

      {/* DASHBOARD MIDDLE NAV MENU */}
      <div className="border-b border-slate-200 flex space-x-4 overflow-x-auto pb-1.5 scrollbar-none">
        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`pb-3 font-bold text-xs uppercase tracking-wider whitespace-nowrap border-b-2 transition-all shrink-0 ${
            activeSubTab === 'catalog' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent text-slate-450 hover:text-slate-800'
          }`}
        >
           Catalog Index & Shelf Mapping ({books.length})
        </button>
        <button
          onClick={() => setActiveSubTab('circulation')}
          className={`pb-3 font-bold text-xs uppercase tracking-wider whitespace-nowrap border-b-2 transition-all shrink-0 ${
            activeSubTab === 'circulation' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent text-slate-450 hover:text-slate-800'
          }`}
        >
           Checking, Borrowing & Return Desk ({loans.length})
        </button>
        <button
          onClick={() => setActiveSubTab('reservations')}
          className={`pb-3 font-bold text-xs uppercase tracking-wider whitespace-nowrap border-b-2 transition-all shrink-0 ${
            activeSubTab === 'reservations' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent text-slate-450 hover:text-slate-800'
          }`}
        >
           Holds & Active Patron Reserves Queue ({reservations.length})
        </button>
        <button
          onClick={() => setActiveSubTab('proposals')}
          className={`pb-3 font-bold text-xs uppercase tracking-wider whitespace-nowrap border-b-2 transition-all shrink-0 ${
            activeSubTab === 'proposals' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent text-slate-450 hover:text-slate-800'
          }`}
        >
           Acquisitions & Procurements ({bookRequests.length})
        </button>
        <button
          onClick={() => setActiveSubTab('livegatelogs')}
          className={`pb-3 font-bold text-xs uppercase tracking-wider whitespace-nowrap border-b-2 transition-all shrink-0 ${
            activeSubTab === 'livegatelogs' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent text-slate-450 hover:text-slate-800'
          }`}
        >
           Smart Biometric Gate logs ({libraryGateLogs.length})
        </button>
      </div>

      {/* VIEW PANEL 1: CATALOG INDEX */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search resources by title, author, keyword, physical code, or ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat} Classification</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* CATALOG LIST TABLE */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Asset Title & Author</th>
                    <th className="p-3">Physical Rack</th>
                    <th className="p-3 text-center">Copies</th>
                    <th className="p-3 text-right">Circulation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredBooks.map(book => {
                    const isELib = book.type === 'E-Book';
                    return (
                      <tr 
                        key={book.id} 
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedBookBarcode?.id === book.id ? 'bg-blue-50/50' : ''}`}
                        onClick={() => setSelectedBookBarcode(book)}
                      >
                        <td className="p-3 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-slate-800 text-[11.5px] leading-snug">{book.title}</span>
                            <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              isELib ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' : 'bg-amber-50 text-amber-700 border border-amber-150'
                            }`}>
                              {book.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10.5px] text-slate-400">
                            <span>by <strong className="text-slate-600 font-bold">{book.author}</strong></span>
                            <span>•</span>
                            <span className="font-mono">{book.isbn}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          {isELib ? (
                            <span className="bg-slate-50 text-slate-450 border border-slate-200/60 font-mono font-bold text-[9px] px-2 py-0.5 rounded flex items-center gap-1 w-max">
                              <Sparkles className="w-3 h-3 text-purple-500" /> Digital
                            </span>
                          ) : (
                            <div className="space-y-0.5 text-[11px] font-semibold text-slate-600">
                              <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{book.rackNumber}</div>
                              <div className="text-[9px] text-slate-400 font-mono">{book.shelfRow}</div>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isELib ? (
                            <span className="text-slate-400 font-mono font-bold">∞</span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="font-mono font-bold text-slate-800">{book.copiesAvailable} / {book.copiesTotal}</span>
                              <div className="w-12 bg-slate-100 rounded-full h-1 mx-auto overflow-hidden">
                                <div 
                                  className="bg-blue-600 h-1 rounded-full" 
                                  style={{ width: `${Math.min(100, (book.copiesAvailable / book.copiesTotal) * 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {isELib ? (
                            <a 
                              href={book.eUrl_aid} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-indigo-650 hover:underline font-bold text-[10px] uppercase block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Open Portal
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleLaunchCheckout(book.id); }}
                              disabled={book.copiesAvailable <= 0}
                              className={`px-2.5 py-1.5 rounded-lg font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                                book.copiesAvailable > 0 
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs' 
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed hidden'
                              }`}
                            >
                              Checkout
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredBooks.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 italic">No matching books found in library catalog registry.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* BARCODE PREVIEW AND METADATA */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6 shadow-xs flex flex-col justify-between">
              
              {selectedBookBarcode ? (
                <div className="space-y-5 flex-1">
                  
                  {/* Title & Classification */}
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-blue-600 block">{selectedBookBarcode.category} • {selectedBookBarcode.type}</span>
                    <h3 className="text-base font-black text-slate-800 leading-snug">{selectedBookBarcode.title}</h3>
                    <p className="text-[11px] text-slate-500">Edition: <strong className="font-bold text-slate-700">{selectedBookBarcode.edition}</strong> | Publisher: <strong>{selectedBookBarcode.publisher}</strong></p>
                  </div>

                  {/* Physical Positioning Layout Map */}
                  {selectedBookBarcode.type === 'Physical Book' ? (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block">PHYSICAL MAP POSITIONING</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-medium block">Allocated Rack Row</span>
                          <span className="text-xs font-black text-slate-705 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" /> {selectedBookBarcode.rackNumber}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-medium block">Shelf Level Row</span>
                          <span className="text-xs font-black text-slate-705 font-mono">{selectedBookBarcode.shelfRow}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-medium block">Unit Purchase Cost</span>
                          <span className="text-xs font-black text-slate-705">KES {selectedBookBarcode.purchasePrice.toLocaleString()}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-medium block">Circulation Stock</span>
                          <span className="text-xs font-black text-slate-705 font-mono">{selectedBookBarcode.copiesAvailable} Available / {selectedBookBarcode.copiesTotal} Total</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /> CLOUD HOSTED DIGITAL AID</span>
                      <p className="text-[11px] text-slate-600 leading-normal font-light">
                        This digital resource is universally accessible. It is integrated within teachers' syllabi worksheets and does not deprecate physical stock allocations.
                      </p>
                      <a href={selectedBookBarcode.eUrl_aid} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-indigo-650 hover:underline font-bold text-[10.5px] uppercase mt-1">
                        Go to Hosting Portal <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {/* HIGH-FIDELITY VECTOR BARCODE GENERATOR */}
                  <div className="bg-slate-50 border border-dashed border-slate-250 rounded-2xl p-5 flex flex-col items-center justify-center space-y-3">
                    <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-slate-400">Digital Tracking Barcode System</span>
                    
                    {/* Visual Barcode Columns block */}
                    <div className="flex flex-col items-center p-3.5 bg-white rounded-lg shadow-xs border border-slate-100">
                      {/* Barcode SVG representation */}
                      <svg viewBox="0 0 100 24" className="w-56 h-12">
                        {/* Generate patterned black columns */}
                        <g fill="black">
                          <rect x="2" width="1" height="24" />
                          <rect x="4" width="0.5" height="24" />
                          <rect x="5.5" width="2" height="24" />
                          <rect x="8.5" width="1" height="24" />
                          <rect x="11" width="0.7" height="24" />
                          <rect x="12.5" width="2.5" height="24" />
                          <rect x="16" width="0.5" height="24" />
                          <rect x="17.5" width="1.5" height="24" />
                          <rect x="21" width="1" height="24" />
                          <rect x="23" width="2.2" height="24" />
                          <rect x="26.5" width="0.5" height="24" />
                          <rect x="28" width="1.5" height="24" />
                          <rect x="31.5" width="1.2" height="24" />
                          <rect x="33.5" width="0.6" height="24" />
                          <rect x="35" width="2" height="24" />
                          <rect x="38" width="0.8" height="24" />
                          <rect x="40.5" width="2.5" height="24" />
                          <rect x="44" width="1" height="24" />
                          <rect x="46" width="0.5" height="24" />
                          <rect x="47.5" width="1.8" height="24" />
                          <rect x="51" width="1" height="24" />
                          <rect x="53" width="1.2" height="24" />
                          <rect x="55.5" width="0.5" height="24" />
                          <rect x="57" width="2" height="24" />
                          <rect x="60" width="1" height="24" />
                          <rect x="62" width="1.5" height="24" />
                          <rect x="64.5" width="0.8" height="24" />
                          <rect x="66" width="2.5" height="24" />
                          <rect x="69.5" width="1" height="24" />
                          <rect x="71.5" width="0.5" height="24" />
                          <rect x="73" width="2.2" height="24" />
                          <rect x="76.5" width="1.2" height="24" />
                          <rect x="78.5" width="0.5" height="24" />
                          <rect x="80" width="1.8" height="24" />
                          <rect x="83" width="1" height="24" />
                          <rect x="85" width="1" height="24" />
                          <rect x="87.5" width="0.5" height="24" />
                          <rect x="89" width="2" height="24" />
                          <rect x="92" width="1" height="24" />
                          <rect x="94" width="2.2" height="24" />
                          <rect x="97" width="1" height="24" />
                        </g>
                      </svg>
                      <span className="font-mono text-[10.5px] font-black text-slate-800 tracking-wider mt-1 border-t pt-0.5 border-slate-100">{selectedBookBarcode.libraryCode}</span>
                    </div>

                    <div className="flex flex-col items-center text-[10px] text-center text-slate-450 leading-relaxed font-light">
                      <span>Assigned Code: <strong>{selectedBookBarcode.libraryCode}</strong> | ISBN: <strong>{selectedBookBarcode.isbn}</strong></span>
                      <span>Print thermal stickers to mount physical spines for rapid scanner lookups.</span>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-3 flex-1">
                  <div className="bg-slate-50 p-4 rounded-full border border-slate-100 text-slate-350">
                    <Barcode className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-xs text-slate-500">Asset Barcode Terminal</p>
                    <p className="text-[11px] font-light max-w-xs">Select any textbook or record file from the catalog index to visualize its physical map, barcode layout, and checkout controls.</p>
                  </div>
                </div>
              )}

              {selectedBookBarcode && (
                <div className="grid grid-cols-2 gap-2 border-t pt-4 border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedBookBarcode.type === 'E-Book') {
                        alert('Digital assets are accessible directly in the student portal on catalog search.');
                        return;
                      }
                      handleLaunchCheckout(selectedBookBarcode.id);
                    }}
                    disabled={selectedBookBarcode.copiesAvailable <= 0 && selectedBookBarcode.type === 'Physical Book'}
                    className={`w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-wider text-center cursor-pointer ${
                      selectedBookBarcode.copiesAvailable > 0 || selectedBookBarcode.type === 'E-Book'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-slate-100 text-slate-450 cursor-not-allowed'
                    }`}
                  >
                    Issue/Loans checkout
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newTitle = prompt('Update Book Title:', selectedBookBarcode.title);
                      if (newTitle) {
                        onUpdateBook(selectedBookBarcode.id, { title: newTitle });
                      }
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-650 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider text-center cursor-pointer"
                  >
                    Modify Title
                  </button>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* VIEW PANEL 2: CIRCULATION ACTIONS (BORROWED / RETURNED) */}
      {activeSubTab === 'circulation' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-55 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-2">
            <div>
              <span className="text-[10px] font-extrabold text-blue-600 block uppercase">Circulation Desk Ledger</span>
              <h4 className="text-xs font-black text-slate-705">Active checkout leases & history log</h4>
            </div>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Asset Title</th>
                <th className="p-3">Borrower (Patron)</th>
                <th className="p-3">Checkout Date</th>
                <th className="p-3">Due Date</th>
                <th className="p-3">Late Fines Assessed</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Process Desk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 leading-relaxed">
              {loans.map(loan => {
                // Calculate live fine if status is borrowed and is late
                const dueDate = new Date(loan.dueDate);
                const today = new Date();
                let isLate = today > dueDate && loan.status === 'borrowed';
                let computedFine = loan.lateFeeAssessed || 0;
                if (isLate) {
                  const diffMs = today.getTime() - dueDate.getTime();
                  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                  computedFine = diffDays * 50; 
                }

                let statusColor = 'bg-slate-100 text-slate-650';
                if (loan.status === 'borrowed') {
                  statusColor = isLate ? 'bg-rose-100 text-rose-700 font-extrabold animate-pulse' : 'bg-blue-50 text-blue-700';
                } else if (loan.status === 'overdue') {
                  statusColor = 'bg-rose-105 text-rose-800 font-black border border-rose-300';
                } else if (loan.status === 'returned') {
                  statusColor = 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-150';
                } else if (loan.status === 'lost') {
                  statusColor = 'bg-red-50 text-red-700 font-black border border-red-200';
                } else if (loan.status === 'damaged') {
                  statusColor = 'bg-amber-50 text-amber-800 font-black border border-amber-200';
                }

                return (
                  <tr key={loan.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-805">{loan.bookTitle}</td>
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-slate-800 text-[11.5px]">{loan.patronName}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{loan.patronRole}</p>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">{loan.checkoutDate}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">{loan.dueDate}</td>
                    <td className="p-3 font-mono font-bold text-slate-700">
                      {computedFine > 0 ? (
                        <span className="text-rose-600">KES {computedFine.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`text-[9.5px] px-2.5 py-1 rounded font-mono ${statusColor}`}>
                        {isLate ? 'OVERDUE LATE' : loan.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {(loan.status === 'borrowed' || loan.status === 'overdue') ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLoanForReturn(loan);
                            setReturnStatus('returned');
                            setDamageFee(0);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm cursor-pointer"
                        >
                          Return Desk
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400 italic">Completed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {loans.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-450 italic">No checkout leases logged in circulation history ledger.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW PANEL 3: smart holds queues */}
      {activeSubTab === 'reservations' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100">
            <span className="text-[10px] font-extrabold text-blue-600 block uppercase">Patron holds queue</span>
            <h4 className="text-xs font-black text-slate-700">High-demand active reservations list</h4>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Book Title</th>
                <th className="p-3">Borrower (Patron)</th>
                <th className="p-3">Reservation Held On</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions Desk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-semibold text-slate-650">
              {reservations.map(res => {
                let statusColor = 'bg-amber-50 text-amber-700 border border-amber-150';
                if (res.status === 'fulfilled') statusColor = 'bg-emerald-50 text-emerald-800 border border-emerald-150';
                if (res.status === 'cancelled') statusColor = 'bg-slate-50 text-slate-400 border border-slate-200/60';

                return (
                  <tr key={res.id}>
                    <td className="p-3 font-bold text-slate-800">{res.bookTitle}</td>
                    <td className="p-3 text-slate-707">{res.patronName}</td>
                    <td className="p-3 font-mono text-slate-500">{res.reservationDate}</td>
                    <td className="p-3">
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${statusColor}`}>{res.status.toUpperCase()}</span>
                    </td>
                    <td className="p-3 text-right">
                      {res.status === 'pending' ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const book = books.find(b => b.id === res.bookId);
                              if (book && book.copiesAvailable > 0) {
                                onCheckoutBook(book.id, res.patronId, res.patronName, 'student', 14);
                              } else {
                                alert('Error: Book copies are still unavailable to lease.');
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9.5px] px-2.5 py-1 rounded"
                          >
                            Acquire Pickup
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono text-slate-400 text-[10px] italic">Processed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {reservations.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-450 italic">No holds or queue reservations are active currently.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CHECKOUT BOOK POPUP REGISTER MODAL */}
      {showCheckoutModal && (() => {
        const bookObj = books.find(b => b.id === checkoutData.bookId);
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <form onSubmit={handleProcessCheckout} className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-md p-6 space-y-4 text-xs">
              <div className="flex justify-between items-center pb-2 border-b">
                <h4 className="text-sm font-black text-slate-850">Circulation Desk - Issue Checkout Leases</h4>
                <button type="button" onClick={() => setShowCheckoutModal(false)} className="text-slate-400 text-sm font-black">X</button>
              </div>

              {bookObj && (
                <div className="bg-blue-50 border border-blue-100/60 p-3 rounded-lg text-slate-800 leading-normal space-y-1">
                  <p className="font-extrabold text-[12.5px]">{bookObj.title}</p>
                  <p className="text-[10px] text-slate-500 font-light font-mono">ISBN: {bookObj.isbn} | Library Code: {bookObj.libraryCode}</p>
                  <p className="text-[10px] text-emerald-600 font-bold font-mono">Stock available: {bookObj.copiesAvailable} physical assets</p>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-650">Select Patron (Roster ID / Admission Code)</label>
                <select
                  value={checkoutData.patronId}
                  onChange={(e) => setCheckoutData({...checkoutData, patronId: e.target.value})}
                  className="w-full bg-white border border-slate-200 p-2.5 rounded-xl cursor-pointer font-extrabold text-xs"
                  required
                >
                  <option value="">-- Choose Borrower --</option>
                  <optgroup label="Student Body">
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.admissionNo})</option>
                    ))}
                  </optgroup>
                  <optgroup label="Academic Faculty / Staff">
                    {lecturers.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.designatorCode})</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-650">Loan Period Limitation</label>
                <select
                  value={checkoutData.loanDays}
                  onChange={(e) => setCheckoutData({...checkoutData, loanDays: Number(e.target.value)})}
                  className="w-full bg-white border border-slate-200 p-2.5 rounded-xl cursor-pointer font-bold"
                >
                  <option value={7}>Short Lease (7 Days)</option>
                  <option value={14}>Standard Lease (14 Days) - Students</option>
                  <option value={30}>Faculty Extended (30 Days)</option>
                  <option value={60}>Special Semester Exemption (60 Days)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t text-[10px] uppercase tracking-wider font-extrabold">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Complete Checkout
                </button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* RETURN LOG PROCESS DESK MODAL */}
      {selectedLoanForReturn && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 text-xs">
            <h4 className="text-sm font-black text-slate-800 border-b pb-2">Circulation Desk - Return Book Auditing</h4>
            
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Book Title</span>
              <p className="font-extrabold text-slate-800">{selectedLoanForReturn.bookTitle}</p>
              <p className="text-[10px] text-slate-500 font-light font-mono">Issued to: {selectedLoanForReturn.patronName} ({selectedLoanForReturn.patronRole})</p>
              <p className="text-[10px] text-slate-500 font-mono">Strict Deadline: {selectedLoanForReturn.dueDate}</p>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-650 block">Audited Check-In Status</label>
              <select
                value={returnStatus}
                onChange={(e) => setReturnStatus(e.target.value as 'returned' | 'damaged' | 'lost')}
                className="w-full bg-white border border-slate-200 p-2.5 rounded-xl cursor-pointer font-extrabold"
              >
                <option value="returned">Normal Satisfactory Return (Full Stock Restored)</option>
                <option value="damaged">Damaged State Levy (Structural repair penalty assessed)</option>
                <option value="lost">Lost Asset Claim (Charge full replacement value to ledger)</option>
              </select>
            </div>

            {returnStatus === 'damaged' && (
              <div className="space-y-1">
                <label className="font-bold text-slate-650 block">Structural Damage Penalty (KES)</label>
                <input
                  type="number"
                  value={damageFee}
                  onChange={(e) => setDamageFee(Number(e.target.value))}
                  placeholder="e.g. 1000"
                  className="w-full bg-white border border-slate-200 p-2.5 rounded-xl font-bold font-mono"
                />
                <span className="text-[9.5px] text-slate-400 block font-light leading-normal">Levies the student ledger dynamically and keeps the book in inventory under repair.</span>
              </div>
            )}

            {returnStatus === 'lost' && (
              <div className="bg-red-50 text-red-800/80 p-3 rounded-lg border border-red-100 font-light flex gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-[10.5px]">
                  <p className="font-extrabold">LOST ASSET TRIGGER EVENT</p>
                  <p>Incurs a strict automatic **KES 5,000 replacement penalty** synced directly to the student ledger. It subtracts 1 copy from the total library stock records permanently.</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t font-semibold">
              <button
                type="button"
                onClick={() => setSelectedLoanForReturn(null)}
                className="px-4 py-2 bg-slate-200 text-slate-655 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeReturnProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg uppercase tracking-wider font-extrabold text-[10px]"
              >
                Process Desk Check-in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PANEL 4: ACQUISITIONS & SMART PROCUREMENT SUGGESTIONS */}
      {activeSubTab === 'proposals' && (
        <div className="space-y-6">
          <div className="bg-amber-500/5 p-5 rounded-2xl border border-amber-505/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <span className="bg-amber-100 text-amber-800 font-bold text-[9px] tracking-wide px-2 py-0.5 rounded-full uppercase">Predictive Procurement Analytics</span>
              <h4 className="text-sm font-extrabold text-slate-805 leading-tight">Classroom Demand & Volume Recommendation Engine</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed max-w-2xl">
                Our model aggregates syllabus textbook hold sizes with active library checkout trends. Volumes showing active queues recommend automated purchase budget bids.
              </p>
            </div>
            {/* Predictive suggestions algorithm */}
            <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs space-y-1.5 min-w-64">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Procurement Flag:</span>
              {reservations.filter(r => r.status === 'pending').length > 0 ? (
                <div className="space-y-1">
                  <span className="text-xs font-black text-rose-600 flex items-center gap-1">
                     {reservations.filter(r => r.status === 'pending').length} Unfulfilled Reserve Holds!
                  </span>
                  <p className="text-[10px] text-slate-500">Suggest purchasing <strong>3 additional copies</strong> of high-demand catalog categories to restore standard checkout ratios.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-xs font-black text-emerald-600 flex items-center gap-1">
                    ✓ Classroom Ratios Healthy
                  </span>
                  <p className="text-[10px] text-slate-500">Current textbook inventories satisfy both active student loans and teacher equipment kits.</p>
                </div>
              )}
            </div>
          </div>

          {/* SUGGESTIONS LIST GATEWAY */}
          <div className="bg-white border rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-55 border-b flex justify-between items-center">
              <span className="font-extrabold text-xs text-slate-700">Student & Lecturer Procurement Proposals</span>
              <span className="text-[10.5px] font-mono text-slate-400">Total Suggested: {bookRequests.length}</span>
            </div>

            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                <tr>
                  <th className="p-3">Title & Editor</th>
                  <th className="p-3">Submitted By (Grades/Staff)</th>
                  <th className="p-3">Proposed Reason / Justification</th>
                  <th className="p-3">ISBN Identity</th>
                  <th className="p-3">Budget Status</th>
                  <th className="p-3 text-right">Process Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 leading-relaxed font-semibold">
                {bookRequests.map(req => {
                  const isApproved = req.status === 'approved';
                  const isRejected = req.status === 'rejected';
                  const isPending = req.status === 'pending';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <p className="font-black text-slate-800 text-[11.5px]">{req.title}</p>
                          <p className="text-slate-450 text-[10px]">by {req.author}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-slate-705">{req.suggestedBy}</p>
                          <span className={`text-[8.5px] uppercase font-bold px-1 rounded ${
                            req.suggestorRole === 'lecturer' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {req.suggestorRole}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-500 font-normal text-[11px] max-w-xs truncate">
                        {req.reason || 'Syllabus reference aid.'}
                      </td>
                      <td className="p-3 font-mono text-slate-600 text-[11px]">
                        {req.isbn || 'N/A'}
                      </td>
                      <td className="p-3">
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                          isApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' :
                          isRejected ? 'bg-rose-50 text-rose-700 border border-rose-150' :
                          'bg-amber-50 text-amber-700 border border-amber-150'
                        }`}>
                          {req.status}
                        </span>
                        {req.adminFeedback && (
                          <p className="text-[10px] text-slate-450 italic mt-1 font-light leading-snug">Note: "{req.adminFeedback}"</p>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {isPending ? (
                          <div className="flex gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const fb = prompt('Add procurement feedback comments for this book:', 'Approved. Adding 5 copies to inventory.');
                                if (fb !== null) {
                                  // Call approved status
                                  onUpdateBookRequestStatus(req.id, 'approved', fb);
                                  // Instantly register this book in catalogue for full functional integration
                                  onAddBook({
                                    title: req.title,
                                    author: req.author,
                                    isbn: req.isbn || `ISBN-${Math.floor(1000000 + Math.random() * 9000000)}`,
                                    category: 'Computer Science',
                                    copiesTotal: 5,
                                    copiesAvailable: 5,
                                    type: 'Physical Book',
                                    purchasePrice: 1500,
                                    rackNumber: 'Rack-03',
                                    shelfRow: 'Row-B',
                                    publisher: 'Academic Press',
                                    edition: '1st Edition',
                                    eUrl_aid: '',
                                    libraryCode: `LIB-CS-${Math.floor(100 + Math.random() * 900)}`
                                  });
                                  alert(`Success: Approved suggestion, added "${req.title}" with 5 copies to library catalogue.`);
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] uppercase tracking-wide px-2.5 py-1.5 rounded-lg cursor-pointer"
                            >
                              Approve & Buy
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const fb = prompt('Enter rejection feedback reason details:', 'Budget caps reached for current syllabus semester.');
                                if (fb !== null) {
                                  onUpdateBookRequestStatus(req.id, 'rejected', fb);
                                }
                              }}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[9px] uppercase tracking-wide px-2.5 py-1.5 rounded-lg cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic font-light">Processed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {bookRequests.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">No incoming procurement suggestions submitted yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW PANEL 5: BIOMETRIC ENTRY SECURITY LOGS */}
      {activeSubTab === 'livegatelogs' && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-[9.5px] uppercase font-mono font-bold tracking-widest text-emerald-400">BIOMETRIC HARDWARE CORE STATUS: ONLINE</span>
                </div>
                <h3 className="text-sm font-extrabold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  RFID Gates & Touch ID Attendance Streamer
                </h3>
                <p className="text-slate-400 text-[10.5px] font-light max-w-xl">
                  Inspects RFID door badge swaps or finger authentication. Accounts flagged with unsettled library levies inside dynamic ledgers trigger refusal alerts.
                </p>
              </div>

              {/* Simulation triggers */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const names = ['Ian Mwangi', 'Nelly Wangari', 'David Omondi', 'Dr. Peter Cheruiyot'];
                    const rName = names[Math.floor(Math.random() * names.length)];
                    onTriggerGateLog({
                      patronName: rName,
                      patronId: rName.includes('Dr.') ? 'L-402' : 'S-809',
                      role: rName.includes('Dr.') ? 'lecturer' : 'student',
                      authMethod: Math.random() > 0.5 ? 'biometric_fingerprint' : 'rfid_tap',
                      gateAction: 'Entry',
                      status: 'success'
                    });
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] uppercase tracking-wide px-3.5 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  Simulate Success Gate Entry
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const troubledStudents = ['James Mwangi', 'Mercy Wanjiku'];
                    const rName = troubledStudents[Math.floor(Math.random() * troubledStudents.length)];
                    onTriggerGateLog({
                      patronName: rName,
                      patronId: 'S-911',
                      role: 'student',
                      authMethod: 'rfid_tap',
                      gateAction: 'Entry',
                      status: 'denied',
                      reason: 'Outstanding Fee Balance Block (Fine KES 950)'
                    });
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[9px] uppercase tracking-wide px-3.5 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  Simulate Refused Fee Arrears Block
                </button>
              </div>
            </div>

            {/* LOG STREAM TABLE CONTAINER */}
            <div className="border border-slate-800 bg-slate-950/80 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Timestamp / Tick</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Patron Class</th>
                    <th className="p-3">Authentication Mode</th>
                    <th className="p-3">Direction</th>
                    <th className="p-3">Clearance Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 leading-normal text-slate-300">
                  {libraryGateLogs.map(log => {
                    const isSuccess = log.status === 'success';
                    return (
                      <tr key={log.id} className="hover:bg-slate-900/40">
                        <td className="p-3 text-slate-500 font-bold text-[10.5px]">
                          {log.timestamp}
                        </td>
                        <td className="p-3 font-bold text-white text-[11px]">
                          {log.patronName}
                        </td>
                        <td className="p-3 uppercase font-bold text-[9px] tracking-wider text-slate-400">
                          {log.role}
                        </td>
                        <td className="p-3">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 text-[10px] lowercase">
                            {log.authMethod === 'biometric_fingerprint' ? ' fingerprint biometric' : 
                             log.authMethod === 'biometric_facial' ? ' face scan ID' : ' rfid badge tap'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold ${log.gateAction === 'Entry' ? 'text-blue-400' : 'text-amber-400'}`}>
                            {log.gateAction}
                          </span>
                        </td>
                        <td className="p-3">
                          {isSuccess ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              ● APPROVED (Gate Released)
                            </span>
                          ) : (
                            <span className="text-rose-500 font-bold flex flex-col gap-0.5">
                              <span>● ACCESS DENIED (Locked)</span>
                              <span className="text-[9.5px] italic text-rose-400 font-normal">"{log.reason || 'Balance blocks'}"</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {libraryGateLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-600 italic">Gate hardware registers are empty. Simulation taps are ready above.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
