# Spezifikation: GUI Schülerverwaltung (Firebase Service-Architektur)

## 1. Seitenstruktur & Header
Die Kopfzeile dient der Identifikation der Ansicht und bietet die primäre Aktion zum Erstellen neuer Datensätze.

* **Hauptüberschrift (H1):** `Schüler`
* **Unterüberschrift (H2):** `Verwaltung aller Schüler`
* **Aktions-Button:** Direkt rechts neben der Unterüberschrift platziert.
    * **Label:** `Hinzufügen`
    * **Stil:** Primär-Button (hervorgehoben).

## 2. Datenanbindung & Architektur
* **Backend:** Firebase Firestore (Collection: `students`).
* **Service-Layer:** Die GUI kommuniziert **nicht direkt** mit Firebase, sondern ausschließlich über die Klasse/das Modul `serviceFirebase`.
* **Funktionsaufrufe:** 
    * Daten laden: `serviceFirebase.getStudents()`
    * Daten aktualisieren: `serviceFirebase.updateStudent(id, data)`
    * Daten löschen: `serviceFirebase.deleteStudent(id)`
    * Schüler hinzufügen: `serviceFirebase.addStudent(data)`

## 3. Suche & Filterung
* **Typ:** Live-Suche (Echtzeit-Filterung während der Eingabe).
* **Verhalten:** Die Tabelle filtert die über `serviceFirebase` bereitgestellten Daten sofort basierend auf den Übereinstimmungen im Vor- oder Nachnamen.

## 4. Daten-Tabelle
Anzeige der Schülerdatensätze aus der `students` Collection via `serviceFirebase`.

| Vorname | Nachname | Aktionen |
| :--- | :--- | :--- |
| [Vorname] | [Nachname] | 🔧 (Bearbeiten) 🗑️ (Löschen) |

### Aktions-Icons:
* **Schraubenschlüssel-Icon:** Öffnet den Bearbeitungs-Dialog.
* **Mistkübel-Icon:** Öffnet den Lösch-Bestätigungsdialog.

## 5. Dialog-Fenster (Modals)

### 5.1 Schüler bearbeiten
* **Auslöser:** Klick auf das Schraubenschlüssel-Icon.
* **Felder:**
    * Input: `Vorname`
    * Input: `Nachname`
* **Buttons:**
    * `Speichern`: Ruft die entsprechende Update-Funktion in `serviceFirebase` auf.
    * `Abbrechen`: Schließt das Fenster ohne Speichern.

### 5.2 Löschen bestätigen
* **Auslöser:** Klick auf das Mistkübel-Icon.
* **Nachricht:** "Wollen Sie den Schüler {Vorname} {Nachname} wirklich löschen?"
* **Buttons:**
    * `Ja` (Farbe: **Grün**): Ruft die Lösch-Funktion in `serviceFirebase` auf.
    * `Nein` (Farbe: **Rot**): Bricht den Vorgang ab.