const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  
  // Vault / Lock APIs
  isVaultConfigured: () => ipcRenderer.invoke('vault:isConfigured'),
  setVaultCode: (code) => ipcRenderer.invoke('vault:setCode', code),
  verifyVaultCode: (code) => ipcRenderer.invoke('vault:verifyCode', code),
  
  // Courses
  getCourses: (archived) => ipcRenderer.invoke('courses:get', archived),
  saveCourse: (course) => ipcRenderer.invoke('courses:save', course),
  deleteCourse: (courseId) => ipcRenderer.invoke('courses:delete', courseId),
  
  // Students
  getStudents: () => ipcRenderer.invoke('students:get'),
  saveStudent: (student) => ipcRenderer.invoke('students:save', student),
  deleteStudent: (studentId) => ipcRenderer.invoke('students:delete', studentId),
  
  // Grades
  getGrades: (studentId, courseId) => ipcRenderer.invoke('grades:get', { studentId, courseId }),
  getAllGradesForCourse: (courseId) => ipcRenderer.invoke('grades:getForCourse', courseId),
  saveGrade: (studentId, courseId, grade) => ipcRenderer.invoke('grades:save', { studentId, courseId, grade }),
  bulkUpdateGrades: (courseId, updates) => ipcRenderer.invoke('grades:bulkUpdate', { courseId, updates }),
  
  // Reminders
  getReminders: () => ipcRenderer.invoke('reminders:get'),
  saveCustomReminder: (reminder, prepDays, existingId) => ipcRenderer.invoke('reminders:saveCustom', { reminder, prepDays, existingId }),
  updateReminder: (id, data) => ipcRenderer.invoke('reminders:update', { id, data }),
  deleteReminder: (id) => ipcRenderer.invoke('reminders:delete', id),
  
  // Settings
  getPredefinedComments: () => ipcRenderer.invoke('settings:getPredefinedComments'),
  savePredefinedComments: (comments) => ipcRenderer.invoke('settings:savePredefinedComments', comments),
  getReminderCategories: () => ipcRenderer.invoke('settings:getReminderCategories'),
  saveReminderCategories: (categories) => ipcRenderer.invoke('settings:saveReminderCategories', categories),
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  saveSetting: (key, value) => ipcRenderer.invoke('settings:save', { key, value }),

  // Journal
  getJournalEntries: (courseId) => ipcRenderer.invoke('journal:getByCourse', courseId),
  saveJournalEntry: (entry) => ipcRenderer.invoke('journal:save', entry),
  deleteJournalEntry: (id) => ipcRenderer.invoke('journal:delete', id),

  // Database Info
  getLoadedDbPath: () => ipcRenderer.invoke('database:getLoadedPath')
});

