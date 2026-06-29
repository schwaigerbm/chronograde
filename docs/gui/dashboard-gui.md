# Spezifikation: Dashboard-Layout & Navigation

## 0. Login-Ansicht (Deaktiviert für Entwicklung / Electron-Vorbereitung)
Die Login-Ansicht ist für die lokale Entwicklung und zukünftige Electron-App-Integration temporär deaktiviert.
Die Anwendung startet direkt im Dashboard-Zustand. Der Login-Prozess ist als optionales Feature im Quellcode vorbereitet, wird jedoch umgangen, um eine barrierefreie lokale Entwicklung zu ermöglichen.

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
| **Logout** | `logout` | (Führt Logout-Routine aus) |

> [!NOTE]
> Der Menüpunkt **Termine** (calendar_today) ist vorerst ausgeblendet, da für diesen Bereich noch keine Spezifikation oder Funktionalität hinterlegt ist.


### Design & Interaktion:
* **Aktiv-Status:** Der aktuell gewählte Menüpunkt wird optisch hervorgehoben (z. B. durch einen farbigen Balken am Rand oder eine Hintergrundänderung).
* **Hover-Effekt:** Dezente Aufhellung des Icons beim Drüberfahren.
* **Fixierung:** Die Sidebar bleibt beim Scrollen im Content-Bereich fest am linken Rand stehen.
* **Navigation bei Klick auf "Beurteilungen":** Beim Klick auf den Menüpunkt **Beurteilungen** im Hauptmenü (Sidebar) wird die Ansicht *immer* auf die Gruppen-Schnellauswahl zurückgesetzt (Auswahl des aktuellen Kurses/der Gruppe wird aufgehoben), so dass alle verfügbaren Gruppen/Kurse zur Auswahl angezeigt werden.

## 3. Dynamischer Content-Bereich
In diesem Bereich wird das jeweilige Dokument (Spezifikation) gerendert.

* **Standardansicht:** Beim ersten Laden wird das Modul **Start** (`index-gui.md`) angezeigt.
* **Modul-Wechsel:** Beim Klick auf "Schüler" wird der Inhalt geladen, der in der Datei `students-gui.md` definiert ist (Überschrift, Tabelle, Suche, Modals).

## 4. Technische Schnittstelle (Service-Router)
* Die Navigation steuert einen internen Router, der basierend auf der Auswahl die entsprechende View-Komponente lädt.
* Alle Module greifen bei Bedarf auf den globalen `serviceFirebase` zu, um Datenkonsistenz über alle Ansichten hinweg zu gewährleisten.