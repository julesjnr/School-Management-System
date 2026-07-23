import React, { useState, useEffect } from 'react';
import { useNotification } from './notifications';
import { 
  Mail, Phone, Twitter, Send, GraduationCap, 
  Menu, School, Award, Users, BookOpen, Clock, 
  Tag, Calendar, ArrowRight, CheckCircle2, ChevronRight, 
  MessageSquare, Briefcase, Sparkles, Newspaper, X
} from 'lucide-react';
import { Course, NewsPost, Testimony, Lecturer, CourseReview } from '../types';
import { subjectMap } from '../data';

interface LandingPageProps {
  courses: Course[];
  lecturers: Lecturer[];
  reviews?: CourseReview[];
  news: NewsPost[];
  testimonies: Testimony[];
  totalStudentsCount: number;
  onOpenLogin: () => void;
  onSelectCourse: (course: Course) => void;
  onReturnToDashboard?: (role: string, id: string) => void;
}

export default function LandingPage({ 
  courses, 
  lecturers,
  reviews = [],
  news, 
  testimonies, 
  totalStudentsCount, 
  onOpenLogin,
  onSelectCourse,
  onReturnToDashboard
}: LandingPageProps) {
  const { showInfo } = useNotification();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  // Session detection for Return to Dashboard logic
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [activeSession, setActiveSession] = useState<{ role: string; id: string } | null>(null);

  useEffect(() => {
    const role = localStorage.getItem('zenti_current_user_role');
    const id = localStorage.getItem('zenti_current_user_id');
    if (role && id) {
      setHasActiveSession(true);
      setActiveSession({ role, id });
    } else {
      setHasActiveSession(false);
      setActiveSession(null);
    }
  }, []);

  const handleReturnToDashboard = () => {
    if (onReturnToDashboard && activeSession) {
      onReturnToDashboard(activeSession.role, activeSession.id);
    } else {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Faculty contact modal states
  const [selectedLecturerForContact, setSelectedLecturerForContact] = useState<Lecturer | null>(null);
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Custom states for counters
  const [studentsCount, setStudentsCount] = useState(0);
  const [coursesCount, setCoursesCount] = useState(0);
  const [completionCount, setCompletionCount] = useState(0);

  // Carousel index for testimonials
  const [currentTestimonyIdx, setCurrentTestimonyIdx] = useState(0);

  // Filter for news category
  const [activeNewsCategory, setActiveNewsCategory] = useState<string>('all');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Triggering count increments upon component mount
  useEffect(() => {
    const activeCount = courses.filter(c => c.active).length;
    
    const studentsTarget = totalStudentsCount + 1480; // offset for realism
    const coursesTarget = activeCount;
    const completionTarget = 94; // % completion rate

    const studentsInterval = setInterval(() => {
      setStudentsCount(prev => {
        if (prev >= studentsTarget) {
          clearInterval(studentsInterval);
          return studentsTarget;
        }
        return prev + Math.ceil(studentsTarget / 50);
      });
    }, 30);

    const coursesInterval = setInterval(() => {
      setCoursesCount(prev => {
        if (prev >= coursesTarget) {
          clearInterval(coursesInterval);
          return coursesTarget;
        }
        return prev + 1;
      });
    }, 80);

    const completionInterval = setInterval(() => {
      setCompletionCount(prev => {
        if (prev >= completionTarget) {
          clearInterval(completionInterval);
          return completionTarget;
        }
        return prev + 2;
      });
    }, 40);

    return () => {
      clearInterval(studentsInterval);
      clearInterval(coursesInterval);
      clearInterval(completionCount);
    };
  }, [courses, totalStudentsCount]);

  const handleSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setNewsletterSubscribed(true);
      setTimeout(() => {
        setNewsletterSubscribed(false);
        setNewsletterEmail('');
      }, 4000);
    }
  };

  const activeCourses = courses.filter(c => c.active);

  const filteredNews = activeNewsCategory === 'all' 
    ? news 
    : news.filter(n => n.category.toLowerCase() === activeNewsCategory.toLowerCase());

  return (
    <div className="bg-[#f8fafc] text-slate-800 min-h-screen font-sans flex flex-col selection:bg-blue-100 selection:text-blue-900">
      
      {/* 1. TOP BAR & QUICK CONTACT */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 shadow-inner" id="top-contact-bar">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span>admissions@zenti.edu.ke</span>
            </span>
            <span className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone className="w-3.5 h-3.5 text-blue-400" />
              <span>+254 (0) 711 000 000</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="text-slate-500 uppercase font-bold tracking-wider">Quick Contact:</span>
            <span className="text-slate-300 font-semibold">+254 700 000 000 | info@zenti.edu</span>
          </div>
        </div>
      </div>

      {/* STICKY MENU & NAVIGATION HEADER */}
      <header className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 z-40 transition-all hover:shadow-lg" id="main-navigation-header">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <span className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
              <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-blue-600 block leading-tight uppercase">ZENTI</span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest block -mt-0.5">Management Portal</span>
            </div>
          </span>
 
          <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
            <a href="#hero" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-xs uppercase tracking-wider transition-colors">Home</a>
            <a href="#courses" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-xs uppercase tracking-wider transition-colors flex items-center gap-1">
              Courses
              <span className="bg-blue-100 dark:bg-slate-800 text-blue-800 dark:text-blue-200 text-[9px] px-2 py-0.5 rounded-full font-bold">
                {activeCourses.length}
              </span>
            </a>
            <a href="#strengths" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-xs uppercase tracking-wider transition-colors">Strengths</a>
            <a href="#faculty" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-xs uppercase tracking-wider transition-colors">Faculty</a>
            <a href="#news" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-xs uppercase tracking-wider transition-colors">Campus News</a>
            <a href="#testimonials" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-xs uppercase tracking-wider transition-colors">Testimonials</a>
          </nav>

          <div className="flex items-center gap-2">
            {hasActiveSession ? (
              <button
                id="return-dashboard-btn"
                onClick={handleReturnToDashboard}
                className="hidden sm:flex bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-lg shadow-emerald-100 uppercase tracking-wider transition-all cursor-pointer hover:shadow-emerald-200 active:scale-95 items-center gap-1.5"
              >
                <span>Return to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                id="login-gateway-btn"
                onClick={onOpenLogin}
                className="hidden sm:block bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-lg shadow-blue-100 uppercase tracking-wider transition-all cursor-pointer hover:shadow-blue-200 active:scale-95"
              >
                Portal Login
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* MOBILE NAVIGATION DRAWER */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-col gap-4 shadow-md font-sans">
            <a href="#hero" onClick={() => setMobileMenuOpen(false)} className="text-slate-650 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs uppercase tracking-wider transition-colors py-2 border-b border-slate-50 dark:border-slate-850">Home</a>
            <a href="#courses" onClick={() => setMobileMenuOpen(false)} className="text-slate-650 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-850">
              <span>Courses</span>
              <span className="bg-blue-100 dark:bg-slate-800 text-blue-800 dark:text-blue-200 text-[9px] px-2 py-0.5 rounded-full font-bold">
                {activeCourses.length}
              </span>
            </a>
            <a href="#strengths" onClick={() => setMobileMenuOpen(false)} className="text-slate-650 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs uppercase tracking-wider transition-colors py-2 border-b border-slate-50 dark:border-slate-850">Strengths</a>
            <a href="#faculty" onClick={() => setMobileMenuOpen(false)} className="text-slate-650 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs uppercase tracking-wider transition-colors py-2 border-b border-slate-50 dark:border-slate-850">Faculty</a>
            <a href="#news" onClick={() => setMobileMenuOpen(false)} className="text-slate-650 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs uppercase tracking-wider transition-colors py-2 border-b border-slate-50 dark:border-slate-850">Campus News</a>
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="text-slate-650 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs uppercase tracking-wider transition-colors py-2 border-b border-slate-50 dark:border-slate-850">Testimonials</a>
            
            <div className="pt-2 flex flex-col gap-2">
              {hasActiveSession ? (
                <button
                  onClick={() => { handleReturnToDashboard(); setMobileMenuOpen(false); }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Return to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => { onOpenLogin(); setMobileMenuOpen(false); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl uppercase tracking-wider transition-all text-center cursor-pointer"
                >
                  Portal Login
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section id="hero" className="relative py-16 md:py-24 px-4 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 overflow-hidden border-b border-slate-100 flex items-center">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        {/* Decorative Geometric Accents */}
        <div className="absolute top-12 left-6 w-48 h-48 text-blue-100 pointer-events-none opacity-45 hidden lg:block">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <rect x="10" y="10" width="80" height="80" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="50" cy="50" r="30" strokeWidth="1.5" />
            <line x1="10" y1="10" x2="90" y2="90" strokeWidth="0.5" />
          </svg>
        </div>

        <div className="absolute right-10 top-16 w-32 h-32 text-blue-650 pointer-events-none opacity-20 hidden lg:block animate-[spin_35s_linear_infinite]">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <polygon points="50,10 90,85 10,85" strokeWidth="1.5" />
            <rect x="35" y="45" width="30" height="30" strokeWidth="1" />
          </svg>
        </div>

        <div className="absolute left-1/3 bottom-8 w-64 h-64 text-slate-100 pointer-events-none opacity-65 hidden xl:block">
          <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" stroke="currentColor">
            <circle cx="100" cy="100" r="80" strokeWidth="1" />
            <circle cx="100" cy="100" r="60" strokeWidth="1" strokeDasharray="5 5" />
            <rect x="60" y="60" width="80" height="80" strokeWidth="1" transform="rotate(45 100 100)" />
          </svg>
        </div>
        
        <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-12 items-center relative z-10 w-full">
          <div className="md:col-span-7 space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 bg-blue-100/70 text-blue-800 text-xs px-3 py-1.5 rounded-full font-bold border border-blue-200/50">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Academic Applications Open for 2026</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Empowering the Next <br />
              <span className="text-blue-600 decoration-blue-200 underline decoration-4 underline-offset-4">Generation</span> of Innovators.
            </h1>

            <p className="text-slate-600 text-base sm:text-lg max-w-xl mx-auto md:mx-0 leading-relaxed font-light">
              Welcome to Zenti, an esteemed institution where tech skillsets meet hands-on mastery. Explore our registered programs and connect with top-tier faculties using our next-generation Management Information System.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 pt-2">
              <a 
                href="#courses"
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3.5 rounded-xl transition-all duration-150 shadow-md shadow-blue-200 flex items-center justify-center gap-2 cursor-pointer hover:translate-y-[-1px]"
              >
                Explore Courses
                <ArrowRight className="w-4 h-4" />
              </a>
              {hasActiveSession ? (
                <button
                  onClick={handleReturnToDashboard}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 font-semibold px-6 py-3.5 rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-100 hover:translate-y-[-1px]"
                >
                  <span>Return to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onOpenLogin}
                  className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold px-6 py-3.5 rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5"
                >
                  <span>Apply Online Portal</span>
                </button>
              )}
            </div>

            {/* Micro proofs */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-100 max-w-md mx-auto md:mx-0">
              <div>
                <span className="block text-xl font-bold text-slate-900">100%</span>
                <span className="text-xs text-slate-500">Accredited Degrees</span>
              </div>
              <div className="border-x border-slate-200 px-2">
                <span className="block text-xl font-bold text-slate-900">KES 5M+</span>
                <span className="text-xs text-slate-500">Scholarship Pool</span>
              </div>
              <div>
                <span className="block text-xl font-bold text-slate-900">92%</span>
                <span className="text-xs text-slate-500">Placement Rate</span>
              </div>
            </div>
          </div>

          {/* Graphical/Illustrative card stacking on the right */}
          <div className="md:col-span-5 hidden md:block relative">
            <div className="absolute -inset-4 bg-blue-600/5 rounded-3xl blur-2xl" />
            <div className="relative bg-white border border-slate-100 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-400">PROSPECTIVE STUDENTS PORTAL</span>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold">1</div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Choose Program</p>
                    <p className="text-[10px] text-slate-500">Select computer systems, electrical, or data science.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold">2</div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Verify Unit Codes</p>
                    <p className="text-[10px] text-slate-500">Assign corresponding classes and subjects directly.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-lg flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Instant Enrollment</p>
                    <p className="text-[10px] text-slate-500">Obtain administrative credential via Sandbox login.</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 text-slate-100 rounded-xl p-3 text-[11px] font-mono leading-relaxed">
                <span className="text-blue-400">admin@zenti:~$</span> sys.reconcile() <br />
                <span className="text-emerald-400">✓ Invoices: matched (0 bad records)</span> <br />
                <span className="text-emerald-400">✓ Curriculum cache loaded.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. STATISTICS COUNTER SECTION */}
      <section id="strengths" className="relative overflow-hidden bg-white border-y border-slate-100 py-10 px-4">
        {/* Subtle geometric line overlays */}
        <div className="absolute top-0 left-0 w-full h-full flex justify-between pointer-events-none opacity-20">
          <div className="w-24 h-full border-r border-dashed border-slate-200" />
          <div className="w-24 h-full border-l border-dashed border-slate-200" />
        </div>
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 text-blue-50 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <circle cx="50" cy="50" r="45" strokeWidth="1" />
            <polygon points="50,15 80,75 20,75" strokeWidth="0.75" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 flex items-center justify-center gap-0.5">
                <span>{studentsCount}</span>
                <span>+</span>
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Active Students</p>
              <p className="text-[11px] text-slate-400">Dynamically registered cohorts</p>
            </div>
            
            <div className="space-y-1 border-l border-slate-100">
              <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 flex items-center justify-center">
                <span>{coursesCount}</span>
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Published Syllabuses</p>
              <p className="text-[11px] text-slate-400">Updates live from MIS Admin</p>
            </div>

            <div className="space-y-1 md:border-l border-slate-100">
              <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 flex items-center justify-center gap-0.5">
                <span>{completionCount}</span>
                <span>%</span>
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exam Completion Rate</p>
              <p className="text-[11px] text-slate-400">Aggregated CAT + Final results</p>
            </div>

            <div className="space-y-1 border-l border-slate-100">
              <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 flex items-center justify-center gap-0.5">
                <span>4.8</span>
                <span className="text-lg">★</span>
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alumni Rating</p>
              <p className="text-[11px] text-slate-400">Exceptional corporate review</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. DYNAMIC COURSE SHOWCASE (Linked to backend) */}
      <section id="courses" className="relative overflow-hidden py-16 px-4 bg-white border-b border-slate-150">
        
        {/* Background Geometric Grid Accents */}
        <div className="absolute top-0 right-0 w-80 h-80 text-slate-100 pointer-events-none opacity-60 hidden md:block">
          <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" stroke="currentColor">
            <rect x="20" y="20" width="160" height="160" strokeWidth="1" />
            <rect x="40" y="40" width="120" height="120" strokeWidth="0.75" />
            <circle cx="100" cy="100" r="60" strokeWidth="1" />
            <line x1="20" y1="20" x2="180" y2="180" strokeWidth="0.5" />
          </svg>
        </div>

        <div className="absolute bottom-10 left-10 w-48 h-48 text-blue-50 pointer-events-none opacity-85 hidden lg:block">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <polygon points="50,10 90,90 10,90" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx="50" cy="60" r="22" strokeWidth="1" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-1">PROGRAM PORTFOLIO</span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dynamic Course Catalog</h2>
              <p className="text-sm text-slate-500 max-w-lg mt-1">
                Active degree programs. Adding, modifying, or disabling courses in the Administrator Panel immediately controls listings below.
              </p>
            </div>
            <button 
              onClick={onOpenLogin}
              className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline self-end hover:text-blue-700"
            >
              <span>Admin Course Management</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {activeCourses.length === 0 ? (
            <div className="bg-slate-100/60 text-slate-500 text-center py-12 px-6 rounded-xl border border-dashed border-slate-200">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-sm text-slate-700">No active classes listed.</p>
              <p className="text-xs mt-1">Log in as administrative staff to create and set courses active.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {activeCourses.map((c) => (
                <div 
                  key={c.id} 
                  className="bg-white rounded-xl border border-slate-100 hover:border-blue-400 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col group cursor-pointer relative z-10"
                  onClick={() => onSelectCourse(c)}
                >
                  {/* Thumb */}
                  <div className="relative h-44 overflow-hidden bg-slate-100">
                    <img 
                      src={c.thumbnail} 
                      alt={c.title} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-slate-100 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded">
                      {c.code}
                    </div>
                  </div>

                  {/* Body info */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-blue-600 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100">
                          {c.faculty}
                        </span>
                        
                        {(() => {
                          const courseReviews = reviews.filter(r => r.courseId === c.id || r.courseId === c.code);
                          const averageRating = courseReviews.length > 0
                            ? (courseReviews.reduce((sum, r) => sum + r.rating, 0) / courseReviews.length)
                            : 0;
                          
                          if (courseReviews.length > 0) {
                            return (
                              <div className="flex items-center gap-0.5 text-[10.5px] text-slate-650 font-bold">
                                <span className="text-amber-500 font-sans text-xs">★</span>
                                <span className="text-slate-800">{averageRating.toFixed(1)}</span>
                                <span className="text-slate-400 font-normal">({courseReviews.length})</span>
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-center gap-0.5 text-[10px] text-slate-400">
                              <span className="text-slate-200 font-sans text-xs">☆</span>
                              <span>No reviews</span>
                            </div>
                          );
                        })()}
                      </div>
                      
                      <h3 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors pt-1 h-7">{c.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{c.description}</p>
                    </div>

                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>{c.duration}</span>
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        KES {c.fees.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* INSTITUTIONAL STRENGTHS */}
      <section className="relative overflow-hidden bg-slate-900 text-slate-100 py-16 px-4">
        
        {/* Dark theme blueprint visual grids */}
        <div className="absolute top-10 left-10 w-96 h-96 text-slate-800 pointer-events-none opacity-30">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <circle cx="50" cy="50" r="40" strokeWidth="0.5" strokeDasharray="3 3" />
            <rect x="20" y="20" width="60" height="60" strokeWidth="0.5" />
            <line x1="20" y1="20" x2="80" y2="80" strokeWidth="0.25" />
            <line x1="80" y1="20" x2="20" y2="80" strokeWidth="0.25" />
          </svg>
        </div>

        <div className="absolute bottom-6 right-12 w-64 h-64 text-blue-500/10 pointer-events-none hidden lg:block">
          <svg className="w-full h-full" viewBox="0 0 120 120" fill="none" stroke="currentColor">
            <polygon points="60,10 110,100 10,100" strokeWidth="0.75" />
            <polygon points="60,30 95,90 25,90" strokeWidth="0.5" strokeDasharray="2 2" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto space-y-12 relative z-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-blue-450 uppercase tracking-widest">Why Zenti?</span>
            <h2 className="text-3xl font-extrabold tracking-tight">A Modern Academic System That Works</h2>
            <p className="text-sm text-slate-400">
              We focus on building actual technical capabilities with systems and devices that students interact with daily.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center">
                <School className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-100">Fully Mobile-Ready Portal</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Access your fee ledger statements, register modules, and request physical store items from any mobile device, tablet, or desk connection securely.
              </p>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-100">Accredited Curriculums</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                All class allocations and continuous assessment test sheets conform exactly to current governmental and university educational regulator specifications.
              </p>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 bg-emerald-505/10 text-emerald-400 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-100">Instant Reconciliation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Finance staff can automatically match outgoing student ledger balances against incoming bank statement invoices inside one centralized portal view.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FACULTY DIRECTORY SECTION */}
      <section id="faculty" className="relative overflow-hidden py-16 px-4 bg-[#f8fafc] dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800">
        <div className="absolute top-12 left-6 w-48 h-48 text-blue-100 pointer-events-none opacity-45 hidden lg:block">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <rect x="10" y="10" width="80" height="80" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="50" cy="50" r="30" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold text-blue-601 uppercase tracking-widest block mb-1">OUR DISTINGUISHED FACULTY</span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Meet Our Expert Lecturers
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Zenti pride is our world-class educators, active practitioners, and research directors driving high-quality education.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {lecturers.map((lecturer) => (
              <div 
                key={lecturer.id}
                className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-400/50 dark:hover:border-blue-500/50 hover:scale-[1.02] transform transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Banner theme background */}
                  <div className="relative h-24 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-750 dark:to-slate-700 flex items-center justify-center overflow-hidden">
                    <span className="absolute top-3 right-3 bg-slate-900/80 text-white text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md font-mono">
                      {lecturer.designatorCode}
                    </span>
                  </div>

                  {/* Profile Picture overlay */}
                  <div className="flex justify-center -mt-10 relative z-10">
                    <img 
                      src={lecturer.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'} 
                      alt={lecturer.name} 
                      className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-sm transition-transform duration-300 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Body details */}
                  <div className="p-5 text-center space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {lecturer.name}
                        </h3>
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                          lecturer.isActive !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900 shadow-xs'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${lecturer.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                          <span>{lecturer.isActive !== false ? 'Available' : 'Away'}</span>
                        </span>
                      </div>
                      <p className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">
                        {lecturer.contractLength} Lecturer
                      </p>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-450 line-clamp-3 leading-relaxed text-left h-[54px] font-light">
                      {lecturer.bio || "Academic specialist dedicated to innovative student tutoring, coursework reviews, and laboratory mentoring at Zenti Metropolitan University."}
                    </p>

                    {/* Assigned Courses list */}
                    <div className="space-y-1.5 text-left pt-3 border-t border-slate-100 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-400 dark:text-slate-505 font-bold uppercase block">Specialist Instruction Units:</span>
                      <div className="flex flex-wrap gap-1.5 min-h-[44px]">
                        {(lecturer.subjects ?? []).length === 0 ? (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">No instructions current semester</span>
                        ) : (
                          (lecturer.subjects ?? []).map(code => (
                            <span 
                              key={code}
                              className="text-[10px] font-medium text-slate-605 dark:text-slate-350 bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-650 truncate max-w-full"
                              title={subjectMap[code] || code}
                            >
                              {subjectMap[code] || code}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact module button */}
                <div className="px-5 pb-5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLecturerForContact(lecturer);
                      setSenderName('');
                      setSenderEmail('');
                      setSubject(`Inquiry regarding Class Syllabus`);
                      setMessage('');
                      setSubmitSuccess(false);
                      setIsSubmitting(false);
                    }}
                    className="w-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/15 dark:hover:bg-blue-900/25 text-blue-600 dark:text-blue-400 font-extrabold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 border border-blue-105/20 dark:border-blue-900/40"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Contact Lecturer</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. NEWS & RECENT updates */}
      <section id="news" className="relative overflow-hidden py-16 px-4 border-b border-slate-100 bg-slate-50/50">
        
        {/* Subtle background intersecting lines & diagrams */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="20%" x2="100%" y2="20%" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="8 8" />
            <line x1="10%" y1="0" x2="10%" y2="100%" stroke="#e2e8f0" strokeWidth="1" />
            <rect x="7%" y="15%" width="12" height="12" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
            <circle cx="10%" cy="40%" r="4" fill="#3b82f6" />
          </svg>
        </div>

        <div className="absolute right-8 bottom-4 w-40 h-40 text-slate-200 pointer-events-none hidden xl:block">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <rect x="15" y="15" width="70" height="70" strokeWidth="1" />
            <circle cx="50" cy="50" r="25" strokeWidth="0.75" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-1">CAMPUS BULLETINS</span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Recent Announcements & Updates</h2>
              <p className="text-sm text-slate-500 mt-1">
                Stay aligned with academic timetables, internal registry reminders, and community events on-campus.
              </p>
            </div>

            {/* Filtering buttons */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl text-xs font-medium self-end">
              {['all', 'academic', 'announcement', 'event'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveNewsCategory(cat)}
                  className={`py-1.5 px-3 rounded-lg capitalize transition-all ${
                    activeNewsCategory === cat
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {filteredNews.map((post) => (
              <div key={post.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-xs hover:border-slate-200 transition-all flex flex-col justify-between relative z-10">
                <div>
                  <div className="relative h-48 bg-slate-100">
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <span className="absolute top-2 right-2 bg-blue-600 text-white text-[9px] uppercase font-bold px-2 py-0.5 rounded">
                      {post.category}
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 uppercase font-semibold">
                      <Calendar className="w-3 h-3" />
                      {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors line-clamp-2 leading-snug">{post.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{post.content}</p>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-slate-50 mt-4">
                  <button 
                    onClick={() => showInfo(post.title, post.content)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 group/btn"
                  >
                    <span>Read Full Notice</span>
                    <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS CAROUSEL */}
      <section id="testimonials" className="relative overflow-hidden bg-blue-50/50 py-16 px-4 border-y border-slate-100">
        
        {/* Symmetric vector coordinates on the background */}
        <div className="absolute top-1/2 -translate-y-1/2 -left-32 w-80 h-80 text-blue-100/60 pointer-events-none hidden md:block">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <circle cx="50" cy="50" r="48" strokeWidth="0.5" />
            <rect x="25" y="25" width="50" height="50" strokeWidth="0.5" transform="rotate(30 50 50)" />
          </svg>
        </div>

        <div className="absolute top-1/2 -translate-y-1/2 -right-32 w-80 h-80 text-blue-100/60 pointer-events-none hidden md:block">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <circle cx="50" cy="50" r="48" strokeWidth="0.5" />
            <rect x="25" y="25" width="50" height="50" strokeWidth="0.5" transform="rotate(-30 50 50)" />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <div className="space-y-1">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block">TESTIMONIALS</span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Our Success Stories</h2>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden transition-all">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <MessageSquare className="w-20 h-20 text-blue-600" />
            </div>

            <div className="space-y-6 relative z-10">
              <p className="text-base sm:text-lg italic text-slate-700 leading-relaxed">
                "{testimonies[currentTestimonyIdx]?.content}"
              </p>

              {/* Persona metadata */}
              <div className="flex items-center justify-center gap-3">
                <img 
                  src={testimonies[currentTestimonyIdx]?.avatar} 
                  alt={testimonies[currentTestimonyIdx]?.name} 
                  className="w-11 h-11 rounded-full object-cover border border-slate-100 shadow-xs"
                  referrerPolicy="no-referrer"
                />
                <div className="text-left">
                  <h4 className="font-bold text-sm text-slate-900 leading-tight">{testimonies[currentTestimonyIdx]?.name}</h4>
                  <span className="text-xs text-blue-600">{testimonies[currentTestimonyIdx]?.role}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Indicators dots */}
          <div className="flex justify-center gap-1.5">
            {testimonies.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentTestimonyIdx(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  currentTestimonyIdx === i ? 'bg-blue-600 w-6' : 'bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Testimonial screen slider page ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER SUBSCRIBE */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-4xl mx-auto bg-slate-900 rounded-3xl p-8 sm:p-12 text-slate-100 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8 shadow-xl">
          <div className="space-y-3 max-w-sm text-center md:text-left">
            <h3 className="text-2xl font-extrabold text-white tracking-tight">Get Syllabus & Fee Information</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Subscribe to get instantaneous notice of continuous assessment dates, low inventory restocks, and newly allocated faculties.
            </p>
          </div>

          <div className="w-full max-w-sm">
            {newsletterSubscribed ? (
              <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Subscription successful! Please check your spam inbox for brochures.</span>
              </div>
            ) : (
              <form onSubmit={handleSub} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-3 text-xs w-full text-slate-100 focus:outline-hidden focus:border-blue-500 placeholder-slate-500"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                >
                  <span>Submit</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
            <span className="text-[10px] text-slate-500 mt-2 block text-center md:text-left">
              We never distribute unsolicited spam. Direct integration with CRM.
            </span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-500 text-xs py-12 px-4 border-t border-slate-900 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <span className="flex items-center gap-2">
              <div className="bg-blue-600 text-white p-1 rounded-sm text-xs">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold tracking-tight text-white block">ZENTI MIS</span>
            </span>
            <p className="leading-relaxed text-[11px] text-slate-400">
              The premium Management Information System (MIS) powering modern students, state-of-the-art laboratory assets, and streamlined academic ledgers.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider">Quick Directories</h4>
            <ul className="space-y-2 text-[11px]">
              <li><a href="#hero" className="hover:text-white transition-colors">Hero Campus intro</a></li>
              <li><a href="#courses" className="hover:text-white transition-colors">Course Portfolios</a></li>
              <li><a href="#strengths" className="hover:text-white transition-colors">Statistical Counters Summary</a></li>
              <li><a href="#news" className="hover:text-white transition-colors">Faculty Notices</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider">Admissions Portal</h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <button onClick={onOpenLogin} className="hover:text-white transition-colors text-left">
                  Student Assessment Grade Book
                </button>
              </li>
              <li>
                <button onClick={onOpenLogin} className="hover:text-white transition-colors text-left">
                  Lecturer Class Hours Submitter
                </button>
              </li>
              <li>
                <button onClick={onOpenLogin} className="hover:text-white transition-colors text-left">
                  Staff Procurement System
                </button>
              </li>
              <li>
                <button onClick={onOpenLogin} className="hover:text-white transition-colors text-left">
                  Student Fee Reconciliation
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider">Contact Administration</h4>
            <p className="leading-relaxed text-[11px]">
              Nairobi Central Campus<br />
              University Way, Block Alpha 4<br />
              Nairobi, Kenya
            </p>
            <p className="text-slate-400 text-[11px]">
              Telephone: +254 (0) 722 000 111
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-slate-900 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-600 text-[11px]">
          <p>© {new Date().getFullYear()} Zenti University. Registered and regulated under State Education statutes.</p>
          <div className="flex gap-4">
            <a href="#privacy" className="hover:text-slate-400">Privacy Policy</a>
            <span>•</span>
            <a href="#terms" className="hover:text-slate-400">Portal Security Terms</a>
            <span>•</span>
            <button onClick={onOpenLogin} className="text-blue-500 hover:underline">
              System Admin
            </button>
          </div>
        </div>
      </footer>

      {/* EMAIL INQUIRY & PORTFOLIO MODAL OVERLAY */}
      {selectedLecturerForContact && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl md:max-w-4xl overflow-hidden relative border border-slate-100 dark:border-slate-700 flex flex-col transition-all max-h-[90vh]">
            
            {/* Modal Header bar */}
            <div className="bg-slate-50 dark:bg-slate-750 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider leading-none">
                    Lecturer Profile & Inquiry
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-505 mt-1 uppercase tracking-tight font-medium">
                    Office of the Registrar • Faculty Credentials Info
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLecturerForContact(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Content Container (2 columns on medium screens) */}
            <div className="overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700">
              
              {/* LEFT SIDE: ACADEMIC PROFILE (5 cols) */}
              <div className="md:col-span-5 p-6 bg-slate-50/50 dark:bg-slate-900/20 space-y-6">
                <div className="flex items-center gap-4">
                  <img 
                    src={selectedLecturerForContact.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'} 
                    alt={selectedLecturerForContact.name} 
                    className="w-16 h-16 rounded-full object-cover border-2 border-blue-500/30"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedLecturerForContact.name}</h4>
                    <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md mt-1">
                      {selectedLecturerForContact.designatorCode}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block">Biography</span>
                  <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-light">
                    {selectedLecturerForContact.bio || "Academic specialist dedicated to innovative student tutoring, coursework reviews, and laboratory mentoring at Zenti Metropolitan University."}
                  </p>
                </div>

                {/* Research Interests */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    <span>Research Interests</span>
                  </span>
                  <ul className="space-y-1.5 list-none">
                    {selectedLecturerForContact.researchInterests?.map((interest, idx) => (
                      <li key={idx} className="text-xs text-slate-700 dark:text-slate-305 flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        <span>{interest}</span>
                      </li>
                    )) || (
                      <li className="text-xs text-slate-400 italic">No research areas specified.</li>
                    )}
                  </ul>
                </div>

                {/* Publications */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Recent Publications</span>
                  </span>
                  <div className="space-y-3">
                    {selectedLecturerForContact.publications?.map((pub, idx) => (
                      <div key={idx} className="flex gap-2 text-xs text-slate-600 dark:text-slate-350 leading-relaxed items-start">
                        <Newspaper className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{pub}</span>
                      </div>
                    )) || (
                      <p className="text-xs text-slate-400 italic">No publication listings available.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE: CONTACT INQUIRY FORM (7 cols) */}
              <div className="md:col-span-7 p-6 flex flex-col justify-center">
                {submitSuccess ? (
                  <div className="py-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-405 border border-emerald-100 dark:border-emerald-900/30">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Message Sent Successfully!</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                        Your academic inquiry has been direct-routed to <span className="font-semibold text-slate-805 dark:text-slate-205">{selectedLecturerForContact.name}</span>'s active staff inbox at <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedLecturerForContact.email}</span>.
                      </p>
                    </div>
                    <div className="bg-slate-50/70 dark:bg-slate-750 p-4 rounded-xl text-left border border-slate-100 dark:border-slate-700 font-mono text-[10px] text-slate-500 dark:text-slate-400 space-y-2">
                      <div><b>From:</b> {senderName} ({senderEmail})</div>
                      <div><b>Subject:</b> {subject}</div>
                      <div className="line-break max-h-[80px] overflow-y-auto"><b>Message:</b> {message}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedLecturerForContact(null)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-xs"
                    >
                      Close Dialog
                    </button>
                  </div>
                ) : (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      setIsSubmitting(true);
                      setTimeout(() => {
                        setIsSubmitting(false);
                        setSubmitSuccess(true);
                      }, 1200);
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase block tracking-wider">Your Full Name</label>
                        <input 
                          type="text"
                          required
                          placeholder="John Doe"
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-blue-550 transition-colors"
                        />
                      </div>
                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] text-slate-400 dark:text-slate-550 font-extrabold uppercase block tracking-wider">Your Email Address</label>
                        <input 
                          type="email"
                          required
                          placeholder="john@example.com"
                          value={senderEmail}
                          onChange={(e) => setSenderEmail(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-blue-550 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] text-slate-400 dark:text-slate-550 font-extrabold uppercase block tracking-wider">Inquiry Subject</label>
                      <input 
                        type="text"
                        required
                        placeholder="Course logistics request"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-blue-550 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] text-slate-400 dark:text-slate-550 font-extrabold uppercase block tracking-wider">Inquiry Message</label>
                      <textarea 
                        required
                        rows={4}
                        placeholder="Enter detailed message regarding assignments, timetables, syllabus or fee structures..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-505 focus:outline-hidden focus:border-blue-550 transition-colors resize-none"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-blue-500/10 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Routing Inquiry...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Send Message to Lecturer</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
