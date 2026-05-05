// src/services/firebaseService.ts
import { db } from "../lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  addDoc,
  limit
} from "firebase/firestore";
import CryptoJS from "crypto-js";
import type { Course, Student, Grade, CourseEntry, AppUser } from "../schema";

export const firebaseService = {
  
  // --- 1. CUSTOM AUTHENTIFIZIERUNG (Firestore Based) ---
  
  /**
   * Login with username and password.
   * Hashes password with MD5 and checks against 'users' collection.
   */
  loginWithCredentials: async (username: string, password: string): Promise<AppUser> => {
    const hashedPassword = CryptoJS.MD5(password).toString();
    
    const q = query(
      collection(db, "users"),
      where("username", "==", username),
      where("password", "==", hashedPassword),
      limit(1)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw new Error("Ungültiger Benutzername oder Passwort.");
    }

    const userData = snapshot.docs[0].data();
    return {
      username: userData.username,
      role: userData.role,
      name: userData.name
    } as AppUser;
  },

  // --- 2. KURS-VERWALTUNG (Courses) ---

  // Abonniert alle nicht-archivierten Kurse
  subscribeToCourses: (callback: (courses: Course[]) => void) => {
    const q = query(
      collection(db, "courses"),
      where("archived", "==", false)
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

  subscribeToStudents: (classId: string | null, callback: (students: Student[]) => void) => {
    let q = query(collection(db, "students"));
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

  updateGradeEntry: async (studentId: string, courseId: string, columnId: string, grade: Grade) => {
    const docRef = doc(db, `students/${studentId}/grades`, courseId);
    return await setDoc(docRef, {
      [columnId]: {
        ...grade,
        updatedAt: new Date().toISOString()
      }
    }, { merge: true });
  },

  updateCourseColumns: async (courseId: string, columns: CourseEntry[]) => {
    const docRef = doc(db, "courses", courseId);
    return await setDoc(docRef, { columns }, { merge: true });
  }
};
