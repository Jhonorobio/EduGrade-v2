import { supabase, isSupabaseConfigured } from './supabase';
import { Activity, Assignment, PeriodGradeData, StudentGradeRecord, GradeLevel, PerformanceLevel, Student, Subject, User, UserRole, GroupedAssignment, AcademicSettings, TeacherReportSubmission, ConsolidatedReport, DirectorReportSubmission } from '../types';

// --- Grade Level Sorting Utility ---
const GRADE_LEVEL_ORDER: { [key: string]: number } = {
  'pre-jardín': 1,
  'pre jardín': 1,
  'jardín': 2,
  'jardin': 2,
  'transición': 3,
  'transicion': 3,
};

function getGradeLevelSortValue(gradeName: string): number {
  if (!gradeName) return 999;
  const normalized = gradeName.toLowerCase().trim()
    .replace('°', '')
    .replace('º', '');
  
  for (const key in GRADE_LEVEL_ORDER) {
      if (normalized.includes(key)) {
          return GRADE_LEVEL_ORDER[key];
      }
  }

  const match = normalized.match(/^(\d+)/);
  if (match) {
    return parseInt(match[1], 10) + 3; // +3 to be after the special ones
  }
  
  return 999; // for anything else, put it at the end
}


// --- MOCK DATA (for demo mode) ---
// In a real application, this data would come from a backend.
// NOTE: This is a simplified representation.
let MOCK_USERS: User[] = [
    { id: 'usr-super', name: 'Super Admin', email: 'super@edugrade.com', role: UserRole.SUPER_ADMIN, username: 'Admin', password: 'Admin123' },
    { id: 'usr-admin', name: 'Admin Colegio', email: 'admin@colegio.com', role: UserRole.ADMIN_COLEGIO, username: 'Colegio', password: 'ColAdmin' },
    { id: 'usr-teacher-1', name: 'Jhon Doe', email: 'jhon.doe@colegio.com', role: UserRole.DOCENTE, username: 'Jhon', password: 'Profe123' },
    { id: 'usr-teacher-2', name: 'Jane Smith', email: 'jane.smith@colegio.com', role: UserRole.DOCENTE, username: 'Jane', password: 'Profe123' },
];
let MOCK_SUBJECTS: Subject[] = [
    { id: 'sub-math', name: 'Matemáticas' }, { id: 'sub-sci', name: 'Ciencias' }, { id: 'sub-hist', name: 'Historia' },
];
let MOCK_GRADE_LEVELS: GradeLevel[] = [
    { id: 'gl-6a', name: '6-A', isEnabled: true, directorId: 'usr-teacher-1' }, { id: 'gl-7b', name: '7-B', isEnabled: true, directorId: 'usr-teacher-2' }, { id: 'gl-8c', name: '8-C', isEnabled: false },
];
let MOCK_STUDENTS: Student[] = [
    { id: 'stu-1', name: 'Ana García', gradeLevelId: 'gl-6a' }, { id: 'stu-2', name: 'Carlos Rodriguez', gradeLevelId: 'gl-6a' },
    { id: 'stu-3', name: 'Sofia Martinez', gradeLevelId: 'gl-7b' }, { id: 'stu-4', name: 'Luis Hernandez', gradeLevelId: 'gl-7b' },
];
let MOCK_ASSIGNMENTS: Assignment[] = [
    { id: 'as-1', subjectId: 'sub-math', gradeLevelIds: ['gl-6a', 'gl-7b'], teacherId: 'usr-teacher-1', students: [], taskActivities: {}, workshopActivities: {} },
    { id: 'as-2', subjectId: 'sub-sci', gradeLevelIds: ['gl-6a'], teacherId: 'usr-teacher-2', students: [], taskActivities: {}, workshopActivities: {} },
];
let MOCK_GRADES: any[] = [];
let MOCK_CONSOLIDATED_REPORTS: ConsolidatedReport[] = [];


const DEFAULT_ACADEMIC_SETTINGS: AcademicSettings = {
  periodCount: 3,
  periodWeights: { 1: 30, 2: 30, 3: 40 },
};

// Helper to create initial empty grades for a single period
const createInitialPeriodGrades = (): PeriodGradeData => ({
  tasks: [],
  workshops: [],
  attitude: null,
  exam: null,
  convivenciaProblemas: '',
  llegadaTarde: false,
  presentacionPersonal: 'Adecuada',
  observaciones: ''
});

// Helper to create a full, empty grade record for a student for all periods
const createInitialStudentRecord = (studentId: string, settings: AcademicSettings): StudentGradeRecord => ({
  studentId,
  periods: Array.from({ length: settings.periodCount }, (_, i) => i + 1).reduce((acc, period) => {
    acc[period] = createInitialPeriodGrades();
    return acc;
  }, {} as { [period: number]: PeriodGradeData })
});

interface GradeRecord {
  course_id: string;
  student_id: string;
  periodo: number;
  tasks: (number | null)[];
  workshops: (number | null)[];
  attitude: number | null;
  exam: number | null;
  convivencia_problemas: string;
  llegada_tarde: boolean;
  presentacion_personal: string;
  observaciones: string;
}

/**
 * Transforms a list of assignments, creating a separate assignment object
 * for each grade level associated with the original assignment. This is used
 * to present each class as a separate gradebook to teachers.
 */
function _explodeAssignments(assignments: Assignment[]): Assignment[] {
  return assignments.flatMap(assignment => {
    if (!assignment.gradeLevelIds || assignment.gradeLevelIds.length === 0) {
      return []; 
    }

    return assignment.gradeLevelIds.map(gradeId => {
      const gradeLevel = assignment.gradeLevels?.find(gl => gl.id === gradeId);
      if (!gradeLevel) return null;

      const studentsForGrade = assignment.students.filter(s => s.gradeLevelId === gradeId);

      const newAssignment: Assignment = {
         ...assignment,
         id: `${assignment.id}_${gradeId}`,
         originalId: assignment.id,
         gradeLevelIds: [gradeId],
         gradeLevelId: gradeId,
         gradeLevels: [gradeLevel],
         gradeLevel: gradeLevel,
         students: studentsForGrade,
      };

      return newAssignment;
    }).filter((a): a is Assignment => a !== null);
  });
}

