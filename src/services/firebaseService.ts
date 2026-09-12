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
import type { Course, Student, Grade, CourseEntry, AppUser, PredefinedComment, Reminder } from "../schema";
import { sqliteService } from "./sqliteService";

export const firebaseService = {
  
  // --- 1. CUSTOM AUTHENTIFIZIERUNG (Firestore Based) ---
  
  /**
   * Login with username and password.
   * Hashes password with MD5 and checks against 'users' collection.
   */
  loginWithCredentials: async (username: string, password: string): Promise<AppUser> => {
    if (sqliteService.isDesktopAvailable()) {
      return { username: 'desktop_user', role: 'admin', name: 'Lehrer' };
    }
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
    if (sqliteService.isDesktopAvailable()) {
      return sqliteService.subscribeToCourses(archived, callback);
    }
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
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.saveCourse(course);
    }
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
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.deleteCourse(courseId);
    }
    return await deleteDoc(doc(db, "courses", courseId));
  },

  // --- 3. SCHÜLER-VERWALTUNG (Students) ---

  // Lädt alle Schüler (einmalig)
  getStudents: async (): Promise<Student[]> => {
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.getStudents();
    }
    const q = query(collection(db, "students"), orderBy("lastName", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  },

  // Lädt alle Schüler (optional gefiltert nach Klasse, Echtzeit)
  subscribeToStudents: (classId: string | null, callback: (students: Student[]) => void) => {
    if (sqliteService.isDesktopAvailable()) {
      return sqliteService.subscribeToStudents(classId, callback);
    }
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
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.addStudent(student);
    }
    return await addDoc(collection(db, "students"), student);
  },

  // Schüler aktualisieren
  updateStudent: async (id: string, data: Partial<Student>) => {
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.updateStudent(id, data);
    }
    const docRef = doc(db, "students", id);
    return await setDoc(docRef, data, { merge: true });
  },

  saveStudent: async (student: Partial<Student> & { firstName: string, lastName: string }) => {
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.saveStudent(student);
    }
    if (student.id) {
      const docRef = doc(db, "students", student.id);
      return await setDoc(docRef, student, { merge: true });
    } else {
      return await addDoc(collection(db, "students"), student);
    }
  },

  deleteStudent: async (studentId: string) => {
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.deleteStudent(studentId);
    }
    return await deleteDoc(doc(db, "students", studentId));
  },

  // --- 4. NOTEN-VERWALTUNG (Grades) ---

  subscribeToGradesForCourse: (courseId: string, callback: (allGrades: Record<string, Record<string, Grade>>) => void) => {
    if (sqliteService.isDesktopAvailable()) {
      return sqliteService.subscribeToGradesForCourse(courseId, callback);
    }
    // Web fallback: return empty unsub for now as Firestore uses per-doc subscriptions
    return () => {};
  },

  subscribeToGrades: (studentId: string, courseId: string, callback: (grades: { [columnId: string]: Grade }) => void) => {
    if (sqliteService.isDesktopAvailable()) {
      return sqliteService.subscribeToGrades(studentId, courseId, callback);
    }
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
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.updateGradeEntry(studentId, courseId, columnId, grade);
    }
    const docRef = doc(db, `students/${studentId}/grades`, courseId);
    return await setDoc(docRef, {
      [columnId]: {
        ...grade,
        updatedAt: new Date().toISOString()
      }
    }, { merge: true });
  },

  updateCourseColumns: async (courseId: string, columns: CourseEntry[]) => {
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.saveCourse({ id: courseId, columns } as any);
    }
    const docRef = doc(db, "courses", courseId);
    return await setDoc(docRef, { columns }, { merge: true });
  },

  updateCourse: async (courseId: string, data: Partial<Course>) => {
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.saveCourse({ id: courseId, ...data } as any);
    }
    const docRef = doc(db, "courses", courseId);
    return await setDoc(docRef, data, { merge: true });
  },

  // Massen-Update von Noten (z.B. für Anwesenheit im ganzen Kurs)
  bulkUpdateGrades: async (courseId: string, updates: { studentId: string, columnId: string, grade: Grade }[]) => {
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.bulkUpdateGrades(courseId, updates);
    }
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
  },

  // --- 5. EINSTELLUNGEN-VERWALTUNG (Settings) ---

  // Abonniert vorgefertigte Mitarbeitskommentare in Echtzeit
  subscribeToPredefinedComments: (callback: (comments: PredefinedComment[]) => void) => {
    if (sqliteService.isDesktopAvailable()) {
      return sqliteService.subscribeToPredefinedComments(callback);
    }
    const docRef = doc(db, "settings", "collaboration");
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback((data.comments || []) as PredefinedComment[]);
      } else {
        callback([]);
      }
    });
  },

  // Speichert vorgefertigte Mitarbeitskommentare
  savePredefinedComments: async (comments: PredefinedComment[]) => {
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.savePredefinedComments(comments);
    }
    const docRef = doc(db, "settings", "collaboration");
    return await setDoc(docRef, { comments });
  },

  // --- 6. ERINNERUNGEN-VERWALTUNG (Reminders) ---

  // Abonniert alle Erinnerungen chronologisch
  subscribeToReminders: (callback: (reminders: Reminder[]) => void) => {
    if (sqliteService.isDesktopAvailable()) {
      return sqliteService.subscribeToReminders(callback);
    }
    const q = query(collection(db, "reminders"), orderBy("date", "asc"));
    return onSnapshot(q, (snapshot) => {
      const reminders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Reminder));
      callback(reminders);
    });
  },

  // Erstellt eine neue Erinnerung
  addReminder: async (reminder: Omit<Reminder, 'id'>) => {
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.saveCustomReminder(reminder as any);
    }
    return await addDoc(collection(db, "reminders"), reminder);
  },

  // Speichert einen benutzerdefinierten Termin inkl. Vorbereitungs-Erinnerung
  saveCustomReminder: async (
    reminder: Partial<Reminder> & { title: string; courseId: string; date: string },
    prepDays?: 1 | 3 | 7 | null,
    existingReminderId?: string
  ) => {
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.saveCustomReminder(reminder, prepDays, existingReminderId);
    }
    let mainId = existingReminderId;
    const mainData: Omit<Reminder, 'id'> = {
      title: reminder.title,
      anomalyType: reminder.anomalyType || reminder.title,
      courseId: reminder.courseId,
      courseName: reminder.courseName || '',
      studentId: reminder.studentId || '',
      studentName: reminder.studentName || '',
      targetType: reminder.targetType || 'course',
      type: reminder.type || 'general',
      color: reminder.color || 'blue',
      date: reminder.date,
      dueTime: reminder.dueTime || '07:00',
      prepDays: prepDays || null,
      resolved: reminder.resolved ?? false,
      createdAt: reminder.createdAt || new Date().toISOString()
    };

    if (mainId) {
      const docRef = doc(db, "reminders", mainId);
      await setDoc(docRef, mainData, { merge: true });
    } else {
      const res = await addDoc(collection(db, "reminders"), mainData);
      mainId = res.id;
    }

    // Handle preparation reminder if prepDays is specified
    if (prepDays && mainId) {
      const mainDateObj = new Date(reminder.date);
      mainDateObj.setDate(mainDateObj.getDate() - prepDays);
      const prepDateStr = mainDateObj.toISOString().split('T')[0];

      const prepData: Omit<Reminder, 'id'> = {
        title: `Vorbereitung (${prepDays} ${prepDays === 1 ? 'Tag' : 'Tage'} davor): ${reminder.title}`,
        anomalyType: `Vorbereitungserinnerung für ${reminder.title}`,
        courseId: reminder.courseId,
        courseName: reminder.courseName || '',
        studentId: reminder.studentId || '',
        studentName: reminder.studentName || '',
        targetType: reminder.targetType || 'course',
        type: 'prep_reminder',
        color: reminder.color || 'blue',
        date: prepDateStr,
        dueTime: '07:00',
        parentReminderId: mainId,
        resolved: false,
        createdAt: new Date().toISOString()
      };

      // Check if a linked prep reminder already exists
      const q = query(collection(db, "reminders"), where("parentReminderId", "==", mainId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const prepDocId = snap.docs[0].id;
        await setDoc(doc(db, "reminders", prepDocId), prepData, { merge: true });
      } else {
        await addDoc(collection(db, "reminders"), prepData);
      }
    } else if (mainId) {
      // Remove any existing prep reminder if prepDays was unset
      const q = query(collection(db, "reminders"), where("parentReminderId", "==", mainId));
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map(d => deleteDoc(doc(db, "reminders", d.id)));
      await Promise.all(deletePromises);
    }

    return mainId;
  },

  // Aktualisiert den Status einer Erinnerung
  updateReminder: async (id: string, data: Partial<Reminder>) => {
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.updateReminder(id, data);
    }
    const docRef = doc(db, "reminders", id);
    return await setDoc(docRef, data, { merge: true });
  },

  // Löscht eine Erinnerung (inkl. verknüpfter Vorbereitungs-Erinnerungen)
  deleteReminder: async (id: string) => {
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.deleteReminder(id);
    }
    // Check if there are linked child prep reminders
    const qChild = query(collection(db, "reminders"), where("parentReminderId", "==", id));
    const snapChild = await getDocs(qChild);
    const deletePromises = snapChild.docs.map(d => deleteDoc(doc(db, "reminders", d.id)));
    await Promise.all(deletePromises);

    return await deleteDoc(doc(db, "reminders", id));
  }
};

