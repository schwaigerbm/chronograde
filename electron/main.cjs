const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { 
  initDatabase, 
  switchDatabase,
  getDbPath,
  getSavedDbPath,
  saveDbPath,
  getLoadedDbPath,
  dbOps, 
  setVaultCode, 
  verifyVaultCode, 
  isVaultConfigured 
} = require('./database.cjs');


let mainWindow;
let splashWindow;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 380,
    height: 260,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Chronograde - School Admin 2026',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register IPC Handlers for SQLite operations
function setupIpcHandlers() {
  // Vault / Lock APIs
  ipcMain.handle('vault:isConfigured', async () => {
    return await isVaultConfigured();
  });

  ipcMain.handle('vault:setCode', async (_, code) => {
    return await setVaultCode(code);
  });

  ipcMain.handle('vault:verifyCode', async (_, code) => {
    return await verifyVaultCode(code);
  });

  // Courses
  ipcMain.handle('courses:get', async (_, archived) => {
    const rows = await dbOps.all(`SELECT * FROM courses WHERE archived = ? ORDER BY priority ASC, name ASC`, [archived ? 1 : 0]);
    return rows.map(r => ({
      ...r,
      archived: Boolean(r.archived),
      showTrend: r.showTrend !== 0,
      showStudentNumber: r.showStudentNumber !== 0,
      isTrendColorEnabled: r.isTrendColorEnabled !== 0,
      columns: r.columns ? JSON.parse(r.columns) : [],
      enrolledStudents: r.enrolledStudents ? JSON.parse(r.enrolledStudents) : [],
      deregisteredStudents: r.deregisteredStudents ? JSON.parse(r.deregisteredStudents) : [],
      attendanceAnomalySettings: r.attendanceAnomalySettings ? JSON.parse(r.attendanceAnomalySettings) : undefined
    }));
  });

  ipcMain.handle('courses:save', async (_, course) => {
    if (course.id) {
      const existing = await dbOps.get(`SELECT * FROM courses WHERE id = ?`, [course.id]);
      if (existing) {
        const name = course.name !== undefined ? course.name : existing.name;
        const year = course.year !== undefined ? course.year : existing.year;
        const classId = course.classId !== undefined ? course.classId : existing.classId;
        const priority = course.priority !== undefined ? course.priority : existing.priority;
        const archivedInt = course.archived !== undefined ? (course.archived ? 1 : 0) : existing.archived;
        const showTrendInt = course.showTrend !== undefined ? (course.showTrend ? 1 : 0) : existing.showTrend;
        const showStudentNumberInt = course.showStudentNumber !== undefined ? (course.showStudentNumber ? 1 : 0) : existing.showStudentNumber;
        const roundingRule = course.roundingRule !== undefined ? course.roundingRule : existing.roundingRule;
        const isTrendColorEnabledInt = course.isTrendColorEnabled !== undefined ? (course.isTrendColorEnabled ? 1 : 0) : existing.isTrendColorEnabled;
        const collaborationCalcMode = course.collaborationCalcMode !== undefined ? course.collaborationCalcMode : existing.collaborationCalcMode;
        const columnsJson = course.columns !== undefined ? JSON.stringify(course.columns) : existing.columns;
        const enrolledStudentsJson = course.enrolledStudents !== undefined ? JSON.stringify(course.enrolledStudents) : existing.enrolledStudents;
        const deregisteredStudentsJson = course.deregisteredStudents !== undefined ? JSON.stringify(course.deregisteredStudents) : existing.deregisteredStudents;
        const timetableDay = course.timetableDay !== undefined ? course.timetableDay : existing.timetableDay;
        const timetableSlot = course.timetableSlot !== undefined ? course.timetableSlot : existing.timetableSlot;
        const anomalyJson = course.attendanceAnomalySettings !== undefined ? (course.attendanceAnomalySettings ? JSON.stringify(course.attendanceAnomalySettings) : null) : existing.attendanceAnomalySettings;

        await dbOps.run(
          `UPDATE courses SET 
            name = ?, year = ?, classId = ?, priority = ?, archived = ?, 
            showTrend = ?, roundingRule = ?, isTrendColorEnabled = ?, 
            collaborationCalcMode = ?, columns = ?, enrolledStudents = ?, deregisteredStudents = ?,
            timetableDay = ?, timetableSlot = ?, attendanceAnomalySettings = ?, showStudentNumber = ?
           WHERE id = ?`,
          [
            name, year, classId, priority, archivedInt,
            showTrendInt, roundingRule, isTrendColorEnabledInt,
            collaborationCalcMode, columnsJson, enrolledStudentsJson, deregisteredStudentsJson,
            timetableDay, timetableSlot, anomalyJson, showStudentNumberInt,
            course.id
          ]
        );
        return course.id;
      }
    }

    const archivedInt = course.archived ? 1 : 0;
    const showTrendInt = course.showTrend !== false ? 1 : 0;
    const showStudentNumberInt = course.showStudentNumber !== false ? 1 : 0;
    const isTrendColorEnabledInt = course.isTrendColorEnabled !== false ? 1 : 0;
    const columnsJson = JSON.stringify(course.columns || []);
    const enrolledStudentsJson = JSON.stringify(course.enrolledStudents || []);
    const deregisteredStudentsJson = JSON.stringify(course.deregisteredStudents || []);
    const anomalyJson = course.attendanceAnomalySettings ? JSON.stringify(course.attendanceAnomalySettings) : null;
    const id = course.id || ('course_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));

    await dbOps.run(
      `INSERT INTO courses (
        id, name, year, classId, priority, archived, showTrend, roundingRule, 
        isTrendColorEnabled, collaborationCalcMode, columns, enrolledStudents, deregisteredStudents,
        timetableDay, timetableSlot, attendanceAnomalySettings, showStudentNumber
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, course.name || '', course.year || '', course.classId || '', course.priority || 0, archivedInt,
        showTrendInt, course.roundingRule || 'commercial', isTrendColorEnabledInt,
        course.collaborationCalcMode || 'weighted', columnsJson, enrolledStudentsJson, deregisteredStudentsJson,
        course.timetableDay || null, course.timetableSlot || null, anomalyJson, showStudentNumberInt
      ]
    );
    return id;
  });


  ipcMain.handle('courses:delete', async (_, courseId) => {
    await dbOps.run(`DELETE FROM courses WHERE id = ?`, [courseId]);
    await dbOps.run(`DELETE FROM grades WHERE courseId = ?`, [courseId]);
    await dbOps.run(`DELETE FROM reminders WHERE courseId = ?`, [courseId]);
    return true;
  });

  // Students
  ipcMain.handle('students:get', async () => {
    const rows = await dbOps.all(`SELECT * FROM students ORDER BY lastName ASC, firstName ASC`);
    return rows.map(r => ({
      ...r,
      excludeFromPublicStats: Boolean(r.excludeFromPublicStats)
    }));
  });

  ipcMain.handle('students:save', async (_, student) => {
    if (student.id) {
      const existing = await dbOps.get(`SELECT * FROM students WHERE id = ?`, [student.id]);
      if (existing) {
        const firstName = student.firstName !== undefined ? student.firstName : existing.firstName;
        const lastName = student.lastName !== undefined ? student.lastName : existing.lastName;
        const classId = student.classId !== undefined ? student.classId : existing.classId;
        const photoBase64 = student.photoBase64 !== undefined ? student.photoBase64 : existing.photoBase64;
        const excludeInt = student.excludeFromPublicStats !== undefined ? (student.excludeFromPublicStats ? 1 : 0) : existing.excludeFromPublicStats;

        await dbOps.run(
          `UPDATE students SET firstName = ?, lastName = ?, classId = ?, photoBase64 = ?, excludeFromPublicStats = ? WHERE id = ?`,
          [firstName, lastName, classId, photoBase64, excludeInt, student.id]
        );
        return student.id;
      }
    }

    const id = student.id || ('student_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
    const excludeInt = student.excludeFromPublicStats ? 1 : 0;
    await dbOps.run(
      `INSERT INTO students (id, firstName, lastName, classId, photoBase64, excludeFromPublicStats) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, student.firstName || '', student.lastName || '', student.classId || '', student.photoBase64 || null, excludeInt]
    );
    return id;
  });

  ipcMain.handle('students:delete', async (_, studentId) => {
    await dbOps.run(`DELETE FROM students WHERE id = ?`, [studentId]);
    await dbOps.run(`DELETE FROM grades WHERE studentId = ?`, [studentId]);
    await dbOps.run(`DELETE FROM reminders WHERE studentId = ?`, [studentId]);
    return true;
  });

  // Grades
  ipcMain.handle('grades:get', async (_, { studentId, courseId }) => {
    try {
      const row = await dbOps.get(`SELECT data FROM grades WHERE studentId = ? AND courseId = ?`, [studentId, courseId]);
      return row && row.data ? JSON.parse(row.data) : {};
    } catch (err) {
      console.error(`Error fetching grades for student ${studentId} in course ${courseId}:`, err);
      return {};
    }
  });

  ipcMain.handle('grades:getForCourse', async (_, courseId) => {
    try {
      const rows = await dbOps.all(`SELECT studentId, data FROM grades WHERE courseId = ?`, [courseId]);
      const result = {};
      rows.forEach(r => {
        if (!result[r.studentId]) result[r.studentId] = {};
        const parsed = r.data ? JSON.parse(r.data) : {};
        result[r.studentId] = parsed;
      });
      return result;
    } catch (err) {
      console.error(`Error fetching all grades for course ${courseId}:`, err);
      return {};
    }
  });

  ipcMain.handle('grades:save', async (_, { studentId, courseId, grade }) => {
    try {
      const existing = await dbOps.get(`SELECT data FROM grades WHERE studentId = ? AND courseId = ?`, [studentId, courseId]);
      let currentData = existing && existing.data ? JSON.parse(existing.data) : {};
      currentData = { ...currentData, ...grade };

      await dbOps.run(
        `INSERT OR REPLACE INTO grades (studentId, courseId, data) VALUES (?, ?, ?)`,
        [studentId, courseId, JSON.stringify(currentData)]
      );
      return true;
    } catch (err) {
      console.error(`Error saving grade for student ${studentId} in course ${courseId}:`, err);
      throw err;
    }
  });

  ipcMain.handle('grades:bulkUpdate', async (_, { courseId, updates }) => {
    try {
      await dbOps.beginTransaction();
      const studentGradesMap = {};

      for (const u of updates) {
        if (!studentGradesMap[u.studentId]) {
          const existing = await dbOps.get(`SELECT data FROM grades WHERE studentId = ? AND courseId = ?`, [u.studentId, courseId]);
          studentGradesMap[u.studentId] = existing && existing.data ? JSON.parse(existing.data) : {};
        }
        studentGradesMap[u.studentId][u.columnId] = {
          ...u.grade,
          updatedAt: new Date().toISOString()
        };
      }

      for (const [studentId, data] of Object.entries(studentGradesMap)) {
        await dbOps.run(
          `INSERT OR REPLACE INTO grades (studentId, courseId, data) VALUES (?, ?, ?)`,
          [studentId, courseId, JSON.stringify(data)]
        );
      }

      await dbOps.commit();
      return true;
    } catch (err) {
      await dbOps.rollback().catch(() => {});
      console.error(`Error in bulk update grades for course ${courseId}:`, err);
      throw err;
    }
  });

  // Reminders
  ipcMain.handle('reminders:get', async () => {
    const rows = await dbOps.all(`SELECT * FROM reminders ORDER BY date ASC`);
    return rows.map(r => ({
      ...r,
      resolved: Boolean(r.resolved)
    }));
  });

  ipcMain.handle('reminders:saveCustom', async (_, { reminder, prepDays, existingId }) => {
    let mainId = existingId || ('rem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
    const resolvedInt = reminder.resolved ? 1 : 0;
    const createdAt = reminder.createdAt || new Date().toISOString();

    await dbOps.run(
      `INSERT OR REPLACE INTO reminders (
        id, studentId, studentName, courseId, courseName, type, categoryId, targetType, 
        title, description, color, anomalyType, date, dueTime, prepDays, resolved, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mainId,
        reminder.studentId || '',
        reminder.studentName || '',
        reminder.courseId,
        reminder.courseName || '',
        reminder.type || 'general',
        reminder.categoryId || '',
        reminder.targetType || 'course',
        reminder.title,
        reminder.description || '',
        reminder.color || 'blue',
        reminder.anomalyType || reminder.title,
        reminder.date,
        reminder.dueTime || '07:00',
        prepDays || null,
        resolvedInt,
        createdAt
      ]
    );

    // Handle Prep reminder
    if (prepDays) {
      const mainDateObj = new Date(reminder.date);
      mainDateObj.setDate(mainDateObj.getDate() - prepDays);
      const prepDateStr = mainDateObj.toISOString().split('T')[0];
      const prepId = 'prep_' + mainId;

      await dbOps.run(
        `INSERT OR REPLACE INTO reminders (
          id, studentId, studentName, courseId, courseName, type, targetType, 
          title, color, anomalyType, date, dueTime, parentReminderId, resolved, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          prepId,
          reminder.studentId || '',
          reminder.studentName || '',
          reminder.courseId,
          reminder.courseName || '',
          'prep_reminder',
          reminder.targetType || 'course',
          `Vorbereitung (${prepDays} ${prepDays === 1 ? 'Tag' : 'Tage'} davor): ${reminder.title}`,
          reminder.color || 'blue',
          `Vorbereitungserinnerung für ${reminder.title}`,
          prepDateStr,
          '07:00',
          mainId,
          0,
          new Date().toISOString()
        ]
      );
    } else {
      await dbOps.run(`DELETE FROM reminders WHERE parentReminderId = ?`, [mainId]);
    }

    return mainId;
  });

  ipcMain.handle('reminders:update', async (_, { id, data }) => {
    try {
      const fields = [];
      const values = [];
      for (const [key, val] of Object.entries(data)) {
        fields.push(`${key} = ?`);
        values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
      }
      values.push(id);

      if (fields.length > 0) {
        await dbOps.run(`UPDATE reminders SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      // If date or title was updated, keep child prep reminder in sync
      if (data.date || data.title) {
        const main = await dbOps.get(`SELECT * FROM reminders WHERE id = ?`, [id]);
        if (main && main.prepDays) {
          const prepDateObj = new Date(main.date);
          prepDateObj.setDate(prepDateObj.getDate() - main.prepDays);
          const prepDateStr = prepDateObj.toISOString().split('T')[0];
          const prepTitle = `Vorbereitung (${main.prepDays} ${main.prepDays === 1 ? 'Tag' : 'Tage'} davor): ${main.title}`;
          await dbOps.run(
            `UPDATE reminders SET date = ?, title = ? WHERE parentReminderId = ?`,
            [prepDateStr, prepTitle, id]
          );
        }
      }

      return true;
    } catch (err) {
      console.error(`Error updating reminder ${id}:`, err);
      throw err;
    }
  });

  ipcMain.handle('reminders:delete', async (_, id) => {
    await dbOps.run(`DELETE FROM reminders WHERE parentReminderId = ?`, [id]);
    await dbOps.run(`DELETE FROM reminders WHERE id = ?`, [id]);
    return true;
  });

  // Settings
  ipcMain.handle('settings:getPredefinedComments', async () => {
    const row = await dbOps.get(`SELECT value FROM settings WHERE key = 'collaboration_comments'`);
    return row && row.value ? JSON.parse(row.value) : [];
  });

  ipcMain.handle('settings:savePredefinedComments', async (_, comments) => {
    await dbOps.run(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('collaboration_comments', ?)`,
      [JSON.stringify(comments)]
    );
    return true;
  });

  ipcMain.handle('settings:getReminderCategories', async () => {
    const row = await dbOps.get(`SELECT value FROM settings WHERE key = 'reminder_categories'`);
    if (row && row.value) {
      try { return JSON.parse(row.value); } catch(e){}
    }
    return [
      { id: 'attendance_anomaly', name: 'Fehlzeiten', color: '#b91c1c', icon: 'AlertTriangle', isFixed: true },
      { id: 'exam', name: 'Tests', color: '#7e22ce', icon: 'BookOpen', isFixed: false },
      { id: 'assignment', name: 'Abgaben', color: '#15803d', icon: 'FileText', isFixed: false },
      { id: 'general', name: 'Notizen', color: '#1d4ed8', icon: 'Calendar', isFixed: false }
    ];
  });

  ipcMain.handle('settings:saveReminderCategories', async (_, categories) => {
    await dbOps.run(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('reminder_categories', ?)`,
      [JSON.stringify(categories)]
    );
    return true;
  });

  ipcMain.handle('settings:get', async (_, key) => {
    const row = await dbOps.get(`SELECT value FROM settings WHERE key = ?`, [key]);
    if (row && row.value) {
      try { return JSON.parse(row.value); } catch(e){}
    }
    return null;
  });

  ipcMain.handle('settings:save', async (_, { key, value }) => {
    await dbOps.run(
      `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
      [key, JSON.stringify(value)]
    );
    return true;
  });

  // Journal Entries
  ipcMain.handle('journal:getByCourse', async (_, courseId) => {
    const rows = await dbOps.all(`SELECT * FROM journal_entries WHERE courseId = ? ORDER BY date DESC, createdAt DESC`, [courseId]);
    return rows;
  });

  ipcMain.handle('journal:save', async (_, entry) => {
    const now = new Date().toISOString();
    if (entry.id) {
      const existing = await dbOps.get(`SELECT * FROM journal_entries WHERE id = ?`, [entry.id]);
      if (existing) {
        await dbOps.run(
          `UPDATE journal_entries SET date = ?, title = ?, content = ?, updatedAt = ? WHERE id = ?`,
          [entry.date || existing.date, entry.title || existing.title, entry.content || '', now, entry.id]
        );
        return entry.id;
      }
    }

    const id = entry.id || ('journal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
    await dbOps.run(
      `INSERT INTO journal_entries (id, courseId, date, title, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, entry.courseId, entry.date || now.split('T')[0], entry.title || '', entry.content || '', now, now]
    );
    return id;
  });

  ipcMain.handle('journal:delete', async (_, id) => {
    await dbOps.run(`DELETE FROM journal_entries WHERE id = ?`, [id]);
    return true;
  });

  ipcMain.handle('database:getLoadedPath', async () => {
    return getLoadedDbPath();
  });

  ipcMain.handle('database:selectFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Vorhandene Chronograde SQLite-Datenbank öffnen',
      filters: [{ name: 'SQLite Datenbank', extensions: ['sqlite', 'db'] }],
      properties: ['openFile']
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { success: false, cancelled: true };
    }

    const selectedPath = result.filePaths[0];
    await switchDatabase(app, selectedPath);
    return { success: true, path: selectedPath };
  });

  ipcMain.handle('database:createNew', async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Neue Chronograde SQLite-Datenbank erstellen',
      defaultPath: getDbPath(app),
      filters: [{ name: 'SQLite Datenbank', extensions: ['sqlite', 'db'] }]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, cancelled: true };
    }

    const newPath = result.filePath;
    if (fs.existsSync(newPath)) {
      try { fs.unlinkSync(newPath); } catch(e){}
    }
    await switchDatabase(app, newPath);
    return { success: true, path: newPath };
  });

  ipcMain.handle('database:copyCurrent', async () => {
    const currentPath = getLoadedDbPath();
    if (!currentPath || !fs.existsSync(currentPath)) {
      return { success: false, error: 'Keine aktive Datenbankdatei gefunden.' };
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Datenbank-Kopie speichern unter',
      defaultPath: path.join(app.getPath('documents'), `chronograde_backup_${new Date().toISOString().split('T')[0]}.sqlite`),
      filters: [{ name: 'SQLite Datenbank', extensions: ['sqlite', 'db'] }]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, cancelled: true };
    }

    try {
      fs.copyFileSync(currentPath, result.filePath);
      return { success: true, path: result.filePath };
    } catch (err) {
      console.error('Error copying database file:', err);
      return { success: false, error: err.message || String(err) };
    }
  });
}



app.whenReady().then(async () => {
  createSplashWindow();
  try {
    let targetDbPath = getSavedDbPath(app);

    if (!targetDbPath || !fs.existsSync(targetDbPath)) {
      const { response } = await dialog.showMessageBox({
        type: 'question',
        buttons: ['Neue Datenbank erstellen', 'Vorhandene .sqlite-Datei öffnen', 'Beenden'],
        defaultId: 0,
        cancelId: 2,
        title: 'Chronograde - Datenbank-Auswahl',
        message: 'Keine Chronograde SQLite-Datenbank gefunden.',
        detail: 'Möchten Sie eine neue Datenbank erstellen oder eine bestehende .sqlite-Datei öffnen?'
      });

      if (response === 0) {
        // Create new database file
        const saveResult = await dialog.showSaveDialog({
          title: 'Neue Chronograde Datenbank erstellen',
          defaultPath: getDbPath(app),
          filters: [{ name: 'SQLite Datenbank', extensions: ['sqlite', 'db'] }]
        });

        if (saveResult.canceled || !saveResult.filePath) {
          app.quit();
          return;
        }
        targetDbPath = saveResult.filePath;
      } else if (response === 1) {
        // Open existing database file
        const openResult = await dialog.showOpenDialog({
          title: 'Vorhandene Chronograde Datenbank öffnen',
          filters: [{ name: 'SQLite Datenbank', extensions: ['sqlite', 'db'] }],
          properties: ['openFile']
        });

        if (openResult.canceled || !openResult.filePaths || openResult.filePaths.length === 0) {
          app.quit();
          return;
        }
        targetDbPath = openResult.filePaths[0];
      } else {
        app.quit();
        return;
      }
    }

    await initDatabase(app, targetDbPath);
    setupIpcHandlers();
    createWindow();
  } catch (err) {
    console.error("Failed to initialize desktop database:", err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
