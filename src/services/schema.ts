// src/types/schema.ts

// 1. SCHÜLER (Stammdaten)
export interface Student {
  id: string;
  firstName: string;   // Vorname
  lastName: string;    // Nachname
  classId: string;     // Wichtig, um Schüler einer Klasse (z.B. "10A") zuzuordnen
}

// 2. KURS-SPALTEN (Definition der Prüfungen/Leistungen im Kurs)
export interface CourseEntry {
  id: string;
  title: string;       // z.B. "1. Schularbeit"
  type: 'test' | 'gradeStatus' | 'groupAssignment' | 'classParticipation' | 'notebookCheck' | 'presentation' | 'homework' | 'writtenExamy'; // Art der Leistung
  date: string;        // Geplantes Datum
  calc: boolean;        // Automatische Berechnung
  calcFactor: number;   // Berechnungseinfluss
  subEntries?: CourseEntry[]; // Untergeordnete Einträge
}

// 3. KURSE (Fächer)
export interface Course {
  id: string;
  name: string;        // z.B. "Mathematik"
  classId: string;     // Zugehörige Klasse (z.B. "10A")
  priority: number;    // int: Zum Ordnen in der Seitenleiste/Übersicht
  archived: boolean;   // true = wird im Dashboard nicht mehr angezeigt
  columns: CourseEntry[]; 
}

// 4. NOTEN (Die Einträge in der Sub-Collection der Schüler)
export interface Grade {
  value: string | number; // Die eigentliche Note (z.B. 2, "1+", oder "Fehlt")
  type: string;           // z.B. "Schularbeit", "Mitarbeit"
  date: string;           // Datum der Leistung
  note?: string;          // Optionales Hover-Kommentar (Text)
  priority: number;       // int: Zum chronologischen oder manuellen Ordnen der Einträge
}

// 5. UI-STATE (Hilfs-Typ für React, um die Matrix im RAM zu halten)
export interface GradesState {
  // studentId -> columnId -> Grade
  [studentId: string]: {
    [columnId: string]: Grade;
  };
}