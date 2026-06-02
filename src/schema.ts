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
  type: 'manual' | 'collaborationSum' | 'collaborationEntry' | 'groupAssignment' | 'presenceSum' | 'presenceEntry' ; // Art der Leistung
  date: string;        // Geplantes Datum
  calc: boolean;        // Automatische Berechnung
  calcFactor: number;   // Berechnungseinfluss
  calcType: 'percent' | 'grade' | 'sign'
  isColorEnabled?: boolean; // Farbmodus aktiv
  showDateInHeader?: boolean; // Datum im Header anzeigen
  isVisible?: boolean;    // Spalte in der Matrix sichtbar (Standard: true)
  subEntries?: CourseEntry[]; // Untergeordnete Einträge
  priority: number;       // int: Zum chronologischen oder manuellen Ordnen der Einträge
}

// 3. KURSE (Fächer)
export interface Course {
  id: string;
  name: string;        // z.B. "Mathematik"
  year: string;        // Schuljahr (z.B. "2025/26")
  classId: string;     // Zugehörige Klasse (z.B. "10A")
  priority: number;    // int: Zum Ordnen in der Seitenleiste/Übersicht
  archived: boolean;   // true = wird im Dashboard nicht mehr angezeigt
  columns: CourseEntry[]; 
  enrolledStudents: string[]; // Liste der Schüler-IDs (Enrollment)
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
  entries?: GradeEntry[]; // Für collaborationSum/presenceSum
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