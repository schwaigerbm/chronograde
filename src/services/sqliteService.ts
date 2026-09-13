// src/services/sqliteService.ts
import type { Course, Student, Grade, PredefinedComment, Reminder } from '../schema';

declare global {
  interface Window {
    electronAPI?: {
      isDesktop: boolean;
      platform: string;
      isVaultConfigured: () => Promise<boolean>;
      setVaultCode: (code: string) => Promise<boolean>;
      verifyVaultCode: (code: string) => Promise<boolean>;
      getCourses: (archived: boolean) => Promise<Course[]>;
      saveCourse: (course: Partial<Course> & { name: string }) => Promise<string>;
      deleteCourse: (courseId: string) => Promise<boolean>;
      getStudents: () => Promise<Student[]>;
      saveStudent: (student: Partial<Student> & { firstName: string; lastName: string }) => Promise<string>;
      deleteStudent: (studentId: string) => Promise<boolean>;
      getGrades: (studentId: string, courseId: string) => Promise<Record<string, Grade>>;
      getAllGradesForCourse: (courseId: string) => Promise<Record<string, Record<string, Grade>>>;
      saveGrade: (studentId: string, courseId: string, grade: Record<string, Grade>) => Promise<boolean>;
      bulkUpdateGrades: (courseId: string, updates: { studentId: string; columnId: string; grade: Grade }[]) => Promise<boolean>;
      getReminders: () => Promise<Reminder[]>;
      saveCustomReminder: (
        reminder: Partial<Reminder> & { title: string; courseId: string; date: string },
        prepDays?: 1 | 3 | 7 | null,
        existingReminderId?: string
      ) => Promise<string>;
      updateReminder: (id: string, data: Partial<Reminder>) => Promise<boolean>;
      deleteReminder: (id: string) => Promise<boolean>;
      getPredefinedComments: () => Promise<PredefinedComment[]>;
      savePredefinedComments: (comments: PredefinedComment[]) => Promise<boolean>;
      getLoadedDbPath: () => Promise<string>;
    };
  }
}

// Subscriber registry for instant UI reactivity on writes
const coursesSubscribers = new Set<(archived: boolean) => void>();
const studentsSubscribers = new Set<() => void>();
const gradesSubscribers = new Set<() => void>();
const remindersSubscribers = new Set<() => void>();
const predefinedCommentsSubscribers = new Set<() => void>();

function triggerCoursesRefresh() {
  coursesSubscribers.forEach(fn => fn(false));
  coursesSubscribers.forEach(fn => fn(true));
}
function triggerStudentsRefresh() {
  studentsSubscribers.forEach(fn => fn());
}
function triggerGradesRefresh() {
  gradesSubscribers.forEach(fn => fn());
}
function triggerRemindersRefresh() {
  remindersSubscribers.forEach(fn => fn());
}
function triggerPredefinedCommentsRefresh() {
  predefinedCommentsSubscribers.forEach(fn => fn());
}