// --- PRIVATE HELPER for fetching assignments ---
async function _getAssignments(teacherId?: string): Promise<Assignment[]> {
    if (!isSupabaseConfigured() || !supabase) return [];
    try {
        let query = supabase
            .from('courses')
            .select('*');
        
        if (teacherId) {
            query = query.eq('teacher_id', teacherId);
        }

        const { data: courses, error: coursesError } = await query;
        if (coursesError) throw coursesError;
        if (!courses || courses.length === 0) return [];
        
        // Manually fetch related subjects, teachers, grade levels, and students
        // to avoid complex/brittle nested queries.
        const subjectIds = [...new Set(courses.map(c => c.subject_id).filter(Boolean))];
        const teacherIds = [...new Set(courses.map(c => c.teacher_id).filter(Boolean))];
        const allGradeLevelIds = [...new Set(courses.flatMap(c => Array.isArray(c.grade_level_ids) ? c.grade_level_ids : []))];

        const [subjectsResult, teachersResult, gradeLevelsResult, studentsResult] = await Promise.all([
            subjectIds.length > 0 ? supabase.from('subjects').select('id, name').in('id', subjectIds) : Promise.resolve({ data: [], error: null }),
            teacherIds.length > 0 ? supabase.from('users').select('id, name, email, role, username').in('id', teacherIds) : Promise.resolve({ data: [], error: null }),
            allGradeLevelIds.length > 0 ? supabase.from('grade_levels').select('*').in('id', allGradeLevelIds) : Promise.resolve({ data: [], error: null }),
            allGradeLevelIds.length > 0 ? supabase.from('students').select('*').in('grade_level_id', allGradeLevelIds) : Promise.resolve({ data: [], error: null })
        ]);

        // Instead of throwing an error, log it and continue with empty data.
        // This makes the function resilient to partial data failures (e.g., RLS issues for teachers).
        if (subjectsResult.error) {
          console.error("Supabase could not fetch subjects:", subjectsResult.error);
          subjectsResult.data = [];
        }
        if (teachersResult.error) {
          console.error("Supabase could not fetch teachers:", teachersResult.error);
          teachersResult.data = [];
        }
        if (gradeLevelsResult.error) {
          console.error("Supabase could not fetch grade levels:", gradeLevelsResult.error);
          gradeLevelsResult.data = [];
        }
        if (studentsResult.error) {
          console.error("Supabase could not fetch students:", studentsResult.error);
          studentsResult.data = [];
        }
        
        const subjectsMap = new Map((subjectsResult.data || []).map(s => [s.id, s as Subject]));
        const teachersMap = new Map((teachersResult.data || []).map(t => [t.id, t as User]));
        const gradeLevelsMap = new Map((gradeLevelsResult.data || []).map(gl => [gl.id, gl]));
        
        const studentsByGradeMap = new Map<string, Student[]>();
        (studentsResult.data || []).forEach(student => {
            if (student.grade_level_id) {
                if (!studentsByGradeMap.has(student.grade_level_id)) {
                    studentsByGradeMap.set(student.grade_level_id, []);
                }
                studentsByGradeMap.get(student.grade_level_id)!.push({
                    id: student.id, name: student.name, gradeLevelId: student.grade_level_id
                });
            }
        });

        // Combine all data into the final Assignment objects.
        return courses.map(course => {
            const gradeLevelIds = Array.isArray(course.grade_level_ids) ? course.grade_level_ids : [];
            const gradeLevelsData = gradeLevelIds.map((id: string) => gradeLevelsMap.get(id)).filter(Boolean);
            const studentsData = gradeLevelIds
                .flatMap((gradeId: string) => studentsByGradeMap.get(gradeId) || [])
                .filter((student, index, self) => self.findIndex((s: any) => s.id === student.id) === index); // Ensure unique students
            
            const subjectData = course.subject_id ? subjectsMap.get(course.subject_id) : undefined;
            const teacherData = course.teacher_id ? teachersMap.get(course.teacher_id) : undefined;
            
            const defaultActivities = { name: 'Actividad 1', date: new Date().toISOString().split('T')[0] };
            const taskActivities = (course.task_activities && Object.keys(course.task_activities).length > 0)
                ? course.task_activities
                : { 1: [defaultActivities], 2: [defaultActivities], 3: [defaultActivities] };
            
            const workshopActivities = (course.workshop_activities && Object.keys(course.workshop_activities).length > 0)
                ? course.workshop_activities
                : { 1: [defaultActivities], 2: [defaultActivities], 3: [defaultActivities] };
            
            return {
                id: course.id,
                subjectId: course.subject_id,
                gradeLevelIds: gradeLevelIds,
                teacherId: course.teacher_id,
                taskActivities,
                workshopActivities,
                subject: subjectData,
                teacher: teacherData,
                gradeLevels: gradeLevelsData,
                students: studentsData,
            } as Assignment;
        });
    } catch (error) {
        console.error("Error fetching assignments:", error);
        return [];
    }
}


// --- AUTH & STATS ---

async function login(username: string, pass: string): Promise<User | null> {
    if (!isSupabaseConfigured() || !supabase) {
        // Demo mode login
        if (username === 'Admin' && pass === 'Admin123') return MOCK_USERS.find(u => u.role === UserRole.SUPER_ADMIN) || null;
        if (username === 'Colegio' && pass === 'ColAdmin') return MOCK_USERS.find(u => u.role === UserRole.ADMIN_COLEGIO) || null;
        if (username === 'Jhon' && pass === 'Profe123') return MOCK_USERS.find(u => u.username === 'Jhon') || null;
        return null;
    }

    // First, get the user's email from their username, as Supabase Auth uses email.
    const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

    if (profileError || !userProfile) {
        console.error('Login failed: could not find user profile for username:', username, profileError);
        return null;
    }

    // Now, attempt to sign in with Supabase Auth using the retrieved email and provided password.
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: pass,
    });

    if (authError) {
        console.error('Supabase auth error:', authError);
        return null;
    }

    // On successful authentication, the Supabase client will automatically manage the session.
    // RLS policies using `auth.uid()` will now work for subsequent requests.
    if (authData.user) {
        // Return the user profile data to the app, excluding the password.
        const { password, ...clientUser } = userProfile;
        return clientUser as User;
    }

    return null;
}

