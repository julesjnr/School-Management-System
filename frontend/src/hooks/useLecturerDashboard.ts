import { useCallback, useEffect, useState } from 'react';
import { LecturerDashboardSummary, TeachingSessionRecord } from '../types';

export function useLecturerDashboard(lecturerId: string | undefined) {
  const [summary, setSummary] = useState<LecturerDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!lecturerId) {
      setIsLoading(false);
      setSummary(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/lecturer/dashboard-summary?lecturerId=${encodeURIComponent(lecturerId)}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load dashboard (${res.status})`);
      }
      const data = (await res.json()) as LecturerDashboardSummary;
      setSummary(data);
    } catch (err: any) {
      console.error('Lecturer dashboard summary error:', err);
      setError(err.message || 'Failed to load lecturer dashboard');
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [lecturerId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const logTeachingSession = useCallback(
    async (payload: {
      subjectCode: string;
      topic: string;
      durationHours: number;
      sessionDate?: string;
      sessionTime?: string;
    }): Promise<{
      session: TeachingSessionRecord;
      loggedHours: number;
      hourlyRate: number;
      estimatedPayout: number;
    }> => {
      if (!lecturerId) {
        throw new Error('Lecturer ID is required');
      }
      setIsLogging(true);
      try {
        const res = await fetch('/api/lecturer/teaching-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lecturerId,
            ...payload,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || `Failed to log session (${res.status})`);
        }
        await fetchSummary();
        return body;
      } finally {
        setIsLogging(false);
      }
    },
    [lecturerId, fetchSummary]
  );

  return {
    summary,
    isLoading,
    error,
    isLogging,
    refresh: fetchSummary,
    logTeachingSession,
  };
}
