# Spezifikation: GUI Leistungsbeurteilung (Firebase Service-Architektur)

## 1. Seitenstruktur & Header
Die Kopfzeile dient der Identifikation der Ansicht, zeigt den aktuellen Kurs an und bietet die primäre Aktion zum Hinzufügen neuer Beurteilungen.

* **Hauptüberschrift (H1):** `Leistungsbeurteilung`
* **Unterüberschrift (H2):** `[Name der Gruppe / Course]`
* **Gruppen-Schnellauswahl:** (Entfernt) Die Gruppen-Schnellauswahl wurde entfernt. Der Wechsel von Gruppen/Kursen erfolgt ausschließlich über die Sidebar/Hauptnavigation.
* **Aktions-Menü (Dropdown):** In der Kopfzeile platziert (Label: `Aktionen`, Icon: `ChevronDown`). Bietet folgende Aktionen:
    * `Beurteilungsspalte hinzufügen` (Icon: `Plus`) - Öffnet das Multi-Step-Modal zum Hinzufügen einer Beurteilungsspalte.
    * `Ansicht konfigurieren` (Icon: `Settings`) - Öffnet das Modal zur Spaltenkonfiguration.
    * `Gruppe ändern` (Icon: `Users`) - Öffnet das `EnrollmentModal` zur Schüler-Zuweisung, um Schüler der Gruppe hinzuzufügen, zu entfernen oder neu zu reihen.
    * `PDF Export` (Icon: `FileDown`) - Öffnet das Modal zur Spaltenauswahl für den PDF-Export der Gesamtmatrix.

## 2. Datenanbindung & Architektur
* **Backend:** Firebase Firestore (Collections: `courses`, `students`, `course_entries`, `grades`).
* **Service-Layer:** Die GUI kommuniziert **nicht direkt** mit Firebase, sondern ausschließlich über die erweiterte Service-Klasse (z.B. `serviceFirebase`).
* **Architektur-Vorgabe (WICHTIG):** Vor der Implementierung dieser GUI müssen das Daten-Schema und die Service-Klasse zwingend überprüft und so umgebaut/ergänzt werden, dass sie alle unten beschriebenen Entitäten (Courses, Course Entries mit den verschiedenen Typen, Grades mit Historie/Mehrfacheinträgen) vollumfänglich unterstützen.

## 3. Daten-Tabelle (Notenübersicht)
Anzeige der Leistungsmatrix für die gewählte Gruppe.

* **Design-Vorgabe (Platzersparnis):** Um bei vielen Beurteilungen und Schülerzeilen Platz zu sparen, müssen alle **Spaltenüberschriften senkrecht** dargestellt werden. Technisch soll dies via `writing-mode: vertical-rl; transform: rotate(180deg);` realisiert werden, um eine saubere Baseline-Ausrichtung am unteren Rand zu gewährleisten. Zudem wird die Zeilenhöhe der Tabelle durch kompaktes Padding optimiert (Schülerspalte-Padding reduziert auf `4px 12px` und Datenzellen auf `4px 8px`), während die Schriftgröße bei gut lesbaren `14px` verbleibt. Das Main-Content Layout-Padding wird von `40px` auf `24px` verringert und die Matrix-Scroll-Area erhält mehr maximale Höhe (`calc(100vh - 160px)`), damit mehr Zeilen gleichzeitig ohne Scrollen sichtbar sind. Das Aktionsmenü (Drei-Punkte) wird fix im Header platziert.
* **Design-Vorgabe (Spaltenbreite):** Die Spalte für die Gruppenzuordnung muss exakt die gleiche schmale Breite aufweisen wie die Beurteilungsspalten für manuelle Vergabe von Noten oder Zeichen.
* **UX-Vorgabe (Scrollbalken-Verbot):** Es darf **unter keinen Umständen** vorkommen, dass beim Öffnen von Kontextmenüs oder Modals innerhalb der Matrix rechtsseitige Scrollbalken am Matrix-Fenster erscheinen. Die Menüs müssen so aufgebaut sein, dass sie außerhalb des Tabellenflusses (z.B. via Portals oder intelligenter Positionierung) schweben.
* **UX-Vorgabe (Crosshair-Highlighting):** Um die Navigation in großen Tabellen zu erleichtern, muss ein "Crosshair"-Effekt implementiert werden: Beim Hover über eine Zelle sollen sowohl die gesamte Zeile als auch die dazugehörige Spalte dezent visuell hervorgehoben werden.
* **Zeilen (Schüler-Zelle & Layout):** Entsprechen den Schülern des Kurses. Die Schüler-Spalte ist wie folgt aufgebaut:
    * **Laufende Nummer:** Ganz links steht eine 1-basierte laufende Nummer (1, 2, 3, etc.).
    * **Name & Ausrichtung:** Es folgt der Nachname (in **Fettschrift**) und anschließend der Vorname. Nachname und Vorname stehen sauber in Spalten untereinander, ausgerichtet an derselben vertikalen Kante (Fluchtlinie des ersten Buchstabens).
    * **Profilbild-Vorschau (Hover):** Wenn ein Schüler ein Profilbild hinterlegt hat, öffnet sich beim Fahren über den Namen ein eleganter Tooltip mit der Bildvorschau rechts neben der Zelle (mit sanfter Skalierungs- und Einblendanimation). Um ein Abschneiden des Tooltips am unteren Rand der Tabelle (insbesondere beim letzten Schüler) zu verhindern, wird die Unterkante des Tooltips bündig zur Unterkante der Zelle ausgerichtet (nach oben hin ausdehnend).
    * Die Spalte bleibt beim horizontalen Scrollen fixiert (Sticky).