async function logout(): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
        return Promise.resolve();
    }
    
    // This function's only responsibility is to sign out from Supabase.
    // The UI component will handle resetting the application state.
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error signing out:', error);
        // We can re-throw or handle it as needed, but for now, logging is sufficient.
    }
}

async function getStats() {
    if (!isSupabaseConfigured() || !supabase) {
        return { students: MOCK_STUDENTS.length, teachers: MOCK_USERS.filter(u => u.role === 'DOCENTE').length, courses: MOCK_ASSIGNMENTS.length };
    }
    const [
        { count: students, error: sError },
        { count: teachers, error: tError },
        { count: courses, error: cError },
    ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', UserRole.DOCENTE),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
    ]);

    if (sError) console.error("Error getting student stats:", sError);
    if (tError) console.error("Error getting teacher stats:", tError);
    if (cError) console.error("Error getting course stats:", cError);
    
    return { students: students || 0, teachers: teachers || 0, courses: courses || 0 };
}


// --- TEACHER-SPECIFIC DATA ---

async function getTeacherAssignments(teacherId: string): Promise<GroupedAssignment[]> {
    const allAssignments = await _getAssignments(teacherId);
    const exploded = _explodeAssignments(allAssignments);

    const grouped: { [subjectId: string]: GroupedAssignment } = {};
    exploded.forEach(assignment => {
        if (!assignment.subject) return;
        if (!grouped[assignment.subject.id]) {
            grouped[assignment.subject.id] = {
                subject: assignment.subject,
                assignments: [],
            };
        }
        grouped[assignment.subject.id].assignments.push(assignment);
    });

    // Sort assignments within each group by grade level
    Object.values(grouped).forEach(group => {
        group.assignments.sort((a, b) => {
            const nameA = a.gradeLevel?.name || '';
            const nameB = b.gradeLevel?.name || '';
            return getGradeLevelSortValue(nameA) - getGradeLevelSortValue(nameB);
        });
    });

    return Object.values(grouped);
}

async function getDirectedGradeLevel(teacherId: string): Promise<GradeLevel | null> {
    if (!isSupabaseConfigured() || !supabase) {
        const directed = MOCK_GRADE_LEVELS.find(g => g.directorId === teacherId);
        return directed ? { ...directed, director: MOCK_USERS.find(u => u.id === teacherId) } : null;
    }

    const { data, error } = await supabase
        .from('grade_levels')
        .select(`*, director:users(*)`)
        .eq('director_id', teacherId)
        .maybeSingle();

    if (error) {
        console.error("Error getting directed grade level:", error);
        return null;
    }
    if (data) {
        return {
            id: data.id,
            name: data.name,
            isEnabled: data.is_enabled,
            directorId: data.director_id,
            director: data.director ? {
                id: data.director.id,
                name: data.director.name,
                email: data.director.email,
                role: data.director.role,
                username: data.director.username,
            } : null
        }
    }
    return null;
}

// --- GRADES ---

async function getAssignmentGrades(assignmentId: string, students: Student[], settings: AcademicSettings): Promise<StudentGradeRecord[]> {
    if (!isSupabaseConfigured() || !supabase) {
        const studentIds = students.map(s => s.id);
        const records = MOCK_GRADES.filter(g => g.course_id === assignmentId && studentIds.includes(g.student_id));
        return students.map(student => {
            const studentRecords = records.filter(r => r.student_id === student.id);
            const studentGradeRecord = createInitialStudentRecord(student.id, settings);

            studentRecords.forEach(record => {
                studentGradeRecord.periods[record.periodo] = {
                    tasks: Array.isArray(record.tasks) ? record.tasks : [],
                    workshops: Array.isArray(record.workshops) ? record.workshops : [],
                    attitude: record.attitude ?? null,
                    exam: record.exam ?? null,
                    convivenciaProblemas: record.convivencia_problemas ?? '',
                    llegadaTarde: record.llegada_tarde ?? false,
                    presentacionPersonal: record.presentacion_personal ?? 'Adecuada',
                    observaciones: record.observaciones ?? ''
                };
            });
            return studentGradeRecord;
        });
    }

    const { data: records, error } = await supabase
        .from('grades')
        .select('*')
        .eq('course_id', assignmentId);
    
    if (error) {
        console.error("Error fetching grades:", error);
        throw new Error("Could not fetch grades.");
    }

    return students.map(student => {
        const studentRecords = (records || []).filter(r => r.student_id === student.id);
        const studentGradeRecord = createInitialStudentRecord(student.id, settings);

        studentRecords.forEach(record => {
            studentGradeRecord.periods[record.periodo] = {
                tasks: (Array.isArray(record.tasks) ? record.tasks : []) as (number | null)[],
                workshops: (Array.isArray(record.workshops) ? record.workshops : []) as (number | null)[],
                attitude: record.attitude ?? null,
                exam: record.exam ?? null,
                convivenciaProblemas: record.convivencia_problemas ?? '',
                llegadaTarde: record.llegada_tarde ?? false,
                presentacionPersonal: record.presentacion_personal ?? 'Adecuada',
                observaciones: record.observaciones ?? ''
            };
        });
        return studentGradeRecord;
    });
}

