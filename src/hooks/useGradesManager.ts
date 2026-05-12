import { useState, useEffect, useCallback } from 'react';
import { firebaseService } from '../services/firebaseService';
import type { Student, Grade, GradesState, Course, GradeEntry } from '../schema';

/**
 * Hook to manage grades for a specific course.
 * Provides real-time synchronization with Firestore.
 */
export const useGradesManager = (course: Course | null) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<GradesState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 1. Load students for the course
  useEffect(() => {
    if (!course) {
      setStudents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // For now, we fetch all students and filter by enrolled IDs
    // In a larger app, we'd want a more targeted subscription
    const unsubscribe = firebaseService.subscribeToStudents(null, (allStudents) => {
      const enrolled = allStudents.filter(s => course.enrolledStudents.includes(s.id));
      // Keep the order of enrolledStudents if possible
      const ordered = course.enrolledStudents
        .map(id => enrolled.find(s => s.id === id))
        .filter((s): s is Student => !!s);
      
      setStudents(ordered);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [course?.id, course?.enrolledStudents]);

  // 2. Subscribe to grades in real-time
  useEffect(() => {
    if (students.length === 0 || !course?.id) {
      setGrades({});
      return;
    }

    const unsubscribes = students.map((student) => {
      return firebaseService.subscribeToGrades(student.id, course.id, (studentGrades) => {
        setGrades((prev) => ({
          ...prev,
          [student.id]: studentGrades,
        }));
      });
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [students, course?.id]);

  // 3. Update a grade
  const updateGrade = useCallback(
    async (studentId: string, columnId: string, grade: Grade) => {
      if (!course?.id) return;
      try {
        await firebaseService.updateGradeEntry(studentId, course.id, columnId, grade);
      } catch (err) {
        console.error('Error updating grade:', err);
        throw err;
      }
    },
    [course?.id]
  );

  // 4. Add an entry to a multi-entry grade (collaboration/presence)
  const addGradeEntry = useCallback(
    async (studentId: string, columnId: string, entry: GradeEntry) => {
      if (!course?.id) return;
      const currentGrade = grades[studentId]?.[columnId] || { entries: [] };
      const updatedEntries = [...(currentGrade.entries || []), entry];
      
      try {
        await firebaseService.updateGradeEntry(studentId, course.id, columnId, {
          ...currentGrade,
          entries: updatedEntries
        });
      } catch (err) {
        console.error('Error adding grade entry:', err);
        throw err;
      }
    },
    [course?.id, grades]
  );

  const bulkAddEntries = useCallback(
    async (columnId: string, updates: { studentId: string, entry: GradeEntry }[]) => {
      if (!course?.id) return;
      
      const bulkUpdates = updates.map(u => {
        const currentGrade = grades[u.studentId]?.[columnId] || { entries: [] };
        return {
          studentId: u.studentId,
          columnId,
          grade: {
            ...currentGrade,
            entries: [...(currentGrade.entries || []), u.entry]
          }
        };
      });

      try {
        await firebaseService.bulkUpdateGrades(course.id, bulkUpdates);
      } catch (err) {
        console.error('Error in bulk update:', err);
        throw err;
      }
    },
    [course?.id, grades]
  );

  const deleteGradeEntry = useCallback(
    async (studentId: string, columnId: string, entryId: string) => {
      if (!course?.id) return;
      const currentGrade = grades[studentId]?.[columnId];
      if (!currentGrade || !currentGrade.entries) return;

      const updatedEntries = currentGrade.entries.filter(e => e.id !== entryId);
      
      try {
        await firebaseService.updateGradeEntry(studentId, course.id, columnId, {
          ...currentGrade,
          entries: updatedEntries
        });
      } catch (err) {
        console.error('Error deleting grade entry:', err);
        throw err;
      }
    },
    [course?.id, grades]
  );

  return {
    students,
    grades,
    loading,
    error,
    updateGrade,
    addGradeEntry,
    bulkAddEntries,
    deleteGradeEntry
  };
};
