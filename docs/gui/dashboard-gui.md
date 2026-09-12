# Spezifikation: Dashboard-Layout & Navigation

## 0. Tresor-Code & Lokale Datenhaltung (Desktop-Version)
In der Desktop-Auskopplung (Electron) wird der bisherige Firebase-Online-Login durch einen **lokalen Tresor-Code (PIN)** und eine **SQLite-Datenbank im Anwendungsverzeichnis** ersetzt:
* **Erstmalige Einrichtung:** Wenn keine SQLite-Datenbankdatei existiert, fordert die App beim Erststart zur Vergabe eines 4- bis 8-stelligen Tresor-Codes auf.
* **Tresor-Entsperrung:** Bei jedem Anwendungsstart wird der gehashte Tresor-Code über einen eleganten PIN-Entsperrbildschirm abgefragt.
* **5-Minuten-Inaktivitätssperre:** Nach 5 Minuten ohne Benutzeraktion (Maus/Tastatur) sperrt sich die Anwendung automatisch und kehrt zum Tresor-Bildschirm zurück.

## 1. Layout-Struktur
Das Dashboard nutzt ein klassisches "Sidebar-Layout". Es besteht aus zwei Hauptbereichen:
1. **Sidebar (Links):** Permanente vertikale Navigationsleiste.
2. **Main Content Area (Rechts):** Dynamischer Bereich, in dem die Inhalte der gewählten Module geladen werden.

## 2. Sidebar (Vertikales Menü)
Die Sidebar ist schmal gehalten (Collapsed-Ansicht möglich) und fokussiert sich auf Icon-basierte Navigation.

### Menü-Komponenten:
Jeder Menüpunkt besteht aus einem Icon und einem Tooltip (oder Label bei Hover).

| Menüpunkt | Icon-Vorschlag | Verknüpfte GUI-Datei |
| :--- | :--- | :--- |
| **Start** | `home` | `attendance-anomalies-gui.md` |
| **Beurteilungen** | `star-rate` / `grade` | `assessments-gui.md` |
| **Gruppen** | `groups` / `folder` | `courses-gui.md` |
| **Schüler** | `person` / `school` | **`students-gui.md`** |
| **Einstellungen** | `settings` / `gear` | `settings-gui.md` |
| **Abmelden / Sperren** | `logout` | (Führt Logout- bzw. Tresor-Sperr routine aus) |

> [!NOTE]
> Das Modul **Start** bindet das `RemindersWidget` ein, welches automatische Fehlzeiten-Abklärungen sowie manuelle Termine, Tests und Abgaben zusammenfasst (siehe [`attendance-anomalies-gui.md`](file:///c:/Users/user/Documents/chronograde/docs/gui/attendance-anomalies-gui.md)).


### Design & Interaktion:
* **Aktiv-Status:** Der aktuell gewählte Menüpunkt wird optisch hervorgehoben (z. B. durch einen farbigen Balken am Rand oder eine Hintergrundänderung).
* **Hover-Effekt:** Dezente Aufhellung des Icons beim Drüberfahren.
* **Fixierung:** Die Sidebar bleibt beim Scrollen im Content-Bereich fest am linken Rand stehen.
* **Navigation bei Klick auf "Beurteilungen":** Beim Klick auf den Menüpunkt **Beurteilungen** im Hauptmenü (Sidebar) wird die Ansicht *immer* auf die Gruppen-Schnellauswahl zurückgesetzt (Auswahl des aktuellen Kurses/der Gruppe wird aufgehoben), so dass alle verfügbaren Gruppen/Kurse zur Auswahl angezeigt werden.

## 3. Dynamischer Content-Bereich
In diesem Bereich wird das jeweilige Dokument (Spezifikation) gerendert.

* **Standardansicht:** Beim ersten Laden wird das Modul **Start** ([`attendance-anomalies-gui.md`](file:///c:/Users/user/Documents/chronograde/docs/gui/attendance-anomalies-gui.md) mit `RemindersWidget`) angezeigt.
* **Modul-Wechsel:** Beim Klick auf "Schüler", "Gruppen", "Beurteilungen" oder "Einstellungen" wird der Inhalt geladen, der in der jeweiligen Spezifikationsdatei unter `docs/gui/` definiert ist.

## 4. Technische Schnittstelle (Service-Router & Abstraktions-Schicht)
* Die Navigation steuert einen internen State in React (`activeTab`), der basierend auf der Auswahl die entsprechende View-Komponente lädt.
* **Abstrahierter Service-Layer:** Alle Komponenten greifen über den vereinheitlichten `firebaseService` auf die Daten zu:
  * Im **Web-Modus** nutzt `firebaseService` die Cloud Firestore SDK.
  * Im **Desktop-Modus (Electron)** erkennt `firebaseService` die Electron-Umgebung (`sqliteService.isDesktopAvailable()`) und leitet alle Lese- und Schreiboperationen transparente via IPC an die lokale SQLite-Datenbank (`sqliteService`) weiter.