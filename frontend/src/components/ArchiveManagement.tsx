import { useEffect, useState } from 'react';
import { ArchiveRestore, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNotification } from './notifications';

type ArchiveRecord = {
  resourceType: string;
  resourceId: string;
  displayName: string;
  archivedAt: string;
  archivedBy?: string | null;
};

const labels: Record<string, string> = {
  student: 'Students', lecturer: 'Lecturers / Staff', course: 'Courses',
  department: 'Departments', book: 'Library', user: 'Users',
};

export default function ArchiveManagement() {
  const [records, setRecords] = useState<ArchiveRecord[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('archivedAtDesc');
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const { showConfirm } = useNotification();

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (search) params.set('search', search);
      if (type) params.set('type', type);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('sort', sort);
      const response = await fetch(`/api/archive?${params}`);
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Unable to load archived records.');
      setRecords(data.records || []);
      setTotalPages(data.totalPages || 1);
    } catch (error: any) {
      toast.error(error.message || 'Unable to load archived records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [page, type, from, to, sort]);

  const act = async (record: ArchiveRecord, action: 'restore' | 'permanent') => {
    const isPermanent = action === 'permanent';
    const confirmed = await showConfirm(isPermanent
      ? { title: 'Permanently delete record', message: `Permanently delete ${record.displayName}? This cannot be undone and will only proceed when no active references exist.`, confirmText: 'Delete permanently', variant: 'danger' }
      : { title: 'Restore archived record', message: `Restore ${record.displayName}? It will return to its normal module immediately.`, confirmText: 'Restore record', variant: 'primary' });
    if (!confirmed) return;
    try {
      const url = isPermanent
        ? `/api/archive/${record.resourceType}/${record.resourceId}/permanent`
        : `/api/archive/${record.resourceType}/${record.resourceId}/restore`;
      const response = await fetch(url, { method: isPermanent ? 'DELETE' : 'POST' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Archive action failed.');
      toast.success(data.message);
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Archive action failed.');
    }
  };

  return <section className="space-y-4">
    <div><h2 className="text-xl font-bold text-slate-900">Archive</h2><p className="text-sm text-slate-500">Archived records are hidden from operational modules and can be restored here.</p></div>
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
      <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} onKeyDown={(e) => { if (e.key === 'Enter') void load(); }} placeholder="Search archived records" className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="rounded border border-slate-300 px-3 py-2 text-sm"><option value="">All record types</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <div className="flex gap-2"><input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2 text-sm" /><button onClick={() => void load()} className="rounded bg-slate-800 px-3 text-white" aria-label="Search archive"><RefreshCw className="h-4 w-4" /></button></div>
    </div>
    <div className="flex justify-end"><select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"><option value="archivedAtDesc">Newest archived</option><option value="archivedAtAsc">Oldest archived</option><option value="nameAsc">Record name A–Z</option><option value="nameDesc">Record name Z–A</option></select></div>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Record</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Archived</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={4} className="p-6 text-center text-slate-500">Loading archive…</td></tr> : records.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-slate-500">No archived records match these filters.</td></tr> : records.map((record) => <tr key={`${record.resourceType}-${record.resourceId}`} className="border-t border-slate-100"><td className="px-4 py-3 font-medium text-slate-800">{record.displayName}</td><td className="px-4 py-3"><span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Archived · {labels[record.resourceType] || record.resourceType}</span></td><td className="px-4 py-3 text-slate-600">{new Date(record.archivedAt).toLocaleString()}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => void act(record, 'restore')} className="inline-flex items-center gap-1 rounded border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700"><ArchiveRestore className="h-3.5 w-3.5" />Restore</button><button onClick={() => void act(record, 'permanent')} className="inline-flex items-center gap-1 rounded border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700"><Trash2 className="h-3.5 w-3.5" />Delete permanently</button></div></td></tr>)}</tbody></table><div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-2 py-1 disabled:opacity-40">Previous</button><button disabled={page === totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button></div></div></div>
  </section>;
}
