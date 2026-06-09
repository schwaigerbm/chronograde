# Spezifikation: GUI Leistungsbeurteilung (Firebase Service-Architektur)

## 1. Seitenstruktur & Header
Die Kopfzeile dient der Identifikation der Ansicht, zeigt den aktuellen Kurs an und bietet die primäre Aktion zum Hinzufügen neuer Beurteilungen.

* **Hauptüberschrift (H1):** `Leistungsbeurteilung`
* **Unterüberschrift (H2):** `[Name der Gruppe / Course]`
* **Aktions-Buttons:** Direkt rechts neben der Unterüberschrift platziert.
    * **Button 1:** `Ansicht konfigurieren` (Stil: Sekundär, Icon: `Settings`).
    * **Button 2:** `Beurteilungsspalte hinzufügen` (Stil: Primär, Icon: `Plus`).

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

### 4.2 Modal: Ansicht konfigurieren
Dieser Dialog ermöglicht die Verwaltung der Spalten-Sichtbarkeit und der Reihenfolge.

* **Inhalt:** Eine Tabelle oder Liste aller existierenden Spalten des Kurses.
* **Spalten der Liste:**
    * `Reihenfolge`: Buttons (`Pfeil-Oben / Pfeil-Unten`) zum Verschieben der Spalten.
    * `Sichtbarkeit`: Checkbox oder Toggle-Switch zum Ein-/Ausblenden der Spalte in der Matrix.
    * `Titel`: Name der Spalte.
    * `Typ`: Anzeige des Beurteilungstyps.
* **Logik:**
    * Ausgeblendete Spalten (`isVisible: false`) werden in der Haupt-Matrix nicht gerendert.
    * Die Reihenfolge in der Liste entspricht der horizontalen Reihenfolge (links nach rechts) in der Matrix.
* **Aktionen:** `Speichern` übernimmt die Änderungen global für den Kurs.

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
* **Konzept:** Systematische Erfassung von Stundenleistungen. In der Kompaktansicht wird der Prozentwert angezeigt.
* **Spalten-Kopfzeile Interaktionen:**
    * Unter der Beschriftung befindet sich ein **"+" Button** (Ebene 2): Öffnet ein Modal zur Mitarbeit-Schnellerfassung für die gesamte Gruppe.
    * Unter der Beschriftung befindet sich ein **Auge-Icon (Eye/EyeOff)** (Ebene 3): Dient zum Umschalten zwischen Kompakt- und Detailansicht.

#### Modal zur Mitarbeit-Schnellerfassung ("+" Button)
* **Inhalt:** Liste aller Schüler des Kurses.
* **Interaktion:**
    * Pro Schüler: Auswahl zwischen `+`, `~`, `-` oder `Kein Eintrag` (unset).
    * Globales Pflichtfeld: `Notiz` (wird als Standard für alle gewählten Einträge übernommen).
    * Datumsauswahl: Standard: Aktuelles Datum.
* **Aktionen:** `Speichern` oder `Abbrechen`.

* **Spalten-Breite (Dynamisch):**
    * Im **Kompaktmodus** (Details aus): Die Spalte ist **identisch schmal** wie die manuellen Beurteilungsspalten (ca. 100px).
    * Im **Detailmodus** (Details ein): Die Spalte vergrößert sich automatisch, um alle Icons nebeneinander anzuzeigen (ca. 180px).
* **Zustand "Details ausgeblendet" (Kompaktansicht):**
    * Die Zelle zeigt eine zusammenfassende **Prozentanzeige** (z.B. `75%`).
    * **Berechnungs-Logik:**
        * `+` (Positiv) = **1,0 Punkte**
        * `~` (Neutral) = **0,5 Punkte**
        * `-` (Negativ) = **0,0 Punkte**
        * **Formel:** `(Summe der Punkte / Anzahl der Einträge) * 100`.
    * **Farbmodus (Heatmap):**
        * Wenn aktiv, wird der Hintergrund basierend auf dem Prozentwert eingefärbt (analog zum Typ "percent": Verlauf von Dunkelrot bis Dunkelgrün).
* **Zustand "Details eingeblendet" (Detailansicht):**
    * Alle vergebenen Einträge werden in der Zelle chronologisch als **Icons** nebeneinander angezeigt.
    * In dieser Ansicht ist die Heatmap (Hintergrundfarbe) deaktiviert, um die Sichtbarkeit der farbigen Icons zu gewährleisten.
