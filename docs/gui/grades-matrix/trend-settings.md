# Spezifikation: Trend-Konfiguration (TrendSettingsModal)

Dieses Dokument spezifiziert die Benutzeroberfläche und Funktionsweise der eigenständigen React-Komponente `TrendSettingsModal` für die Trend-Konfiguration der Leistungsbeurteilungs-Matrix.

## 1. Benutzeroberfläche & Layout (Kurs-Konfigurationszentrum)

Das Modal ist als zentrales Einstellungsfenster für den Kurs konzipiert und bietet eine Tab-Struktur, um alle Einstellungen übersichtlich zu bündeln.

* **Modal-Größe:** Großformat (`maxWidth: 900px`, `width: 90%`), um genügend Platz für Spaltenlisten und Schieberegler zu bieten.
* **Tab-Navigation:** Am oberen Rand des Modals befinden sich zwei Reiter (Tabs):
  1. **Spalten & Layout:** Ermöglicht die Steuerung der Sichtbarkeit (`isVisible`) und Reihenfolge der Spalten (Pfeil-Oben/Pfeil-Unten Buttons).
  2. **Gewichtung & Trend:** Bietet den zweigeteilten, kompakten Gewichtungs-Aufbau:
     * **Linke Spalte:** Vertikales Grid aller Gewichtungs-Regler (Schieberegler, synchrone Textfelder, Schlösser, Gleichgewichtungs-Buttons).
     * **Rechte Spalte:** Globale Rundungsregel, Snapshot-Erstellung, Trend-Heatmap-Schalter, Mitarbeits-Berechnungsmodus.
* **Strukturierung:** Die Tabs sind klar voneinander getrennt. Tab 2 verwendet die zweispaltige Aufteilung für hohe Informationsdichte.

## 2. Funktionalität

### 2.1 Gewichtung & Schloss-Funktion (Locking)
* **100%-Kopplung:** Die Summe der Gewichtungen aller aktiven Spalten (`calc: true`) muss immer exakt **100%** ergeben.
* **Synchronisiertes Eingabefeld:** Jeder Schieberegler besitzt direkt daneben ein synchronisiertes numerisches Textfeld (Eingabe 0–100, Schrittweite 1%). Änderungen in diesem Textfeld aktualisieren den Wert sofort und stufen ihn proportional auf die unfixierten Spalten zurück. Das Eingabefeld wird deaktiviert, wenn die Spalte gesperrt ist.
* **Schloss-Symbol (`Lock` / `Unlock`):** Jede aktive Spalte besitzt ein interaktives Schloss-Symbol.
  * **Offen (`Unlock`):** Der Regler verhält sich dynamisch.
  * **Geschlossen (`Lock`):** Der Regler ist fixiert. Sein Wert ist gesperrt und der Schieberegler wird deaktiviert (`disabled`).
* **Mathematische Normalisierung bei Anpassung:**
  * Wird Regler $X$ (unlocked) verändert, wird sein neuer Wert $V_X$ zugewiesen.
  * Der maximal zulässige Wert für $V_X$ wird gedeckelt auf:
    $$V_{X, \text{max}} = 100 - \sum \text{Gewichtungen aller anderen fixierten Regler}$$
  * Die verbleibende Prozent-Differenz ($100 - V_X - \sum \text{fixierte Regler}$) wird proportional auf die restlichen aktiven, **nicht-fixierten** Regler verteilt.
  * Wenn außer $X$ alle anderen aktiven Regler fixiert (gesperrt) sind, kann Regler $X$ nicht verändert werden.
* **Deaktivierung:** Wird eine Spalte deaktiviert (`calc: false`), wird ihr Lock-Status automatisch aufgehoben.
* **Persistierung:** Der Fixierungszustand wird im Feld `isLocked` (optionaler boolean) im `CourseEntry`-Datenmodell gespeichert und persistiert, sodass die Sperren beim erneuten Laden wieder zur Verfügung stehen.
* **Gleichverteilungs-Button (Zentrieren):** Neben dem Schloss-Symbol gibt es eine Schaltfläche (mit dem Waage-Symbol `Scale`), mit der der jeweilige Regler auf den exakten Mittelwert der verbleibenden freien Prozentanteile gesetzt werden kann:
  $$V_{\text{neu}} = \text{Math.round}(\text{freie Anteile} / \text{Anzahl der unfixierten Regler})$$
  Die restlichen nicht-fixierten Spalten werden daraufhin proportional normalisiert.