async function saveGrades(assignmentId: string, grades: StudentGradeRecord[]) {
    if (!isSupabaseConfigured() || !supabase) {
        // Demo mode: update in-memory mock data
        grades.forEach(studentGrade => {
            Object.entries(studentGrade.periods).forEach(([period, periodData]) => {
                const existingIndex = MOCK_GRADES.findIndex(
                    g => g.course_id === assignmentId && g.student_id === studentGrade.studentId && g.periodo === Number(period)
                );
                const record = {
                    course_id: assignmentId,
                    student_id: studentGrade.studentId,
                    periodo: Number(period),
                    tasks: periodData.tasks,
                    workshops: periodData.workshops,
                    attitude: periodData.attitude,
                    exam: periodData.exam,
                    convivencia_problemas: periodData.convivenciaProblemas,
                    llegada_tarde: periodData.llegadaTarde,
                    presentacion_personal: periodData.presentacionPersonal,
                    observaciones: periodData.observaciones
                };
                if (existingIndex > -1) {
                    MOCK_GRADES[existingIndex] = record;
                } else {
                    MOCK_GRADES.push(record);
                }
            });
        });
        return;
    }

    const recordsToUpsert = grades.flatMap(studentGrade =>
        Object.entries(studentGrade.periods)
            .filter(([, periodData]) => periodData) // Ensure periodData is not null/undefined
            .map(([period, periodData]) => ({
                course_id: assignmentId,
                student_id: studentGrade.studentId,
                periodo: Number(period),
                tasks: periodData.tasks || [],
                workshops: periodData.workshops || [],
                attitude: periodData.attitude ?? null,
                exam: periodData.exam ?? null,
                convivencia_problemas: periodData.convivenciaProblemas || '',
                llegada_tarde: periodData.llegadaTarde === true, // Coerce to a strict boolean
                presentacion_personal: periodData.presentacionPersonal || 'Adecuada',
                observaciones: periodData.observaciones || '',
            }))
    );
    
    if (recordsToUpsert.length === 0) {
        return;
    }

    const { data, error } = await supabase.from('grades').upsert(recordsToUpsert, {
        onConflict: 'course_id, student_id, periodo',
    }).select();

    if (error) {
        console.error('Supabase save grades error:', error);
        // Provide more specific error messages for database issues.
        // A 42501 error code specifically indicates an RLS policy violation.
        if (error.code === '42501') {
            throw new Error('Permiso denegado por la política de seguridad (RLS) de la base de datos.');
        }
        throw new Error('Error al guardar las notas en la base de datos.');
    }

    if (!data || data.length < recordsToUpsert.length) {
        console.warn(
           'Supabase upsert might have partially failed. This could be due to RLS policies. Records sent:', 
           recordsToUpsert.length, 
           'Records returned:', 
           data?.length || 0
       );
   }
}

async function saveAssignmentActivities(assignmentId: string, taskActivities: { [p: number]: Activity[] }, workshopActivities: { [p: number]: Activity[] }) {
    if (!isSupabaseConfigured() || !supabase) {
        const assignment = MOCK_ASSIGNMENTS.find(a => a.id === assignmentId);
        if (assignment) {
            assignment.taskActivities = taskActivities;
            assignment.workshopActivities = workshopActivities;
        }
        return;
    }

    const { error } = await supabase
        .from('courses')
        .update({ task_activities: taskActivities, workshop_activities: workshopActivities })
        .eq('id', assignmentId);
    
    if (error) {
        console.error('Supabase save activities error:', error);
        throw new Error('Failed to save activities.');
    }
}


// --- ASSIGNMENTS (CRUD) ---

async function getAssignments(): Promise<Assignment[]> {
    return _getAssignments();
}

async function addAssignment(assignment: Pick<Assignment, 'subjectId' | 'gradeLevelIds' | 'teacherId'>) {
    if (!isSupabaseConfigured() || !supabase) {
        const newId = `crs-${Math.random()}`;
        const newAssignment: Assignment = {
            id: newId,
            ...assignment,
            students: [], // Simplified for mock
            taskActivities: {},
            workshopActivities: {}
        };
        MOCK_ASSIGNMENTS.push(newAssignment);
        return;
    }
    
    const { error } = await supabase
        .from('courses')
        .insert({
            subject_id: assignment.subjectId,
            grade_level_ids: assignment.gradeLevelIds,
            teacher_id: assignment.teacherId
        });

    if (error) {
        console.error("Error adding assignment:", error);
        throw new Error("Could not add assignment.");
    }
}

async function updateAssignment(id: string, assignment: Partial<Assignment>) {
    if (!isSupabaseConfigured() || !supabase) {
        const index = MOCK_ASSIGNMENTS.findIndex(a => a.id === id);
        if (index > -1) {
            MOCK_ASSIGNMENTS[index] = { ...MOCK_ASSIGNMENTS[index], ...assignment };
        }
        return;
    }
    const { error } = await supabase
        .from('courses')
        .update({
            subject_id: assignment.subjectId,
            grade_level_ids: assignment.gradeLevelIds,
            teacher_id: assignment.teacherId,
        })
        .eq('id', id);

    if (error) {
        console.error("Error updating assignment:", error);
        throw new Error("Could not update assignment.");
    }
}

async function deleteAssignment(id: string) {
    if (!isSupabaseConfigured() || !supabase) {
        MOCK_ASSIGNMENTS = MOCK_ASSIGNMENTS.filter(a => a.id !== id);
        return;
    }
    
    // First, delete related grades to avoid FK constraint violation
    const { error: gradeError } = await supabase
        .from('grades')
        .delete()
        .eq('course_id', id);

    if (gradeError) {
        console.error("Error deleting related grades:", gradeError);
        throw new Error("Could not delete related grades for assignment.");
    }

    const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Error deleting assignment:", error);
        throw new Error("Could not delete assignment.");
    }
}


// --- USERS (CRUD) ---

async function getManageableUsers(): Promise<User[]> {
    if (!isSupabaseConfigured() || !supabase) return MOCK_USERS.filter(u => u.role !== UserRole.SUPER_ADMIN);
    
    const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, username')
        .neq('role', UserRole.SUPER_ADMIN);

    if (error) {
        console.error("Error fetching users:", error);
        return [];
    }
    return data || [];
}

async function getUsersByRole(role: UserRole): Promise<User[]> {
    if (!isSupabaseConfigured() || !supabase) return MOCK_USERS.filter(u => u.role === role);

    const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, username')
        .eq('role', role);

    if (error) {
        console.error(`Error fetching ${role}s:`, error);
        return [];
    }
    return data || [];
}

