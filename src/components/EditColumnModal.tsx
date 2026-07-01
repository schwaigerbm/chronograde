import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Sparkles, BarChart3 } from 'lucide-react';
import type { CourseEntry, SubTask, Student, GradesState } from '../schema';
import { EvaluationStatisticsModal } from './EvaluationStatisticsModal';

interface EditColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  column: CourseEntry | null;
  onSave: (updatedColumn: CourseEntry) => void;
  students: Student[];
  grades: GradesState;
}

export const EditColumnModal = ({ 
  isOpen, 
  onClose, 
  column, 
  onSave,
  students = [],
  grades = {}
}: EditColumnModalProps) => {
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [cutoffDate, setCutoffDate] = useState('');
  const [calc, setCalc] = useState(true);
  const [calcFactor, setCalcFactor] = useState(100);
  const [isColorEnabled, setIsColorEnabled] = useState(false);
  const [showDateInHeader, setShowDateInHeader] = useState(true);

  // Evaluation fields
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [grade1MinPoints, setGrade1MinPoints] = useState<number>(0);
  const [grade2MinPoints, setGrade2MinPoints] = useState<number>(0);
  const [grade3MinPoints, setGrade3MinPoints] = useState<number>(0);
  const [grade4MinPoints, setGrade4MinPoints] = useState<number>(0);

  useEffect(() => {
    if (column) {
      setTitle(column.title);
      setDate(column.date);
      setCutoffDate(column.cutoffDate || '');
      setCalc(column.calc !== false);
      setCalcFactor(column.calcFactor);
      setIsColorEnabled(!!column.isColorEnabled);
      setShowDateInHeader(column.showDateInHeader !== false);

      if (column.type === 'evaluation') {
        setSubTasks(column.subTasks || []);
        setGrade1MinPoints(column.gradingKey?.grade1MinPoints || 0);
        setGrade2MinPoints(column.gradingKey?.grade2MinPoints || 0);
        setGrade3MinPoints(column.gradingKey?.grade3MinPoints || 0);
        setGrade4MinPoints(column.gradingKey?.grade4MinPoints || 0);
      }
    }
  }, [column]);

  const totalMaxPoints = subTasks.reduce((sum, t) => sum + (t.maxPoints || 0), 0);
  const gradeThresholdsInvalid = column?.type === 'evaluation' && (
    grade1MinPoints < grade2MinPoints || 
    grade2MinPoints < grade3MinPoints || 
    grade3MinPoints < grade4MinPoints || 
    grade1MinPoints > totalMaxPoints
  );

  // Auto-adjust default thresholds if they are 0
  useEffect(() => {
    if (column?.type === 'evaluation' && subTasks.length > 0 && totalMaxPoints > 0 && grade1MinPoints === 0 && grade2MinPoints === 0 && grade3MinPoints === 0 && grade4MinPoints === 0) {
      setGrade1MinPoints(Math.round(totalMaxPoints * 0.9 * 2) / 2);
      setGrade2MinPoints(Math.round(totalMaxPoints * 0.8 * 2) / 2);
      setGrade3MinPoints(Math.round(totalMaxPoints * 0.65 * 2) / 2);
      setGrade4MinPoints(Math.round(totalMaxPoints * 0.5 * 2) / 2);
    }
  }, [totalMaxPoints, subTasks, column?.type, grade1MinPoints, grade2MinPoints, grade3MinPoints, grade4MinPoints]);

  if (!isOpen || !column) return null;

  const handleSave = () => {
    const isCalcAllowed = column.type !== 'groupAssignment' && column.type !== 'presenceSum' && column.type !== 'calculated';
    const updatedColumn: CourseEntry = {
      ...column,
      title,
      date,
      calc: isCalcAllowed ? calc : false,
      calcFactor: isCalcAllowed ? calcFactor : 0,
      isColorEnabled: (column.type === 'manual' || column.type === 'evaluation') ? isColorEnabled : false,
      showDateInHeader: (column.type === 'groupAssignment' || column.type === 'collaborationSum' || column.type === 'presenceSum') ? false : showDateInHeader,
    };

    if (column.type === 'calculated') {
      updatedColumn.cutoffDate = cutoffDate;
    } else {
      delete updatedColumn.cutoffDate;
    }

    if (column.type === 'evaluation') {
      updatedColumn.subTasks = subTasks;
      updatedColumn.gradingKey = {
        grade1MinPoints,
        grade2MinPoints,
        grade3MinPoints,
        grade4MinPoints
      };
    }

    // Clean up roundingRule if it exists from previous versions
    delete updatedColumn.roundingRule;

    onSave(updatedColumn);
    onClose();
  };

  const gradedCount = column 
    ? (column.type === 'collaborationSum'
        ? students.filter(s => {
            const g = grades[s.id]?.[column.id];
            return (g?.value !== undefined) || (g?.entries && g.entries.length > 0);
          }).length
        : students.filter(s => grades[s.id]?.[column.id]?.value !== undefined).length)
    : 0;

  const totalStudentsCount = students.length;

  const averageGradePreview = column && gradedCount > 0
    ? (() => {
        const numericGrades = students
          .map(s => parseFloat(grades[s.id]?.[column.id]?.value?.toString() || ''))
          .filter(v => !isNaN(v) && v >= 1 && v <= 5);
        if (numericGrades.length === 0) return '-';
        return (numericGrades.reduce((sum, v) => sum + v, 0) / numericGrades.length).toFixed(2);
      })()
    : '-';

  return (
    <div className="modal-overlay">
      <div className={`modal-card ${column.type === 'evaluation' ? 'modal-large' : ''}`} style={column.type !== 'evaluation' ? { maxWidth: '400px' } : undefined}>
        <div className="modal-header">
          <h3>Spalte bearbeiten</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {column.type === 'evaluation' ? (
            <div className="evaluation-layout-single-col">
              {/* Sektion Allgemeines */}
              <div className="evaluation-section">
                <h4 className="evaluation-section-title">Allgemeines</h4>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="z.B. 1. Schularbeit"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Datum</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Sektion Darstellung */}
              <div className="evaluation-section">
                <h4 className="evaluation-section-title">Darstellung</h4>
                <div className="toggle-box" style={{ margin: '8px 0' }}>
                  <div>
                    <div className="option-label">Datum im Header anzeigen</div>
                    <div className="option-desc">Sichtbarkeit des Datums in der Matrix</div>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={showDateInHeader} 
                      onChange={() => setShowDateInHeader(!showDateInHeader)} 
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="toggle-box" style={{ margin: '8px 0' }}>
                  <div>
                    <div className="option-label">Farbmodus (Heatmap)</div>
                    <div className="option-desc">Zellen basierend auf Note einfärben</div>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={isColorEnabled} 
                      onChange={() => setIsColorEnabled(!isColorEnabled)} 
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              {/* Sektion Statistik */}
              <div className="evaluation-section">
                <h4 className="evaluation-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BarChart3 size={16} /> Statistik
                </h4>
                <div style={{ padding: '8px 0' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ flex: 1, minWidth: '100px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Erfasst</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                        {gradedCount} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-muted)' }}>/ {totalStudentsCount}</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: '100px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Ø Note</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f766e', marginTop: '4px' }}>
                        {averageGradePreview}
                      </div>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    className="btn-primary"
                    onClick={() => setIsStatsOpen(true)}
                    style={{ 
                      width: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '8px', 
                      padding: '10px 16px',
                      borderRadius: '8px',
                      fontWeight: '600'
                    }}
                  >
                    <BarChart3 size={16} /> Analyse & Verteilung (Vollbild)
                  </button>
                </div>
              </div>

              {/* Sektion Teilaufgaben */}
              <div className="evaluation-section">
                <h4 className="evaluation-section-title">Teilaufgaben</h4>
                <div className="subtasks-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {subTasks.map((task, idx) => (
                    <div key={task.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ flex: 2 }}
                        placeholder={`z.B. Aufgabe ${idx + 1}`}
                        value={task.title}
                        onChange={(e) => {
                          const newTasks = [...subTasks];
                          newTasks[idx].title = e.target.value;
                          setSubTasks(newTasks);
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ width: '80px' }}
                          placeholder="Max. Pkt"
                          min="0.5"
                          step="0.5"
                          value={task.maxPoints || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const newTasks = [...subTasks];
                            newTasks[idx].maxPoints = val;
                            setSubTasks(newTasks);
                          }}
                        />
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pkt.</span>
                      </div>
                      {subTasks.length > 1 && (
                        <button 
                          type="button" 
                          className="btn-icon danger btn-sm"
                          onClick={() => {
                            setSubTasks(subTasks.filter(t => t.id !== task.id));
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button 
                  type="button" 
                  className="btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'auto', marginBottom: '16px' }}
                  onClick={() => {
                    setSubTasks([...subTasks, { 
                      id: Date.now().toString() + Math.random().toString().substring(2, 6), 
                      title: `Aufgabe ${subTasks.length + 1}`, 
                      maxPoints: 5 
                    }]);
                  }}
                >
                  <Plus size={14} /> Teilaufgabe hinzufügen
                </button>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Gesamte maximale Punkte:</span>
                    <span className="text-primary">{totalMaxPoints} Punkte</span>
                  </div>
                </div>
              </div>

              {/* Sektion Beurteilung */}
              <div className="evaluation-section">
                <h4 className="evaluation-section-title">Beurteilung</h4>
                
                <div className="grading-key-container" style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Notenschlüssel</span>
                    <button 
                      type="button" 
                      className="btn-secondary btn-xs"
                      style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px', marginTop: 0 }}
                      onClick={() => {
                        const g4 = Math.round(totalMaxPoints * 0.5 * 2) / 2;
                        const g3 = Math.round(totalMaxPoints * 0.625 * 2) / 2;
                        const g2 = Math.round(totalMaxPoints * 0.75 * 2) / 2;
                        const g1 = Math.round(totalMaxPoints * 0.875 * 2) / 2;
                        setGrade4MinPoints(g4);
                        setGrade3MinPoints(g3);
                        setGrade2MinPoints(g2);
                        setGrade1MinPoints(g1);
                      }}
                    >
                      <Sparkles size={12} /> Linear (ab 50%)
                    </button>
                  </div>

                  {/* Visueller Zeitstrahl */}
                  {(() => {
                    const totalMax = totalMaxPoints || 100;
                    const g4 = Math.max(0, Math.min(grade4MinPoints, totalMax));
                    const g3 = Math.max(g4, Math.min(grade3MinPoints, totalMax));
                    const g2 = Math.max(g3, Math.min(grade2MinPoints, totalMax));
                    const g1 = Math.max(g2, Math.min(grade1MinPoints, totalMax));

                    const isHalfThreshold = Math.abs(g4 - (totalMax * 0.5)) < 0.01;

                    let pct5 = 0;
                    let pct4 = 0;
                    let pct3 = 0;
                    let pct2 = 0;
                    let pct1 = 0;

                    if (isHalfThreshold && totalMax > g4) {
                      pct5 = 15;
                      const remainingPct = 85;
                      const remainingPoints = totalMax - g4;
                      if (remainingPoints > 0) {
                        pct4 = ((g3 - g4) / remainingPoints) * remainingPct;
                        pct3 = ((g2 - g3) / remainingPoints) * remainingPct;
                        pct2 = ((g1 - g2) / remainingPoints) * remainingPct;
                        pct1 = ((totalMax - g1) / remainingPoints) * remainingPct;
                      } else {
                        pct1 = 85;
                      }
                    } else {
                      pct5 = totalMax > 0 ? (g4 / totalMax) * 100 : 0;
                      pct4 = totalMax > 0 ? ((g3 - g4) / totalMax) * 100 : 0;
                      pct3 = totalMax > 0 ? ((g2 - g3) / totalMax) * 100 : 0;
                      pct2 = totalMax > 0 ? ((g1 - g2) / totalMax) * 100 : 0;
                      pct1 = totalMax > 0 ? ((totalMax - g1) / totalMax) * 100 : 0;
                    }

                    return (
                      <div style={{ marginBottom: '14px', marginTop: '6px' }}>
                        <div style={{ 
                          display: 'flex', 
                          width: '100%', 
                          height: '44px', 
                          borderRadius: '8px', 
                          overflow: 'hidden', 
                          background: '#cbd5e1', 
                          border: '1px solid var(--border-color)',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
                        }}>
                          {/* 1 (Sehr Gut) */}
                          {pct1 > 0 && (
                            <div style={{ 
                              width: `${pct1}%`, 
                              backgroundColor: '#15803d', 
                              color: 'white', 
                              display: 'flex', 
                              flexDirection: 'column',
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              transition: 'width 0.2s ease',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap'
                            }} title={`Sehr Gut (1): ${g1.toFixed(1)} - ${totalMax.toFixed(1)} Pkt.`}>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2' }}>1</span>
                              <span style={{ fontSize: '11px', fontWeight: 'normal', opacity: 0.95, lineHeight: '1.1' }}>{(totalMax - g1).toFixed(1)} Pkt.</span>
                            </div>
                          )}
                          {/* 2 (Gut) */}
                          {pct2 > 0 && (
                            <div style={{ 
                              width: `${pct2}%`, 
                              backgroundColor: '#86efac', 
                              color: '#064e3b', 
                              display: 'flex', 
                              flexDirection: 'column',
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              transition: 'width 0.2s ease',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap'
                            }} title={`Gut (2): ${g2.toFixed(1)} - ${g1.toFixed(1)} Pkt.`}>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2' }}>2</span>
                              <span style={{ fontSize: '11px', fontWeight: 'normal', opacity: 0.95, lineHeight: '1.1' }}>{(g1 - g2).toFixed(1)} Pkt.</span>
                            </div>
                          )}
                          {/* 3 (Befriedigend) */}
                          {pct3 > 0 && (
                            <div style={{ 
                              width: `${pct3}%`, 
                              backgroundColor: '#f1f5f9', 
                              color: '#334155', 
                              display: 'flex', 
                              flexDirection: 'column',
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              transition: 'width 0.2s ease',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              borderLeft: '1px solid rgba(0,0,0,0.05)',
                              borderRight: '1px solid rgba(0,0,0,0.05)'
                            }} title={`Befriedigend (3): ${g3.toFixed(1)} - ${g2.toFixed(1)} Pkt.`}>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2' }}>3</span>
                              <span style={{ fontSize: '11px', fontWeight: 'normal', opacity: 0.95, lineHeight: '1.1' }}>{(g2 - g3).toFixed(1)} Pkt.</span>
                            </div>
                          )}
                          {/* 4 (Genügend) */}
                          {pct4 > 0 && (
                            <div style={{ 
                              width: `${pct4}%`, 
                              backgroundColor: '#fca5a5', 
                              color: '#7f1d1d', 
                              display: 'flex', 
                              flexDirection: 'column',
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              transition: 'width 0.2s ease',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap'
                            }} title={`Genügend (4): ${g4.toFixed(1)} - ${g3.toFixed(1)} Pkt.`}>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2' }}>4</span>
                              <span style={{ fontSize: '11px', fontWeight: 'normal', opacity: 0.95, lineHeight: '1.1' }}>{(g3 - g4).toFixed(1)} Pkt.</span>
                            </div>
                          )}
                          {/* 5 (Nicht Genügend) */}
                          {pct5 > 0 && (
                            <div style={{ 
                              width: `${pct5}%`, 
                              backgroundColor: '#b91c1c', 
                              color: 'white', 
                              display: 'flex', 
                              flexDirection: 'column',
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              transition: 'width 0.2s ease',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap'
                            }} title={`Nicht Genügend (5): 0 - ${g4.toFixed(1)} Pkt.${isHalfThreshold ? ' (Skizziert / Komprimiert)' : ''}`}>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2' }}>5</span>
                              <span style={{ fontSize: '11px', fontWeight: 'normal', opacity: 0.95, lineHeight: '1.1' }}>{g4.toFixed(1)} Pkt.</span>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', padding: '0 4px' }}>
                          <span>{totalMaxPoints} Pkt. (100%)</span>
                          <span>0 Pkt. (0%)</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                    
                    {/* Sehr Gut (1) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <div style={{ width: '130px', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600' }}>Sehr Gut (1) ab</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100px' }}>
                        <input 
                          type="number" 
                          className="form-input text-center" 
                          style={{ width: '65px', padding: '4px 8px', margin: 0 }}
                          min="0"
                          max={totalMaxPoints}
                          step="0.5"
                          value={grade1MinPoints || ''}
                          onChange={e => setGrade1MinPoints(parseFloat(e.target.value) || 0)}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pkt.</span>
                      </div>
                      <div style={{ fontSize: '12px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)', display: 'flex', gap: '8px', flex: 1 }}>
                        <span style={{ fontWeight: '500' }}>Intervall:</span>
                        <span style={{ fontWeight: '700' }}>{totalMaxPoints.toFixed(1)} - {grade1MinPoints.toFixed(1)} Pkt.</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>({totalMaxPoints > 0 ? ((grade1MinPoints / totalMaxPoints) * 100).toFixed(0) : 0}%)</span>
                      </div>
                    </div>

                    {/* Gut (2) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <div style={{ width: '130px', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600' }}>Gut (2) ab</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100px' }}>
                        <input 
                          type="number" 
                          className="form-input text-center" 
                          style={{ width: '65px', padding: '4px 8px', margin: 0 }}
                          min="0"
                          max={totalMaxPoints}
                          step="0.5"
                          value={grade2MinPoints || ''}
                          onChange={e => setGrade2MinPoints(parseFloat(e.target.value) || 0)}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pkt.</span>
                      </div>
                      <div style={{ fontSize: '12px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)', display: 'flex', gap: '8px', flex: 1 }}>
                        <span style={{ fontWeight: '500' }}>Intervall:</span>
                        <span style={{ fontWeight: '700' }}>{Math.max(0, grade1MinPoints - 0.5).toFixed(1)} - {grade2MinPoints.toFixed(1)} Pkt.</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>({totalMaxPoints > 0 ? ((grade2MinPoints / totalMaxPoints) * 100).toFixed(0) : 0}%)</span>
                      </div>
                    </div>

                    {/* Befriedigend (3) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <div style={{ width: '130px', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600' }}>Befriedigend (3) ab</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100px' }}>
                        <input 
                          type="number" 
                          className="form-input text-center" 
                          style={{ width: '65px', padding: '4px 8px', margin: 0 }}
                          min="0"
                          max={totalMaxPoints}
                          step="0.5"
                          value={grade3MinPoints || ''}
                          onChange={e => setGrade3MinPoints(parseFloat(e.target.value) || 0)}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pkt.</span>
                      </div>
                      <div style={{ fontSize: '12px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)', display: 'flex', gap: '8px', flex: 1 }}>
                        <span style={{ fontWeight: '500' }}>Intervall:</span>
                        <span style={{ fontWeight: '700' }}>{Math.max(0, grade2MinPoints - 0.5).toFixed(1)} - {grade3MinPoints.toFixed(1)} Pkt.</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>({totalMaxPoints > 0 ? ((grade3MinPoints / totalMaxPoints) * 100).toFixed(0) : 0}%)</span>
                      </div>
                    </div>

                    {/* Genügend (4) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <div style={{ width: '130px', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600' }}>Genügend (4) ab</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100px' }}>
                        <input 
                          type="number" 
                          className="form-input text-center" 
                          style={{ width: '65px', padding: '4px 8px', margin: 0 }}
                          min="0"
                          max={totalMaxPoints}
                          step="0.5"
                          value={grade4MinPoints || ''}
                          onChange={e => setGrade4MinPoints(parseFloat(e.target.value) || 0)}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pkt.</span>
                      </div>
                      <div style={{ fontSize: '12px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)', display: 'flex', gap: '8px', flex: 1 }}>
                        <span style={{ fontWeight: '500' }}>Intervall:</span>
                        <span style={{ fontWeight: '700' }}>{Math.max(0, grade3MinPoints - 0.5).toFixed(1)} - {grade4MinPoints.toFixed(1)} Pkt.</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>({totalMaxPoints > 0 ? ((grade4MinPoints / totalMaxPoints) * 100).toFixed(0) : 0}%)</span>
                      </div>
                    </div>

                    {/* Nicht Genügend (5) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '2px' }}>
                      <div style={{ width: '130px', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600', color: 'var(--danger-color)' }}>Nicht Genügend (5)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100px' }}>
                        <span style={{ width: '65px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '11px' }}>(automatisch)</span>
                      </div>
                      <div style={{ fontSize: '12px', background: '#fef2f2', padding: '4px 8px', borderRadius: '4px', color: 'var(--danger-color)', border: '1px solid #fee2e2', display: 'flex', gap: '8px', flex: 1 }}>
                        <span style={{ fontWeight: '500' }}>Intervall:</span>
                        <span style={{ fontWeight: '700' }}>{Math.max(0, grade4MinPoints - 0.5).toFixed(1)} - 0.0 Pkt.</span>
                        <span style={{ color: '#f87171', marginLeft: 'auto' }}>(&lt; {totalMaxPoints > 0 ? ((grade4MinPoints / totalMaxPoints) * 100).toFixed(0) : 0}%)</span>
                      </div>
                    </div>

                  </div>
                  {gradeThresholdsInvalid && (
                    <p className="error-message" style={{ marginTop: '8px', padding: '6px', fontSize: '11px', marginBottom: 0 }}>
                      Ungültiger Notenschlüssel! Die Mindestpunkte müssen absteigend sein (1 &ge; 2 &ge; 3 &ge; 4).
                    </p>
                  )}
                </div>

                <div className="assessment-influence-container">
                  <span className="section-subtitle">Bewertungseinfluss</span>
                  <div className="toggle-box" style={{ margin: '8px 0' }}>
                    <div>
                      <div className="option-label">In Berechnung aufnehmen</div>
                      <div className="option-desc">Beeinflusst die Gesamtnote</div>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={calc} 
                        onChange={() => setCalc(!calc)} 
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  {calc && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        Berechnungseinfluss
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          step="1"
                          style={{ flex: 1, cursor: 'pointer', height: '6px' }}
                          value={calcFactor}
                          onChange={e => setCalcFactor(parseInt(e.target.value) || 0)}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            value={calcFactor}
                            onChange={e => {
                              let v = parseInt(e.target.value, 10);
                              if (isNaN(v)) v = 0;
                              setCalcFactor(Math.max(0, Math.min(100, v)));
                            }}
                            className="form-input text-center"
                            style={{ width: '60px', padding: '4px 6px', fontSize: '13px', fontWeight: 'bold' }}
                          />
                          <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Bezeichnung</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="z.B. 1. Test"
                  autoFocus
                />
              </div>

              {column.type === 'calculated' ? (
                <div className="form-group">
                  <label className="form-label">Stichtag (Cutoff-Date)</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={cutoffDate}
                    onChange={e => setCutoffDate(e.target.value)}
                  />
                </div>
              ) : column.type !== 'groupAssignment' && (
                <div className="form-group">
                  <label className="form-label">Datum</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>
              )}

              {column.type !== 'groupAssignment' && column.type !== 'presenceSum' && column.type !== 'calculated' && (
                <>
                  <div className="toggle-box">
                    <div>
                      <div className="option-label">In Berechnung aufnehmen</div>
                      <div className="option-desc">Beeinflusst die Gesamtnote</div>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={calc} 
                        onChange={() => setCalc(!calc)} 
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  {calc && (
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        Berechnungseinfluss
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          step="1"
                          style={{ flex: 1, cursor: 'pointer', height: '6px' }}
                          value={calcFactor}
                          onChange={e => setCalcFactor(parseInt(e.target.value) || 0)}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            value={calcFactor}
                            onChange={e => {
                              let v = parseInt(e.target.value, 10);
                              if (isNaN(v)) v = 0;
                              setCalcFactor(Math.max(0, Math.min(100, v)));
                            }}
                            className="form-input text-center"
                            style={{ width: '60px', padding: '4px 6px', fontSize: '13px', fontWeight: 'bold' }}
                          />
                          <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {column.type === 'manual' && (
                <div className="toggle-box">
                  <div>
                    <div className="option-label">Farbmodus (Heatmap)</div>
                    <div className="option-desc">Zellen basierend auf Wert einfärben</div>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={isColorEnabled} 
                      onChange={() => setIsColorEnabled(!isColorEnabled)} 
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              )}

              {(column.type === 'manual' || column.type === 'calculated') && (
                <div className="toggle-box">
                  <div>
                    <div className="option-label">Datum im Header anzeigen</div>
                    <div className="option-desc">Sichtbarkeit des Datums in der Matrix</div>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={showDateInHeader} 
                      onChange={() => setShowDateInHeader(!showDateInHeader)} 
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              )}

              {(column.type === 'manual' || column.type === 'calculated' || column.type === 'collaborationSum') && (
                <div className="evaluation-section" style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <h4 className="evaluation-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: 'bold', border: 'none', margin: 0, padding: 0 }}>
                    <BarChart3 size={16} /> Statistik
                  </h4>
                  <div style={{ padding: '8px 0' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ flex: 1, background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Erfasst</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                          {gradedCount} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-muted)' }}>/ {totalStudentsCount}</span>
                        </div>
                      </div>
                      {column.type !== 'collaborationSum' && (
                        <div style={{ flex: 1, background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Ø Note</div>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f766e', marginTop: '4px' }}>
                            {averageGradePreview}
                          </div>
                        </div>
                      )}
                    </div>

                    <button 
                      type="button" 
                      className="btn-primary"
                      onClick={() => setIsStatsOpen(true)}
                      style={{ 
                        width: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '8px', 
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontWeight: '600'
                      }}
                    >
                      <BarChart3 size={16} /> Analyse & Verteilung (Vollbild)
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto', marginTop: 0 }}
            disabled={!title || gradeThresholdsInvalid}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Speichern <Save size={18} /></span>
          </button>
        </div>
      </div>

      {column && (column.type === 'evaluation' || column.type === 'manual' || column.type === 'calculated' || column.type === 'collaborationSum') && (
        <EvaluationStatisticsModal
          isOpen={isStatsOpen}
          onClose={() => setIsStatsOpen(false)}
          column={column}
          students={students}
          grades={grades}
        />
      )}
    </div>
  );
};
