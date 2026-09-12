const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let db = null;
let dbPath = '';

function getConfigPath(app) {
  return path.join(app.getPath('userData'), 'chronograde_config.json');
}

function getDbPath(app) {
  if (app.isPackaged) {
    return path.join(path.dirname(app.getPath('exe')), 'chronograde_data.sqlite');
  }
  return path.join(app.getAppPath(), 'chronograde_data.sqlite');
}

function getSavedDbPath(app) {
  try {
    const configP = getConfigPath(app);
    if (fs.existsSync(configP)) {
      const data = JSON.parse(fs.readFileSync(configP, 'utf-8'));
      if (data && data.dbPath && fs.existsSync(data.dbPath)) {
        return data.dbPath;
      }
    }
  } catch (err) {
    console.error('Error reading saved DB path:', err);
  }

  const defaultP = getDbPath(app);
  if (fs.existsSync(defaultP)) {
    return defaultP;
  }
  return null;
}

function saveDbPath(app, filePath) {
  try {
    const configP = getConfigPath(app);
    const dir = path.dirname(configP);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configP, JSON.stringify({ dbPath: filePath }, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB path:', err);
  }
}

function isDbExists(app) {
  const p = getSavedDbPath(app) || getDbPath(app);
  return fs.existsSync(p);
}

function getLoadedDbPath() {
  return dbPath;
}

function initDatabase(app, customPath) {
  dbPath = customPath || getSavedDbPath(app) || getDbPath(app);
  saveDbPath(app, dbPath);
  
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Failed to open SQLite database at', dbPath, err);
        return reject(err);
      }
      
      db.serialize(() => {
        // Enable Write-Ahead Logging (WAL) and set busy timeout for concurrency
        db.run(`PRAGMA journal_mode = WAL;`);
        db.run(`PRAGMA busy_timeout = 5000;`);

        // 1. Vault Settings Table
        db.run(`CREATE TABLE IF NOT EXISTS vault_settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )`);

        // 2. Courses Table
        db.run(`CREATE TABLE IF NOT EXISTS courses (
          id TEXT PRIMARY KEY,
          name TEXT,
          year TEXT,
          classId TEXT,
          priority INTEGER,
          archived INTEGER,
          showTrend INTEGER,
          roundingRule TEXT,
          isTrendColorEnabled INTEGER,
          collaborationCalcMode TEXT,
          columns TEXT,
          enrolledStudents TEXT,
          timetableDay TEXT,
          timetableSlot TEXT,
          attendanceAnomalySettings TEXT,
          deregisteredStudents TEXT
        )`, () => {
          // Migration check for existing databases
          db.run(`ALTER TABLE courses ADD COLUMN deregisteredStudents TEXT`, () => {});
        });

        // 3. Students Table
        db.run(`CREATE TABLE IF NOT EXISTS students (
          id TEXT PRIMARY KEY,
          firstName TEXT,
          lastName TEXT,
          classId TEXT,
          photoBase64 TEXT,
          excludeFromPublicStats INTEGER
        )`);

        // 4. Grades Table
        db.run(`CREATE TABLE IF NOT EXISTS grades (
          studentId TEXT,
          courseId TEXT,
          data TEXT,
          PRIMARY KEY (studentId, courseId)
        )`);

        // 5. Reminders Table
        db.run(`CREATE TABLE IF NOT EXISTS reminders (
          id TEXT PRIMARY KEY,
          studentId TEXT,
          studentName TEXT,
          courseId TEXT,
          courseName TEXT,
          type TEXT,
          targetType TEXT,
          title TEXT,
          color TEXT,
          anomalyType TEXT,
          date TEXT,
          dueTime TEXT,
          prepDays INTEGER,
          parentReminderId TEXT,
          resolved INTEGER,
          createdAt TEXT
        )`);

        // 6. Settings Table
        db.run(`CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )`, (err) => {
          if (err) reject(err);
          else resolve(db);
        });
      });
    });
  });
}

// Database Operations Wrapper (Promises)
const dbOps = {
  get: (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  }),
  all: (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  }),
  run: (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  }),
  beginTransaction: () => new Promise((resolve, reject) => {
    db.run('BEGIN TRANSACTION', (err) => err ? reject(err) : resolve());
  }),
  commit: () => new Promise((resolve, reject) => {
    db.run('COMMIT', (err) => err ? reject(err) : resolve());
  }),
  rollback: () => new Promise((resolve, reject) => {
    db.run('ROLLBACK', (err) => err ? reject(err) : resolve());
  })
};

// Vault Management
async function setVaultCode(code) {
  const hash = await bcrypt.hash(code, 10);
  await dbOps.run(`INSERT OR REPLACE INTO vault_settings (key, value) VALUES ('vault_hash', ?)`, [hash]);
  await dbOps.run(`INSERT OR REPLACE INTO vault_settings (key, value) VALUES ('created_at', ?)`, [new Date().toISOString()]);
  return true;
}

async function verifyVaultCode(code) {
  const row = await dbOps.get(`SELECT value FROM vault_settings WHERE key = 'vault_hash'`);
  if (!row || !row.value) return false;
  return await bcrypt.compare(code, row.value);
}

async function isVaultConfigured() {
  const row = await dbOps.get(`SELECT value FROM vault_settings WHERE key = 'vault_hash'`);
  return Boolean(row && row.value);
}

module.exports = {
  initDatabase,
  isDbExists,
  getDbPath,
  getSavedDbPath,
  saveDbPath,
  getLoadedDbPath,
  dbOps,
  setVaultCode,
  verifyVaultCode,
  isVaultConfigured
};
