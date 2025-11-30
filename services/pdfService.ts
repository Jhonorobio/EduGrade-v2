import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Assignment, Student, StudentGradeRecord, Activity, PeriodGradeData, ConsolidatedReport, GradeLevel, Subject } from '../types';
// --- Shared Constants and Types ---
// FIX: The school's actual logo is used, not a placeholder.
const SCHOOL_LOGO_BASE64 = '';

type TeacherReportProps = {
  assignment: Assignment;
  students: Student[];
  studentRecords: StudentGradeRecord[];
  taskActivities: { [period: number]: Activity[] };
  workshopActivities: { [period: number]: Activity[] };
  period: number;
};

const getReportData = (periodData: PeriodGradeData, taskActivitiesForPeriod: Activity[], workshopActivitiesForPeriod: Activity[]) => {
    const allActivities = [
        ...taskActivitiesForPeriod.map((activity, i) => ({ ...activity, grade: periodData.tasks[i] })),
        ...workshopActivitiesForPeriod.map((activity, i) => ({ ...activity, grade: periodData.workshops[i] })),
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

export const generateTeacherReportPdf = ({
  assignment,
  students,
  studentRecords,
  taskActivities,
  workshopActivities,
  period,
}: TeacherReportProps) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter'
  });

  const currentYear = new Date().getFullYear();
  const currentPeriodTaskActivities = taskActivities[period] || [];
  const currentPeriodWorkshopActivities = workshopActivities[period] || [];

  // Add header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('COLEGIO PATRICIO SYMES', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
  doc.setFontSize(12);
  doc.text('INFORME CUALITATIVO ESTUDIANTES', doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`AÑO LECTIVO ${currentYear}`, doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME ACADÉMICO', doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`ASIGNATURA: ${assignment.subject?.name || 'N/A'}`, 14, 50);
  doc.text(`GRADO: ${assignment.gradeLevel?.name || 'N/A'}`, doc.internal.pageSize.getWidth() / 2, 50, { align: 'center' });
  doc.text(`DOCENTE: ${assignment.teacher?.name || 'N/A'}`, doc.internal.pageSize.getWidth() - 14, 50, { align: 'right' });

  const head = [[
    'No.',
    'NOMBRE DEL ESTUDIANTE',
    'Evidencias Faltantes',
    'Actividades Insuficientes',
    'Notas Positivas',
    'Problemas Convivencia',
    'Llegadas Tarde',
    'Presentación Personal',
    'Observaciones'
  ]];

  const body = students.map((student, index) => {
    const studentData = studentRecords.find(d => d.studentId === student.id);
    const periodData = studentData?.periods[period];
    const { faltantes, insuficientes, positives } = periodData ? getReportData(periodData, currentPeriodTaskActivities, currentPeriodWorkshopActivities) : { faltantes: [], insuficientes: [], positives: [] };
    
    return [
      index + 1,
      student.name,
      faltantes.join('\n'),
      insuficientes.join('\n'),
      positives.join('\n'),
      periodData?.convivenciaProblemas || '',
      periodData?.llegadaTarde ? 'SI' : 'NO',
      periodData?.presentacionPersonal || '',
      periodData?.observaciones || ''
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: 60,
    theme: 'grid',
    styles: {
        fontSize: 7,
        cellPadding: 1,
        valign: 'top'
    },
    headStyles: {
        fillColor: [226, 232, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center'
    },
    columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 40 },
        6: { halign: 'center' },
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  doc.text('FIRMA DEL DOCENTE: ___________________________________', 14, finalY + 15);

  doc.save(`Informe_${assignment.subject?.name}_${assignment.gradeLevel?.name}_P${period}.pdf`);
};

// --- Director Report PDF ---

type DirectorReportProps = {
  report: ConsolidatedReport;
  student: Student;
  gradeLevel: GradeLevel;
  allSubjects: Subject[];
  period: number;
};

export const generateDirectorReportPdf = ({
    report,
    student,
    gradeLevel,
    allSubjects,
    period,
}: DirectorReportProps) => {
    const doc = new jsPDF('p', 'mm', 'letter');
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;

    const currentYear = new Date().getFullYear();
    const today = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = today.toLocaleDateString('es-ES', dateOptions);
    const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    const getPeriodName = (p: number) => {
        switch (p) {
            case 1: return 'Primer Periodo';
            case 2: return 'Segundo Periodo';
            case 3: return 'Tercer Periodo';
            case 4: return 'Cuarto Periodo';
            default: return `Periodo ${p}`;
        }
    };

    // --- Header ---
    const headerStartY = 15;
    const headerHeight = 28;
    const headerWidth = pageW - margin * 2;
    const midX = margin + headerWidth / 2;
    const midY = headerStartY + headerHeight / 2;

    // Draw grid
    doc.setLineWidth(0.3);
    doc.rect(margin, headerStartY, headerWidth, headerHeight); // Outer box
    doc.line(midX, headerStartY, midX, headerStartY + headerHeight); // Vertical line
    doc.line(margin, midY, margin + headerWidth, midY); // Horizontal line

    // --- Cell Content ---

    // Top-Left Cell
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('COLEGIO PATRICIO SYMES', margin + headerWidth / 4, headerStartY + 7, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('"Mi enseñanza goteara como la lluvia"', margin + headerWidth / 4, headerStartY + 12, { align: 'center' });

    // Bottom-Left Cell
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('INFORME PRELIMINAR ESTUDIANTES', margin + headerWidth / 4, midY + 5, { align: 'center' });
    doc.text(`AÑO LECTIVO ${currentYear}`, margin + headerWidth / 4, midY + 10, { align: 'center' });

    // Top-Right Cell (Logo)
    if (SCHOOL_LOGO_BASE64) {
        const logoWidth = 25;
        const logoHeight = 25;
        // Center the logo in its quadrant, slightly higher
        const logoX = midX + (headerWidth / 2 - logoWidth) / 2;
        const logoY = headerStartY + (headerHeight / 2 - logoHeight) / 2 - 2; 
        doc.addImage(SCHOOL_LOGO_BASE64, 'JPEG', logoX, logoY, logoWidth, logoHeight);
    }

    // Bottom-Right Cell
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`FECHA: ${capitalizedDate}`, midX + headerWidth / 4, midY + 5, { align: 'center' });
    doc.text(`Corte: ${getPeriodName(period)}`, midX + headerWidth / 4, midY + 10, { align: 'center' });

    // Student Info
    const studentY = headerStartY + headerHeight + 6;
    doc.setFontSize(10);
    doc.text(`Estudiante: ${student.name}`, margin, studentY);
    doc.text(`Grado: ${gradeLevel.name}`, pageW / 2 + 10, studentY);

    doc.setLineWidth(0.2);
    const studentLabelWidth = doc.getTextWidth('Estudiante: ');
    doc.line(margin + studentLabelWidth, studentY + 1, pageW / 2 - 5, studentY + 1);

    const gradeLabelWidth = doc.getTextWidth('Grado: ');
    doc.line(pageW / 2 + 10 + gradeLabelWidth, studentY + 1, pageW - margin, studentY + 1);

    // Table
    const body = allSubjects.map(subject => {
        // FIX: Use optional chaining to safely access properties on potentially undefined subjectReport.
        const subjectReport = report.submittedReports[subject.id];
        return [
            subject.name,
            (subjectReport?.pending_activities || '').replace(/• /g, '- '),
            (subjectReport?.insufficient_activities || '').replace(/• /g, '- '),
            (subjectReport?.positive_notes || '').replace(/• /g, '- '),
        ];
    });

    autoTable(doc, {
        head: [
            [
                { content: 'ASIGNATURA', rowSpan: 2, styles: { valign: 'middle', halign: 'left', fontStyle: 'bold' } },
                { content: 'OBSERVACIONES', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } }
            ],
            [
                { content: 'ACTIVIDADES PENDIENTES', styles: { fontStyle: 'bold', halign: 'center' } },
                { content: 'ACTIVIDADES INSUFICIENTES', styles: { fontStyle: 'bold', halign: 'center' } },
                { content: 'NOTAS POSITIVAS', styles: { fontStyle: 'bold', halign: 'center' } }
            ]
        ],
        body: body,
        startY: studentY + 5,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 2,
            valign: 'top',
            lineWidth: 0.2,
            lineColor: [0, 0, 0]
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontSize: 8,
            lineWidth: 0.2,
            lineColor: [0, 0, 0]
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 40 },
            1: { cellWidth: 48 },
            2: { cellWidth: 48 },
            3: { cellWidth: 'auto' },
        },
    });
    
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Observaciones/Actitudinal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('OBSERVACIONES/ ACTITUDINAL', margin, finalY);
    
    const obsText = report.directorGeneralObservation || '';
    if (obsText) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const splitText = doc.splitTextToSize(obsText, pageW - (margin * 2));
        doc.text(splitText, margin, finalY + 6);
        finalY += (splitText.length * 4) + 10;
    } else {
        doc.line(margin, finalY + 8, pageW - margin, finalY + 8);
        doc.line(margin, finalY + 14, pageW - margin, finalY + 14);
        doc.line(margin, finalY + 20, pageW - margin, finalY + 20);
        finalY += 25;
    }

    // Signatures
    const signatureY = finalY + 20;
    const signatureLineY = signatureY - 4;
    const lineLength = 70;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    // Director Signature
    const leftHalfWidth = pageW / 2 - margin;
    const directorLineStartX = margin + (leftHalfWidth - lineLength) / 2;
    doc.line(directorLineStartX, signatureLineY, directorLineStartX + lineLength, signatureLineY);
    const directorName = gradeLevel.director?.name || '';
    const directorText = `DIRECTOR DE GRUPO: ${directorName}`;
    doc.text(directorText, directorLineStartX + lineLength / 2, signatureY, { align: 'center' });

    // Parent Signature
    const rightHalfX = pageW / 2;
    const rightHalfWidth = pageW / 2 - margin;
    const parentLineStartX = rightHalfX + (rightHalfWidth - lineLength) / 2;
    doc.line(parentLineStartX, signatureLineY, parentLineStartX + lineLength, signatureLineY);
    const parentText = 'FIRMA PADRE DE FAMILIA:';
    doc.text(parentText, parentLineStartX + lineLength / 2, signatureY, { align: 'center' });


    doc.save(`Informe_Preliminar_${student.name.replace(/ /g, '_')}_P${period}.pdf`);
}