async function addUser(user: Omit<User, 'id'>) {
    if (!isSupabaseConfigured() || !supabase) {
        MOCK_USERS.push({ id: `usr-${Math.random()}`, ...user });
        return;
    }

    if (!user.email || !user.password) {
        throw new Error("Email y contraseña son requeridos para crear un usuario.");
    }

    // Guardamos la sesión del admin actual para restaurarla después de crear el nuevo usuario.
    const { data: { session: adminSession } } = await supabase.auth.getSession();

    // Usamos signUp para crear el usuario en auth.users. Esto cambiará la sesión activa.
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
    });
    
    // Después del signUp, la sesión activa es la del nuevo usuario.
    // Restauramos la sesión del admin inmediatamente.
    if (adminSession) {
        const { error: sessionError } = await supabase.auth.setSession({ 
            access_token: adminSession.access_token, 
            refresh_token: adminSession.refresh_token 
        });
        if (sessionError) {
            console.error("Error crítico: no se pudo restaurar la sesión del admin después de crear un usuario. El admin puede necesitar volver a iniciar sesión.", sessionError);
        }
    }

    if (authError) {
        console.error("Supabase signUp error:", authError);
        throw new Error(authError.message);
    }

    if (!authData.user) {
        throw new Error("No se pudo crear el usuario en el sistema de autenticación. Verifique si la confirmación por email está habilitada en su proyecto de Supabase.");
    }
    
    // Con la sesión del admin restaurada, insertamos el perfil.
    const profileData = {
        id: authData.user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        // ADVERTENCIA DE SEGURIDAD: Se almacena la contraseña para cumplir con la restricción
        // NOT NULL de la base de datos. Esto es una mala práctica. La tabla 'users' no debería
        // tener una columna de contraseña; la autenticación debe ser manejada exclusivamente
        // por el servicio de autenticación de Supabase.
        password: user.password,
    };

    const { error: profileError } = await supabase.from('users').insert(profileData);

    if (profileError) {
        console.error("Supabase profile insert error:", profileError);
        // Intentar eliminar el usuario de auth si la inserción del perfil falla.
        // Esto requiere privilegios de admin, por lo que no es posible desde el cliente.
        throw new Error(`El usuario de autenticación se creó, pero falló la inserción del perfil: ${profileError.message}`);
    }
}

async function updateUser(id: string, user: Partial<User>) {
    if (!isSupabaseConfigured() || !supabase) {
        const index = MOCK_USERS.findIndex(u => u.id === id);
        if (index > -1) {
            MOCK_USERS[index] = { ...MOCK_USERS[index], ...user };
        }
        return;
    }
    
    // Separamos la contraseña de los datos del perfil
    const { password, ...profileData } = user;

    // Actualizamos los datos del perfil en la tabla 'users'
    if (Object.keys(profileData).length > 1) { // Check if there's more than just the ID
        const { error: profileError } = await supabase
            .from('users')
            .update(profileData)
            .eq('id', id);

        if (profileError) {
            console.error("Supabase profile update error:", profileError);
            throw new Error(profileError.message);
        }
    }
    
    // La actualización de contraseñas de OTROS usuarios requiere privilegios de admin
    // y debe hacerse desde un servidor seguro para no exponer claves de servicio.
    // Desde el cliente, solo el usuario actualmente logueado puede cambiar SU PROPIA contraseña.
    // Como esto es un panel de admin, no implementaremos el cambio de contraseña aquí.
    if (password) {
        console.warn("La actualización de contraseña para otros usuarios no está soportada desde el cliente por seguridad.");
    }
}

async function deleteUser(id: string) {
    if (!isSupabaseConfigured() || !supabase) {
        MOCK_USERS = MOCK_USERS.filter(u => u.id !== id);
        return;
    }
    // Deleting from public.users should cascade delete the auth.users via a trigger/db function.
    // If not, this needs to be an admin call from a serverless function.
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw new Error(error.message);
}


// --- SUBJECTS (CRUD) ---

async function getSubjects(): Promise<Subject[]> {
    if (!isSupabaseConfigured() || !supabase) return MOCK_SUBJECTS;
    
    const { data, error } = await supabase.from('subjects').select('*');
    if (error) {
        console.error("Error fetching subjects:", error);
        return [];
    }
    return data;
}

async function addSubject(subject: Pick<Subject, 'name'>) {
    if (!isSupabaseConfigured() || !supabase) {
        MOCK_SUBJECTS.push({ id: `sub-${Math.random()}`, ...subject });
        return;
    }
    const { error } = await supabase.from('subjects').insert(subject);
    if (error) throw new Error(error.message);
}

async function updateSubject(id: string, subject: Partial<Subject>) {
    if (!isSupabaseConfigured() || !supabase) {
        const index = MOCK_SUBJECTS.findIndex(s => s.id === id);
        if (index > -1) {
            MOCK_SUBJECTS[index] = { ...MOCK_SUBJECTS[index], ...subject };
        }
        return;
    }
    const { error } = await supabase.from('subjects').update(subject).eq('id', id);
    if (error) throw new Error(error.message);
}

async function deleteSubject(id: string) {
    if (!isSupabaseConfigured() || !supabase) {
        MOCK_SUBJECTS = MOCK_SUBJECTS.filter(s => s.id !== id);
        return;
    }
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) throw new Error(error.message);
}


// --- GRADE LEVELS (CRUD) ---

async function getGradeLevels(): Promise<GradeLevel[]> {
    let gradeLevelsData: GradeLevel[];

    if (!isSupabaseConfigured() || !supabase) {
        gradeLevelsData = MOCK_GRADE_LEVELS.map(gl => ({
            ...gl,
            director: MOCK_USERS.find(u => u.id === gl.directorId)
        }));
    } else {
        const { data, error } = await supabase
            .from('grade_levels')
            .select(`
                id,
                name,
                is_enabled,
                director_id,
                director:users ( id, name )
            `);

        if (error) {
            console.error("Error fetching grade levels:", error);
            return [];
        }
        gradeLevelsData = (data || []).map(item => ({
            id: item.id,
            name: item.name,
            isEnabled: item.is_enabled,
            directorId: item.director_id,
            director: item.director ? { 
                id: item.director.id,
                name: item.director.name || '',
                role: UserRole.DOCENTE, 
                username: item.director.username || '', 
                email: item.director.email || '' 
            } : null,
        }));
    }
    
    gradeLevelsData.sort((a, b) => getGradeLevelSortValue(a.name) - getGradeLevelSortValue(b.name));

    return gradeLevelsData;
}