* **Zellen-Interaktion (Hover/Klick):**
    * Hover über Zelle: Plus-Button erscheint (für Neuanlage).
    * **Klick auf ein bestehendes Zeichen:** Öffnet den Dialog zum **Bearbeiten** (Ändern von Zeichen, Notiz oder Datum).
    * Nach Auswahl eines Zeichens / Öffnen zum Bearbeiten:
        * Pflichtfeld: `Notiz` (z.B. "Lautes Schwätzen") muss eingegeben werden.
        * Optional: `Datum` kann angepasst werden (Standard: aktuelles Datum).
    * Darstellung in der Zelle (Detail):
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
    * Unter der Beschriftung befindet sich ein **"+" Button** (Ebene 2): Öffnet ein Modal zur schnellen Erfassung der Anwesenheit für die gesamte Gruppe.
    * Unter der Beschriftung befindet sich ein **Auge-Icon (Eye/EyeOff)** (Ebene 3): Dient zum Umschalten zwischen Kompakt- und Detailansicht.

#### Modal zur Anwesenheitserfassung ("+" Button)
* **Inhalt:** Liste aller Schüler des Kurses.
* **Datum:** Datum wählbar (Standard: Aktuelles Datum).
* **Stundenanzahl (Neu):**
    * Dient zur Festlegung, wie viele Stunden die aktuelle Erfassung umfasst.
    * **Schnellauswahl:** Buttons für `1 Std`, `2 Std` und `4 Std`.
    * **Manuelle Eingabe:** Input-Feld für abweichende Werte (z.B. 3 oder 6).
* **Entscheidung pro Schüler:** Klick toggelt zwischen `Anwesend`, `Abwesend` und `Nicht gesetzt`.
* **Speichern:** Erstellt für jeden gesetzten Schüler einen Eintrag mit dem gewählten Datum und der **Stundenanzahl**.

#### Zellen-Darstellung & Toggle-Funktion
* **Zustand "Details ausgeblendet" (Kompaktansicht):**
    * Die Zelle zeigt die aktuelle Anwesenheit in **Prozent**.
    * **Berechnungs-Logik (Stundenbasiert):**
        * `Summe der Stunden (Anwesend) / Summe der Stunden (Gesamt erfasst) * 100`.
        * Beispiel: 1x anwesend (2 Std) und 1x abwesend (1 Std) = `2 / 3 ≈ 67%`.
* **Zustand "Details eingeblendet" (Detailansicht):**
    * Alle Einträge werden chronologisch als Icons (`Check` oder `X`) angezeigt.
    * **Zusatzinfo:** Wenn ein Eintrag mehr als 1 Stunde umfasst, wird die Zahl klein am Icon oder via Badge angezeigt.
    * **Klick auf Icon:** Öffnet einen Dialog zum **Bearbeiten** des Eintrags (Status, Datum, Stundenanzahl ändern).
    * **Hover:** Zeigt das Datum und die Stundenanzahl an.

### Verzweigung E: Meilenstein / Berechnete Note (`calculated`)
* **Konzept:** Diese Spalte dient als "Snapshot" (z.B. Semesternote, Note zum Elternsprechtag). Sie berechnet automatisch einen Vorschlag basierend auf den vorhandenen Noten bis zu einem Stichtag, erlaubt aber ein manuelles Überschreiben durch den Lehrer.
* **Felder (Schritt 2):**
    * Input: `Titel` (z.B. "1. Semester")
    * Datepicker: `Stichtag (Cutoff-Date)` (Alle Noten bis zu diesem Datum fließen ein)
    * Schalter (Toggle): `In Gesamtkalkulation aufnehmen` (Falls dieser Meilenstein selbst wieder in eine Endnote einfließen soll)
    * Schieberegler (Slider): `Einfluss` (0 - 100%)
* **Berechnungs-Logik:**
    * Bildet den gewichteten Mittelwert aller Spalten (wo `calc: true` und `Datum <= Stichtag`).
    * Nutzt den hinterlegten Notenschlüssel des Kurses.
* **Tabellen-Update:** Die Spalte wird farblich hervorgehoben (z.B. `bg-slate-50` und fettere Border), um sie als "Ergebnis-Spalte" zu kennzeichnen.
* **Zellen-Interaktion (Overriding):**
    * Die Zelle zeigt initial den berechneten Wert (z.B. "3").
    * **Klick auf Zelle:** Öffnet ein Menü, in dem der Lehrer die Note manuell anpassen kann ("Pädagogisches Ermessen").
    * **Visualisierung:** Eine manuell geänderte Note wird mit einem kleinen "Pencil-Icon" markiert, um sie vom reinen Rechenwert zu unterscheiden.

## 5. Sticky Summary Column (Live-Trend)
Zusätzlich zu den Meilenstein-Spalten gibt es am rechten Rand der Matrix eine optional einblendbare (sticky) Auswertungsspalte.

