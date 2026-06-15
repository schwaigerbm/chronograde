# Spezifikation: Schüler-Zuweisung (`EnrollmentModal`)

## 1. Übersicht & Ziel
Dieses Pflichtenheft beschreibt die ausgelagerte Komponente `EnrollmentModal`, welche zur Zuweisung von Schülern zu einer Benotungsgruppe (Course) dient. Der Fokus liegt auf einer effizienten und unterbrechungsfreien Tastaturbedienung (Keyboard-only Workflow) für das schnelle Einschreiben mehrerer Schüler.

---

## 2. Benutzeroberfläche (UI)
Das Modal öffnet sich als zentriertes Overlay über der Gruppenverwaltung:
* **Titel:** `Schüler-Zuweisung: [Gruppenname]`
* **Suchfeld (Such-Input):**
  * Ein Textfeld zur Eingabe von Suchbegriffen (Vorname oder Nachname).
  * Erhält beim Öffnen des Modals automatisch den Fokus.
* **Suchergebnisse (Dropdown):**
  * Zeigt bis zu 5 Schüler an, die noch nicht in der Gruppe eingeschrieben sind und auf den Suchbegriff passen.
  * Das Dropdown schwebt absolut positioniert über dem restlichen Inhalt.
* **Teilnehmerliste:**
  * Eine Liste der aktuell der Gruppe zugewiesenen Schüler (mit laufender Nummer, Name, Sortier-Buttons für Reihenfolge und Entfernen-Button).

---

## 3. Keyboard-Navigation & Bulk-Zuweisung
Um Schüler ohne Mausnutzung schnell der Reihe nach zuzuweisen, wird folgende Steuerung implementiert:

### 3.1 Dropdown-Navigation mit Pfeiltasten
1. Während der Benutzer im Suchfeld tippt, erscheinen passende Schüler im Dropdown-Menü.
2. Durch Drücken von **`Pfeil-Unten` (`ArrowDown`)** wandert die optische Markierung (Highlighting) im Dropdown zeilenweise nach unten.
3. Durch Drücken von **`Pfeil-Oben` (`ArrowUp`)** wandert die Markierung wieder nach oben.
4. Die Standardaktion der Pfeiltasten im Textfeld (Cursor-Bewegung an den Anfang/das Ende) wird dabei unterdrückt (`e.preventDefault()`).

### 3.2 Zuweisung per Enter
1. Ist ein Schüler im Dropdown markiert, wird dieser durch Drücken der **`Enter`-Taste** der Gruppe hinzugefügt.
2. Der Schüler wird der Teilnehmerliste angefügt und im Backend gespeichert.

### 3.3 Automatisches Zurücksetzen & Re-Fokus (Such-Ablauf)
1. Unmittelbar nach dem Hinzufügen (via `Enter` oder Klick) wird:
   * Das Suchfeld geleert (Suchbegriff gelöscht).
   * Das Dropdown-Menü geschlossen.
   * Der Fokus (Cursor) automatisch wieder direkt in das Suchfeld gesetzt.
2. Der Benutzer kann sofort den nächsten Namen eintippen, ohne die Tastatur zu verlassen oder zur Maus zu greifen.

### 3.4 Abbrechen / Schließen
* Die **`ESC`-Taste** schließt das Modal oder das geöffnete Such-Dropdown.
* Der Button **„Fertig“** im Footer schließt das Modal.
