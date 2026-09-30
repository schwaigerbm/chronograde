# Spezifikation: Bewertungsspalte hinzufügen (AddColumnModal)

Dieses Dokument spezifiziert die Benutzeroberfläche und Funktionsweise des Modals `AddColumnModal` zum Hinzufügen neuer Beurteilungsspalten in der Leistungsbeurteilungs-Matrix.

## 1. Benutzeroberfläche & Layout

Das Modal wird vergrößert, um eine übersichtliche, kartenbasierte Auswahl des Spaltentyps im ersten Schritt zu ermöglichen.

* **Modal-Größe & Scrollbarkeit:** Mittelgroßes Format (`maxWidth: 800px`, `width: 90%`). Um ein Überlaufen des Bildschirms zu verhindern, ist der Modal-Body vertikal scrollbar (`max-height: calc(100vh - 160px)`, `overflow-y: auto`).
* **Zweistufiger Assistent (Wizard):**
  * **Schritt 1: Typauswahl & Vorlagen-Auswahl:**
    * Die 5 Standard-Spaltentypen werden als interaktive Karten (Cards) in einem responsiven Grid dargestellt.
    * **Vorlagen-Schnellauswahl:** Am oberen Rand von Schritt 1 befindet sich zusätzlich eine Sektion **„Aus Vorlage erstellen“** (Dropdown oder Vorlagen-Karten). Falls Beurteilungsvorlagen (`CourseEntryTemplate`) existieren, kann eine Vorlage direkt geladen werden. Bei Auswahl werden Titel, Teilaufgaben, Max-Punkte und Notenschlüssel sofort in Schritt 2 vorausgefüllt.
  * **Schritt 2: Detailkonfiguration:**
    * Für die Typen `manual` und `calculated` werden die Formularfelder in einer übersichtlichen, einspaltigen Liste dargestellt.
    * Für den Typ `evaluation` (Auswertung) wird das Modal in der Größe `modal-large` dargestellt und ein **einspaltiges Layout** verwendet, das sich strukturiert in folgende Karten-Sektionen untereinander gliedert:
      * **Sektion "Allgemeines & Darstellung":** Name (Bezeichnung), Datum, Datum im Header anzeigen (Switch) und Farbmodus (Heatmap) (Switch).
      * **Sektion "Teilaufgaben":** Dynamische Teilaufgaben-Konfiguration und Gesamtpunkte-Anzeige.
      * **Sektion "Beurteilung (Notenschlüssel)":** Visueller Zeitstrahl des Notenschlüssels, linearer Schlüssel-Generator (Button) und manuelle Mindestpunkte (Note 1-4).
      * **Sektion "Bewertungseinfluss":** Gewichtungs-Einfluss (Switch & Schieberegler).
      * **Sektion "Als Vorlage speichern":** Optionales Häkchen/Button, um die aktuell konfigurierte Auswertung als wiederverwendbare Beurteilungsvorlage in der Vorlagen-Bibliothek zu speichern.

### 1.1 Schritt 1: Karten-Design (Card-based Selection)
Jeder der 5 Spaltentypen wird als eigenständige Karte (`.type-card`) gerendert:
1. **Gruppenzuordnung (`groupAssignment`):**
   * Symbol: `Users` (Gruppe)
   * Titel: Gruppenzuordnung
   * Beschreibung: Schüler Gruppen (Zahlen 1-9) zuweisen.
2. **Manueller Eintrag (`manual`):**
   * Symbol: `FileText` (Text)
   * Titel: Manueller Name
   * Beschreibung: Eigener Spaltenname für Schularbeiten, Tests, etc.
3. **Mitarbeit (`collaborationSum`):**
   * Symbol: `Award` (Auszeichnung)
   * Titel: Mitarbeit
   * Beschreibung: Systematische Mitarbeit erfassen (+, ~, -).
4. **Anwesenheit (`presenceSum`):**
   * Symbol: `CalendarCheck` (Kalender)
   * Titel: Anwesenheit
   * Beschreibung: Anwesenheitsliste für den Unterricht führen.
5. **Meilenstein (`calculated`):**
   * Symbol: `TrendingUp` (Trend)
   * Titel: Meilenstein
   * Beschreibung: Berechnete Note zu einem Stichtag (z.B. Semester).
6. **Auswertung (`evaluation`):**
   * Symbol: `ClipboardList`
   * Titel: Auswertung
   * Beschreibung: Schriftliche Arbeit mit Teilaufgaben und Punkten.

---

## 2. Funktionalität

### 2.1 Ablaufsteuerung (Wizard-Schritte)
* **Vorlagen-Schnellauswahl:** Wird eine Vorlage gewählt, springt der Assistent direkt zu Schritt 2 mit allen vorausgefüllten Daten.
* **Gruppe, Mitarbeit, Anwesenheit:** Erfordern keine weiteren Angaben in Schritt 2. Klick auf "Speichern" erstellt die Spalte mit Standardwerten.
* **Manueller Name, Meilenstein, Auswertung:** Klick auf "Weiter" führt zu Schritt 2.

---

## 3. Komponentenschnittstelle (TypeScript-Props)

Die Komponente liegt in `src/components/AddColumnModal.tsx`.

```typescript
import { CourseEntry, CourseEntryTemplate } from '../schema';

export interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (column: Omit<CourseEntry, 'id'>) => void;
  templates?: CourseEntryTemplate[];
  onSaveTemplate?: (template: Omit<CourseEntryTemplate, 'id' | 'createdAt'>) => void;
}
```
