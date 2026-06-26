# 📝 UX & Usability Verbesserungs-Checkliste

Bitte markiere die gewünschten Änderungen, indem du das Leerzeichen in `[ ]` durch ein `x` ersetzt (z. B. `[x]`). Ich werde diese dann nach deiner Freigabe implementieren.

---

## 1. Navigation & Hauptlayout (Sidebar / Dashboard)

- [x] **Gruppen-Schnellauswahl in der Notenmatrix**
  - *Beschreibung:* Dropdown-Auswahlmenü direkt neben dem Gruppennamen in der Leistungsbeurteilungs-Matrix (oder ein "Zurück"-Button), um direkt zwischen den Gruppen zu wechseln.
  - *Vorteil:* Erspart den Umweg über den Tab "Gruppen".

- [x] **Bereinigung von Platzhaltern ("Termine")**
  - *Beschreibung:* Ausblenden des Menüpunkts "Termine" oder Ersetzen durch eine ansprechende "Coming Soon"-Mockup-Ansicht.
  - *Vorteil:* Professionellerer Gesamteindruck.

---

## 2. Schüler-Verwaltung (Tab "Schüler")

- [x] **Avatar-Vorschau in Schüler-Tabelle**
  - *Beschreibung:* Ein kleines, rundes Miniaturbild des Schülers direkt in der Übersichtsliste anzeigen. Dies jedoch mit der Möglichkeit es Ein und Aus zu schalten über die Konfigurationen
  - *Vorteil:* Schnellere visuelle Identifikation im Alltag.

- [ ] **Lazy Loading / Paginierung**
  - *Beschreibung:* Begrenzung der geladenen Schüler in der Tabelle (z. B. 50 Einträge) mit "Mehr laden"-Option.
  - *Vorteil:* Bessere Ladezeit und Performance bei sehr vielen Schülern.

---

## 3. Gruppen-Verwaltung & Zuweisung (Tab "Gruppen")

- [x] **Autofokus bei "Gruppe hinzufügen"**
  - *Beschreibung:* Automatischer Fokus des Cursors auf das Feld "Name des Fachs", sobald das Modal geöffnet wird.
  - *Vorteil:* Schnellere Tastatureingabe ohne vorherigen Klick.

- [x] **Lösch-Sicherheitsschranke für Gruppen**
  - *Beschreibung:* Beim endgültigen Löschen einer Gruppe muss der Name der Gruppe manuell eingetippt werden, um den Lösch-Button freizuschalten.
  - *Vorteil:* Schutz vor versehentlichem Löschen wichtiger Notendaten.

- [x] **Sicherheits-Bestätigung bei Schüler-Entfernung (Zuweisungs-Modal)**
  - *Beschreibung:* Das Entfernen eines Schülers aus einer Gruppe verlangt eine kurze Bestätigung oder bietet einen zweisekündigen "Rückgängig machen"-Toast.
  - *Vorteil:* Verhindert Fehlklicks beim schnellen Scrollen.

---

## 4. Noten-Matrix (Interaktivität)

- [x] **Pfeiltasten-Navigation für Gruppen-Spalten**
  - *Beschreibung:* Mit den Tasten `ArrowUp` und `ArrowDown` (oder `Enter`) kann in der Spalte "Gruppe" (1-9) direkt von Zeile zu Zeile gesprungen werden.
  - *Vorteil:* Erspart das manuelle Anklicken jedes einzelnen Feldes.

- [ ] **Numerisches Eingabefeld für Prozent-Schieberegler**
  - *Beschreibung:* Hinzufügen eines Textfeldes neben dem Slider im Prozent-Eingabemenü für die manuelle Exakt-Eingabe (z. B. "83").
  - *Vorteil:* Präzise und schnelle Eingabe statt fummeligem Schieben mit der Maus.

- [x] **Schnellspeichern bei Mitarbeit durch Doppelklick**
  - *Beschreibung:* Ein Doppelklick auf einen vorgefertigten Mitarbeitskommentar speichert diesen direkt und schließt das Modal.
  - *Vorteil:* Halbiert die Klick-Anzahl bei der Notenvergabe im Unterricht.

- [x] **Farbliche Markierung für überschriebene Noten**
  - *Beschreibung:* Zellen, bei denen die berechnete Note manuell überschrieben wurde, erhalten einen dezent andersfarbigen Hintergrund (z. B. leichtes Orange/Gelb).
  - *Vorteil:* Sofortige visuelle Unterscheidung zwischen Auto-Berechnung und manueller Korrektur.

---

## 5. Punkte-Erfassung für Teilaufgaben (`EvaluationEntryModal`)

- [ ] **Rückwärts-Navigation via Shift+Tab**
  - *Beschreibung:* Wenn der Cursor im ersten Eingabefeld steht, führt `Shift+Tab` zum *vorherigen* Schüler in der Liste (Autofokus auf dessen letzte Aufgabe).
  - *Vorteil:* Schnelle Fehlerkorrektur rückwärts komplett ohne Maus.

- [ ] **Zusatzpunkte / Bonuspunkte zulassen**
  - *Beschreibung:* Eingabefelder erlauben optional Werte, die über die maximalen Punkte einer Aufgabe hinausgehen.
  - *Vorteil:* Abbildung von Bonusaufgaben und Extrapunkten.

---

## 6. Sonstiges (Login & Einstellungen)

- [x ] **Passwort-Sichtbarkeit umschaltbar**
  - *Beschreibung:* Ein kleines "Auge"-Icon im Passwortfeld des Logins zum Ein- und Ausblenden des Passworts.
  - *Vorteil:* Vermeidet Vertippen bei der Anmeldung.

- [x ] **"Alle gleich gewichten"-Button**
  - *Beschreibung:* Button in den Trend-Einstellungen, um alle aktiven Notenspalten sofort mit demselben prozentualen Gewicht zu versehen.
  - *Vorteil:* Schnelles Zurücksetzen der Gewichtungen.
