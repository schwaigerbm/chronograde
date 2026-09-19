# 📄 GUI-Spezifikation: Daten- & Datenbank-Hub (Import, Export & SQLite-Verwaltung)

## 1. Übersicht & Ziel
Dieses Pflichtenheft beschreibt das zentrale **Daten- & Datenbank-Hub** im Einstellungsbereich. Es ermöglicht Lehrkräften:
1. **SQLite-Datenbank-Verwaltung:** Dynamischen Wechsel der aktiven `.sqlite`-Datenbankdatei, Erstellung neuer Datenbanken und Speichern von 1:1-Sicherungskopien.
2. **Beurteilungsvorlagen (Evaluation Templates):** Import und Export von Prüfungs- und Auswertungsschemata (z. B. Schularbeiten mit Teilaufgaben, Max-Punkten und Notenschlüssel).
3. **Mitarbeitskommentare-Vorlagen (`+`, `~`, `-`):** Import und Export von Vorlagensets vorgefertigter Mitarbeitsnotizen (mit Optionen zum Zusammenführen oder Ersetzen).
4. **Vollständige Datensicherung (System-Backup & Restore):** Export und Wiederherstellung des kompletten Datenbestands als strukturierte JSON-Datei.
5. **CSV-Import & Export:** Import von Schülerlisten aus Schulverwaltungssystemen (Untis, Sokrates, Excel) sowie CSV-Export von Kurs-Notenmatrizen.

---

## 2. Detaillierte Funktionsbereiche

### A. Sektion 1: SQLite Datenbank-Verwaltung (Aktive Datenbank)
* **Pfad-Anzeige:** Zeigt den absoluten Pfad der derzeit geöffneten SQLite-Datenbankdatei an (z. B. `C:\Users\...\chronograde_data.sqlite`).
* **Aktion „Andere SQLite-Datenbank öffnen...“:**
  * Öffnet den nativen Electron-Dateiauswahldialog (`dialog.showOpenDialog`) mit Dateifilter für `.sqlite` und `.db`.
  * Nach Auswahl wird die bisherige Verbindung geschlossen, die neue Datei eingebunden, der Pfad in der Konfiguration gespeichert und die Daten im Frontend neu geladen.
* **Aktion „Neue SQLite-Datenbank erstellen...“:**
  * Öffnet den Speichern-Dialog (`dialog.showSaveDialog`), um einen Dateinamen und Speicherort zu wählen.
  * Legt eine frische SQLite-Datei an, initialisiert das vollständige Schema (Tabellen: `courses`, `students`, `grades`, `reminders`, `journal_entries`, `settings`, `vault_settings`) und schaltet auf diese Datei um.
* **Aktion „Datenbank-Kopie speichern unter...“:**
  * Erstellt ein exaktes 1:1-Duplikat der aktuellen SQLite-Datei am gewählten Pfad.

### B. Sektion 2: Vorlagen-Verwaltung (Templates Import & Export)

#### 1. Beurteilungsvorlagen (Prüfungen, Schularbeiten & Auswertungen)
* **Vorlagen-Objekt (`CourseEntryTemplate`):** Enthält Titel, Typ (`evaluation`), Gewichtung, Teilaufgaben (`subTasks`) mit Max-Punkten und Notenschlüssel (`gradingKey`).
* **Aktion „Beurteilungsvorlagen exportieren (JSON)“:** Herunterladen einer `.json`-Datei mit allen oder ausgewählten Beurteilungsvorlagen.
* **Aktion „Beurteilungsvorlagen importieren (JSON)“:** Einlesen einer `.json`-Datei mit Beurteilungsvorlagen in die lokale Datenbank.
* **Schnellauswahl im `AddColumnModal`:** Bietet beim Hinzufügen einer Beurteilungsspalte die Option **„Aus Vorlage erstellen“**, um Titel, Teilaufgaben und Notenschlüssel mit 1 Klick einzufügen.

#### 2. Mitarbeitskommentare-Vorlagen (`+`, `~`, `-`)
* **Vorlagen-Objekt (`PredefinedComment`):** Liste vorgefertigter Kommentare für Plus (`+`), Neutral/Welle (`~`) und Minus (`-`).
* **Aktion „Mitarbeitskommentare exportieren (JSON)“:** Exportiert das aktuelle Kommentarsortiment als JSON-Datei.
* **Aktion „Mitarbeitskommentare importieren (JSON)“:** Einlesen einer JSON-Datei mit Auswahl-Modal:
  * **Zusammenführen (Merge):** Neue Kommentare werden zur bestehenden Liste hinzugefügt (Duplikate werden gefiltert).
  * **Ersetzen (Overwrite):** Die bestehende Liste wird durch die importierten Kommentare ersetzt.

### C. Sektion 3: Vollständiges System-Backup (JSON Backup & Restore)
* **JSON-Komplett-Backup exportieren:** Sicherung aller Entitäten (`courses`, `students`, `grades`, `reminders`, `journal_entries`, `settings`, `evaluation_templates`) in eine `.json`-Backup-Datei mit Zeitstempel.
* **JSON-Komplett-Backup wiederherstellen:** Importiert ein Komplett-Backup mit vorherigem Bestätigungs-Dialog.

### D. Sektion 4: Schüler- & Notendaten-Import/Export (CSV)
* **Schüler-Import (CSV Roster Import):**
  * Komma- oder Semikolon-getrennte CSV-Dateien.
  * Feld-Zuordnung (Mapping Wizard) für Vorname, Nachname und Klasse.
  * Vorschau-Tabelle der ersten 5 Zeilen.
  * Dubletten-Erkennung (Skip / Update).
* **Kurs-Notenexport (CSV):** Exportiert die gewählte Notenmatrix inkl. Schülernamen, Einzelnoten, Prozenten und berechnetem Live-Trend für Excel.

---

## 3. Technische Schnittstellen & Service-Layer
Erweiterung von `sqliteService` und Electron IPC Handlers:
* `database:getLoadedPath`, `database:selectFile`, `database:createNew`, `database:copyCurrent`
* `settings:getEvaluationTemplates`, `settings:saveEvaluationTemplates`
* `exportPredefinedCommentsJSON()`, `importPredefinedCommentsJSON(jsonStr, mode)`
* `exportEvaluationTemplatesJSON()`, `importEvaluationTemplatesJSON(jsonStr, mode)`
* `exportFullBackupJSON()`, `restoreFullBackupJSON(jsonData)`
