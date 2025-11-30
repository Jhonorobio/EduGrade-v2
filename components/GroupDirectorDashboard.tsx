import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Loader2, User as UserIcon, Save, Download, Wand2 } from 'lucide-react';
import { GradeLevel, Student, Subject, AcademicSettings, ConsolidatedReport } from '../types';
import { db } from '../services/db';
import { useToast } from './Toast';
import { generateDirectorReportPdf } from '../services/pdfService';
import { generateDirectorObservation } from '../services/geminiService';

const DirectorReportEditor: React.FC<{ student: Student; gradeLevel: GradeLevel; onBack: () => void; academicSettings: AcademicSettings; }> = ({ student, gradeLevel, onBack, academicSettings }) => {
  const [report, setReport] = useState<ConsolidatedReport | null>(null);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(1);
  const { addToast } = useToast();

  const periods = useMemo(() => Array.from({ length: academicSettings.periodCount }, (_, i) => i + 1), [academicSettings.periodCount]);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const [reportData, subjectsData] = await Promise.all([
          db.getConsolidatedReportForStudent(student.id, currentPeriod),
          db.getSubjectsByGrade(gradeLevel.id)
        ]);
        
        if (reportData) {
          setReport(reportData);
        } else {
          // Create a new, empty report if none exists
          setReport({
            studentId: student.id,
            gradeLevelId: gradeLevel.id,
            period: currentPeriod,
            submittedReports: {},
            directorGeneralObservation: ''
          });
        }
        setAllSubjects(subjectsData);
      } catch (error) {
        addToast("Error al cargar el informe del director.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [student, gradeLevel, currentPeriod, addToast]);
  
  const handleSave = async () => {
    if (!report) return;
    setSaving(true);
    try {
      await db.saveConsolidatedReport(report);
      addToast('Informe guardado con éxito.', 'success');
    } catch (error) {
      addToast('Error al guardar el informe.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePdf = () => {
    if (!report) {
        addToast('No hay datos de informe para generar el PDF.', 'error');
        return;
    };
    
    try {
        generateDirectorReportPdf({
            report,
            student,
            gradeLevel,
            allSubjects,
            period: currentPeriod,
        });
        addToast('PDF generado con éxito.', 'success');
    } catch (error) {
        console.error("Error generating director PDF:", error);
        addToast('No se pudo generar el PDF.', 'error');
    }
  };

  const handleGenerateDirectorObservation = async () => {
    if (!report || !student) return;
    setIsGenerating(true);
    try {
        const observation = await generateDirectorObservation(student, currentPeriod, report.submittedReports, allSubjects);
        setReport(prev => prev ? { ...prev, directorGeneralObservation: observation } : null);
        addToast('Observación generada con IA.', 'success');
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        addToast(message, 'error');
    } finally {
        setIsGenerating(false);
    }
  };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
            </div>
        );
    }
    
    if (!report) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <p className="text-slate-500 mb-4">No se encontró un informe para este estudiante en el periodo {currentPeriod}.</p>
                <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">
                    <ArrowLeft size={16} /> Volver
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{student.name}</h2>
                        <p className="text-sm text-slate-500">Grado: {gradeLevel.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={currentPeriod}
                        onChange={(e) => setCurrentPeriod(Number(e.target.value))}
                        className="p-2 border rounded-md bg-white"
                    >
                        {periods.map(p => <option key={p} value={p}>Periodo {p}</option>)}
                    </select>
                    <button onClick={handleGeneratePdf} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        <Download size={16} /> PDF
                    </button>
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Guardar
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <table className="w-full border-collapse text-sm">
                    <thead className="bg-slate-100 sticky top-0">
                        <tr className="border-b bg-slate-50">
                            <th rowSpan={2} className="p-2 border font-semibold text-slate-700 align-middle text-center">ASIGNATURA</th>
                            <th colSpan={3} className="p-2 border font-semibold text-slate-700 text-center">COMPORTAMENTAL</th>
                            <th colSpan={4} className="p-2 border font-semibold text-slate-700 text-center">OBSERVACIONES ACADÉMICAS</th>
                        </tr>
                        <tr className="border-b bg-slate-50">
                            <th className="p-2 border font-semibold text-slate-600 text-center">PROBLEMAS CONVIVENCIA</th>
                            <th className="p-2 border font-semibold text-slate-600 text-center">LLEGADAS TARDE</th>
                            <th className="p-2 border font-semibold text-slate-600 text-center">PRESENTACIÓN PERSONAL</th>
                            <th className="p-2 border font-semibold text-slate-600 text-center">ACTIVIDADES PENDIENTES</th>
                            <th className="p-2 border font-semibold text-slate-600 text-center">ACTIVIDADES INSUFICIENTES</th>
                            <th className="p-2 border font-semibold text-slate-600 text-center">NOTAS POSITivas</th>
                            <th className="p-2 border font-semibold text-slate-600 text-center">OBSERVACIONES DEL DOCENTE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allSubjects.map(subject => {
                            const subjectReport = report.submittedReports[subject.id];
                            return (
                                <tr key={subject.id} className="border-b hover:bg-slate-50">
                                    <td className="p-2 border font-semibold align-top">{subject.name}</td>
                                    <td className="p-2 border align-top text-xs whitespace-pre-wrap">{subjectReport?.convivencia_problemas || ''}</td>
                                    <td className="p-2 border align-top text-xs text-center whitespace-pre-wrap">{subjectReport?.llegada_tarde ? 'SI' : 'NO'}</td>
                                    <td className="p-2 border align-top text-xs whitespace-pre-wrap">{subjectReport?.presentacion_personal || ''}</td>
                                    <td className="p-2 border align-top text-xs whitespace-pre-wrap">{subjectReport?.pending_activities || ''}</td>
                                    <td className="p-2 border align-top text-xs whitespace-pre-wrap">{subjectReport?.insufficient_activities || ''}</td>
                                    <td className="p-2 border align-top text-xs whitespace-pre-wrap">{subjectReport?.positive_notes || ''}</td>
                                    <td className="p-2 border align-top text-xs whitespace-pre-wrap">{subjectReport?.teacher_observation || ''}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div className="mt-4">
                    <div className="p-2 border border-slate-300 border-b-0 rounded-t-md bg-slate-100 font-semibold text-slate-700 text-center flex justify-center items-center relative">
                        <span>OBSERVACIONES / ACTITUDINAL</span>
                        <button 
                            onClick={handleGenerateDirectorObservation}
                            disabled={isGenerating}
                            className="absolute right-2 p-1.5 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors shadow-sm disabled:opacity-50"
                            title="Generar observación con IA"
                        >
                            {isGenerating ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Wand2 size={16} />
                            )}
                        </button>
                    </div>
                    <textarea 
                        value={report.directorGeneralObservation}
                        onChange={(e) => setReport({ ...report, directorGeneralObservation: e.target.value })}
                        className="w-full h-32 p-2 border border-slate-300 rounded-b-md resize-y text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        placeholder="Agregue aquí las observaciones generales del estudiante o genere una con IA..."
                    />
                </div>
            </div>
        </div>
    );
};


const GroupDirectorDashboard: React.FC<{ gradeLevel: GradeLevel; academicSettings: AcademicSettings; }> = ({ gradeLevel, academicSettings }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      const data = await db.getStudentsByGrade(gradeLevel.id);
      setStudents(data);
      setLoading(false);
    };
    fetchStudents();
  }, [gradeLevel]);

  if (selectedStudent) {
    return <DirectorReportEditor student={selectedStudent} gradeLevel={gradeLevel} onBack={() => setSelectedStudent(null)} academicSettings={academicSettings} />;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold text-slate-800">Dirección de Grupo: {gradeLevel.name}</h2>
        <p className="text-sm text-slate-500">Seleccione un estudiante para ver/editar su informe consolidado.</p>
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
        </div>
      ) : (
        <div className="flex-1 overflow-auto custom-scrollbar">
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
              {students.map(student => (
                 <div 
                   key={student.id} 
                   onClick={() => setSelectedStudent(student)}
                   className="flex flex-col items-center p-4 border rounded-lg cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 transition-colors"
                 >
                   <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-2">
                     <UserIcon className="w-8 h-8 text-slate-500" />
                   </div>
                   <p className="text-sm font-medium text-center">{student.name}</p>
                 </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default GroupDirectorDashboard;