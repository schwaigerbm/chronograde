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
