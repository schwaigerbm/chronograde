# Spezifikation: Universal-Spaltenstatistik (column-statistics)

Dieses Dokument spezifiziert die Benutzeroberfläche und Funktionsweise der **Statistik-Rubrik** und der zugehörigen **Vollbild-Auswertungsanalyse-Komponente** für alle Spaltentypen in der Notenmatrix (`evaluation`, `manual`, `calculated`, `collaborationSum`).

---

## 1. Funktionale Anforderungen

Die Statistik-Erweiterung aggregiert die erfassten Leistungen der Schüler für eine spezifische Spalte der Notenmatrix und bereitet diese übersichtlich für die Lehrkraft auf. Das Verhalten und die angezeigten Dashboard-Komponenten passen sich dabei dynamisch dem Typ der Spalte an.

### 1.1 Statistik-Sektion im Bearbeitungs-Modal
* Im Bearbeitungs-Modal (`EditColumnModal`) aller Spaltentypen (unter der Rubrik "Darstellung" bzw. als eigenständige Rubrik "Statistik") wird eine Zusammenfassung der wichtigsten Metriken angezeigt.
* Diese Rubrik bietet:
  * Eine kurze Zusammenfassung der wichtigsten Metriken:
    * **Beteiligung:** Anzahl bewerteter Schüler im Verhältnis zu allen angemeldeten Schülern.
    * **Notenschnitt / Bewertungsschnitt:** Durchschnittliche Note aller bewerteten Schüler.
  * Einen auffälligen Button: **„Statistik anzeigen (Vollbild)“**.

### 1.2 Vollbild-Statistik-Komponente (`EvaluationStatisticsModal`)
Beim Klick auf den Button öffnet sich eine eigenständige, interaktive Analyse-Ansicht im Vollbild-Modus:
* **Overlay-Verhalten:**
  * Legt sich über die gesamte Anwendung (hoher `zIndex`, z.B. 3000).
  * Kann durch Klick auf einen Schließen-Button (X) oben rechts, einen "Zurück"-Button oben links oder durch Drücken der **ESC-Taste** auf der Tastatur verlassen werden.
* **Header-Bereich:**
  * Titel der Spalte (z.B. "1. Schularbeit" oder "Mitarbeit").
  * Zusätzliche Details: Erstellungsdatum, Spaltentyp, Gesamtgewichtung, ggf. Maximalpunkte.

### 1.3 Dynamisches Layout nach Spaltentyp

#### A. Auswertungsspalten (`evaluation`)
1. **Kennzahlen-Karten (Top Metrics):**
   * **Teilnehmerquote:** Anzahl abgegebener Arbeiten / Gesamtklasse (mit Prozentwert).
   * **Notenschnitt:** Der arithmetische Durchschnitt aller Noten (1-5).
   * **Erfolgsquote (Positiv-Rate):** Prozentualer Anteil der Schüler mit den Noten 1 bis 4.
   * **Punktedurchschnitt:** Durchschnittlich erreichte Punkte und Prozentwert.
2. **Notenverteilung (Notenspiegel):** Visuelles Balkendiagramm der Noten 1 bis 5 (Farben: Sehr gut = Dunkelgrün, Nicht genügend = Dunkelrot).
3. **Teilaufgaben-Analyse (Aufgabenspiegel):** Liste aller Teilaufgaben mit maximal erreichbaren Punkten, Durchschnittspunkten und prozentualem Erfolg. Aufgaben < 60% Erfolg werden gelb markiert.
4. **Podium / Die besten 3 (Trophy):** Die 3 Schüler mit den höchsten Gesamtpunkten auf dem Treppchen (unterstützt Gleichstände/Ties).
5. **Detaillierte Ergebnisliste (Leaderboard/Tabelle):** Such- und sortierbare Tabelle mit Schülername, Punkten pro Teilaufgabe, Gesamtpunkten, Prozentpunkten und Note.

