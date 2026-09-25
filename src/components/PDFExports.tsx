import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  pdf,
  Image
} from '@react-pdf/renderer';
import type { Course, Student, CourseEntry, Grade, GradeEntry, JournalEntry } from '../schema';
import { formatDate } from '../lib/utils';


// Helper to calculate collaboration percentage
const getCollaborationPercentage = (entries?: GradeEntry[], cutoffDate?: string): number | null => {
  if (!entries || entries.length === 0) return null;
  const filtered = cutoffDate 
    ? entries.filter(entry => entry.date <= cutoffDate)
    : entries;
  if (filtered.length === 0) return null;
  const totalPoints = filtered.reduce((sum, entry) => {
    if (entry.value === '+') return sum + 1;
    if (entry.value === '~') return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((totalPoints / filtered.length) * 100);
};

// Helper to calculate presence percentage
const getPresencePercentage = (entries?: GradeEntry[]): number | null => {
  if (!entries || entries.length === 0) return null;
  const totalHours = entries.reduce((sum, entry) => sum + (entry.hours || 1), 0);
  const presentHours = entries.reduce((sum, entry) => {
    return sum + (entry.value === 'check' ? (entry.hours || 1) : 0);
  }, 0);
  return Math.round((presentHours / totalHours) * 100);
};

// Helper to calculate grades trend (Österreichischer Notenschlüssel)
const getTrendGrade = (percent: number): { grade: number; label: string } => {
  if (percent >= 90) return { grade: 1, label: 'Sehr gut' };
  if (percent >= 80) return { grade: 2, label: 'Gut' };
  if (percent >= 65) return { grade: 3, label: 'Befriedigend' };
  if (percent >= 50) return { grade: 4, label: 'Genügend' };
  return { grade: 5, label: 'Nicht genügend' };
};

const calculateAverage = (
  studentId: string,
  columns: CourseEntry[],
  grades: Record<string, Record<string, Grade>>,
  cutoffDate?: string,
  roundingRule: 'commercial' | 'studentFriendly' = 'commercial',
  collaborationCalcMode: 'linear' | 'weighted' = 'weighted'
): { percent: number | null; grade: number | null } => {
  const activeCols = columns.filter(c => {
    if (!c.calc || c.type === 'calculated' || c.type === 'presenceSum' || c.type === 'groupAssignment') return false;
    if (cutoffDate && c.date > cutoffDate) return false;
    return true;
  });

  if (activeCols.length === 0) return { percent: null, grade: null };

  let totalWeight = 0;
  let weightedSum = 0;

  activeCols.forEach(col => {
    const grade = grades[studentId]?.[col.id];
    let val: number | null = null;

    if (col.type === 'manual') {
      if (grade?.value !== undefined && grade.value !== '') {
        if (col.calcType === 'percent') {
          val = Number(grade.value);
        } else if (col.calcType === 'grade') {
          const g = Number(grade.value);
          val = g === 1 ? 100 : g === 2 ? 85 : g === 3 ? 70 : g === 4 ? 55 : 30;
        } else if (col.calcType === 'sign') {
          const s = grade.value;
          val = s === '+' ? 100 : s === '~' ? 60 : 30;
        }
      }
    } else if (col.type === 'collaborationSum') {
      const p = getCollaborationPercentage(
        grade?.entries, 
        collaborationCalcMode === 'weighted' ? undefined : cutoffDate
      );
      if (p !== null) val = p;
    }

    if (val !== null) {
      const w = col.calcFactor || 0;
      weightedSum += val * w;
      totalWeight += w;
    }
  });

  if (totalWeight === 0) return { percent: null, grade: null };

  let rawPercent = weightedSum / totalWeight;
  let percent = 0;

  if (roundingRule === 'studentFriendly') {
    percent = Math.ceil(rawPercent);
  } else {
    percent = Math.round(rawPercent);
  }

  const t = getTrendGrade(percent);
  return { percent, grade: t.grade };
};

// PDF Styles
const styles = StyleSheet.create({
  // Common
  pageLandscape: { 
    paddingTop: 25, 
    paddingBottom: 35, 
    paddingHorizontal: 25, 
    fontSize: 8, 
    fontFamily: 'Helvetica', 
    backgroundColor: '#ffffff' 
  },
  pagePortrait: { 
    paddingTop: 30, 
    paddingBottom: 40, 
    paddingHorizontal: 35, 
    fontSize: 10, 
    fontFamily: 'Helvetica', 
    backgroundColor: '#ffffff' 
  },
  header: { 
    marginBottom: 12, 
    borderBottomWidth: 2, 
    borderBottomColor: '#2563eb', 
    borderBottomStyle: 'solid', 
    paddingBottom: 8 
  },
  appTitle: { fontSize: 9, color: '#2563eb', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 3 },
  subtitle: { fontSize: 9, color: '#64748b' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, fontSize: 8, color: '#475569' },
  
  // Table styles
  table: { width: '100%', borderStyle: 'solid', borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 4, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', borderBottomColor: '#e2e8f0', borderBottomWidth: 1, borderBottomStyle: 'solid', alignItems: 'center', minHeight: 22 },
  tableRowHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottomColor: '#94a3b8', borderBottomWidth: 1.5, borderBottomStyle: 'solid', alignItems: 'center', minHeight: 24 },
  
  th: { paddingVertical: 4, paddingHorizontal: 3, fontFamily: 'Helvetica-Bold', color: '#1e293b', borderRightColor: '#cbd5e1', borderRightWidth: 1, borderRightStyle: 'solid' },
  td: { paddingVertical: 4, paddingHorizontal: 3, color: '#0f172a', borderRightColor: '#e2e8f0', borderRightWidth: 1, borderRightStyle: 'solid' },
  
  // Specific table columns width for Matrix
  colNr: { width: '4%', textAlign: 'center' },
  colStudent: { width: '22%', fontFamily: 'Helvetica-Bold' },
  colGrade: { width: '8%', textAlign: 'center' },
  colTrend: { width: '10%', textAlign: 'center', backgroundColor: '#eff6ff', fontFamily: 'Helvetica-Bold' },
  
  // Student report card specific
  summaryBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'solid', borderRadius: 6, padding: 12, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', marginBottom: 3 },
  summaryValue: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#2563eb' },
  summaryPercent: { fontSize: 9, color: '#64748b', marginTop: 2 },
  
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 8, marginTop: 12 },
  
  // Specific columns for Student report card
  colCardTitle: { width: '30%', fontFamily: 'Helvetica-Bold' },
  colCardDate: { width: '15%' },
  colCardType: { width: '15%' },
  colCardValue: { width: '15%', textAlign: 'center' },
  colCardNote: { width: '25%' },
  
  // Specific columns for Grade composition table
  colCompTitle: { width: '40%', fontFamily: 'Helvetica-Bold' },
  colCompWeight: { width: '20%', textAlign: 'center' },
  colCompValue: { width: '20%', textAlign: 'center' },
  colCompContrib: { width: '20%', textAlign: 'center' },
  
  // Sub-entries for collaboration/presence
  subEntriesContainer: { paddingLeft: 10, paddingVertical: 4, backgroundColor: '#f8fafc', borderTopColor: '#f1f5f9', borderTopWidth: 1, borderTopStyle: 'solid' },
  subEntryRow: { flexDirection: 'row', fontSize: 8, color: '#475569', marginVertical: 2 },
  subEntryDot: { width: 12, height: 12, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginRight: 6, fontSize: 7, fontFamily: 'Helvetica-Bold' },
  subEntryText: { flex: 1 }
});

// Helper for type label
const getTypeLabel = (type: CourseEntry['type']): string => {
  switch (type) {
    case 'manual': return 'Note/Wert';
    case 'collaborationSum': return 'Mitarbeit';
    case 'presenceSum': return 'Anwesenheit';
    case 'groupAssignment': return 'Gruppe';
    case 'calculated': return 'Meilenstein';
    default: return type;
  }
};

// 1. Matrix PDF Document Component
export const MatrixPDFDocument = ({
  course,
  students,
  grades,
  visibleColumns,
  showTrend = true
}: {
  course: Course;
  students: Student[];
  grades: Record<string, Record<string, Grade>>;
  visibleColumns: CourseEntry[];
  showTrend?: boolean;
}) => {
  const actualShowTrend = (course.showTrend !== false) && showTrend;
  const colCount = visibleColumns.length;
  
  // Dynamic column sizing and typography based on count of selected assessment columns
  let gradeColWidthPercent = 0;
  if (colCount > 0) {
    const remainingPercent = actualShowTrend ? 64 : 74;
    gradeColWidthPercent = remainingPercent / colCount;
  }
  const gradeColWidth = `${gradeColWidthPercent}%`;

  // Scale font size and padding dynamically if there are many columns
  const fontSize = colCount > 12 ? 6.5 : colCount > 8 ? 7.5 : 8;
  const cellPaddingVertical = colCount > 12 ? 3 : 4;
  const cellPaddingHorizontal = colCount > 12 ? 2 : 4;

  const dynamicThStyle = {
    ...styles.th, 
    fontSize: fontSize - 0.5, 
    paddingVertical: cellPaddingVertical, 
    paddingHorizontal: cellPaddingHorizontal 
  };
  const dynamicTdStyle = {
    ...styles.td, 
    fontSize, 
    paddingVertical: cellPaddingVertical, 
    paddingHorizontal: cellPaddingHorizontal 
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.pageLandscape}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>CHRONOGRADE</Text>
          <Text style={styles.title}>Leistungsbeurteilung: {course.name}</Text>
          <Text style={styles.subtitle}>Schuljahr: {course.year} | Anzahl Schüler: {students.length}</Text>
          <View style={styles.metaRow}>
            <Text>Erstellt am: {new Date().toLocaleDateString('de-DE')}</Text>
          </View>
        </View>

        {/* Matrix Table */}
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tableRowHeader}>
            <Text style={[styles.th, styles.colNr, { fontSize: fontSize - 0.5, paddingVertical: cellPaddingVertical }]}>#</Text>
            <Text style={[styles.th, styles.colStudent, { fontSize: fontSize - 0.5, paddingVertical: cellPaddingVertical }]}>Schüler</Text>
            
            {colCount === 0 ? (
              <Text style={[styles.th, { flex: 1, textAlign: 'center', fontSize }]}>
                Keine Beurteilungsspalten gewählt
              </Text>
            ) : (
              visibleColumns.map(col => (
                <Text 
                  key={col.id} 
                  style={[dynamicThStyle, { width: gradeColWidth, textAlign: 'center' }]}
                >
                  {col.title}
                </Text>
              ))
            )}

            {actualShowTrend && (
              <Text style={[styles.th, styles.colTrend, { fontSize: fontSize - 0.5, paddingVertical: cellPaddingVertical }]}>
                TREND
              </Text>
            )}
          </View>

          {/* Student Rows */}
          {students.map((student, index) => {
            const isDeregistered = Boolean(course.deregisteredStudents?.includes(student.id));
            const liveSummary = isDeregistered 
              ? { grade: null, percent: null }
              : calculateAverage(
                  student.id, 
                  course.columns, 
                  grades, 
                  undefined, 
                  course.roundingRule || 'commercial', 
                  course.collaborationCalcMode || 'weighted'
                );
            
            return (
              <View 
                key={student.id} 
                style={[
                  styles.tableRow,
                  index % 2 === 1 ? { backgroundColor: '#f8fafc' } : { backgroundColor: '#ffffff' },
                  isDeregistered ? { opacity: 0.55 } : {}
                ]}
                wrap={false}
              >
                <Text style={[styles.td, styles.colNr, { color: '#64748b', fontSize }]}>{index + 1}</Text>
                <Text style={[styles.td, styles.colStudent, { fontSize }]}>
                  {student.lastName}, {student.firstName}
                  {isDeregistered ? ' (abgemeldet)' : ''}
                </Text>
                
                {colCount === 0 ? (
                  <Text style={[styles.td, { flex: 1, textAlign: 'center', fontSize, color: '#94a3b8' }]}>-</Text>
                ) : (
                  visibleColumns.map(col => {
                    let grade = grades[student.id]?.[col.id];
                    
                    if (col.type === 'calculated' && (!grade || !grade.isOverridden)) {
                      const calculated = isDeregistered
                        ? { grade: null }
                        : calculateAverage(
                            student.id, 
                            course.columns, 
                            grades, 
                            col.cutoffDate, 
                            course.roundingRule || 'commercial', 
                            course.collaborationCalcMode || 'weighted'
                          );
                      grade = { 
                        value: calculated.grade || undefined
                      };
                    }

                    let displayValue = '';
                    if (isDeregistered) {
                      displayValue = '-';
                    } else if (grade?.value !== undefined && grade.value !== '') {
                      displayValue = String(grade.value);
                    } else if (col.type === 'collaborationSum') {
                      const p = getCollaborationPercentage(grade?.entries);
                      displayValue = p !== null ? `${p}%` : '-';
                    } else if (col.type === 'presenceSum') {
                      const p = getPresencePercentage(grade?.entries);
                      displayValue = p !== null ? `${p}%` : '-';
                    } else {
                      displayValue = '-';
                    }

                    return (
                      <Text 
                        key={col.id} 
                        style={[
                          dynamicTdStyle, 
                          { width: gradeColWidth, textAlign: 'center', color: isDeregistered ? '#94a3b8' : undefined }
                        ]}
                      >
                        {displayValue}
                      </Text>
                    );
                  })
                )}

                {actualShowTrend && (
                  <Text 
                    style={[
                      dynamicTdStyle, 
                      styles.colTrend, 
                      { 
                        color: (isDeregistered || !liveSummary.grade) ? '#94a3b8' : '#2563eb',
                        fontFamily: 'Helvetica-Bold'
                      }
                    ]}
                  >
                    {liveSummary.grade ? `${liveSummary.grade} (${liveSummary.percent}%)` : '-'}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Footer with page numbering */}
        <Text 
          style={{ position: 'absolute', bottom: 12, left: 25, right: 25, textAlign: 'center', fontSize: 7, color: '#94a3b8' }}
          render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages} • Chronograde Notenmatrix`}
          fixed
        />
      </Page>
    </Document>
  );
};

// 2. Student Report PDF Component
export const StudentReportPDFDocument = ({
  student,
  course,
  grades,
  visibleColumns
}: {
  student: Student;
  course: Course;
  grades: Record<string, Record<string, Grade>>;
  visibleColumns: CourseEntry[];
}) => {
  const liveSummary = calculateAverage(student.id, course.columns, grades, undefined, course.roundingRule || 'commercial', course.collaborationCalcMode || 'weighted');
  
  // 1. Gather all active columns for grade calculation
  const activeCols = visibleColumns.filter(c => {
    if (!c.calc || c.type === 'calculated' || c.type === 'presenceSum' || c.type === 'groupAssignment') return false;
    return true;
  });

  let totalWeight = 0;
  const compositionItems = activeCols.map(col => {
    const grade = grades[student.id]?.[col.id];
    let val: number | null = null;
    let displayVal = '-';

    if (col.type === 'manual') {
      if (grade?.value !== undefined && grade.value !== '') {
        if (col.calcType === 'percent') {
          val = Number(grade.value);
          displayVal = `${grade.value}%`;
        } else if (col.calcType === 'grade') {
          const g = Number(grade.value);
          val = g === 1 ? 100 : g === 2 ? 89 : g === 3 ? 79 : g === 4 ? 64 : 49;
          displayVal = `Note ${grade.value} (${val}%)`;
        } else if (col.calcType === 'sign') {
          const s = grade.value;
          val = s === '+' ? 100 : s === '~' ? 50 : 0;
          displayVal = `Zeichen ${grade.value} (${val}%)`;
        }
      }
    } else if (col.type === 'collaborationSum') {
      const p = getCollaborationPercentage(grade?.entries);
      if (p !== null) {
        val = p;
        displayVal = `${p}%`;
      }
    }

    if (val !== null) {
      const w = col.calcFactor !== undefined ? col.calcFactor : 100;
      totalWeight += w;
      return {
        title: col.title,
        weight: w,
        value: val,
        displayVal,
      };
    }
    return null;
  }).filter(item => item !== null) as { title: string; weight: number; value: number; displayVal: string }[];

  const compositionList = compositionItems.map(item => {
    const relWeight = totalWeight > 0 ? Math.round((item.weight / totalWeight) * 1000) / 10 : 0;
    const contrib = totalWeight > 0 ? Math.round((item.value * (item.weight / totalWeight)) * 10) / 10 : 0;
    return {
      title: item.title,
      relWeight,
      value: item.value,
      displayVal: item.displayVal,
      contrib
    };
  });

  // Get all active grades for the student
  const gradesList = visibleColumns.map(col => {
    let grade = grades[student.id]?.[col.id];
    
    if (col.type === 'calculated' && (!grade || !grade.isOverridden)) {
      const calculated = calculateAverage(student.id, course.columns, grades, col.cutoffDate, course.roundingRule || 'commercial', course.collaborationCalcMode || 'weighted');
      grade = { 
        value: calculated.grade || undefined,
        date: new Date().toISOString()
      };
    }

    return { col, grade };
  }).filter(item => item.grade !== undefined && item.grade !== null);

  return (
    <Document>
      <Page size="A4" style={styles.pagePortrait}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>CHRONOGRADE</Text>
          <Text style={styles.title}>Leistungsdatenblatt</Text>
          <Text style={styles.subtitle}>Kurs: {course.name} | Schuljahr: {course.year}</Text>
          <View style={styles.metaRow}>
            <Text>Erstellt am: {new Date().toLocaleDateString('de-DE')}</Text>
          </View>
        </View>

        {/* Student Box */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0f172a' }}>
              {student.lastName}, {student.firstName}
            </Text>
          </View>
          {student.photoBase64 && (
            <Image 
              src={student.photoBase64} 
              style={{ width: 60, height: 60, borderRadius: 30, objectFit: 'cover', borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'solid' }} 
            />
          )}
        </View>

        {/* Summary Dashboard */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Aktueller Trend</Text>
            <Text style={styles.summaryValue}>
              {liveSummary.grade ? String(liveSummary.grade) : '-'}
            </Text>
            <Text style={styles.summaryPercent}>
              {liveSummary.percent ? `${liveSummary.percent}%` : 'Keine Berechnungsdaten'}
            </Text>
          </View>

          {/* Show calculated milestones */}
          {visibleColumns.filter(c => c.type === 'calculated').map(ms => {
            let grade = grades[student.id]?.[ms.id];
            if (!grade || !grade.isOverridden) {
              const calculated = calculateAverage(student.id, course.columns, grades, ms.cutoffDate, course.roundingRule || 'commercial', course.collaborationCalcMode || 'weighted');
              grade = { value: calculated.grade || undefined };
            }
            return (
              <View key={ms.id} style={[styles.summaryItem, { borderLeftWidth: 1, borderLeftColor: '#e2e8f0', borderLeftStyle: 'solid' }]}>
                <Text style={styles.summaryLabel}>{ms.title}</Text>
                <Text style={styles.summaryValue}>
                  {grade?.value !== undefined ? String(grade.value) : '-'}
                </Text>
                <Text style={styles.summaryPercent}>
                  Stichtag: {ms.cutoffDate ? formatDate(ms.cutoffDate) : '-'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Grade Composition Section */}
        {compositionList.length > 0 && (
          <View style={{ marginBottom: 15 }}>
            <Text style={styles.sectionTitle}>Zusammensetzung der Gesamtnote (Gewichtung)</Text>
            <View style={styles.table}>
              {/* Header */}
              <View style={styles.tableRowHeader}>
                <Text style={[styles.th, styles.colCompTitle]}>Beurteilungsbereich (Prüfung/Mitarbeit)</Text>
                <Text style={[styles.th, styles.colCompWeight]}>Gewichtung</Text>
                <Text style={[styles.th, styles.colCompValue]}>Erreichte Leistung</Text>
                <Text style={[styles.th, styles.colCompContrib]}>Anteil an der Gesamtnote</Text>
              </View>

              {/* Rows */}
              {compositionList.map((item, idx) => (
                <View 
                  key={idx} 
                  style={[
                    styles.tableRow,
                    idx % 2 === 1 ? { backgroundColor: '#f8fafc' } : {}
                  ]}
                >
                  <Text style={[styles.td, styles.colCompTitle]}>{item.title}</Text>
                  <Text style={[styles.td, styles.colCompWeight]}>{item.relWeight}%</Text>
                  <Text style={[styles.td, styles.colCompValue]}>{item.displayVal}</Text>
                  <Text style={[styles.td, styles.colCompContrib]}>{item.contrib}%</Text>
                </View>
              ))}

              {/* Sum / Result Row */}
              <View style={[styles.tableRow, { backgroundColor: '#eff6ff', borderTopColor: '#cbd5e1', borderTopWidth: 1, borderTopStyle: 'solid' }]}>
                <Text style={[styles.td, styles.colCompTitle, { fontFamily: 'Helvetica-Bold', color: '#1e3a8a' }]}>
                  Gesamtergebnis (rechnerischer Schnitt)
                </Text>
                <Text style={[styles.td, styles.colCompWeight, { fontFamily: 'Helvetica-Bold', color: '#1e3a8a' }]}>
                  100.0%
                </Text>
                <Text style={[styles.td, styles.colCompValue, { fontFamily: 'Helvetica-Bold', color: '#1e3a8a' }]}>
                  -
                </Text>
                <Text style={[styles.td, styles.colCompContrib, { fontFamily: 'Helvetica-Bold', color: '#1e3a8a' }]}>
                  {liveSummary.percent}% (Note {liveSummary.grade})
                </Text>
              </View>
            </View>

            {/* Explanation text */}
            <Text style={{ fontSize: 7, color: '#64748b', marginTop: 4, fontStyle: 'italic', lineHeight: 1.2 }}>
              * Berechnungshilfe: Multiplizieren Sie die "Erreichte Leistung" mit der "Gewichtung", um den "Anteil an der Gesamtnote" zu erhalten (Beispiel: 90% Leistung x 40% Gewichtung = 36% Anteil). Die Summe aller Anteile ergibt das Gesamtergebnis.
            </Text>

            {/* Grade key box */}
            <View style={{ marginTop: 6, paddingVertical: 5, paddingHorizontal: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'solid', borderRadius: 4, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#334155' }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', color: '#0f172a' }}>Notenschlüssel (Österreich):</Text>
              <Text>1 (Sehr gut) ≥ 90%</Text>
              <Text>2 (Gut) ≥ 80%</Text>
              <Text>3 (Befriedigend) ≥ 65%</Text>
              <Text>4 (Genügend) ≥ 50%</Text>
              <Text>5 (Nicht genügend) &lt; 50%</Text>
            </View>
          </View>
        )}

        {/* Details Table */}
        <Text style={styles.sectionTitle}>Aufstellung der Einzelbeurteilungen</Text>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableRowHeader}>
            <Text style={[styles.th, styles.colCardTitle]}>Beurteilung</Text>
            <Text style={[styles.th, styles.colCardDate]}>Datum</Text>
            <Text style={[styles.th, styles.colCardType]}>Typ</Text>
            <Text style={[styles.th, styles.colCardValue]}>Ergebnis</Text>
            <Text style={[styles.th, styles.colCardNote]}>Notiz / Kommentar</Text>
          </View>

          {/* Table Rows */}
          {gradesList.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ fontStyle: 'italic', color: '#64748b' }}>Keine Einträge für diesen Schüler vorhanden.</Text>
            </View>
          ) : (
            gradesList.map(({ col, grade }) => {
              let displayValue = '';
              if (grade?.value !== undefined && grade.value !== '') {
                if (col.calcType === 'sign') {
                  displayValue = `Zeichen ${grade.value}`;
                } else {
                  displayValue = String(grade.value);
                }
              } else if (col.type === 'collaborationSum') {
                const p = getCollaborationPercentage(grade?.entries);
                displayValue = p !== null ? `${p}%` : '-';
              } else if (col.type === 'presenceSum') {
                const p = getPresencePercentage(grade?.entries);
                displayValue = p !== null ? `${p}%` : '-';
              } else {
                displayValue = '-';
              }

              const displayNote = grade?.note || '';
              let dateStr = col.type === 'calculated' 
                ? (col.cutoffDate ? formatDate(col.cutoffDate) : '') 
                : (col.date ? formatDate(col.date) : '');

              if (grade?.date) {
                dateStr = formatDate(grade.date) + (grade.time ? ` ${grade.time}` : '');
              }

              return (
                <View key={col.id} style={{ flexDirection: 'column', borderBottomColor: '#e2e8f0', borderBottomWidth: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 24 }}>
                    <Text style={[styles.td, styles.colCardTitle]}>{col.title}</Text>
                    <Text style={[styles.td, styles.colCardDate]}>{dateStr}</Text>
                    <Text style={[styles.td, styles.colCardType]}>{getTypeLabel(col.type)}</Text>
                    <Text style={[styles.td, styles.colCardValue, { fontFamily: 'Helvetica-Bold' }]}>{displayValue}</Text>
                    <Text style={[styles.td, styles.colCardNote]}>{displayNote || '-'}</Text>
                  </View>

                  {/* List of sub-entries for collaboration/presence */}
                  {(col.type === 'collaborationSum' || col.type === 'presenceSum') && grade?.entries && grade.entries.length > 0 && (
                    <View style={styles.subEntriesContainer}>
                      {grade.entries.map(sub => {
                        let dotColor = '#64748b'; // Gray for neutral
                        let displaySymbol = '~';

                        if (col.type === 'collaborationSum') {
                          if (sub.value === '+') { dotColor = '#16a34a'; displaySymbol = '+'; }
                          else if (sub.value === '-') { dotColor = '#dc2626'; displaySymbol = '-'; }
                        } else if (col.type === 'presenceSum') {
                          if (sub.value === 'check') { dotColor = '#16a34a'; displaySymbol = '✔'; }
                          else { dotColor = '#dc2626'; displaySymbol = '✘'; }
                        }

                        const hoursLabel = sub.hours ? ` (${sub.hours} Std.)` : '';

                        return (
                          <View key={sub.id} style={styles.subEntryRow}>
                            <View style={[styles.subEntryDot, { backgroundColor: dotColor }]}>
                              <Text>{displaySymbol}</Text>
                            </View>
                            <Text style={styles.subEntryText}>
                              {formatDate(sub.date)}{hoursLabel}: {sub.note || (col.type === 'presenceSum' ? (sub.value === 'check' ? 'Anwesend' : 'Abwesend') : 'Kein Kommentar')}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </Page>
    </Document>
  );
};

// Export triggers
export const exportMatrixPDF = async (
  course: Course,
  students: Student[],
  grades: Record<string, Record<string, Grade>>,
  visibleColumns: CourseEntry[],
  showTrend?: boolean
) => {
  try {
    const doc = (
      <MatrixPDFDocument 
        course={course}
        students={students}
        grades={grades}
        visibleColumns={visibleColumns}
        showTrend={showTrend}
      />
    );
    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Chronograde_Matrix_${course.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting Matrix PDF:", error);
  }
};

export const exportStudentReportPDF = async (
  student: Student,
  course: Course,
  grades: Record<string, Record<string, Grade>>,
  visibleColumns: CourseEntry[]
) => {
  try {
    const doc = (
      <StudentReportPDFDocument 
        student={student}
        course={course}
        grades={grades}
        visibleColumns={visibleColumns}
      />
    );
    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Chronograde_Report_${student.lastName}_${student.firstName}_${new Date().toISOString().split('T')[0]}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting Student PDF:", error);
  }
};

const stripHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n• ')
    .replace(/<[^>]+>/g, '')
    .trim();
};

export const JournalPDFDocument = ({
  course,
  entries
}: {
  course: Course;
  entries: JournalEntry[];
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.pagePortrait}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>CHRONOGRADE</Text>
          <Text style={styles.title}>Kurs-Journal: {course.name}</Text>
          <Text style={styles.subtitle}>Schuljahr: {course.year} | Einträge: {entries.length}</Text>
          <View style={styles.metaRow}>
            <Text>Erstellt am: {new Date().toLocaleDateString('de-DE')}</Text>
          </View>
        </View>

        {/* Entries List */}
        {entries.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ fontStyle: 'italic', color: '#64748b' }}>Keine Journaleinträge für diesen Kurs vorhanden.</Text>
          </View>
        ) : (
          entries.map((entry, idx) => (
            <View 
              key={entry.id || idx} 
              style={{ 
                marginBottom: 12, 
                padding: 10, 
                backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff', 
                borderRadius: 6, 
                borderWidth: 1, 
                borderColor: '#e2e8f0' 
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingBottom: 4 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a' }}>
                  {entry.title}
                </Text>
                <Text style={{ fontSize: 9, color: '#2563eb', fontFamily: 'Helvetica-Bold' }}>
                  {formatDate(entry.date)}
                </Text>
              </View>
              <Text style={{ fontSize: 9, color: '#334155', lineHeight: 1.4 }}>
                {stripHtml(entry.content) || '(Kein Text)'}
              </Text>
            </View>
          ))
        )}
      </Page>
    </Document>
  );
};

export const exportJournalPDF = async (
  course: Course,
  entries: JournalEntry[]
) => {
  try {
    const doc = (
      <JournalPDFDocument 
        course={course}
        entries={entries}
      />
    );
    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Chronograde_Journal_${course.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting Journal PDF:", error);
  }
};