async function addGradeLevel(gradeLevel: Pick<GradeLevel, 'name'>) {
    if (!isSupabaseConfigured() || !supabase) {
        MOCK_GRADE_LEVELS.push({ id: `gl-${Math.random()}`, name: gradeLevel.name, isEnabled: true });
        return;
    }
    const { error } = await supabase.from('grade_levels').insert({ name: gradeLevel.name, is_enabled: true });
    if (error) throw new Error(error.message);
}

async function updateGradeLevel(id: string, gradeLevel: Partial<GradeLevel>) {
    if (!isSupabaseConfigured() || !supabase) {
        const index = MOCK_GRADE_LEVELS.findIndex(gl => gl.id === id);
        if (index > -1) {
            MOCK_GRADE_LEVELS[index] = { ...MOCK_GRADE_LEVELS[index], ...gradeLevel };
        }
        return;
    }

    const updateData: { [key: string]: any } = {};
    if ('name' in gradeLevel) updateData.name = gradeLevel.name;
    if ('isEnabled' in gradeLevel) updateData.is_enabled = gradeLevel.isEnabled;
    if ('directorId' in gradeLevel) updateData.director_id = gradeLevel.directorId;

    const { error } = await supabase
        .from('grade_levels')
        .update(updateData)
        .eq('id', id);

    if (error) throw new Error(error.message);
}

async function deleteGradeLevel(id: string) {
    if (!isSupabaseConfigured() || !supabase) {
        if (MOCK_ASSIGNMENTS.some(a => a.gradeLevelIds.includes(id))) {
            throw new Error("Cannot delete grade with active assignments.");
        }
        MOCK_GRADE_LEVELS = MOCK_GRADE_LEVELS.filter(gl => gl.id !== id);
        return;
    }

    const { error } = await supabase.from('grade_levels').delete().eq('id', id);
    if (error) {
        if (error.code === '23503') { // Foreign key violation
            throw new Error("No se puede eliminar. El grado está en uso por una o más asignaciones.");
        }
        throw new Error(error.message);
    }
}


// --- STUDENTS (CRUD) ---

async function getStudents(): Promise<Student[]> {
    if (!isSupabaseConfigured() || !supabase) return MOCK_STUDENTS.map(s => ({
        ...s,
        gradeLevel: MOCK_GRADE_LEVELS.find(gl => gl.id === s.gradeLevelId)
    }));

    const { data, error } = await supabase
        .from('students')
        .select(`*, gradeLevel:grade_levels (id, name)`);

    if (error) {
        console.error("Error fetching students:", error);
        return [];
    }
    return (data || []).map(s => ({
        id: s.id,
        name: s.name,
        gradeLevelId: s.grade_level_id,
        gradeLevel: s.gradeLevel,
    }));
}

async function getStudentsByGrade(gradeLevelId: string): Promise<Student[]> {
    if (!isSupabaseConfigured() || !supabase) {
        return MOCK_STUDENTS.filter(s => s.gradeLevelId === gradeLevelId);
    }
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('grade_level_id', gradeLevelId);
    
    if (error) {
        console.error("Error fetching students by grade:", error);
        return [];
    }
    return data || [];
}

async function addStudent(student: { name: string; gradeLevelId: string | null; }) {
    if (!isSupabaseConfigured() || !supabase) {
        MOCK_STUDENTS.push({ id: `stu-${Math.random()}`, ...student });
        return;
    }
    const { error } = await supabase
        .from('students')
        .insert({ name: student.name, grade_level_id: student.gradeLevelId });
    if (error) throw new Error(error.message);
}

async function bulkAddStudents(students: { name: string; grade_level_id: string | null }[]) {
    if (!isSupabaseConfigured() || !supabase) {
      students.forEach(s => MOCK_STUDENTS.push({ id: `stu-${Math.random()}`, name: s.name, gradeLevelId: s.grade_level_id }));
      return;
    }

    const { error } = await supabase.from('students').insert(students);
    if (error) throw new Error(error.message);
}

async function updateStudent(id: string, student: Partial<Student>) {
    if (!isSupabaseConfigured() || !supabase) {
        const index = MOCK_STUDENTS.findIndex(s => s.id === id);
        if (index > -1) {
            MOCK_STUDENTS[index] = { ...MOCK_STUDENTS[index], ...student };
        }
        return;
    }
    const { error } = await supabase
        .from('students')
        .update({ name: student.name, grade_level_id: student.gradeLevelId })
        .eq('id', id);
    if (error) throw new Error(error.message);
}

async function deleteStudent(id: string) {
    if (!isSupabaseConfigured() || !supabase) {
        MOCK_STUDENTS = MOCK_STUDENTS.filter(s => s.id !== id);
        return;
    }

    // Must delete related grades first.
    const { error: gradeError } = await supabase.from('grades').delete().eq('student_id', id);
    if (gradeError) {
        console.error('Error deleting student grades:', gradeError);
        throw new Error('Could not delete grades associated with the student.');
    }

    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) {
        console.error('Error deleting student:', error);
        throw new Error('Could not delete the student.');
    }
}

async function deleteAllStudents() {
    if (!isSupabaseConfigured() || !supabase) {
        MOCK_STUDENTS = [];
        MOCK_GRADES = [];
        return;
    }
    const { error: gradeError } = await supabase.from('grades').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (gradeError) throw new Error(`Could not delete grades: ${gradeError.message}`);
    const { error: studentError } = await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (studentError) throw new Error(`Could not delete students: ${studentError.message}`);
}

