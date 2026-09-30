# 📝 Project Gemini: School Admin 2026

## 🎯 Projekt-Ziel
Eine hochperformante, Spec-Driven Standalone Electron Desktop-Anwendung (Offline-First) zur Notenverwaltung.
*   **Tech-Stack:** React (Vite) + TypeScript + Tailwind CSS + Electron.
*   **Backend:** Lokale SQLite-Datenbank (`sqlite3` / `electron/database.cjs`).
*   **Sicherheit:** Lokaler Tresor-Code (PIN-Entsperrung mit BCrypt & AES-Verschlüsselung / 5-Minuten-Inaktivitätssperre).

---

## 🏗 Daten-Architektur (Lokale SQLite-Datenbank)

### Relationale Tabellen
| Tabelle | Primärschlüssel | Beschreibung |
| :--- | :--- | :--- |
| **courses** | `id` | Definiert Fach, Schuljahr, Archivierungsstatus und Einstellungen. |
| **students** | `id` | Stammdaten der Schüler (Name, Foto-Base64). |
| **grades** | `id` | Speichert Noten, Prozente und Zeichen pro Schüler und Spalte. |
| **course_entries** | `id` | Beurteilungsspalten einer Gruppe (`manual`, `collaborationSum`, `presenceSum`, `calculated`, `groupAssignment`). |
| **settings** | `key` | Lokale Anwendungseinstellungen und Präferenzen. |
| **attendance_events** | `id` | Einzelne Anwesenheits-Einträge pro Schüler und Datum. |
| **collaboration_events** | `id` | Einzelne Mitarbeits-Einträge (+, ~, -) mit Notizen. |

### Daten-Struktur (Schema)
*   **Course Entry:** Enthält die Konfiguration der Matrix-Spalte (`title`, `type`, `date`, `weight`, `isLocked`, `isVisible`).
*   **Grade-Eintrag:** Verknüpft `student_id` und `entry_id` mit dem erfassten Wert (`value`, `overrideNote`), um schnellen Lesezugriff in der Noten-Matrix zu ermöglichen.

---

## 🛠 Entwicklung & Konventionen (Spec-Driven Design)

### 1. Type Safety
Alle Datenmodelle **müssen** zwingend in `src/types/schema.ts` definiert sein. Die GUI darf niemals direkt auf SQLite-Rohdaten zugreifen, ohne sie gegen diese TypeScript-Interfaces zu prüfen.

### 2. Service Layer
Der Datenbankzugriff erfolgt ausschließlich über `src/services/sqliteService.ts` via Electron Inter-Process Communication (IPC-Bridge zu `electron/main.cjs` / `electron/database.cjs`). Komponenten kommunizieren nur über React Hooks (z. B. `useGradesManager`) mit diesem Service, um die UI vollständig von der Datenbank-Logik zu entkoppeln.

### 3. Styling & UI
*   Verwendung von **Tailwind CSS**.
*   Dynamische Klassen-Verarbeitung via `cn()`-Helper (`clsx` + `tailwind-merge`).
*   Icons werden ausschließlich über `lucide-react` eingebunden.
*   **Schriftgrößen (Typography):**
    *   **Einstellungen & Eingabe-/Änderungsbereiche:** Kleine Schriftgrößen sind zur besseren Platznutzung erlaubt, müssen jedoch **mindestens 8pt (bzw. 11px)** groß sein. Dies gilt für Konfigurations-Dialoge, Formulareingaben und Einstellungsmenüs.
    *   **Schüler-Detail-Dashboard (Schüler-Leistungsübersicht in `matrix.md`):** Für das gesamte Modal (sowohl linke Spalte inkl. SVG-Diagramm als auch rechte Spalte inkl. Kärtchen & Timeline) gilt: Standard-Schriftgröße ist **12px** für Fließtexte, Datenwerte und Achsenbeschriftungen; Sektionsüberschriften und wichtige Titel werden in **13px** ausgeführt.
    *   **Präsentationsansichten (Dashboards, Auswertungen, Statistiken, Notenmatrix, Schüleransichten):** Alle Ansichten, die vor der Klasse präsentiert werden können, müssen eine Schriftgröße von **mindestens 12pt (bzw. 16px)** für alle Textelemente (inklusive Tabelleninhalten, Badges, Diagrammbeschriftungen, Tooltips und Beschreibungen) besitzen.
*   **WICHTIG:** Keine Verwendung von Browser-nativen Funktionen wie `alert()`, `confirm()` oder `prompt()`. Alle Interaktionen müssen über elegante, App-interne Modals/Dialoge gelöst werden.

### 4. Workflow für KI-Generierung & Code-Änderungen
*   **Erst das Pflichtenheft, dann der Code:** Bevor Code geändert oder neu generiert wird, müssen funktionale Änderungen zuerst im entsprechenden Pflichtenheft unter `docs/gui/` beschrieben oder aktualisiert werden. Erst nach Freigabe/Festlegung im Pflichtenheft darf die Code-Implementierung durchgeführt werden.
*   **Implementierungspläne auf Deutsch:** Alle Planungs- und Implementierungspläne (`implementation_plan.md`) müssen zwingend in deutscher Sprache verfasst sein.
*   **Datenstruktur-Prüfung:** Bei jeder Code-Änderung muss die Datenstruktur (in `src/types/schema.ts` sowie die SQLite-Tabellenschemata) geprüft werden.
*   **Ganzheitlicher Blick (Keine Seiteneffekte):** Bei Änderungen an Datenstrukturen, Services oder Schnittstellen muss immer das gesamte Projekt im Blick behalten werden. Es ist zwingend sicherzustellen, dass andere Module, bestehende GUI-Komponenten oder Services dadurch nicht beeinträchtigt oder außer Kraft gesetzt werden.

---

## 🧪 Testing & Qualitätssicherung

**Wichtiger Hinweis für Integrationstests:**
Bei der Arbeit mit der lokalen SQLite-Datenbank muss vor Testläufen eine temporäre Test-Datenbankdatei verwendet werden, um Seiteneffekte und Datenverschmutzung strikt zu vermeiden.
*   **Niemals Scratch-Testungen & automatisches Testing:** Es darf niemals, wirklich niemals irgendetwas mit Scratch-Testungen oder automatischem Testing durchgeführt werden. Der User übernimmt das Testen immer selbst.