* **Spalten:** Entsprechen den definierten Beurteilungen (`course entries`). Das Datum der Beurteilung muss in der Kopfzeile im Format `DD.MM.YY` angezeigt werden (sofern die Anzeige aktiviert ist).
* **Zellen (Schnittpunkt):** Hier wird die jeweilige Note/Bewertung (`grade`) eingetragen und angezeigt. Leere Zellen ("Empty State") sollen mit einem sehr dezenten/hellen Grau (z.B. ein helles Minus-Zeichen) dargestellt werden, um visuelle Unruhe zu vermeiden. Auch bei Hover-Effekten (Tooltips) für Einzeleinträge (z.B. Mitarbeit oder Anwesenheit) soll das Datum einheitlich im Format `DD.MM.YY` erscheinen.

## 4. Dialog-Fenster (Modals): Spalte hinzufügen
Dieser Dialog führt den Benutzer über mehrere Seiten/Schritte (Multi-Step-Modal), um einen neuen `Course Entry` anzulegen.

**WICHTIGER UI-HINWEIS:** Es dürfen keine Browser-nativen Funktionen wie `alert()` oder `confirm()` verwendet werden. Alle Bestätigungen (z.B. beim Löschen) oder Fehlermeldungen müssen über App-interne, elegante Dialog-Fenster (Modals) realisiert werden.

### Schritt 1: Typ-Auswahl
* **Auslöser:** Klick auf den Button `Beurteilungsspalte hinzufügen`.
* **Feld:** Radio-Button-Gruppe zur Auswahl des Beurteilungstyps:
    * `Gruppenzuordnung` (type: `groupAssignment`)
    * `Manueller Name` (type: `manual`)
    * `Mitarbeit` (type: `collaborationSum`)
    * `Anwesenheit` (type: `presenceSum`)
    * `Meilenstein` (type: `calculated`)
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
    * **Keyboard-Navigation:** Mit den Pfeiltasten `ArrowUp` und `ArrowDown` (oder `Enter`) kann der Fokus direkt von Zelle zu Zelle in der Spalte nach oben oder unten navigiert werden, um eine flüssige Bearbeitung aller Schüler zu ermöglichen.

### Verzweigung B: Manueller Name (`manual`)
* **Felder (Schritt 2):**
    * Input: `Name` (z.B. "1. Test WW" = title)
    * Datepicker: `Datum`
    * Radio-Buttons (Berechnungstyp): `Prozent` (percent), `Note` (grade) oder `Zeichen` (sign)
    * Schalter (Toggle): `In Berechnung aufnehmen` (EIN/AUS)
    * Schieberegler (Slider): `Einfluss` (0 - 100%)