async function deleteStudentsByGrade(gradeLevelId: string) {
     if (!isSupabaseConfigured() || !supabase) {
        const studentIdsToDelete = MOCK_STUDENTS
            .filter(s => s.gradeLevelId === gradeLevelId)
            .map(s => s.id);
        
        MOCK_GRADES = MOCK_GRADES.filter(g => !studentIdsToDelete.includes(g.student_id));
        MOCK_STUDENTS = MOCK_STUDENTS.filter(s => s.gradeLevelId !== gradeLevelId);
        return;
    }
    
    // First, get student IDs to delete
    const { data: students, error: studentSelectError } = await supabase
        .from('students')
        .select('id')
        .eq('grade_level_id', gradeLevelId);

    if (studentSelectError) throw new Error(`Could not retrieve students for deletion: ${studentSelectError.message}`);
    
    const studentIds = students.map(s => s.id);
    if (studentIds.length === 0) return;

    // Delete grades for those students
    const { error: gradeError } = await supabase.from('grades').delete().in('student_id', studentIds);
    if (gradeError) throw new Error(`Could not delete grades for the grade level: ${gradeError.message}`);

    // Delete the students themselves
    const { error: studentError } = await supabase.from('students').delete().in('id', studentIds);
    if (studentError) throw new Error(`Could not delete students for the grade level: ${studentError.message}`);
}


// --- REPORTS ---

async function getSubjectsByGrade(gradeLevelId: string): Promise<Subject[]> {
    if (!isSupabaseConfigured() || !supabase) {
        const relevantAssignments = MOCK_ASSIGNMENTS.filter(a => a.gradeLevelIds.includes(gradeLevelId));
        const subjectIds = new Set(relevantAssignments.map(a => a.subjectId));
        const subjects = MOCK_SUBJECTS.filter(s => subjectIds.has(s.id));
        return subjects.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('subject_id')
        .contains('grade_level_ids', [gradeLevelId]);

    if (coursesError) {
        console.error("Error fetching courses for grade:", coursesError);
        return [];
    }

    if (!courses || courses.length === 0) {
        return [];
    }
    
    const subjectIds = [...new Set(courses.map(c => c.subject_id).filter(Boolean))];
    
    if (subjectIds.length === 0) {
        return [];
    }
    
    const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name')
        .in('id', subjectIds);

    if (subjectsError) {
        console.error("Error fetching subjects by IDs:", subjectsError);
        return [];
    }
    
    return (subjects || []).sort((a, b) => a.name.localeCompare(b.name));
}

async function getStudentConsolidatedReportData(studentId: string, gradeLevelId: string, settings: AcademicSettings) {
    const assignments = (await _getAssignments()).filter(a => a.gradeLevelIds.includes(gradeLevelId));
    const assignmentIds = assignments.map(a => a.id);

    let studentGrades: any[] = [];
    if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase
            .from('grades')
            .select('*')
            .eq('student_id', studentId)
            .in('course_id', assignmentIds);
        
        if (error) {
            console.error("Error fetching consolidated report grades:", error);
            throw new Error("Could not fetch report data.");
        }
        studentGrades = data || [];
    } else {
        studentGrades = MOCK_GRADES.filter(g => g.student_id === studentId && assignmentIds.includes(g.course_id));
    }
    
    return assignments.map(assignment => {
        const taskActivities = assignment.taskActivities;
        const workshopActivities = assignment.workshopActivities;

        const periodGrades: { [p: number]: { final: number; obs: string } } = {};
        let weightedFinal = 0;

        Array.from({ length: settings.periodCount }, (_, i) => i + 1).forEach(p => {
            const gradeRecord = studentGrades.find(g => g.course_id === assignment.id && g.periodo === p);
            if (gradeRecord) {
                const tasks = Array.isArray(gradeRecord.tasks) ? gradeRecord.tasks : [];
                const workshops = Array.isArray(gradeRecord.workshops) ? gradeRecord.workshops : [];
                const taskActivitiesForPeriod = taskActivities[p] || [];
                const workshopActivitiesForPeriod = workshopActivities[p] || [];

                const taskAvg = tasks.reduce((a: number, b: number) => a + (b || 0), 0) / Math.max(taskActivitiesForPeriod.length, 1);
                const workshopAvg = workshops.reduce((a: number, b: number) => a + (b || 0), 0) / Math.max(workshopActivitiesForPeriod.length, 1);
                const pTasks = taskAvg * 0.20;
                const pWorkshops = workshopAvg * 0.20;
                const pAttitude = (gradeRecord.attitude || 0) * 0.20;
                const pExam = (gradeRecord.exam || 0) * 0.40;
                const final = pTasks + pWorkshops + pAttitude + pExam;

                periodGrades[p] = { final, obs: gradeRecord.observaciones || '' };

                const weight = (settings.periodWeights[p] || 0) / 100;
                weightedFinal += final * weight;
            } else {
                periodGrades[p] = { final: 0, obs: '' };
            }
        });

        return {
            subject: assignment.subject,
            periodGrades,
            weightedFinal,
        };
    });
}

async function submitReportsToDirector(submissions: TeacherReportSubmission[]) {
    if (!isSupabaseConfigured() || !supabase) {
        console.log("Demo mode: Submitting reports", submissions);
        return;
    }
    
    if (submissions.length === 0) return;

    // --- Performance Optimization: Batch database operations ---
    
    // 1. Get all unique student IDs and the period from the submissions
    const studentIds = [...new Set(submissions.map(s => s.studentId))];
    const period = submissions[0].period;

    // 2. Fetch all existing reports for these students and period in a single query
    const { data: existingReports, error: fetchError } = await supabase
        .from('consolidated_reports')
        .select('id, student_id, submitted_reports')
        .in('student_id', studentIds)
        .eq('period', period);
        
    if (fetchError) throw fetchError;

    // Create a map for easy lookup of existing reports
    const existingReportsMap = new Map(existingReports?.map(r => [r.student_id, r]));

    // 3. Group incoming submissions by student in memory
    const groupedSubmissions = submissions.reduce((acc, sub) => {
        if (!acc[sub.studentId]) {
            acc[sub.studentId] = {
                student_id: sub.studentId,
                grade_level_id: sub.gradeLevelId,
                period: sub.period,
                submitted_reports: {} as { [subjectId: string]: DirectorReportSubmission }
            };
        }
        acc[sub.studentId].submitted_reports[sub.subjectId] = sub.reportData;
        return acc;
    }, {} as { [studentId: string]: any });
    
    // 4. Prepare the final array of data to be upserted
    const recordsToUpsert = Object.values(groupedSubmissions).map(group => {
// FIX: Explicitly type `existing` as `any` to prevent TypeScript from inferring it as `unknown`, which was causing property access errors.
        const existing: any = existingReportsMap.get(group.student_id);
        const mergedReports = { ...(existing?.submitted_reports || {}), ...group.submitted_reports };
        
        return {
            ...group,
            id: existing?.id,
            submitted_reports: mergedReports,
        };
    });

    // 5. Perform a single batch upsert operation
    const { error: upsertError } = await supabase
        .from('consolidated_reports')
        .upsert(recordsToUpsert, { onConflict: 'student_id, period' });

    if (upsertError) throw upsertError;
}