export const sqliteService = {
  isDesktopAvailable: (): boolean => {
    return Boolean(window.electronAPI?.isDesktop);
  },

  getLoadedDbPath: async (): Promise<string> => {
    if (window.electronAPI) {
      return await window.electronAPI.getLoadedDbPath();
    }
    return '';
  },

  // Vault / Lock
  isVaultConfigured: async (): Promise<boolean> => {
    if (window.electronAPI) {
      return await window.electronAPI.isVaultConfigured();
    }
    return true; // Fallback
  },

  setVaultCode: async (code: string): Promise<boolean> => {
    if (window.electronAPI) {
      return await window.electronAPI.setVaultCode(code);
    }
    return true;
  },

  verifyVaultCode: async (code: string): Promise<boolean> => {
    if (window.electronAPI) {
      return await window.electronAPI.verifyVaultCode(code);
    }
    return true;
  },

  // Courses
  getCourses: async (archived: boolean = false): Promise<Course[]> => {
    if (window.electronAPI) {
      return await window.electronAPI.getCourses(archived);
    }
    return [];
  },

  subscribeToCourses: (archived: boolean, callback: (courses: Course[]) => void) => {
    let lastJson = '';
    const fetchCourses = () => {
      if (window.electronAPI) {
        window.electronAPI.getCourses(archived).then(courses => {
          const json = JSON.stringify(courses);
          if (json !== lastJson) {
            lastJson = json;
            callback(courses);
          }
        }).catch(err => console.error('Error fetching courses:', err));
      }
    };
    fetchCourses();
    const interval = setInterval(fetchCourses, 1000);
    const subFn = (arch: boolean) => {
      if (arch === archived) fetchCourses();
    };
    coursesSubscribers.add(subFn);
    return () => {
      clearInterval(interval);
      coursesSubscribers.delete(subFn);
    };
  },

  saveCourse: async (course: Partial<Course> & { name: string }) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.saveCourse(course);
      triggerCoursesRefresh();
      return res;
    }
    return 'mock_id';
  },

  deleteCourse: async (courseId: string) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.deleteCourse(courseId);
      triggerCoursesRefresh();
      triggerGradesRefresh();
      triggerRemindersRefresh();
      return res;
    }
    return true;
  },

  // Students
  getStudents: async (): Promise<Student[]> => {
    if (window.electronAPI) {
      return await window.electronAPI.getStudents();
    }
    return [];
  },

  subscribeToStudents: (classId: string | null, callback: (students: Student[]) => void) => {
    let lastJson = '';
    const fetchStudents = async () => {
      if (window.electronAPI) {
        try {
          const students = await window.electronAPI.getStudents();
          const filtered = classId ? students.filter(s => s.classId === classId) : students;
          const json = JSON.stringify(filtered);
          if (json !== lastJson) {
            lastJson = json;
            callback(filtered);
          }
        } catch (err) {
          console.error('Error fetching students:', err);
        }
      }
    };
    fetchStudents();
    const interval = setInterval(fetchStudents, 1000);
    studentsSubscribers.add(fetchStudents);
    return () => {
      clearInterval(interval);
      studentsSubscribers.delete(fetchStudents);
    };
  },

  addStudent: async (student: Omit<Student, 'id'>) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.saveStudent(student as Partial<Student> & { firstName: string; lastName: string });
      triggerStudentsRefresh();
      return res;
    }
    return 'mock_student_id';
  },

  updateStudent: async (id: string, data: Partial<Student>) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.saveStudent({ id, ...data } as Partial<Student> & { firstName: string; lastName: string });
      triggerStudentsRefresh();
      return res;
    }
    return true;
  },

  saveStudent: async (student: Partial<Student> & { firstName: string; lastName: string }) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.saveStudent(student);
      triggerStudentsRefresh();
      return res;
    }
    return 'mock_student_id';
  },

  deleteStudent: async (studentId: string) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.deleteStudent(studentId);
      triggerStudentsRefresh();
      triggerGradesRefresh();
      triggerRemindersRefresh();
      return res;
    }
    return true;
  },

  // Grades
  getGradesForCourse: async (courseId: string): Promise<Record<string, Record<string, Grade>>> => {
    if (window.electronAPI) {
      try {
        return await window.electronAPI.getAllGradesForCourse(courseId);
      } catch (err) {
        console.error('Error in getGradesForCourse:', err);
        return {};
      }
    }
    return {};
  },

  subscribeToGradesForCourse: (courseId: string, callback: (allGrades: Record<string, Record<string, Grade>>) => void) => {
    let lastJson = '';
    const fetchAll = async () => {
      if (window.electronAPI) {
        try {
          const grades = await window.electronAPI.getAllGradesForCourse(courseId);
          const json = JSON.stringify(grades || {});
          if (json !== lastJson) {
            lastJson = json;
            callback(grades || {});
          }
        } catch (err) {
          console.error('Error in subscribeToGradesForCourse:', err);
        }
      }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 1000);
    gradesSubscribers.add(fetchAll);
    return () => {
      clearInterval(interval);
      gradesSubscribers.delete(fetchAll);
    };
  },

  subscribeToGrades: (studentId: string, courseId: string, callback: (grades: Record<string, Grade>) => void) => {
    let lastJson = '';
    const fetchGrades = async () => {
      if (window.electronAPI) {
        try {
          const grades = await window.electronAPI.getGrades(studentId, courseId);
          const json = JSON.stringify(grades || {});
          if (json !== lastJson) {
            lastJson = json;
            callback(grades || {});
          }
        } catch (err) {
          console.error(`Error in subscribeToGrades for ${studentId}:`, err);
        }
      }
    };
    fetchGrades();
    const interval = setInterval(fetchGrades, 1000);
    gradesSubscribers.add(fetchGrades);
    return () => {
      clearInterval(interval);
      gradesSubscribers.delete(fetchGrades);
    };
  },

  updateGradeEntry: async (studentId: string, courseId: string, columnId: string, grade: Grade) => {
    if (window.electronAPI) {
      const currentGrades = await window.electronAPI.getGrades(studentId, courseId);
      const updatedGrades = {
        ...currentGrades,
        [columnId]: {
          ...grade,
          updatedAt: new Date().toISOString()
        }
      };
      const res = await window.electronAPI.saveGrade(studentId, courseId, updatedGrades);
      triggerGradesRefresh();
      return res;
    }
    return true;
  },

  saveGrade: async (studentId: string, courseId: string, grade: Record<string, Grade>) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.saveGrade(studentId, courseId, grade);
      triggerGradesRefresh();
      return res;
    }
    return true;
  },

  bulkUpdateGrades: async (courseId: string, updates: { studentId: string; columnId: string; grade: Grade }[]) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.bulkUpdateGrades(courseId, updates);
      triggerGradesRefresh();
      return res;
    }
    return true;
  },

  // Reminders
  subscribeToReminders: (callback: (reminders: Reminder[]) => void) => {
    let lastJson = '';
    const fetchReminders = () => {
      if (window.electronAPI) {
        window.electronAPI.getReminders().then(reminders => {
          const json = JSON.stringify(reminders);
          if (json !== lastJson) {
            lastJson = json;
            callback(reminders);
          }
        }).catch(err => console.error('Error fetching reminders:', err));
      }
    };
    fetchReminders();
    const interval = setInterval(fetchReminders, 1000);
    remindersSubscribers.add(fetchReminders);
    return () => {
      clearInterval(interval);
      remindersSubscribers.delete(fetchReminders);
    };
  },

  saveCustomReminder: async (
    reminder: Partial<Reminder> & { title: string; courseId: string; date: string },
    prepDays?: 1 | 3 | 7 | null,
    existingReminderId?: string
  ) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.saveCustomReminder(reminder, prepDays, existingReminderId);
      triggerRemindersRefresh();
      return res;
    }
    return 'mock_rem_id';
  },

  updateReminder: async (id: string, data: Partial<Reminder>) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.updateReminder(id, data);
      triggerRemindersRefresh();
      return res;
    }
    return true;
  },

  deleteReminder: async (id: string) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.deleteReminder(id);
      triggerRemindersRefresh();
      return res;
    }
    return true;
  },

  // Settings
  subscribeToPredefinedComments: (callback: (comments: PredefinedComment[]) => void) => {
    let lastJson = '';
    const fetchComments = async () => {
      if (window.electronAPI) {
        try {
          const comments = await window.electronAPI.getPredefinedComments();
          const json = JSON.stringify(comments || []);
          if (json !== lastJson) {
            lastJson = json;
            callback(comments || []);
          }
        } catch (err) {
          console.error('Error fetching predefined comments:', err);
        }
      }
    };
    fetchComments();
    const interval = setInterval(fetchComments, 1000);
    predefinedCommentsSubscribers.add(fetchComments);
    return () => {
      clearInterval(interval);
      predefinedCommentsSubscribers.delete(fetchComments);
    };
  },

  savePredefinedComments: async (comments: PredefinedComment[]) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.savePredefinedComments(comments);
      triggerPredefinedCommentsRefresh();
      return res;
    }
    return true;
  },

  getReminders: async (): Promise<Reminder[]> => {
    if (window.electronAPI) {
      return await window.electronAPI.getReminders();
    }
    return [];
  },

  getPredefinedComments: async (): Promise<PredefinedComment[]> => {
    if (window.electronAPI) {
      return await window.electronAPI.getPredefinedComments();
    }
    return [];
  },

  getAllGradesForCourse: async (courseId: string): Promise<Record<string, Record<string, Grade>>> => {
    if (window.electronAPI) {
      return await window.electronAPI.getAllGradesForCourse(courseId);
    }
    return {};
  }
};
