// src/lib/anomalyDetector.ts
import type { GradeEntry } from '../schema';

export interface Anomaly {
  ruleId: 1 | 2 | 3;
  message: string;
}

/**
 * Checks for three types of attendance anomalies based on historical presence data:
 * 1. Absent twice in a row (last 2 entries are both 'x')
 * 2. Absent twice in the last 3 sessions (at least 2 out of the last 3 are 'x')
 * 3. Absent three times in the last 5 sessions (at least 3 out of the last 5 are 'x')
 * 
 * @param entries List of presence entries for the student
 * @returns Array of detected anomalies
 */
export const checkAttendanceAnomalies = (entries: GradeEntry[]): Anomaly[] => {
  // Filter entries to ensure we only look at attendance values and sort them chronologically (ascending)
  const presenceEntries = entries
    .filter(e => e.value === 'check' || e.value === 'x')
    .sort((a, b) => a.date.localeCompare(b.date));

  const N = presenceEntries.length;
  if (N === 0) return [];

  const anomalies: Anomaly[] = [];

  // Rule 1: Fehlt der Schüler schon das zweite mal in Folge?
  if (N >= 2) {
    const last1 = presenceEntries[N - 1];
    const last2 = presenceEntries[N - 2];
    if (last1.value === 'x' && last2.value === 'x') {
      anomalies.push({
        ruleId: 1,
        message: 'Fehlt das zweite Mal in Folge'
      });
    }
  }

  // Rule 2: Hat er in den letzten drei Terminen zweimal gefehlt?
  if (N >= 2) {
    const last3 = presenceEntries.slice(Math.max(0, N - 3));
    const absentCount = last3.filter(e => e.value === 'x').length;
    if (absentCount >= 2) {
      anomalies.push({
        ruleId: 2,
        message: 'Hat in den letzten drei Terminen zweimal gefehlt'
      });
    }
  }

  // Rule 3: Hat er in den letzten 5 Terminen 3 mal gefehlt?
  if (N >= 3) {
    const last5 = presenceEntries.slice(Math.max(0, N - 5));
    const absentCount = last5.filter(e => e.value === 'x').length;
    if (absentCount >= 3) {
      anomalies.push({
        ruleId: 3,
        message: 'Hat in den letzten fünf Terminen dreimal gefehlt'
      });
    }
  }

  return anomalies;
};