async function getConsolidatedReportForStudent(studentId: string, period: number): Promise<ConsolidatedReport | null> {
    if (!isSupabaseConfigured() || !supabase) {
        return MOCK_CONSOLIDATED_REPORTS.find(r => r.studentId === studentId && r.period === period) || null;
    }
    const { data, error } = await supabase
        .from('consolidated_reports')
        .select('*')
        .eq('student_id', studentId)
        .eq('period', period)
        .maybeSingle();

    if (error) {
        console.error("Error fetching consolidated report:", error);
        return null;
    }

    if (!data) return null;

    return {
        id: data.id,
        studentId: data.student_id,
        gradeLevelId: data.grade_level_id,
        period: data.period,
        submittedReports: data.submitted_reports || {},
        directorGeneralObservation: data.director_general_observation || '',
        updatedAt: data.updated_at,
    };
}

async function saveConsolidatedReport(report: ConsolidatedReport) {
    if (!isSupabaseConfigured() || !supabase) {
        const index = MOCK_CONSOLIDATED_REPORTS.findIndex(r => r.id === report.id || (r.studentId === report.studentId && r.period === report.period));
        if (index > -1) {
            MOCK_CONSOLIDATED_REPORTS[index] = report;
        } else {
            MOCK_CONSOLIDATED_REPORTS.push({ ...report, id: `cr-${Math.random()}` });
        }
        return;
    }

    const reportData = {
        id: report.id,
        student_id: report.studentId,
        grade_level_id: report.gradeLevelId,
        period: report.period,
        submitted_reports: report.submittedReports,
        director_general_observation: report.directorGeneralObservation,
    };

    const { error } = await supabase
        .from('consolidated_reports')
        .upsert(reportData, { onConflict: 'student_id, period' });
    if (error) throw error;
}

// --- USER PROFILE ---
async function updateUserGender(userId: string, gender: 'male' | 'female') {
    if (!isSupabaseConfigured() || !supabase) {
        const user = MOCK_USERS.find(u => u.id === userId);
        if (user) {
            user.gender = gender;
        }
        return;
    }

    const { error } = await supabase
        .from('users')
        .update({ gender })
        .eq('id', userId);

    if (error) {
        console.error("Error updating user gender:", error);
        if (error.code === 'PGRST204') {
            throw new Error("La columna 'gender' no existe en la base de datos. Por favor, ejecuta el script SQL de migración (ver INSTRUCCIONES_GENDER.md).");
        }
        throw new Error("No se pudo actualizar el género.");
    }
}

async function updateUserPassword(userId: string, currentPassword: string, newPassword: string) {
    if (!isSupabaseConfigured() || !supabase) {
        const user = MOCK_USERS.find(u => u.id === userId);
        if (user && user.password === currentPassword) {
            user.password = newPassword;
            return;
        }
        throw new Error("Contraseña actual incorrecta");
    }

    // Verify current password by attempting to sign in
    const { data: userData } = await supabase.from('users').select('email').eq('id', userId).single();
    if (!userData) throw new Error("Usuario no encontrado");

    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: currentPassword,
    });

    if (signInError) {
        throw new Error("Contraseña actual incorrecta");
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });

    if (error) {
        console.error("Error updating password:", error);
        throw new Error("No se pudo actualizar la contraseña.");
    }
}

// --- ACADEMIC SETTINGS ---
async function getAcademicSettings(): Promise<{ settings: AcademicSettings, isDefault: boolean }> {
    if (!isSupabaseConfigured() || !supabase) {
        return { settings: DEFAULT_ACADEMIC_SETTINGS, isDefault: true };
    }
    const { data, error } = await supabase.from('settings').select('*').limit(1).single();
    if (error || !data) {
        if (error && error.code !== 'PGRST116') console.error("Error fetching settings:", error);
        return { settings: DEFAULT_ACADEMIC_SETTINGS, isDefault: true };
    }
    return {
        settings: {
            periodCount: data.period_count,
            periodWeights: data.period_weights,
        },
        isDefault: false
    };
}

async function saveAcademicSettings(settings: AcademicSettings) {
    if (!isSupabaseConfigured() || !supabase) {
        console.log("Demo mode: saving settings", settings);
        return;
    }
    
    // Check if a record exists
    const { data, error: selectError } = await supabase.from('settings').select('id').limit(1);

    if (selectError) throw selectError;

    const upsertData = {
        id: data?.[0]?.id || 1, // Use a fixed ID like 1 for the single settings row
        period_count: settings.periodCount,
        period_weights: settings.periodWeights
    };

    const { error } = await supabase.from('settings').upsert(upsertData);
    if (error) throw error;
}


export const db = {
    login,
    logout,
    getStats,
    getTeacherAssignments,
    getDirectedGradeLevel,
    getAssignmentGrades,
    saveGrades,
    saveAssignmentActivities,
    getAssignments,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    getManageableUsers,
    getUsersByRole,
    addUser,
    updateUser,
    deleteUser,
    updateUserGender,
    updateUserPassword,
    getSubjects,
    addSubject,
    updateSubject,
    deleteSubject,
    getGradeLevels,
    addGradeLevel,
    updateGradeLevel,
    deleteGradeLevel,
    getStudents,
    getStudentsByGrade,
    addStudent,
    bulkAddStudents,
    updateStudent,
    deleteStudent,
    deleteAllStudents,
    deleteStudentsByGrade,
    getSubjectsByGrade,
    getStudentConsolidatedReportData,
    submitReportsToDirector,
    getConsolidatedReportForStudent,
    saveConsolidatedReport,
    getAcademicSettings,
    saveAcademicSettings,
};