* **Aktion:** `Speichern` beendet den Dialog.
* **Tabellen-Update:** Neue Spalte mit dem eingegebenen Namen.
* **Zellen-Interaktion (Klick öffnet Modal):**
    * Bei Klick auf eine Zelle vom Typ `manual` oder zur manuellen Überschreibung bei `calculated` öffnet sich ein zentriertes Modal (`ManualEntryModal`) in der Mitte des Bildschirms.
    * Das Modal zeigt den Namen des Schülers sowie den Titel der Spalte.
    * **Beurteilungstyp "Note" (`grade`):**
        * Anzeige von fünf großen Buttons untereinander mit der Bezeichnung:
            * "1-Sehr gut"
            * "2-Gut"
            * "3-Befriedigend"
            * "4-Genügend"
            * "5-Nicht Genügend"
        * Der aktuell ausgewählte Wert ist visuell hervorgehoben.
    * **Beurteilungstyp "Prozent" (`percent`):**
        * Bietet einen Schieberegler (Slider, 0 - 100%) und eine Direkteingabe (Number-Input) nebeneinander.
        * Beide Eingabemöglichkeiten sind synchronisiert. Der Wert der Direkteingabe wird auf den Bereich 0 - 100 beschränkt.
    * **Beurteilungstyp "Zeichen" (`sign`):**
        * Anzeige von drei großen, sauberen Symbolen (`+`, `~`, `-`) als Schaltflächen.
    * Das Modal enthält zusätzlich:
        * Einen Button "Eintrag löschen" (oder ähnlich), um den aktuellen Wert zu entfernen.
        * Eine "Abbrechen" (Stil: Sekundär) Schaltfläche im Footer (keine globale "Speichern" Schaltfläche).
        * **Sofortiges Speichern und Schließen:**
            * Bei Auswahl einer Note oder eines Zeichens wird der Wert sofort gespeichert und das Modal schließt sich.
            * Bei Prozenten wird das Modal geschlossen und der Wert gespeichert, sobald der Schieberegler losgelassen wird (MouseUp/TouchEnd) oder die Eingabe im Textfeld bestätigt wird (durch Drücken der Enter-Taste oder Klick auf ein Bestätigungssymbol neben der Eingabe).
* **Schnelleingabe über Tastatur (Hover):**
    * Wenn der Mauszeiger über einer Zelle vom Typ `manual` (bzw. `calculated` bei Noten) schwebt und keine anderen Eingabefelder aktiv sind:
        * **Bei Typ `grade`:** Durch Drücken einer der Tasten `1` bis `5` wird die entsprechende Note (`1` bis `5`) direkt in der Zelle eingetragen und gespeichert (ohne das Modal zu öffnen).
        * **Bei Typ `sign`:**
            * Drücken der Taste `1` trägt das Zeichen `+` ein.
            * Drücken der Taste `2` trägt das Zeichen `~` ein.
            * Drücken der Taste `3` trägt das Zeichen `-` ein.


### Verzweigung C: Mitarbeit (`collaborationSum`)
* **Konzept:** Systematische Erfassung von Stundenleistungen. In der Kompaktansicht wird der Prozentwert angezeigt.
* **Spalten-Kopfzeile Interaktionen:**
    * Im Tabellenkopf für die Mitarbeit wird kein Datum angezeigt.
    * Unter der Beschriftung befindet sich ein **"+" Button** (Ebene 2): Öffnet ein Modal zur Mitarbeit-Schnellerfassung für die gesamte Gruppe.
    * Unter der Beschriftung befindet sich ein **Auge-Icon (Eye/EyeOff)** (Ebene 3): Dient zum Umschalten zwischen Kompakt- und Detailansicht.

#### Modal zur Mitarbeit-Schnellerfassung ("+" Button)
* **Inhalt:** Liste aller Schüler des Kurses.
* **Interaktion:**
    * Pro Schüler: Auswahl zwischen `+`, `~`, `-` oder `Kein Eintrag` (unset).
    * Globales Pflichtfeld: `Notiz` (wird als Standard für alle gewählten Einträge übernommen).
    * Datumsauswahl: Standard: Aktuelles Datum.
