# Spezifikation: GUI Schülerverwaltung (Standalone Electron SQLite-Architektur)

## 1. Seitenstruktur & Header
Die Kopfzeile dient der Identifikation der Ansicht und bietet die primäre Aktion zum Erstellen neuer Datensätze.

* **Hauptüberschrift (H1):** `Schüler`
* **Unterüberschrift (H2):** `Verwaltung aller Schüler`
* **Aktions-Button:** Direkt rechts neben der Unterüberschrift platziert.
    * **Label:** `Hinzufügen`
    * **Stil:** Primär-Button (hervorgehoben).

## 2. Datenanbindung & Architektur
* **Backend:** Lokale SQLite-Datenbank (Tabelle: `students`).
* **Service-Layer:** Die GUI kommuniziert **nicht direkt** mit SQLite, sondern ausschließlich über die Service-Klasse `sqliteService` via Electron IPC.
* **Funktionsaufrufe:** 
    * Daten laden: `sqliteService.getStudents()`
    * Daten aktualisieren: `sqliteService.updateStudent(id, data)`
    * Daten löschen: `sqliteService.deleteStudent(id)`
    * Schüler hinzufügen: `sqliteService.addStudent(data)`

## 3. Suche & Filterung
* **Typ:** Live-Suche (Echtzeit-Filterung während der Eingabe).
* **Verhalten:** Die Tabelle filtert die über `sqliteService` bereitgestellten Daten sofort basierend auf den Übereinstimmungen im Vor- oder Nachnamen.
* **Avatar-Sichtbarkeit:** Die Anzeige der Profilbilder (Avatare) richtet sich nach der globalen Benutzerpräferenz in den Einstellungen (`showAvatars`). Ein lokaler Toggle im Suchbereich entfällt.

## 4. Daten-Tabelle
Anzeige der Schülerdatensätze aus der Tabelle `students` via `sqliteService`.

| Foto (Optional) | Vorname | Nachname | Aktionen |
| :--- | :--- | :--- | :--- |
| [Avatar] | [Vorname] | [Nachname] | 🔧 (Bearbeiten) 🗑️ (Löschen) |

### Aktions-Icons:
* **Schraubenschlüssel-Icon:** Öffnet den Bearbeitungs-Dialog.
* **Mistkübel-Icon:** Öffnet den Lösch-Bestätigungsdialog.

## 5. Dialog-Fenster (Modals)

**WICHTIGER UI-HINWEIS:** Es dürfen keine Browser-nativen Funktionen wie `alert()` oder `confirm()` verwendet werden. Alle Bestätigungen (z.B. beim Löschen) oder Fehlermeldungen müssen über App-interne, elegante Dialog-Fenster (Modals) realisiert werden.

Der Schüler-Dialog ist als eigenständige, wiederverwendbare React-Komponente (`StudentEditModal`) implementiert.

### 5.1 Schüler anlegen & bearbeiten (`StudentEditModal`)
* **Auslöser:** Klick auf den Button `Hinzufügen` im Header oder das Schraubenschlüssel-Icon in einer Tabellenzeile.
* **Profilbild-Sektion:**
    * Zeigt eine runde Bild-Vorschau (Avatar) des Schülers.
    * Bei vorhandenem Bild gibt es ein kleines Kreuz-Icon, um das Bild zu löschen.
    * Button `Foto auswählen` (mit Kamera-Icon) zum Auswählen eines lokalen Bildes.
    * Button **`Aus Zwischenablage einfügen`** (mit Clipboard-Icon) zum direkten Übernehmen eines aus dem Klassenbuch oder Web kopierten Bildes.
    * **Tastatur-Shortcut:** Drücken von `Ctrl+V` bei geöffnetem Schüler-Modal liest automatisch ein in der Zwischenablage befindliches Bild aus und setzt dieses als Profilbild.
    * Das ausgewählte/eingefügte Bild wird direkt in der Anwendung auf maximal **120x120 Pixel** herunterskaliert, mit einer JPEG-Qualität von **70 %** komprimiert und als Base64-Daten-URL im Feld `photoBase64` gespeichert.

* **Felder:**
    * Input: `Vorname` (erhält beim Öffnen automatisch den Fokus)
    * Input: `Nachname`
