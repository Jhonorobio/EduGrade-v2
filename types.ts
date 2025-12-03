export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN_COLEGIO = 'ADMIN_COLEGIO',
  DOCENTE = 'DOCENTE'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  gender?: 'male' | 'female';
  username: string;
  password?: string; // Should only be used for creation/update
}

export interface Student {
  id: string;
  name: string;
  gradeLevelId?: string | null;
  gradeLevel?: GradeLevel | null;
}

export interface Activity {
  name: string;
  date: string; // YYYY-MM-DD
}

export interface Subject {
  id: string;
  name: string;
}

export interface GradeLevel {
  id: string;
  name: string;
  isEnabled: boolean;
  directorId?: string | null;
  director?: User | null;
}

// Renamed from GradeData to reflect it's for a single period
export interface PeriodGradeData {
  // 20% Apuntes y Tareas
  tasks: (number | null)[]; 
  // 20% Talleres y Exposiciones
  workshops: (number | null)[];
  // 20% Actitudinal
  attitude: number | null;
  // 40% Evaluación
  exam: number | null;
  
  // Manual overrides or additional data for reports
  convivenciaProblemas: string;
  llegadaTarde: boolean;
  presentacionPersonal: string;
  observaciones: string;
}

export interface StudentGradeRecord {
  studentId: string;
  periods: {
    [period: number]: PeriodGradeData;
  };
}

export interface Assignment {
  id: string;
  originalId?: string;
  subjectId: string;
  gradeLevelIds: string[];
  gradeLevelId?: string;
  teacherId: string;
  students: Student[];
  taskActivities: { [period: number]: Activity[] };
  workshopActivities: { [period: number]: Activity[] };

  // Optional populated fields for UI
  teacher?: User;
  subject?: Subject;
  gradeLevels?: GradeLevel[];
  gradeLevel?: GradeLevel;
}

export interface GroupedAssignment {
  subject: Subject;
  assignments: Assignment[];
}

export enum PerformanceLevel {
  SUPERIOR = 'SUPERIOR',
  ALTO = 'ALTO',
  BASICO = 'BASICO',
  BAJO = 'BAJO'
}

export interface AcademicSettings {
  periodCount: number;
  periodWeights: { [period: number]: number }; // e.g. { 1: 30, 2: 30, 3: 40 }
}

export interface DirectorReportSubmission {
  pending_activities: string;
  insufficient_activities: string;
  positive_notes: string;
  teacher_observation: string;
  convivencia_problemas: string;
  llegada_tarde: boolean;
  presentacion_personal: string;
}

export interface ConsolidatedReport {
  id?: string;
  studentId: string;
  gradeLevelId: string;
  period: number;
  submittedReports: { [subjectId: string]: DirectorReportSubmission };
  directorGeneralObservation: string;
  updatedAt?: string;
}

export interface TeacherReportSubmission {
  studentId: string;
  gradeLevelId: string;
  period: number;
  subjectId: string;
  reportData: DirectorReportSubmission;
}