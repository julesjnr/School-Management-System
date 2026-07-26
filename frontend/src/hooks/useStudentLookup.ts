import { useCallback, useEffect, useState } from 'react';
import {
  LecturerStudentDirectoryItem,
  LecturerStudentLookup,
} from '../types';

export function useStudentLookup(lecturerId: string | undefined) {
  const [directory, setDirectory] = useState<LecturerStudentDirectoryItem[]>([]);
  const [selected, setSelected] = useState<LecturerStudentLookup | null>(null);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(true);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDirectory = useCallback(
    async (q = '') => {
      if (!lecturerId) {
        setDirectory([]);
        setIsLoadingDirectory(false);
        return;
      }
      setIsLoadingDirectory(true);
      setError(null);
      try {
        const params = new URLSearchParams({ lecturerId });
        if (q.trim()) params.set('q', q.trim());
        const res = await fetch(`/api/lecturer/students?${params.toString()}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || `Failed to load students (${res.status})`);
        }
        setDirectory(Array.isArray(body) ? body : []);
      } catch (err: any) {
        console.error('Lecturer student directory error:', err);
        setError(err.message || 'Failed to load student directory');
        setDirectory([]);
      } finally {
        setIsLoadingDirectory(false);
      }
    },
    [lecturerId]
  );

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  const lookupStudent = useCallback(
    async (opts: { admissionNo?: string; studentId?: string }) => {
      if (!lecturerId) {
        throw new Error('Lecturer ID is required');
      }
      setIsLookingUp(true);
      setError(null);
      try {
        const params = new URLSearchParams({ lecturerId });
        if (opts.studentId) params.set('studentId', opts.studentId);
        if (opts.admissionNo) params.set('admission_no', opts.admissionNo);
        const res = await fetch(`/api/lecturer/student-lookup?${params.toString()}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || `Student lookup failed (${res.status})`);
        }
        setSelected(body as LecturerStudentLookup);
        return body as LecturerStudentLookup;
      } catch (err: any) {
        setSelected(null);
        setError(err.message || 'Student lookup failed');
        throw err;
      } finally {
        setIsLookingUp(false);
      }
    },
    [lecturerId]
  );

  const clearSelection = useCallback(() => {
    setSelected(null);
    setError(null);
  }, []);

  return {
    directory,
    selected,
    isLoadingDirectory,
    isLookingUp,
    error,
    fetchDirectory,
    lookupStudent,
    clearSelection,
    setSelected,
  };
}
