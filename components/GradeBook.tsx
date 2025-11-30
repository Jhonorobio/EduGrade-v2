import React, { useState, useEffect, memo, useCallback, useRef, useMemo } from 'react';
import { Plus, Trash2, Save, BarChart2, ChevronDown, Edit, X, PlusCircle, Loader2, AlertCircle } from 'lucide-react';
import { Student, StudentGradeRecord, PerformanceLevel, Activity, PeriodGradeData, AcademicSettings } from '../types';
import { ConfirmationModal } from './ConfirmationModal';
import { useToast } from './Toast';


interface GradeBookProps {
  assignmentId: string;
  students: Student[];
  data: StudentGradeRecord[];
  taskActivities: { [period: number]: Activity[] };
  workshopActivities: { [period: number]: Activity[] };
  onSave: (grades: StudentGradeRecord[], taskActivities: { [period: number]: Activity[] }, workshopActivities: { [period: number]: Activity[] }) => Promise<void>;
  onViewReport: () => void;
  academicSettings: AcademicSettings;
}

const getGradeInputColor = (value: number | string | null | undefined) => {
  const numValue = Number(value);
  if (value === '' || value === null || isNaN(numValue)) return 'bg-white';
  if (numValue < 6.0) return 'bg-red-50';
  if (numValue >= 9.0) return 'bg-green-50';
  return 'bg-white';
};

const AddActivityModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (type: 'tasks' | 'workshops', name: string, date: string) => void;
}> = ({ isOpen, onClose, onAdd }) => {
  if (!isOpen) return null;

  const [type, setType] = useState<'tasks' | 'workshops'>('tasks');
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(type, name, date);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in-up">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">Agregar Nueva Actividad</h3>
          <button onClick={onClose} className="p-1 hover:bg-neutral-200 rounded-full"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-600">Categoría</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'tasks' | 'workshops')}
                className="mt-1 w-full p-2 border rounded bg-white"
              >
                <option value="tasks">Apuntes y Tareas</option>
                <option value="workshops">Talleres y Exposiciones</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-600">Nombre de la Actividad</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full p-2 border rounded"
                placeholder="Ej: Taller #1"
                required
              />
            </div>
             <div>
              <label className="text-sm font-medium text-neutral-600">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full p-2 border rounded"
                required
              />
            </div>
          </div>
          <div className="p-4 bg-neutral-50 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-neutral-200 rounded-md">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-neutral-800 text-white rounded-md">Agregar</button>
          </div>
        </form>
      </div>
    </div>
  );
};


const GradeBookRow = memo<{
  studentId: string;
  periodData: PeriodGradeData;
  student: Student | undefined;
  taskColumns: number;
  workshopColumns: number;
  calculateRow: (gradeData: PeriodGradeData) => { definitive: number; performance: PerformanceLevel; };
  getPerformanceColor: (p: PerformanceLevel) => string;
  updateGrade: (studentId: string, type: 'tasks' | 'workshops', index: number, value: string) => void;
  updateSingleGrade: (studentId: string, field: 'attitude' | 'exam', value: string) => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>, studentId: string, currentType: 'tasks' | 'workshops' | 'attitude' | 'exam', currentIndex?: number) => void;
}>(({ studentId, periodData, student, taskColumns, workshopColumns, calculateRow, getPerformanceColor, updateGrade, updateSingleGrade, handleKeyDown }) => {
  const stats = calculateRow(periodData);
  return (
    <tr className="border-b hover:bg-neutral-50 group">
      <td className="p-2 border-r font-medium text-neutral-700 sticky left-0 bg-white group-hover:bg-neutral-50 z-10 whitespace-nowrap">{student?.name || 'Unknown'}</td>
      {taskColumns > 0 ? (
        Array.from({ length: taskColumns }).map((_, i) => (
          <td key={`t-${i}`} className="p-0">
            <input 
              id={`grade-input-${studentId}-tasks-${i}`}
              type="number" 
              className={`w-full h-full text-center p-2 focus:bg-neutral-50 focus:outline-none transition-colors ${getGradeInputColor(periodData.tasks[i])}`} 
              value={periodData.tasks[i] ?? ''} 
              onChange={(e) => updateGrade(studentId, 'tasks', i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, studentId, 'tasks', i)}
            />
          </td>
        ))
      ) : (
        <td className="p-2 text-center text-xs text-neutral-400 italic bg-neutral-50">N/A</td>
      )}
      {workshopColumns > 0 ? (
        Array.from({ length: workshopColumns }).map((_, i) => (
          <td key={`w-${i}`} className="p-0">
            <input 
              id={`grade-input-${studentId}-workshops-${i}`}
              type="number" 
              className={`w-full h-full text-center p-2 focus:bg-neutral-50 focus:outline-none transition-colors ${getGradeInputColor(periodData.workshops[i])}`} 
              value={periodData.workshops[i] ?? ''} 
              onChange={(e) => updateGrade(studentId, 'workshops', i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, studentId, 'workshops', i)}
            />
          </td>
        ))
      ) : (
        <td className="p-2 text-center text-xs text-neutral-400 italic bg-neutral-50">N/A</td>
      )}
      <td className="p-0">
        <input 
          id={`grade-input-${studentId}-attitude`}
          type="number" 
          className={`w-full h-full text-center p-2 focus:bg-neutral-50 focus:outline-none transition-colors ${getGradeInputColor(periodData.attitude)}`} 
          value={periodData.attitude ?? ''} 
          onChange={(e) => updateSingleGrade(studentId, 'attitude', e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, studentId, 'attitude')}
        />
      </td>
      <td className="p-0">
        <input 
          id={`grade-input-${studentId}-exam`}
          type="number" 
          className={`w-full h-full text-center p-2 focus:bg-neutral-50 focus:outline-none transition-colors ${getGradeInputColor(periodData.exam)}`} 
          value={periodData.exam ?? ''} 
          onChange={(e) => updateSingleGrade(studentId, 'exam', e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, studentId, 'exam')}
        />
      </td>
      <td className={`p-2 text-center font-bold ${stats.definitive < 6.0 ? 'text-red-600' : 'text-neutral-800'}`}>{stats.definitive.toFixed(1)}</td>
      <td className="p-2 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${getPerformanceColor(stats.performance)}`}>{stats.performance}</span></td>
    </tr>
  );
});
GradeBookRow.displayName = 'GradeBookRow';