* **Keyboard-Ablauf & Bulk-Hinzufügen (Nur im Hinzufügen-Modus):**
    * Um ein schnelles Hinzufügen vieler Schüler ohne Mausbenutzung zu ermöglichen, gibt es im Hinzufügen-Modus einen zusätzlichen primären Button **„Speichern & Weiter“** (Submit-Button).
    * Der Ablauf ist vollständig über Tastatur bedienbar:
      1. Eingabe `Vorname` -> `Tab` -> Eingabe `Nachname`.
      2. Wird nach dem Ausfüllen des Nachnamens die `Tab`-Taste gedrückt, springt der Fokus direkt auf den Button **„Speichern & Weiter“**.
      3. Drücken der `Enter`-Taste (löst „Speichern & Weiter“ aus).
      4. Der Schüler wird im Backend gespeichert, die Eingabefelder werden geleert und der Fokus wird automatisch wieder zurück in das Feld `Vorname` gesetzt, um den nächsten Schüler zu erfassen.
      5. Um die Erfassung abzuschließen, kann der Benutzer per `Tab` auf **„Speichern & Schließen“** oder **„Abbrechen“** navigieren oder die `ESC`-Taste drücken.
* **Aktions-Buttons im Footer:**
    * **Im Hinzufügen-Modus:**
      * `Abbrechen` (Sekundär): Schließt das Fenster ohne zu speichern.
      * `Speichern & Schließen` (Sekundär): Speichert den Schüler und schließt das Modal.
      * `Speichern & Weiter` (Primär / Submit): Speichert den Schüler, leert die Felder und fokussiert den Vornamen.
    * **Im Bearbeiten-Modus:**
      * `Abbrechen` (Sekundär): Schließt das Fenster ohne zu speichern.
      * `Speichern` (Primär / Submit): Speichert die Änderungen und schließt das Modal.
* **Dubletten-Prüfung bei Vor- und Nachname:**
    * Beim Klicken auf „Speichern“ oder „Speichern & Weiter“ (oder Absenden des Formulars) wird geprüft, ob bereits ein Schüler mit der exakten Kombination aus Vorname und Nachname (bereinigt und case-insensitive) existiert.
    * **Verhalten bei „Speichern“ (Save & Close) und im Bearbeitungsmodus:**
        * Es erscheint ein kleiner Warnungs-Dialog: *"Schüler existiert bereits. Ein Schüler mit dem Namen ... ist bereits vorhanden."*
        * Nach dem Bestätigen der Meldung werden alle Dialoge geschlossen (es wird kein Duplikat erzeugt).
    * **Verhalten bei „Speichern & Weiter“ (Save & Continue):**
        * Es erscheint ebenfalls ein kleiner Warnungs-Dialog.
        * Dieser verschwindet automatisch nach 2 Sekunden (oder manuell bei Klick auf OK).
        * Danach wird ein neuer, leerer Hinzufügen-Dialog gestartet und der Eingabefokus direkt auf das Feld **„Vorname“** gelegt, um die nächste Erfassung zu ermöglichen (es wird kein Duplikat erzeugt).


### 5.2 Löschen bestätigen
* **Auslöser:** Klick auf das Mistkübel-Icon.
* **Nachricht:** "Wollen Sie den Schüler {Vorname} {Nachname} wirklich löschen?"
* **Buttons:**
    * `Ja` (Farbe: **Grün**): Ruft die Lösch-Funktion in `sqliteService.deleteStudent` auf.
    * `Nein` (Farbe: **Rot**): Bricht den Vorgang ab.

## 6. Lazy Loading & Paginierung
* **Standard-Limit:** Die Tabelle rendert initial maximal 50 Schüler, um die Ladezeit in der Anwendung und die Render-Performance gering zu halten.
* **Mehr laden Button:**
  * Befinden sich in der gefilterten Liste mehr Schüler als das aktuelle Limit, wird unter der Tabelle ein Button „Mehr laden“ angezeigt.
  * Klick auf diesen Button erhöht das Limit um jeweils 50 weitere Schüler.
* **Suche-Zurücksetzung:** Wenn der Benutzer den Suchbegriff ändert, wird das Limit wieder auf den Standardwert (50) zurückgesetzt, um die Render-Performance während des Tippens zu optimieren.