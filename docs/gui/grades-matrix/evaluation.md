# Spezifikation: Teilaufgaben-Auswertung (evaluation)

Dieses Dokument spezifiziert die Benutzeroberfläche und Funktionsweise der neuen Beurteilungsart **Auswertung** (`type: 'evaluation'`). Diese ermöglicht es, schriftliche Überprüfungen (wie Schularbeiten, Tests, etc.) in Form von einzelnen Teilaufgaben mit Punkten zu erfassen, eine Notenschlüssel-Zuordnung vorzunehmen und Noten basierend auf erreichten Punkten zu berechnen.

---

## 1. Daten-Architektur (Erweiterung)

Die Auswertung wird im Schema voll typisiert integriert, um Datenkonsistenz und Type Safety zu garantieren.

### 1.1 Column Schema (`CourseEntry` in `schema.ts`)
Wir erweitern `CourseEntry` um folgende Eigenschaften:
* `subTasks?: SubTask[]`: Liste der Teilaufgaben.
* `gradingKey?: EvaluationGradingKey`: Schwellenwerte für die Notenberechnung.

```typescript
export interface SubTask {
  id: string;
  title: string;       // z.B. "Aufgabe 1"
  maxPoints: number;   // Maximale Punkte (z.B. 8)
}

export interface EvaluationGradingKey {
  grade1MinPoints: number; // Sehr Gut ab (z.B. 18)
  grade2MinPoints: number; // Gut ab (z.B. 16)
  grade3MinPoints: number; // Befriedigend ab (z.B. 13)
  grade4MinPoints: number; // Genügend ab (z.B. 10)
}
```

### 1.2 Grade Schema (`Grade` in `schema.ts`)
Wir erweitern das `Grade`-Dokument (Noten-Sub-Collection) um:
* `subTaskPoints?: Record<string, number>`: Zuordnung der erreichten Punkte pro Teilaufgabe (`subTaskId -> reachedPoints`).
* `evaluationPoints?: number`: Gesamtsumme der erreichten Punkte des Schülers.
* `evaluationPercent?: number`: Prozentualer Anteil der erreichten Punkte (`(erreichte Punkte / Gesamtpunkte) * 100`).

---

## 2. Benutzeroberfläche & Layout

### 2.1 Anlegen & Bearbeiten (`AddColumnModal` / `EditColumnModal`)
Für die Auswertung wird in Schritt 1 des `AddColumnModal` eine neue Typkarte angeboten:
* **Auswertung (`evaluation`):**
  * Symbol: `ClipboardList` oder `ListTodo`
  * Titel: `Auswertung`
  * Beschreibung: `Schriftliche Arbeit mit Teilaufgaben und Punkten`

Bei Auswahl wird in Schritt 2 des Modals die Detailkonfiguration in einem sauber strukturierten, einspaltigen Layout angezeigt (wobei das Modal die Standard-Größe `modal-large` nutzt), um eine übersichtliche und logische Eingabe von oben nach unten zu gewährleisten. Die einzelnen Sektionen sind durch Karten-Rahmen klar voneinander abgegrenzt:

1. **Sektion "Allgemeines" & "Darstellung":**
   * **Name (Bezeichnung):** Textfeld für den Namen der Auswertung.
   * **Datum:** Datumsauswahlfeld.
   * **Datum im Header anzeigen:** Schalter für Header-Sichtbarkeit des Datums.
   * **Farbmodus (Heatmap):** Schalter zur zellbasierten Farbkennzeichnung basierend auf der berechneten Note.

2. **Sektion "Teilaufgaben":**
   * Eine dynamische Liste, in der der Benutzer Teilaufgaben hinzufügen oder löschen kann.
   * Jede Teilaufgabe besitzt ein Textfeld für den **Namen** (z.B. "A1") und ein Nummernfeld für die **maximale Punkteanzahl** (max. 100 Punkte, Schrittweite 0.5).
   * **Gesamtpunkte (max. Punkte):** Wird live als Summe aller Teilaufgaben-Punkte angezeigt.

3. **Sektion "Beurteilung (Notenschlüssel)":**
   * **Visueller Zeitstrahl:** Ein farbiger Balken direkt über der Noteneingabe visualisiert das Punkteverhältnis der Noten 1-5 (Dunkelgrün links, Hellgrün, Grau/Weiß, Hellrot, Dunkelrot ganz rechts). Die Achsenbeschriftung läuft von links (Gesamtpunkte/100%) nach rechts (0 Pkt/0%).
     * **Beschriftung:** Jedes Segment ist zweizeilig beschriftet zur besseren Sichtbarkeit (die Note in der ersten Zeile, die exakte Punkteanzahl direkt darunter).
     * **Stauchung bei 50%-Schwelle:** Wenn die Grenze für ein Genügend (4) exakt bei 50% der Gesamtpunkte liegt, wird der Bereich für Note 5 (Nicht Genügend) auf 15% Breite gestaucht/skizziert und beschriftet, um den positiven Noten mehr Platz zu bieten.
   * **Linear-Aufteilung (Button):** Ein Schnellbefüllungs-Button erlaubt das automatische lineare Aufteilen der Punkte ab einer 50%-Hürde für ein Genügend.
   * **Manuelle Eingabefelder:** Der Benutzer editiert die Mindestpunkte für die Noten 1 bis 4. Das jeweilige Intervall wird live daneben angezeigt:
     * **Sehr Gut (1) ab:** [Eingabefeld] | Vorschau: `[Gesamtpunkte] bis X Pkt.`
     * **Gut (2) ab:** [Eingabefeld] | Vorschau: `(Sehr Gut ab - 0.5) bis Y Pkt.`
     * **Befriedigend (3) ab:** [Eingabefeld] | Vorschau: `(Gut ab - 0.5) bis Z Pkt.`
     * **Genügend (4) ab:** [Eingabefeld] | Vorschau: `(Befriedigend ab - 0.5) bis W Pkt.`
     * **Nicht Genügend (5):** (Kein Eingabefeld) | Vorschau: `(Genügend ab - 0.5) bis 0.0 Pkt.`
   * **Live-Validierung:** Die Prozentwerte der Untergrenzen werden live neben dem Eingabefeld berechnet. Die Punktwerte müssen logisch absteigend sein.

