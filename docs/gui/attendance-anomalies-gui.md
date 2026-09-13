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
* **Header-Button „+ Neuer Termin“:** Der Button „+ Neuer Termin“ ist schmäler/kompakt gestaltet und **rechtsbündig** in der Header-Zeile platziert.

### 3.2 Terminkalender-Ansicht (Kalender-Grid)
* **Monats- & Wochenübersicht:** Ein interaktives Kalender-Grid des aktuellen Monats.
* **Tages-Markierungen:** Tage mit fälligen Terminen werden durch kleine farbige Indikator-Punkte oder farbige Tages-Badges hervorgehoben (Farbe entspricht der Kategorie-Farbe).
* **Aktueller Tag:** Der heutige Tag wird optisch markiert (z. B. primärblauer Kreis um das Datum).
* **Klick-Interaktion:** Klick auf einen Kalendertag filtert die Terminliste auf die an diesem Tag fälligen Termine.

### 3.3 Saubere Terminliste & Filter
* **Status-Filter („Erledigt“ / „Nicht erledigt“):** Eigene Schnellfilter-Schaltflächen zur Trennung von unerledigten und bereits abgehakten Terminen, um die Liste stets übersichtlich zu halten (`Alle Status`, `Offen / Nicht erledigt`, `Erledigt`).
* **Kategorie-Filter:** Dynamische Filter-Pills basierend auf den in den Einstellungen verwalteten Kategorien (`Alle`, `📝 Tests`, `📁 Abgaben`, `⚠️ Fehlzeiten`, `📌 Notizen` sowie benutzerdefinierte Kategorien).
* **Suchfeld:** Live-Suchfeld zur Filterung nach Titel, Kurs, Schüler oder Notiz-Text.

### 3.4 Termin-Karten (Einträge)
* **Kategorie-Badge & Datumsanzeige mit Wochentag:** 
  * Direkt nach dem Kategorie-Badge wird das Fälligkeitsdatum **inklusive Wochentag und voller Datumsangabe** im Format `[Wochentag] DD.MM.YYYY` gerendert (z. B. `Mittwoch 21.05.2026`).
* **Notiz- & Beschreibungstext (Mehrzeilig):**
  * Jeder Termin verfügt über ein optionales, mehrzeiliges Notizfeld (`description` / `note`), in dem ausführliche Informationen eingegeben, gelesen, bearbeitet oder gelöscht werden können.
  * Bei automatisch aus der Anwesenheitserfassung erstellten Fehlzeiten-Terminen wird die entsprechende Anomalie-Regel sowie der betroffene Schüler automatisch als Notiz hinterlegt.
* **Interaktionen:** 
  * **Checkbox:** Hakte den Termin als erledigt/unerledigt ab.
  * **Bearbeiten-Icon (Stift):** Öffnet das Modal zum Anpassen von Titel, Notiz, Typ/Kategorie, Fälligkeitsdatum, Uhrzeit, Kurs oder Farbe.
  * **Löschen-Icon (Mistkübel):** Löscht den Termin nach Bestätigung.

---

## 4. Manuelle Terminerstellung & Bearbeitung (`AddReminderModal`)
* **Felder:**
  * **Titel:** Bezeichnung des Termins.
  * **Notiz / Beschreibung:** Mehrzeiliges Textfeld für detaillierte Anmerkungen.
  * **Kategorie / Typ:** Auswahl aus allen verfügbaren Kategorien (Tests, Abgaben, Notizen, Fehlzeiten oder selbst definierte Kategorien).
  * **Kurs & Zielgruppe:** Gesamte Gruppe oder einzelner Schüler.
  * **Fälligkeitsdatum & Uhrzeit:** Exaktes Stichtagsdatum (`YYYY-MM-DD`, Anzeige: `[Wochentag] DD.MM.YYYY`) und Uhrzeit.
  * **Akzentfarbe & Icon:** Übernahme der Standardfarbe der gewählten Kategorie oder individuelle Anpassung.
