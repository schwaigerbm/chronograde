// src/lib/averageCalculator.ts
import type { CourseEntry, Grade, GradeEntry } from '../schema';

export const getCollaborationPercentage = (entries?: GradeEntry[]): number | null => {
  if (!entries || entries.length === 0) return null;
  const totalPoints = entries.reduce((sum, entry) => {
    if (entry.value === '+') return sum + 1;
    if (entry.value === '~') return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((totalPoints / entries.length) * 100);
};

export const getPresencePercentage = (entries?: GradeEntry[]): number | null => {
  if (!entries || entries.length === 0) return null;
  const totalHours = entries.reduce((sum, entry) => sum + (entry.hours || 1), 0);
  const presentHours = entries.reduce((sum, entry) => {
    return sum + (entry.value === 'check' ? (entry.hours || 1) : 0);
  }, 0);
  return Math.round((presentHours / totalHours) * 100);
};

export const calculateAverage = (
  studentId: string, 
  columns: CourseEntry[], 
  allGrades: Record<string, Record<string, Grade>>, 
  cutoffDate?: string, 
  roundingRule: 'commercial' | 'studentFriendly' = 'commercial'
) => {
  let totalWeightValue = 0;
  let weightedSum = 0;
  const breakdown: { title: string, value: number, weight: number, impact?: number }[] = [];

  const relevantColumns = columns.filter(col => {
    if (col.calc === false) return false;
    if (col.type === 'calculated') return false; 
    if (col.type === 'presenceSum' || col.type === 'groupAssignment') return false;
    if (cutoffDate && col.date > cutoffDate) return false;
    return true;
  });

  relevantColumns.forEach(col => {
    const grade = allGrades[studentId]?.[col.id];
    if (!grade) return;

    let percent: number | null = null;
    
    if (col.type === 'collaborationSum') {
      percent = getCollaborationPercentage(grade.entries);
    } else if (grade.value !== undefined && grade.value !== '') {
      if (col.calcType === 'sign') {
        if (grade.value === '+') percent = 100;
        else if (grade.value === '~') percent = 50;
        else if (grade.value === '-') percent = 0;
      } else {
        const numericValue = Number(grade.value);
        if (!isNaN(numericValue)) {
          if (col.calcType === 'grade') {
            // Mapping von Note -> Prozent für die Berechnung
            switch (numericValue) {
              case 1: percent = 100; break;
              case 2: percent = 89; break;
              case 3: percent = 79; break;
              case 4: percent = 64; break;
              case 5: percent = 49; break;
              default: percent = 0;
            }
          } else {
            percent = numericValue;
          }
        }
      }
    }

    if (percent !== null) {
      const weight = (col.calcFactor !== undefined ? col.calcFactor : 100);
      weightedSum += percent * (weight / 100);
      totalWeightValue += (weight / 100);
      breakdown.push({ title: col.title, value: percent, weight });
    }
  });

  if (totalWeightValue === 0) return { percent: null, grade: null, breakdown: [] };
  
  let averagePercent = weightedSum / totalWeightValue;
  
  // RUNDUNGSREGEL ANWENDEN
  if (roundingRule === 'studentFriendly') {
    averagePercent = Math.ceil(averagePercent);
  } else {
    averagePercent = Math.round(averagePercent);
  }

  // Add actual impact to breakdown
  breakdown.forEach(item => {
    item.impact = Math.round(((item.weight / 100) / totalWeightValue) * 100);
  });
  
  // Österreichisches Notensystem (Laut Tabelle)
  let finalGrade: number;
  if (averagePercent >= 90) {
    finalGrade = 1;
  } else if (averagePercent >= 80) {
    finalGrade = 2;
  } else if (averagePercent >= 65) {
    finalGrade = 3;
  } else if (averagePercent >= 50) {
    finalGrade = 4;
  } else {
    finalGrade = 5;
  }
  
  return { 
    percent: Math.round(averagePercent), 
    grade: finalGrade,
    breakdown 
  };
};
