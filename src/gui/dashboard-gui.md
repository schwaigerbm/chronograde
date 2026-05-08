# Spezifikation: Dashboard-Layout & Navigation

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
| **Start** | `home` | `index-gui.md` |
| **Beurteilungen** | `star-rate` / `grade` | `assessments-gui.md` |
| **Gruppen** | `groups` / `folder` | `courses-gui.md` |
| **Schüler** | `person` / `school` | **`students-gui.md`** |
| **Einstellungen** | `settings` / `gear` | `settings-gui.md` |
| **Termine** | `calendar_today` | `appointments-gui.md` |
| **Logout** | `logout` | (Führt Logout-Routine aus) |

### Design & Interaktion:
* **Aktiv-Status:** Der aktuell gewählte Menüpunkt wird optisch hervorgehoben (z. B. durch einen farbigen Balken am Rand oder eine Hintergrundänderung).
* **Hover-Effekt:** Dezente Aufhellung des Icons beim Drüberfahren.
* **Fixierung:** Die Sidebar bleibt beim Scrollen im Content-Bereich fest am linken Rand stehen.

## 3. Dynamischer Content-Bereich
In diesem Bereich wird das jeweilige Dokument (Spezifikation) gerendert.

* **Standardansicht:** Beim ersten Laden wird das Modul **Start** (`index-gui.md`) angezeigt.
* **Modul-Wechsel:** Beim Klick auf "Schüler" wird der Inhalt geladen, der in der Datei `students-gui.md` definiert ist (Überschrift, Tabelle, Suche, Modals).

## 4. Technische Schnittstelle (Service-Router)
* Die Navigation steuert einen internen Router, der basierend auf der Auswahl die entsprechende View-Komponente lädt.
* Alle Module greifen bei Bedarf auf den globalen `serviceFirebase` zu, um Datenkonsistenz über alle Ansichten hinweg zu gewährleisten.