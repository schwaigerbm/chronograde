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

* **Design-Vorgabe (Platzersparnis):** Um bei vielen Beurteilungen Platz zu sparen, sollen alle **Spaltenüberschriften leicht abgeschrägt** (diagonal) dargestellt werden.
* **UX-Vorgabe (Kontextmenüs):** Beim Öffnen von Kontextmenüs in der Matrix (z.B. für Noten oder Zeichen) ist darauf zu achten, dass diese **keine eigenen Scrollbalken** innerhalb des Matrix-Fensters erzeugen. Die Positionierung muss so optimiert sein, dass sie über der Matrix "schweben".
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
* **Tabellen-Update:** Eine neue Spalte "Gruppe" wird hinzugefügt.
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
* **Tabellen-Update:** Neue Spalte mit dem eingegebenen Namen.
* **Zellen-Interaktion (Hover/Klick öffnet Kontextmenü):**
    * Bei Typ `percent`: Schieberegler (0 - 100%) wird angezeigt.
    * Bei Typ `grade`: Dropdown/Auswahl der Schulnoten (1-Sehr Gut, 2-Gut, 3-Befriedigend, 4-Genügend, 5-Nicht Genügend).
    * Bei Typ `sign`: Auswahl der Symbole `+`, `-` und `~`.

### Verzweigung C: Mitarbeit (`collaborationSum`)
* **Felder:** Keine weiteren Dialog-Schritte notwendig.
* **Aktion:** `Speichern` beendet den Dialog sofort.
* **Tabellen-Update:** Neue Spalte "Mitarbeit".
* **Zellen-Interaktion (Hover/Klick):**
    * Hover über Zelle: Kontextmenü mit Auswahl `+`, `-`, `~` erscheint.
    * Nach Auswahl eines Zeichens:
        * Pflichtfeld: `Notiz` (z.B. "Lautes Schwätzen") muss eingegeben werden.
        * Optional: `Datum` kann angepasst werden (Standard: aktuelles Datum).
    * Darstellung in der Zelle:
        * Alle vergebenen Zeichen werden in der Zelle chronologisch nebeneinander angezeigt.
        * Farbcodierung & Symbole:
            * `+` = **Grün** mit Zeichen `+` in der Mitte.
            * `~` = **Gelb/Orange** mit Zeichen `~` in der Mitte.
            * `-` = **Rot** mit Zeichen `-` in der Mitte.
    * Hover über bestehendes Zeichen:
        * Zeigt die zugehörige `Notiz` an.
        * Zeigt einen Löschen-Button an. (UX-Hinweis: Die Anzeige muss stabil bleiben, damit der Button sicher angeklickt werden kann).

### Verzweigung D: Anwesenheit (`presenceSum`)
* **Felder:** Keine weiteren Dialog-Schritte notwendig.
* **Aktion:** `Speichern` beendet den Dialog sofort.
* **Tabellen-Update:** Neue Spalte "Anwesenheit".
* **Spalten-Kopfzeile Interaktionen:**
    * Unter der Beschriftung befindet sich ein **"+" Button**: Öffnet ein Modal zur schnellen Erfassung der Anwesenheit für die gesamte Gruppe.
    * Unter der Beschriftung befindet sich ein **Pfeil-Button (Rechts/Links)**: Dient zum Ein-/Ausblenden der Details.

#### Modal zur Anwesenheitserfassung ("+" Button)
* **Inhalt:** Liste aller Schüler des Kurses mit:
    * Laufende Nummer
    * Nachname, Vorname
    * Spalte zum Setzen von `Häkchen` (Anwesend) oder `X` (Abwesend).
* **Datumsauswahl:** Im Modal kann das Datum gewählt werden (Standard: Aktuelles Datum).
* **Aktionen:** `Speichern` (Daten werden für alle Schüler übernommen) oder `Abbrechen`.

#### Zellen-Darstellung & Toggle-Funktion
* **Zustand "Details ausgeblendet" (Pfeil nach rechts):**
    * Die Zelle zeigt die aktuelle Anwesenheit in **Prozent** (z.B. `75%`).
    * Berechnung: (Summe aller Einträge minus Einträge mit `X`) / Summe aller Einträge.
* **Zustand "Details eingeblendet" (Pfeil nach links):**
    * Alle Häkchen und `X` werden chronologisch in der Zelle angezeigt.
    * Hover über ein Zeichen zeigt das hinterlegte Datum an.

## 5. Implementierungshinweise & Testing (gemini.md)
* **Testing der Service-Layer:** Um die oben genannte `serviceFirebase` Klasse effektiv zu testen und Seiteneffekte in der Datenbank zu vermeiden, sollten in Jest zwingend `beforeAll` und `afterAll` Hooks implementiert werden. Dies gewährleistet, dass Testdaten (wie Mock-Schüler oder generierte Noten) vor den Testläufen sauber angelegt und im Nachgang wieder restlos aus der Firestore-Testumgebung gelöscht (Clean-up) werden.