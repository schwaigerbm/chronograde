# Spezifikation: Fehlzeiten-Auffälligkeiten & Terminliste (Erinnerungen)

## 1. Übersicht & Ziel
Dieses Feature dient dazu, auffällige Abwesenheiten von Schülern unmittelbar nach der Anwesenheitserfassung zu erkennen, der Lehrkraft anzuzeigen und optional Erinnerungen für nachfolgende Abklärungen in einer Terminliste auf der Startseite anzulegen.

---

## 2. Kursspezifische Konfiguration (Einstellungen der Beurteilungsgruppe)
In den Einstellungen der jeweiligen Beurteilungsgruppe (Kurs) können die Fehlzeiten-Abklärungen flexibel konfiguriert werden:
* **Haupt-Schalter (Toggle):** „Fehlzeiten-Abklärungen aktivieren“ (An / Aus).
* **Einzelne Regelfälle (Checkboxen):** Falls aktiviert, können die gewünschten Regeln individuell gewählt werden:
  1. **2x in Folge gefehlt:** Die letzten beiden chronologischen Einträge sind abwesend ('x').
  2. **2x gefehlt in den letzten 3 Terminen:** Mindestens zwei der letzten drei Termine sind abwesend ('x').
  3. **3x gefehlt in den letzten 5 Terminen:** Mindestens drei der letzten fünf Termine sind abwesend ('x').

---

## 3. Interaktives Auffälligkeits-Modal (Wizard bei der Erfassung)
Wird beim Speichern der Anwesenheit eine aktive Auffälligkeit erkannt, öffnet sich automatisch das Bestätigungs-Modal:
* **Schrittweise Anzeige:** Die Schüler werden nacheinander (einzeln pro Schritt) angezeigt.
* **Datums- & Uhrzeitfestlegung:**
  * Der Benutzer wird gefragt, an welchem **Datum** die Abklärung in der Terminliste auftauchen soll.
  * **Uhrzeit-Regel:** Der Termin erscheint an diesem Stichtag bereits **früh morgens ab 07:00 Uhr** in der Terminliste.
* **Speicherung:** Mit Klick auf „Bestätigen & Weiter“ wird der Abklärungstermin mit Fälligkeitsdatum und Startzeit 07:00 Uhr in der Datenbank hinterlegt.

---

## 4. Terminliste (Reminders-Widget auf der Startseite)
Auf der **Start**-Seite listet die Terminliste alle Abklärungen auf.
* **Filter & Ansichts-Schalter (Toggle):**
  * **„Nur aktuelle Termine“ (Standard):** Zeigt alle Abklärungen, deren Fälligkeitszeitpunkt (Stichtag ab 07:00 Uhr) erreicht oder überschritten ist und die noch nicht erledigt sind.
  * **„Alle Termine“:** Zeigt die Gesamtliste aller Termine (inklusive zukünftiger Termine sowie bereits erledigter Abklärungen).
* **Interaktion:**
  * Über ein Kontrollkästchen (Checkbox) wird ein Termin als erledigt abgehakt.
  * Über ein Mülleimer-Symbol kann ein Eintrag gelöscht werden.

---

## 5. Manuelle Termine, Tests & Abgaben (`AddReminderModal`)
Neben automatischen Abklärungen können manuelle Termine für Gruppen oder einzelne Schüler angelegt werden:
* **Termin-Typen:**
  * 📝 **Test / Überprüfung** (Schularbeiten, Tests)
  * 📁 **Aufgabe / Abgabe** (Mitschriften, Portfolios, Hausübungen)
  * 📌 **Notiz / Sonstiges** (Generelle Termine)
* **Bezug (Zielgruppe):**
  * **Gesamte Gruppe:** Gilt für alle Schüler eines ausgewählten Kurses.
  * **Einzelner Schüler:** Gilt für einen bestimmten Schüler einer ausgewählten Gruppe.
* **Vorbereitungs-Erinnerung (Vorlaufzeit):**
  * Option zur Wahl einer Vor-Erinnerung: `Keine`, `1 Tag davor`, `3 Tage davor` oder `7 Tage davor`.
  * Das System generiert bei Auswahl automatisch eine zusätzliche Vorbereitungs-Erinnerung, die 1, 3 oder 7 Tage vor dem Haupttermin ab 07:00 Uhr morgens in der Terminliste auftaucht.
* **Farbauswahl (Custom Accent Color):**
  * Farbauswahl (z. B. Blau, Violett, Smaragdgrün, Bernstein, Rosenrot) für individuelle Farbakzente/Badges in der Terminliste.
* **Suche, Sortierung & Filter-Pills:**
  * **Live-Suche:** Echtzeit-Filterung nach Titel, Schülernamen, Gruppe oder Notiz.
  * **Sortierung:** Chronologisch nach Fälligkeit (auf-/absteigend), Name (A-Z) oder Typ.
  * **Kategorie-Filter:** Schnellfilter-Pills (`Alle`, `📝 Tests`, `📁 Abgaben`, `⚠️ Fehlzeiten`).
* **Änderungsmöglichkeiten (Bearbeiten & Löschen):**
  * **Bearbeiten-Icon (Stift):** Öffnet den Dialog zum Bearbeiten des ausgewählten Termins (Titel, Typ, Farbe, Datum, Vorlaufzeit, Zielgruppe).
  * **Löschen-Icon (Mistkübel):** Löscht den Termin endgültig. Falls eine Vorbereitsungs-Erinnerung verknüpft ist, wird diese ebenfalls mitbereinigt.
