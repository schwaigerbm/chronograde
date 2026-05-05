import { useState, useEffect, useCallback } from 'react';
import { firebaseService } from '../services/firebaseService';
import type { Student, Grade, GradesState } from '../schema';

/**
 * Hook to manage grades for a specific course and class.
 * Provides real-time synchronization with Firestore.
 */
export const useGradesManager = (courseId: string, classId: string) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<GradesState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 1. Load students for the class (Real-time)
  useEffect(() => {
    setLoading(true);
    const unsubscribe = firebaseService.subscribeToStudents(classId, (data) => {
      setStudents(data);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [classId]);

  // 2. Subscribe to grades in real-time
  useEffect(() => {
    if (students.length === 0 || !courseId) return;

    const unsubscribes = students.map((student) => {
      return firebaseService.subscribeToGrades(student.id, courseId, (studentGrades) => {
        setGrades((prev) => ({
          ...prev,
          [student.id]: studentGrades,
        }));
      });
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [students, courseId]);

  // 3. Update a grade
  const updateGrade = useCallback(
    async (studentId: string, columnId: string, grade: Grade) => {
      try {
        await firebaseService.updateGradeEntry(studentId, courseId, columnId, grade);
      } catch (err) {
        console.error('Error updating grade:', err);
        throw err;
      }
    },
    [courseId]
  );

  return {
    students,
    grades,
    loading,
    error,
    updateGrade,
  };
};
