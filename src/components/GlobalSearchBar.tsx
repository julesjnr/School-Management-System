import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, X, User, BookOpen, Package, DollarSign, 
  Calendar, MapPin, Tag, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { Student, Course, StockItem } from '../types';
import { subjectMap } from '../data';

interface GlobalSearchBarProps {
  students: Student[];
  courses: Course[];
  inventory: StockItem[];
}

export default function GlobalSearchBar({ students = [], courses = [], inventory = [] }: GlobalSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    type: 'student' | 'course' | 'inventory';
    data: any;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close results popover on clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const cleanTerm = searchTerm.trim().toLowerCase();

  // Perform search across the three entities
  const matchingStudents = cleanTerm
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(cleanTerm) ||
          s.admissionNo.toLowerCase().includes(cleanTerm) ||
          s.id.toLowerCase().includes(cleanTerm)
      )
    : [];

  const matchingCourses = cleanTerm
    ? courses.filter(
        (c) =>
          c.title.toLowerCase().includes(cleanTerm) ||
          c.code.toLowerCase().includes(cleanTerm) ||
          c.id.toLowerCase().includes(cleanTerm)
      )
    : [];

  const matchingInventory = cleanTerm
    ? inventory.filter(
        (item) =>
          item.name.toLowerCase().includes(cleanTerm) ||
          item.id.toLowerCase().includes(cleanTerm) ||
          item.category.toLowerCase().includes(cleanTerm)
      )
    : [];

  const totalMatches = matchingStudents.length + matchingCourses.length + matchingInventory.length;

  return (
    <div ref={containerRef} className="relative w-full max-w-xl" id="global-search-container">
      {/* Search Input Box */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          placeholder="Global Search (Students, Courses, Inventory by name or ID)..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-xl pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-550 transition-all shadow-2xs"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-150 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Results Panel */}
      {isOpen && searchTerm && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-750 rounded-2xl shadow-xl z-50 overflow-hidden font-sans max-h-[460px] flex flex-col">
          {/* Header */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center text-[10px] text-slate-450 uppercase tracking-widest font-bold">
            <span>Search Results</span>
            <span>{totalMatches} match{totalMatches === 1 ? '' : 'es'}</span>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {totalMatches === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                No students, courses, or inventory matched "{searchTerm}"
              </div>
            ) : (
              <>
                {/* STUDENTS SECTION */}
                {matchingStudents.length > 0 && (
                  <div className="p-2 space-y-1">
                    <span className="block text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 px-2 py-1 tracking-wider">
                      Students ({matchingStudents.length})
                    </span>
                    {matchingStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedItem({ type: 'student', data: s });
                          setIsOpen(false);
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between group gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-slate-850 dark:text-slate-100 group-hover:text-blue-650 dark:group-hover:text-blue-400 truncate">
                              {s.name}
                            </span>
                            <span className="block text-[10px] text-slate-450 dark:text-slate-450 font-mono">
                              Adm: {s.admissionNo} • {s.cohort}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-sm font-semibold border border-blue-100 dark:border-slate-700">
                          View File
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* COURSES SECTION */}
                {matchingCourses.length > 0 && (
                  <div className="p-2 space-y-1">
                    <span className="block text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 px-2 py-1 tracking-wider">
                      Courses ({matchingCourses.length})
                    </span>
                    {matchingCourses.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedItem({ type: 'course', data: c });
                          setIsOpen(false);
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between group gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-slate-850 dark:text-slate-100 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 truncate">
                              {c.title}
                            </span>
                            <span className="block text-[10px] text-slate-455 dark:text-slate-450 font-mono">
                              Code: {c.code} • {c.faculty}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-455 px-2 py-0.5 rounded-sm font-semibold border border-indigo-100 dark:border-slate-700">
                          Details
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* INVENTORY SECTION */}
                {matchingInventory.length > 0 && (
                  <div className="p-2 space-y-1">
                    <span className="block text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 px-2 py-1 tracking-wider">
                      Inventory Properties ({matchingInventory.length})
                    </span>
                    {matchingInventory.map((item) => {
                      const isLowStock = item.quantity <= item.lowestThreshold;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedItem({ type: 'inventory', data: item });
                            setIsOpen(false);
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between group gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-slate-850 dark:text-slate-100 group-hover:text-amber-650 dark:group-hover:text-amber-400 truncate">
                                {item.name}
                              </span>
                              <span className="block text-[10px] text-slate-455 dark:text-slate-450">
                                Stock: <strong className={isLowStock ? 'text-rose-600 font-bold' : 'text-slate-600 dark:text-slate-350'}>{item.quantity} units</strong> • {item.location}
                              </span>
                            </div>
                          </div>
                          {isLowStock ? (
                            <span className="text-[9px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-xs font-bold border border-rose-100 dark:border-rose-900">
                              Low Stock
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-50 dark:bg-slate-800 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-sm font-semibold border border-amber-100 dark:border-slate-700">
                              Inspect
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* OVERLAY MODAL FOR DETAILED INSPECTION */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-700 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-750 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                {selectedItem.type === 'student' && <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                {selectedItem.type === 'course' && <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                {selectedItem.type === 'inventory' && <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 capitalize">
                  {selectedItem.type} Information File
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 dark:text-slate-305">
              
              {/* STUDENT FILE PROFILE */}
              {selectedItem.type === 'student' && (() => {
                const s = selectedItem.data as Student;
                const totalInvoiced = s.ledger.reduce((sum, inv) => sum + inv.amount, 0);
                const totalPaid = s.ledger.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
                const outstandingBal = totalInvoiced - totalPaid;
                return (
                  <div className="space-y-4">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg border dark:border-blue-800 shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">{s.name}</h4>
                        <span className="text-[11px] text-slate-451 font-mono">Admission No: {s.admissionNo} • {s.cohort}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Email Address</span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium break-all">{s.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Phone Contact</span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{s.phone}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Completed & Enrolled units</span>
                      <div className="flex flex-wrap gap-1.5">
                        {s.enrolledUnits.length === 0 ? (
                          <span className="text-slate-400 italic">No modules allocated.</span>
                        ) : (
                          s.enrolledUnits.map((u) => (
                            <span key={u} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                              {u}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-750 pt-3 space-y-2">
                      <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Financial Summary Statement</span>
                      <div className="grid grid-cols-3 gap-2.5 text-center">
                        <div className="bg-slate-50/70 dark:bg-slate-800/30 p-2 rounded-lg border dark:border-slate-700">
                          <span className="block text-[9px] text-slate-400">Total Billed</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">KES {totalInvoiced.toLocaleString()}</span>
                        </div>
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                          <span className="block text-[9px] text-emerald-600 dark:text-emerald-400">Total Cleared</span>
                          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">KES {totalPaid.toLocaleString()}</span>
                        </div>
                        <div className="bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-100 dark:border-rose-900/40">
                          <span className="block text-[9px] text-rose-500">Remaining</span>
                          <span className={`text-xs font-black font-mono ${outstandingBal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>KES {outstandingBal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Unit Grades detail */}
                    <div className="border-t border-slate-100 dark:border-slate-750 pt-3 space-y-2">
                      <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Academics Grade Sheet</span>
                      {Object.keys(s.grades).length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">No exams or cats recorded in database yet.</p>
                      ) : (
                        <div className="space-y-1 text-[11px] max-h-[140px] overflow-y-auto">
                          {Object.entries(s.grades).map(([unit, grade]) => {
                            const total = grade.cat + grade.exam;
                            let letGrade = 'F';
                            if (total >= 70) letGrade = 'A';
                            else if (total >= 60) letGrade = 'B';
                            else if (total >= 50) letGrade = 'C';
                            else if (total >= 40) letGrade = 'D';

                            return (
                              <div key={unit} className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700">
                                <span className="font-bold text-slate-700 dark:text-slate-300">{unit} - {subjectMap[unit as keyof typeof subjectMap] || 'Course module'}</span>
                                <div className="flex gap-4 font-mono text-[10px]">
                                  <span>CAT: {grade.cat}/30</span>
                                  <span>Exam: {grade.exam}/70</span>
                                  <span className="font-extrabold text-blue-600 dark:text-blue-400 font-sans text-xs">[{letGrade}]</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })()}

              {/* COURSE DETAILS FILE */}
              {selectedItem.type === 'course' && (() => {
                const c = selectedItem.data as Course;
                return (
                  <div className="space-y-4">
                    <div className="flex gap-4 items-center">
                      <img 
                        src={c.thumbnail || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=300'} 
                        alt="Course Thumbnail" 
                        className="w-14 h-14 rounded-xl object-cover border dark:border-slate-700"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">{c.title}</h4>
                        <span className="text-[11px] bg-slate-100 dark:bg-slate-850 border dark:border-slate-700 text-slate-700 dark:text-slate-350 px-2 py-0.5 rounded font-mono font-bold">
                          Code: {c.code}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-sans">
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                        <span className="block text-[9px] text-slate-400 uppercase tracking-wider font-bold">Tuition Fees</span>
                        <span className="text-xs font-black text-slate-950 dark:text-slate-100">KES {c.fees.toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                        <span className="block text-[9px] text-slate-400 uppercase tracking-wider font-bold">Duration</span>
                        <span className="text-xs font-semibold text-slate-905 dark:text-slate-105">{c.duration}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                        <span className="block text-[9px] text-slate-400 uppercase tracking-wider font-bold">Faculty Department</span>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 truncate block">{c.faculty}</span>
                      </div>
                    </div>

                    <div className="space-y-1 rounded-xl bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 p-4">
                      <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-205 flex items-center gap-1">
                        Syllabus narrative description:
                      </h5>
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 mt-1">{c.description}</p>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border dark:border-slate-700">
                      <span className="text-[11px] font-bold text-slate-500">Public Portal Listing Status:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        c.active 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {c.active ? 'Visible Live' : 'Archived Listing'}
                      </span>
                    </div>

                  </div>
                );
              })()}

              {/* INVENTORY ASSET PROPERTIES */}
              {selectedItem.type === 'inventory' && (() => {
                const item = selectedItem.data as StockItem;
                const isUnderStock = item.quantity <= item.lowestThreshold;
                return (
                  <div className="space-y-4">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center font-bold shrink-0">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">{item.name}</h4>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-850 text-slate-505 dark:text-slate-400 px-2 py-0.5 rounded font-mono border dark:border-slate-700">
                          Cat: {item.category}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border dark:border-slate-700">
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Current Stock Volume</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className={`text-lg font-black ${isUnderStock ? 'text-rose-600' : 'text-slate-850 dark:text-slate-200'}`}>
                            {item.quantity}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">Units remaining</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border dark:border-slate-700">
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Safe Warning Level</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-lg font-black text-slate-850 dark:text-slate-200">
                            {item.lowestThreshold}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">Units (lowest)</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border dark:border-slate-700 font-mono text-[11px] space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Assigned Storage Location:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-500" />
                          <span>{item.location}</span>
                        </span>
                      </div>
                    </div>

                    {isUnderStock ? (
                      <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-400 p-3.5 rounded-xl flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-[11px]">Requisition Triggers Required!</span>
                          <span className="text-[10px] leading-relaxed block dark:text-rose-300">
                            Current asset counts have dropped below minimal safety bounds. Submit procurement requisitions to prevent department delays.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-150 dark:border-emerald-900 text-emerald-800 dark:text-emerald-400 p-3.5 rounded-xl flex items-start gap-2.5">
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-[11.5px]">Stock Levels are Safe</span>
                          <span className="text-[10px] dark:text-emerald-350 block">Current computer or stationery inventory is certified adequate. No reallocations needed.</span>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })()}

            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-650 font-bold text-xs px-5 py-2 rounded-xl cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
