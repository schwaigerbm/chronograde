# Spezifikation: GUI Leistungsbeurteilung (Firebase Service-Architektur)

## 1. Seitenstruktur & Header
Die Kopfzeile dient der Identifikation der Ansicht, zeigt den aktuellen Kurs an und bietet die primäre Aktion zum Hinzufügen neuer Beurteilungen.

* **Hauptüberschrift (H1):** `Leistungsbeurteilung`
* **Unterüberschrift (H2):** `[Name der Gruppe / Course]`
* **Aktions-Button:** Direkt rechts neben der Unterüberschrift platziert.
    * **Label:** `Beurteilungsspalte hinzufügen` (oder `+`)
    * **Stil:** Primär-Button (hervorgehoben).

## 2. Datenanbindung & Architektur
* **Backend:** Firebase Firestore (Collections: `courses`, `students`, `course_entries`, `grades`).
* **Service-Layer:** Die GUI kommuniziert **nicht direkt** mit Firebase, sondern ausschließlich über die erweiterte Service-Klasse (z.B. `serviceFirebase`).
* **Architektur-Vorgabe (WICHTIG):** Vor der Implementierung dieser GUI müssen das Daten-Schema und die Service-Klasse zwingend überprüft und so umgebaut/ergänzt werden, dass sie alle unten beschriebenen Entitäten (Courses, Course Entries mit den verschiedenen Typen, Grades mit Historie/Mehrfacheinträgen) vollumfänglich unterstützen.

## 3. Daten-Tabelle (Notenübersicht)
Anzeige der Leistungsmatrix für die gewählte Gruppe.

* **Zeilen:** Entsprechen den Schülern, die dem jeweiligen `course` zugeordnet sind.
* **Spalten:** Entsprechen den definierten Beurteilungen (`course entries`).
* **Zellen (Schnittpunkt):** Hier wird die jeweilige Note/Bewertung (`grade`) eingetragen und angezeigt.

## 4. Dialog-Fenster (Modals): Spalte hinzufügen
Dieser Dialog führt den Benutzer über mehrere Seiten/Schritte (Multi-Step-Modal), um einen neuen `Course Entry` anzulegen.

### Schritt 1: Typ-Auswahl
* **Auslöser:** Klick auf den Button `Beurteilungsspalte hinzufügen`.
* **Feld:** Radio-Button-Gruppe zur Auswahl des Beurteilungstyps:
    * `Gruppenzuordnung` (type: `groupAssignment`)
    * `Manueller Name` (type: `manual`)
    * `Mitarbeit` (type: `collaborationSum`)
    * `Anwesenheit` (type: `presenceSum`)
* **Navigation:** Nach der Auswahl verzweigt der Dialog je nach Typ.

---

### Verzweigung A: Gruppenzuordnung (`groupAssignment`)
* **Felder:** Keine weiteren Eingabefelder.
* **Aktion:** Nur `Speichern` Button sichtbar. Der Dialog wird sofort beendet.
* **Tabellen-Update:** * Neue Spalte "Gruppe" wird hinzugefügt (Titel horizontal geschrieben).
* **Zellen-Interaktion:**
    * Klick in die Zelle: Eingabe einer Zahl wird aktiviert.
    * Validierung: Erlaubt sind nur Zahlen von 1 bis 9.
    * Speichern (On-Blur): Bei Klick außerhalb der Zelle wird der Wert als `Grade` (mit dem aktuellen Datum) gespeichert. Die Gruppenzuordnung entspricht hierbei dem `Value`.

### Verzweigung B: Manueller Name (`manual`)
* **Felder (Schritt 2):**
    * Input: `Name` (z.B. "1. Test WW" = title)
    * Datepicker: `Datum`
    * Radio-Buttons (Berechnungstyp): `Prozent` (percent), `Note` (grade) oder `Zeichen` (sign)
    * Schalter (Toggle): `In Berechnung aufnehmen` (EIN/AUS)
    * Schieberegler (Slider): `Einfluss` (0 - 100%)
