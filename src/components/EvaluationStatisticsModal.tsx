// src/components/EvaluationStatisticsModal.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Search, 
  Award, 
  BarChart3, 
  ArrowUpDown, 
  Printer, 
  Trophy, 
  Percent, 
  ClipboardList,
  AlertTriangle,
  Smile,
  Users
} from 'lucide-react';
import type { CourseEntry, Student, GradesState } from '../schema';

interface EvaluationStatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  column: CourseEntry;
  students: Student[];
  grades: GradesState;
}

export const EvaluationStatisticsModal = ({
  isOpen,
  onClose,
  column,
  students,
  grades
}: EvaluationStatisticsModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'grade'>('points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const subTasks = column.subTasks || [];
  const totalMaxPoints = subTasks.reduce((sum, t) => sum + (t.maxPoints || 0), 0);

  // Filter students who have a grade/points for this column
  const gradedList = students.filter(student => {
    const sGrade = grades[student.id]?.[column.id];
    return sGrade !== undefined && sGrade.value !== undefined;
  });

  const totalEnrolled = students.length;
  const totalGraded = gradedList.length;

  // Render empty state if no grades are available yet
  if (totalGraded === 0) {
    return createPortal(
      <div className="modal-overlay" style={{ zIndex: 3000, backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)' }}>
        <div className="modal-card modal-medium" style={{ padding: '32px', textAlign: 'center', position: 'relative' }}>
          <button className="btn-icon" onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px' }}>
            <X size={20} />
          </button>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--text-muted)' }}>
            <ClipboardList size={48} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-main)' }}>
            Keine Statistik verfügbar
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5', fontSize: '14px' }}>
            Für diese Beurteilungsspalte wurden noch keine Noten oder Punkte erfasst. 
            Bitte tragen Sie zuerst die Punkte für mindestens einen Schüler ein, um die Auswertungsstatistik anzuzeigen.
          </p>
          <button className="btn-primary" onClick={onClose} style={{ minWidth: '120px' }}>
            Schließen
          </button>
        </div>
      </div>,
      document.body
    );
  }

  // 1. Calculations
  const gradedPercentage = totalEnrolled > 0 ? Math.round((totalGraded / totalEnrolled) * 100) : 0;

  // Averages
  const totalGradesSum = gradedList.reduce((sum, s) => {
    const val = parseFloat(grades[s.id]?.[column.id]?.value?.toString() || '0');
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  const averageGrade = totalGradesSum / totalGraded;

  const totalPointsSum = gradedList.reduce((sum, s) => {
    return sum + (grades[s.id]?.[column.id]?.evaluationPoints || 0);
  }, 0);
  const averagePoints = totalPointsSum / totalGraded;
  const averagePercent = totalMaxPoints > 0 ? (averagePoints / totalMaxPoints) * 100 : 0;

  // Success rate (positive count / total graded)
  const positiveStudentsCount = gradedList.filter(s => {
    const val = parseFloat(grades[s.id]?.[column.id]?.value?.toString() || '0');
    return !isNaN(val) && val >= 1 && val <= 4;
  }).length;
  const successRate = (positiveStudentsCount / totalGraded) * 100;

  // Grade counts (1 to 5)
  const gradeCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  gradedList.forEach(s => {
    const val = parseInt(grades[s.id]?.[column.id]?.value?.toString() || '0', 10);
    if (val >= 1 && val <= 5) {
      gradeCounts[val as 1|2|3|4|5]++;
    }
  });

  const maxGradeCount = Math.max(...Object.values(gradeCounts), 1);

  // Subtask performance
  const subTaskPerformance = subTasks.map(task => {
    const pointsSum = gradedList.reduce((sum, s) => {
      return sum + (grades[s.id]?.[column.id]?.subTaskPoints?.[task.id] || 0);
    }, 0);
    const avgPts = pointsSum / totalGraded;
    const pct = task.maxPoints > 0 ? (avgPts / task.maxPoints) * 100 : 0;
    return {
      ...task,
      averagePoints: avgPts,
      percentage: pct
    };
  });

  // Top Performers (Podium) - group students by points
  const rankedStudents = gradedList.map(s => {
    const pts = grades[s.id]?.[column.id]?.evaluationPoints || 0;
    const pct = grades[s.id]?.[column.id]?.evaluationPercent || 0;
    const grd = grades[s.id]?.[column.id]?.value || 5;
    return {
      student: s,
      points: pts,
      percent: pct,
      grade: grd
    };
  }).sort((a, b) => b.points - a.points);

  // Find top distinct points values
  const uniqueScores = Array.from(new Set(rankedStudents.map(r => r.points))).slice(0, 3);
  const podium = uniqueScores.map((score, index) => {
    const matching = rankedStudents.filter(r => r.points === score);
    return {
      rank: index + 1, // 1st, 2nd, 3rd
      score,
      students: matching
    };
  });

  // Sort & Filter Leaderboard
  const handleSort = (field: 'name' | 'points' | 'grade') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  const filteredAndSortedList = rankedStudents.filter(entry => {
    const fullName = `${entry.student.firstName} ${entry.student.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  }).sort((a, b) => {
    let comp = 0;
    if (sortBy === 'name') {
      const nameA = `${a.student.lastName} ${a.student.firstName}`.toLowerCase();
      const nameB = `${b.student.lastName} ${b.student.firstName}`.toLowerCase();
      comp = nameA.localeCompare(nameB);
    } else if (sortBy === 'points') {
      comp = a.points - b.points;
    } else if (sortBy === 'grade') {
      const gA = parseFloat(a.grade.toString()) || 6;
      const gB = parseFloat(b.grade.toString()) || 6;
      comp = gA - gB;
    }
    return sortOrder === 'asc' ? comp : -comp;
  });

  const getGradeBgColor = (grade: number) => {
    switch (grade) {
      case 1: return '#15803d'; // Dunkelgrün
      case 2: return '#86efac'; // Hellgrün
      case 3: return '#cbd5e1'; // Grau
      case 4: return '#fca5a5'; // Hellrot
      case 5: return '#b91c1c'; // Dunkelrot
      default: return '#cbd5e1';
    }
  };

  const getGradeTextColor = (grade: number) => {
    switch (grade) {
      case 1:
      case 5:
        return 'white';
      case 2: return '#064e3b';
      case 3: return '#334155';
      case 4: return '#7f1d1d';
      default: return '#334155';
    }
  };

  const getGradeName = (grade: number) => {
    switch (grade) {
      case 1: return 'Sehr Gut';
      case 2: return 'Gut';
      case 3: return 'Befriedigend';
      case 4: return 'Genügend';
      case 5: return 'Nicht Genügend';
      default: return '';
    }
  };

  const renderPodiumNames = (students: { student: Student }[], colorClass: string) => {
    const names = students.map(s => s.student.lastName);
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentRowLength = 0;
    const MAX_ROW_CHARS = 18;

    for (const name of names) {
      const additionalLength = currentRow.length > 0 ? name.length + 2 : name.length;
      if (currentRow.length > 0 && currentRowLength + additionalLength > MAX_ROW_CHARS) {
        rows.push(currentRow);
        currentRow = [name];
        currentRowLength = name.length;
      } else {
        currentRow.push(name);
        currentRowLength += additionalLength;
      }
    }
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', width: '100%' }}>
        {rows.map((row, idx) => (
          <div 
            key={idx} 
            style={{ 
              fontSize: '16px', 
              color: colorClass, 
              fontWeight: 'bold',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              textAlign: 'center'
            }}
          >
            {row.join(', ')}
          </div>
        ))}
      </div>
    );
  };

  return createPortal(
    <div className="evaluation-stats-fullscreen-overlay">
      {/* Styles local to print and fullscreen layout */}
      <style>{`
        .evaluation-stats-fullscreen-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #f8fafc;
          z-index: 3000;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .stats-header-bar {
          background-color: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 16px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .stats-content-area {
          flex: 1;
          padding: 32px;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .stats-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .stats-grid-2-1 {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }

        .stats-grid-2-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .stats-card {
          background-color: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.03);
          display: flex;
          flex-direction: column;
        }

        .stats-metric-value {
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 8px;
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .stats-metric-subtitle {
          font-size: 16px;
          color: #64748b;
          margin-top: 4px;
        }

        .stats-section-title {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 16px;
          border-bottom: 1px dashed #e2e8f0;
          padding-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Notenspiegel (CSS Chart) */
        .grade-chart-container {
          display: flex;
          justify-content: space-around;
          align-items: flex-end;
          height: 180px;
          padding-top: 20px;
          border-bottom: 2px solid #e2e8f0;
        }

        .grade-chart-bar-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 15%;
          height: 100%;
          justify-content: flex-end;
        }

        .grade-chart-bar {
          width: 100%;
          border-top-left-radius: 6px;
          border-top-right-radius: 6px;
          transition: height 0.5s ease-out;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .grade-chart-label {
          font-size: 16px;
          font-weight: bold;
          margin-top: 8px;
          color: #475569;
        }

        /* Task analysis progress bars */
        .task-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 12px;
          border-radius: 8px;
          background-color: #f8fafc;
          border: 1px solid #f1f5f9;
        }

        .task-row.warning-task {
          background-color: #fffbeb;
          border-color: #fef3c7;
        }

        .task-progress-bg {
          height: 8px;
          width: 100%;
          background-color: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }

        .task-progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.4s ease;
        }

        /* Podium styling */
        .podium-container {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          gap: 12px;
          margin-top: 10px;
          height: 200px;
        }

        .podium-step {
          width: 30%;
          display: flex;
          flex-direction: column;
          align-items: center;
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.03);
          padding: 12px;
        }

        .podium-step-1 {
          height: 100%;
          background: linear-gradient(180deg, #fef3c7 0%, #fde68a 100%);
          border: 1px solid #fcd34d;
        }

        .podium-step-2 {
          height: 80%;
          background: linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%);
          border: 1px solid #cbd5e1;
        }

        .podium-step-3 {
          height: 65%;
          background: linear-gradient(180deg, #ffedd5 0%, #fed7aa 100%);
          border: 1px solid #fdba74;
        }

        /* Table styling */
        .stats-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .stats-table th {
          padding: 12px 16px;
          font-size: 16px;
          font-weight: 600;
          color: #475569;
          border-bottom: 2px solid #cbd5e1;
          cursor: pointer;
          user-select: none;
        }

        .stats-table th:hover {
          color: #0f172a;
          background-color: #f8fafc;
        }

        .stats-table td {
          padding: 12px 16px;
          font-size: 16px;
          color: #334155;
          border-bottom: 1px solid #f1f5f9;
        }

        .stats-table tr:hover td {
          background-color: #f8fafc;
        }

        /* Print optimization */
        @media print {
          .evaluation-stats-fullscreen-overlay {
            position: absolute !important;
            background-color: white !important;
            color: black !important;
            overflow: visible !important;
          }
          
          .stats-header-bar button, 
          .stats-header-bar .btn-icon,
          .stats-card input,
          .stats-card .relative,
          .stats-card select {
            display: none !important;
          }

          .stats-content-area {
            padding: 0 !important;
            max-width: 100% !important;
          }

          .stats-grid-4 {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 12px !important;
          }

          .stats-grid-2-1, .stats-grid-2-2 {
            grid-template-columns: 1fr 1fr !important;
            gap: 16px !important;
          }

          .stats-card {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* HEADER BAR */}
      <div className="stats-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onClose} 
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          >
            Zurück zur Spalte
          </button>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Auswertungs-Statistik
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '16px', color: '#64748b' }}>
              {column.title} &bull; Gesamt: {totalMaxPoints.toFixed(1)} Pkt. &bull; {subTasks.length} Aufgaben
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={() => window.print()}
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          >
            <Printer size={16} /> Drucken / PDF exportieren
          </button>
          <button 
            type="button"
            className="btn-icon" 
            onClick={onClose}
            style={{ width: '40px', height: '40px', borderRadius: '20px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9' }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="stats-content-area">
        
        {/* TOP METRICS CARDS */}
        <div className="stats-grid-4">
          <div className="stats-card">
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} className="text-primary" /> Beteiligung
            </span>
            <div className="stats-metric-value" style={{ fontSize: '32px' }}>
              {totalGraded} <span style={{ fontSize: '20px', fontWeight: 'normal', color: '#64748b' }}>/ {totalEnrolled}</span>
            </div>
            <div className="stats-metric-subtitle">
              {gradedPercentage}% der Schüler bewertet
            </div>
          </div>

          <div className="stats-card">
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={16} style={{ color: '#0f766e' }} /> Notenschnitt
            </span>
            <div className="stats-metric-value" style={{ fontSize: '32px' }}>
              {averageGrade.toFixed(2)}
            </div>
            <div className="stats-metric-subtitle">
              Ø Klassennote (1.0 - 5.0)
            </div>
          </div>

          <div className="stats-card">
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Smile size={16} style={{ color: '#16a34a' }} /> Erfolgsquote
            </span>
            <div className="stats-metric-value" style={{ fontSize: '32px' }}>
              {successRate.toFixed(1)}%
            </div>
            <div className="stats-metric-subtitle">
              {positiveStudentsCount} positive Beurteilungen (1-4)
            </div>
          </div>

          <div className="stats-card">
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Percent size={16} style={{ color: 'var(--primary-color)' }} /> Punkteschnitt
            </span>
            <div className="stats-metric-value" style={{ fontSize: '32px' }}>
              {averagePoints.toFixed(1)} <span style={{ fontSize: '20px', fontWeight: 'normal', color: '#64748b' }}>/ {totalMaxPoints}</span>
            </div>
            <div className="stats-metric-subtitle">
              Entspricht Ø {averagePercent.toFixed(1)}% der Gesamtpunkte
            </div>
          </div>
        </div>

        {/* NOTENSPIEGEL */}
        <div className="stats-card">
          <span className="stats-section-title">
            <BarChart3 size={16} /> Notenverteilung (Notenspiegel)
          </span>
          
          <div className="grade-chart-container">
            {[1, 2, 3, 4, 5].map(gradeNum => {
              const count = gradeCounts[gradeNum as 1|2|3|4|5];
              const pct = totalGraded > 0 ? (count / totalGraded) * 100 : 0;
              const barHeight = (count / maxGradeCount) * 100; // Relative height to highest bar

              return (
                <div key={gradeNum} className="grade-chart-bar-col">
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                    {count > 0 ? `${count}x` : ''}
                  </span>
                  <div 
                    className="grade-chart-bar"
                    style={{ 
                      height: `${barHeight}%`, 
                      backgroundColor: getGradeBgColor(gradeNum),
                      minHeight: count > 0 ? '20px' : '2px'
                    }}
                  >
                    {count > 0 && barHeight > 15 && (
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: getGradeTextColor(gradeNum) }}>
                        {pct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <span className="grade-chart-label">Note {gradeNum}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginTop: '16px', textAlign: 'center' }}>
            {[1, 2, 3, 4, 5].map(g => (
              <div key={g} style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '5px', backgroundColor: getGradeBgColor(g), marginRight: '4px' }}></span>
                {getGradeName(g)}
              </div>
            ))}
          </div>
        </div>

        {/* DIE BESTEN 3 */}
        <div className="stats-card">
          <span className="stats-section-title">
            <Trophy size={16} style={{ color: '#eab308' }} /> Die besten Leistungen
          </span>

          <div className="podium-container">
            {/* RANK 2 */}
            <div className="podium-step podium-step-2">
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#64748b', marginBottom: '8px' }}>2.</span>
              {podium.find(p => p.rank === 2) ? (
                <div style={{ textAlign: 'center', width: '100%' }}>
                  {renderPodiumNames(podium.find(p => p.rank === 2)?.students || [], '#334155')}
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>
                    {podium.find(p => p.rank === 2)?.score.toFixed(1)} Pkt.
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: '16px', color: '#cbd5e1' }}>-</span>
              )}
            </div>

            {/* RANK 1 */}
            <div className="podium-step podium-step-1">
              <Trophy size={20} style={{ color: '#d97706', marginBottom: '4px' }} />
              <span style={{ fontSize: '24px', fontWeight: '800', color: '#b45309', marginBottom: '4px' }}>1.</span>
              {podium.find(p => p.rank === 1) ? (
                <div style={{ textAlign: 'center', width: '100%' }}>
                  {renderPodiumNames(podium.find(p => p.rank === 1)?.students || [], '#78350f')}
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#451a03', marginTop: '6px' }}>
                    {podium.find(p => p.rank === 1)?.score.toFixed(1)} Pkt.
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: '16px', color: '#fef3c7' }}>-</span>
              )}
            </div>

            {/* RANK 3 */}
            <div className="podium-step podium-step-3">
              <span style={{ fontSize: '18px', fontWeight: '800', color: '#c2410c', marginBottom: '8px' }}>3.</span>
              {podium.find(p => p.rank === 3) ? (
                <div style={{ textAlign: 'center', width: '100%' }}>
                  {renderPodiumNames(podium.find(p => p.rank === 3)?.students || [], '#431407')}
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#431407', marginTop: '4px' }}>
                    {podium.find(p => p.rank === 3)?.score.toFixed(1)} Pkt.
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: '16px', color: '#ffedd5' }}>-</span>
              )}
            </div>
          </div>
        </div>

        {/* SUBTASKS ROW (GRID 2-2) */}
        <div className="stats-grid-2-2">
          {/* AUFGABEN-ANALYSE */}
          <div className="stats-card">
            <span className="stats-section-title">
              <ClipboardList size={16} /> Teilaufgaben-Analyse (Ø Punkte pro Aufgabe)
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {subTaskPerformance.map(task => {
                const isTooHard = task.percentage < 60;

                return (
                  <div key={task.id} className={`task-row ${isTooHard ? 'warning-task' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {task.title}
                        {isTooHard && (
                          <span style={{ fontSize: '13px', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', color: '#b45309', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 'normal' }}>
                            <AlertTriangle size={12} /> Schwierige Aufgabe
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#475569' }}>
                        {task.averagePoints.toFixed(1)} / {task.maxPoints} Pkt. ({task.percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="task-progress-bg">
                      <div 
                        className="task-progress-fill"
                        style={{ 
                          width: `${task.percentage}%`,
                          backgroundColor: isTooHard ? '#f59e0b' : '#3b82f6'
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STATS OVERVIEW */}
          <div className="stats-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span className="stats-section-title">
              <Smile size={16} /> Klassenspiegel-Zusammenfassung
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontSize: '16px' }}>Beste Punkteanzahl</span>
                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '16px' }}>
                  {rankedStudents.length > 0 ? rankedStudents[0].points.toFixed(1) : '0.0'} Pkt. ({rankedStudents.length > 0 ? rankedStudents[0].percent.toFixed(1) : '0'}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontSize: '16px' }}>Schlechteste Punkteanzahl</span>
                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '16px' }}>
                  {rankedStudents.length > 0 ? rankedStudents[rankedStudents.length - 1].points.toFixed(1) : '0.0'} Pkt. ({rankedStudents.length > 0 ? rankedStudents[rankedStudents.length - 1].percent.toFixed(1) : '0'}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontSize: '16px' }}>Genügend-Schwelle (4)</span>
                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '16px' }}>
                  {column.gradingKey?.grade4MinPoints?.toFixed(1) || '0.0'} Pkt. ({totalMaxPoints > 0 && column.gradingKey?.grade4MinPoints ? ((column.gradingKey.grade4MinPoints / totalMaxPoints) * 100).toFixed(0) : 0}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px' }}>
                <span style={{ color: '#64748b', fontSize: '16px' }}>Sehr Gut-Schwelle (1)</span>
                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '16px' }}>
                  {column.gradingKey?.grade1MinPoints?.toFixed(1) || '0.0'} Pkt. ({totalMaxPoints > 0 && column.gradingKey?.grade1MinPoints ? ((column.gradingKey.grade1MinPoints / totalMaxPoints) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RESULTS LEADERBOARD TABLE */}
        <div className="stats-card">
          <span className="stats-section-title" style={{ marginBottom: '16px' }}>
            <Users size={16} /> Schüler-Ergebnisse & Rangliste
          </span>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
            {/* Search filter */}
            <div style={{ position: 'relative', width: '320px' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Schüler suchen..." 
                style={{ paddingLeft: '36px', height: '38px', margin: 0 }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
            </div>
            
            <div style={{ fontSize: '16px', color: '#64748b', display: 'flex', alignItems: 'center' }}>
              Angezeigt: {filteredAndSortedList.length} von {totalGraded} Ergebnissen
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="stats-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')} style={{ width: '30%' }}>
                    Schülername <ArrowUpDown size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                  {subTasks.map(t => (
                    <th key={t.id} style={{ textAlign: 'center', fontSize: '16px' }}>
                      {t.title} <br />
                      <span style={{ fontWeight: 'normal', color: '#64748b', fontSize: '14px' }}>max {t.maxPoints} Pkt.</span>
                    </th>
                  ))}
                  <th onClick={() => handleSort('points')} style={{ textAlign: 'center', width: '15%' }}>
                    Gesamtpunkte <ArrowUpDown size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                  <th onClick={() => handleSort('grade')} style={{ textAlign: 'center', width: '15%' }}>
                    Note <ArrowUpDown size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedList.map((entry) => {
                  const sGrade = grades[entry.student.id]?.[column.id];
                  const numericGrade = parseInt(entry.grade.toString(), 10);

                  return (
                    <tr key={entry.student.id}>
                      <td style={{ fontWeight: '600' }}>
                        {entry.student.lastName}, {entry.student.firstName}
                      </td>
                      {subTasks.map(t => {
                        const pts = sGrade?.subTaskPoints?.[t.id];
                        return (
                          <td key={t.id} style={{ textAlign: 'center', color: pts === undefined ? '#cbd5e1' : '#334155' }}>
                            {pts !== undefined ? pts.toFixed(1) : '-'}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        <span className="text-primary">{entry.points.toFixed(1)} Pkt.</span>
                        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'normal', marginLeft: '6px' }}>
                          ({entry.percent.toFixed(1)}%)
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '36px',
                          height: '36px',
                          borderRadius: '18px',
                          backgroundColor: getGradeBgColor(numericGrade),
                          color: getGradeTextColor(numericGrade),
                          fontWeight: 'bold',
                          fontSize: '16px'
                        }}>
                          {entry.grade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
