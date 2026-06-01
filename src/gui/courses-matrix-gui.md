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

* **Design-Vorgabe (Platzersparnis):** Um bei vielen Beurteilungen Platz zu sparen, müssen alle **Spaltenüberschriften senkrecht** dargestellt werden. Technisch soll dies via `writing-mode: vertical-rl; transform: rotate(180deg);` realisiert werden, um eine saubere Baseline-Ausrichtung am unteren Rand zu gewährleisten. Das Aktionsmenü (Drei-Punkte) wird fix im Header platziert.
* **Design-Vorgabe (Spaltenbreite):** Die Spalte für die Gruppenzuordnung muss exakt die gleiche schmale Breite aufweisen wie die Beurteilungsspalten für manuelle Vergabe von Noten oder Zeichen.
* **UX-Vorgabe (Scrollbalken-Verbot):** Es darf **unter keinen Umständen** vorkommen, dass beim Öffnen von Kontextmenüs oder Modals innerhalb der Matrix rechtsseitige Scrollbalken am Matrix-Fenster erscheinen. Die Menüs müssen so aufgebaut sein, dass sie außerhalb des Tabellenflusses (z.B. via Portals oder intelligenter Positionierung) schweben.
* **UX-Vorgabe (Crosshair-Highlighting):** Um die Navigation in großen Tabellen zu erleichtern, muss ein "Crosshair"-Effekt implementiert werden: Beim Hover über eine Zelle sollen sowohl die gesamte Zeile als auch die dazugehörige Spalte dezent visuell hervorgehoben werden.
* **Zeilen:** Entsprechen den Schülern, die dem jeweiligen `course` zugeordnet sind. Die Beschriftung der "Schüler"-Spalte muss zentriert/prominent im Tabellenkopf platziert sein. Reduziertes Padding in den Zeilen sorgt für eine kompaktere Darstellung.
* **Spalten:** Entsprechen den definierten Beurteilungen (`course entries`). Das Datum der Beurteilung muss in der Kopfzeile im Format `DD.MM.YY` angezeigt werden (sofern die Anzeige aktiviert ist).
* **Zellen (Schnittpunkt):** Hier wird die jeweilige Note/Bewertung (`grade`) eingetragen und angezeigt. Leere Zellen ("Empty State") sollen mit einem sehr dezenten/hellen Grau (z.B. ein helles Minus-Zeichen) dargestellt werden, um visuelle Unruhe zu vermeiden. Auch bei Hover-Effekten (Tooltips) für Einzeleinträge (z.B. Mitarbeit oder Anwesenheit) soll das Datum einheitlich im Format `DD.MM.YY` erscheinen.

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
* **Besonderheit:** Diese Spalte ist **besonders schmal** konzipiert (identisch zur Breite der Beurteilungsspalten für Note oder Zeichen) und besitzt **kein Datum** (weder im Header noch im Datensatz).
* **Aktion:** Nur `Speichern` Button sichtbar. Der Dialog wird sofort beendet.
* **Tabellen-Update:** Eine neue Spalte "Gruppe" wird hinzugefügt.
* **Zellen-Interaktion:**
    * Klick in die Zelle: Eingabe einer Zahl wird aktiviert.
    * Validierung: Erlaubt sind nur Zahlen von 1 bis 9.
    * Speichern (On-Blur): Bei Klick außerhalb der Zelle wird der Wert als `Grade` (ohne Datum) gespeichert. Die Gruppenzuordnung entspricht hierbei dem `Value`.

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
    * Hover über Zelle: Kontextmenü mit Auswahl `+`, `-`, `~` erscheint (für Neuanlage).
    * **Klick auf ein bestehendes Zeichen:** Öffnet den Dialog zum **Bearbeiten** (Ändern von Zeichen, Notiz oder Datum).
    * Nach Auswahl eines Zeichens / Öffnen zum Bearbeiten:
        * Pflichtfeld: `Notiz` (z.B. "Lautes Schwätzen") muss eingegeben werden.
        * Optional: `Datum` kann angepasst werden (Standard: aktuelles Datum).
    * Darstellung in der Zelle:
        * Alle vergebenen Einträge werden in der Zelle chronologisch als **Icons** nebeneinander angezeigt.
        * Farbcodierung & Icons (Zentriert):
            * `+` = **Grün** mit Plus-Icon.
            * `~` = **Gelb/Orange** mit Tilde-Icon/Symbol.
            * `-` = **Rot** mit Minus-Icon.
    * Hover über bestehendes Zeichen:
        * Zeigt die zugehörige `Notiz` an.
        * Zeigt einen Löschen-Button an. (UX-Hinweis: Die Anzeige muss stabil bleiben, damit der Button sicher angeklickt werden kann).

### Verzweigung D: Anwesenheit (`presenceSum`)
* **Felder:** Keine weiteren Dialog-Schritte notwendig.
* **Aktion:** `Speichern` beendet den Dialog sofort.
* **Tabellen-Update:** Neue Spalte "Anwesenheit".
* **Spalten-Kopfzeile Interaktionen:**
    * Im Tabellenkopf für die Anwesenheit wird **kein Datum** angezeigt.
    * Unter der Beschriftung befindet sich ein **"+" Button**: Öffnet ein Modal zur schnellen Erfassung der Anwesenheit für die gesamte Gruppe.
    * Unter der Beschriftung befindet sich ein **Pfeil-Button (Rechts/Links)**: Dient zum Umschalten zwischen Kompakt- und Detailansicht.