* **Aktion:** `Speichern` beendet den Dialog.
* **Tabellen-Update:** Neue Spalte mit dem eingegebenen Namen (Titel horizontal geschrieben).
* **Zellen-Interaktion (Hover/Klick öffnet Kontextmenü):**
    * Bei Typ `percent`: Schieberegler (0 - 100%) wird angezeigt.
    * Bei Typ `grade`: Dropdown/Auswahl der Schulnoten (1-Sehr Gut, 2-Gut, 3-Befriedigend, 4-Genügend, 5-Nicht Genügend).
    * Bei Typ `sign`: Auswahl der Symbole `+`, `-` und `~`.

### Verzweigung C: Mitarbeit (`collaborationSum`)
* **Felder:** Keine weiteren Dialog-Schritte notwendig.
* **Aktion:** `Speichern` beendet den Dialog sofort.
* **Tabellen-Update:** Neue Spalte "Mitarbeit" (Titel horizontal geschrieben). Wenn bei *irgendeinem* Schüler mindestens 4 Mitarbeitszeichen existieren, wird die Spaltenbezeichnung zwingend waagrecht dargestellt.
* **Zellen-Interaktion (Hover/Klick):**
    * Hover über Zelle: Kontextmenü mit Auswahl `+`, `-`, `~` erscheint.
    * Nach Auswahl eines Zeichens:
        * Pflichtfeld: `Notiz` (z.B. "Lautes Schwätzen") muss eingegeben werden.
        * Optional: `Datum` kann angepasst werden (Standard: aktuelles Datum).
    * Darstellung in der Zelle:
        * Alle vergebenen Zeichen werden in der Zelle chronologisch nebeneinander angezeigt.
        * Farbcodierung: `+` = **Grün**, `~` = **Orange**, `-` = **Rot**.
    * Hover über bestehendes Zeichen:
        * Zeigt die zugehörige `Notiz` an.
        * Zeigt einen Löschen-Button unterhalb der Notiz an.

### Verzweigung D: Anwesenheit (`presenceSum`)
* **Felder:** Keine weiteren Dialog-Schritte notwendig.
* **Aktion:** `Speichern` beendet den Dialog sofort.
* **Tabellen-Update:** Neue Spalte "Anwesenheit" (Titel horizontal geschrieben).
    * *Spalten-Kopfzeile:* Enthält Pfeilbuttons (Links/Rechts) zum Ein-/Ausblenden der Details.
        * *Eingeblendet:* Anwesenheitszeichen sind sichtbar.
        * *Ausgeblendet:* Alle Zellen der Spalte werden grau und ohne Inhalt dargestellt.
* **Zellen-Interaktion (Hover/Klick):**
    * Hover über Zelle: Kontextmenü mit Auswahl `Häkchen` (Anwesend) oder `X` (Abwesend).
    * Nach Auswahl: Es wird **keine** Notiz abgefragt. Das Datum kann optional angepasst werden.
    * Darstellung in der Zelle:
        * Zeichen werden chronologisch (nach Datum) von links nach rechts gereiht.
    * Hover über bestehendes Zeichen: Zeigt das hinterlegte Datum an.
    * Zusammenfassung: Am rechten Ende der Zeichenkette in der Zelle wird eine summierte Schrägstrich-Variante eingeblendet (z.B. `3/4` -> entspricht 3 Häkchen von insgesamt 4 Einträgen).

## 5. Implementierungshinweise & Testing (gemini.md)
* **Testing der Service-Layer:** Um die oben genannte `serviceFirebase` Klasse effektiv zu testen und Seiteneffekte in der Datenbank zu vermeiden, sollten in Jest zwingend `beforeAll` und `afterAll` Hooks implementiert werden. Dies gewährleistet, dass Testdaten (wie Mock-Schüler oder generierte Noten) vor den Testläufen sauber angelegt und im Nachgang wieder restlos aus der Firestore-Testumgebung gelöscht (Clean-up) werden.