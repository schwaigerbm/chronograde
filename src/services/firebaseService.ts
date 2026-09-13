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

  // Lädt Kurse einmalig (gefiltert nach archiviert)
  getCourses: async (archived: boolean = false): Promise<Course[]> => {
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.getCourses(archived);
    }
    const q = query(collection(db, "courses"));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data(), archived: doc.data().archived || false } as Course))
      .filter(c => c.archived === archived);
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

  // Speichert einen Termin
  saveCustomReminder: async (
    reminder: Partial<Reminder> & { title: string; courseId: string; date: string },
    _prepDays?: any,
    existingReminderId?: string
  ) => {
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.saveCustomReminder(reminder, null, existingReminderId);
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

  // Löscht eine Erinnerung
  deleteReminder: async (id: string) => {
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.deleteReminder(id);
    }
    return await deleteDoc(doc(db, "reminders", id));
  },

  getReminders: async (): Promise<Reminder[]> => {
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.getReminders();
    }
    const snapshot = await getDocs(collection(db, "reminders"));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Reminder));
  },

  getPredefinedComments: async (): Promise<PredefinedComment[]> => {
    if (sqliteService.isDesktopAvailable()) {
      return await sqliteService.getPredefinedComments();
    }
    const snap = await getDocs(query(collection(db, "settings")));
    const found = snap.docs.find(d => d.id === 'collaboration');
    if (found && found.exists()) {
      return (found.data().comments || []) as PredefinedComment[];
    }
    return [];
  },

  // --- 9. DATEN-IMPORT & EXPORT (CSV / JSON) ---

  importStudentsFromCSV: async (newStudents: Omit<Student, 'id'>[]): Promise<{ added: number; skipped: number }> => {
    const existingStudents = await firebaseService.getStudents();
    const existingSet = new Set(
      existingStudents.map(s => `${s.firstName.trim().toLowerCase()}_${s.lastName.trim().toLowerCase()}`)
    );

    let added = 0;
    let skipped = 0;

    for (const student of newStudents) {
      const key = `${student.firstName.trim().toLowerCase()}_${student.lastName.trim().toLowerCase()}`;
      if (existingSet.has(key)) {
        skipped++;
      } else {
        await firebaseService.saveStudent(student as any);
        existingSet.add(key);
        added++;
      }
    }

    return { added, skipped };
  },

  exportCourseToCSV: async (courseId: string): Promise<string> => {
    const allCourses = [
      ...(await firebaseService.getCourses(false)),
      ...(await firebaseService.getCourses(true))
    ];
    const course = allCourses.find(c => c.id === courseId);
    if (!course) throw new Error("Kurs nicht gefunden.");

    const allStudents = await firebaseService.getStudents();
    const enrolledStudentIds = course.enrolledStudents || [];
    const enrolledStudents = allStudents.filter(s => enrolledStudentIds.includes(s.id));

    enrolledStudents.sort((a, b) => a.lastName.localeCompare(b.lastName, 'de'));

    const allGrades = sqliteService.isDesktopAvailable()
      ? await sqliteService.getAllGradesForCourse(courseId)
      : {};

    const cols = (course.columns || []).filter(c => c.isVisible !== false);
    const headers = ['Nachname', 'Vorname', 'Klasse', ...cols.map(c => `"${c.title.replace(/"/g, '""')}"`)];

    const rows: string[] = [];
    rows.push(headers.join(';'));

    for (const student of enrolledStudents) {
      const studentGrades = allGrades[student.id] || {};
      const rowVals = [
        `"${student.lastName.replace(/"/g, '""')}"`,
        `"${student.firstName.replace(/"/g, '""')}"`,
        `"${(student.classId || '').replace(/"/g, '""')}"`
      ];

      for (const col of cols) {
        const gradeObj = studentGrades[col.id];
        let valStr = '';
        if (gradeObj) {
          if (gradeObj.value !== undefined && gradeObj.value !== null) {
            valStr = String(gradeObj.value);
          } else if (gradeObj.evaluationPercent !== undefined) {
            valStr = `${gradeObj.evaluationPercent.toFixed(1)}%`;
          }
        }
        rowVals.push(`"${valStr.replace(/"/g, '""')}"`);
      }

      rows.push(rowVals.join(';'));
    }

    return rows.join('\n');
  },

  exportFullBackupJSON: async (): Promise<string> => {
    const activeCourses = await firebaseService.getCourses(false);
    const archivedCourses = await firebaseService.getCourses(true);
    const allCourses = [...activeCourses, ...archivedCourses];
    const allStudents = await firebaseService.getStudents();
    const allReminders = await firebaseService.getReminders();
    const allComments = await firebaseService.getPredefinedComments();

    const gradesByCourse: Record<string, Record<string, Record<string, Grade>>> = {};
    for (const course of allCourses) {
      if (sqliteService.isDesktopAvailable()) {
        gradesByCourse[course.id] = await sqliteService.getAllGradesForCourse(course.id);
      }
    }

    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      courses: allCourses,
      students: allStudents,
      reminders: allReminders,
      settings: allComments,
      grades: gradesByCourse
    };

    return JSON.stringify(backupData, null, 2);
  },

  restoreFullBackupJSON: async (jsonData: string): Promise<{ courses: number; students: number; reminders: number }> => {
    const data = JSON.parse(jsonData);
    if (!data || typeof data !== 'object') throw new Error("Ungültiges Backup-Format.");

    let coursesCount = 0;
    let studentsCount = 0;
    let remindersCount = 0;

    if (Array.isArray(data.students)) {
      for (const student of data.students) {
        if (student.firstName && student.lastName) {
          await firebaseService.saveStudent(student);
          studentsCount++;
        }
      }
    }

    if (Array.isArray(data.courses)) {
      for (const course of data.courses) {
        if (course.name) {
          await firebaseService.saveCourse(course);
          coursesCount++;
        }
      }
    }

    if (Array.isArray(data.reminders)) {
      for (const reminder of data.reminders) {
        if (reminder.title && reminder.courseId && reminder.date) {
          await firebaseService.saveCustomReminder(reminder);
          remindersCount++;
        }
      }
    }

    if (data.grades && typeof data.grades === 'object') {
      for (const courseId of Object.keys(data.grades)) {
        const courseGrades = data.grades[courseId];
        if (courseGrades && typeof courseGrades === 'object') {
          const updates: { studentId: string; columnId: string; grade: Grade }[] = [];
          for (const studentId of Object.keys(courseGrades)) {
            const cols = courseGrades[studentId];
            if (cols && typeof cols === 'object') {
              for (const columnId of Object.keys(cols)) {
                updates.push({ studentId, columnId, grade: cols[columnId] });
              }
            }
          }
          if (updates.length > 0) {
            await firebaseService.bulkUpdateGrades(courseId, updates);
          }
        }
      }
    }

    return { courses: coursesCount, students: studentsCount, reminders: remindersCount };
  }
};