* **Aktionen:** `Speichern` oder `Abbrechen`.

* **Massen-Erfassung:** Über das `Plus-Icon` im Header kann weiterhin für die gesamte Klasse gleichzeitig eine Note (z.B. für eine bestimmte Stunde) vergeben werden.

* **Spalten-Breite (Dynamisch):**
    * Im **Kompaktmodus** (Details aus): Die Spalte ist **identisch schmal** wie die manuellen Beurteilungsspalten (ca. 100px).
    * Im **Detailmodus** (Details ein): Die Spalte vergrößert sich automatisch, um alle Icons nebeneinander anzuzeigen (ca. 180px).
* **Spalten-Kopfzeile Interaktionen:**
    * Unter der Beschriftung befindet sich ein **Auge-Icon (Eye/EyeOff)** (Ebene 3): Dient zum Umschalten zwischen Kompakt- und Detailansicht.
* **Zustand "Details ausgeblendet" (Kompaktansicht):**
    * Die Zelle zeigt eine zusammenfassende **Prozentanzeige** (z.B. `75%`) und direkt daneben einen **"+" Button** (PlusCircle-Icon), um auch in der Kompaktansicht schnell eine neue Mitarbeitsaufzeichnung hinzuzufügen.
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
    * **Mitarbeits-Popup (CollaborationEntryModal):** Klick auf ein bestehendes Zeichen oder den Plus-Button öffnet das Formular.
        * **Zentrierte Ausrichtung:** Das Fenster öffnet sich immer im Zentrum des Bildschirms (als modales Overlay mit abgedunkeltem Hintergrund), um ein Abschneiden am Bildschirmrand (insbesondere bei Schülern am Tabellenende) zu verhindern.
        * **Schnellauswahl für Kommentare (Zweispaltiges Layout):** Das Modal is vergrößert. Links befinden sich die Standard-Eingabefelder (Zeichen-Auswahl, manuelle Notiz, Datum). Rechts wird eine Liste der in den Einstellungen hinterlegten vorgefertigten Kommentare für das selektierte Zeichen (+, ~, oder -) angezeigt. Ein Klick auf einen vorgefertigten Kommentar übernimmt den Text direkt in das Notizfeld. **Ein Doppelklick auf einen vorgefertigten Kommentar** übernimmt den Text und führt sofort das Speichern (OK) aus, wodurch das Modal direkt geschlossen wird.
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
* **Zweistufiger Ablauf (Verpflichtende Voreinstellung):** Vor der Eingabe der Anwesenheiten wird ein vorgeschalteter Dialog eingeblendet, der den Benutzer zwingt, zuerst das Datum und die Anzahl der Unterrichtsstunden festzulegen, um diese nicht zu übersehen.
    * **Datum:** Datum wählbar (Standard: Aktuelles Datum).
    * **Stundenanzahl:** Festlegung der Unterrichtsstunden. Schnellauswahl (`1 Std`, `2 Std`, `4 Std`) sowie manuelle Eingabe werden angeboten.
* **Erfassungs-Schritt:** Nach der Voreinstellung gelangt der Benutzer zur eigentlichen Liste aller Schüler des Kurses.
    * **Entscheidung pro Schüler:** Klick toggelt zwischen `Anwesend`, `Abwesend` und `Nicht gesetzt`.
    * **Speichern:** Erstellt für jeden gesetzten Schüler einen Eintrag mit dem zuvor festgelegten Datum und der Stundenanzahl.

#### Zellen-Darstellung & Toggle-Funktion
* **Zustand "Details ausgeblendet" (Kompaktansicht):**
    * Die Zelle zeigt die aktuelle Anwesenheit in **Prozent**.
    * **Berechnungs-Logik (Stundenbasiert):**
        * `Summe der Stunden (Anwesend) / Summe der Stunden (Gesamt erfasst) * 100`.
        * Beispiel: 1x anwesend (2 Std) und 1x abwesend (1 Std) = `2 / 3 ≈ 67%`.