#### Modal zur Anwesenheitserfassung ("+" Button)
* **Inhalt:** Liste aller Schüler des Kurses mit:
    * Laufende Nummer
    * Nachname, Vorname
    * Spalte zur Auswahl: Klick in die Zelle ermöglicht die Wahl zwischen `Häkchen` (Anwesend) oder `X` (Abwesend).
* **Vorgabe:** Es gibt **keine Vorauswahl** (Default-Wert). Die Entscheidung muss für jeden Schüler aktiv getroffen werden.
* **Datumsauswahl:** Im Modal kann das Datum gewählt werden (Standard: Aktuelles Datum).
* **Aktionen:** `Speichern` oder `Abbrechen`.

#### Zellen-Darstellung & Toggle-Funktion
* **Zustand "Details ausgeblendet" (Kompaktansicht - Pfeil nach rechts):**
    * Die Zelle zeigt die aktuelle Anwesenheit in **Prozent** (z.B. `75%`).
    * Berechnung: 100% entsprechen der Summe aller Einträge. Der Wert reduziert sich im Verhältnis zur Anzahl der `X`.
* **Zustand "Details eingeblendet" (Detailansicht - Pfeil nach links):**
    * Alle Häkchen und `X` werden chronologisch in der Zelle angezeigt.
    * **Wichtig:** Initial wird in der Zelle **kein Datum** bei den Zeichen angezeigt.
    * **Hover:** Erst beim Hover über ein Zeichen wird das hinterlegte Datum eingeblendet.

### 4.1 Spalten-Management (Header-Aktionen & Layout)
Jede Beurteilungsspalte bietet im Kopfbereich eine strukturierte 3-Ebenen-Hierarchie:

*   **Ebene 1: Identifikation** 
    *   **Titel:** Senkrecht dargestellt (`writing-mode: vertical-rl`). Alle Titel liegen auf einer einheitlichen horizontalen Fluchtlinie (unten bündig).
    *   **Datum:** Wird **horizontal** unmittelbar unter der senkrechten Beschriftung angezeigt. Format: `DD.MM.` (ohne Jahr).
*   **Ebene 2: Verwaltung**
    *   Horizontale Zeile mit Funktions-Icons:
        *   `Info/Edit-Icon`: Öffnet das Bearbeitungs-Modal.
        *   `Papierkorb-Icon`: Löschen der Spalte (nach Bestätigung).
        *   *Spezial (Anwesenheit):* `Plus-Icon` zur Schnellerfassung.
*   **Ebene 3: Navigation & Ansicht**
    *   Horizontale Zeile mit Buttons:
        *   `Pfeil-Links`: Verschiebt die Spalte nach links.
        *   `Pfeil-Rechts`: Verschiebt die Spalte nach rechts.
        *   `Spezial (Anwesenheit):* `Auge-Icon` (Eye/EyeOff) zum Umschalten zwischen Kompakt- und Detailansicht.

*   **Layout-Vorgaben:**
    *   **Spaltenbreite:** Einheitlich schmal für alle Beurteilungstypen (ca. 100px), außer bei ausgefahrener Mitarbeit/Anwesenheit.
    *   **Zentrierung:** Alle Elemente innerhalb des Headers sind horizontal zentriert.
    *   **Abstände:** Klare vertikale Trennung zwischen den drei Ebenen.


#### Farbmodus (Heatmap)
Wenn der Farbmodus für eine Spalte aktiv ist, werden die Zellenhintergründe basierend auf dem Wert eingefärbt:
* **Typ "Note" (grade):**
    * Note 1: **Dunkelgrün**
    * Note 2: **Hellgrün**
    * Note 3: **Neutral Weiß**
    * Note 4: **Leicht Rot**
    * Note 5: **Dunkelrot**
* **Typ "Prozent" (percent):** (Gilt nicht für Anwesenheit)
    * Linearer Farbverlauf zwischen Dunkelgrün (100%) und Dunkelrot (<= 50%).
    * Werte ab 100% sind Dunkelgrün, Werte unter 50% sind Dunkelrot.
* **Typ "Zeichen" (sign):**
    * Das Zeichen wird **deutlich größer und extra fett** dargestellt.
    * Zeichen `+`: **Grün**
    * Zeichen `~`: **Orange**
    * Zeichen `-`: **Rot**

* **UX-Vorgabe:** Diese Aktionen müssen leicht zugänglich sein (z.B. über ein Drei-Punkt-Menü), ohne das Layout der senkrechten Beschriftung zu stören.

## 5. Implementierungshinweise & Testing (gemini.md)
* **Testing der Service-Layer:** Um die oben genannte `serviceFirebase` Klasse effektiv zu testen und Seiteneffekte in der Datenbank zu vermeiden, sollten in Jest zwingend `beforeAll` und `afterAll` Hooks implementiert werden. Dies gewährleistet, dass Testdaten (wie Mock-Schüler oder generierte Noten) vor den Testläufen sauber angelegt und im Nachgang wieder restlos aus der Firestore-Testumgebung gelöscht (Clean-up) werden.