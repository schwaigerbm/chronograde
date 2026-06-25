import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  TrendingUp, 
  Award, 
  FileDown, 
  Activity, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  AlertCircle,
  Puzzle
} from 'lucide-react';
import type { Student, Course, CourseEntry, Grade } from '../schema';
import { calculateAverage, getCollaborationPercentage, getPresencePercentage } from '../lib/averageCalculator';
import { formatDate } from '../lib/utils';
import { exportStudentReportPDF } from './PDFExports';

interface StudentPerformanceDashboardProps {
  student: Student;
  course: Course;
  grades: Record<string, Record<string, Grade>>;
  visibleColumns: CourseEntry[];
  onClose: () => void;
}

export const StudentPerformanceDashboard = ({
  student,
  course,
  grades,
  visibleColumns,
  onClose
}: StudentPerformanceDashboardProps) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    title: string;
    date: string;
    percent: number;
    grade: number;
  } | null>(null);

  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
  };

  // 1. Calculate general stats
  const liveSummary = useMemo(() => {
    return calculateAverage(student.id, course.columns, grades, undefined, course.roundingRule || 'commercial', course.collaborationCalcMode || 'weighted');
  }, [student.id, course.columns, grades, course.roundingRule, course.collaborationCalcMode]);

  // Helper to map percent to visual position on the inverted grade scale (left = 1 / 100%, right = 5 / 0%)
  // Each of the 5 grades has exactly 20% width of the bar.
  // Note 1: 90-100% -> 0% to 20% of the bar width
  // Note 2: 80-90%  -> 20% to 40% of the bar width
  // Note 3: 65-80%  -> 40% to 60% of the bar width
  // Note 4: 50-65%  -> 60% to 80% of the bar width
  // Note 5: 0-50%   -> 80% to 100% of the bar width (compressed)
  const getMarkerPosition = (percent: number | null): number => {
    if (percent === null) return 50; // default middle
    const p = Math.max(0, Math.min(100, percent));
    
    if (p >= 90) {
      const factor = (100 - p) / 10;
      return factor * 20; // 0% to 20%
    } else if (p >= 80) {
      const factor = (90 - p) / 10;
      return 20 + factor * 20; // 20% to 40%
    } else if (p >= 65) {
      const factor = (80 - p) / 15;
      return 40 + factor * 20; // 40% to 60%
    } else if (p >= 50) {
      const factor = (65 - p) / 15;
      return 60 + factor * 20; // 60% to 80%
    } else {
      // Compress the 0% to 50% range into the 80% to 100% space (20% width)
      const factor = (50 - p) / 50;
      return 80 + factor * 20; // 80% to 100%
    }
  };

  // Calculate tendency and "Puzzelstück" suggestions
  const tendencyDetails = useMemo(() => {
    if (liveSummary.percent === null || liveSummary.grade === null) return null;
    const P = liveSummary.percent;
    const G = liveSummary.grade;
    
    let type: 'up' | 'down' | 'stable' = 'stable';
    let difference = 0;
    let targetGrade = G;
    let message = '';
    let description = '';

    // Calculate active columns weights to give suggestions
    const activeCols = course.columns.filter(c => c.calc && c.type !== 'calculated' && c.type !== 'presenceSum' && c.type !== 'groupAssignment');
    const totalWeight = activeCols.reduce((sum, c) => sum + (c.calcFactor || 0), 0) / 100;

    if (G === 1) {
      const buffer = P - 90 + 1; // e.g. 90% -> 1% buffer (drops to 2 at 89%)
      if (buffer <= 3) {
        type = 'down';
        difference = buffer;
        targetGrade = 2;
        message = `Knappes Sehr gut! Nur ${buffer}% Puffer zur Note 2`;
        description = `Ein minimaler Leistungsabfall oder ein Minus (-) in der Mitarbeit zieht den Schnitt unter 90% und verschlechtert die Note.`;
      } else {
        type = 'stable';
        message = `Stabiles Sehr gut`;
        description = `Sicheres Sehr gut mit ${buffer}% Puffer zur Note 2.`;
      }
    } else if (G === 2) {
      const distToBetter = 90 - P;
      const buffer = P - 80 + 1;
      if (distToBetter <= 3) {
        type = 'up';
        difference = distToBetter;
        targetGrade = 1;
        message = `Aufstieg möglich! Nur ${distToBetter}% fehlen zur Note 1`;
        description = `Ein kleines Puzzelstück (z. B. eine positive Mitarbeit-Meldung oder geringe Verbesserung bei einer Beurteilung) reicht für ein Sehr gut (1).`;
      } else if (buffer <= 3) {
        type = 'down';
        difference = buffer;
        targetGrade = 3;
        message = `Achtung! Nur ${buffer}% Puffer zur Note 3`;
        description = `Die Note 2 ist gefährdet. Schon eine kleine Verschlechterung zieht den Schnitt unter 80%.`;
      } else {
        type = 'stable';
        message = `Glatte Note 2`;
        description = `Stabiler Zweier. ${distToBetter}% fehlen zu Note 1, ${buffer}% Puffer zu Note 3.`;
      }
    } else if (G === 3) {
      const distToBetter = 80 - P;
      const buffer = P - 65 + 1;
      if (distToBetter <= 3) {
        type = 'up';
        difference = distToBetter;
        targetGrade = 2;
        message = `Aufstieg möglich! Nur ${distToBetter}% fehlen zur Note 2`;
        description = `Ein kleines Puzzelstück (z. B. ein Plus in der Mitarbeit oder ein paar zusätzliche Punkte) reicht für ein Gut (2).`;
      } else if (buffer <= 3) {
        type = 'down';
        difference = buffer;
        targetGrade = 4;
        message = `Achtung! Nur ${buffer}% Puffer zur Note 4`;
        description = `Die Note 3 steht auf der Kippe. Ein kleiner Punktabzug zieht den Schnitt unter 65%.`;
      } else {
        type = 'stable';
        message = `Glatte Note 3`;
        description = `Stabiler Dreier. ${distToBetter}% fehlen zu Note 2, ${buffer}% Puffer zu Note 4.`;
      }
    } else if (G === 4) {
      const distToBetter = 65 - P;
      const buffer = P - 50 + 1;
      if (distToBetter <= 3) {
        type = 'up';
        difference = distToBetter;
        targetGrade = 3;
        message = `Aufstieg möglich! Nur ${distToBetter}% fehlen zur Note 3`;
        description = `Es fehlt nur ein kleines Puzzelstück (z. B. eine positive Mitarbeit-Rückmeldung), um ein Befriedigend (3) zu erreichen.`;
      } else if (buffer <= 3) {
        type = 'down';
        difference = buffer;
        targetGrade = 5;
        message = `Achtung! Nur ${buffer}% Puffer zur Note 5!`;
        description = `Die Note ist akut gefährdet. Jede kleine Verschlechterung zieht den Schnitt unter 50% und führt zu einem Nicht genügend (5).`;
      } else {
        type = 'stable';
        message = `Glatte Note 4`;
        description = `Stabiler Vierer. ${distToBetter}% fehlen zu Note 3, ${buffer}% Puffer zu Note 5.`;
      }
    } else if (G === 5) {
      const distToBetter = 50 - P;
      if (distToBetter <= 5) {
        type = 'up';
        difference = distToBetter;
        targetGrade = 4;
        message = `Rettung greifbar! Nur ${distToBetter}% fehlen zur Note 4!`;
        description = `Ein kleines Puzzelstück (z. B. eine aktive Mitarbeit-Verbesserung oder eine positive Leistung) reicht aus, um auf ein Genügend (4) aufzusteigen.`;
      } else {
        type = 'stable';
        message = `Aktuell Note 5`;
        description = `Nicht genügend. Es fehlen ${distToBetter}% auf ein Genügend (4).`;
      }
    }

    // Concrete suggestions ("Puzzelstücke")
    const suggestions: string[] = [];
    if (totalWeight > 0) {
      const collabCol = activeCols.find(c => c.type === 'collaborationSum');
      if (collabCol) {
        const factorPercent = Math.round(((collabCol.calcFactor || 0) / 100) / totalWeight * 100);
        if (factorPercent > 0) {
          const grade = grades[student.id]?.[collabCol.id];
          const entriesCount = grade?.entries?.length || 0;
          if (grade && entriesCount > 0) {
            const currentPoints = (grade.entries || []).reduce((sum, entry) => {
              if (entry.value === '+') return sum + 1;
              if (entry.value === '~') return sum + 0.5;
              return sum;
            }, 0);
            const currentCollabPercent = Math.round((currentPoints / entriesCount) * 100);
            
            // Adding a single '+'
            const newCollabPercent = Math.round(((currentPoints + 1) / (entriesCount + 1)) * 100);
            const collabIncrease = newCollabPercent - currentCollabPercent;
            const overallIncrease = collabIncrease * ((collabCol.calcFactor || 0) / 100) / totalWeight;
            if (overallIncrease > 0) {
              suggestions.push(`Ein zusätzliches "+" in der Mitarbeit steigert die Gesamtnote um ca. +${overallIncrease.toFixed(1)}% (Mitarbeit-Gewichtung: ${factorPercent}%).`);
            }
          } else {
            const overallIncrease = 100 * ((collabCol.calcFactor || 0) / 100) / totalWeight;
            suggestions.push(`Die erste positive Mitarbeit-Meldung (+) steigert die Gesamtnote um ca. +${overallIncrease.toFixed(1)}% (Mitarbeit-Gewichtung: ${factorPercent}%).`);
          }
        }
      }

      const evalCols = activeCols.filter(c => c.type === 'evaluation' || c.type === 'manual');
      if (evalCols.length > 0) {
        const largestCol = [...evalCols].sort((a, b) => (b.calcFactor || 0) - (a.calcFactor || 0))[0];
        const largestPercent = Math.round(((largestCol.calcFactor || 0) / 100) / totalWeight * 100);
        if (largestPercent > 0) {
          const testIncrease = 10 * ((largestCol.calcFactor || 0) / 100) / totalWeight;
          suggestions.push(`10% mehr Punkte bei "${largestCol.title}" bringen ca. +${testIncrease.toFixed(1)}% im Gesamtschnitt (Gewichtung: ${largestPercent}%).`);
        }
      }
    }

    return {
      type,
      difference,
      targetGrade,
      message,
      description,
      suggestions
    };
  }, [liveSummary, course.columns, grades, student.id]);

  // Attendance stats
  const attendanceStats = useMemo(() => {
    let totalPresenceHours = 0;
    let presentHours = 0;
    let hasPresenceData = false;

    visibleColumns.forEach(col => {
      if (col.type === 'presenceSum') {
        const grade = grades[student.id]?.[col.id];
        if (grade?.entries && grade.entries.length > 0) {
          hasPresenceData = true;
          grade.entries.forEach(entry => {
            const hrs = entry.hours || 1;
            totalPresenceHours += hrs;
            if (entry.value === 'check') {
              presentHours += hrs;
            }
          });
        }
      }
    });

    return {
      percent: totalPresenceHours > 0 ? Math.round((presentHours / totalPresenceHours) * 100) : null,
      presentHours,
      totalHours: totalPresenceHours,
      hasPresenceData
    };
  }, [student.id, visibleColumns, grades]);

  // Collaboration stats
  const collaborationStats = useMemo(() => {
    let plusCount = 0;
    let neutralCount = 0;
    let minusCount = 0;
    let totalCollabEntries = 0;

    visibleColumns.forEach(col => {
      if (col.type === 'collaborationSum') {
        const grade = grades[student.id]?.[col.id];
        if (grade?.entries) {
          grade.entries.forEach(entry => {
            totalCollabEntries++;
            if (entry.value === '+') plusCount++;
            else if (entry.value === '~') neutralCount++;
            else if (entry.value === '-') minusCount++;
          });
        }
      }
    });

    return { plusCount, neutralCount, minusCount, totalCollabEntries };
  }, [student.id, visibleColumns, grades]);

  // 2. Generate History Feed (sorted descending by date)
  const historyFeed = useMemo(() => {
    const feed: {
      id: string;
      title: string;
      date: string;
      type: CourseEntry['type'];
      displayValue: string;
      note?: string;
      subEntries?: any[];
      calc?: boolean;
      calcFactor?: number;
    }[] = [];

    visibleColumns.forEach(col => {
      let grade = grades[student.id]?.[col.id];
      
      if (col.type === 'calculated' && (!grade || !grade.isOverridden)) {
        const calculated = calculateAverage(student.id, course.columns, grades, col.cutoffDate, course.roundingRule || 'commercial', course.collaborationCalcMode || 'weighted');
        grade = { 
          value: calculated.grade || undefined,
          date: new Date().toISOString()
        };
      }

      if (!grade) return;

      let displayValue = '';
      if (col.type === 'collaborationSum') {
        const p = getCollaborationPercentage(grade.entries);
        if (p !== null) {
          const g = p >= 90 ? 1 : p >= 80 ? 2 : p >= 65 ? 3 : p >= 50 ? 4 : 5;
          displayValue = `Note ${g} (${p}%)`;
        } else {
          displayValue = '-';
        }
      } else if (col.type === 'presenceSum') {
        const p = getPresencePercentage(grade.entries);
        displayValue = p !== null ? `${p}%` : '-';
      } else if (grade.value !== undefined && grade.value !== '') {
        if (col.type === 'calculated' || col.type === 'evaluation') {
          displayValue = `Note ${grade.value}`;
        } else if (col.type === 'manual') {
          if (col.calcType === 'grade') {
            displayValue = `Note ${grade.value}`;
          } else if (col.calcType === 'percent') {
            const p = Number(grade.value);
            if (!isNaN(p)) {
              const g = p >= 90 ? 1 : p >= 80 ? 2 : p >= 65 ? 3 : p >= 50 ? 4 : 5;
              displayValue = `Note ${g} (${p}%)`;
            } else {
              displayValue = `${grade.value}%`;
            }
          } else if (col.calcType === 'sign') {
            const s = grade.value;
            const g = s === '+' ? 1 : s === '~' ? 4 : 5;
            displayValue = `Note ${g} (${s})`;
          } else {
            displayValue = String(grade.value);
          }
        } else {
          displayValue = String(grade.value);
        }
      } else {
        displayValue = '-';
      }

      const dateStr = col.type === 'calculated' 
        ? (col.cutoffDate || '') 
        : (col.date || '');

      feed.push({
        id: col.id,
        title: col.title,
        date: dateStr,
        type: col.type,
        displayValue,
        note: grade.note,
        subEntries: grade.entries,
        calc: !!col.calc,
        calcFactor: col.calcFactor ?? 0
      });
    });

    // Sort descending (latest date first)
    return feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [student.id, visibleColumns, grades, course.columns, course.roundingRule, course.collaborationCalcMode]);

  // 3. Generate Chronological Trend Data points for SVG Chart (sorted ascending)
  const chartPoints = useMemo(() => {
    const points: {
      date: string;
      title: string;
      percent: number;
      grade: number;
    }[] = [];

    // 1. Gather normal assessment columns (excluding collaborationSum, presenceSum, calculated, groupAssignment)
    const normalCols = course.columns.filter(col => 
      col.calc !== false && 
      col.type !== 'calculated' && 
      col.type !== 'presenceSum' && 
      col.type !== 'groupAssignment' &&
      col.type !== 'collaborationSum'
    );

    const normalEvents: { date: string; title: string }[] = [];
    normalCols.forEach(col => {
      const grade = grades[student.id]?.[col.id];
      const hasValue = grade && (
        (grade.value !== undefined && grade.value !== '') ||
        (col.type === 'evaluation' && grade.evaluationPercent !== undefined)
      );
      if (hasValue) {
        normalEvents.push({
          date: col.date,
          title: col.title
        });
      }
    });

    // 2. Gather individual collaboration entries
    const collabCol = course.columns.find(col => col.type === 'collaborationSum');
    const collabEvents: { date: string; title: string }[] = [];
    const isCollabLinear = course.collaborationCalcMode === 'linear';
    if (collabCol && isCollabLinear) {
      const grade = grades[student.id]?.[collabCol.id];
      if (grade?.entries) {
        grade.entries.forEach(entry => {
          if (entry.date) {
            collabEvents.push({
              date: entry.date,
              title: `Mitarbeit (${entry.value})`
            });
          }
        });
      }
    }

    // 2.5 Gather snapshots/milestones (calculated columns)
    const snapshotEvents: { date: string; title: string; isSnapshot: boolean; snapshotGrade: number }[] = [];
    course.columns.forEach(col => {
      if (col.type === 'calculated') {
        let grade = grades[student.id]?.[col.id];
        if (!grade || !grade.isOverridden) {
          const calculated = calculateAverage(student.id, course.columns, grades, col.cutoffDate, course.roundingRule || 'commercial', course.collaborationCalcMode || 'weighted');
          if (calculated.grade) {
            grade = { value: calculated.grade };
          }
        }
        if (grade?.value) {
          const val = Number(grade.value);
          if (!isNaN(val)) {
            snapshotEvents.push({
              date: col.cutoffDate || col.date,
              title: col.title,
              isSnapshot: true,
              snapshotGrade: val
            });
          }
        }
      }
    });

    // 3. Combine and sort events
    const allEvents = [...normalEvents, ...collabEvents, ...snapshotEvents]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Deduplicate by day (YYYY-MM-DD) to avoid multiple points on the same day
    const uniqueDates: string[] = [];
    const dateToEvents: Record<string, string[]> = {};
    const dateToSnapshot: Record<string, number> = {};

    allEvents.forEach(e => {
      const d = e.date.split('T')[0];
      if (!dateToEvents[d]) {
        dateToEvents[d] = [];
        uniqueDates.push(e.date);
      }
      const snapshotEvent = e as any;
      if (snapshotEvent.isSnapshot && snapshotEvent.snapshotGrade !== undefined) {
        dateToSnapshot[d] = snapshotEvent.snapshotGrade;
      }
      dateToEvents[d].push(e.title);
    });

    // 4. Calculate live average or use snapshot grade at each date point
    uniqueDates.forEach(dateStr => {
      const d = dateStr.split('T')[0];
      const titles = dateToEvents[d];
      const title = titles.join(', ');
      
      if (dateToSnapshot[d] !== undefined) {
        let percent = 0;
        switch (dateToSnapshot[d]) {
          case 1: percent = 100; break;
          case 2: percent = 89; break;
          case 3: percent = 79; break;
          case 4: percent = 64; break;
          case 5: percent = 49; break;
        }
        points.push({
          date: dateStr,
          title,
          percent,
          grade: dateToSnapshot[d]
        });
      } else {
        const avg = calculateAverage(student.id, course.columns, grades, dateStr, course.roundingRule || 'commercial', course.collaborationCalcMode || 'weighted');
        if (avg.percent !== null && avg.grade !== null) {
          points.push({
            date: dateStr,
            title,
            percent: avg.percent,
            grade: avg.grade
          });
        }
      }
    });

    // 5. Add current live trend point at the very end
    const liveAvg = calculateAverage(student.id, course.columns, grades, undefined, course.roundingRule || 'commercial', course.collaborationCalcMode || 'weighted');
    if (liveAvg.percent !== null && liveAvg.grade !== null) {
      points.push({
        date: new Date().toISOString(),
        title: 'Trend',
        percent: liveAvg.percent,
        grade: liveAvg.grade
      });
    }

    return points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [student.id, course.columns, grades, course.roundingRule, course.collaborationCalcMode]);

  // SVG dimensions & coordinate mapping for Line Chart
  const svgWidth = 800;
  const svgHeight = 450;
  const paddingX = 65; // Wegen nur Ziffern auf Y-Achse verringert (mehr Platz fürs Diagramm)
  const paddingY = 40;
  const chartBottomGap = 95; // vergrößert für lesbarere X-Achsen-Beschriftungen

  const linePath = useMemo(() => {
    if (chartPoints.length < 2) return '';
    
    return chartPoints.map((p, i) => {
      const x = paddingX + (i * (svgWidth - paddingX - 20)) / (chartPoints.length - 1);
      const y = paddingY + ((p.grade - 1) * (svgHeight - paddingY - chartBottomGap)) / 4;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }, [chartPoints]);

  const gradientAreaPath = useMemo(() => {
    if (chartPoints.length < 2) return '';
    const firstX = paddingX;
    const lastX = paddingX + (svgWidth - paddingX - 20);
    const bottomY = svgHeight - chartBottomGap + 10;
    
    const lines = chartPoints.map((p, i) => {
      const x = paddingX + (i * (svgWidth - paddingX - 20)) / (chartPoints.length - 1);
      const y = paddingY + ((p.grade - 1) * (svgHeight - paddingY - chartBottomGap)) / 4;
      return `L ${x} ${y}`;
    }).join(' ');

    const initialY = paddingY + ((chartPoints[0].grade - 1) * (svgHeight - paddingY - chartBottomGap)) / 4;

    return `M ${firstX} ${bottomY} L ${firstX} ${initialY} ${lines} L ${lastX} ${bottomY} Z`;
  }, [chartPoints]);

  const getHungarianGradeLabel = (g: number): string => {
    switch (g) {
      case 1: return 'Sehr gut';
      case 2: return 'Gut';
      case 3: return 'Befriedigend';
      case 4: return 'Genügend';
      case 5: return 'Nicht genügend';
      default: return '';
    }
  };

  const getGradeColor = (g: number): string => {
    switch (g) {
      case 1: return '#15803d';
      case 2: return '#16a34a';
      case 3: return '#3b82f6';
      case 4: return '#d97706';
      case 5: return '#b91c1c';
      default: return '#2563eb';
    }
  };

  const getColTypeBadgeClass = (type: CourseEntry['type']) => {
    switch (type) {
      case 'manual': return 'badge-manual';
      case 'collaborationSum': return 'badge-collab';
      case 'presenceSum': return 'badge-presence';
      case 'calculated': return 'badge-milestone';
      case 'evaluation': return 'badge-evaluation';
      default: return '';
    }
  };

  const getColTypeLabel = (type: CourseEntry['type']): string => {
    switch (type) {
      case 'manual': return 'Beurteilung';
      case 'collaborationSum': return 'Mitarbeit';
      case 'presenceSum': return 'Anwesenheit';
      case 'calculated': return 'Meilenstein';
      case 'evaluation': return 'Test/Schularbeit';
      case 'groupAssignment': return 'Gruppe';
      default: return type;
    }
  };

  return (
    <div className="dashboard-overlay-fullscreen">
      <div className="dashboard-container">
        {/* Header Section */}
        <header className="dashboard-header">
          <div className="student-profile-summary">
            {student.photoBase64 ? (
              <img 
                src={student.photoBase64} 
                alt={`${student.firstName} ${student.lastName}`} 
                className="student-dashboard-avatar"
              />
            ) : (
              <div className="student-dashboard-avatar-placeholder">
                {student.firstName[0]}{student.lastName[0]}
              </div>
            )}
            <div className="student-profile-text">
              <h1 className="student-dashboard-name">
                <span className="lastname-bold">{student.lastName}</span>, {student.firstName}
              </h1>
              <p className="student-dashboard-meta">
                Kurs: <strong>{course.name}</strong> | Schuljahr: {course.year}
              </p>
            </div>
          </div>
          
          <div className="dashboard-actions">
            <button
              className="btn-secondary btn-sm dashboard-pdf-btn"
              onClick={() => exportStudentReportPDF(student, course, grades, visibleColumns)}
              title="Einzel-Schüler PDF Bericht herunterladen"
            >
              <FileDown size={16} />
              <span>PDF Bericht</span>
            </button>
            <button 
              className="btn-icon btn-close-dashboard"
              onClick={onClose}
              title="Dashboard schließen"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="dashboard-body" style={{ overflow: 'hidden' }}>
          
          {/* Top Section: Split Layout (Diagram Left, Summaries Right) */}
          <div className="dashboard-top-split" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '16px', alignItems: 'stretch', flex: 1, minHeight: 0 }}>
            
            {/* Left Column: Diagram */}
            <div className="dashboard-chart-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '480px' }}>
              <div className="dashboard-card chart-card" style={{ height: '100%', margin: 0, display: 'flex', flexDirection: 'column' }}>
                <h2 className="dashboard-card-title">
                  <TrendingUp size={18} />
                  <span>Leistungsverlauf (Noten-Trend)</span>
                </h2>
                <div className="chart-wrapper" style={{ flex: 1, minHeight: '380px' }}>
                  {chartPoints.length >= 2 ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <svg 
                        width="100%" 
                        height="100%" 
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        className="trend-svg"
                      >
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Threshold grid lines */}
                        {[1, 2, 3, 4, 5].map(grade => {
                          const y = paddingY + ((grade - 1) * (svgHeight - paddingY - chartBottomGap)) / 4;
                          return (
                            <g key={grade} className="grid-group">
                              <line 
                                x1={paddingX} 
                                y1={y} 
                                x2={svgWidth - 20} 
                                y2={y} 
                                stroke="#e2e8f0" 
                                strokeDasharray="4 4"
                              />
                              <text 
                                x={paddingX - 12} 
                                y={y + 6} 
                                textAnchor="end" 
                                style={{
                                  fontSize: '18px',
                                  fontWeight: '950',
                                  fill: '#0f172a',
                                  fontFamily: 'sans-serif'
                                }}
                              >
                                {grade}
                              </text>
                            </g>
                          );
                        })}

                        {/* Bottom axis line */}
                        <line 
                          x1={paddingX} 
                          y1={svgHeight - chartBottomGap + 10} 
                          x2={svgWidth - 20} 
                          y2={svgHeight - chartBottomGap + 10} 
                          stroke="#cbd5e1"
                          strokeWidth="2"
                        />

                        {/* Fill area beneath line */}
                        <path d={gradientAreaPath} fill="url(#chartGradient)" />

                        {/* Grade line path */}
                        <path 
                          d={linePath} 
                          fill="none" 
                          stroke="#2563eb" 
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Data point circles & hover triggers */}
                        {chartPoints.map((p, i) => {
                          const x = paddingX + (i * (svgWidth - paddingX - 20)) / (chartPoints.length - 1);
                          const y = paddingY + ((p.grade - 1) * (svgHeight - paddingY - chartBottomGap)) / 4;
                          return (
                            <g key={i}>
                              {/* Axis tick mark */}
                              <line 
                                x1={x} 
                                y1={svgHeight - chartBottomGap + 10} 
                                x2={x} 
                                y2={svgHeight - chartBottomGap + 18} 
                                stroke="#cbd5e1" 
                                strokeWidth="2"
                              />

                              {/* Rotated Axis Title Label */}
                              <text
                                x={x}
                                y={p.title === 'Trend' ? svgHeight - chartBottomGap + 42 : svgHeight - chartBottomGap + 34}
                                textAnchor={p.title === 'Trend' ? 'middle' : 'end'}
                                transform={p.title === 'Trend' ? '' : `rotate(-35, ${x}, ${svgHeight - chartBottomGap + 34})`}
                                style={{
                                  fontSize: p.title === 'Trend' ? '22px' : '16px',
                                  fontWeight: '900',
                                  fill: p.title === 'Trend' ? '#2563eb' : '#0f172a',
                                  fontFamily: 'sans-serif'
                                }}
                              >
                                {p.title.length > 15 ? p.title.substring(0, 15) + '...' : p.title}
                              </text>

                              {/* Grade Label above the dot */}
                              <text
                                x={x}
                                y={y - 16}
                                textAnchor="middle"
                                style={{
                                  fontSize: '18px',
                                  fontWeight: '950',
                                  fill: getGradeColor(p.grade),
                                  fontFamily: 'sans-serif'
                                }}
                              >
                                {p.grade}
                              </text>

                              {/* Colored Dot */}
                              <circle 
                                cx={x} 
                                cy={y} 
                                r="8" 
                                fill={getGradeColor(p.grade)} 
                                stroke="#ffffff" 
                                strokeWidth="3" 
                                className="chart-dot"
                                style={{ filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.15))' }}
                              />
                              {/* Larger invisible circle for easier hover interaction */}
                              <circle 
                                cx={x} 
                                cy={y} 
                                r="24" 
                                fill="transparent" 
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => {
                                  setHoveredPoint({
                                    x: x,
                                    y: y - 10,
                                    title: p.title,
                                    date: p.date,
                                    percent: p.percent,
                                    grade: p.grade
                                  });
                                }}
                                onMouseLeave={() => setHoveredPoint(null)}
                              />
                            </g>
                          );
                        })}
                      </svg>
                      
                      {/* SVG Chart Point Tooltip */}
                      {hoveredPoint && (
                        <div 
                          className="chart-tooltip"
                          style={{
                            position: 'absolute',
                            left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                            top: `${(hoveredPoint.y / svgHeight) * 100}%`,
                            transform: 'translate(-50%, -100%)'
                          }}
                        >
                          <div className="tooltip-inner">
                            <strong className="tooltip-title">{hoveredPoint.title}</strong>
                            <span className="tooltip-date">{formatDate(hoveredPoint.date)}</span>
                            <div className="tooltip-stats">
                              <span className="tooltip-percent">{hoveredPoint.percent}%</span>
                              <span className="tooltip-grade">Note: {hoveredPoint.grade}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="chart-empty-state">
                      <TrendingUp size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
                      <p>Diagramm benötigt mindestens 2 bewertete Leistungen im Verlauf</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Summaries Stack */}
            <div className="dashboard-stats-stack" style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '6px', height: '100%', minHeight: 0 }}>
              
              {/* Live Trend Card */}
              <div className="dashboard-card live-trend-card" style={{ padding: '12px 18px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h2 className="dashboard-card-title" style={{ fontSize: '16px', marginBottom: '8px', paddingBottom: '4px', fontWeight: 'bold' }}>
                  <TrendingUp size={18} />
                  <span>Gesamttrend (Live)</span>
                </h2>
                <div className="live-trend-content" style={{ gap: '16px' }}>
                  {liveSummary.grade ? (
                    <>
                      <div className="live-trend-grade-display" data-grade={liveSummary.grade} style={{ height: '56px', width: '56px', fontSize: '32px' }}>
                        {liveSummary.grade}
                      </div>
                      <div className="live-trend-details" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                          <span className="live-trend-label" style={{ fontSize: '16px', fontWeight: 'bold' }}>{getHungarianGradeLabel(liveSummary.grade)}</span>
                          <span className="live-trend-percent" style={{ fontSize: '13px' }}>{liveSummary.percent}% Schnitt</span>
                        </div>
                        
                        {/* Notenstrahl (Grade Scale) */}
                        {tendencyDetails && (
                          <div 
                            className="relative group" 
                            style={{ marginTop: '24px', cursor: 'help', width: '100%', position: 'relative' }}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                          >
                            {/* Scale Bar */}
                            <div 
                              style={{
                                height: '10px',
                                borderRadius: '5px',
                                background: 'linear-gradient(to right, #15803d 0%, #15803d 20%, #16a34a 20%, #16a34a 40%, #3b82f6 40%, #3b82f6 60%, #d97706 60%, #d97706 80%, #ef4444 80%, #ef4444 100%)',
                                width: '100%',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                            >
                              {/* Visual break in the red zone (88% to 92%) */}
                              <div 
                                style={{
                                  position: 'absolute',
                                  left: '88%',
                                  top: '0',
                                  width: '6px',
                                  height: '100%',
                                  backgroundColor: '#dbeafe', // Matches trend card gradient right-side color
                                  transform: 'skewX(-25deg)'
                                }}
                              />
                            </div>
                            
                            {/* Scale Markers (Grade numbers 1 to 5) */}
                            <div style={{ display: 'flex', position: 'relative', width: '100%', height: '12px', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginTop: '4px' }}>
                              <span style={{ position: 'absolute', left: '10%', transform: 'translateX(-50%)' }}>1</span>
                              <span style={{ position: 'absolute', left: '30%', transform: 'translateX(-50%)' }}>2</span>
                              <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>3</span>
                              <span style={{ position: 'absolute', left: '70%', transform: 'translateX(-50%)' }}>4</span>
                              <span style={{ position: 'absolute', left: '90%', transform: 'translateX(-50%)' }}>5</span>
                            </div>
                            
                            {/* Current Position Pin (Markerl) */}
                            <div 
                              style={{
                                position: 'absolute',
                                left: `${getMarkerPosition(liveSummary.percent)}%`,
                                top: '-32px',
                                transform: 'translateX(-50%)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                              }}
                            >
                              {/* Marker bubble showing percentage */}
                              <div 
                                style={{
                                  backgroundColor: getGradeColor(liveSummary.grade),
                                  color: 'white',
                                  fontSize: '14px',
                                  fontWeight: '900',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                  whiteSpace: 'nowrap',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  zIndex: 11
                                }}
                              >
                                {liveSummary.percent}%
                              </div>
                              {/* Large downward pointer triangle overlaying the bar */}
                              <svg 
                                width="16" 
                                height="14" 
                                viewBox="0 0 16 14" 
                                style={{ 
                                  marginTop: '-2px', 
                                  filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))',
                                  zIndex: 10 
                                }}
                              >
                                <path 
                                  d="M 1 1 L 15 1 L 8 13 Z" 
                                  fill={getGradeColor(liveSummary.grade)} 
                                  stroke="#ffffff" 
                                  strokeWidth="2" 
                                  strokeLinejoin="round" 
                                />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="no-data-alert">
                      <AlertCircle size={18} />
                      <span>Keine Daten</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Collaboration Distribution Card */}
              <div className="dashboard-card" style={{ padding: '12px 18px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h2 className="dashboard-card-title" style={{ fontSize: '16px', marginBottom: '8px', paddingBottom: '4px', fontWeight: 'bold' }}>
                  <Award size={18} />
                  <span>Mitarbeit</span>
                </h2>
                <div className="stat-card-content">
                  {collaborationStats.totalCollabEntries > 0 ? (
                    <div className="collab-stats-distribution" style={{ gap: '8px' }}>
                      <div className="collab-dist-item plus" style={{ padding: '8px 6px', borderRadius: '8px' }}>
                        <span className="collab-dist-symbol" style={{ fontSize: '20px' }}>+</span>
                        <span className="collab-dist-count" style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{collaborationStats.plusCount}</span>
                      </div>
                      <div className="collab-dist-item neutral" style={{ padding: '8px 6px', borderRadius: '8px' }}>
                        <span className="collab-dist-symbol" style={{ fontSize: '20px' }}>~</span>
                        <span className="collab-dist-count" style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{collaborationStats.neutralCount}</span>
                      </div>
                      <div className="collab-dist-item minus" style={{ padding: '8px 6px', borderRadius: '8px' }}>
                        <span className="collab-dist-symbol" style={{ fontSize: '20px' }}>-</span>
                        <span className="collab-dist-count" style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{collaborationStats.minusCount}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="no-data-text" style={{ fontSize: '14px' }}>Keine Aufzeichnungen</p>
                  )}
                </div>
              </div>

              {/* Attendance Quote Card */}
              <div className="dashboard-card" style={{ padding: '12px 18px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h2 className="dashboard-card-title" style={{ fontSize: '16px', marginBottom: '8px', paddingBottom: '4px', fontWeight: 'bold' }}>
                  <Activity size={18} />
                  <span>Anwesenheit</span>
                </h2>
                <div className="stat-card-content">
                  {attendanceStats.hasPresenceData ? (
                    <div className="attendance-quote-display" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className="attendance-percentage" data-quote={attendanceStats.percent} style={{ fontSize: '32px', fontWeight: '800', lineHeight: 1 }}>
                        {attendanceStats.percent}%
                      </div>
                      <p className="stat-card-subtitle" style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                        Anwesend: {attendanceStats.presentHours} von {attendanceStats.totalHours} Std.
                      </p>
                    </div>
                  ) : (
                    <p className="no-data-text" style={{ fontSize: '14px' }}>Keine Aufzeichnungen</p>
                  )}
                </div>
              </div>

              {/* Milestones Card */}
              <div className="dashboard-card" style={{ padding: '12px 18px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h2 className="dashboard-card-title" style={{ fontSize: '16px', marginBottom: '8px', paddingBottom: '4px', fontWeight: 'bold' }}>
                  <Award size={18} />
                  <span>Meilensteine</span>
                </h2>
                <div className="milestones-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {visibleColumns.filter(c => c.type === 'calculated').length > 0 ? (
                    visibleColumns.filter(c => c.type === 'calculated').slice(0, 2).map(ms => {
                      let grade = grades[student.id]?.[ms.id];
                      if (!grade || !grade.isOverridden) {
                        const calculated = calculateAverage(student.id, course.columns, grades, ms.cutoffDate, course.roundingRule || 'commercial', course.collaborationCalcMode || 'weighted');
                        grade = { value: calculated.grade || undefined };
                      }
                      return (
                        <div key={ms.id} className="milestone-item" style={{ padding: '6px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="milestone-name" style={{ fontSize: '14px', fontWeight: '500' }}>{ms.title}</span>
                          <div className="milestone-badge" data-grade={grade?.value} style={{ width: '28px', height: '28px', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {grade?.value || '-'}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="no-data-text" style={{ fontSize: '14px' }}>Keine Meilensteine</p>
                  )}
                </div>
              </div>

              {/* Timeline Card (Leistungsverlauf im Detail) */}
              <div className="dashboard-card list-timeline-card" style={{ height: 'auto', overflow: 'visible', flexShrink: 0, margin: 0, padding: '12px 18px' }}>
                <h2 className="dashboard-card-title" style={{ fontSize: '16px', marginBottom: '8px', paddingBottom: '4px', fontWeight: 'bold' }}>
                  <Calendar size={18} />
                  <span>Leistungsverlauf im Detail</span>
                </h2>
                <div className="timeline-container" style={{ overflowY: 'visible' }}>
                  {historyFeed.length > 0 ? (
                    <div className="timeline-feed">
                      {historyFeed.map(item => (
                        <div key={item.id} className="timeline-item">
                          {/* Dot indicator */}
                          <div className="timeline-badge-column">
                            <span className={`col-type-badge ${getColTypeBadgeClass(item.type)}`} style={{ fontSize: '10px', padding: '4px 8px', fontWeight: 'bold' }}>
                              {getColTypeLabel(item.type)}
                            </span>
                          </div>
                          
                          {/* Details content */}
                          <div className="timeline-content-card">
                             <div className="timeline-card-header">
                              <div>
                                <h3 className="timeline-item-title" style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{item.title}</h3>
                                <span className="timeline-item-date" style={{ fontSize: '12px', color: '#64748b' }}>{formatDate(item.date)}</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                <div className="timeline-item-result-badge" data-type={item.type} style={{ fontSize: '15px', fontWeight: '900', padding: '5px 10px' }}>
                                  {item.displayValue}
                                </div>
                                {item.type !== 'calculated' && item.type !== 'presenceSum' && item.type !== 'groupAssignment' && (
                                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>
                                    {item.calc ? `Einrechnungsfaktor: ${item.calcFactor}%` : 'Nicht gewertet'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Predefined Comment/Note */}
                            {item.note && (
                              <div className="timeline-item-note" style={{ fontSize: '14px', padding: '10px 14px', marginTop: '10px' }}>
                                <MessageSquare size={15} style={{ marginTop: '2px', marginRight: '6px', flexShrink: 0 }} />
                                <p className="note-text" style={{ margin: 0 }}>{item.note}</p>
                              </div>
                            )}

                            {/* Subentries (Presence / Collaboration lists) */}
                            {item.subEntries && item.subEntries.length > 0 && (
                              <div className="timeline-sub-entries" style={{ marginTop: '12px', paddingTop: '10px' }}>
                                <span className="sub-entries-header" style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Erfasste Einzelleistungen:</span>
                                <div className="sub-entries-list" style={{ gap: '8px' }}>
                                  {item.subEntries.map(sub => {
                                    let isPositive = sub.value === '+' || sub.value === 'check';
                                    let isNegative = sub.value === '-';
                                    
                                    return (
                                      <div key={sub.id} className="sub-entry-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', margin: '4px 0' }}>
                                        <span className="sub-entry-date" style={{ fontSize: '14px', width: '80px', flexShrink: 0 }}>{formatDate(sub.date)}</span>
                                        <div className={`sub-entry-indicator ${isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}`} style={{ width: '26px', height: '26px', fontSize: '14px', flexShrink: 0 }}>
                                          {item.type === 'presenceSum' ? (
                                            isPositive ? <CheckCircle size={18} /> : <XCircle size={18} />
                                          ) : (
                                            <span className="sub-entry-symbol" style={{ fontSize: '15px', fontWeight: 'bold' }}>{sub.value}</span>
                                          )}
                                        </div>
                                        <span className="sub-entry-note" style={{ fontSize: '15px', marginLeft: '8px', fontWeight: '500' }}>
                                          {sub.note || (item.type === 'presenceSum' ? (isPositive ? 'Anwesend' : 'Abwesend') : 'Kein Kommentar')}
                                          {sub.hours ? ` (${sub.hours} Std.)` : ''}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="timeline-empty-state">
                      <p>Keine Einträge für diesen Schüler vorhanden.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
      
      {/* React Portal hover tooltip rendered outside main overlay to floating z-index overlay modal level */}
      {hoverPosition && tendencyDetails && createPortal(
        <div 
          className="tendency-portal-tooltip"
          style={{
            position: 'fixed',
            left: `${hoverPosition.x}px`,
            top: `${hoverPosition.y - 8}px`,
            transform: 'translate(-50%, -100%)',
            width: '320px',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            padding: '16px',
            color: '#1e293b',
            zIndex: 99999, // Float on top of everything!
            pointerEvents: 'none' // Avoid flickering on scroll/mouse move
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Puzzle size={16} style={{ color: tendencyDetails.type === 'up' ? '#16a34a' : tendencyDetails.type === 'down' ? '#dc2626' : '#2563eb' }} />
            <span style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>
              {tendencyDetails.message}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.4', marginBottom: tendencyDetails.suggestions.length > 0 ? '8px' : '0', textAlign: 'left' }}>
            {tendencyDetails.description}
          </p>
          
          {tendencyDetails.suggestions.length > 0 && (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '8px', textAlign: 'left' }}>
              <span style={{ display: 'block', fontWeight: '700', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Mögliche Puzzelstücke zur Verbesserung:
              </span>
              {tendencyDetails.suggestions.map((sug, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '11px', color: '#475569', lineHeight: '1.3', marginBottom: '4px' }}>
                  <span style={{ color: tendencyDetails.type === 'up' ? '#16a34a' : tendencyDetails.type === 'down' ? '#dc2626' : '#2563eb', fontWeight: 'bold' }}>•</span>
                  <span>{sug}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Arrow */}
          <div 
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%) translateY(-6px) rotate(45deg)',
              width: '12px',
              height: '12px',
              backgroundColor: 'white',
              borderRight: '1px solid #e2e8f0',
              borderBottom: '1px solid #e2e8f0'
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
};
