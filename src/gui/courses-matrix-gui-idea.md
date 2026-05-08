


* Hier wird die Notentabelle dargestellt. Anahd der vorherigen Gruppe (course) werden die definierten Schüler in Zeilen angezeit. Die Beurteilungen sind die jeweiligen Spalten. Dort wo sich die Zeile und die Spalte treffen kann eine Note (grade) eingetragen werden.

* Oben ist eine Überschrift mit "Leistungsbeurteilung"
* Unterüberschrift mit dem Namen der Gruppe "course"
* Nebenbei die Möglichkeit durch einen Button Beurteilungsspalten hinzuzufügen (Course Entry). Dann Modal mit Dialog über mehreren Seiten:
    1.) Auswahl mit einem Radio Button ob Gruppenzuordnung (type=groupAssignment) Manueller Name (type=manual), Mitarbeit (collaborationSum) oder Anwesenheit (presenceSum)
        
    2.) Wenn Gruppenzuordnung, dann kein weiter Button sonder ein speichern Button. Bei der gewählten Gruppenzuordnung ist der Dialog gleich beendet. Es gibt dann eine Spalte mit Gruppe (horizontal geschrieben). Bei jedem Schüler kann mit einem Klick in die Zelle gleich eine Zahl eingegeben werden, bei einem herausklicken wird die Zahl gespeichert. Erlaubt sind nur Zahlen von 1-9. Dies ist eine Grade, die Gruppenzuordnung ist Value. Beim speichern das aktuelle datum auch im Grade eintrag eintragen.

    3.)   Wenn Manueller Name gewählt wird muss ein Name (Bspw. "1. Test WW" = titel) das Datum (mit Auswahlfeld) eingegeben werden. Und Welchen Berechnungstype man möchte mit Radio Button (Prozent = percent, Note = grade oder Zeichen = sign)Auch ob der EIntrag in die Berechnung mitaufgenommen werden muss (Schalter EIN/AUS) und welchen EInfluss der EIntrag hat (Regler von 0-100%). Es gibt dann eine Spalte mit dem Namen (horizontal geschrieben). Bei jedem Schüler erscheint bei einem Klick auf die Zelle ein kleines Mausmenü. Bei diesem kann ausgewählt werden: Bei percent einen Schieberegler von 0-100%, bei grade die Schulnoten zum auswählen zwischen (1-Sehr Gut, 2-Gut, 3-Befriedigend, 4-Genügend und 5-Nicht Genügend). Bei sign kann zwischen den Symbolen (+,- und ~) ausgewählt werden.

    4.) Wenn Mitarbeit (collaborationSum) gewählt wurde, so keine weiteren Dialog mehr. Es gibt sofort nach speichern eine Spalte mit "Mitarbeit" horizontale Schreibweise. Pro Schüler erscheint dann bei einem Hover der Zelle ein Mausmenü mit der Auswahl von den Zeichen +, - und ~. Sobalt eines definiert wurde, so erscheint die Notwendigkeit eine Notiz (zB.: "Lautes Schwätzen") einzugeben. Auch kann das Datum optional verändert werden. Wenn nicht verwende das aktuelle Datum. Das ist dan eine Grade. Es ist hierbei Möglich weitere "Mitarbeitszeichen (+,- und ~)" hizuzufügen. Bei einenm Schüler (in einer ZElle) sind immer alle Zeichen nach der Reihe in der Zelle sichtbar. Wenn man mit der Maus darüber fährt, so sieht man die Notiz. Unerhalb der Notiz kann man das Mitarbeitszeichen auch löschen. Sollten bei einem Schüler (egal welchen) mindestens 4 Mitarbeitszeichen hinzugefügt worden, so wird die Spaltenbezeichnung waagrecht dargestellt. In der Zelle sollen alle Zeichen die "+" sind mit grün angezeicht werden. Die Zeichen mit "~" mit der farbe organe und die "-" zeichen in rot.

    5.) Wenn Anwesenheit (prsenceSum) gewählt wurde ist der Ablauf ähnlich wie der der Mitarbeit. Es gibt sofort nach speichern eine Spalte mit "Anwesenheit" in horizontaler Schreibweise. In der Spaltenbezeichnung kann nebenbei gewählt werden ob die Anwesenheit ausgebelgende oder angezeicht werden soll (Mit Pfeilbutton nach links oder rechts). Sollte sie ausgebledent werden, wird jede Zelle nur grau ohne Inhalt dargestellt. Wird sie eingebeldet so die Anwesenheit mit Zeichen in der Zelle. Pro Schüler erscheint dann bei einem Hover der Zelle eine Mausmenü mit der Auswahl von den Zeichen "Häckchen" oder "X". Eine Notitz ist da nicht vorhanden. Das Datum kann optional verstellt werden. In einer Zelle sind alle Zeichen nach der Reihe von links nach rechts dargestellt. Diese sind chronologisch nach dem Datum immer von links nach rechts geordnet. Bei einem Hover auf ein Zeichen wird das Datum angezeit. Am Ende der zeichen ist eine Zusammenfassung der Anwesenheit in Form einer "Schrägstrichvariante" (Zum Beispiel: 3 von 4 = 3/4 was den Häckchen oder den X und etnspricht) 
 













* Vor der IImplementierung check das Schema und die ServiceClasse und ergänze diese bzw. bau das so um, dass diese GUI Spezifikation und alle andere Spezifizkationen funktionieren