* **Zustand "Details eingeblendet" (Detailansicht):**
    * Alle Einträge werden chronologisch als Icons (`Check` oder `X`) angezeigt. Die Symbole sind leicht vergrößert (16px) dargestellt, um die Lesbarkeit und Interaktivität zu verbessern.
    * **Zusatzinfo:** Wenn ein Eintrag mehr als 1 Stunde umfasst, wird die Zahl klein am Icon oder via Badge angezeigt.
    * **Klick auf Icon:** Öffnet einen Dialog zum **Bearbeiten** des Eintrags (Status, Datum, Stundenanzahl ändern).
    * **Automatisches Stunden-Update bei gleichem Datum:** Wenn bei der Bearbeitung eines Eintrags die Anzahl der Stunden (z.B. von 2 auf 4) geändert wird, wird diese Stundenanzahl automatisch für **alle** Anwesenheitseinträge des Kurses an genau diesem Datum übernommen. Der Anwesenheitsstatus (Anwesend/Abwesend) der anderen Schüler bleibt unverändert.
    * **Automatisches Löschen bei gleichem Datum:** Wird ein Anwesenheitseintrag für einen Schüler an einem bestimmten Datum gelöscht, so wird dieser Eintrag (das Datum) automatisch für **alle** Schüler des Kurses gelöscht.
    * **Interaktives Hover-Verhalten:** Bei einem Maushover über eine Anwesenheitskarte (Eintrag) eines Schülers werden alle Anwesenheitseinträge **aller** Schüler am exakt selben Datum mit einem kleinen, feinen und schwachen Rahmen hervorgehoben. Ein Klick bearbeitet weiterhin nur den jeweiligen Einzeleintrag.
    * **Hover (Tooltip):** Zeigt das Datum und die Stundenanzahl an.

### Verzweigung E: Meilenstein / Berechnete Note (`calculated`)
* **Konzept:** Diese Spalte dient als "Snapshot" (z.B. Semesternote, Note zum Elternsprechtag). Sie berechnet automatisch einen Vorschlag basierend auf den vorhandenen Noten bis zu einem Stichtag, erlaubt aber ein manuelles Überschreiben durch den Lehrer.
* **Besonderheit:** Meilensteine fließen **niemals** in die Berechnung des globalen Trends oder anderer Meilensteine ein. Sie dienen rein der Dokumentation eines Zwischenstandes.
* **Felder (Schritt 2):**
    * Input: `Titel` (z.B. "1. Semester")
    * Datepicker: `Stichtag (Cutoff-Date)` (Alle Noten bis zu diesem Datum fließen ein)
* **Berechnungs-Logik:**
    * Bildet den gewichteten Mittelwert aller Spalten (wo `calc: true` und `Datum <= Stichtag`).
    * Nutzt den hinterlegten Notenschlüssel des Kurses.
* **Tabellen-Update:** Die Spalte wird farblich hervorgehoben (z.B. `bg-slate-50` und fettere Border), um sie als "Ergebnis-Spalte" zu kennzeichnen.
* **Zellen-Interaktion (Overriding):**
    * Die Zelle zeigt initial den berechneten Wert (z.B. "3").
    * **Klick auf Zelle:** Öffnet ein Menü, in dem der Lehrer die Note manuell anpassen kann ("Pädagogisches Ermessen").
    * **Visualisierung:** Eine manuell geänderte Note wird mit einem kleinen "Pencil-Icon" markiert, um sie vom reinen Rechenwert zu unterscheiden. **Zusätzlich** erhält eine manuell überschriebene Zelle eine auffällige, dezente farbliche Markierung (z. B. einen warmen, leicht gelblichen/orangefarbenen Hintergrund), um sie sofort visuell von automatisch berechneten Werten abzuheben.

## 5. Sticky Summary Column (Live-Trend)

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
    * **Leistungsausschluss:** Spalten vom Typ `Anwesenheit` (`presenceSum`), `Gruppenzuordnung` (`groupAssignment`) und `Meilenstein` (`calculated`) fließen **niemals** in die Berechnung ein.
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
    * Falls in der Trend-Konfiguration der Farbmodus (Heatmap) aktiviert ist, wird die Zelle basierend auf der berechneten Note (1 = Dunkelgrün, 2 = Hellgrün, 3 = Weiß, 4 = Leicht rot, 5 = Dunkelrot) eingefärbt.
