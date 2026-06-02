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
  limit,
  orderBy
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

  // Abonniert Kurse (gefiltert nach archiviert)
  subscribeToCourses: (archived: boolean, callback: (courses: Course[]) => void) => {
    const q = query(collection(db, "courses"));
    
    // Wir filtern lokal, um Dokumente ohne 'archived' Feld (Legacy) korrekt als 'false' zu behandeln
    return onSnapshot(q, (snapshot) => {
      const courses = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          archived: data.archived || false // Fallback für fehlendes Feld
        } as Course;
      }).filter(c => c.archived === archived);
      
      callback(courses);
    });
  },

  // Erstellt oder aktualisiert einen Kurs
  saveCourse: async (course: Partial<Course> & { name: string }) => {
    const archived = course.archived ?? false; // Sicherstellen, dass archived immer gesetzt ist
    if (course.id) {
      const { id, ...data } = course;
      const docRef = doc(db, "courses", id);
      return await setDoc(docRef, { ...data, archived }, { merge: true });
    } else {
      return await addDoc(collection(db, "courses"), {
        ...course,
        archived: false,
        columns: [],
        priority: 0,
        enrolledStudents: []
      });
    }
  },

  // Löscht einen Kurs endgültig
  deleteCourse: async (courseId: string) => {
    return await deleteDoc(doc(db, "courses", courseId));
  },
// --- 3. SCHÜLER-VERWALTUNG (Students) ---

// Lädt alle Schüler (einmalig)
getStudents: async (): Promise<Student[]> => {
  const q = query(collection(db, "students"), orderBy("lastName", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
},

// Lädt alle Schüler (optional gefiltert nach Klasse, Echtzeit)
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

// Schüler hinzufügen
addStudent: async (student: Omit<Student, 'id'>) => {
  return await addDoc(collection(db, "students"), student);
},

// Schüler aktualisieren
updateStudent: async (id: string, data: Partial<Student>) => {
  const docRef = doc(db, "students", id);
  return await setDoc(docRef, data, { merge: true });
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
  },

  updateCourse: async (courseId: string, data: Partial<Course>) => {
    const docRef = doc(db, "courses", courseId);
    return await setDoc(docRef, data, { merge: true });
  },

  // Massen-Update von Noten (z.B. für Anwesenheit im ganzen Kurs)
  bulkUpdateGrades: async (courseId: string, updates: { studentId: string, columnId: string, grade: Grade }[]) => {
    const promises = updates.map(u => {
      const docRef = doc(db, `students/${u.studentId}/grades`, courseId);
      return setDoc(docRef, {
        [u.columnId]: {
          ...u.grade,
          updatedAt: new Date().toISOString()
        }
      }, { merge: true });
    });
    return await Promise.all(promises);
  }
};
