import React, { useState, useEffect, memo, useCallback, useRef, useMemo } from 'react';
import { Trash2, Save, BarChart2, ChevronDown, Edit, PlusCircle, Loader2, AlertCircle, Check, CloudCheck, MoreVertical, Calendar, FileText } from 'lucide-react';
import { Student, StudentGradeRecord, PerformanceLevel, Activity, PeriodGradeData, AcademicSettings } from '../types';
import { ConfirmationModal } from './ConfirmationModal';
import { useToast } from './Toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Badge } from './ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';


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

const formatDateShort = (dateString: string) => {
  const date = new Date(dateString);
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const month = months[date.getMonth()];
  const day = date.getDate().toString().padStart(2, '0');
  return `${month} ${day}`;
};

const AddActivityModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, date: string) => void;
  type: 'tasks' | 'workshops';
}> = ({ isOpen, onClose, onAdd, type }) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name, date);
      setName('');
      setDate(new Date().toISOString().split('T')[0]);
      onClose();
    }
  };

  const title = type === 'tasks' ? 'Agregar Apuntes/Tareas' : 'Agregar Talleres y Exposiciones';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="activityName">Nombre de la Actividad</Label>
              <Input
                id="activityName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Taller #1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activityDate">Fecha</Label>
              <Input
                id="activityDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Agregar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const EditActivityModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, date: string) => void;
  activity: Activity | null;
  type: 'tasks' | 'workshops';
}> = ({ isOpen, onClose, onSave, activity, type }) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (activity) {
      setName(activity.name);
      setDate(activity.date);
    }
  }, [activity]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name, date);
      onClose();
    }
  };

  const title = type === 'tasks' ? 'Editar Apuntes/Tareas' : 'Editar Talleres y Exposiciones';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editActivityName">Nombre de la Actividad</Label>
              <Input
                id="editActivityName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Taller #1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editActivityDate">Fecha</Label>
              <Input
                id="editActivityDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Cambios</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


