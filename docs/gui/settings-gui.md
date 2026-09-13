# Spezifikation: Einstellungen (Settings)

## 1. Übersicht & Struktur
Die Einstellungsansicht bietet Konfigurationsmöglichkeiten für die Anwendung. Sie ist über den Navigationspunkt "Einstellungen" in der Sidebar erreichbar.

Die Ansicht ist in zwei Tabs unterteilt:
1. **Bewertungsvorgaben:** Verwaltung der vorgefertigten Kommentare für die Mitarbeit.
2. **Benutzerpräferenzen:** Verwaltung von UI-spezifischen Präferenzen (z. B. Avatar-Sichtbarkeit).

## 2. Tab: Bewertungsvorgaben (Vorgefertigte Kommentare)
Hier können Lehrer vorgefertigte Kommentare für die drei Bewertungszeichen der Mitarbeit (`+`, `~`, `-`) verwalten.

### 2.1 Benutzeroberfläche (UI)
* **Tab/Bereichs-Überschrift:** `Mitarbeitskommentare verwalten`
* **Beschreibung:** Ein Hinweistext, der erklärt, dass diese Kommentare bei der Notenvergabe in der Matrix schnell ausgewählt werden können.
* **Erstellungs-Formular:**
  * **Zeichen-Auswahl:** Button-Gruppe oder Dropdown zur Auswahl des Typs (`+`, `~`, `-`).
  * **Textfeld:** Eingabefeld für den Kommentar (z. B. "Sehr aktive Beteiligung").
  * **Button:** `Kommentar hinzufügen` (Stil: Primär, Icon: `Plus`).
* **Kommentar-Listen (nach Zeichen gruppiert):**
  * Drei separate Spalten oder Sektionen für `+` (Grün), `~` (Gelb/Orange) und `-` (Rot).
  * **Einträge in der Liste:** Jeder Eintrag zeigt:
    * Den Kommentartext.
    * **Aktions-Buttons (Reihenfolge):** Pfeil-oben und Pfeil-unten Icons, um die Reihenfolge der Kommentare innerhalb dieses Zeichens zu verändern.
    * **Lösch-Button:** Trash-Icon zum Entfernen des Kommentars.
    * **Bearbeitungs-Button:** Edit-Icon, das den Text direkt in einem Inline-Eingabefeld oder einem modalen Dialog editierbar macht.

### 2.2 Datenmodell & Persistence
Die Einstellungen werden in Firestore in einem zentralen Dokument unter `/settings/collaboration` gespeichert:

```typescript
export interface PredefinedComment {
  id: string;
  text: string;
  type: '+' | '-' | '~';
}

export interface PredefinedCommentsSettings {
  comments: PredefinedComment[];
}
```

* Die Sortierreihenfolge in der UI entspricht exakt der Reihenfolge der Elemente im Array `comments` (nach Typ gefiltert).
* Änderungen (Hinzufügen, Löschen, Editieren, Verschieben) werden direkt via Service-Layer in Firestore persistiert.

---

## 3. Integration in die Notenmatrix (Notenvergabe)
Wenn der Lehrer in der Matrix auf ein Feld der Mitarbeit klickt (Typ `collaborationSum`), um eine neue Bewertung hinzuzufügen oder eine bestehende zu bearbeiten, öffnet sich das `CollaborationEntryModal`.

### 3.1 Anpassung des Modals
* **Größenänderung:** Das Modal wird breiter gestaltet (z. B. `min-width: 450px` oder zweispaltiges Layout), um Platz für die Schnellauswahl zu bieten.
* **Schnellauswahl-Bereich:**
  * Unterhalb oder rechts neben der Zeichenauswahl werden die vorgefertigten Kommentare angezeigt, die dem aktuell ausgewählten Zeichen (`+`, `~` oder `-`) entsprechen.
  * Wechselt der Lehrer das Zeichen im Modal, aktualisiert sich die Liste der angezeigten vorgefertigten Kommentare sofort.
* **Interaktion:**
  * Klick auf einen vorgefertigten Kommentar übernimmt diesen Text direkt in das Feld "Notiz".
  * Der Lehrer kann den Text danach bei Bedarf immer noch manuell anpassen oder ergänzen.
  * Das Abschicken des Formulars speichert den Eintrag wie gewohnt.

---

## 4. Tab: Benutzerpräferenzen (UI-Präferenzen)
Hier können Lehrer globale UI-Einstellungen verwalten, die im LocalStorage des Browsers persistiert werden.

### 4.1 Benutzeroberfläche (UI)
* **Tab/Bereichs-Überschrift:** `Benutzerpräferenzen`
* **Optionen:**
  * **Avatar-Sichtbarkeit:** Ein Toggle-Switch (Schalter) mit der Beschriftung `Schüler-Avatare anzeigen`. 
    * *Standard:* Aktiv (`true`).
    * *Funktion:* Bestimmt, ob in der Schülerübersicht und in der Matrix die kleinen runden Profilbilder der Schüler angezeigt werden.
* **Logik:** 
  * Änderungen an den Toggles werden sofort im `LocalStorage` gespeichert und auf die betroffenen Komponenten angewendet (ohne dass ein Speichern-Button gedrückt werden muss).

---

## 5. Tab: Aufgaben- & Terminkategorien (Kategorie-Verwaltung)
Hier können Lehrer eigene Kategorien für die Termin- und Aufgabenliste anlegen, bearbeiten und verwalten.

### 5.1 Eigenschaften einer Kategorie
* **Name:** Name/Bezeichnung der Kategorie.
* **Farbe:** Akzentfarbe (HEX oder Farbpalette).
* **Icon:** Icon-Auswahl (z. B. BookOpen, FileText, Calendar, AlertTriangle, Bookmark etc.).
* **Schutz-Status (`isFixed`):** 
  * **Sonderfall „Fehlzeiten“:** Die Kategorie `Fehlzeiten` ist **fix im System verankert** (nicht löschbar und nicht im Typ abänderbar), da sie direkt mit der automatischen Fehlzeiten-Abklärung verknüpft ist.
  * **Standard-Kategorien („Tests“, „Abgaben“, „Notizen“):** Sind im System vorangelegt, können aber flexibel angepasst (Name, Farbe, Icon verändert) oder gelöscht werden.
  * **Benutzerdefinierte Kategorien:** Neue Kategorien können frei angelegt, bearbeitet und gelöscht werden.

### 5.2 Benutzeroberfläche (UI)
* **Tab/Bereichs-Überschrift:** `Terminkategorien verwalten`
* **Formular:**
  * Eingabefeld für Kategorienamen, Icon-Picker und Farbauswahl.
  * Button `Kategorie hinzufügen`.
* **Kategorie-Liste:**
  * Übersicht aller aktiven Kategorien mit Farb-Badge, Icon, Name und System-Status (z. B. `Fixiert` bei Fehlzeiten).
  * Aktions-Buttons: `Bearbeiten` und `Löschen` (deaktiviert bei fixierten Kategorien).


