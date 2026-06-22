import { useState, useMemo } from 'react';
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
  AlertCircle
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

  // 1. Calculate general stats
  const liveSummary = useMemo(() => {
    return calculateAverage(student.id, course.columns, grades, undefined, course.roundingRule || 'commercial');
  }, [student.id, course.columns, grades, course.roundingRule]);

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
    }[] = [];

    visibleColumns.forEach(col => {
      let grade = grades[student.id]?.[col.id];
      
      if (col.type === 'calculated' && (!grade || !grade.isOverridden)) {
        const calculated = calculateAverage(student.id, course.columns, grades, col.cutoffDate, course.roundingRule || 'commercial');
        grade = { 
          value: calculated.grade || undefined,
          date: new Date().toISOString()
        };
      }

      if (!grade) return;

      let displayValue = '';
      if (grade.value !== undefined && grade.value !== '') {
        displayValue = String(grade.value);
      } else if (col.type === 'collaborationSum') {
        const p = getCollaborationPercentage(grade.entries);
        displayValue = p !== null ? `${p}%` : '-';
      } else if (col.type === 'presenceSum') {
        const p = getPresencePercentage(grade.entries);
        displayValue = p !== null ? `${p}%` : '-';
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
        subEntries: grade.entries
      });
    });

    // Sort descending (latest date first)
    return feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [student.id, visibleColumns, grades, course.columns, course.roundingRule]);

  // 3. Generate Chronological Trend Data points for SVG Chart (sorted ascending)
  const chartPoints = useMemo(() => {
    // Collect all grade columns with weight and date
    const gradeCols = course.columns
      .filter(col => col.calc !== false && col.type !== 'calculated' && col.type !== 'presenceSum' && col.type !== 'groupAssignment')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const points: {
      date: string;
      title: string;
      percent: number;
      grade: number;
    }[] = [];

    // Compute live average up to each assessment's date
    gradeCols.forEach(col => {
      // Check if student has a grade in this column or collaboration entries
      const grade = grades[student.id]?.[col.id];
      const hasValue = grade && (
        (grade.value !== undefined && grade.value !== '') ||
        (col.type === 'collaborationSum' && grade.entries && grade.entries.length > 0) ||
        (col.type === 'evaluation' && grade.evaluationPercent !== undefined)
      );

      if (hasValue) {
        const avg = calculateAverage(student.id, course.columns, grades, col.date, course.roundingRule || 'commercial');
        if (avg.percent !== null && avg.grade !== null) {
          points.push({
            date: col.date,
            title: col.title,
            percent: avg.percent,
            grade: avg.grade
          });
        }
      }
    });

    return points;
  }, [student.id, course.columns, grades, course.roundingRule]);

  // SVG dimensions & coordinate mapping for Line Chart
  const svgWidth = 600;
  const svgHeight = 320;
  const paddingX = 60;
  const paddingY = 30;

  const linePath = useMemo(() => {
    if (chartPoints.length < 2) return '';
    
    return chartPoints.map((p, i) => {
      const x = paddingX + (i * (svgWidth - paddingX - 20)) / (chartPoints.length - 1);
      const y = paddingY + ((p.grade - 1) * (svgHeight - paddingY - 40)) / 4;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }, [chartPoints]);

  const gradientAreaPath = useMemo(() => {
    if (chartPoints.length < 2) return '';
    const firstX = paddingX;
    const lastX = paddingX + (svgWidth - paddingX - 20);
    const bottomY = svgHeight - 30;
    
    const lines = chartPoints.map((p, i) => {
      const x = paddingX + (i * (svgWidth - paddingX - 20)) / (chartPoints.length - 1);
      const y = paddingY + ((p.grade - 1) * (svgHeight - paddingY - 40)) / 4;
      return `L ${x} ${y}`;
    }).join(' ');

    const initialY = paddingY + ((chartPoints[0].grade - 1) * (svgHeight - paddingY - 40)) / 4;

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
        <div className="dashboard-body">
          
          {/* Summaries Row (Top) */}
          <div className="dashboard-summaries-row">
            
            {/* Live Trend Card */}
            <div className="dashboard-card live-trend-card">
              <h2 className="dashboard-card-title">
                <TrendingUp size={18} />
                <span>Gesamttrend (Live)</span>
              </h2>
              <div className="live-trend-content">
                {liveSummary.grade ? (
                  <>
                    <div className="live-trend-grade-display" data-grade={liveSummary.grade}>
                      {liveSummary.grade}
                    </div>
                    <div className="live-trend-details">
                      <span className="live-trend-label">{getHungarianGradeLabel(liveSummary.grade)}</span>
                      <span className="live-trend-percent">{liveSummary.percent}% Schnitt</span>
                    </div>
                  </>
                ) : (
                  <div className="no-data-alert">
                    <AlertCircle size={20} />
                    <span>Keine Daten</span>
                  </div>
                )}
              </div>
            </div>

            {/* Attendance Quote Card */}
            <div className="dashboard-card">
              <h2 className="dashboard-card-title">
                <Activity size={18} />
                <span>Anwesenheit</span>
              </h2>
              <div className="stat-card-content">
                {attendanceStats.hasPresenceData ? (
                  <div className="attendance-quote-display">
                    <div className="attendance-percentage" data-quote={attendanceStats.percent}>
                      {attendanceStats.percent}%
                    </div>
                    <p className="stat-card-subtitle">
                      {attendanceStats.presentHours}/{attendanceStats.totalHours} Std. anwesend
                    </p>
                  </div>
                ) : (
                  <p className="no-data-text">Keine Aufzeichnungen</p>
                )}
              </div>
            </div>

            {/* Collaboration Distribution Card */}
            <div className="dashboard-card">
              <h2 className="dashboard-card-title">
                <Award size={18} />
                <span>Mitarbeit</span>
              </h2>
              <div className="stat-card-content">
                {collaborationStats.totalCollabEntries > 0 ? (
                  <div className="collab-stats-distribution">
                    <div className="collab-dist-item plus">
                      <span className="collab-dist-symbol">+</span>
                      <span className="collab-dist-count">{collaborationStats.plusCount}</span>
                    </div>
                    <div className="collab-dist-item neutral">
                      <span className="collab-dist-symbol">~</span>
                      <span className="collab-dist-count">{collaborationStats.neutralCount}</span>
                    </div>
                    <div className="collab-dist-item minus">
                      <span className="collab-dist-symbol">-</span>
                      <span className="collab-dist-count">{collaborationStats.minusCount}</span>
                    </div>
                  </div>
                ) : (
                  <p className="no-data-text">Keine Aufzeichnungen</p>
                )}
              </div>
            </div>

            {/* Milestones Card */}
            <div className="dashboard-card">
              <h2 className="dashboard-card-title">
                <Award size={18} />
                <span>Meilensteine</span>
              </h2>
              <div className="milestones-list">
                {visibleColumns.filter(c => c.type === 'calculated').length > 0 ? (
                  visibleColumns.filter(c => c.type === 'calculated').slice(0, 2).map(ms => {
                    let grade = grades[student.id]?.[ms.id];
                    if (!grade || !grade.isOverridden) {
                      const calculated = calculateAverage(student.id, course.columns, grades, ms.cutoffDate, course.roundingRule || 'commercial');
                      grade = { value: calculated.grade || undefined };
                    }
                    return (
                      <div key={ms.id} className="milestone-item" style={{ padding: '4px 8px' }}>
                        <span className="milestone-name" style={{ fontSize: '11px' }}>{ms.title}</span>
                        <div className="milestone-badge" data-grade={grade?.value} style={{ width: '20px', height: '20px', fontSize: '11px' }}>
                          {grade?.value || '-'}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="no-data-text">Keine Meilensteine</p>
                )}
              </div>
            </div>
          </div>

          {/* Workspace (Bottom: Chart Left, History Right) */}
          <div className="dashboard-workspace">
            
            {/* Chart Container (Left Column) */}
            <div className="dashboard-chart-container">
              <div className="dashboard-card chart-card">
                <h2 className="dashboard-card-title">
                  <TrendingUp size={18} />
                  <span>Leistungsverlauf (Noten-Trend)</span>
                </h2>
                <div className="chart-wrapper">
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
                          const y = paddingY + ((grade - 1) * (svgHeight - paddingY - 40)) / 4;
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
                                x={paddingX - 8} 
                                y={y + 4} 
                                textAnchor="end" 
                                className="grid-text"
                              >
                                Note {grade}
                              </text>
                            </g>
                          );
                        })}

                        {/* Bottom axis line */}
                        <line 
                          x1={paddingX} 
                          y1={svgHeight - 30} 
                          x2={svgWidth - 20} 
                          y2={svgHeight - 30} 
                          stroke="#cbd5e1"
                        />

                        {/* Fill area beneath line */}
                        <path d={gradientAreaPath} fill="url(#chartGradient)" />

                        {/* Grade line path */}
                        <path 
                          d={linePath} 
                          fill="none" 
                          stroke="#2563eb" 
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Data point circles & hover triggers */}
                        {chartPoints.map((p, i) => {
                          const x = paddingX + (i * (svgWidth - paddingX - 20)) / (chartPoints.length - 1);
                          const y = paddingY + ((p.grade - 1) * (svgHeight - paddingY - 40)) / 4;
                          return (
                            <g key={i}>
                              <circle 
                                cx={x} 
                                cy={y} 
                                r="5" 
                                fill="#ffffff" 
                                stroke="#2563eb" 
                                strokeWidth="2" 
                                className="chart-dot"
                              />
                              {/* Larger invisible circle for easier hover interaction */}
                              <circle 
                                cx={x} 
                                cy={y} 
                                r="15" 
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

            {/* History Container (Right Column) */}
            <div className="dashboard-timeline-container">
              <div className="dashboard-card list-timeline-card">
                <h2 className="dashboard-card-title">
                  <Calendar size={18} />
                  <span>Leistungsverlauf im Detail</span>
                </h2>
                <div className="timeline-container">
                  {historyFeed.length > 0 ? (
                    <div className="timeline-feed">
                      {historyFeed.map(item => (
                        <div key={item.id} className="timeline-item">
                          {/* Dot indicator */}
                          <div className="timeline-badge-column">
                            <span className={`col-type-badge ${getColTypeBadgeClass(item.type)}`}>
                              {getColTypeLabel(item.type)}
                            </span>
                          </div>
                          
                          {/* Details content */}
                          <div className="timeline-content-card">
                            <div className="timeline-card-header">
                              <div>
                                <h3 className="timeline-item-title">{item.title}</h3>
                                <span className="timeline-item-date">{formatDate(item.date)}</span>
                              </div>
                              <div className="timeline-item-result-badge" data-type={item.type}>
                                {item.displayValue}
                              </div>
                            </div>

                            {/* Predefined Comment/Note */}
                            {item.note && (
                              <div className="timeline-item-note">
                                <MessageSquare size={13} style={{ marginTop: '2px' }} />
                                <p className="note-text">{item.note}</p>
                              </div>
                            )}

                            {/* Subentries (Presence / Collaboration lists) */}
                            {item.subEntries && item.subEntries.length > 0 && (
                              <div className="timeline-sub-entries">
                                <span className="sub-entries-header">Erfasste Einzelleistungen:</span>
                                <div className="sub-entries-list">
                                  {item.subEntries.map(sub => {
                                    let isPositive = sub.value === '+' || sub.value === 'check';
                                    let isNegative = sub.value === '-';
                                    
                                    return (
                                      <div key={sub.id} className="sub-entry-item">
                                        <span className="sub-entry-date">{formatDate(sub.date)}</span>
                                        <div className={`sub-entry-indicator ${isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}`}>
                                          {item.type === 'presenceSum' ? (
                                            isPositive ? <CheckCircle size={12} /> : <XCircle size={12} />
                                          ) : (
                                            <span className="sub-entry-symbol">{sub.value}</span>
                                          )}
                                        </div>
                                        <span className="sub-entry-note">
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
    </div>
  );
};
