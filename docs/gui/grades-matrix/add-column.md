# Spezifikation: Bewertungsspalte hinzufügen (AddColumnModal)

Dieses Dokument spezifiziert die Benutzeroberfläche und Funktionsweise des Modals `AddColumnModal` zum Hinzufügen neuer Beurteilungsspalten in der Leistungsbeurteilungs-Matrix.

## 1. Benutzeroberfläche & Layout

Das Modal wird vergrößert, um eine übersichtliche, kartenbasierte Auswahl des Spaltentyps im ersten Schritt zu ermöglichen.

* **Modal-Größe:** Mittelgroßes Format (`maxWidth: 800px`, `width: 90%`), um genügend Platz für die Typkarten zu bieten.
* **Zweistufiger Assistent (Wizard):**
  * **Schritt 1: Typauswahl:** Die Spaltentypen werden als interaktive Karten (Cards) in einem responsiven Grid dargestellt.
  * **Schritt 2: Detailkonfiguration:** Formularfelder zur Eingabe von Name, Datum, Gewichtung und Bewertungsart. (Wird nur für Typen benötigt, die weitere Angaben verlangen, d.h. `manual` und `calculated`).

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
   * Besonderheit: Im Tabellenkopf für die Mitarbeit wird kein Datum angezeigt (showDateInHeader: false).
4. **Anwesenheit (`presenceSum`):**
   * Symbol: `CalendarCheck` (Kalender)
   * Titel: Anwesenheit
   * Beschreibung: Anwesenheitsliste für den Unterricht führen.
5. **Meilenstein (`calculated`):**
   * Symbol: `TrendingUp` (Trend)
   * Titel: Meilenstein
   * Beschreibung: Berechnete Note zu einem Stichtag (z.B. Semester).

* **Karten-Stile:**
  * Jede Karte besitzt ein Icon in einem farbig getönten Kreis, einen fettgedruckten Titel und eine Beschreibung.
  * Bei Hover hebt sich die Karte leicht an, der Rahmen färbt sich primär-blau und es wird ein Schatten geworfen.
  * Die ausgewählte Karte (`.type-card.active`) erhält einen markanten blauen Rahmen und einen weichen blauen Hintergrund-Tint.

---

## 2. Funktionalität

### 2.1 Ablaufsteuerung (Wizard-Schritte)
* **Gruppe, Mitarbeit, Anwesenheit:** Erfordern keine weiteren Angaben in Schritt 2. Beim Klick auf "Speichern" in Schritt 1 wird die Spalte direkt mit Standardwerten (z.B. Titel "Mitarbeit", Gewichtung `0%`, etc.) erstellt, besitzt kein Datum im Header und das Modal geschlossen.
* **Manueller Name, Meilenstein:** Ein Klick auf "Weiter" führt zu Schritt 2 zur detaillierten Dateneingabe.

### 2.2 Schritt 2: Formular & Validierung
* **Bezeichnung (Title):** Pflichtfeld (Text). Button "Speichern" ist deaktiviert, wenn das Feld leer ist.
* **Stichtag (Cutoff-Date):** Nur sichtbar für Typ `calculated`. Bestimmt das Enddatum für die Noteneinbeziehung.
* **Datum:** Nur sichtbar für andere Typen. Standardmäßig das heutige Datum.
* **Bewertungsart:** Auswahl zwischen Note, Prozent oder Zeichen (Radio-Buttons).
* **In Berechnung aufnehmen (Switch):** Schalter zur Bestimmung, ob die Spalte in den Trend einfließt.
  * Wenn aktiv, wird ein Schieberegler für den **Berechnungseinfluss** (0-100%, Schrittweite 5%) eingeblendet.
* **Datum im Header anzeigen (Switch):** Schalter zur Steuerung der Header-Sichtbarkeit des Datums.

---

## 3. Komponentenschnittstelle (TypeScript-Props)

Die Komponente liegt in `src/components/AddColumnModal.tsx`.

```typescript
import { CourseEntry } from '../schema';

export interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (column: Omit<CourseEntry, 'id'>) => void;
}
```
