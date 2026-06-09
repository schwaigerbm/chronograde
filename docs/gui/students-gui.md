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

**WICHTIGER UI-HINWEIS:** Es dürfen keine Browser-nativen Funktionen wie `alert()` oder `confirm()` verwendet werden. Alle Bestätigungen (z.B. beim Löschen) oder Fehlermeldungen müssen über App-interne, elegante Dialog-Fenster (Modals) realisiert werden.

### 5.1 Schüler bearbeiten
* **Auslöser:** Klick auf das Schraubenschlüssel-Icon.
* **Profilbild-Sektion (Neu):**
    * Zeigt eine runde Bild-Vorschau (Avatar) des Schülers.
    * Bei vorhandenem Bild gibt es ein kleines Kreuz-Icon, um das Bild zu löschen.
    * Button `Foto auswählen` (mit Kamera-Icon) zum Auswählen eines neuen Bildes.
    * Das ausgewählte Bild wird direkt im Browser auf maximal **120x120 Pixel** herunterskaliert, mit einer JPEG-Qualität von **70 %** komprimiert und als Base64-Daten-URL im Feld `photoBase64` gespeichert. Dies spart Speicherplatz in Firestore und vermeidet zusätzliche Speichergebühren.
* **Felder:**
    * Input: `Vorname`
    * Input: `Nachname`
* **Buttons:**
    * `Speichern`: Ruft die entsprechende Update-Funktion in `serviceFirebase` auf und speichert die Daten (inkl. `photoBase64`) in Firestore.
    * `Abbrechen`: Schließt das Fenster ohne Speichern.

### 5.2 Löschen bestätigen
* **Auslöser:** Klick auf das Mistkübel-Icon.
* **Nachricht:** "Wollen Sie den Schüler {Vorname} {Nachname} wirklich löschen?"
* **Buttons:**
    * `Ja` (Farbe: **Grün**): Ruft die Lösch-Funktion in `serviceFirebase` auf.
    * `Nein` (Farbe: **Rot**): Bricht den Vorgang ab.