#### B. Normale & Berechnete Notenspalten (`manual`, `calculated`)
1. **Kennzahlen-Karten (Top Metrics):**
   * **Teilnehmerquote:** Anzahl Schüler mit Note / Gesamtklasse.
   * **Notenschnitt:** Arithmetischer Durchschnitt aller erfassten Noten (1-5).
   * **Erfolgsquote (Positiv-Rate):** Prozentualer Anteil der Schüler mit Note 1 bis 4.
   * **Beste Note:** Die beste in der Klasse eingetragene Note.
2. **Notenverteilung (Notenspiegel):** Visuelles Balkendiagramm der Noten 1 bis 5.
3. **Teilaufgaben-Analyse:** Ausgeblendet (da keine Teilaufgaben existieren).
4. **Podium / Die besten 3 (Trophy):** Die 3 Schüler mit den besten Noten (Note 1 = Gold, Note 2 = Silber, Note 3 = Bronze). Bei Gleichständen werden Namen nebeneinander auf dem Treppchen aufgeteilt.
5. **Detaillierte Ergebnisliste (Leaderboard/Tabelle):** Such- und sortierbare Tabelle mit Name und Note.

#### C. Mitarbeit (`collaborationSum`)
1. **Kennzahlen-Karten (Top Metrics):**
   * **Beteiligungsquote:** Anzahl Schüler mit mindestens einem Eintrag (`+`, `~`, `-`) / Gesamtklasse.
   * **Eintragsdurchschnitt:** Durchschnittliche Gesamtanzahl an Einträgen pro Schüler.
   * **Pluseinträge gesamt:** Gesamtzahl aller vergebenen `+`-Einträge in der Klasse.
   * **Minuseinträge gesamt:** Gesamtzahl aller vergebenen `-`-Einträge in der Klasse.
2. **Mitarbeitsspiegel (Verteilung der Einträge):** Visuelles Balkendiagramm der drei Eintragstypen: Plus (`+` = Dunkelgrün), Neutral (`~` = Grau) und Minus (`-` = Dunkelrot) über die gesamte Klasse. Falls eine Mitarbeit-Note erfasst wurde, wird optional zusätzlich die Notenverteilung angezeigt.
3. **Teilaufgaben-Analyse:** Ausgeblendet.
4. **Podium / Die besten 3 (Trophy):** Die 3 Schüler mit dem höchsten Netto-Mitarbeitssaldo (`Anzahl Plus` minus `Anzahl Minus`). Bei Gleichständen entscheidet die absolute Anzahl an Plussen.
5. **Detaillierte Ergebnisliste (Leaderboard/Tabelle):** Such- und sortierbare Tabelle mit Name, Anzahl Plus (`+`), Anzahl Neutral (`~`), Anzahl Minus (`-`), Netto-Saldo (`+` minus `-`) und eventueller Note.

---

## 2. Technische Umsetzung & Daten-Schnittstellen

### 2.1 Datenquellen
* `column: CourseEntry`
* `students: Student[]`
* `grades: GradesState`

### 2.2 Berechnungsformeln für Mitarbeit (`collaborationSum`)
* **Plus-Einträge Schüler $i$ ($P_i$):**
  Anzahl der Einträge in `grades[studentId][columnId].entries` mit `value === '+'`.
* **Minus-Einträge Schüler $i$ ($M_i$):**
  Anzahl der Einträge in `grades[studentId][columnId].entries` mit `value === '-'`.
* **Neutral-Einträge Schüler $i$ ($N_i$):**
  Anzahl der Einträge in `grades[studentId][columnId].entries` mit `value === '~'`.
* **Netto-Mitarbeitssaldo Schüler $i$ ($S_i$):**
  $$S_i = P_i - M_i$$

---

## 3. UI/UX Design & Styling
* **Schriftgrößen-Untergrenze:** Da die Statistik-Ansicht zur Präsentation vor der Klasse dient, müssen alle Beschriftungen, Texte, Diagrammbeschriftungen und Zahlen eine Schriftgröße von **mindestens 16px (12pt)** besitzen. Ausnahmen sind nicht gestattet.
* **Druck-Optimierung (CSS Print):** Ausblenden von Steuerelementen, Buttons und Suchfeldern für ein sauberes Druckergebnis.
