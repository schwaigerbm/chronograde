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
* **Header-Button „+ Neuer Termin“:** Der Button „+ Neuer Termin“ ist als **einfacher, schlichter und kleiner Button** (ohne schwere Akzentfarben/Schatten, rechtsbündig platziert).

### 3.2 Terminkalender-Ansicht (Kalender-Grid)
* **Monats- & Wochenübersicht:** Ein interaktives Kalender-Grid des aktuellen Monats.
* **Tages-Markierungen:** Tage mit fälligen Terminen werden durch kleine farbige Indikator-Punkte oder farbige Tages-Badges hervorgehoben (Farbe entspricht der Kategorie-Farbe).
* **Aktueller Tag:** Der heutige Tag wird optisch markiert (z. B. primärblauer Kreis um das Datum).
* **Klick-Interaktion & Vorauswahl:** Klick auf einen Kalendertag filtert die Terminliste auf die an diesem Tag fälligen Termine. Wird bei aktivem Tagesfilter der Button „+ Neuer Termin“ gedrückt, wird dieses angeklickte Datum im Modal automatisch als Fälligkeitsdatum vorausgewählt.

### 3.3 Saubere Terminliste, Filter & Speicherung in SQLite
* **Status-Filter („Erledigt“ / „Nicht erledigt“):** Eigene Schnellfilter-Schaltflächen zur Trennung von unerledigten und bereits abgehakten Terminen (`Alle Status`, `Offen / Nicht erledigt`, `Erledigt`).
* **Kategorie-Filter:** Dynamische Filter-Pills basierend auf den in den Einstellungen verwalteten Kategorien (`Alle`, `📝 Tests`, `📁 Abgaben`, `⚠️ Fehlzeiten`, `📌 Notizen` sowie benutzerdefinierte Kategorien).
* **Suchfeld:** Live-Suchfeld zur Filterung nach Titel, Kurs, Schüler oder Notiz-Text.
* **Persistierung in der SQLite-Datenbank:** Sämtliche gewählten Filtereinstellungen (Status-Filter, Kategorie-Filter, Suchtext) werden direkt in der **SQLite-Datenbank** (Tabelle `settings`) gespeichert und beim nächsten Start der Anwendung automatisch wiederhergestellt.

### 3.4 Termin-Karten (Einträge & Badges)
* **Badge-Reihenfolge & Datumsanzeige mit relativer Angabe:** 
  1. **1. Badge (Datum mit Wochentag & relativem Zeitraum):** Steht an erster Stelle und formatiert das Fälligkeitsdatum in der Form `[Wochentag] DD.MM.YYYY, [relativer Zeitraum]` (z. B. `Mittwoch 21.05.2026, diese Woche`, `Mittwoch 30.06.2026, in 2 Wochen`, `Heute`, `Morgen`, `in 3 Tagen`, `vor 2 Wochen`).
  2. **2. Badge (Kategorie):** Steht an zweiter Stelle und zeigt den Namen und das Icon der Kategorie an (z. B. `Tests`, `Abgaben`, `Fehlzeiten`).
* **Notiz- & Beschreibungstext (Mehrzeilig):**
  * Jeder Termin verfügt über ein optionales, mehrzeiliges Notizfeld (`description` / `note`), in dem ausführliche Informationen eingegeben, gelesen, bearbeitet oder gelöscht werden können.
  * Bei automatisch aus der Anwesenheitserfassung erstellten Fehlzeiten-Terminen wird die entsprechende Anomalie-Regel sowie der betroffene Schüler automatisch als Notiz hinterlegt.
* **Interaktionen:** 
  * **Checkbox:** Hakte den Termin als erledigt/unerledigt ab.
  * **Bearbeiten-Icon (Stift):** Öffnet das Modal zum Anpassen von Titel, Notiz, Typ/Kategorie, Fälligkeitsdatum, Uhrzeit, Kurs oder Farbe.
  * **Löschen-Icon (Mistkübel):** Löscht den Termin nach Bestätigung.

---

## 5. Anwesenheit & Zufalls-Erfassung („A & D Dialog“)
Auf allen Gruppen-Karten in der Beurteilungsübersicht befindet sich **unterhalb** des Links `Matrix öffnen >` der Button `A & D Dialog >` (sofern in den Einstellungen aktiviert).

### 5.1 Ablauf & Phasen
1. **Phase 1: Anwesenheits-Schnellerfassung**
   * Es öffnet sich ein Schnellerfassungs-Modal für die gewählte Gruppe.
   * Sämtliche Schüler der Gruppe werden mit ihrer laufenden Klassenbuchnummer (`#1`, `#2`, `#3`...), ihrem Namen und Profilbild aufgelistet.
   * Über einfache Toggle-Buttons kann der Status schnell auf Anwesend (`'p'`) oder Abwesend (`'x'`) gesetzt werden (Standard: Alle anwesend).
   * Klick auf `Anwesenheit speichern & Zufalls-Generator starten 🎲` speichert die Anwesenheit ab und startet Phase 2.

2. **Phase 2: Spektakulärer Zufallszahlengenerator (Slot / Lotto-Roller)**
   * **Kandidaten-Pool:** Ausschließlich diejenigen Klassenbuchnummern der Schüler, die in Phase 1 als **anwesend** (`'p'`) erfasst wurden.
   * **Animation:** Animiertes Durchrollen aller anwesenden Klassenbuchnummern (Lotto- / Slot-Machine-Roller) mit dynamischer Beschleunigung und dramatischem Abbremsen.
   * **Ergebnis & Siegerehrung:** Nach dem Stopp erstrahlt die gewählte Klassenbuchnummer mit Gold-Effekt und Partikel-Animation. Es werden der Name des gezogenen Schülers, dessen Klassenbuchnummer sowie Profilbild hervorgehoben dargestellt (ideal für zufällige Stundenwiederholungen oder Moderatoren).
   * **Aktionen:** `🎲 Erneut drehen` oder `Schließen`.
