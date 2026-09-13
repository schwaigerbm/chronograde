# 📄 GUI-Spezifikation: Daten-Import & Export (CSV / JSON)

## 1. Übersicht & Ziel
Dieses Modul ermöglicht es Lehrkräften, Schülerlisten aus bestehenden Schulverwaltungssystemen (z. B. Sokrates, Untis, Excel) per CSV-Datei zu importieren sowie Gruppen, Noten und Einstellungen als Sicherungsdatei (JSON / CSV) zu exportieren und wiederherzustellen.

---

## 2. Funktionsumfang

### A. Schüler-Import (CSV-Roster-Import)
* **Auslöser:** Klick auf den Button **„Schüler importieren (CSV)“** in der Schülerverwaltung (`StudentsView`) oder dem Einstellungsmenü.
* **Datei-Formate:** Komma- (`,`) oder Semikolon-getrennte (`;`) CSV-Dateien.
* **Feld-Zuordnung (Mapping Wizard):**
  * Nach Auswahl der Datei analysiert das Modal die Kopfzeile der CSV-Datei.
  * Der Benutzer wählt aus, welche CSV-Spalte für **Vorname**, **Nachname** und optional **Klasse** steht.
  * **Vorschau-Tabelle:** Zeigt die ersten 5 Zeilen der zu importierenden Schüler mit Erkennungsstatus.
* **Dubletten-Erkennung:**
  * Bestehende Schüler (Vorname + Nachname case-insensitive) werden erkannt und hervorgehoben.
  * **Optionen bei Duplikaten:** `Überspringen` (Standard) oder `Aktualisieren`.
* **Ergebnis-Zusammenfassung:** Nach dem Import zeigt eine Meldung die Anzahl der neu hinzugefügten und übersprungenen Schüler an.

### B. Kurs- & Noten-Export (CSV / JSON Backup)
* **Auslöser:** Klick auf **„Exportieren / Sichern“** im Aktions-Menü oder den Einstellungen.
* **Export-Typen:**
  1. **Notenliste des Kurses (CSV):** Exportiert die ausgewählte Notenmatrix inkl. Schülernamen, Einzelnoten, Prozenten und berechnetem Live-Trend als CSV-Tabelle für Excel.
  2. **Vollständiges Backup (JSON):** Exportiert alle Kurse, Schüler, Noten, Einstellungen und Termine als strukturierte JSON-Datei zur Datensicherung.

### C. Wiederherstellung aus Backup (JSON Restore)
* **Auslöser:** Klick auf **„Daten sichern & wiederherstellen“** in den Einstellungen.
* **Funktion:** Ermöglicht das Einlesen eines JSON-Backups zur Wiederherstellung der Datenbank (mit Bestätigungs-Sicherheitsabfrage).

---

## 3. Technische Integration
* **Service-Layer:** Erweiterung von `firebaseService` und `sqliteService` um Hilfsfunktionen:
  * `importStudentsFromCSV(students: Omit<Student, 'id'>[]): Promise<{ added: number, skipped: number }>`
  * `exportCourseToCSV(courseId: string): Promise<string>`
  * `exportFullBackupJSON(): Promise<string>`
  * `restoreFullBackupJSON(jsonData: string): Promise<void>`
* **Keine externen Heavyweight-Bibliotheken:** Native CSV-Parsing und String-Generierung in TypeScript für maximale Performance und Zero-Dependencies.
