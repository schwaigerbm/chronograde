# 📄 GUI-Spezifikation: Gruppen-Management (`CourseManager.tsx`)

## 1. Header & Controls
*   **Überschrift (H1/H2):** "Gruppen" (Stil: Bold, Slate-900).
*   **Unterüberschrift (H3):** "Verwaltung aller Benotungsgruppen" (Stil: Medium, Slate-500).
*   **Aktionen (Rechte Seite):**
    *   **Live-Search:** Live-Suche (Echtzeit-filterung während der Eingabe). -> Die Tabelle filtert die bereitgestellten Daten soft basierend auf den 
                         Übereinstimmungen im Namen oder im Schuljahr.
    *   **Button "Gruppe hinzufügen":** Primär-Button (Blau/Indigo) mit Plus-Icon. Öffnet das **Add-Group-Modal**.
    *   **Archiv-Toggle (Switch):** Schiebeschalter mit Label. 
        *   Zustand "Aktiv": Zeigt `archived: false` (Standard).
        *   Zustand "Archiviert": Zeigt `archived: true`.

---

## 2. Haupt-Tabelle (`CourseList`)
Eine responsive Tabelle zur Anzeige der Gruppenobjekte (intern: courses).

| Spalte | Datenpunkt | Sortierung |
| :--- | :--- | :--- |
| **Name** | `course.name` | 🔼/🔽 Buttons (Sortiert lokale Liste nach Name) |
| **Schuljahr** | `course.year` | 🔼/🔽 Buttons (Sortiert lokale Liste nach Jahr) |
| **Aktionen** | - | Funktions-Icons |

### Aktions-Buttons pro Zeile:
*   **Matrix (LayoutGrid Icon):** Navigiert zur Notenmatrix der Gruppe.
*   **Bearbeiten (Wrench Icon):** Öffnet Modal zum Ändern von Name/Jahr.
*   **Schüler (Users Icon):** Öffnet das Enrollment-Modal zur Schüler-Zuweisung.
*   **Archivieren (Archive Icon):** Nur bei aktiven Gruppen. Bestätigungs-Dialog (Ja/Nein) -> `archived: true`.
*   **Wiederherstellen (RotateCcw Icon):** Nur bei archivierten Gruppen. Bestätigungs-Dialog (Ja/Nein) -> `archived: false`.
*   **Löschen (Trash2 Icon):** Nur bei archivierten Gruppen. Bestätigungs-Dialog (Ja/Nein) -> Dokument endgültig aus Firestore löschen.

---

## 3. Modal-Spezifikationen

### A. Gruppe hinzufügen / bearbeiten
*   **Eingabefelder:**
    *   `name` (Text): Name des Fachs/der Gruppe.
    *   `year` (String): Schuljahr (Format "2025/26").
*   **Aktionen:** Speichern (Validierung: Name darf nicht leer sein) | Abbrechen.

### B. Schüler-Zuweisung (Enrollment-Modal)
*   **Live-Search:** Input-Feld, das während der Eingabe die gesamte `students`-Collection filtert.
*   **Zuweisung:** Klick auf ein Suchergebnis fügt den Schüler der Liste `course.enrolledStudents` hinzu.
*   **Teilnehmerliste:**
    *   **Format:** `[Lfd. Nr.] [Nachname], [Vorname]` (z.B. "1 Schwaiger, Bernhard").
    *   **Sortierung:** Pfeil-Icons (Hoch/Runter) pro Zeile. Ändert die Position im Array/die Priority. Die laufende Nummer passt sich sofort an.
    *   **Entfernen:** Icon (UserMinus) zum Löschen des Schülers aus dieser spezifischen Gruppe.

---

## 4. Technische Anforderungen (Spec-Driven)
*   **Datenquelle:** `firebaseService.subscribeToCourses`.
*   **Sortier-Logik:** Die Pfeile in der Tabelle triggern einen lokalen State (`sortKey`, `sortOrder`), der die Anzeige der geladenen Firebase-Daten beeinflusst.
*   **Archiv-Logik:** Die Anzeige wechselt zwischen zwei Query-Zuständen (`where archived == true/false`).
*   **UI-Library:** Tailwind CSS für das Layout, Lucide-React für die Icons.