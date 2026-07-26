/** Shared academic grade → GPA helpers for student portal widgets. */

export function markToGpaPoints(mark: number): number {
  if (mark >= 70) return 4.0;
  if (mark >= 60) return 3.0;
  if (mark >= 50) return 2.0;
  if (mark >= 40) return 1.0;
  return 0.0;
}

export function gpaStandingLabel(gpa: number): string {
  if (gpa >= 3.7) return 'Excellent';
  if (gpa >= 3.0) return 'Good';
  if (gpa >= 2.0) return 'Satisfactory';
  if (gpa > 0) return 'At Risk';
  return 'N/A';
}

export function computeCumulativeGpa(
  grades: Record<string, { cat: number; exam: number }>
): number | null {
  const entries = Object.values(grades);
  if (entries.length === 0) return null;
  const total = entries.reduce(
    (sum, g) => sum + markToGpaPoints(Number(g.cat) + Number(g.exam)),
    0
  );
  return Number((total / entries.length).toFixed(2));
}

export interface GpaTrendPoint {
  label: string;
  gpa: number;
  date?: string;
}

/** Build cumulative GPA points ordered by gradedAt when available. */
export function buildGpaTrend(
  grades: Record<string, { cat: number; exam: number; gradedAt?: string }>
): GpaTrendPoint[] {
  const entries = Object.entries(grades).map(([code, g]) => ({
    code,
    mark: Number(g.cat) + Number(g.exam),
    gradedAt: g.gradedAt || '',
  }));

  if (entries.length === 0) return [];

  entries.sort((a, b) => {
    if (a.gradedAt && b.gradedAt) return a.gradedAt.localeCompare(b.gradedAt);
    if (a.gradedAt) return -1;
    if (b.gradedAt) return 1;
    return a.code.localeCompare(b.code);
  });

  let running = 0;
  return entries.map((entry, index) => {
    running += markToGpaPoints(entry.mark);
    const gpa = Number((running / (index + 1)).toFixed(2));
    const label = entry.gradedAt
      ? new Date(entry.gradedAt).toLocaleDateString('en-GB', {
          month: 'short',
          year: '2-digit',
        })
      : entry.code;
    return { label, gpa, date: entry.gradedAt || undefined };
  });
}
