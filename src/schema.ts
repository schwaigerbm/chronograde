// src/types/schema.ts

// 1. SCHÜLER (Stammdaten)
export interface Student {
  id: string;
  firstName: string;   // Vorname
  lastName: string;    // Nachname
  classId: string;     // Wichtig, um Schüler einer Klasse (z.B. "10A") zuzuordnen
  photoBase64?: string; // Profilbild als komprimierter Base64-String
  excludeFromPublicStats?: boolean; // Schüler von öffentlichen Statistiken ausschließen
}

// 2. KURS-SPALTEN (Definition der Prüfungen/Leistungen im Kurs)
export interface CourseEntry {
  id: string;
  title: string;       // z.B. "1. Schularbeit"
  type: 'manual' | 'collaborationSum' | 'collaborationEntry' | 'groupAssignment' | 'presenceSum' | 'presenceEntry' | 'calculated' | 'evaluation'; // Art der Leistung
  date: string;        // Geplantes Datum
  cutoffDate?: string;  // Nur für type 'calculated': Stichtag für die Berechnung
  roundingRule?: 'commercial' | 'studentFriendly'; // Rundungsregel für Ergebnisse
  calc: boolean;        // Automatische Berechnung
  calcFactor: number;   // Berechnungseinfluss (Gewichtung)
  calcType: 'percent' | 'grade' | 'sign'
  isColorEnabled?: boolean; // Farbmodus aktiv
  showDateInHeader?: boolean; // Datum im Header anzeigen
  isVisible?: boolean;    // Spalte in der Matrix sichtbar (Standard: true)
  isLocked?: boolean;     // Gewichtung gesperrt/fixiert
  subEntries?: CourseEntry[]; // Untergeordnete Einträge
  subTasks?: SubTask[];     // Für Teilaufgaben-Auswertungen
  gradingKey?: EvaluationGradingKey; // Notenschlüssel für Auswertungen
  priority: number;       // int: Zum chronologischen oder manuellen Ordnen der Einträge
}

export interface SubTask {
  id: string;
  title: string;       // z.B. "Aufgabe 1"
  maxPoints: number;   // Maximale Punkte
}

export interface EvaluationGradingKey {
  grade1MinPoints: number; // Sehr Gut ab
  grade2MinPoints: number; // Gut ab
  grade3MinPoints: number; // Befriedigend ab
  grade4MinPoints: number; // Genügend ab
}

// 3. KURSE (Fächer)
export interface Course {
  id: string;
  name: string;        // z.B. "Mathematik"
  year: string;        // Schuljahr (z.B. "2025/26")
  classId: string;     // Zugehörige Klasse (z.B. "10A")
  priority: number;    // int: Zum Ordnen in der Seitenleiste/Übersicht
  archived: boolean;   // true = wird im Dashboard nicht mehr angezeigt
  showTrend?: boolean; // Sichtbarkeit der Sticky TREND Spalte
  showStudentNumber?: boolean; // Sichtbarkeit der 1-basierten laufenden Nummer in der Schülerspalte
  roundingRule?: 'commercial' | 'studentFriendly'; // Globale Rundungsregel für den Trend

  isTrendColorEnabled?: boolean; // Farbmodus (Heatmap) für den Trend aktiv
  collaborationCalcMode?: 'linear' | 'weighted'; // Berechnungsmodus für die Mitarbeit
  columns: CourseEntry[]; 
  enrolledStudents: string[]; // Liste der Schüler-IDs (Enrollment)
  deregisteredStudents?: string[]; // Liste der IDs ausgestrichener/abgemeldeter Schüler
  timetableDay?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | null;
  timetableSlot?: 'morning' | 'afternoon' | null;
  attendanceAnomalySettings?: {
    enabled: boolean;
    rule2InRow: boolean;
    rule2In3: boolean;
    rule3In5: boolean;
  };
}
 

// 4. NOTEN (Die Einträge in der Sub-Collection der Schüler)
export interface GradeEntry {
  id: string;
  value: string | number;
  date: string;
  note?: string;
  hours?: number; // Dauer in Stunden (Standard: 1)
}

export interface Grade {
  value?: string | number; // Die eigentliche Note (z.B. 2, "1+", oder "Fehlt")
  date?: string;           // Datum der Leistung
  note?: string;          // Optionales Hover-Kommentar (Text)
  isOverridden?: boolean; // Nur für calculated: Manuell überschrieben
  entries?: GradeEntry[]; // Für collaborationSum/presenceSum
  subTaskPoints?: Record<string, number>; // Für Auswertung: subTaskId -> erreichte Punkte
  evaluationPoints?: number;  // Erreichte Gesamtpunkte
  evaluationPercent?: number; // Erreichte Prozentpunkte
  updatedAt?: string;
}

// 5. UI-STATE (Hilfs-Typ für React, um die Matrix im RAM zu halten)
export interface GradesState {
  // studentId -> columnId -> Grade
  [studentId: string]: {
    [columnId: string]: Grade;
  };
}

// 6. AUTH-USER (Custom Auth)
export interface AppUser {
  username: string;
  role?: string;
  name?: string;
}

// 7. VORGEFERTIGTE MITARBEITSKOMMENTARE (Settings)
export interface PredefinedComment {
  id: string;
  text: string;
  type: '+' | '-' | '~';
}

export interface PredefinedCommentsSettings {
  comments: PredefinedComment[];
}

// 8. ERINNERUNGEN / TERMINE (Attendance Clarifications & Custom Reminders)
export interface ReminderCategory {
  id: string;
  name: string;
  color: string; // Hex or CSS color string
  icon: string;  // Lucide icon identifier (e.g., 'BookOpen', 'FileText', 'AlertTriangle', 'Calendar', etc.)
  isFixed?: boolean; // Fixed categories (like Fehlzeiten) cannot be deleted or modified
}

export interface Reminder {
  id: string;
  studentId?: string;
  studentName?: string;
  courseId: string;
  courseName: string;
  type?: 'attendance_anomaly' | 'exam' | 'assignment' | 'general' | string;
  categoryId?: string;
  targetType?: 'course' | 'student';
  title?: string;
  description?: string; // Mehrzeiliger Notiz- / Beschreibungstext
  color?: string; // 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' or hex
  anomalyType: string; // Detailbeschreibung / Anomaly text
  date: string;        // Due date (YYYY-MM-DD)
  dueTime?: string;    // Fälligkeits-Uhrzeit (Standard: "07:00")
  resolved: boolean;   // Whether the task is completed
  createdAt: string;
}

// 9. KURS-JOURNAL (Journal-Einträge pro Kurs)
export interface JournalEntry {
  id: string;
  courseId: string;
  date: string;       // YYYY-MM-DD
  title: string;      // Name / Titel des Eintrags
  content: string;    // Formatiertes HTML/Text
  createdAt: string;
  updatedAt?: string;
}