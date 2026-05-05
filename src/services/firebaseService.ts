// src/services/firebaseService.ts
import { db, auth, googleProvider } from "../lib/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  addDoc
} from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import type { Course, Student, Grade, CourseEntry } from "../schema";

export const firebaseService = {
  
  // --- 1. AUTHENTIFIZIERUNG ---
  
  loginWithGoogle: async () => {
    return await signInWithPopup(auth, googleProvider);
  },

  logout: async () => {
    return await signOut(auth);
  },

  subscribeToAuth: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  // --- 2. KURS-VERWALTUNG (Courses) ---

  // Abonniert alle nicht-archivierten Kurse
  subscribeToCourses: (callback: (courses: Course[]) => void) => {
    const q = query(
      collection(db, "courses"),
      where("archived", "==", false),
      orderBy("priority", "asc")
    );
    return onSnapshot(q, (snapshot) => {
      const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      callback(courses);
    });
  },

  // Erstellt oder aktualisiert einen Kurs
  saveCourse: async (course: Partial<Course> & { name: string }) => {
    if (course.id) {
      const docRef = doc(db, "courses", course.id);
      return await setDoc(docRef, course, { merge: true });
    } else {
      return await addDoc(collection(db, "courses"), {
        ...course,
        archived: false,
        columns: [],
        priority: 0
      });
    }
  },

  // --- 3. SCHÜLER-VERWALTUNG (Students) ---

  // Lädt alle Schüler (optional gefiltert nach Klasse)
  subscribeToStudents: (classId: string | null, callback: (students: Student[]) => void) => {
    let q = query(collection(db, "students"), orderBy("lastName", "asc"));
    
    if (classId) {
      q = query(q, where("classId", "==", classId));
    }

    return onSnapshot(q, (snapshot) => {
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      callback(students);
    });
  },

  saveStudent: async (student: Partial<Student> & { firstName: string, lastName: string }) => {
    if (student.id) {
      const docRef = doc(db, "students", student.id);
      return await setDoc(docRef, student, { merge: true });
    } else {
      return await addDoc(collection(db, "students"), student);
    }
  },

  deleteStudent: async (studentId: string) => {
    return await deleteDoc(doc(db, "students", studentId));
  },

  // --- 4. NOTEN-VERWALTUNG (Grades) ---

  // Abonniert die Noten-Matrix eines Schülers für einen Kurs
  // Pfad: students/{studentId}/grades/{courseId}
  subscribeToGrades: (studentId: string, courseId: string, callback: (grades: { [columnId: string]: Grade }) => void) => {
    const docRef = doc(db, `students/${studentId}/grades`, courseId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as { [columnId: string]: Grade });
      } else {
        callback({});
      }
    });
  },

  // Speichert eine einzelne Note innerhalb des Kurs-Dokuments des Schülers
  updateGradeEntry: async (studentId: string, courseId: string, columnId: string, grade: Grade) => {
    const docRef = doc(db, `students/${studentId}/grades`, courseId);
    return await setDoc(docRef, {
      [columnId]: {
        ...grade,
        updatedAt: new Date().toISOString()
      }
    }, { merge: true });
  },

  // --- 5. SPALTEN-VERWALTUNG (Matrix-Setup) ---

  // Aktualisiert die Spaltendefinition eines Kurses
  updateCourseColumns: async (courseId: string, columns: CourseEntry[]) => {
    const docRef = doc(db, "courses", courseId);
    return await setDoc(docRef, { columns }, { merge: true });
  }
};