const GradeBookCard = memo<{
  studentId: string;
  periodData: PeriodGradeData;
  student: Student | undefined;
  taskActivities: Activity[];
  workshopActivities: Activity[];
  calculateRow: (gradeData: PeriodGradeData) => { definitive: number; performance: PerformanceLevel; };
  getPerformanceColor: (p: PerformanceLevel) => string;
  updateGrade: (studentId: string, type: 'tasks' | 'workshops', index: number, value: string) => void;
  updateSingleGrade: (studentId: string, field: 'attitude' | 'exam', value: string) => void;
}>(({ studentId, periodData, student, taskActivities, workshopActivities, calculateRow, getPerformanceColor, updateGrade, updateSingleGrade }) => {
    const [isOpen, setIsOpen] = useState(false);
    const stats = calculateRow(periodData);

    return (
        <div className="bg-white rounded-lg shadow-sm border">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left">
                <span className="font-bold text-neutral-800 flex-1">{student?.name}</span>
                <div className="flex items-center gap-2 ml-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getPerformanceColor(stats.performance)}`}>{stats.performance}</span>
                    <span className={`font-bold text-lg ${stats.definitive < 6.0 ? 'text-red-600' : 'text-neutral-800'}`}>{stats.definitive.toFixed(1)}</span>
                    <ChevronDown size={20} className={`text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>
            {isOpen && (
                <div className="p-4 border-t space-y-4">
                    {/* Tareas */}
                    {taskActivities.length > 0 && (
                      <div>
                          <h4 className="font-semibold text-sm text-neutral-600 mb-2">Apuntes y Tareas ({taskActivities.length})</h4>
                          <div className="grid grid-cols-2 gap-3">
                              {taskActivities.map((activity, i) => (
                                  <div key={`task-mob-${i}`}>
                                      <label className="text-xs text-neutral-500">{activity.name}</label>
                                      <input
                                          type="number"
                                          className={`w-full text-center p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-400 transition-colors mt-1 ${getGradeInputColor(periodData.tasks[i])}`}
                                          value={periodData.tasks[i] ?? ''}
                                          onChange={(e) => updateGrade(studentId, 'tasks', i, e.target.value)}
                                          placeholder="0.0"
                                      />
                                  </div>
                              ))}
                          </div>
                      </div>
                    )}
                     {/* Talleres */}
                    {workshopActivities.length > 0 && (
                      <div>
                          <h4 className="font-semibold text-sm text-neutral-600 mb-2">Talleres y Exposiciones ({workshopActivities.length})</h4>
                          <div className="grid grid-cols-2 gap-3">
                              {workshopActivities.map((activity, i) => (
                                  <div key={`workshop-mob-${i}`}>
                                      <label className="text-xs text-neutral-500">{activity.name}</label>
                                      <input
                                          type="number"
                                          className={`w-full text-center p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-400 transition-colors mt-1 ${getGradeInputColor(periodData.workshops[i])}`}
                                          value={periodData.workshops[i] ?? ''}
                                          onChange={(e) => updateGrade(studentId, 'workshops', i, e.target.value)}
                                          placeholder="0.0"
                                      />
                                  </div>
                              ))}
                          </div>
                      </div>
                    )}
                     {/* Actitudinal y Examen */}
                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                         <div>
                            <h4 className="font-semibold text-sm text-neutral-600 mb-1">Actitudinal</h4>
                             <input
                                type="number"
                                className={`w-full text-center p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-400 transition-colors ${getGradeInputColor(periodData.attitude)}`}
                                value={periodData.attitude ?? ''}
                                onChange={(e) => updateSingleGrade(studentId, 'attitude', e.target.value)}
                                placeholder="0.0"
                            />
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm text-neutral-600 mb-1">Evaluación</h4>
                             <input
                                type="number"
                                className={`w-full text-center p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-400 transition-colors ${getGradeInputColor(periodData.exam)}`}
                                value={periodData.exam ?? ''}
                                onChange={(e) => updateSingleGrade(studentId, 'exam', e.target.value)}
                                placeholder="0.0"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});
GradeBookCard.displayName = 'GradeBookCard';

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; }> = ({ checked, onChange }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-800"></div>
  </label>
);

export const GradeBook: React.FC<GradeBookProps> = ({ students, data, taskActivities, workshopActivities, onSave, onViewReport, assignmentId, academicSettings }) => {
  const [localData, setLocalData] = useState<StudentGradeRecord[]>(data);
  const [localTaskActivities, setLocalTaskActivities] = useState<{ [p: number]: Activity[] }>(taskActivities);
  const [localWorkshopActivities, setLocalWorkshopActivities] = useState<{ [p: number]: Activity[] }>(workshopActivities);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<number | 'Resumen'>(1);
  const [isAverageViewEnabled, setIsAverageViewEnabled] = useState(false);

  const [activityToDelete, setActivityToDelete] = useState<{ type: 'tasks' | 'workshops'; index: number } | null>(null);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving' | 'error'>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const { addToast } = useToast();
  
  const periods = useMemo(() => Array.from({ length: academicSettings.periodCount }, (_, i) => i + 1), [academicSettings.periodCount]);
  // FIX: Added 'as const' to ensure 'Resumen' is treated as a literal type, not a generic string.
  // This resolves the TypeScript error when calling setCurrentPeriod.
  const periodsWithSummary = useMemo(() => [...periods, 'Resumen' as const], [periods]);

  useEffect(() => {
    setLocalData(data);
    setLocalTaskActivities(taskActivities);
    setLocalWorkshopActivities(workshopActivities);
    setSaveStatus('saved');
    setSaveError(null);
  }, [assignmentId, data, taskActivities, workshopActivities]);

  const debounceTimeoutRef = useRef<number | null>(null);

  // --- Start: Save on Unmount Logic ---
  const stateRef = useRef({
    localData,
    localTaskActivities,
    localWorkshopActivities,
    saveStatus,
    onSave,
  });

  useEffect(() => {
    stateRef.current = {
      localData,
      localTaskActivities,
      localWorkshopActivities,
      saveStatus,
      onSave,
    };
  });

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      const {
        saveStatus: latestSaveStatus,
        onSave: latestOnSave,
        localData: latestLocalData,
        localTaskActivities: latestLocalTaskActivities,
        localWorkshopActivities: latestLocalWorkshopActivities,
      } = stateRef.current;
      
      if (latestSaveStatus === 'unsaved') {
        console.log("Saving changes on component unmount.");
        latestOnSave(latestLocalData, latestLocalTaskActivities, latestLocalWorkshopActivities)
          .catch(err => {
            console.error("Failed to save on unmount:", err);
          });
      }
    };
  }, []);
  // --- End: Save on Unmount Logic ---

  const handleSaveChanges = useCallback(async (isManualSave = false) => {
    if (saveStatus === 'saving' || (saveStatus === 'saved' && !isManualSave)) return;

    setSaveStatus('saving');
    setSaveError(null);
    try {
        await onSave(localData, localTaskActivities, localWorkshopActivities);
        setSaveStatus('saved');
        if (isManualSave) {
          addToast('Calificaciones guardadas con éxito', 'success');
        }
    } catch (error) {
        console.error("Save failed:", error);
        setSaveStatus('error');
        const message = error instanceof Error ? error.message : 'Error al guardar las calificaciones.';
        setSaveError(message);
        addToast(message, 'error');
    }
  }, [saveStatus, onSave, localData, localTaskActivities, localWorkshopActivities, addToast]);

  const debouncedSave = useCallback(() => {
    if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = window.setTimeout(() => {
        handleSaveChanges(false);
    }, 2000);
  }, [handleSaveChanges]);


  useEffect(() => {
    if (isAutoSaveEnabled && saveStatus === 'unsaved') {
        debouncedSave();
    }
    return () => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
    };
  }, [saveStatus, isAutoSaveEnabled, debouncedSave]);


  const currentTaskActivities = typeof currentPeriod === 'number' ? localTaskActivities[currentPeriod] || [] : [];
  const currentWorkshopActivities = typeof currentPeriod === 'number' ? localWorkshopActivities[currentPeriod] || [] : [];
  const taskColumns = currentTaskActivities.length;
  const workshopColumns = currentWorkshopActivities.length;

  const createEmptyPeriodData = (): PeriodGradeData => ({
    tasks: [],
    workshops: [],
    attitude: null,
    exam: null,
    convivenciaProblemas: '',
    llegadaTarde: false,
    presentacionPersonal: 'Adecuada',
    observaciones: '',
  });

  const updateGrade = (studentId: string, type: 'tasks' | 'workshops', index: number, value: string) => {
    if (typeof currentPeriod === 'string') return;
    const numValue = parseFloat(value);
    if (isNaN(numValue) && value !== '' && value !== '.') return;
    
    const validValue = value === '' ? null : Math.min(Math.max(numValue, 0), 10);

    setLocalData(prev => prev.map(d => {
      if (d.studentId !== studentId) return d;
      const newPeriods = { ...d.periods };
      if (!newPeriods[currentPeriod]) {
        newPeriods[currentPeriod] = createEmptyPeriodData();
      }
      const newPeriodData = { ...newPeriods[currentPeriod] };
      const newArr = [...newPeriodData[type]];
      while (newArr.length <= index) newArr.push(null);
      newArr[index] = validValue;
      newPeriodData[type] = newArr;
      newPeriods[currentPeriod] = newPeriodData;
      return { ...d, periods: newPeriods };
    }));
    setSaveStatus('unsaved');
    setSaveError(null);
  };

  const updateSingleGrade = (studentId: string, field: 'attitude' | 'exam', value: string) => {
    if (typeof currentPeriod === 'string') return;
    const numValue = parseFloat(value);
    if (isNaN(numValue) && value !== '' && value !== '.') return;
    
    const validValue = value === '' ? null : Math.min(Math.max(numValue, 0), 10);
    setLocalData(prev => prev.map(d => {
      if (d.studentId !== studentId) return d;
      const newPeriods = { ...d.periods };
      if (!newPeriods[currentPeriod]) {
        newPeriods[currentPeriod] = createEmptyPeriodData();
      }
      const newPeriodData = { ...newPeriods[currentPeriod], [field]: validValue };
      newPeriods[currentPeriod] = newPeriodData;
      return { ...d, periods: newPeriods };
    }));
    setSaveStatus('unsaved');
    setSaveError(null);
  };

  const handleActivityChange = (type: 'tasks' | 'workshops', index: number, field: 'name' | 'date', value: string) => {
    if (typeof currentPeriod === 'string') return;
    const updater = type === 'tasks' ? setLocalTaskActivities : setLocalWorkshopActivities;
    updater(prev => {
      const newActivitiesForPeriod = [...(prev[currentPeriod] || [])].map((act, i) => i === index ? { ...act, [field]: value } : act);
      return { ...prev, [currentPeriod]: newActivitiesForPeriod };
    });
    setSaveStatus('unsaved');
    setSaveError(null);
  };

  const addActivity = (type: 'tasks' | 'workshops', name: string, date: string) => {
    if (typeof currentPeriod === 'string') return;
    const updater = type === 'tasks' ? setLocalTaskActivities : setLocalWorkshopActivities;
    updater(prev => {
       const newActivitiesForPeriod = [...(prev[currentPeriod] || []), { name, date }];
       return { ...prev, [currentPeriod]: newActivitiesForPeriod };
    });
    setSaveStatus('unsaved');
    setSaveError(null);
  };

  const handleConfirmRemoveActivity = () => {
    if (!activityToDelete || typeof currentPeriod === 'string') return;
    const { type, index } = activityToDelete;

    const updater = type === 'tasks' ? setLocalTaskActivities : setLocalWorkshopActivities;
    updater(prev => {
      const activitiesForPeriod = prev[currentPeriod] || [];
      const newActivities = [...activitiesForPeriod];
      newActivities.splice(index, 1);
      
      setLocalData(currentData => currentData.map(studentData => {
        const periodData = studentData.periods[currentPeriod];
        if (periodData) {
          const newGrades = [...periodData[type]];
          newGrades.splice(index, 1);
          const newPeriods = { ...studentData.periods, [currentPeriod]: { ...periodData, [type]: newGrades } };
          return { ...studentData, periods: newPeriods };
        }
        return studentData;
      }));

      return { ...prev, [currentPeriod]: newActivities };
    });
    
    setSaveStatus('unsaved');
    setSaveError(null);
    setActivityToDelete(null);
  };
  
  const calculatePeriodDefinitive = (periodData: PeriodGradeData, period: number) => {
    if (!periodData) return 0;
    const taskActivitiesForPeriod = localTaskActivities[period] || [];
    const workshopActivitiesForPeriod = localWorkshopActivities[period] || [];
    const taskAvg = periodData.tasks.reduce((a, b) => a + (b || 0), 0) / Math.max(taskActivitiesForPeriod.length, 1);
    const workshopAvg = periodData.workshops.reduce((a, b) => a + (b || 0), 0) / Math.max(workshopActivitiesForPeriod.length, 1);
    const pTasks = taskAvg * 0.20;
    const pWorkshops = workshopAvg * 0.20;
    const pAttitude = (periodData.attitude || 0) * 0.20;
    const pExam = (periodData.exam || 0) * 0.40;
    return pTasks + pWorkshops + pAttitude + pExam;
  };

  const calculateRow = (gradeData: PeriodGradeData) => {
    const taskAvg = gradeData.tasks.slice(0, taskColumns).reduce((a, b) => a + (b || 0), 0) / Math.max(taskColumns, 1);
    const workshopAvg = gradeData.workshops.slice(0, workshopColumns).reduce((a, b) => a + (b || 0), 0) / Math.max(workshopColumns, 1);
    const pTasks = taskAvg * 0.20;
    const pWorkshops = workshopAvg * 0.20;
    const pAttitude = (gradeData.attitude || 0) * 0.20;
    const pExam = (gradeData.exam || 0) * 0.40;
    const definitive = pTasks + pWorkshops + pAttitude + pExam;
    
    let performance = PerformanceLevel.BAJO;
    if (definitive >= 9.6) performance = PerformanceLevel.SUPERIOR;
    else if (definitive >= 8.0) performance = PerformanceLevel.ALTO;
    else if (definitive >= 6.0) performance = PerformanceLevel.BASICO;
    return { definitive, performance };
  };
  
  const calculateFinalSummary = useCallback((studentData: StudentGradeRecord) => {
    let weightedFinal = 0;
    const periodResults: { [p: number]: number } = {};

    periods.forEach(p => {
      const periodDefinitive = calculatePeriodDefinitive(studentData.periods[p], p);
      periodResults[p] = periodDefinitive;
      const weight = (academicSettings.periodWeights[p] || 0) / 100;
      weightedFinal += periodDefinitive * weight;
    });

    let performance = PerformanceLevel.BAJO;
    if (weightedFinal >= 9.6) performance = PerformanceLevel.SUPERIOR;
    else if (weightedFinal >= 8.0) performance = PerformanceLevel.ALTO;
    else if (weightedFinal >= 6.0) performance = PerformanceLevel.BASICO;

    return { ...periodResults, weightedFinal, performance };
  }, [periods, academicSettings, localTaskActivities, localWorkshopActivities]);


  const getPerformanceColor = (p: PerformanceLevel) => {
    switch(p) {
      case PerformanceLevel.SUPERIOR: return 'bg-blue-100 text-blue-800';
      case PerformanceLevel.ALTO: return 'bg-green-100 text-green-800';
      case PerformanceLevel.BASICO: return 'bg-yellow-100 text-yellow-800';
      case PerformanceLevel.BAJO: return 'bg-red-100 text-red-800';
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    studentId: string,
    currentType: 'tasks' | 'workshops' | 'attitude' | 'exam',
    currentIndex?: number
  ) => {
      const key = event.key;
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(key)) {
          return;
      }
      event.preventDefault();

      const columnLayout = [
          ...currentTaskActivities.map((_, i) => ({ type: 'tasks' as const, index: i })),
          ...currentWorkshopActivities.map((_, i) => ({ type: 'workshops'as const, index: i })),
          { type: 'attitude' as const, index: 0 },
          { type: 'exam' as const, index: 0 }
      ];

      const studentIds = localData.map(d => d.studentId);
      const currentRowIndex = studentIds.indexOf(studentId);
      
      const isSingleType = (t: typeof currentType): t is 'attitude' | 'exam' => t === 'attitude' || t === 'exam';
      
      const currentColIndex = columnLayout.findIndex(col => 
          col.type === currentType && (isSingleType(currentType) ? true : col.index === currentIndex)
      );

      let nextRowIndex = currentRowIndex;
      let nextColIndex = currentColIndex;

      switch (key) {
          case 'ArrowUp':
              nextRowIndex = Math.max(0, currentRowIndex - 1);
              break;
          case 'ArrowDown':
          case 'Enter':
              nextRowIndex = Math.min(studentIds.length - 1, currentRowIndex + 1);
              break;
          case 'ArrowLeft':
              nextColIndex = Math.max(0, currentColIndex - 1);
              break;
          case 'ArrowRight':
              nextColIndex = Math.min(columnLayout.length - 1, currentColIndex + 1);
              break;
      }

      if (nextRowIndex !== currentRowIndex || nextColIndex !== currentColIndex) {
          const nextStudentId = studentIds[nextRowIndex];
          const nextCol = columnLayout[nextColIndex];
          
          let nextCellId = `grade-input-${nextStudentId}-${nextCol.type}`;
          if (nextCol.type === 'tasks' || nextCol.type === 'workshops') {
            nextCellId += `-${nextCol.index}`;
          }
          
          const nextCell = document.getElementById(nextCellId);
          if (nextCell) {
              nextCell.focus();
              (nextCell as HTMLInputElement).select();
          }
      }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border flex flex-col h-full">
      <ConfirmationModal
        isOpen={!!activityToDelete}
        onConfirm={handleConfirmRemoveActivity}
        onCancel={() => setActivityToDelete(null)}
        title="Eliminar Actividad"
        message="¿Seguro que quieres eliminar esta actividad? Todas las notas asociadas se perderán."
      />
      <AddActivityModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addActivity}
      />
      <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
            <button onClick={() => setIsAddModalOpen(true)} disabled={currentPeriod === 'Resumen' || isAverageViewEnabled} className="flex items-center justify-center gap-2 px-3 py-2 bg-white text-neutral-700 border border-neutral-300 rounded-md hover:bg-neutral-100 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <PlusCircle size={16} /> Agregar Actividad
            </button>
            <button onClick={onViewReport} className="flex items-center justify-center gap-2 px-3 py-2 bg-white text-neutral-700 border border-neutral-300 rounded-md hover:bg-neutral-100 transition-colors font-medium text-sm">
                <BarChart2 size={16} /> Ver Informes
            </button>
        </div>
        <div className="flex items-center gap-4">
            {currentPeriod !== 'Resumen' && (
              <div className="flex items-center gap-2">
                <ToggleSwitch checked={isAverageViewEnabled} onChange={() => setIsAverageViewEnabled(p => !p)} />
                <span className="text-sm font-medium text-neutral-700">Ver Promedios</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <ToggleSwitch checked={isAutoSaveEnabled} onChange={() => setIsAutoSaveEnabled(p => !p)} />
              <span className="text-sm font-medium text-neutral-700">Autoguardado</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-neutral-500 w-48 text-right">
                {saveStatus === 'saving' && <span className="flex items-center justify-end gap-1.5"><Loader2 size={14} className="animate-spin" /> Guardando...</span>}
                {saveStatus === 'saved' && <span className="italic">Todos los cambios guardados</span>}
                {saveStatus === 'unsaved' && <span className="text-yellow-600 font-medium">Cambios sin guardar</span>}
                {saveStatus === 'error' && <span className="text-red-600 font-medium flex items-center justify-end gap-1.5"><AlertCircle size={14} /> Error al guardar</span>}
              </div>
              <button 
                onClick={() => handleSaveChanges(true)} 
                disabled={saveStatus === 'saved' || saveStatus === 'saving'} 
                className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-800 text-white rounded-md hover:bg-neutral-900 transition-colors font-medium text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  <Save size={16} /> Guardar Cambios
              </button>
            </div>
        </div>
      </div>

      <div className="border-b px-4">
        <div className="flex -mb-px">
            {periodsWithSummary.map(p => (
                <button 
                    key={p} 
                    onClick={() => setCurrentPeriod(p)} 
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${currentPeriod === p 
                        ? 'border-neutral-800 text-neutral-800' 
                        : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'}`}
                >
                    {typeof p === 'number' ? `Periodo ${p}` : p}
                </button>
            ))}
        </div>
      </div>
      
      {saveStatus === 'error' && (
          <div className="p-4 m-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-lg" role="alert">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 mr-3 mt-0.5" />
                <div>
                  <p className="font-bold">No se pudieron guardar los cambios</p>
                  <p className="text-sm">{saveError}</p>
                </div>
              </div>
          </div>
      )}


      {currentPeriod !== 'Resumen' ? (
        <>
          {/* Desktop Table View */}
          <div className="flex-1 overflow-auto custom-scrollbar hidden md:block">
            {isAverageViewEnabled ? (
                <table className="w-full text-sm text-left">
                  <thead className="text-neutral-700 sticky top-0 z-20 bg-white">
                    <tr className="border-b">
                      <th className="p-3 font-bold min-w-[200px] sticky left-0 bg-white z-30 border-r">Estudiante</th>
                      <th className="p-2 text-center w-32 font-bold bg-neutral-50">Prom. Tareas</th>
                      <th className="p-2 text-center w-32 font-bold bg-neutral-50">Prom. Talleres</th>
                      <th className="p-2 text-center w-32 font-bold bg-neutral-50">Actitudinal</th>
                      <th className="p-2 text-center w-32 font-bold bg-neutral-50">Evaluación</th>
                      <th className="p-2 text-center w-24 font-bold bg-neutral-100">Final</th>
                      <th className="p-2 text-center w-28 font-bold bg-neutral-100">Desempeño</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localData.map((row) => {
                      const student = students.find(s => s.id === row.studentId);
                      const periodData = row.periods[currentPeriod as number] || createEmptyPeriodData();
                      
                      const taskAvg = periodData.tasks.slice(0, taskColumns).reduce((a, b) => a + (b || 0), 0) / Math.max(taskColumns, 1);
                      const workshopAvg = periodData.workshops.slice(0, workshopColumns).reduce((a, b) => a + (b || 0), 0) / Math.max(workshopColumns, 1);
                      const { definitive, performance } = calculateRow(periodData);

                      return (
                        <tr key={`avg-${row.studentId}`} className="border-b hover:bg-neutral-50 group">
                          <td className="p-2 border-r font-medium text-neutral-700 sticky left-0 bg-white group-hover:bg-neutral-50 z-10 whitespace-nowrap">{student?.name || 'Unknown'}</td>
                          <td className={`p-2 text-center font-semibold`}>{taskAvg.toFixed(1)}</td>
                          <td className={`p-2 text-center font-semibold`}>{workshopAvg.toFixed(1)}</td>
                          <td className={`p-2 text-center font-semibold`}>{(periodData.attitude ?? 0).toFixed(1)}</td>
                          <td className={`p-2 text-center font-semibold`}>{(periodData.exam ?? 0).toFixed(1)}</td>
                          <td className={`p-2 text-center font-bold ${definitive < 6.0 ? 'text-red-600' : 'text-neutral-800'}`}>{definitive.toFixed(1)}</td>
                          <td className="p-2 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${getPerformanceColor(performance)}`}>{performance}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-neutral-700 sticky top-0 z-20 bg-white">
                    <tr className="border-b">
                      <th className="p-3 font-bold min-w-[200px] sticky left-0 bg-white z-30 align-bottom border-r">Estudiante</th>
                      <th colSpan={Math.max(1, taskColumns)} className="text-center p-2 font-bold bg-neutral-50">Apuntes/Tareas (20%)</th>
                      <th colSpan={Math.max(1, workshopColumns)} className="text-center p-2 font-bold bg-neutral-50">Talleres y Exposiciones (20%)</th>
                      <th className="p-2 text-center w-24 font-bold bg-neutral-50 align-bottom">Actitudinal (20%)</th>
                      <th className="p-2 text-center w-24 font-bold bg-neutral-50 align-bottom">Evaluación (40%)</th>
                      <th className="p-2 text-center w-16 font-bold bg-neutral-100 align-bottom">Final</th>
                      <th className="p-2 text-center w-24 font-bold bg-neutral-100 align-bottom">Desempeño</th>
                    </tr>
                    <tr className="border-b">
                      <th className="sticky left-0 bg-white z-10 p-1 border-r"></th>
                      {currentTaskActivities.length > 0 ? (
                        currentTaskActivities.map((activity, i) => (
                          <th key={`th-t-${i}`} className="p-2 text-center min-w-[140px] text-xs font-medium align-top bg-neutral-50">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <div className="relative w-full group/edit">
                                <input
                                    type="text"
                                    value={activity.name}
                                    onChange={(e) => handleActivityChange('tasks', i, 'name', e.target.value)}
                                    className="w-full font-semibold text-neutral-700 text-center bg-transparent border-b-2 border-transparent p-1 focus:ring-0 focus:outline-none focus:bg-white/50 rounded-none transition-colors duration-200 ease-in-out group-hover/edit:border-neutral-300 focus:border-neutral-400"
                                    aria-label={`Nombre de la Tarea ${i + 1}`}
                                />
                                <Edit size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-neutral-400 group-hover/edit:text-neutral-600 transition-colors pointer-events-none" />
                              </div>
                              <input
                                  type="date"
                                  value={activity.date}
                                  onChange={(e) => handleActivityChange('tasks', i, 'date', e.target.value)}
                                  className="w-24 font-normal text-center text-neutral-500 bg-transparent focus:outline-none text-[10px] p-0 border-0"
                                  aria-label={`Fecha de la Tarea ${i + 1}`}
                              />
                              <div className="flex items-center gap-2">
                                  <span className="text-neutral-400 font-bold text-sm">{i + 1}</span>
                                  <button 
                                      onClick={() => setActivityToDelete({ type: 'tasks', index: i })} 
                                      className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-100 rounded-full"
                                      aria-label={`Eliminar tarea ${i + 1}`}
                                  >
                                      <Trash2 size={12} />
                                  </button>
                              </div>
                            </div>
                          </th>
                        ))
                      ) : (
                        <th className="p-2 text-center text-xs font-medium bg-neutral-50 text-neutral-500 italic">Agregue una actividad</th>
                      )}
                      {currentWorkshopActivities.length > 0 ? (
                        currentWorkshopActivities.map((activity, i) => (
                          <th key={`th-w-${i}`} className="p-2 text-center min-w-[140px] text-xs font-medium align-top bg-neutral-50">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <div className="relative w-full group/edit">
                                <input
                                    type="text"
                                    value={activity.name}
                                    onChange={(e) => handleActivityChange('workshops', i, 'name', e.target.value)}
                                    className="w-full font-semibold text-neutral-700 text-center bg-transparent border-b-2 border-transparent p-1 focus:ring-0 focus:outline-none focus:bg-white/50 rounded-none transition-colors duration-200 ease-in-out group-hover/edit:border-neutral-300 focus:border-neutral-400"
                                    aria-label={`Nombre del Taller ${i + 1}`}
                                />
                                <Edit size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-neutral-400 group-hover/edit:text-neutral-600 transition-colors pointer-events-none" />
                              </div>
                              <input
                                  type="date"
                                  value={activity.date}
                                  onChange={(e) => handleActivityChange('workshops', i, 'date', e.target.value)}
                                  className="w-24 font-normal text-center text-neutral-500 bg-transparent focus:outline-none text-[10px] p-0 border-0"
                                  aria-label={`Fecha del Taller ${i + 1}`}
                              />
                              <div className="flex items-center gap-2">
                                  <span className="text-neutral-400 font-bold text-sm">{i + 1}</span>
                                  <button 
                                      onClick={() => setActivityToDelete({ type: 'workshops', index: i })} 
                                      className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-100 rounded-full"
                                      aria-label={`Eliminar taller ${i + 1}`}
                                  >
                                      <Trash2 size={12} />
                                  </button>
                              </div>
                            </div>
                          </th>
                        ))
                      ) : (
                        <th className="p-2 text-center text-xs font-medium bg-neutral-50 text-neutral-500 italic">Agregue una actividad</th>
                      )}
                      <th className="bg-neutral-50"></th>
                      <th className="bg-neutral-50"></th>
                      <th className="bg-neutral-100"></th>
                      <th className="bg-neutral-100"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {localData.map((row) => (
                      <GradeBookRow 
                        key={row.studentId}
                        studentId={row.studentId}
                        periodData={row.periods[currentPeriod as number] || createEmptyPeriodData()}
                        student={students.find(s => s.id === row.studentId)}
                        taskColumns={taskColumns}
                        workshopColumns={workshopColumns}
                        calculateRow={calculateRow}
                        getPerformanceColor={getPerformanceColor}
                        updateGrade={updateGrade}
                        updateSingleGrade={updateSingleGrade}
                        handleKeyDown={handleKeyDown}
                      />
                    ))}
                  </tbody>
                </table>
            )}
          </div>
          
          {/* Mobile Card View */}
          <div className="flex-1 overflow-auto custom-scrollbar md:hidden p-4 space-y-3">
             {localData.map((row) => (
                <GradeBookCard
                  key={`card-${row.studentId}`}
                  studentId={row.studentId}
                  periodData={row.periods[currentPeriod as number] || createEmptyPeriodData()}
                  student={students.find(s => s.id === row.studentId)}
                  taskActivities={currentTaskActivities}
                  workshopActivities={currentWorkshopActivities}
                  calculateRow={calculateRow}
                  getPerformanceColor={getPerformanceColor}
                  updateGrade={updateGrade}
                  updateSingleGrade={updateSingleGrade}
                />
             ))}
          </div>
        </>
      ) : (
        <>
          {/* Desktop Final Summary View */}
          <div className="flex-1 overflow-auto custom-scrollbar hidden md:block">
            <table className="w-full text-sm text-left">
               <thead className="bg-neutral-100 text-neutral-700 font-semibold sticky top-0 z-20">
                  <tr className="border-b">
                    <th className="p-2 text-left min-w-[200px]">Estudiante</th>
                    {periods.map(p => (
                      <th key={p} className="p-2 text-center w-28">Periodo {p} ({academicSettings.periodWeights[p]}%)</th>
                    ))}
                    <th className="p-2 text-center w-28">Nota Final Ponderada</th>
                    <th className="p-2 text-center w-32">Desempeño Final</th>
                  </tr>
                </thead>
                 <tbody>
                  {localData.map(studentData => {
                      const student = students.find(s => s.id === studentData.studentId);
                      const summary = calculateFinalSummary(studentData);
                      return (
                        <tr key={studentData.studentId} className="hover:bg-neutral-50 border-b">
                           <td className="p-3 font-medium">{student?.name}</td>
                           {periods.map(p => (
                             <td key={p} className={`p-3 text-center font-semibold ${summary[p] < 6.0 ? 'text-red-600' : ''}`}>{summary[p].toFixed(1)}</td>
                           ))}
                           <td className={`p-3 text-center font-bold ${summary.weightedFinal < 6.0 ? 'text-red-600' : 'text-neutral-800'}`}>{summary.weightedFinal.toFixed(2)}</td>
                           <td className="p-3 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${getPerformanceColor(summary.performance)}`}>{summary.performance}</span></td>
                        </tr>
                      );
                  })}
                 </tbody>
            </table>
          </div>
          {/* Mobile Final Summary View */}
          <div className="flex-1 overflow-auto custom-scrollbar md:hidden p-4 space-y-3">
             {localData.map(studentData => {
                 const student = students.find(s => s.id === studentData.studentId);
                 const summary = calculateFinalSummary(studentData);
                 return (
                    <div key={`summary-card-${studentData.studentId}`} className="bg-white rounded-lg shadow-sm border p-4">
                        <div className="flex justify-between items-start">
                           <h3 className="font-bold text-neutral-800 mb-3">{student?.name}</h3>
                           <span className={`px-2 py-1 rounded text-xs font-bold ${getPerformanceColor(summary.performance)}`}>{summary.performance}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <p className="text-xs text-neutral-500">Promedio Final</p>
                                <p className={`font-bold text-2xl mt-1 ${summary.weightedFinal < 6.0 ? 'text-red-600' : 'text-neutral-800'}`}>{summary.weightedFinal.toFixed(2)}</p>
                            </div>
                            <div className="space-y-1 text-sm border-l pl-4 text-left">
                               {periods.map(p => (
                                 <p key={p}>Periodo {p}: <span className="font-semibold">{summary[p].toFixed(1)}</span></p>
                               ))}
                            </div>
                        </div>
                    </div>
                 );
             })}
          </div>
        </>
      )}

    </div>
  );
};