# Spezifikation: Einstellungen (Settings)

## 1. Übersicht & Struktur
Die Einstellungsansicht bietet Konfigurationsmöglichkeiten für die Anwendung. Sie ist über den Navigationspunkt "Einstellungen" in der Sidebar erreichbar.

Die Ansicht ist in vier klare Tabs unterteilt:
1. **Bewertungsvorgaben:** Verwaltung der vorgefertigten Kommentare für die Mitarbeit (`+`, `~`, `-`) inklusive Vorlagen-Export/Import.
2. **Terminkategorien:** Verwaltung von Aufgaben- und Terminkategorien.
3. **Benutzerpräferenzen:** Verwaltung von UI-spezifischen Präferenzen (z. B. Avatar-Sichtbarkeit).
4. **Daten- & Datenbank-Hub:** Verwaltung aktiver SQLite-Datenbankdateien, Beurteilungsvorlagen-Import/Export, Kommentare-Vorlagen-Import/Export, JSON-Vollbackup/Restore und CSV-Import/Export.

---

## 2. Tab: Bewertungsvorgaben (Vorgefertigte Kommentare & Vorlagen)
Hier können Lehrer vorgefertigte Kommentare für die drei Bewertungszeichen der Mitarbeit (`+`, `~`, `-`) verwalten sowie Kommentarsortimente als Vorlagen exportieren und importieren.

### 2.1 Benutzeroberfläche (UI)
* **Tab/Bereichs-Überschrift:** `Mitarbeitskommentare verwalten`
* **Beschreibung:** Ein Hinweistext, der erklärt, dass diese Kommentare bei der Notenvergabe in der Matrix schnell ausgewählt werden können.
* **Vorlagen-Aktionen im Header:**
  * Button `Kommentare exportieren (JSON)`: Speichert das aktuelle Kommentarsortiment als JSON-Datei.
  * Button `Kommentare importieren (JSON)`: Öffnet einen Dateidialog zum Einlesen einer Kommentare-JSON-Datei. Bietet im Bestätigungs-Modal die Auswahl:
    * `Zusammenführen (Merge)`: Fügt neue Kommentare hinzu.
    * `Ersetzen (Overwrite)`: Ersetzt die bestehende Liste vollständig.
* **Erstellungs-Formular:**
  * **Zeichen-Auswahl:** Button-Gruppe zur Auswahl des Typs (`+`, `~`, `-`).
  * **Textfeld:** Eingabefeld für den Kommentar (z. B. "Sehr aktive Beteiligung").
  * **Button:** `Kommentar hinzufügen` (Stil: Primär, Icon: `Plus`).
* **Kommentar-Listen (nach Zeichen gruppiert):**
  * Drei separate Spalten oder Sektionen für `+` (Grün), `~` (Gelb/Orange) und `-` (Rot).
  * **Einträge in der Liste:** Jeder Eintrag zeigt den Kommentartext, Aktions-Buttons (Pfeil-oben/unten, Bearbeiten, Löschen).

---

## 3. Tab: Terminkategorien
Hier können Lehrer eigene Kategorien für die Termin- und Aufgabenliste anlegen, bearbeiten und verwalten. (Kategorie `Fehlzeiten` ist fix im System verankert).

---

## 4. Tab: Benutzerpräferenzen
Verwaltung von UI-Einstellungen:
* **Avatar-Sichtbarkeit:** Toggle-Switch `Schüler-Avatare anzeigen`.
* **A & D Dialog Sichtbarkeit:** Toggle-Switch `„A & D Dialog >“ Button auf Gruppen-Karten anzeigen`.

---

## 5. Tab: Daten- & Datenbank-Hub (Datensicherung & Import/Export)
Zentraler Hub für alle datenbank- und dateibezogenen Aktionen:
* **Sektion A: SQLite Datenbank-Verwaltung:**
  * Pfadanzeige der aktiven `.sqlite`-Datei.
  * Button `Andere SQLite-Datenbank öffnen...`
  * Button `Neue SQLite-Datenbank erstellen...`
  * Button `Datenbank-Kopie speichern unter...`
* **Sektion B: Beurteilungsvorlagen-Management:**
  * Anzeige aller gespeicherten Beurteilungsvorlagen.
  * Button `Beurteilungsvorlagen exportieren (JSON)`.
  * Button `Beurteilungsvorlagen importieren (JSON)`.
* **Sektion C: Vollständige Datensicherung:**
  * JSON-Vollbackup herunterladen und wiederherstellen.
* **Sektion D: CSV Import & Export:**
  * CSV-Schüler-Import und CSV-Kursnoten-Export.
