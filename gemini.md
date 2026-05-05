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

---

## 🧪 Testing & Qualitätssicherung

**Wichtiger Hinweis für Integrationstests:**
Bei der Arbeit mit Firestore und Jest müssen zwingend `beforeAll` und `afterAll` Hooks in den Test-Suiten verwendet werden, um eine saubere Testumgebung zu garantieren:
*   `beforeAll`: Initialisierung der Firebase Emulator Suite und Aufbau der Basis-Testdaten.
*   `afterAll`: Vollständiger Cleanup (Löschen) der generierten Test-Collections, um Seiteneffekte und Datenverschmutzung zwischen den einzelnen Testläufen strikt zu vermeiden.

---

## 📈 Projekt-Fortschritt

- [x] **Phase 0:** Projekt-Initialisierung (Vite, Tailwind, Packages installiert).
- [x] **Phase 1:** Spezifikation der Datenmodelle erstellen (`schema.ts`).
- [x] **Phase 2:** Firebase Configuration & Service Layer (Auth + Firestore).
- [ ] **Phase 3:** Core-UI: Noten-Matrix (Grid) mit Echtzeit-Sync.
- [ ] **Phase 4:** Erweiterte Features (Hover-Kommentare).