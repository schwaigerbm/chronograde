# Spezifikation: Teilaufgaben-Auswertungsstatistik (evaluation-statistics)

Dieses Dokument spezifiziert die Benutzeroberfläche und Funktionsweise der neuen **Statistik-Rubrik** und der zugehörigen **Vollbild-Auswertungsanalyse-Komponente** für Spalten des Typs `evaluation`.

---

## 1. Funktionale Anforderungen

Die Statistik-Erweiterung aggregiert die erfassten Punkte und Noten der Schüler für eine spezifische Auswertungsspalte und bereitet diese übersichtlich für die Lehrkraft auf.

### 1.1 Statistik-Sektion im Bearbeitungs-Modal
* In der linken Spalte des `EditColumnModal` (unter der Rubrik "Darstellung") wird eine neue Rubrik **Statistik** angezeigt.
* Diese Rubrik bietet:
  * Eine kurze Zusammenfassung der wichtigsten Metriken:
    * **Beteiligung:** Anzahl bewerteter Schüler im Verhältnis zu allen angemeldeten Schülern.
    * **Notenschnitt:** Durchschnittliche Note aller bewerteten Schüler.
  * Einen auffälligen Button: **„Statistik anzeigen (Vollbild)“**.

### 1.2 Vollbild-Statistik-Komponente (`EvaluationStatisticsModal`)
Beim Klick auf den Button öffnet sich eine eigenständige, interaktive Analyse-Ansicht im Vollbild-Modus:
* **Overlay-Verhalten:**
  * Legt sich über die gesamte Anwendung (hoher `zIndex`, z.B. 3000).
  * Kann durch Klick auf einen Schließen-Button (X) oben rechts, einen "Zurück"-Button oben links oder durch Drücken der **ESC-Taste** auf der Tastatur verlassen werden.
* **Header-Bereich:**
  * Titel der Auswertungsspalte (z.B. "1. Schularbeit").
  * Zusätzliche Details: Erstellungsdatum, Gesamtpunktzahl, Anzahl der Aufgaben.
* **Analyse-Dashboard (Reihen- & Grid-Layout):**
  1. **Kennzahlen-Karten (Top Metrics):**
     * **Teilnehmerquote:** Anzahl abgegebener Arbeiten / Gesamtklasse (mit Prozentwert).
     * **Notenschnitt:** Der arithmetische Durchschnitt aller Noten (1-5).
     * **Erfolgsquote (Positiv-Rate):** Prozentualer Anteil der Schüler mit den Noten 1 bis 4.
     * **Punktedurchschnitt:** Durchschnittlich erreichte Punkte und Prozentwert.
  2. **Notenverteilung (Notenspiegel) - Eigener Zeilenabschnitt (volle Breite):**
     * Ein visuelles Balkendiagramm der Noten 1 bis 5.
     * Die Balken nutzen die App-weit definierten Notenfarben (Sehr gut = Dunkelgrün, Nicht genügend = Dunkelrot).
     * Anzeige der absoluten Schülerzahl und des Prozentanteils pro Note.
  3. **Teilaufgaben-Analyse (Aufgabenspiegel):**
     * Liste aller Teilaufgaben mit maximal erreichbaren Punkten.
     * Für jede Teilaufgabe wird die durchschnittlich erreichte Punktzahl und der prozentuale Erfolg berechnet.
     * **Visuelle Warnungen:** Teilaufgaben, bei denen der durchschnittliche Erfolg unter 60% liegt, werden farblich hervorgehoben (Warnhinweis für schwierige Aufgaben).
  4. **Podium / Die besten 3 (Trophy) - Eigener Zeilenabschnitt (volle Breite):**
     * Spezielle Visualisierung der Top 3 Schüler (nach Gesamtpunkten geordnet) mit Gold-, Silber- und Bronze-Auszeichnung.
     * Unterstützt exakte Gleichstände (Ties; Namen der betroffenen Schüler werden untereinander auf dem jeweiligen Treppchen dargestellt).
  5. **Detaillierte Ergebnisliste (Leaderboard/Tabelle):**
     * Scrollbare Auflistung aller Schüler der Klasse.
     * Zeigt: Name des Schülers, Punkte pro Aufgabe, Gesamtpunkte, Prozentpunkte und die berechnete Note.
     * Suchfilter zur schnellen Suche nach Schülern.
     * Sortierfunktion nach Name, Gesamtpunkten oder Note.

---

## 2. Technische Umsetzung & Daten-Schnittstellen

### 2.1 Datenquellen
Die Statistik berechnet alle Werte im Speicher (Client-seitig) auf Basis der übergebenen Props:
* `column: CourseEntry` (Enthält `id`, `title`, `subTasks`, `gradingKey`)
* `students: Student[]` (Liste der enrolled Schüler)
* `grades: GradesState` (Notendaten der Schüler)

### 2.2 Berechnungsformeln
* **Bewertete Schüler ($N_{\text{graded}}$):**
  Anzahl der Schüler, bei denen `grades[student.id][column.id].value` vorhanden und eine Zahl (1-5) ist.
* **Durchschnittsnote ($G_{\text{avg}}$):**
  $$\frac{\sum_{i=1}^{N_{\text{graded}}} \text{Note}_i}{N_{\text{graded}}}$$
* **Durchschnittliche Gesamtpunkte ($P_{\text{avg}}$):**
  $$\frac{\sum_{i=1}^{N_{\text{graded}}} \text{Punkte}_i}{N_{\text{graded}}}$$
* **Durchschnittliche Punkte pro Aufgabe $j$ ($PA_{\text{avg}, j}$):**
  $$\frac{\sum_{i=1}^{N_{\text{graded}}} \text{Punkte}_{i, j}}{N_{\text{graded}}}$$
* **Erfolgsquote ($R_{\text{success}}$):**
  $$\frac{N_{\text{graded, Note } \le 4}}{N_{\text{graded}}} \times 100\%$$

---

## 3. UI/UX Design & Styling
* **Premium & Clean:** Hochwertiges Dark/Light-Interface mit weichem Hintergrund, Karten-Schatten und sanften Hover-Übergängen.
* **Optimierung für Beamer & Präsentationen (Lichtschwache Beamer):**
  * Alle Beschriftungen, Texte und Zahlen in der Vollbild-Statistik-Ansicht (`EvaluationStatisticsModal`) besitzen eine Schriftgröße von **mindestens 12pt** (bzw. 16px).
  * Kleinere Notizen, Legenden, Tabellenüberschriften oder Sub-Indikatoren, die zuvor kleiner waren (z. B. 10px oder 11px), werden auf mindestens 16px (bzw. 13px/14px für dichte Bereiche wie Diagrammbeschriftungen) vergrößert, damit die Statistik auch aus der letzten Reihe im Klassenraum auf lichtschwachen Beamern problemlos ablesbar ist.
* **Druck-Optimierung (CSS Print):**
  * Über `@media print` werden Navigationsleisten, Suchfelder und Buttons ausgeblendet, damit die Lehrkraft die Übersicht sauber auf Papier ausdrucken oder als PDF speichern kann.
