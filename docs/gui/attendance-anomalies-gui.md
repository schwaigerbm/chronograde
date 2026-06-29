# Spezifikation: Fehlzeiten-Auffälligkeiten & Terminliste (Erinnerungen)

## 1. Übersicht & Ziel
Dieses Feature dient dazu, auffällige Abwesenheiten von Schülern unmittelbar nach der Anwesenheitserfassung zu erkennen, der Lehrkraft anzuzeigen und optional Erinnerungen für nachfolgende Abklärungen in einer Terminliste auf der Startseite anzulegen.

---

## 2. Erkennung von Auffälligkeiten
Nach jedem Speichervorgang der Anwesenheit (Sammelerfassung oder Einzeländerung) wird die chronologische Historie der Anwesenheitseinträge des Schülers analysiert. Folgende drei Auffälligkeiten werden geprüft:
1.  **Zweimal in Folge gefehlt:** Die letzten beiden chronologischen Einträge sind als abwesend ('x') markiert.
2.  **Zweimal gefehlt in den letzten 3 Terminen:** Mindestens zwei der letzten drei Termine sind abwesend ('x').
3.  **Dreimal gefehlt in den letzten 5 Terminen:** Mindestens drei der letzten fünf Termine sind abwesend ('x').

---

## 3. Interaktives Auffälligkeits-Modal (Wizard)
Wird bei einem oder mehreren Schülern mindestens eine der oben genannten Auffälligkeiten erkannt, öffnet sich nach dem Speichern automatisch ein Modal zur Bestätigung.
*   **Schrittweise Anzeige:** Die Schüler werden nacheinander (einzeln pro Schritt) angezeigt.
*   **Inhalt pro Schüler:**
    *   Name des Schülers und Gruppe.
    *   Aufzählung der konkret verletzten Regeln (jede verletzte Regel wird in einer **eigenen Zeile mit einem Aufzählungspunkt** dargestellt).
    *   Checkbox-Option: "Abklärungserinnerung für den nächsten Termin erstellen".
    *   Datumsfeld für die Erinnerung (standardmäßig 7 Tage nach dem Erfassungsdatum vorausgewählt, manuell änderbar).
*   **Interaktion:** Mit Klick auf "Bestätigen & Weiter" (bzw. "Bestätigen & Schließen" beim letzten Schüler) wird der aktuelle Schritt quittiert, die Erinnerung ggf. in der Datenbank gespeichert und der nächste Schüler angezeigt.

---

## 4. Terminliste (Reminders-Widget)
Auf der **Start**-Seite der Anwendung befindet sich ein Widget ("Terminliste & Abklärungen"), das alle ausstehenden Abklärungstermine auflistet.
*   **Darstellung der Erinnerungen:**
    *   Name des Schülers und Gruppe.
    *   **Erkannte Auffälligkeiten:** Jede verknüpfte Fehlzeiten-Auffälligkeit des Schülers wird untereinander in einer **eigenen Zeile mit einem Aufzählungspunkt** dargestellt.
    *   Fälligkeitsdatum (überfällige Termine werden rot hervorgehoben).
*   **Interaktion:**
    *   Über ein Kontrollkästchen (Checkbox) kann eine Erinnerung als erledigt markiert (bzw. wieder reaktiviert) werden.
    *   Über ein Mülleimer-Symbol kann die Erinnerung dauerhaft gelöscht werden.
    *   Ein Filter ermöglicht das Ein- und Ausblenden bereits erledigter Termine.
