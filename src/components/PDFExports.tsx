import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  pdf,
  Image
} from '@react-pdf/renderer';
import type { Course, Student, CourseEntry, Grade, GradeEntry } from '../schema';
import { formatDate } from '../lib/utils';

// Helper to calculate collaboration percentage
const getCollaborationPercentage = (entries?: GradeEntry[]): number | null => {
  if (!entries || entries.length === 0) return null;
  const totalPoints = entries.reduce((sum, entry) => {
    if (entry.value === '+') return sum + 1;
    if (entry.value === '~') return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((totalPoints / entries.length) * 100);
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
  roundingRule: 'commercial' | 'studentFriendly' = 'commercial'
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
      const p = getCollaborationPercentage(grade?.entries);
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
  pageLandscape: { padding: 30, fontSize: 8, fontFamily: 'Helvetica', orientation: 'landscape' },
  pagePortrait: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: { marginBottom: 15, borderBottom: '2px solid #2563eb', paddingBottom: 10 },
  appTitle: { fontSize: 10, color: '#2563eb', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#64748b' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, fontSize: 8, color: '#475569' },
  
  // Table styles
  table: { width: '100%', borderStyle: 'solid', borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 6, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', borderBottomColor: '#e2e8f0', borderBottomWidth: 1, alignItems: 'center', minHeight: 24 },
  tableRowHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomColor: '#cbd5e1', borderBottomWidth: 1, alignItems: 'center', minHeight: 26 },
  
  th: { padding: 5, fontFamily: 'Helvetica-Bold', color: '#334155', borderRightColor: '#e2e8f0', borderRightWidth: 1 },
  td: { padding: 5, color: '#0f172a', borderRightColor: '#e2e8f0', borderRightWidth: 1 },
  
  // Specific table columns width for Matrix
  colNr: { width: '4%' },
  colStudent: { width: '22%', fontFamily: 'Helvetica-Bold' },
  colGrade: { width: '8%', textAlign: 'center' },
  colTrend: { width: '10%', textAlign: 'center', backgroundColor: '#eff6ff' },
  
  // Student report card specific
  summaryBox: { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 15, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 9, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#2563eb' },
  summaryPercent: { fontSize: 10, color: '#64748b', marginTop: 2 },
  
  sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 10, marginTop: 15 },
  
  // Specific columns for Student report card
  colCardTitle: { width: '30%', fontFamily: 'Helvetica-Bold' },
  colCardDate: { width: '15%' },
  colCardType: { width: '15%' },
  colCardValue: { width: '15%', textAlign: 'center' },
  colCardNote: { width: '25%' },
  
  // Sub-entries for collaboration/presence
  subEntriesContainer: { paddingLeft: 10, paddingVertical: 4, backgroundColor: '#f8fafc', borderTopColor: '#f1f5f9', borderTopWidth: 1 },
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
  // Calculate dynamic width for visible grade columns
  const gradeColWidth = actualShowTrend ? `${64 / colCount}%` : `${74 / colCount}%`;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.pageLandscape}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>Chronograde School Admin 2026</Text>
          <Text style={styles.title}>Leistungsbeurteilung: {course.name}</Text>
          <Text style={styles.subtitle}>Schuljahr: {course.year}</Text>
          <View style={styles.metaRow}>
            <Text>Erstellt am: {new Date().toLocaleDateString('de-DE')}</Text>
          </View>
        </View>

        {/* Matrix Table */}
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tableRowHeader}>
            <Text style={[styles.th, styles.colNr]}>#</Text>
            <Text style={[styles.th, styles.colStudent]}>Schüler</Text>
            {visibleColumns.map(col => (
              <Text 
                key={col.id} 
                style={[styles.th, { width: gradeColWidth, textAlign: 'center' }]}
              >
                {col.title}
              </Text>
            ))}
            {actualShowTrend && (
              <Text style={[styles.th, styles.colTrend, { fontFamily: 'Helvetica-Bold' }]}>TREND</Text>
            )}
          </View>

          {/* Student Rows */}
          {students.map((student, index) => {
            const liveSummary = calculateAverage(student.id, course.columns, grades, undefined, course.roundingRule || 'commercial');
            
            return (
              <View 
                key={student.id} 
                style={[
                  styles.tableRow,
                  index % 2 === 1 ? { backgroundColor: '#f8fafc' } : {}
                ]}
              >
                <Text style={[styles.td, styles.colNr, { color: '#64748b' }]}>{index + 1}</Text>
                <Text style={[styles.td, styles.colStudent]}>{student.lastName}, {student.firstName}</Text>
                
                {visibleColumns.map(col => {
                  let grade = grades[student.id]?.[col.id];
                  
                  if (col.type === 'calculated' && (!grade || !grade.isOverridden)) {
                    const calculated = calculateAverage(student.id, course.columns, grades, col.cutoffDate, course.roundingRule || 'commercial');
                    grade = { 
                      value: calculated.grade || undefined
                    };
                  }

                  let displayValue = '';
                  if (grade?.value !== undefined && grade.value !== '') {
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
                      style={[styles.td, { width: gradeColWidth, textAlign: 'center' }]}
                    >
                      {displayValue}
                    </Text>
                  );
                })}

                {actualShowTrend && (
                  <Text style={[styles.td, styles.colTrend, { fontFamily: 'Helvetica-Bold', color: '#2563eb' }]}>
                    {liveSummary.grade ? `${liveSummary.grade} (${liveSummary.percent}%)` : '-'}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
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
  const liveSummary = calculateAverage(student.id, course.columns, grades, undefined, course.roundingRule || 'commercial');
  
  // Get all active grades for the student
  const gradesList = visibleColumns.map(col => {
    let grade = grades[student.id]?.[col.id];
    
    if (col.type === 'calculated' && (!grade || !grade.isOverridden)) {
      const calculated = calculateAverage(student.id, course.columns, grades, col.cutoffDate, course.roundingRule || 'commercial');
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
          <Text style={styles.appTitle}>Chronograde School Admin 2026</Text>
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
            <Text style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Schüler-ID: {student.id}</Text>
          </View>
          {student.photoBase64 && (
            <Image 
              src={student.photoBase64} 
              style={{ width: 60, height: 60, borderRadius: 30, objectFit: 'cover', border: '1px solid #e2e8f0' }} 
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
              const calculated = calculateAverage(student.id, course.columns, grades, ms.cutoffDate, course.roundingRule || 'commercial');
              grade = { value: calculated.grade || undefined };
            }
            return (
              <View key={ms.id} style={[styles.summaryItem, { borderLeft: '1px solid #e2e8f0' }]}>
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

              const displayNote = grade?.note || '';
              const dateStr = col.type === 'calculated' 
                ? (col.cutoffDate ? formatDate(col.cutoffDate) : '') 
                : (col.date ? formatDate(col.date) : '');

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
