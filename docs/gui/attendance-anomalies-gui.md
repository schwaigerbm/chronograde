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

### 3.1 Terminkalender-Ansicht (Kalender-Grid)
* **Monats- & Wochenübersicht:** Ein interaktives Kalender-Grid des aktuellen Monats.
* **Tages-Markierungen:** Tage mit fälligen Terminen werden durch kleine farbige Indikator-Punkte oder farbige Tages-Badges hervorgehoben (Farbe entspricht dem Termin-Typ oder der gewählten Akzentfarbe).
* **Aktueller Tag:** Der heutige Tag wird optisch markiert (z. B. primärblauer Kreis um das Datum).
* **Klick-Interaktion:** Klick auf einen Kalendertag filtert die darunterliegende/danebenstehende Terminliste auf die an diesem Tag fälligen Termine.

### 3.2 Saubere Terminliste (Chronologisch strukturiert)
* **Keine verschachtelten Vorbereitungs-Erinnerungen:** Jeder Termin ist ein eigenständiger Datensatz mit exakt **einem Fälligkeitsdatum** (ohne verwirrende 1/3/7-Tage Vor-Erinnerungs-Ableger).
* **Chronologische Gruppierung:**
  * **⚠️ Überfällig / Heute:** Alle noch nicht erledigten Termine mit Fälligkeit heute oder in der Vergangenheit.
  * **📅 Demnächst:** Anstehende Termine der nächsten Tage.
  * **✅ Erledigt:** Abgehakte Termine (einklappbar oder per Filter umschaltbar).
* **Termin-Karten (Einträge):**
  * **Details:** Typ-Icon (📝 Test, 📁 Abgabe, ⚠️ Fehlzeit, 📌 Notiz), Titel, Kursname, Schülersatz (falls schülerspezifisch) und Fälligkeitsdatum.
  * **Interaktionen:** 
    * **Checkbox:** Hakte den Termin als erledigt/unerledigt ab.
    * **Bearbeiten-Icon (Stift):** Öffnet das Modal zum Anpassen von Titel, Typ, Fälligkeitsdatum, Kurs oder Farbe.
    * **Löschen-Icon (Mistkübel):** Löscht den Termin endgültig.
* **Suche & Kategorie-Filter:**
  * Live-Suchfeld (nach Titel, Schüler oder Kurs).
  * Schnellfilter-Pills (`Alle`, `📝 Tests`, `📁 Abgaben`, `⚠️ Fehlzeiten`, `📌 Notizen`).

---

## 4. Manuelle Terminerstellung & Bearbeitung (`AddReminderModal`)
* **Felder:**
  * **Titel:** Bezeichnung des Termins.
  * **Typ:** 📝 Test / Überprüfung | 📁 Aufgabe / Abgabe | 📌 Notiz / Sonstiges | ⚠️ Fehlzeit.
  * **Kurs & Zielgruppe:** Gesamte Gruppe oder einzelner Schüler.
  * **Fälligkeitsdatum:** Exaktes Stichtagsdatum (`YYYY-MM-DD`).
  * **Akzentfarbe:** Farbauswahl (Blau, Violett, Smaragdgrün, Amber, Rose).