const GradeBookRow = memo<{
  studentId: string;
  periodData: PeriodGradeData;
  student: Student | undefined;
  taskColumns: number;
  workshopColumns: number;
  calculateRow: (gradeData: PeriodGradeData, numTaskColumns: number, numWorkshopColumns: number) => { definitive: number; performance: PerformanceLevel; };
  getPerformanceColor: (p: PerformanceLevel) => string;
  updateGrade: (studentId: string, type: 'tasks' | 'workshops', index: number, value: string) => void;
  updateSingleGrade: (studentId: string, field: 'attitude' | 'exam', value: string) => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>, studentId: string, currentType: 'tasks' | 'workshops' | 'attitude' | 'exam', currentIndex?: number) => void;
  rowIndex: number;
  needsHorizontalScroll: boolean;
  maxStudentNameWidth: number;
}>(({ studentId, periodData, student, taskColumns, workshopColumns, calculateRow, getPerformanceColor, updateGrade, updateSingleGrade, handleKeyDown, rowIndex, needsHorizontalScroll, maxStudentNameWidth }) => {
  const stats = calculateRow(periodData, taskColumns, workshopColumns);
  return (
    <tr className="border-b hover:bg-neutral-50 group">
      <td className="p-2 text-center text-neutral-500 text-sm bg-white group-hover:bg-neutral-50 relative after:content-[''] after:absolute after:top-0 after:right-0 after:bottom-0 after:w-px after:bg-neutral-300">{rowIndex + 1}</td>
      <td className="p-2 font-medium text-neutral-700 bg-white group-hover:bg-neutral-50 overflow-hidden text-ellipsis whitespace-nowrap relative after:content-[''] after:absolute after:top-0 after:right-0 after:bottom-0 after:w-px after:bg-neutral-300" style={{ width: `${maxStudentNameWidth}px`, minWidth: `${maxStudentNameWidth}px`, maxWidth: `${maxStudentNameWidth}px` }} title={student?.name || 'Unknown'}>{student?.name || 'Unknown'}</td>
      {taskColumns > 0 ? (
        Array.from({ length: taskColumns }).map((_, i) => (
          <td key={`t-${i}`} className="p-0 border-r">
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
        <td className="p-2 text-center text-xs text-neutral-400 italic bg-neutral-50 border-r">N/A</td>
      )}
      {workshopColumns > 0 ? (
        Array.from({ length: workshopColumns }).map((_, i) => (
          <td key={`w-${i}`} className="p-0 border-r">
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
        <td className="p-2 text-center text-xs text-neutral-400 italic bg-neutral-50 border-r">N/A</td>
      )}
      <td className="p-0 border-r">
        <input 
          id={`grade-input-${studentId}-attitude`}
          type="number" 
          className={`w-full h-full text-center p-2 focus:bg-neutral-50 focus:outline-none transition-colors ${getGradeInputColor(periodData.attitude)}`} 
          value={periodData.attitude ?? ''} 
          onChange={(e) => updateSingleGrade(studentId, 'attitude', e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, studentId, 'attitude')}
        />
      </td>
      <td className="p-0 border-r">
        <input 
          id={`grade-input-${studentId}-exam`}
          type="number" 
          className={`w-full h-full text-center p-2 focus:bg-neutral-50 focus:outline-none transition-colors ${getGradeInputColor(periodData.exam)}`} 
          value={periodData.exam ?? ''} 
          onChange={(e) => updateSingleGrade(studentId, 'exam', e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, studentId, 'exam')}
        />
      </td>
      <td className={`p-2 text-center font-bold border-r ${stats.definitive < 6.0 ? 'text-red-600' : 'text-neutral-800'}`}>{stats.definitive.toFixed(1)}</td>
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
  calculateRow: (gradeData: PeriodGradeData, numTaskColumns: number, numWorkshopColumns: number) => { definitive: number; performance: PerformanceLevel; };
  getPerformanceColor: (p: PerformanceLevel) => string;
  updateGrade: (studentId: string, type: 'tasks' | 'workshops', index: number, value: string) => void;
  updateSingleGrade: (studentId: string, field: 'attitude' | 'exam', value: string) => void;
}>(({ studentId, periodData, student, taskActivities, workshopActivities, calculateRow, getPerformanceColor, updateGrade, updateSingleGrade }) => {
    const [isOpen, setIsOpen] = useState(false);
    const stats = calculateRow(periodData, taskActivities.length, workshopActivities.length);

    return (
        <Card>
            <Button 
              onClick={() => setIsOpen(!isOpen)} 
              variant="ghost"
              className="w-full flex justify-between items-center p-4 h-auto"
            >
                <span className="font-bold text-neutral-800 flex-1 text-left">{student?.name}</span>
                <div className="flex items-center gap-2 ml-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getPerformanceColor(stats.performance)}`}>{stats.performance}</span>
                    <span className={`font-bold text-lg ${stats.definitive < 6.0 ? 'text-red-600' : 'text-neutral-800'}`}>{stats.definitive.toFixed(1)}</span>
                    <ChevronDown size={20} className={`text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </Button>
            {isOpen && (
                <CardContent className="pt-0 space-y-4">
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
                </CardContent>
            )}
        </Card>
    );
});
GradeBookCard.displayName = 'GradeBookCard';

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; }> = ({ checked, onChange }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
  </label>
);

export const GradeBook: React.FC<GradeBookProps> = ({ students, data, taskActivities, workshopActivities, onSave, onViewReport, assignmentId, academicSettings }) => {
  const [localData, setLocalData] = useState<StudentGradeRecord[]>(data);
  const [localTaskActivities, setLocalTaskActivities] = useState<{ [p: number]: Activity[] }>(taskActivities);
  const [localWorkshopActivities, setLocalWorkshopActivities] = useState<{ [p: number]: Activity[] }>(workshopActivities);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalActivityType, setModalActivityType] = useState<'tasks' | 'workshops'>('tasks');
  const [currentPeriod, setCurrentPeriod] = useState<number | 'Resumen'>(1);
  const [isAverageViewEnabled, setIsAverageViewEnabled] = useState(false);

  const [activityToDelete, setActivityToDelete] = useState<{ type: 'tasks' | 'workshops'; index: number } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState<{ type: 'tasks' | 'workshops'; index: number; activity: Activity } | null>(null);
  const [needsHorizontalScroll, setNeedsHorizontalScroll] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
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

  // Calculate the width needed for the longest student name
  const maxStudentNameWidth = useMemo(() => {
    const longestName = students.reduce((longest, student) => 
      student.name.length > longest.length ? student.name : longest
    , '');
    // Approximate: 8px per character + 32px padding
    return Math.max(200, Math.min(300, longestName.length * 8 + 32));
  }, [students]);

  // Reset scroll when period changes
  useEffect(() => {
    const scrollContainers = document.querySelectorAll('.overflow-auto');
    scrollContainers.forEach(container => {
      container.scrollTop = 0;
      container.scrollLeft = 0;
    });
  }, [currentPeriod]);

  // Detect when horizontal scroll is needed
  useEffect(() => {
    const checkScrollNeed = () => {
      if (tableContainerRef.current) {
        const container = tableContainerRef.current;
        const table = container.querySelector('table');
        if (table) {
          const needsScroll = table.offsetWidth > container.clientWidth;
          setNeedsHorizontalScroll(needsScroll);
        }
      }
    };

    // Check initially with a delay to ensure DOM is ready
    const initialTimeout = setTimeout(checkScrollNeed, 200);

    // Check when window resizes
    window.addEventListener('resize', checkScrollNeed);

    // Check when activities change
    const changeTimeout = setTimeout(checkScrollNeed, 300);

    return () => {
      window.removeEventListener('resize', checkScrollNeed);
      clearTimeout(initialTimeout);
      clearTimeout(changeTimeout);
    };
  }, [currentTaskActivities, currentWorkshopActivities, localData]);

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



  const addActivity = (name: string, date: string) => {
    if (typeof currentPeriod === 'string') return;
    const updater = modalActivityType === 'tasks' ? setLocalTaskActivities : setLocalWorkshopActivities;
    updater(prev => {
       const newActivitiesForPeriod = [...(prev[currentPeriod] || []), { name, date }];
       return { ...prev, [currentPeriod]: newActivitiesForPeriod };
    });
    setSaveStatus('unsaved');
    setSaveError(null);
  };

  const openAddModal = (type: 'tasks' | 'workshops') => {
    setModalActivityType(type);
    setIsAddModalOpen(true);
  };

  const openEditModal = (type: 'tasks' | 'workshops', index: number) => {
    if (typeof currentPeriod === 'string') return;
    const activities = type === 'tasks' ? localTaskActivities[currentPeriod] || [] : localWorkshopActivities[currentPeriod] || [];
    const activity = activities[index];
    if (activity) {
      setActivityToEdit({ type, index, activity });
      setIsEditModalOpen(true);
    }
  };

  const handleSaveEditedActivity = (name: string, date: string) => {
    if (!activityToEdit || typeof currentPeriod === 'string') return;
    
    const { type, index } = activityToEdit;
    const updater = type === 'tasks' ? setLocalTaskActivities : setLocalWorkshopActivities;
    
    updater(prev => {
      const newActivitiesForPeriod = [...(prev[currentPeriod] || [])];
      newActivitiesForPeriod[index] = { name, date };
      return { ...prev, [currentPeriod]: newActivitiesForPeriod };
    });
    
    setSaveStatus('unsaved');
    setSaveError(null);
    setActivityToEdit(null);
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

  const calculateRow = (gradeData: PeriodGradeData, numTaskColumns: number, numWorkshopColumns: number) => {
    const taskAvg = gradeData.tasks.slice(0, numTaskColumns).reduce((a, b) => a + (b || 0), 0) / Math.max(numTaskColumns, 1);
    const workshopAvg = gradeData.workshops.slice(0, numWorkshopColumns).reduce((a, b) => a + (b || 0), 0) / Math.max(numWorkshopColumns, 1);
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
    <div className="flex flex-col">
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
        type={modalActivityType}
      />
      <EditActivityModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setActivityToEdit(null);
        }}
        onSave={handleSaveEditedActivity}
        activity={activityToEdit?.activity || null}
        type={activityToEdit?.type || 'tasks'}
      />
      <Tabs value={String(currentPeriod)} onValueChange={(value) => setCurrentPeriod(value === 'Resumen' ? 'Resumen' : Number(value))} className="!gap-0">
        <div className="px-4 py-2 flex-shrink-0 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button 
              onClick={onViewReport}
              variant="outline"
              size="sm"
              className="gap-1.5 h-9"
            >
                <BarChart2 size={14} /> Ver Informes
            </Button>
            
            <TabsList className="inline-flex h-9 items-center justify-center rounded-lg bg-neutral-100 p-1">
            {periodsWithSummary.map(p => (
              <TabsTrigger 
                key={p} 
                value={String(p)}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow"
              >
                {typeof p === 'number' ? `Periodo ${p}` : p}
              </TabsTrigger>
            ))}
          </TabsList>
          </div>
          
          <div className="flex items-center gap-3">
            {currentPeriod !== 'Resumen' && (
              <div className="flex items-center gap-2">
                <ToggleSwitch checked={isAverageViewEnabled} onChange={() => setIsAverageViewEnabled(p => !p)} />
                <span className="text-xs font-medium text-neutral-700">Ver Promedios</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <ToggleSwitch checked={isAutoSaveEnabled} onChange={() => setIsAutoSaveEnabled(p => !p)} />
              <span className="text-xs font-medium text-neutral-700">Autoguardado</span>
            </div>
            
            {/* Indicador de estado */}
            {saveStatus === 'unsaved' && <span className="text-yellow-600 font-medium text-xs">Cambios sin guardar</span>}
            {saveStatus === 'error' && <span className="text-red-600 font-medium flex items-center gap-1.5 text-xs"><AlertCircle size={12} /> Error</span>}
            
            {/* Contenedor estilo tab para spinner/ícono + botón */}
            <div className="inline-flex h-9 items-center gap-2 px-2 bg-neutral-50 rounded-lg">
              {saveStatus === 'saving' && <Loader2 size={16} className="animate-spin text-neutral-500" />}
              {saveStatus === 'saved' && (
                <div title="Guardado">
                  <CloudCheck size={18} className="text-green-600" />
                </div>
              )}
              
              <Button 
                onClick={() => handleSaveChanges(true)} 
                disabled={saveStatus === 'saved' || saveStatus === 'saving'}
                variant="outline"
                size="sm"
                className="gap-1.5 bg-white h-7 text-xs px-2"
              >
                <Save size={14} /> Guardar
              </Button>
            </div>
          </div>
        </div>
      
        {saveStatus === 'error' && (
          <div className="p-4 m-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-bold">No se pudieron guardar los cambios</p>
                <p className="text-sm">{saveError}</p>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Period Tabs Content */}
        {periods.map(period => {
          const periodTaskActivities = localTaskActivities[period] || [];
          const periodWorkshopActivities = localWorkshopActivities[period] || [];
          const periodTaskColumns = periodTaskActivities.length;
          const periodWorkshopColumns = periodWorkshopActivities.length;
          
          return (
            <TabsContent key={period} value={String(period)} className="!m-0 !p-0" style={{ display: 'block' }}>
          {/* Desktop Table View */}
          <div className="hidden md:block p-4">
            <div className="overflow-hidden rounded-lg border">
              <div ref={tableContainerRef} className="overflow-x-auto custom-scrollbar will-change-scroll">
            {isAverageViewEnabled ? (
                <Table className="w-full border-collapse [&_tr]:border-neutral-300 [&_td]:border-neutral-300 [&_th]:border-neutral-300">
                  <TableHeader className="sticky top-0 z-10 bg-neutral-100 shadow-sm">
                    <TableRow className="bg-neutral-100">
                      <TableHead className="text-center w-12 bg-neutral-100 border-r">#</TableHead>
                      <TableHead className="text-left bg-neutral-100 border-r overflow-hidden" style={{ width: `${maxStudentNameWidth}px`, minWidth: `${maxStudentNameWidth}px`, maxWidth: `${maxStudentNameWidth}px` }}>Estudiante</TableHead>
                      <TableHead className="text-center w-32 bg-neutral-100 border-r">Prom. Tareas</TableHead>
                      <TableHead className="text-center w-32 bg-neutral-100 border-r">Prom. Talleres</TableHead>
                      <TableHead className="text-center w-32 bg-neutral-100 border-r">Actitudinal</TableHead>
                      <TableHead className="text-center w-32 bg-neutral-100 border-r">Evaluación</TableHead>
                      <TableHead className="text-center w-24 bg-neutral-100 border-r">Final</TableHead>
                      <TableHead className="text-center w-28 bg-neutral-100">Desempeño</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localData.map((row, index) => {
                      const student = students.find(s => s.id === row.studentId);
                      const periodData = row.periods[period] || createEmptyPeriodData();
                      
                      const taskAvg = periodData.tasks.slice(0, periodTaskColumns).reduce((a, b) => a + (b || 0), 0) / Math.max(periodTaskColumns, 1);
                      const workshopAvg = periodData.workshops.slice(0, periodWorkshopColumns).reduce((a, b) => a + (b || 0), 0) / Math.max(periodWorkshopColumns, 1);
                      const { definitive, performance } = calculateRow(periodData, periodTaskColumns, periodWorkshopColumns);

                      return (
                        <TableRow key={`avg-${row.studentId}`}>
                          <TableCell className="text-center text-neutral-500 text-sm border-r">{index + 1}</TableCell>
                          <TableCell className="border-r font-medium overflow-hidden text-ellipsis whitespace-nowrap" title={student?.name || 'Unknown'}>{student?.name || 'Unknown'}</TableCell>
                          <TableCell className="text-center border-r font-semibold">{taskAvg.toFixed(1)}</TableCell>
                          <TableCell className="text-center border-r font-semibold">{workshopAvg.toFixed(1)}</TableCell>
                          <TableCell className="text-center border-r font-semibold">{(periodData.attitude ?? 0).toFixed(1)}</TableCell>
                          <TableCell className="text-center border-r font-semibold">{(periodData.exam ?? 0).toFixed(1)}</TableCell>
                          <TableCell className={`text-center border-r font-bold ${definitive < 6.0 ? 'text-red-600' : 'text-neutral-800'}`}>{definitive.toFixed(1)}</TableCell>
                          <TableCell className="text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${getPerformanceColor(performance)}`}>{performance}</span></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
            ) : (
                <Table className="w-full border-collapse [&_tr]:border-neutral-300 [&_td]:border-neutral-300 [&_th]:border-neutral-300">
                  <TableHeader className="sticky top-0 z-10 bg-neutral-100 shadow-sm">
                    {/* Primera fila: Headers de grupo */}
                    <TableRow className="bg-neutral-100">
                      <TableHead rowSpan={2} className="text-center w-12 bg-neutral-100 relative after:content-[''] after:absolute after:top-0 after:right-0 after:bottom-0 after:w-px after:bg-neutral-300">#</TableHead>
                      <TableHead rowSpan={2} className="text-left bg-neutral-100 relative after:content-[''] after:absolute after:top-0 after:right-0 after:bottom-0 after:w-px after:bg-neutral-300 overflow-hidden" style={{ width: `${maxStudentNameWidth}px`, minWidth: `${maxStudentNameWidth}px`, maxWidth: `${maxStudentNameWidth}px` }}>Estudiante</TableHead>
                      <TableHead colSpan={Math.max(1, periodTaskColumns)} className="text-center bg-neutral-100 border-r">
                        Apuntes/Tareas
                      </TableHead>
                      <TableHead colSpan={Math.max(1, periodWorkshopColumns)} className="text-center bg-neutral-100 border-r">
                        Talleres/Exposiciones
                      </TableHead>
                      <TableHead rowSpan={2} className="text-center bg-neutral-100 border-r" style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}>
                        <div className="flex items-center justify-center h-16">
                          <div className="transform -rotate-90 whitespace-nowrap text-xs font-semibold">
                            Actitudinal
                          </div>
                        </div>
                      </TableHead>
                      <TableHead rowSpan={2} className="text-center bg-neutral-100 border-r" style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}>
                        <div className="flex items-center justify-center h-16">
                          <div className="transform -rotate-90 whitespace-nowrap text-xs font-semibold">
                            Evaluación
                          </div>
                        </div>
                      </TableHead>
                      <TableHead rowSpan={2} className="text-center w-16 bg-neutral-100 border-r">Final</TableHead>
                      <TableHead rowSpan={2} className="text-center w-24 bg-neutral-100">Desempeño</TableHead>
                    </TableRow>
                    {/* Segunda fila: Actividades individuales */}
                    <TableRow className="bg-neutral-100">
                      {/* Actividades de Tareas */}
                      {periodTaskActivities.length > 0 ? (
                        periodTaskActivities.map((activity, i) => {
                          const isLast = i === periodTaskActivities.length - 1;
                          const isFirst = i === 0;
                          return (
                            <TableHead key={`th-t-${i}`} className="text-center w-20 text-xs align-top bg-neutral-100 border-r relative p-0">
                              {/* Celda principal superior */}
                              <div className="h-20 relative bg-neutral-100 border-b border-neutral-300">
                                <div className="flex items-center justify-center h-full relative px-1 py-2">
                                {/* Menú de configuración en esquina superior derecha */}
                                <div className="absolute top-0 -right-2 z-20">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        className="h-4 w-4 flex items-center justify-center text-neutral-600 hover:text-neutral-800 rounded-sm transition-colors"
                                      >
                                        <MoreVertical size={12} />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40">
                                      <DropdownMenuItem onClick={() => openEditModal('tasks', i)}>
                                        <Edit size={14} className="mr-2" />
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => setActivityToDelete({ type: 'tasks', index: i })}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Trash2 size={14} className="mr-2" />
                                        Eliminar
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                
                                  {/* Contenido centrado con márgenes uniformes */}
                                <div className="flex flex-col items-center justify-between w-full h-full min-h-[64px] relative">
                                  {/* Texto rotado con centrado perfecto */}
                                  <div className="flex-1 flex items-center justify-center py-2">
                                    <div className="transform -rotate-90 origin-center">
                                      <div 
                                        className="text-[10px] font-semibold text-neutral-700 text-center leading-[1.1] whitespace-nowrap max-w-[60px] overflow-hidden text-ellipsis" 
                                        title={activity.name}
                                        style={{
                                          display: '-webkit-box',
                                          WebkitLineClamp: 3,
                                          WebkitBoxOrient: 'vertical',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          lineHeight: '1.1',
                                          maxHeight: '33px'
                                        }}
                                      >
                                        {(() => {
                                          const text = activity.name;
                                          const maxLength = 45; // Máximo de caracteres
                                          
                                          if (text.length <= maxLength) {
                                            return text;
                                          }
                                          
                                          // Dividir en palabras y crear líneas inteligentemente
                                          const words = text.split(' ');
                                          const lines = [];
                                          let currentLine = '';
                                          
                                          for (const word of words) {
                                            const testLine = currentLine ? `${currentLine} ${word}` : word;
                                            
                                            if (testLine.length <= 15 && lines.length < 2) {
                                              currentLine = testLine;
                                            } else {
                                              if (currentLine) {
                                                lines.push(currentLine);
                                                currentLine = word;
                                              } else {
                                                lines.push(word);
                                              }
                                              
                                              if (lines.length >= 3) break;
                                            }
                                          }
                                          
                                          if (currentLine && lines.length < 3) {
                                            lines.push(currentLine);
                                          }
                                          
                                          // Si hay más contenido, agregar "..." a la última línea
                                          if (lines.length === 3 && (currentLine !== lines[2] || words.length > lines.join(' ').split(' ').length)) {
                                            lines[2] = lines[2].length > 12 ? lines[2].substring(0, 12) + '...' : lines[2] + '...';
                                          }
                                          
                                          return lines.join('\n');
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Celda pequeña inferior para la fecha */}
                              <div className="h-4 bg-neutral-50 flex items-center justify-center border-t border-neutral-300">
                                <div className="text-[9px] text-neutral-500 font-medium">
                                  {formatDateShort(activity.date)}
                                </div>
                              </div>
                              </div>
                              {isLast && (
                                <button 
                                  onClick={() => openAddModal('tasks')}
                                  className="absolute -right-[9px] top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-800 transition-colors z-20"
                                  aria-label="Agregar nueva tarea"
                                  title="Agregar actividad"
                                >
                                  <PlusCircle size={18} />
                                </button>
                              )}
                            </TableHead>
                          );
                        })
                      ) : (
                        <TableHead className="text-center text-xs bg-neutral-100 border-r">
                          <button 
                            onClick={() => openAddModal('tasks')}
                            className="flex flex-col items-center justify-center gap-2 w-full py-3 group"
                          >
                            <PlusCircle size={20} className="text-neutral-400 group-hover:text-neutral-800 transition-colors" />
                            <span className="italic text-xs text-neutral-500">Agregue una actividad</span>
                          </button>
                        </TableHead>
                      )}
                      {periodWorkshopActivities.length > 0 ? (
                        periodWorkshopActivities.map((activity, i) => {
                          const isLast = i === periodWorkshopActivities.length - 1;
                          return (
                            <TableHead key={`th-w-${i}`} className="text-center w-20 text-xs align-top bg-neutral-100 border-r relative p-0">
                              {/* Celda principal superior */}
                              <div className="h-20 relative bg-neutral-100 border-b border-neutral-300">
                                <div className="flex items-center justify-center h-full relative px-1 py-2">
                                {/* Menú de configuración en esquina superior derecha */}
                                <div className="absolute top-0 -right-2 z-20">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        className="h-4 w-4 flex items-center justify-center text-neutral-600 hover:text-neutral-800 rounded-sm transition-colors"
                                      >
                                        <MoreVertical size={12} />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40">
                                      <DropdownMenuItem onClick={() => openEditModal('workshops', i)}>
                                        <Edit size={14} className="mr-2" />
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => setActivityToDelete({ type: 'workshops', index: i })}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Trash2 size={14} className="mr-2" />
                                        Eliminar
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                
                                {/* Contenido centrado con márgenes uniformes */}
                                <div className="flex flex-col items-center justify-between w-full h-full min-h-[64px] relative">
                                  {/* Texto rotado con centrado perfecto */}
                                  <div className="flex-1 flex items-center justify-center py-2">
                                    <div className="transform -rotate-90 origin-center">
                                      <div 
                                        className="text-[10px] font-semibold text-neutral-700 text-center leading-[1.1] whitespace-nowrap max-w-[60px] overflow-hidden text-ellipsis" 
                                        title={activity.name}
                                        style={{
                                          display: '-webkit-box',
                                          WebkitLineClamp: 3,
                                          WebkitBoxOrient: 'vertical',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          lineHeight: '1.1',
                                          maxHeight: '33px'
                                        }}
                                      >
                                        {(() => {
                                          const text = activity.name;
                                          const maxLength = 45; // Máximo de caracteres
                                          
                                          if (text.length <= maxLength) {
                                            return text;
                                          }
                                          
                                          // Dividir en palabras y crear líneas inteligentemente
                                          const words = text.split(' ');
                                          const lines = [];
                                          let currentLine = '';
                                          
                                          for (const word of words) {
                                            const testLine = currentLine ? `${currentLine} ${word}` : word;
                                            
                                            if (testLine.length <= 15 && lines.length < 2) {
                                              currentLine = testLine;
                                            } else {
                                              if (currentLine) {
                                                lines.push(currentLine);
                                                currentLine = word;
                                              } else {
                                                lines.push(word);
                                              }
                                              
                                              if (lines.length >= 3) break;
                                            }
                                          }
                                          
                                          if (currentLine && lines.length < 3) {
                                            lines.push(currentLine);
                                          }
                                          
                                          // Si hay más contenido, agregar "..." a la última línea
                                          if (lines.length === 3 && (currentLine !== lines[2] || words.length > lines.join(' ').split(' ').length)) {
                                            lines[2] = lines[2].length > 12 ? lines[2].substring(0, 12) + '...' : lines[2] + '...';
                                          }
                                          
                                          return lines.join('\n');
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Celda pequeña inferior para la fecha */}
                              <div className="h-4 bg-neutral-50 flex items-center justify-center border-t border-neutral-300">
                                <div className="text-[9px] text-neutral-500 font-medium">
                                  {formatDateShort(activity.date)}
                                </div>
                              </div>
                              </div>
                              {isLast && (
                                <button 
                                  onClick={() => openAddModal('workshops')}
                                  className="absolute -right-[9px] top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-800 transition-colors z-20"
                                  aria-label="Agregar nuevo taller"
                                  title="Agregar actividad"
                                >
                                  <PlusCircle size={18} />
                                </button>
                              )}
                            </TableHead>
                          );
                        })
                      ) : (
                        <TableHead className="text-center text-xs bg-neutral-100 border-r">
                          <button 
                            onClick={() => openAddModal('workshops')}
                            className="flex flex-col items-center justify-center gap-2 w-full py-3 group"
                          >
                            <PlusCircle size={20} className="text-neutral-400 group-hover:text-neutral-800 transition-colors" />
                            <span className="italic text-xs text-neutral-500">Agregue una actividad</span>
                          </button>
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localData.map((row, index) => (
                      <GradeBookRow 
                        key={row.studentId}
                        studentId={row.studentId}
                        periodData={row.periods[period] || createEmptyPeriodData()}
                        student={students.find(s => s.id === row.studentId)}
                        taskColumns={periodTaskColumns}
                        workshopColumns={periodWorkshopColumns}
                        calculateRow={calculateRow}
                        getPerformanceColor={getPerformanceColor}
                        updateGrade={updateGrade}
                        updateSingleGrade={updateSingleGrade}
                        handleKeyDown={handleKeyDown}
                        rowIndex={index}
                        needsHorizontalScroll={needsHorizontalScroll}
                        maxStudentNameWidth={maxStudentNameWidth}
                      />
                    ))}
                  </TableBody>
                </Table>
            )}
              </div>
            </div>
            {/* Leyenda de porcentajes */}
            <div className="mt-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-neutral-700 font-medium mb-2">Distribución de calificaciones:</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-600">
                <span>• Apuntes/Tareas: <strong>20%</strong></span>
                <span>• Talleres y Exposiciones: <strong>20%</strong></span>
                <span>• Actitudinal: <strong>20%</strong></span>
                <span>• Evaluación: <strong>40%</strong></span>
              </div>
            </div>
          </div>
          
          {/* Mobile Card View */}
          <div className="flex-1 overflow-auto custom-scrollbar md:hidden p-4 space-y-3">
             {localData.map((row) => (
                <GradeBookCard
                  key={`card-${row.studentId}`}
                  studentId={row.studentId}
                  periodData={row.periods[period] || createEmptyPeriodData()}
                  student={students.find(s => s.id === row.studentId)}
                  taskActivities={periodTaskActivities}
                  workshopActivities={periodWorkshopActivities}
                  calculateRow={calculateRow}
                  getPerformanceColor={getPerformanceColor}
                  updateGrade={updateGrade}
                  updateSingleGrade={updateSingleGrade}
                />
             ))}
          </div>
            </TabsContent>
          );
        })}

        {/* Resumen Tab Content */}
        <TabsContent value="Resumen" className="!m-0 !p-0" style={{ display: 'block' }}>
          {/* Desktop Final Summary View */}
          <div className="hidden md:block p-4">
            <div className="overflow-hidden rounded-lg border">
              <div className="overflow-x-auto custom-scrollbar will-change-scroll">
            <Table className="w-full border-collapse [&_tr]:border-neutral-300 [&_td]:border-neutral-300 [&_th]:border-neutral-300">
               <TableHeader className="bg-neutral-100 sticky top-0 z-10 shadow-sm before:content-[''] before:absolute before:inset-0 before:bg-neutral-100 before:-z-10">
                  <TableRow className="bg-neutral-100">
                    <TableHead className="text-left min-w-[200px] bg-neutral-100">Estudiante</TableHead>
                    {periods.map(p => (
                      <TableHead key={p} className="text-center w-28 bg-neutral-100">Periodo {p} ({academicSettings.periodWeights[p]}%)</TableHead>
                    ))}
                    <TableHead className="text-center w-28 bg-neutral-100">Nota Final Ponderada</TableHead>
                    <TableHead className="text-center w-32 bg-neutral-100">Desempeño Final</TableHead>
                  </TableRow>
                </TableHeader>
                 <TableBody>
                  {localData.map(studentData => {
                      const student = students.find(s => s.id === studentData.studentId);
                      const summary = calculateFinalSummary(studentData);
                      return (
                        <TableRow key={studentData.studentId}>
                           <TableCell className="font-medium">{student?.name}</TableCell>
                           {periods.map(p => (
                             <TableCell key={p} className={`text-center font-semibold ${summary[p] < 6.0 ? 'text-red-600' : ''}`}>{summary[p].toFixed(1)}</TableCell>
                           ))}
                           <TableCell className={`text-center font-bold ${summary.weightedFinal < 6.0 ? 'text-red-600' : 'text-neutral-800'}`}>{summary.weightedFinal.toFixed(2)}</TableCell>
                           <TableCell className="text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${getPerformanceColor(summary.performance)}`}>{summary.performance}</span></TableCell>
                        </TableRow>
                      );
                  })}
                 </TableBody>
            </Table>
              </div>
            </div>
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
        </TabsContent>

      </Tabs>
    </div>
  );
};