### 5.1 Berechnungs-Philosophie: Relative Gewichtung
Die Berechnung des Durchschnitts folgt dem Prinzip der **relativen Gewichtung**. Der Einfluss (`calcFactor`) einer Spalte wird immer im Verhältnis zur Gesamtsumme aller Gewichtungen berechnet.

* **Beispiel:**
    * Leistung A: Gewichtung 100%
    * Leistung B: Gewichtung 100%
    * **Ergebnis:** Beide Leistungen fließen zu jeweils **50%** in die Gesamtnote ein.
* **Vorteil:** Lehrer können Prioritäten (z.B. Schularbeit = 100, Hausübung = 20) direkt zueinander setzen, ohne dass die Summe aller Faktoren manuell auf 100% angepasst werden muss.

* **Funktion:** Zeigt den aktuellen Leistungsstand ("Live-Trend") basierend auf *allen* aktuell gewichteten Noten an.
* **Konfiguration:** Die Sichtbarkeit dieser Spalte kann im Dialog `Ansicht konfigurieren` global für den Kurs ein- oder ausgeschaltet werden.
* **Berechnungs-Logik (Österreichisches Notensystem):**
    * Basis: Gewichteter Mittelwert in Prozent.
    * **Leistungsausschluss:** Spalten vom Typ `Anwesenheit` (`presenceSum`) und `Gruppenzuordnung` (`groupAssignment`) fließen **niemals** in die Berechnung ein.
    * **Notenmapping (Österreichischer Notenschlüssel):**

| Prozent (%) | Österreichische Note | Beschreibung |
| :--- | :--- | :--- |
| **100 – 90 %** | **1 (Sehr gut)** | Die Anforderungen werden in weit über das Wesentliche hinausgehendem Ausmaß erfüllt. |
| **89 – 80 %** | **2 (Gut)** | Die Anforderungen werden in vollem Umfang erfüllt, die Leistung ist überdurchschnittlich. |
| **79 – 65 %** | **3 (Befriedigend)** | Die Leistungen entsprechen im Wesentlichen den Anforderungen. |
| **64 – 50 %** | **4 (Genügend)** | Die Leistungen entsprechen noch den Mindestanforderungen. |
| **Unter 50 %** | **5 (Nicht genügend)** | Die Mindestanforderungen werden nicht erfüllt. |

* **Visualisierung:**
    * Bleibt beim horizontalen Scrollen immer am rechten Rand fixiert (Sticky).
* **Visuelles Feedback:** Ein Klick auf die Zelle in der Summary-Spalte öffnet ein Popover mit einem **Calculation-Breakdown**.

### 5.2 Rundungsregeln
Für alle automatischen Berechnungen (Trend & Meilensteine) kann zwischen zwei Rundungsmodi gewählt werden:

*   **Kaufmännisch (Standard):** Standardmäßige Rundung nach mathematischen Regeln (ab ,5 wird aufgerundet).
*   **Schülerfreundlich:** Der Prozentwert wird **immer auf die nächste ganze Zahl aufgerundet** (`Math.ceil`), um im Zweifelsfall die bessere Note zu ermöglichen (In dubio pro reo).

**Konfiguration:**
*   **Global (Trend):** Über das Info-Icon im Header der ersten Spalte (Schüler) einstellbar.
*   **Individuell (Meilenstein):** Im Bearbeitungs-Dialog der jeweiligen berechneten Spalte festlegbar.

## 6. Spalten-Management & Konfiguration
Im Dialog `Ansicht konfigurieren` oder beim Bearbeiten einer Spalte (`Edit-Icon` in Ebene 2) können folgende Parameter jederzeit angepasst werden:

* **Globaler Trend:** Toggle-Schalter zum Ein-/Ausblenden der Sticky TREND-Spalte.
* **Reihenfolge:** Über `Priority` oder Drag-and-Drop/Pfeil-Buttons verschiebbar.
* **Kalkulations-Status (`calc`):** Ein-/Ausschalten (nur für `manual`, `collaborationSum` und `calculated`).
* **Gewichtung (`calcFactor`):** Definition des Einflusses in Prozent.
* **Sichtbarkeit:** Ausblenden von Spalten, ohne die Daten zu löschen.

---

## 7. Implementierungshinweise & Testing (gemini.md)
* **Testing der Service-Layer:** Um die oben genannte `serviceFirebase` Klasse effektiv zu testen und Seiteneffekte in der Datenbank zu vermeiden, sollten in Jest zwingend `beforeAll` und `afterAll` Hooks implementiert werden. Dies gewährleistet, dass Testdaten (wie Mock-Schüler oder generierte Noten) vor den Testläufen sauber angelegt und im Nachgang wieder restlos aus der Firestore-Testumgebung gelöscht (Clean-up) werden.