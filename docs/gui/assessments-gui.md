# 📄 GUI-Spezifikation: Beurteilungsübersicht & Wochenplan-Layout (`GradesMatrix` Startseite / Kursauswahl)

## 1. Übersicht & Ziel
Diese Ansicht dient der strukturierten Auswahl einer Beurteilungsgruppe (Kurs) anhand eines wöchentlichen Stundenplans (Montag bis Samstag, unterteilt in Vormittag und Nachmittag). Nicht zugewiesene Gruppen werden in einem separaten Sammelbereich angezeigt. Die Zuweisung und Verschiebung erfolgt intuitiv per Drag & Drop.

---

## 2. Layout-Struktur & Design

### A. Haupt-Stundenplan (Timetable Grid)
*   **Spalten:** **Vormittag** (Morning) und **Nachmittag** (Afternoon) (2 Spalten).
*   **Zeilen:** Wochentage von **Montag bis Samstag** (6 Zeilen).
*   **Wochentag-Hervorhebung:** Die Zeile des aktuellen Wochentags (basierend auf dem Systemdatum) wird farblich anders hinterlegt (z. B. ein weicher, leicht bläulicher oder grauer Hintergrund mit deutlicher Rahmenmarkierung), um dem Nutzer sofortige Orientierung zu bieten. Samstag wird ebenfalls unterstützt.
*   **Zellen-Verhalten:** Jede Zelle stellt eine Kombination aus Wochentag und Tageszeit dar (z. B. Montag-Vormittag). Sie fungiert als Dropzone für die Gruppenkarten. Es können pro Halbtag mehrere Gruppenkarten zugewiesen werden; diese werden innerhalb der Zelle vertikal untereinander gestapelt dargestellt.

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
4.  **Drop-Aktion:** Beim Ablegen einer Karte in eine Zelle oder den Pool wird:
    *   Die ID der abgelegten Gruppe ermittelt.
    *   Das Wochentag- und Slot-Attribut der Gruppe aktualisiert (bzw. auf unzugeordnet gesetzt).
    *   Die Änderung im Backend (Firestore) gespeichert.
    *   Die UI aktualisiert sich reaktiv über den Firestore-Snapshot.

---

## 4. Daten-Struktur & Firestore-Anbindung
Das Datenmodell `Course` wird um folgende optionale Felder ergänzt:
*   `timetableDay`: `'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | null`
*   `timetableSlot`: `'morning' | 'afternoon' | null`

Die Aktualisierung erfolgt über `firebaseService.saveCourse` bei jedem erfolgreichen Drop-Event.
