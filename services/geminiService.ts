import { GoogleGenAI } from "@google/genai";
import { PeriodGradeData, Student, DirectorReportSubmission, Subject } from "../types";

const getAiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY is missing in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateStudentObservation = async (
  student: Student,
  grades: PeriodGradeData,
  finalGrade: number,
  period: number
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key de Gemini no configurada.");

  const prompt = `
    Eres un asistente pedagógico experto. Genera una observación corta (máximo 40 palabras) para un informe académico escolar para el Periodo ${period}.
    
    Estudiante: ${student.name}
    Nota Definitiva del Periodo: ${finalGrade.toFixed(1)} / 10.0
    Desempeño en Tareas (Promedio): ${(grades.tasks.reduce((a: number, b: number | null) => a + (b || 0), 0) / Math.max(grades.tasks.length, 1)).toFixed(1)}
    Desempeño en Talleres (Promedio): ${(grades.workshops.reduce((a: number, b: number | null) => a + (b || 0), 0) / Math.max(grades.workshops.length, 1)).toFixed(1)}
    Nota Examen: ${grades.exam}
    Actitud: ${grades.attitude}
    
    Si la nota es baja, sugiere mejora. Si es alta, felicita. Sé formal pero empático.
    Responde solo con el texto de la observación.
  `;

  try {
    // FIX: Use `contents` property for the prompt and a non-deprecated model.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    // FIX: Access the 'text' property directly instead of calling a method.
    return (response.text || '').trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("No se pudo generar la observación automática.");
  }
};

export const generateDirectorObservation = async (
  student: Student,
  period: number,
  submittedReports: { [subjectId: string]: DirectorReportSubmission },
  allSubjects: Subject[]
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key de Gemini no configurada.");

  const subjectReportsText = allSubjects
    .map(subject => {
      const report = submittedReports[subject.id];
      if (!report) return null;

      return `
      --- Materia: ${subject.name} ---
      Observación del docente: ${report.teacher_observation || 'Ninguna.'}
      Problemas de convivencia: ${report.convivencia_problemas || 'Ninguno.'}
      Llegadas tarde: ${report.llegada_tarde ? 'Sí' : 'No'}
      Presentación personal: ${report.presentacion_personal || 'Adecuada.'}
      Actividades pendientes: ${report.pending_activities.trim() ? report.pending_activities : 'Ninguna.'}
      Actividades con nota insuficiente: ${report.insufficient_activities.trim() ? report.insufficient_activities : 'Ninguna.'}
      Notas positivas: ${report.positive_notes.trim() ? report.positive_notes : 'Ninguna.'}
      `;
    })
    .filter(Boolean)
    .join('\n');
    
  if (!subjectReportsText.trim()) {
    return "No hay suficientes datos de los docentes para generar una observación consolidada.";
  }

  const prompt = `
    Eres un director de grupo experto en un colegio. Tu tarea es redactar una observación general consolidada para el informe académico del estudiante ${student.name} para el Periodo ${period}.
    
    Utiliza los siguientes informes de los docentes de diferentes asignaturas para crear un resumen coherente y constructivo. La observación debe ser formal, empática y balanceada, destacando tanto los aspectos positivos como las áreas de mejora.
    
    No repitas la información textualmente, sintetízala. La observación final debe tener entre 50 y 70 palabras.
    
    Informes de los Docentes:
    ${subjectReportsText}
    
    Basado en toda la información anterior, redacta la observación general. Responde únicamente con el texto de la observación.
  `;

  try {
    // FIX: Use `contents` instead of `prompt` to pass the prompt string and use a non-deprecated model.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    // FIX: Access the `text` property directly on the response object.
    return (response.text || '').trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("No se pudo generar la observación del director.");
  }
};