* **Visuelles Feedback:** Ein Klick auf die Zelle in der Summary-Spalte öffnet unaufdringlich einen Calculation Breakdown.

### 5.2 Rundungsregeln
Für alle automatischen Berechnungen (Trend & Meilensteine) gilt eine **zentrale Rundungsregel**, die global für den Kurs festgelegt wird.

*   **Kaufmännisch (Standard):** Standardmäßige Rundung nach mathematischen Regeln (ab ,5 wird aufgerundet).
*   **Schülerfreundlich:** Der Prozentwert wird **immer auf die nächste ganze Zahl aufgerundet** (`Math.ceil`), um im Zweifelsfall die bessere Note zu ermöglichen (In dubio pro reo).

**Konfiguration:**
Die Rundungsregel wird direkt im Einstellungsmodal der Trend-Spalte konfiguriert und gilt konsistent für den Live-Trend sowie alle Meilenstein-Vorschläge.

### 5.3 TREND-Konfiguration (Zentrales Gewichtungs-Menü)
Die TREND-Spalte verfügt über ein eigenes Konfigurations-Menü (erreichbar über das Bearbeitungs-Icon im Header).
Die detaillierte Benutzeroberfläche und Funktionsweise (inklusive Gewichtungsfixierung und Layout) ist im eigenen Pflichtenheft [Spezifikation: Trend-Konfiguration](file:///c:/Users/user/Documents/chronograde/docs/gui/grades-matrix/trend-settings.md) beschrieben.

## 6. Spalten-Management & Konfiguration
Im Dialog `Ansicht konfigurieren` oder beim Bearbeiten einer Spalte (`Edit-Icon` in Ebene 2) können folgende Parameter jederzeit angepasst werden:

* **Globaler Trend:** Toggle-Schalter zum Ein-/Ausblenden der Sticky TREND-Spalte.
* **Reihenfolge:** Über `Priority` oder Drag-and-Drop/Pfeil-Buttons verschiebbar.
* **Kalkulations-Status (`calc`):** Ein-/Ausschalten (nur für `manual` und `collaborationSum`).
* **Gewichtung (`calcFactor`):** Definition des Einflusses in Prozent.
* **Sichtbarkeit:** Ausblenden von Spalten, ohne die Daten zu löschen.

## 7. PDF-Export (Option A - Vektor-Export)
Dieses Feature ermöglicht den Export der gesamten Notenmatrix sowie einzelner Schüler-Datenblätter als hochwertige, druckfertige PDF-Dokumente im Vektorformat via `@react-pdf/renderer`.

### 7.1 Gesamt-Matrix PDF-Export
* **Aktion:** Ein Klick auf den Button `PDF Export` (mit Datei-Icon, Stil: Sekundär) in der Kopfzeile der Matrix.
* **Interaktion (Vorauswahl-Dialog):** Vor der PDF-Generierung öffnet sich ein elegantes Modal-Dialogfenster ("Spalten für PDF-Export auswählen"). 
    * Im Dialog werden alle existierenden Beurteilungsspalten des Kurses (sowohl aktuell in der GUI sichtbare als auch ausgeblendete Spalten) als Liste mit Checkboxen angezeigt.
    * Die Checkboxen sind standardmäßig mit dem aktuellen Sichtbarkeitsstatus der Spalten in der Matrix vorselektiert.
    * Falls die Trend-Spalte im Kurs aktiv ist, wird eine separate Option angeboten, um den **Gesamt-Trend** im PDF ein- oder auszublenden.
    * Es gibt Schnellwahl-Aktionen wie "Alle auswählen" und "Auswahl aufheben".
    * Der Benutzer bestätigt mit dem Button "PDF generieren" (Stil: Primär) oder bricht die Aktion ab.
* **Layout:** Querformat A4.
* **Inhalt:**
    * Briefkopf mit dem Kursnamen, Schuljahr und Datum des Exports. Es werden **keine** Angaben zur Klasse oder Lehrperson aufgedruckt.
    * Eine saubere, skalierte Tabelle aller aktiven Schüler und der **ausgewählten** Beurteilungsspalten.
    * Die Tabelle verwendet zur visuellen Strukturierung ein **Streifenmuster (Zebra-Striping)** mit abwechselnden Hintergrundfarben für die Zeilen.
    * Enthält auch die berechneten Noten/Prozentwerte und die Meilensteine sowie optional die Trend-Spalte (sofern im Auswahldialog ausgewählt).
    * Kopfzeilen-Texte der Matrix-Spalten werden zur Platzersparnis geneigt oder kompakt dargestellt.

### 7.2 Große modale Anzeige der Schülerleistungen & Detail-Dashboard
* **Aktion:** Ein Klick auf ein Analyse-Icon (TrendingUp/LineChart-Symbol, Stil: Sekundär-Icon) in der Schülerzeile (rechts neben dem Vornamen des Schülers in der Spalte `SCHÜLER`) öffnet eine große, zentrierte Overlay-Ansicht (Modal) mit den detaillierten Leistungen des Schülers.
* **Layout:** Großes modales Fenster (Breite: 95vw, Höhe: 90vh, abgerundete Ecken) mit einem abgedunkelten Backdrop, so dass die Notenmatrix im Hintergrund dezent sichtbar bleibt. Das Fenster gliedert sich in:
    * **Header:** Vorname und Nachname des Schülers, Profilbild (falls vorhanden) sowie Kursname, Schuljahr und Steuerelemente (PDF-Export, Schließen).
    * **Zweispaltiges Layout im Body (dashboard-body ohne Scrollbalken, Diagramm permanent sichtbar):**
        * **Linke Spalte (ca. 2/3 Breite):** Interaktives SVG-basiertes Liniendiagramm zur Visualisierung des Noten-Trends, permanent und vollständig sichtbar (kein Scrollen links).
        * **Rechte Spalte (ca. 1/3 Breite):** Vertikal scrollbare Leiste (`overflow-y: auto`), die alle Informationskarten untereinander stapelt:
            1. **Gesamttrend (Live):** Aktuelle Note mit einem umgekehrten, farbsegmentierten Notenstrahl (von links 1 bis rechts 5) und einer floating Prozent-Nadel (Markerl), die bei Mouse-Hover die Tendenzdetails und "Puzzelstücke" (Verbesserungsvorschläge) als Modal-Overlay einblendet.
            2. **Mitarbeit-Zusammenfassung:** Verteilung der Mitarbeitseinträge (+, ~, -).
            3. **Anwesenheits-Zusammenfassung:** Prozentuale Anwesenheitsquote und Stundenanzahl.
            4. **Meilensteine:** Berechnete Noten für definierte Zwischenstände.
            5. **Detaillierter Verlauf (Timeline Card):** Eine Karte ganz unten in der Scrollliste, in der alle erfassten Einzelleistungen chronologisch aufgeschlüsselt sind, mit Angabe des Ergebnisses, Kommentaren/Einzelleistungen und des jeweiligen Einrechnungsfaktors.
    * **Scrollverhalten:** Der Hauptbereich (`dashboard-body`) selbst ist nicht scrollbar (`overflow: hidden`), während die rechte Spalte eine eigene vertikale Scrollleiste besitzt. So bleibt das große Diagramm links immer vollflächig sichtbar.
* **Inhalt:**
    * **Header:** Vorname und Nachname des Schülers, Profilbild (falls vorhanden) sowie Kursname, Schuljahr. Ein Button zum Generieren des PDF-Einzelberichts (Datenblatt) ist im Header platziert.
    * **Zusammenfassung (Summary):** Anzeige des aktuellen berechneten Live-Trends (Note und Prozentwert), der Meilensteine (berechnete Noten) sowie Statistiken. **Wichtig:** Die Anwesenheitsquote ist eine rein informative Statistik und darf zu keinem Zeitpunkt in die Notenberechnung einfließen.
    * **PDF-Notenzusammensetzung (BVwG-konform & laienverständlich):** Der PDF-Ausdruck (Leistungsdatenblatt) enthält eine übersichtliche Tabelle zur Notenermittlung:
        - **Spalten:** Beurteilungsbereich (Prüfung/Mitarbeit), Gewichtung (Wie viel zählt es?), Erreichte Leistung, Anteil an der Gesamtnote.
        - **Einfache Formel:** Der Anteil an der Gesamtnote je Zeile ist das Ergebnis einer einfachen Multiplikation ($\text{Anteil} = \text{Leistung} \times \text{Gewichtung}$). Die Summe aller Anteile ergibt das Gesamtergebnis.
        - **Erklärungstext (Berechnungshilfe):** Unter der Tabelle wird ein verständlicher, anschaulicher Hilfetext gedruckt, der das Rechenschema erklärt.
        - **Notenschlüssel:** Ein kompakter Kasten weist den österreichischen Notenschlüssel (Prozentgrenzen für Sehr gut bis Nicht genügend) aus, damit die Notenfindung direkt nachvollzogen werden kann.
        - **Rechtliche Konformität:** Diese einfache Darstellung ist für Schüler und Eltern ohne mathematische Vorkenntnisse sofort nachprüfbar und erfüllt damit die Vorgaben des Bundesverwaltungsgerichts an eine transparente Leistungsbeurteilung.
    * **Leistungsverlauf (Visualisierung):** Ein sauber gestaltetes, interaktives SVG-basiertes Liniendiagramm, das den chronologischen Verlauf der Noten (1 bis 5, wobei 1 oben steht) des Schülers im Kurs darstellt.
        * **Chronologische Berechnung:** Hängt vom eingestellten Mitarbeits-Berechnungsmodus ab. Bei "Als gesamte Mitarbeitsnote am Schluss einrechnen" (Standard) fließt immer das Gesamtergebnis der Mitarbeit ungefiltert in jeden berechneten Trendwert ein. Bei "Linear mit der Zeit in den Trend einrechnen" (nur bei Bedarf) werden für jeden Trendpunkt auch die Mitarbeitseinträge chronologisch gefiltert.
        * **Mitarbeit-Einzeleinträge:** Bei "Linear mit der Zeit in den Trend einrechnen" erzeugt jeder einzelne erfasste Mitarbeitseintrag (+, ~, -) einen eigenen zeitlichen Datenpunkt auf der Verlaufskurve. Im Standardmodus ("Als gesamte Mitarbeitsnote am Schluss einrechnen") werden keine separaten Mitarbeits-Punkte auf der Verlaufskurve gezeichnet.
        * **Farbliche Markierung:** Die einzelnen Trendpunkte (Datenpunkte) auf der Verlaufslinie sind farblich passend zu der berechneten Note an diesem Stichtag markiert (Note 1 & 2 in Grüntönen, Note 3 in Blau, Note 4 in Orange und Note 5 in Rot).
        * **Direkte Beschriftung:** Die berechnete Note wird direkt über jedem Kurvenpunkt als Zahl (1-5) gerendert. Unterhalb der X-Achsenlinie wird der jeweilige Leistungs- oder Mitarbeitstitel (z. B. "SA 1", "Mitarbeit (+)") gedreht dargestellt, um Überlappungen zu vermeiden.
    * **Detaillierter Verlauf (Chronologische Liste):** Eine tabellarische oder Feed-basierte Auflistung aller erfassten Noten, Zeichen, Mitarbeitseinträge und Anwesenheiten des Schülers im Kurs, sortiert nach Datum (absteigend), inklusive zugehöriger Kommentare/Notizen.

---

## 8. Implementierungshinweise & Testing (gemini.md)
* **Testing der Service-Layer:** Um die oben genannte `serviceFirebase` Klasse effektiv zu testen und Seiteneffekte in der Datenbank zu vermeiden, sollten in Jest zwingend `beforeAll` und `afterAll` Hooks implementiert werden. Dies gewährleistet, dass Testdaten (wie Mock-Schüler oder generierte Noten) vor den Testläufen sauber angelegt und im Nachgang wieder restlos aus der Firestore-Testumgebung gelöscht (Clean-up) werden.
