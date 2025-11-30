import React from 'react';
import { Assignment, Student, StudentGradeRecord, Activity, PeriodGradeData } from '../types';

interface PrintableReportProps {
  assignment: Assignment;
  students: Student[];
  data: StudentGradeRecord[];
  taskActivities: { [period: number]: Activity[] };
  workshopActivities: { [period: number]: Activity[] };
  period: number;
}

export const PrintableAcademicReport = React.forwardRef<HTMLDivElement, PrintableReportProps>(({
  assignment,
  students,
  data,
  taskActivities,
  workshopActivities,
  period,
}, ref) => {

  const currentPeriodTaskActivities = taskActivities[period] || [];
  const currentPeriodWorkshopActivities = workshopActivities[period] || [];
  const currentYear = new Date().getFullYear();

  const getStudentReportData = (periodData: PeriodGradeData) => {
    const allActivities = [
      ...currentPeriodTaskActivities.map((activity, i) => ({ ...activity, grade: periodData.tasks[i] })),
      ...currentPeriodWorkshopActivities.map((activity, i) => ({ ...activity, grade: periodData.workshops[i] })),
    ];
    
    const faltantes = allActivities
      .filter(act => act.grade === undefined || act.grade === null)
      .map(act => `• ${act.name}`);
      
    const insuficientes = allActivities
      .filter(act => typeof act.grade === 'number' && act.grade < 6.0)
      .map(act => `• ${act.name} (${act.grade})`);

    const positives = allActivities
      .filter(act => typeof act.grade === 'number' && act.grade >= 6.0)
      .map(act => `• ${act.name} (${act.grade})`);

    return { faltantes, insuficientes, positives };
  };

  return (
    <div ref={ref} className="printable-report p-8 bg-white text-black">
      <header className="text-center mb-8 relative">
        {/* Placeholder for logo if needed */}
        <h1 className="text-xl font-bold">COLEGIO PATRICIO SYMES</h1>
        <h2 className="text-lg">INFORME CUALITATIVO ESTUDIANTES</h2>
        <h3 className="text-md">AÑO LECTIVO {currentYear}.</h3>
      </header>

      <section className="text-center font-bold text-lg mb-4 p-2 border-y-2 border-black">
        INFORME ACADÉMICO
      </section>

      <section className="flex justify-between mb-4 font-semibold text-sm">
        <p>ASIGNATURA: <span className="font-normal">{assignment.subject?.name || '________________'}</span></p>
        <p>GRADO: <span className="font-normal">{assignment.gradeLevel?.name || '________________'}</span></p>
        <p>PRESENTADO AL DIRECTOR DE GRUPO</p>
      </section>

      <table className="w-full border-collapse border border-black text-[9px]">
        <thead>
          <tr className="font-bold text-center align-middle" style={{ backgroundColor: '#e2e8f0' }}>
            <td className="border border-black p-1 w-[3%]">No.</td>
            <td className="border border-black p-1 w-[15%]">NOMBRE DEL ESTUDIANTE</td>
            <td className="border border-black p-1">Indicar las evidencias que no ha presentado el estudiante. Física / plataforma</td>
            <td className="border border-black p-1">Mencionar la actividad que tiene nota insuficiente.</td>
            <td className="border border-black p-1">Mencionar notas positivas que tiene el estudiante hasta el momento</td>
            <td className="border border-black p-1">El estudiante presenta problemas de convivencia (actitudinal)</td>
            <td className="border border-black p-1">El estudiante falta o ingresa tarde generalmente a las clases.</td>
            <td className="border border-black p-1">Presentación personal /recomendaciones.</td>
            <td className="border border-black p-1">Observaciones.</td>
          </tr>
        </thead>
        <tbody>
          {students.map((student, index) => {
            const studentData = data.find(d => d.studentId === student.id);
            const periodData = studentData?.periods[period];
            const reportData = periodData ? getStudentReportData(periodData) : { faltantes: [], insuficientes: [], positives: [] };

            return (
              <tr key={student.id} style={{ pageBreakInside: 'avoid' }}>
                <td className="border border-black p-1 text-center align-top">{index + 1}</td>
                <td className="border border-black p-1 font-semibold align-top">{student.name}</td>
                <td className="border border-black p-1 align-top whitespace-pre-line">
                  {reportData.faltantes.join('\n')}
                </td>
                <td className="border border-black p-1 align-top whitespace-pre-line">
                  {reportData.insuficientes.join('\n')}
                </td>
                <td className="border border-black p-1 align-top whitespace-pre-line">
                  {reportData.positives.join('\n')}
                </td>
                <td className="border border-black p-1 align-top">{periodData?.convivenciaProblemas || ''}</td>
                <td className="border border-black p-1 text-center align-top">{periodData?.llegadaTarde ? 'SI' : 'NO'}</td>
                <td className="border border-black p-1 align-top">{periodData?.presentacionPersonal}</td>
                <td className="border border-black p-1 align-top h-16">{periodData?.observaciones || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <footer className="mt-12">
        <p className="font-semibold">FIRMA DEL DOCENTE: ___________________________________</p>
      </footer>
    </div>
  );
});

PrintableAcademicReport.displayName = 'PrintableAcademicReport';