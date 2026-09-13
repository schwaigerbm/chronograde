# Spezifikation: Fehlzeiten-Auffälligkeiten & Terminkalender / Terminliste (`RemindersWidget`)

## 1. Übersicht & Ziel
Dieses Feature dient dazu, auffällige Abwesenheiten von Schülern nach der Anwesenheitserfassung durch eine einfache Rückfrage als Termin mit Fälligkeitsdatum zu erfassen und alle Termine (Tests, Abgaben, Fehlzeiten-Abklärungen, Notizen) in einem sauberen **Terminkalender mit strukturierter Terminliste** auf der Startseite übersichtlich darzustellen.

---

## 2. Fehlzeiten-Auffälligkeiten & Einfache Rückfrage

### 2.1 Kursspezifische Konfiguration (Einstellungen der Beurteilungsgruppe)
In den Einstellungen der jeweiligen Beurteilungsgruppe (Kurs) können Fehlzeiten-Abklärungen konfiguriert werden:
* **Haupt-Schalter:** „Fehlzeiten-Abklärungen aktivieren“ (An / Aus).
* **Regeln:**
  1. **2x in Folge gefehlt:** Die letzten beiden chronologischen Einträge sind abwesend ('x').
  2. **2x gefehlt in den letzten 3 Terminen:** Mindestens zwei der letzten drei Termine sind abwesend ('x').
  3. **3x gefehlt in den letzten 5 Terminen:** Mindestens drei der letzten fünf Termine sind abwesend ('x').

### 2.2 Einfache Rückfrage (Auffälligkeits-Dialog bei der Anwesenheitserfassung)
Wird beim Speichern der Anwesenheit eine aktive Auffälligkeit erkannt, öffnet sich ein einfaches Bestätigungs-Modal:
* **Präzise Frage:** „Für den Schüler **[Nachname], [Vorname]** liegt eine Auffälligkeit vor (*[Name der Regel]*). Soll ein Abklärungstermin in der Terminliste eingetragen werden?“
* **Fälligkeitsdatum:** Ein Datumsfeld zur Auswahl des gewünschten Stichtags (Datepicker, Standard: nächster Tag / morgiges Datum).
* **Aktionen:** 
  * **„Ja, Termin eintragen“ (Primär):** Erstellt den Abklärungstermin mit dem ausgewählten Fälligkeitsdatum und fährt mit der nächsten Auffälligkeit bzw. dem Abschluss fort.
  * **„Nein, überspringen“ (Sekundär):** Überspringt die Terminerstellung für diesen Schüler ohne Eintrag.

---

## 3. Terminkalender & Saubere Terminliste auf der Startseite (`RemindersWidget`)

Auf der **Start**-Seite wird das Modul als kombinierter **Terminkalender mit strukturierter Terminliste** dargestellt.

### 3.1 Layout & Abstände
* **Top-Padding:** Über der Hauptüberschrift „Terminkalender & Aufgaben“ befinden sich zusätzlich 15px Abstand (Padding nach oben).
* **Bottom-Spacing:** Unterhalb des Kalender-Grids (zwischen Kalenderende und den Darstellungs-Cards darunter/daneben) ist ein definierter Abstand eingerichtet.
* **Header-Button „+ Neuer Termin“:** Der Button „+ Neuer Termin“ ist kompakt und klein (analog zu den Aktions-Buttons der Notenmatrix) und **rechtsbündig** platziert.

### 3.2 Terminkalender-Ansicht (Kalender-Grid)
* **Monats- & Wochenübersicht:** Ein interaktives Kalender-Grid des aktuellen Monats.
* **Tages-Markierungen:** Tage mit fälligen Terminen werden durch kleine farbige Indikator-Punkte oder farbige Tages-Badges hervorgehoben (Farbe entspricht der Kategorie-Farbe).
* **Aktueller Tag:** Der heutige Tag wird optisch markiert (z. B. primärblauer Kreis um das Datum).
* **Klick-Interaktion & Vorauswahl:** Klick auf einen Kalendertag filtert die Terminliste auf die an diesem Tag fälligen Termine. Wird bei aktivem Tagesfilter der Button „+ Neuer Termin“ gedrückt, wird dieses angeklickte Datum im Modal automatisch als Fälligkeitsdatum vorausgewählt.

---

## 4. Manuelle Terminerstellung & Bearbeitung (`AddReminderModal`)
* **Felder:**
  * **Titel:** Bezeichnung des Termins.
  * **Notiz / Beschreibung:** Mehrzeiliges Textfeld für detaillierte Anmerkungen.
  * **Kategorie / Typ:** Vollständige Auswahl aus **allen** in den Einstellungen angelegten Kategorien (Tests, Abgaben, Notizen, Fehlzeiten sowie allen benutzerdefinierten Kategorien) inklusive deren spezifischen Farben und Icons.
  * **Kurs & Zielgruppe:** Gesamte Gruppe oder einzelner Schüler.
  * **Fälligkeitsdatum & Uhrzeit:** Exaktes Stichtagsdatum (`YYYY-MM-DD`, Anzeige: `[Wochentag] DD.MM.YYYY`, automatische Vorauswahl des im Kalender angeklickten Tages) und Uhrzeit.
  * **Akzentfarbe & Icon:** Automatische Übernahme der Standardfarbe der gewählten Kategorie oder individuelle Anpassung.