4. **Sektion "Bewertungseinfluss":**
   * **In Berechnung aufnehmen:** Schalter zur Bestimmung, ob die Spalte in den Trend einfließt.
   * **Berechnungseinfluss:** Schieberegler (0-100%, Schrittweite 1%) für die Gewichtung.

* **Schriftgrößen (Typography):** Da es sich bei diesem Modal um einen Eingabe- und Änderungsbereich handelt, sind kleine Schriftgrößen zur Platzersparnis erlaubt, müssen jedoch **mindestens 8pt / 11px** groß sein. Haupttexte und wichtige Eingabefelder behalten standardmäßig eine gut lesbare Schriftgröße.

---

### 2.2 Darstellung in der Noten-Matrix
Das Layout der Auswertungsspalte verhält sich dynamisch, je nachdem, ob die Details ein- oder ausgeblendet sind:

#### A. Kompaktansicht (Details ausgeblendet)
* Die Zelle zeigt die **berechnete Note** groß an (z.B. `3`).
* Direkt darunter wird der **Prozentwert der erreichten Punkte** kleiner angezeigt (z.B. `72.5%`).
* **Klick-Interaktion:** Ein Klick auf die Zelle öffnet das große Punkte-Erfassungs-Modal (`EvaluationEntryModal`).
* **Farbmodus (Heatmap):** Ist dieser aktiv, wird der Hintergrund der Zelle basierend auf der berechneten Note (1-5) eingefärbt (analog zu den Standardnoten).

#### B. Detailansicht (Details eingeblendet)
* Die Spalte verbreitert sich automatisch.
* Die Zelle zeigt eine übersichtliche, vertikal untereinander gestapelte Zusammenstellung der Punkte pro Teilaufgabe (jede Teilaufgabe steht untereinander in einer eigenen Zeile).
* Am Ende oder in der Fußnote steht die Gesamtpunkteanzahl (erreicht/möglich) und die Note (z.B. `14.5/20 Pkt. -> Note 3`).
* **Klick-Interaktion:** Klick öffnet das Punkte-Erfassungs-Modal.

---

### 2.3 Punkte-Erfassungs-Modal (`EvaluationEntryModal`)
Beim Klick auf eine Auswertungszelle öffnet sich ein großes, eigenständiges Modal zur Punkteerfassung für den gewählten Schüler:
* **Header:** Titel der Auswertung und Name des Schülers.
* **Body (Zweispaltig / übersichtlich):**
  * **Linke Seite (Punkteingabe):** Eine Liste aller konfigurierten Teilaufgaben. Jede Teilaufgabe hat ein Eingabefeld (Nummer) für die erreichten Punkte.
    * Eingabe-Validierung: $0 \le erreichte Punkte$ (kein oberes Limit, um Bonuspunkte/Zusatzpunkte zuzulassen). Schrittweite 0.5.
  * **Rechte Seite (Auswertung & Vorschau):**
    * Live-Berechnung der Gesamtpunkte: *Erreicht: X / Y Punkte*.
    * Live-Berechnung des Prozentwertes: *Z%*.
    * Live-Ermittlung der Note basierend auf dem hinterlegten Notenschlüssel.
* **Footer:** Button "Speichern" und "Abbrechen".

---

## 3. Berechnungs- & Trend-Logik

### 3.1 Notenermittlung (Auswertungsspalte)
Die Note wird anhand der erreichten Gesamtpunkte $P_{\text{err}} = \sum P_{\text{err}, i}$ im Verhältnis zum hinterlegten Notenschlüssel ermittelt:
* $P_{\text{err}} \ge \text{Sehr Gut (MinPkt)} \implies \text{Note 1}$
* $P_{\text{err}} \ge \text{Gut (MinPkt)} \implies \text{Note 2}$
* $P_{\text{err}} \ge \text{Befriedigend (MinPkt)} \implies \text{Note 3}$
* $P_{\text{err}} \ge \text{Genügend (MinPkt)} \implies \text{Note 4}$
* $P_{\text{err}} < \text{Genügend (MinPkt)} \implies \text{Note 5}$

### 3.2 Trend-Berechnung (Durchrechnung)
Im globalen Trend (Sticky Summary Spalte) fließt die Auswertung wie folgt ein:
* **Prozentwert:** Für die relative Durchschnittsberechnung wird der ermittelte Prozentwert (`evaluationPercent`) der erreichten Punkte herangezogen.
* **Beispiel:** Hat ein Schüler bei der Auswertung $16/20$ Punkte erreicht (= $80\%$) und die Spalte ist mit $100\%$ gewichtet, fließt sie mit $80\%$ in die gewichtete Gesamtsumme ein.