* **Button "Alle gleich gewichten":** Eine globale Schaltfläche im Modal, die alle nicht-fixierten (unlocked), aktiven Beurteilungsspalten auf den exakten gleichen Anteil normalisiert (z. B. bei 4 Spalten jeweils 25%). Eventuelle Rundungsdifferenzen (Verbleibende Reste bei Divisionen) werden dem ersten freien Element zugeschlagen.

### 2.2 Globale Rundungsregel
* Ermöglicht die Auswahl der Rundungsregel für den Trend und alle Meilenstein-Vorschläge:
  * **Kaufmännisch:** Mathematische Standardrundung ab ,5 aufwärts.
  * **Schülerfreundlich:** Mathematisches Aufrunden auf die nächste ganze Zahl (`Math.ceil`).

### 2.3 Snapshot erstellen
* Ermöglicht die Erstellung einer neuen berechneten Meilenstein-Spalte.
* Berechnet den Snapshot-Trend für alle Schüler auf Basis der im Modal gewählten Spaltengewichtungen und der ausgewählten Rundungsregel.
* Erstellt die Spalte in Firestore und befüllt die Noten für alle Schüler als überschriebene Meilenstein-Werte.

### 2.4 Trend-Farbmodus (Heatmap)
* Ermöglicht das Ein- und Ausschalten des Farbmodus (Heatmap) für die Trend-Spalte.
* **Option:** Ein Toggle-Schalter (Switch) "Farbmodus (Heatmap)" in der rechten Spalte des Modals.
* **Verhalten:**
  * Wenn aktiv, werden die Hintergrundfarben der Live-Trend-Zellen in der Matrix basierend auf der berechneten Note (1 bis 5) eingefärbt (analog zu den regulären Notenspalten).
  * Wenn inaktiv, wird keine Hintergrundfarbe in den Trend-Zellen angezeigt (nur Text).

### 2.5 Mitarbeits-Berechnungsmodus
* Ermöglicht die Auswahl, wie die Mitarbeit (Typ `collaborationSum`) berechnet und in den Trend einbezogen wird.
* **Option:** Ein Dropdown-Auswahlfeld "Mitarbeits-Berechnung" in der rechten Spalte des Modals mit folgenden Optionen:
  * **Als gesamte Mitarbeitsnote am Schluss einrechnen (Standard):** Die Mitarbeit wird als statische Gesamtnote/Gesamtwert mit der entsprechenden Gewichtung in die Durchschnittsberechnung einbezogen. Die Einzeleinträge erzeugen keine eigenen Punkte auf der Verlaufskurve. Bei zeitabhängigen Trendberechnungen wird der aktuelle Gesamtprozentsatz der Mitarbeit (ohne zeitliche Filterung) herangezogen.
  * **Linear mit der Zeit in den Trend einrechnen (nur bei Bedarf):** Die Mitarbeits-Einzelnoten fließen chronologisch gefiltert bis zum jeweiligen Berechnungsstichtag in den Trend ein. Jeder einzelne Mitarbeits-Eintrag erzeugt einen eigenen zeitlichen Datenpunkt auf der Verlaufskurve.

## 3. Komponentenschnittstelle (TypeScript-Props)

Die Komponente wird als eigenständige Datei `src/components/TrendSettingsModal.tsx` realisiert.

```typescript
import { Course, CourseEntry, Student, Grade } from '../schema';

export interface TrendSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: CourseEntry[];
  students: Student[];
  grades: Record<string, Record<string, Grade>>;
  courseId: string;
  roundingRule: 'commercial' | 'studentFriendly';
  isTrendColorEnabled: boolean;
  collaborationCalcMode: 'linear' | 'weighted';
  onSave: (
    updatedCols: CourseEntry[], 
    roundingRule: 'commercial' | 'studentFriendly',
    isTrendColorEnabled: boolean,
    collaborationCalcMode: 'linear' | 'weighted'
  ) => void;
  showDialog: (config: {
    isOpen?: boolean;
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'danger' | 'success';
    onConfirm?: () => void;
    isAlert?: boolean;
    confirmLabel?: string;
  }) => void;
}
```
