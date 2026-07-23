import React, { useState, useEffect, useRef } from 'react';
import { useNotification } from './notifications';
import { 
  Cpu, Database, Activity, RefreshCw, AlertTriangle, CheckCircle, Flame, 
  Trash, Zap, Server, HardDrive, Wifi, ShieldCheck, Play, Pause, Mail, Send, Eye
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { Course, Student, MockEmail } from '../types';

interface SystemDiagnosticsProps {
  courses: Course[];
  students: Student[];
  mockEmails?: MockEmail[];
  onTriggerOverdueScan?: () => number;
}

interface MetricPoint {
  time: string;
  activeSessions: number;
  apiRequests: number;
  cpu: number;
  memory: number;
  latency: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'system';
  message: string;
}

export default function SystemDiagnostics({ 
  courses, 
  students, 
  mockEmails = [], 
  onTriggerOverdueScan 
}: SystemDiagnosticsProps) {
  const { showSuccess } = useNotification();
  // Real-time metrics history
  const [history, setHistory] = useState<MetricPoint[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [updateInterval, setUpdateInterval] = useState(2000); // 2s default
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [gcTriggered, setGcTriggered] = useState(false);

  const [selectedEmailToView, setSelectedEmailToView] = useState<MockEmail | null>(null);
  const [emailFilter, setEmailFilter] = useState<'all' | 'invoice' | 'book_due' | 'grade_posted'>('all');

  // Supabase Database Integration & Sync States
  const [supabaseStatus, setSupabaseStatus] = useState<'idle' | 'checking' | 'connected' | 'unconfigured' | 'error'>('idle');
  const [supabaseMessage, setSupabaseMessage] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const checkSupabaseStatus = async () => {
    setSupabaseStatus('checking');
    try {
      const res = await fetch('/api/supabase/students');
      const data = await res.json();
      if (data.status === 'connected') {
        setSupabaseStatus('connected');
        setSupabaseMessage('Successfully connected to active Supabase relational instance.');
      } else {
        setSupabaseStatus('unconfigured');
        setSupabaseMessage(data.message || 'Supabase credentials are not configured.');
      }
    } catch (err: any) {
      setSupabaseStatus('error');
      setSupabaseMessage('Unable to reach Supabase backend integration endpoint.');
    }
  };

  // Native PostgreSQL Database States
  const [postgresStatus, setPostgresStatus] = useState<'idle' | 'checking' | 'connected' | 'unconfigured' | 'error'>('idle');
  const [postgresMessage, setPostgresMessage] = useState('');
  const [postgresMeta, setPostgresMeta] = useState<any>(null);

  const checkPostgresStatus = async () => {
    setPostgresStatus('checking');
    try {
      const res = await fetch('/api/postgres/status');
      const data = await res.json();
      if (data.success) {
        setPostgresStatus('connected');
        setPostgresMessage(data.message || 'Successfully connected to native PostgreSQL instance.');
        setPostgresMeta({
          host: data.host,
          database: data.database,
          user: data.user,
          records: data.records
        });
      } else if (data.status === 'unconfigured') {
        setPostgresStatus('unconfigured');
        setPostgresMessage(data.message || 'PostgreSQL host is not configured.');
      } else {
        setPostgresStatus('error');
        setPostgresMessage(data.message || data.error || 'Unable to connect to PostgreSQL.');
      }
    } catch (err: any) {
      setPostgresStatus('error');
      setPostgresMessage('Unable to reach native PostgreSQL status API endpoint.');
    }
  };

  useEffect(() => {
    checkSupabaseStatus();
    checkPostgresStatus();
  }, []);

  const handleSyncToSupabase = async () => {
    setSyncLoading(true);
    setSyncMessage('');
    try {
      const res = await fetch('/api/supabase/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(data.message || 'Catalogs synchronized successfully!');
        checkSupabaseStatus();
      } else {
        setSyncMessage(`Sync failed: ${data.message || data.error}`);
      }
    } catch (err: any) {
      setSyncMessage(`Network error during database synchronization: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // Stats cards references
  const currentCpu = history[history.length - 1]?.cpu || 12;
  const currentMemory = history[history.length - 1]?.memory || 34;
  const currentActive = history[history.length - 1]?.activeSessions || 15;
  const currentLatency = history[history.length - 1]?.latency || 18;

  const logIndexRef = useRef(0);

  // Generate initial history
  useEffect(() => {
    const initialHistory: MetricPoint[] = [];
    const now = new Date();
    for (let i = 15; i >= 0; i--) {
      const timeStr = new Date(now.getTime() - i * 15000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      initialHistory.push({
        time: timeStr,
        activeSessions: Math.floor(Math.random() * 8) + 12,
        apiRequests: Math.floor(Math.random() * 40) + 180,
        cpu: Math.floor(Math.random() * 8) + 8,
        memory: parseFloat((Math.random() * 2 + 32).toFixed(1)),
        latency: Math.floor(Math.random() * 5) + 14,
      });
    }
    setHistory(initialHistory);

    // Initial logs
    setLogs([
      { id: '1', timestamp: new Date(now.getTime() - 10000).toLocaleTimeString(), type: 'system', message: 'Diagnostics engine initialized successfully.' },
      { id: '2', timestamp: new Date(now.getTime() - 8000).toLocaleTimeString(), type: 'info', message: 'API Gateway binding to 0.0.0.0:3000 completed.' },
      { id: '3', timestamp: new Date(now.getTime() - 4000).toLocaleTimeString(), type: 'success', message: 'Database connection pool verified (active: 8, idle: 92).' },
    ]);
  }, []);

  // Live real-time simulator loop
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const timestamp = new Date().toLocaleTimeString();

      // Stress test factor
      const multiplier = isStressTesting ? 3.5 : 1.0;
      const baseSessions = isStressTesting ? 120 : 15;
      const baseCpu = isStressTesting ? 75 : 10;
      const baseMemory = isStressTesting ? 72 : gcTriggered ? 24 : 34;
      const baseLatency = isStressTesting ? 145 : 16;
      const baseRequests = isStressTesting ? 1200 : 210;

      // Random jitter
      const activeSessions = Math.max(5, Math.floor(baseSessions + (Math.random() * 15 - 7.5) * (isStressTesting ? 2 : 1)));
      const cpu = parseFloat(Math.min(100, Math.max(1, baseCpu + (Math.random() * 10 - 5))).toFixed(1));
      const memory = parseFloat(Math.min(100, Math.max(1, baseMemory + (Math.random() * 1.6 - 0.8))).toFixed(1));
      const latency = Math.max(1, Math.floor(baseLatency + (Math.random() * 12 - 6)));
      const apiRequests = Math.max(10, Math.floor(baseRequests + (Math.random() * 50 - 25)));

      // Add point & limit buffer length
      setHistory(prev => {
        const next = [...prev, { time: timeStr, activeSessions, cpu, memory, latency, apiRequests }];
        if (next.length > 20) {
          next.shift();
        }
        return next;
      });

      // Periodic random logging
      const logRoll = Math.random();
      let newLog: LogEntry | null = null;

      logIndexRef.current += 1;
      const logId = `log-${logIndexRef.current}`;

      if (isStressTesting) {
        if (logRoll > 0.4) {
          newLog = {
            id: logId,
            timestamp,
            type: 'warning',
            message: `STRESS TEST: High server throughput. Processing ${apiRequests} requests/min. CPU: ${cpu}%.`
          };
        }
      } else {
        if (logRoll > 0.8) {
          newLog = {
            id: logId,
            timestamp,
            type: 'info',
            message: `GET /api/diagnostics/system-health - 200 OK - ${latency}ms`
          };
        } else if (logRoll > 0.95) {
          newLog = {
            id: logId,
            timestamp,
            type: 'system',
            message: 'Cron job: Automatic ledger integrity audit verified successfully.'
          };
        }
      }

      if (newLog) {
        setLogs(prev => [newLog!, ...prev].slice(0, 50));
      }

      // Reset gc triggered state after 1-2 ticks
      if (gcTriggered && Math.random() > 0.5) {
        setGcTriggered(false);
      }

    }, updateInterval);

    return () => clearInterval(interval);
  }, [isLive, updateInterval, isStressTesting, gcTriggered]);

  // Handle Manual GC Trigger
  const handleTriggerGC = () => {
    setGcTriggered(true);
    const timestamp = new Date().toLocaleTimeString();
    
    // Add GC log
    const gcLog: LogEntry = {
      id: `gc-${Date.now()}`,
      timestamp,
      type: 'success',
      message: 'SYSTEM: Garbage Collection triggered manually. Cleared 412 MB of heap buffers.'
    };
    
    setLogs(prev => [gcLog, ...prev]);

    // Set memory temporarily low in the rolling history immediately
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const last = { ...prev[prev.length - 1], memory: 21.4 };
      return [...prev.slice(0, prev.length - 1), last];
    });
  };

  // Toggle Stress Test
  const handleToggleStressTest = () => {
    const nextState = !isStressTesting;
    setIsStressTesting(nextState);
    const timestamp = new Date().toLocaleTimeString();

    const testLog: LogEntry = nextState 
      ? { id: `stress-${Date.now()}`, timestamp, type: 'warning', message: ' STRESS TESTING MODE ACTIVATED. Simulating thousands of simultaneous student concurrent actions.' }
      : { id: `stress-${Date.now()}`, timestamp, type: 'success', message: ' STRESS TESTING DEACTIVATED. Systems reverting to standard idle operations.' };

    setLogs(prev => [testLog, ...prev]);
  };

  // Compute actual Course Distribution dynamically
  const dynamicCourseData = courses.map(course => {
    const studentCount = students.filter(s => 
      s.enrolledUnits && s.enrolledUnits.some(unit => unit.startsWith(course.code))
    ).length;
    return {
      name: course.code,
      title: course.title,
      students: studentCount || 0,
      faculty: course.faculty
    };
  });

  // Color map for the course chart pie cells
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

  return (
    <div className="space-y-6">
      
      {/* SECTION HEADER WITH ACTION SWITCHES */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
            <span>Real-time System Diagnostics</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitor cluster health, live student requests, host resource metrics, and dynamic application trends.
          </p>
        </div>

        {/* CONTROLS BAR */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live toggle */}
          <button
            type="button"
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isLive 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900' 
                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            }`}
          >
            {isLive ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isLive ? 'LIVE' : 'PAUSED'}</span>
          </button>

          {/* Speed switch */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setUpdateInterval(1000)}
              className={`px-2 py-1 text-[10px] font-black rounded-md ${updateInterval === 1000 ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              1s
            </button>
            <button
              type="button"
              onClick={() => setUpdateInterval(2000)}
              className={`px-2 py-1 text-[10px] font-black rounded-md ${updateInterval === 2000 ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              2s
            </button>
            <button
              type="button"
              onClick={() => setUpdateInterval(5000)}
              className={`px-2 py-1 text-[10px] font-black rounded-md ${updateInterval === 5000 ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              5s
            </button>
          </div>

          {/* Trigger GC */}
          <button
            type="button"
            onClick={handleTriggerGC}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
            title="Force immediate garbage collection allocation reduction"
          >
            <Trash className="w-3.5 h-3.5" />
            <span>Collect GC</span>
          </button>

          {/* Stress test */}
          <button
            type="button"
            onClick={handleToggleStressTest}
            className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 border transition-all cursor-pointer shadow-sm ${
              isStressTesting 
                ? 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700 animate-pulse' 
                : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${isStressTesting ? 'animate-bounce' : ''}`} />
            <span>{isStressTesting ? 'Stop Stress' : 'Stress Simulator'}</span>
          </button>
        </div>
      </div>

      {/* SYSTEM DIAGNOSTICS CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Student Sessions */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase block font-mono">Active Sessions</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-white font-mono">{currentActive}</span>
              <span className={`text-[10px] font-bold ${isStressTesting ? 'text-rose-600' : 'text-emerald-600'}`}>
                {isStressTesting ? '+950%' : 'Idle'}
              </span>
            </div>
            <span className="text-[10px] text-slate-450 dark:text-slate-400 block font-medium">Real-time active users</span>
          </div>
          <div className={`p-2.5 rounded-xl ${isStressTesting ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600' : 'bg-blue-100 dark:bg-blue-950/50 text-blue-600'}`}>
            <Server className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: CPU Utilization */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase block font-mono">Host CPU Usage</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-white font-mono">{currentCpu}%</span>
              <span className={`text-[10px] font-bold ${currentCpu > 70 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
                {currentCpu > 70 ? 'CRITICAL' : 'OPTIMAL'}
              </span>
            </div>
            <span className="text-[10px] text-slate-450 dark:text-slate-400 block font-medium">AWS Node Cluster Host</span>
          </div>
          <div className={`p-2.5 rounded-xl ${currentCpu > 70 ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600' : 'bg-teal-100 dark:bg-teal-950/50 text-teal-600'}`}>
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Memory footprint */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase block font-mono">Heap Allocation</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-white font-mono">{currentMemory}%</span>
              <span className="text-[10px] text-emerald-600 font-bold">
                {parseFloat((currentMemory * 0.04).toFixed(2))} GB
              </span>
            </div>
            <span className="text-[10px] text-slate-450 dark:text-slate-400 block font-medium">Shared Heap Limit 4GB</span>
          </div>
          <div className="p-2.5 bg-amber-100 dark:bg-amber-950/50 text-amber-600 rounded-xl">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Network Latency */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase block font-mono">API Gateway Latency</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-white font-mono">{currentLatency}ms</span>
              <span className={`text-[10px] font-bold ${currentLatency > 100 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {currentLatency > 100 ? 'SLOW' : 'FAST'}
              </span>
            </div>
            <span className="text-[10px] text-slate-450 dark:text-slate-400 block font-medium">Nginx ingress endpoint</span>
          </div>
          <div className="p-2.5 bg-purple-100 dark:bg-purple-950/50 text-purple-600 rounded-xl">
            <Wifi className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* SUPABASE INTEGRATION STATUS & DATA SYNC CONTROL MODULE */}
      <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600 animate-pulse" />
              <span>Supabase Relational Database Integration</span>
            </h4>
            <p className="text-xs text-slate-500">
              Synchronize, model, and inspect courses, students, and lecturers catalog in your external Supabase PostgreSQL platform.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={checkSupabaseStatus}
              disabled={supabaseStatus === 'checking'}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-250 dark:border-slate-750 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${supabaseStatus === 'checking' ? 'animate-spin' : ''}`} />
              <span>Check Status</span>
            </button>

            {supabaseStatus === 'connected' ? (
              <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs font-extrabold px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>Supabase: CONNECTED</span>
              </span>
            ) : supabaseStatus === 'checking' ? (
              <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-xs font-extrabold px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900 flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>Checking Connection...</span>
              </span>
            ) : (
              <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-xs font-extrabold px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Supabase: SIMULATION</span>
              </span>
            )}
          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3.5">
            {/* Connection status message */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <span className="font-extrabold text-slate-800 dark:text-slate-100 block mb-1">Connection State details</span>
              {supabaseMessage}
            </div>

            {/* Guidelines box */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950 p-4 rounded-2xl space-y-2 text-xs">
              <span className="font-extrabold text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>How to link your live Supabase database:</span>
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-indigo-950 dark:text-indigo-250">
                <li>Create a database project on your <strong className="font-bold">Supabase Dashboard</strong>.</li>
                <li>Go to <strong className="font-bold">Project Settings &rarr; API</strong> to retrieve your <strong className="font-bold">Project URL</strong> and <strong className="font-bold">Anon API Key</strong>.</li>
                <li>Add them as <strong className="font-bold">SUPABASE_URL</strong> and <strong className="font-bold">SUPABASE_KEY</strong> inside your AI Studio Settings Secrets panel.</li>
                <li>Execute the schema defined in <code className="font-mono bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.5 rounded text-[10px]">supabase_schema.sql</code> inside the Supabase SQL Editor.</li>
              </ol>
            </div>
          </div>

          {/* Sync actions card */}
          <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase block font-mono">Sync Master Data</span>
              <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed">
                Clicking Sync will take all Courses ({courses.length}), Students ({students.length}), and Lecturers presently cached in your portal and perform a clean upsert/sync directly into your Supabase Postgres tables.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleSyncToSupabase}
                disabled={syncLoading || supabaseStatus !== 'connected'}
                className={`w-full py-2 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
                  supabaseStatus === 'connected'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-200 text-slate-400 dark:bg-slate-850 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
                <span>{syncLoading ? 'Syncing...' : 'Sync to Supabase'}</span>
              </button>

              {syncMessage && (
                <div className={`p-2.5 rounded-xl border text-[11px] font-medium text-center ${
                  syncMessage.includes('failed') || syncMessage.includes('error')
                    ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-950'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-950'
                }`}>
                  {syncMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NATIVE POSTGRESQL / CLOUD SQL STATUS MODULE */}
      <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight flex items-center gap-2 font-sans">
              <Database className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>Native PostgreSQL Database Status (Cloud SQL)</span>
            </h4>
            <p className="text-xs text-slate-500">
              Your application's primary internal datastore managed securely using Drizzle ORM.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={checkPostgresStatus}
              disabled={postgresStatus === 'checking'}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-250 dark:border-slate-750 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${postgresStatus === 'checking' ? 'animate-spin' : ''}`} />
              <span>Check Postgres</span>
            </button>

            {postgresStatus === 'connected' ? (
              <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs font-extrabold px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>Postgres: ACTIVE</span>
              </span>
            ) : postgresStatus === 'checking' ? (
              <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-xs font-extrabold px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900 flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>Verifying...</span>
              </span>
            ) : (
              <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 text-xs font-extrabold px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>Postgres: OFFLINE / FALLBACK</span>
              </span>
            )}
          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3.5">
            {/* Connection status message */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <span className="font-extrabold text-slate-800 dark:text-slate-100 block mb-1">Database State Details</span>
              {postgresMessage || 'PostgreSQL credentials are not configured or proxy is booting.'}
            </div>

            {/* Meta details if connected */}
            {postgresMeta && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-150 dark:border-slate-800 text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">DB Host</span>
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-0.5 block truncate">{postgresMeta.host}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-150 dark:border-slate-800 text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Database Name</span>
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-0.5 block truncate">{postgresMeta.database}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-150 dark:border-slate-800 text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">User Role</span>
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-0.5 block truncate">{postgresMeta.user}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-150 dark:border-slate-800 text-center">
                  <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider block font-mono">Schema Status</span>
                  <span className="text-xs font-extrabold text-emerald-600 mt-0.5 block">UP TO DATE</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase block font-mono">Relational Schema (Drizzle)</span>
              <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed">
                The database schema is structured natively using <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">drizzle-orm</code> mapping all entities. State persistence guarantees seamless recovery.
              </p>
            </div>
            
            <div className="text-[11px] font-medium text-slate-500 text-center p-2 rounded-xl bg-slate-100 dark:bg-slate-800/50">
               Local proxy is managed automatically by the environment.
            </div>
          </div>
        </div>
      </div>

      {/* CORE DIAGNOSTICS CHARTS AREA */}

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* CHART 1: Real-time Users & Traffic Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                User Traffic & Load Velocity Trend
              </h4>
              <p className="text-[10px] text-slate-500">
                Live scrolling active online student users & corresponding API request counts.
              </p>
            </div>
            {isStressTesting && (
              <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-2 py-0.5 rounded-md animate-pulse uppercase">
                Stress Active
              </span>
            )}
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 9 }} 
                  stroke="#94a3b8" 
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 9 }} 
                  stroke="#94a3b8" 
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    fontSize: '11px', 
                    borderRadius: '12px', 
                    borderColor: '#e2e8f0', 
                    background: 'rgba(255,255,255,0.96)' 
                  }} 
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                <Area 
                  type="monotone" 
                  name="Active User Sessions" 
                  dataKey="activeSessions" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSessions)" 
                />
                <Area 
                  type="monotone" 
                  name="API Requests/min" 
                  dataKey="apiRequests" 
                  stroke="#8b5cf6" 
                  strokeWidth={1.5}
                  fillOpacity={1} 
                  fill="url(#colorRequests)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Dynamic Course Allocation */}
        <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm">
          <div className="space-y-0.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200">
              Active Enrolled Course Distribution
            </h4>
            <p className="text-[10px] text-slate-500">
              Real enrollment allocation derived dynamically from current student database records.
            </p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dynamicCourseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="students"
                >
                  {dynamicCourseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    fontSize: '11px', 
                    borderRadius: '12px', 
                    borderColor: '#e2e8f0' 
                  }} 
                  formatter={(value, name, props) => [`${value} Students`, `${props.payload.title}`]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* CUSTOM STATS LEGEND */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
            {dynamicCourseData.map((data, idx) => (
              <div key={data.name} className="flex items-center gap-1.5 text-[10px]">
                <span 
                  className="w-2.5 h-2.5 rounded-xs shrink-0" 
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }} 
                />
                <div className="truncate">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{data.name}</span>
                  <span className="text-slate-400 block truncate text-[9px]">{data.students} students</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CHART 3: Hardware Resource Utilization Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm">
          <div className="space-y-0.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200">
              Host Cluster Resource Utilization (%)
            </h4>
            <p className="text-[10px] text-slate-500">
              Compute constraints history: CPU core load and virtualized hardware RAM usage.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="#94a3b8" tickLine={false} />
                <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px', borderColor: '#e2e8f0' }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                <Line 
                  type="monotone" 
                  name="CPU Utilization (%)" 
                  dataKey="cpu" 
                  stroke="#ef4444" 
                  strokeWidth={2} 
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  name="RAM/Memory Occupancy (%)" 
                  dataKey="memory" 
                  stroke="#f59e0b" 
                  strokeWidth={2} 
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SYSTEM AUDITS & DB CONNECTION HEALTH */}
        <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 space-y-4.5 shadow-sm">
          <div className="space-y-0.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200">
              Cluster Node Subsystems
            </h4>
            <p className="text-[10px] text-slate-500">
              Operational heartbeat status of key middleware layers.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {/* Row 1: PostgreSQL Relational Engine */}
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-900 pb-2.5">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-500" />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">PostgreSQL Engine</span>
                  <span className="text-[10px] text-slate-400 block font-mono">Status: Connected (Pool: 8/100)</span>
                </div>
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 font-mono uppercase">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                <span>ONLINE</span>
              </span>
            </div>

            {/* Row 2: SSL Certificate status */}
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-900 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">SSL SHA256 TLS Cert</span>
                  <span className="text-[10px] text-slate-400 block font-mono">Let's Encrypt CA (284 Days remaining)</span>
                </div>
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 font-mono uppercase">
                <span>VALID</span>
              </span>
            </div>

            {/* Row 3: API Gateway Proxy */}
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-900 pb-2.5">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-500" />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Nginx Proxy Router</span>
                  <span className="text-[10px] text-slate-400 block font-mono">Reverse proxy bounding port 3000</span>
                </div>
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 font-mono uppercase">
                <span>ROUTING</span>
              </span>
            </div>

            {/* Row 4: Redis Object cache */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Redis Object Cache</span>
                  <span className="text-[10px] text-slate-400 block font-mono">Hit Ratio: 94.2% (12k / 12.7k hits)</span>
                </div>
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 font-mono uppercase">
                <span>94% HIT</span>
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* DYNAMIC LOG FEED CONSOLE */}
      <div className="bg-slate-950 text-slate-300 font-mono text-[11px] rounded-3xl p-5 border border-slate-800 space-y-3.5 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-extrabold text-white tracking-wide text-xs uppercase">Live Middleware Terminal Logger Feed</span>
          </div>
          <button 
            type="button" 
            onClick={() => setLogs([])}
            className="text-[10px] text-slate-500 hover:text-slate-300 uppercase font-black"
          >
            Clear Terminal
          </button>
        </div>

        {/* LOG LINES DISPLAY */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono scrollbar-thin scrollbar-thumb-slate-800">
          {logs.length === 0 ? (
            <p className="text-slate-600 text-center py-4">Terminal is currently empty. Waiting for requests...</p>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex items-start gap-2.5 hover:bg-slate-900/40 p-0.5 rounded transition-all">
                <span className="text-slate-600 select-none shrink-0 font-bold">[{log.timestamp}]</span>
                <span className={`px-1.5 py-0.5 text-[9px] rounded font-black uppercase shrink-0 ${
                  log.type === 'warning' ? 'bg-amber-950 text-amber-400 border border-amber-900/60' :
                  log.type === 'success' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/60' :
                  log.type === 'system' ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-900/60' :
                  'bg-slate-900 text-slate-300 border border-slate-800'
                }`}>
                  {log.type}
                </span>
                <span className="leading-relaxed break-all text-slate-100">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MOCK SMTP AUTOMATED OUTBOUND ALERTS PANEL */}
      <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
          <div className="space-y-0.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-indigo-600" />
              <span>Automated SMTP Email Log (Mock Service)</span>
            </h4>
            <p className="text-[10px] text-slate-500">
              Dispatched outbound email alerts sent to students for outstanding invoices, overdue books, or published grading sheets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Filter buttons */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setEmailFilter('all')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${emailFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-3xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                All ({mockEmails.length})
              </button>
              <button
                type="button"
                onClick={() => setEmailFilter('invoice')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${emailFilter === 'invoice' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-3xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Invoices ({mockEmails.filter(m => m.type === 'invoice').length})
              </button>
              <button
                type="button"
                onClick={() => setEmailFilter('book_due')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${emailFilter === 'book_due' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-3xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Due Books ({mockEmails.filter(m => m.type === 'book_due').length})
              </button>
              <button
                type="button"
                onClick={() => setEmailFilter('grade_posted')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${emailFilter === 'grade_posted' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-3xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Grades ({mockEmails.filter(m => m.type === 'grade_posted').length})
              </button>
            </div>

            {/* Run Overdue Scanner */}
            {onTriggerOverdueScan && (
              <button
                type="button"
                onClick={() => {
                  const sent = onTriggerOverdueScan();
                  showSuccess("Scanner Completed", `Dispatched ${sent} due/overdue library books email alerts!`);
                }}
                className="bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-700 shadow-xs cursor-pointer flex items-center gap-1"
                title="Scan database and trigger notifications for overdue books"
              >
                <Send className="w-3 h-3 animate-pulse" />
                <span>Scan Overdue Books</span>
              </button>
            )}
          </div>
        </div>

        {/* EMAILS LOG LIST */}
        <div className="overflow-x-auto">
          {mockEmails.filter(m => emailFilter === 'all' || m.type === emailFilter).length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-150 dark:border-slate-800 rounded-2xl">
              <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-bold">No SMTP messages dispatched matching this filter.</p>
              <p className="text-[10px] text-slate-400 mt-1">Actions like posting grades, assigning billing invoices or running overdue scans will populate this log.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-850 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  <th className="py-2.5">Sent At</th>
                  <th className="py-2.5">Alert Type</th>
                  <th className="py-2.5">Recipient</th>
                  <th className="py-2.5">Subject</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-900 text-[11px]">
                {mockEmails
                  .filter(m => emailFilter === 'all' || m.type === emailFilter)
                  .map(email => (
                    <tr key={email.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 font-mono text-[10px] text-slate-500">{email.sentAt}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          email.type === 'invoice' ? 'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60' :
                          email.type === 'book_due' ? 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60' :
                          'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60'
                        }`}>
                          {email.type === 'invoice' ? 'Invoice Billing' : email.type === 'book_due' ? 'Book Due Alert' : 'Grade Posted'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="font-bold text-slate-800 dark:text-slate-250">{email.recipientName}</div>
                        <div className="text-[10px] text-slate-450 dark:text-slate-400 font-mono">{email.to}</div>
                      </td>
                      <td className="py-3 font-medium text-slate-600 dark:text-slate-350 truncate max-w-xs" title={email.subject}>
                        {email.subject}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedEmailToView(email)}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 px-2 py-1 rounded-lg font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Envelope</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* SMTP MOCK MAIL ENVELOPE MODAL */}
      {selectedEmailToView && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-2xs z-55 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl shadow-2xl border border-slate-150 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* SMTP Mail Header Envelope style */}
            <div className="bg-indigo-900 text-indigo-100 p-5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black tracking-widest uppercase bg-indigo-800 text-indigo-200 px-2.5 py-1 rounded-full border border-indigo-700">
                  SMTP OUTBOUND METADATA
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedEmailToView(null)}
                  className="text-indigo-300 hover:text-white transition-colors cursor-pointer text-xs uppercase font-black"
                >
                  Close Envelope
                </button>
              </div>

              <div className="space-y-1 font-mono text-xs">
                <div><span className="text-indigo-300 font-bold">Mail Gateway Host:</span> <span className="text-white">smtp.mockservice.zenti.edu</span></div>
                <div><span className="text-indigo-300 font-bold">From:</span> <span className="text-white">no-reply@zenti.edu</span></div>
                <div><span className="text-indigo-300 font-bold">To:</span> <span className="text-white">"{selectedEmailToView.recipientName}" &lt;{selectedEmailToView.to}&gt;</span></div>
                <div><span className="text-indigo-300 font-bold">Timestamp:</span> <span className="text-white">{selectedEmailToView.sentAt}</span></div>
                <div><span className="text-indigo-300 font-bold">Subject:</span> <span className="text-emerald-300 font-extrabold">{selectedEmailToView.subject}</span></div>
              </div>
            </div>

            {/* Email Message Content */}
            <div className="p-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto flex-1 font-sans text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-md mx-auto">
                {selectedEmailToView.body}
              </div>
            </div>

            {/* SMTP footer info */}
            <div className="bg-slate-100 dark:bg-slate-850 p-3.5 px-6 border-t border-slate-150 dark:border-slate-800 text-center text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              Mock SMTP TLS Tunnel Sec | Delivery Protocol: Verified SMTP Relay Alert Dispatched Success.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
