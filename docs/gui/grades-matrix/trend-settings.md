# Spezifikation: Trend-Konfiguration (TrendSettingsModal)

Dieses Dokument spezifiziert die Benutzeroberfläche und Funktionsweise der eigenständigen React-Komponente `TrendSettingsModal` für die Trend-Konfiguration der Leistungsbeurteilungs-Matrix.

## 1. Benutzeroberfläche & Layout

Das Modal ist für eine hohe Informationsdichte und optimale Bildschirmausnutzung konzipiert.

* **Modal-Größe:** Großformat (`maxWidth: 900px`, `width: 90%`), um auch bei vielen Beurteilungen genügend Platz zu bieten.
* **Layout:** Zweigeteilter, kompakter Aufbau mit kleinerer Schriftgröße (`fontSize: 13px`) und geringeren Abständen, um den Bildschirm optimal auszunutzen:
  * **Linke Spalte:** Alle Regler mit ihren Beschriftungen, Schloss-Symbolen und Schaltern untereinander angeordnet (Vertikales Gewichtungs-Grid).
  * **Rechte Spalte:** Alle anderen Einstellungen (globale Rundungsregel sowie Snapshot-Erstellung) untereinander angeordnet.
* **Strukturierung:** Die linke Spalte zeigt die Koppelungs-Regler mit Locks untereinander. Die rechte Spalte enthält die globale Rundungsregel und die Snapshot-Optionen, optisch abgetrennt durch eine vertikale Linie oder Spalten-Struktur.

## 2. Funktionalität

### 2.1 Gewichtung & Schloss-Funktion (Locking)
* **100%-Kopplung:** Die Summe der Gewichtungen aller aktiven Spalten (`calc: true`) muss immer exakt **100%** ergeben.
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

### 2.2 Globale Rundungsregel
* Ermöglicht die Auswahl der Rundungsregel für den Trend und alle Meilenstein-Vorschläge:
  * **Kaufmännisch:** Mathematische Standardrundung ab ,5 aufwärts.
  * **Schülerfreundlich:** Mathematisches Aufrunden auf die nächste ganze Zahl (`Math.ceil`).

### 2.3 Snapshot erstellen
* Ermöglicht die Erstellung einer neuen berechneten Meilenstein-Spalte.
* Berechnet den Snapshot-Trend für alle Schüler auf Basis der im Modal gewählten Spaltengewichtungen und der ausgewählten Rundungsregel.
* Erstellt die Spalte in Firestore und befüllt die Noten für alle Schüler als überschriebene Meilenstein-Werte.

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
  onSave: (
    updatedCols: CourseEntry[], 
    roundingRule: 'commercial' | 'studentFriendly'
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
