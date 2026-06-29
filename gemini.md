# 📝 Project Gemini: School Admin 2026

## 🎯 Projekt-Ziel
Eine hochperformante, Spec-Driven Web-Anwendung zur Notenverwaltung.
*   **Tech-Stack:** React (Vite) + TypeScript + Tailwind CSS.
*   **Backend:** Firebase Firestore (Cloud-native).
*   **Sicherheit:** Firebase Auth (Google Sign-In / 2FA-ready).

---

## 🏗 Daten-Architektur (Firestore)

### Collections
| Collection | Pfad | Beschreibung |
| :--- | :--- | :--- |
| **Courses** | `/courses/{courseId}` | Definiert Fach, Klasse und das Spalten-Layout (Prüfungen). |
| **Students** | `/students/{studentId}` | Stammdaten der Schüler (Name, Klasse). |
| **Grades** | `/students/{studentId}/grades/{courseId}` | **Sub-Collection**. Speichert alle Noten eines Schülers für ein spezifisches Fach. |

### Daten-Struktur (Schema)
*   **Course:** Enthält ein `columns` Array für die Matrix-Spalten: `[{ id, title, type, date }]`.
*   **Grade-Dokument:** Nutzt die `columnId` aus dem Kurs als Key, um O(1) Lesezugriff in der Noten-Matrix zu ermöglichen.

---

## 🛠 Entwicklung & Konventionen (Spec-Driven Design)

### 1. Type Safety
Alle Datenmodelle **müssen** zwingend in `src/types/schema.ts` definiert sein. Die GUI darf niemals direkt auf Firebase-Rohdaten zugreifen, ohne sie gegen diese TypeScript-Interfaces zu prüfen.

### 2. Service Layer
Der Datenbankzugriff erfolgt ausschließlich über `src/services/firebaseService.ts`. Komponenten kommunizieren nur über React Hooks (z. B. `useGradesManager`) mit diesem Service, um die UI vollständig von der Datenbank-Logik zu entkoppeln.

### 3. Styling & UI
*   Verwendung von **Tailwind CSS**.
*   Dynamische Klassen-Verarbeitung via `cn()`-Helper (`clsx` + `tailwind-merge`).
*   Icons werden ausschließlich über `lucide-react` eingebunden.
*   **Schriftgrößen (Typography):** Kleine Schriften sind konsequent zu vermeiden. Alle Textelemente (inklusive Tabelleninhalte, Formularfelder, Badges, Tooltips und Beschreibungen) müssen eine Schriftgröße von **mindestens 12pt** (bzw. 16px) besitzen, es sei denn, der User definiert eine Ausnahme explizit.
*   **WICHTIG:** Keine Verwendung von Browser-nativen Funktionen wie `alert()`, `confirm()` oder `prompt()`. Alle Interaktionen müssen über elegante, App-interne Modals/Dialoge gelöst werden.

### 4. Workflow für KI-Generierung & Code-Änderungen
*   **Erst das Pflichtenheft, dann der Code:** Bevor Code geändert oder neu generiert wird, müssen funktionale Änderungen zuerst im entsprechenden Pflichtenheft unter `docs/gui/` beschrieben oder aktualisiert werden. Erst nach Freigabe/Festlegung im Pflichtenheft darf die Code-Implementierung durchgeführt werden.
*   **Implementierungspläne auf Deutsch:** Alle Planungs- und Implementierungspläne (`implementation_plan.md`) müssen zwingend in deutscher Sprache verfasst sein.
*   **Datenstruktur-Prüfung:** Bei jeder Code-Änderung muss die Datenstruktur (in `src/types/schema.ts` sowie die Firestore-Pfade) geprüft werden.
*   **Ganzheitlicher Blick (Keine Seiteneffekte):** Bei Änderungen an Datenstrukturen, Services oder Schnittstellen muss immer das gesamte Projekt im Blick behalten werden. Es ist zwingend sicherzustellen, dass andere Module, bestehende GUI-Komponenten oder Services dadurch nicht beeinträchtigt oder außer Kraft gesetzt werden.

---

## 🧪 Testing & Qualitätssicherung

**Wichtiger Hinweis für Integrationstests:**
Bei der Arbeit mit Firestore und Jest müssen zwingend `beforeAll` und `afterAll` Hooks in den Test-Suiten verwendet werden, um eine saubere Testumgebung zu garantieren:
*   `beforeAll`: Initialisierung der Firebase Emulator Suite und Aufbau der Basis-Testdaten.
*   `afterAll`: Vollständiger Cleanup (Löschen) der generierten Test-Collections, um Seiteneffekte und Datenverschmutzung zwischen den einzelnen Testläufen strikt zu vermeiden.
*   **Niemals Scratch-Testungen & automatisches Testing:** Es darf niemals, wirklich niemals irgendetwas mit Scratch-Testungen oder automatischem Testing durchgeführt werden. Der User übernimmt das Testen immer selbst.
