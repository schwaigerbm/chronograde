# Spezifikation: Punkte-Erfassung für Teilaufgaben (`EvaluationEntryModal`)

## 1. Übersicht & Ziel
Dieses Pflichtenheft beschreibt die Benutzeroberfläche und Funktionsweise der ausgelagerten Komponente `EvaluationEntryModal`. Diese dient der schnellen, tastaturgesteuerten Erfassung von erreichten Punkten pro Teilaufgabe für einen bestimmten Schüler.

---

## 2. Benutzeroberfläche (UI) & Layout
Das Modal wird als zentriertes Overlay über der Noten-Matrix angezeigt:
* **Modal-Header:**
  * **Große Überschrift (oben):** Der Name des Schülers (z. B. `SchülerName`) fett gedruckt in großer Schrift.
  * **Untere Zeile (darunter):** Der Name der Bewertungsspalte (z. B. `1. Test WW`) gefolgt von einer dezenten Kennzeichnung (z. B. `• Punkte erfassen`).
* **Modal-Body (Zweispaltiges Layout):**
  * **Linke Spalte (Punkte pro Aufgabe):** Liste aller Teilaufgaben mit Name, maximaler Punktanzahl und einem Nummern-Eingabefeld pro Teilaufgabe.
  * **Rechte Spalte (Ergebnis-Zusammenfassung):** Live-Berechnung der Gesamtpunkte, des Prozentwerts und der Note basierend auf dem hinterlegten Notenschlüssel.

---

## 3. Keyboard-Navigation & Schnellerfassungs-Workflow

### 3.1 Automatischer Fokus & Markierung
1. Beim Öffnen des Modals springt der Fokus (Cursor) automatisch in das Punkte-Eingabefeld der **ersten Teilaufgabe**.
2. Ist in dem Eingabefeld bereits ein Wert vorhanden, wird dieser beim Fokussieren **automatisch markiert/selektiert** (`select()`).
3. Der Benutzer kann den Wert sofort durch Tippen einer Ziffer überschreiben, ohne vorher den alten Wert löschen zu müssen.
4. Jedes Mal, wenn ein Eingabefeld fokussiert wird (auch bei Tab-Navigation), wird der Text darin markiert.

### 3.2 Navigation per Tab-Taste
* Durch Drücken von **`Tab`** navigiert der Cursor zum Eingabefeld der nächsten Teilaufgabe.
* Wird auf dem **letzten Teilaufgaben-Eingabefeld** die `Tab`-Taste gedrückt:
  * Die erfassten Punkte des aktuellen Schülers werden automatisch im Hintergrund gespeichert.
  * Das Modal schließt sich **nicht**, sondern lädt direkt den **nächsten Schüler** aus der Kursliste.
  * Der Cursor springt automatisch wieder in das Punkte-Eingabefeld der **ersten Teilaufgabe** des neuen Schülers (wobei vorhandene Werte wieder selektiert werden).
  * Ist der aktuelle Schüler der letzte Schüler in der Liste, führt `Tab` zur normalen Footer-Button-Navigation.
* Wird auf dem **ersten Teilaufgaben-Eingabefeld** die Tastenkombination **`Shift+Tab`** gedrückt:
  * Die erfassten Punkte des aktuellen Schülers werden automatisch im Hintergrund gespeichert.
  * Das Modal bleibt geöffnet und lädt direkt den **vorherigen Schüler** aus der Kursliste.
  * Der Cursor springt automatisch in das Eingabefeld der **letzten Teilaufgabe** des vorherigen Schülers (wobei vorhandene Werte selektiert werden).
  * Ist der aktuelle Schüler der erste Schüler in der Liste, führt `Shift+Tab` zur normalen Navigation rückwärts (Fokus wandert auf das Schließen-Symbol im Header).

### 3.3 Abbrechen / Schließen
* Die **`ESC`-Taste** schließt das Modal jederzeit ohne zu speichern.
* Klick auf **„Abbrechen“** schließt das Modal ohne zu speichern.
* Klick auf **„Speichern“** speichert die Punkte und schließt das Modal für den aktuellen Schüler.

### 3.4 Zusatzpunkte & Bonuspunkte
* Eingabefelder für Teilaufgaben erlauben optional die Eingabe von Werten, die über die maximalen Punkte der jeweiligen Aufgabe hinausgehen (z. B. 12 von 10 Punkten). Dies ermöglicht die einfache Erfassung von Bonuspunkten und Zusatzleistungen.
