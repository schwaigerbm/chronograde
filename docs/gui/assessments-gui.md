# 📄 GUI-Spezifikation: Beurteilungsübersicht & Wochenplan-Layout (`GradesMatrix` Startseite / Kursauswahl)

## 1. Übersicht & Ziel
Diese Ansicht dient der strukturierten Auswahl einer Beurteilungsgruppe (Kurs) anhand eines wöchentlichen Stundenplans (Montag bis Samstag, unterteilt in Vormittag und Nachmittag). Nicht zugewiesene Gruppen werden in einem separaten Sammelbereich angezeigt. Die Zuweisung und Verschiebung erfolgt intuitiv per Drag & Drop.

---

## 2. Layout-Struktur & Design

### A. Haupt-Stundenplan (Timetable Grid)
*   **Spalten:** **Vormittag** (Morning) und **Nachmittag** (Afternoon) (2 Spalten).
*   **Zeilen:** Wochentage von **Montag bis Samstag** (6 Zeilen).
*   **Wochentag-Hervorhebung:** Die Zeile des aktuellen Wochentags (basierend auf dem Systemdatum) wird farblich anders hinterlegt (z. B. ein weicher, leicht bläulicher oder grauer Hintergrund mit deutlicher Rahmenmarkierung), um dem Nutzer sofortige Orientierung zu bieten. Samstag wird ebenfalls unterstützt.
*   **Zellen-Verhalten:** Jede Zelle stellt eine Kombination aus Wochentag und Tageszeit dar (z. B. Montag-Vormittag). Sie fungiert als Dropzone für die Gruppenkarten. Es können pro Halbtag mehrere Gruppenkarten zugewiesen werden; diese werden innerhalb der Zelle nebeneinander (Flex-Row mit Wrap) dargestellt, wobei **maximal 3 Gruppenkarten pro Zeile** erlaubt sind (jede weitere Karte erzeugt eine neue Zeile). Die Anordnung erfolgt **linksbündig** innerhalb der Zelle. Die Positionierung (Reihenfolge) innerhalb des Halbtags kann flexibel per Drag & Drop durch Ablegen auf eine andere Karte geändert werden.

### B. Pool nicht zugeordneter Gruppen (Unassigned Pool)
*   **Position:** Unterhalb oder neben dem Stundenplan platziert.
*   **Funktion:** Zeigt alle Gruppenkarten an, die noch keinem Wochentag oder keinem Zeitfenster zugeordnet wurden (`timetableDay` und `timetableSlot` sind nicht definiert).
*   **Dropzone:** Auch dieser Pool dient als Dropzone, um Gruppen wieder aus dem Stundenplan zu entfernen (Zuweisung aufheben).

---

## 3. Drag & Drop Funktionalität
Der Ablauf nutzt die native HTML5 Drag & Drop API, um externe Abhängigkeiten zu vermeiden und maximale Performance zu garantieren.

1.  **Draggable Cards:** Jede Gruppenkarte (Course Card) ist ziehbar (`draggable={true}`).
2.  **Drag Start:** Beim Ziehen wird die ID der Gruppe im Daten-Transfer-Objekt hinterlegt.
3.  **Dropzones:** 
    *   Alle Zellen des Stundenplans (Wochentag × Slot).
    *   Der Pool der nicht zugeordneten Gruppen.
4.  **Drop-Aktion (Zelle/Pool):** Beim Ablegen einer Karte in einer leeren Zelle oder dem Pool wird die Zuweisung aktualisiert und die Karte ans Ende der Liste angefügt.
5.  **Drop-Aktion (Reordering):** Wird eine Karte direkt auf einer anderen Karte abgelegt, wird sie an der Position dieser Karte eingefügt und die Prioritäten (`priority`) der betroffenen Gruppen in dieser Zelle bzw. im Pool werden neu berechnet und gespeichert.
6.  **Daten-Speicherung:** Die geänderten Prioritäten und Zuweisungen werden sofort in Firestore gespeichert.
7.  **Visueller Dragover-Indikator:** Wenn eine Gruppenkarte über eine andere Karte gezogen wird, erscheint links neben der Zielkarte eine feine farbige Trennlinie (Einfüge-Indikator). Diese visualisiert exakt, wo die Karte beim Ablegen platziert wird. Die Linie verschwindet, wenn der Dragvorgang beendet oder abgebrochen wird.

---

## 4. Daten-Struktur & Firestore-Anbindung
Das Datenmodell `Course` wird um folgende optionale Felder ergänzt:
*   `timetableDay`: `'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | null`
*   `timetableSlot`: `'morning' | 'afternoon' | null`

Die Aktualisierung erfolgt über `firebaseService.saveCourse` bei jedem erfolgreichen Drop-Event.
