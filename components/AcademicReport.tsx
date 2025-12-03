import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Wand2, AlertCircle, Clock, Download, ArrowLeft, Save, Loader2, Send } from 'lucide-react';
import { Student, StudentGradeRecord, PeriodGradeData, Activity, PerformanceLevel, Assignment, AcademicSettings, TeacherReportSubmission } from '../types';
import { generateStudentObservation } from '../services/geminiService';
import { useToast } from './Toast';
import { db } from '../services/db';
import { generateTeacherReportPdf } from '../services/pdfService';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';

interface ReportProps {
  students: Student[];
  data: StudentGradeRecord[];
  taskActivities: { [period: number]: Activity[] };
  workshopActivities: { [period: number]: Activity[] };
  onSave: (grades: StudentGradeRecord[], taskActivities: { [period: number]: Activity[] }, workshopActivities: { [period: number]: Activity[] }) => Promise<void>;
  onBackToGradeBook: () => void;
  assignment: Assignment;
  academicSettings: AcademicSettings;
}

export const AcademicReport: React.FC<ReportProps> = ({ students, data, taskActivities, workshopActivities, onSave, onBackToGradeBook, assignment, academicSettings }) => {
  const [localData, setLocalData] = useState<StudentGradeRecord[]>(data);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<number | 'Resumen'>(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { addToast } = useToast();
  const debounceTimeoutRef = useRef<number | null>(null);

  const periods = useMemo(() => Array.from({ length: academicSettings.periodCount }, (_, i) => i + 1), [academicSettings.periodCount]);
  // FIX: Added 'as const' to ensure 'Resumen' is treated as a literal type, not a generic string.
  // This resolves the TypeScript error when calling setCurrentPeriod.
  const periodsWithSummary = useMemo(() => [...periods, 'Resumen' as const], [periods]);


  useEffect(() => {
    setLocalData(data);
    setSaveStatus('saved');
  }, [data]);

  const handleSaveChanges = useCallback(async (isManualSave = false) => {
    if (saveStatus === 'saving' || (saveStatus === 'saved' && !isManualSave)) return;

    setSaveStatus('saving');
    try {
      await onSave(localData, taskActivities, workshopActivities);
      setSaveStatus('saved');
      if (isManualSave) {
        addToast('Informe guardado con éxito', 'success');
      }
    } catch (error) {
      console.error("Save failed:", error);
      setSaveStatus('unsaved');
      addToast('Error al guardar el informe.', 'error');
    }
  }, [saveStatus, onSave, localData, taskActivities, workshopActivities, addToast]);
  
  const debouncedSave = useCallback(() => {
    if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = window.setTimeout(() => {
        handleSaveChanges(false);
    }, 2000);
  }, [handleSaveChanges]);

  useEffect(() => {
    if (saveStatus === 'unsaved') {
        debouncedSave();
    }
    return () => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
    };
  }, [saveStatus, debouncedSave]);


  const calculatePeriodDefinitive = (periodData: PeriodGradeData, period: number) => {
    if (!periodData) return 0;
    const taskActivitiesForPeriod = taskActivities[period] || [];
    const workshopActivitiesForPeriod = workshopActivities[period] || [];
    const taskAvg = periodData.tasks.reduce((a, b) => a + (b || 0), 0) / Math.max(taskActivitiesForPeriod.length, 1);
    const workshopAvg = periodData.workshops.reduce((a, b) => a + (b || 0), 0) / Math.max(workshopActivitiesForPeriod.length, 1);
    const pTasks = taskAvg * 0.20;
    const pWorkshops = workshopAvg * 0.20;
    const pAttitude = (periodData.attitude || 0) * 0.20;
    const pExam = (periodData.exam || 0) * 0.40;
    return pTasks + pWorkshops + pAttitude + pExam;
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
  }, [periods, academicSettings, taskActivities, workshopActivities]);

  const getPerformanceColor = (p: PerformanceLevel) => {
    switch(p) {
      case PerformanceLevel.SUPERIOR: return 'bg-blue-100 text-blue-800';
      case PerformanceLevel.ALTO: return 'bg-green-100 text-green-800';
      case PerformanceLevel.BASICO: return 'bg-yellow-100 text-yellow-800';
      case PerformanceLevel.BAJO: return 'bg-red-100 text-red-800';
    }
  };


  const handleGenerateAiObservation = async (studentId: string) => {
    if (typeof currentPeriod === 'string') return;

    const student = students.find(s => s.id === studentId);
    const gradeRecord = localData.find(d => d.studentId === studentId);
    if (!student || !gradeRecord) return;
    
    const gradeData = gradeRecord.periods[currentPeriod];
    if (!gradeData) return;
    
    const final = calculatePeriodDefinitive(gradeData, currentPeriod);

    setLoadingId(studentId);
    try {
      const observation = await generateStudentObservation(student, gradeData, final, currentPeriod);
      const newData = localData.map(d => {
        if (d.studentId !== studentId) return d;
        const newPeriods = { ...d.periods };
        newPeriods[currentPeriod] = { ...newPeriods[currentPeriod], observaciones: observation };
        return { ...d, periods: newPeriods };
      });
      setLocalData(newData);
      setSaveStatus('unsaved');
      addToast(`Observación generada para ${student.name}.`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      addToast(message, 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const handleUpdateField = (studentId: string, field: keyof PeriodGradeData, value: any) => {
      if (typeof currentPeriod === 'string') return;
      setLocalData(prev => prev.map(d => {
        if (d.studentId !== studentId) return d;
        const newPeriods = { ...d.periods };
        const newPeriodData = { ...newPeriods[currentPeriod], [field]: value };
        newPeriods[currentPeriod] = newPeriodData;
        return { ...d, periods: newPeriods };
      }));
      setSaveStatus('unsaved');
  };

  const handleLlegadaTardeToggle = (studentId: string) => {
     if (typeof currentPeriod === 'string') return;
     const gradeRecord = localData.find(d => d.studentId === studentId);
     if (!gradeRecord) return;
     const currentPeriodData = gradeRecord.periods[currentPeriod];
     handleUpdateField(studentId, 'llegadaTarde', !currentPeriodData.llegadaTarde);
  };
  
  const handleSendToDirector = async () => {
    if (typeof currentPeriod !== 'number') return;
    setIsSending(true);

    const currentPeriodTaskActivities = taskActivities[currentPeriod] || [];
    const currentPeriodWorkshopActivities = workshopActivities[currentPeriod] || [];

    const submissions: TeacherReportSubmission[] = localData.map(studentData => {
        const student = students.find(s => s.id === studentData.studentId)!;
        const periodData = studentData.periods[currentPeriod!];

        const allActivities = [
            ...currentPeriodTaskActivities.map((activity, i) => ({ ...activity, grade: periodData.tasks[i] })),
            ...currentPeriodWorkshopActivities.map((activity, i) => ({ ...activity, grade: periodData.workshops[i] })),
        ];

        const pending = allActivities
            .filter(act => act.grade === undefined || act.grade === null)
            .map(act => `• ${act.name}`);

        const insufficient = allActivities
            .filter(act => typeof act.grade === 'number' && act.grade < 6.0)
            .map(act => `• ${act.name} (${act.grade})`);
            
        const positives = allActivities
            .filter(act => typeof act.grade === 'number' && act.grade >= 6.0)
            .map(act => `• ${act.name} (${act.grade})`);
        
        return {
            studentId: student.id,
            gradeLevelId: assignment.gradeLevel!.id,
            period: currentPeriod,
            subjectId: assignment.subject!.id,
            reportData: {
                pending_activities: pending.join('\n'),
                insufficient_activities: insufficient.join('\n'),
                positive_notes: positives.join('\n'),
                teacher_observation: periodData.observaciones || '',
                convivencia_problemas: periodData.convivenciaProblemas || '',
                llegada_tarde: periodData.llegadaTarde || false,
                presentacion_personal: periodData.presentacionPersonal || '',
            }
        };
    });
    
    try {
        await db.submitReportsToDirector(submissions);
        addToast('Informes enviados al director de grupo con éxito.', 'success');
    } catch (error) {
        addToast('Error al enviar los informes.', 'error');
    } finally {
        setIsSending(false);
    }
  }

  const handleSavePdf = async () => {
    if (typeof currentPeriod !== 'number') {
      addToast('No se puede generar el PDF en la vista de resumen.', 'error');
      return;
    }

    setIsGeneratingPdf(true);
    try {
        generateTeacherReportPdf({
            assignment,
            students,
            studentRecords: localData,
            taskActivities,
            workshopActivities,
            period: currentPeriod,
        });
        addToast('PDF de alta calidad generado y descargado.', 'success');
    } catch (error) {
        console.error('Error al generar el PDF:', error);
        addToast('Hubo un problema al generar el PDF.', 'error');
    } finally {
        setIsGeneratingPdf(false);
    }
  };


  const renderStudentRow = (row: StudentGradeRecord, student: Student) => {
    if (typeof currentPeriod === 'string') return null;
    const periodData = row.periods[currentPeriod];
    if (!periodData) return null;

    const currentPeriodTaskActivities = taskActivities[currentPeriod] || [];
    const currentPeriodWorkshopActivities = workshopActivities[currentPeriod] || [];

    const pending = [
      ...currentPeriodTaskActivities.map((activity, i) => {
        const grade = periodData.tasks[i];
        return (grade === undefined || grade === null) ? `${activity.name} (Faltante)` : null;
      }).filter(Boolean),
      ...currentPeriodWorkshopActivities.map((activity, i) => {
        const grade = periodData.workshops[i];
        return (grade === undefined || grade === null) ? `${activity.name} (Faltante)` : null;
      }).filter(Boolean),
    ];

    const insufficient = [
       ...currentPeriodTaskActivities.map((activity, i) => {
        const grade = periodData.tasks[i];
        return (typeof grade === 'number' && grade < 6.0) ? `${activity.name} (${grade})` : null;
      }).filter(Boolean),
      ...currentPeriodWorkshopActivities.map((activity, i) => {
        const grade = periodData.workshops[i];
        return (typeof grade === 'number' && grade < 6.0) ? `${activity.name} (${grade})` : null;
      }).filter(Boolean),
    ];
    
    const faltantesInsuficientes = [...pending, ...insufficient];

    const positives = [
      ...currentPeriodTaskActivities.map((activity, i) => {
        const grade = periodData.tasks[i];
        return (typeof grade === 'number' && grade >= 6.0) ? `${activity.name} (${grade})` : null;
      }).filter(Boolean),
      ...currentPeriodWorkshopActivities.map((activity, i) => {
        const grade = periodData.workshops[i];
        return (typeof grade === 'number' && grade >= 6.0) ? `${activity.name} (${grade})` : null;
      }).filter(Boolean)
    ];

    return (
      <tr key={row.studentId} className="hover:bg-slate-50">
        <td className="border p-3 font-medium align-top">{student.name}</td>
        <td className="border p-3 text-red-600 text-xs align-top">
          {faltantesInsuficientes.length > 0 ? (
            <ul className="list-disc pl-4 space-y-1">
              {faltantesInsuficientes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          ) : <span className="text-slate-400 italic">Ninguna</span>}
        </td>
        <td className="border p-3 text-green-700 text-xs align-top">
          {positives.length > 0 ? (
             <ul className="list-disc pl-4 space-y-1">
              {positives.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          ) : <span className="text-slate-400 italic">Ninguna</span>}
        </td>
        <td className="border p-3 align-top">
           <Textarea 
            className="h-24 text-xs resize-none"
            value={periodData.convivenciaProblemas}
            onChange={(e) => handleUpdateField(row.studentId, 'convivenciaProblemas', e.target.value)}
            placeholder="Describir problemas de convivencia..."
          />
        </td>
        <td className="border p-0 text-center align-middle">
          <Button 
              onClick={() => handleLlegadaTardeToggle(row.studentId)}
              variant="ghost"
              size="icon"
              className={periodData.llegadaTarde ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' : 'text-slate-300 hover:text-slate-500'}
           > <Clock size={20} /> </Button>
        </td>
        <td className="border p-3 align-top">
          <Textarea 
            className="h-24 text-xs resize-none"
            value={periodData.presentacionPersonal}
            onChange={(e) => handleUpdateField(row.studentId, 'presentacionPersonal', e.target.value)}
            placeholder="Recomendaciones de presentación personal..."
          />
        </td>
        <td className="border p-3 align-top relative group">
          <Textarea 
            className="h-24 text-xs resize-none"
            value={periodData.observaciones}
            onChange={(e) => handleUpdateField(row.studentId, 'observaciones', e.target.value)}
            placeholder="Escriba o genere una observación..."
          />
          <Button 
            onClick={() => handleGenerateAiObservation(row.studentId)}
            disabled={loadingId === row.studentId}
            size="icon"
            variant="ghost"
            className="absolute bottom-4 right-4 h-8 w-8 bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
            title="Generar con AI"
          >
            {loadingId === row.studentId ? (
              <Loader2 size={16} className="animate-spin" />
            ) : ( <Wand2 size={16} /> )}
          </Button>
        </td>
      </tr>
    );
  };
  
  const renderStudentCard = (row: StudentGradeRecord, student: Student) => {
    if (typeof currentPeriod === 'string') return null;
    const periodData = row.periods[currentPeriod];
    if (!periodData) return null;

    const currentPeriodTaskActivities = taskActivities[currentPeriod] || [];
    const currentPeriodWorkshopActivities = workshopActivities[currentPeriod] || [];

    const pending = [
      ...currentPeriodTaskActivities.map((activity, i) => {
        const grade = periodData.tasks[i];
        return (grade === undefined || grade === null) ? `${activity.name} (Faltante)` : null;
      }).filter(Boolean),
      ...currentPeriodWorkshopActivities.map((activity, i) => {
        const grade = periodData.workshops[i];
        return (grade === undefined || grade === null) ? `${activity.name} (Faltante)` : null;
      }).filter(Boolean),
    ];
    const insufficient = [
       ...currentPeriodTaskActivities.map((activity, i) => {
        const grade = periodData.tasks[i];
        return (typeof grade === 'number' && grade < 6.0) ? `${activity.name} (${grade})` : null;
      }).filter(Boolean),
      ...currentPeriodWorkshopActivities.map((activity, i) => {
        const grade = periodData.workshops[i];
        return (typeof grade === 'number' && grade < 6.0) ? `${activity.name} (${grade})` : null;
      }).filter(Boolean),
    ];
    const faltantesInsuficientes = [...pending, ...insufficient];

    const positives = [
      ...currentPeriodTaskActivities.map((activity, i) => {
        const grade = periodData.tasks[i];
        return (typeof grade === 'number' && grade >= 6.0) ? `${activity.name} (${grade})` : null;
      }).filter(Boolean),
      ...currentPeriodWorkshopActivities.map((activity, i) => {
        const grade = periodData.workshops[i];
        return (typeof grade === 'number' && grade >= 6.0) ? `${activity.name} (${grade})` : null;
      }).filter(Boolean)
    ];

    return (
        <div key={row.studentId} className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
            <h3 className="font-bold text-slate-800">{student.name}</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <h4 className="text-xs font-semibold text-red-600 mb-1">Evidencias Faltantes / Insuficientes</h4>
                    <div className="text-xs text-red-500">
                      {faltantesInsuficientes.length > 0 ? (
                        <ul className="list-disc pl-4 space-y-1">
                          {faltantesInsuficientes.map((n, i) => <li key={i}>{n}</li>)}
                        </ul>
                      ) : <span className="text-slate-400 italic">Ninguna</span>}
                    </div>
                </div>
                <div>
                    <h4 className="text-xs font-semibold text-green-700 mb-1">Notas Positivas</h4>
                    <div className="text-xs text-green-600">
                       {positives.length > 0 ? (
                         <ul className="list-disc pl-4 space-y-1">
                          {positives.map((n, i) => <li key={i}>{n}</li>)}
                        </ul>
                      ) : <span className="text-slate-400 italic">Ninguna</span>}
                    </div>
                </div>
            </div>

            <div className="space-y-3 border-t pt-3">
                <div>
                    <h4 className="text-xs font-semibold text-slate-600 mb-1">Problemas de Convivencia</h4>
                    <Textarea
                        className="h-24 text-xs resize-none"
                        value={periodData.convivenciaProblemas}
                        onChange={(e) => handleUpdateField(row.studentId, 'convivenciaProblemas', e.target.value)}
                        placeholder="Describir problemas..."
                    />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-600 mb-1">Presentación Personal / Recomendaciones</h4>
                  <Textarea 
                    className="h-24 text-xs resize-none"
                    value={periodData.presentacionPersonal}
                    onChange={(e) => handleUpdateField(row.studentId, 'presentacionPersonal', e.target.value)}
                    placeholder="Recomendaciones de presentación personal..."
                  />
                </div>
                <div>
                    <h4 className="text-xs font-semibold text-slate-600 mb-1">Observaciones (AI)</h4>
                    <div className="relative group">
                        <Textarea 
                          className="h-24 text-xs resize-none"
                          value={periodData.observaciones}
                          onChange={(e) => handleUpdateField(row.studentId, 'observaciones', e.target.value)}
                          placeholder="Escriba o genere una observación..."
                        />
                        <Button 
                          onClick={() => handleGenerateAiObservation(row.studentId)}
                          disabled={loadingId === student.id}
                          size="icon"
                          variant="ghost"
                          className="absolute bottom-2 right-2 h-8 w-8 bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                          title="Generar con AI"
                        >
                          {loadingId === student.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : ( <Wand2 size={16} /> )}
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-4 border-t pt-3">
                    <Button 
                        onClick={() => handleLlegadaTardeToggle(row.studentId)}
                        variant="ghost"
                        className={`gap-2 ${periodData.llegadaTarde ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' : 'text-slate-500'}`}
                    > <Clock size={18} /> <span>Llegada Tarde</span> </Button>
                </div>
            </div>
        </div>
    );
  }

  const renderSummaryCard = (row: StudentGradeRecord, student: Student) => {
    const summary = calculateFinalSummary(row);
    return (
        <div key={`summary-${row.studentId}`} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-slate-800">{student.name}</h3>
                <span className={`px-2 py-1 rounded text-xs font-bold ${getPerformanceColor(summary.performance)}`}>{summary.performance}</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="text-center bg-slate-50 p-3 rounded-md">
                   <p className="text-xs text-slate-500">Promedio Final Ponderado</p>
                   <p className={`font-bold text-3xl mt-1 ${summary.weightedFinal < 6.0 ? 'text-red-600' : 'text-slate-800'}`}>{summary.weightedFinal.toFixed(2)}</p>
                </div>
                <div className="grid grid-cols-3 text-center sm:text-left sm:grid-cols-1 sm:border-l sm:pl-4">
                  {periods.map(p => (
                    <p key={p} className="text-sm">P{p}: <span className="font-bold">{summary[p].toFixed(1)}</span></p>
                  ))}
                </div>
            </div>

            <div>
                <h4 className="text-xs font-semibold text-slate-600 mb-2">Observaciones Generales</h4>
                <div className="space-y-2 text-xs text-slate-700">
                  {periods.map(p => (
                    <p key={p}><strong>P{p}:</strong> {row.periods[p]?.observaciones || <span className="italic text-slate-400">Sin observación.</span>}</p>
                  ))}
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-full flex flex-col">
        <div className="p-4 border-b flex items-center justify-between bg-white rounded-t-lg">
          <Button onClick={onBackToGradeBook} variant="outline" className="gap-2">
              <ArrowLeft size={16} /> Volver a la Planilla
          </Button>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500 w-48 text-right">
              {saveStatus === 'saving' && <span className="flex items-center justify-end gap-1.5"><Loader2 size={14} className="animate-spin" /> Guardando...</span>}
              {saveStatus === 'saved' && <span className="italic">Cambios guardados</span>}
              {saveStatus === 'unsaved' && <span className="text-yellow-600 font-medium">Cambios sin guardar</span>}
            </div>
            <Button 
              onClick={() => handleSaveChanges(true)} 
              disabled={saveStatus === 'saved' || saveStatus === 'saving'}
              className="gap-2"
            >
                <Save size={16} /> Guardar Informe
            </Button>
            <Button 
              onClick={handleSendToDirector} 
              disabled={isSending || currentPeriod === 'Resumen'}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {isSending ? 'Enviando...' : 'Enviar al Director'}
            </Button>
            <Button 
              onClick={handleSavePdf} 
              disabled={isGeneratingPdf || currentPeriod === 'Resumen'}
              className="gap-2"
            >
              {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {isGeneratingPdf ? 'Generando...' : 'Guardar PDF'}
            </Button>
          </div>
        </div>

        <div className="border-b px-4 bg-white">
          <div className="flex -mb-px">
              {periodsWithSummary.map(p => (
                  <button 
                      key={p} 
                      onClick={() => setCurrentPeriod(p)} 
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${currentPeriod === p 
                          ? 'border-indigo-600 text-indigo-600' 
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                  >
                      {typeof p === 'number' ? `Periodo ${p}` : p}
                  </button>
              ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar p-4 bg-slate-50">
          {currentPeriod === 'Resumen' ? (
              <div className="space-y-4">
                {localData.map((row) => {
                    const student = students.find(s => s.id === row.studentId);
                    return student ? renderSummaryCard(row, student) : null;
                })}
              </div>
          ) : (
            <>
              {/* Mobile View: Cards */}
              <div className="md:hidden space-y-4">
                {localData.map((row) => {
                    const student = students.find(s => s.id === row.studentId);
                    return student ? renderStudentCard(row, student) : null;
                })}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                    <tr>
                      <th className="border p-2 text-left min-w-[200px]">Estudiante</th>
                      <th className="border p-2 text-left min-w-[200px]">Evidencias Faltantes / Insuficientes</th>
                      <th className="border p-2 text-left min-w-[200px]">Notas Positivas</th>
                      <th className="border p-2 text-left min-w-[250px]">Problemas Convivencia</th>
                      <th className="border p-2 text-center w-28">Llegadas Tarde</th>
                      <th className="border p-2 text-left min-w-[250px]">Presentación Personal</th>
                      <th className="border p-2 text-left min-w-[250px]">Observaciones (AI)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localData.map((row) => {
                      const student = students.find(s => s.id === row.studentId);
                      return student ? renderStudentRow(row, student) : null;
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};