import React, { useState, useEffect, useCallback, Suspense, lazy, memo } from 'react';
import { 
  LayoutGrid,
  Users2, 
  BookText, 
  LogOut, 
  GraduationCap,
  Settings,
  Loader2,
  AlertCircle,
  ClipboardCheck,
  BarChart3,
  BookUser,
  ArrowLeft,
  Bell,
  HelpCircle,
  Search,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { User, UserRole, Assignment, StudentGradeRecord, Activity, GradeLevel, GroupedAssignment, AcademicSettings as AcademicSettingsType } from './types';
import { db } from './services/db';
import { isSupabaseConfigured } from './services/supabase';
import { useToast } from './components/Toast';
import RootLayout from './app/layout';

// Shadcn UI components
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/card';
import { Input } from './components/ui/input';
import { Field, FieldGroup, FieldLabel } from './components/ui/field';


// Lazy load components for code splitting
const GradeBook = lazy(() => import('./components/GradeBook').then(module => ({ default: module.GradeBook })));
const AcademicReport = lazy(() => import('./components/AcademicReport').then(module => ({ default: module.AcademicReport })));
const UserManagement = lazy(() => import('./components/UserManagement').then(module => ({ default: module.UserManagement })));
const AssignmentManagement = lazy(() => import('./components/AssignmentManagement').then(module => ({ default: module.AssignmentManagement })));
const SubjectManagement = lazy(() => import('./components/SubjectManagement').then(module => ({ default: module.SubjectManagement })));
const GradeLevelManagement = lazy(() => import('./components/GradeLevelManagement').then(module => ({ default: module.GradeLevelManagement })));
const StudentManagement = lazy(() => import('./components/StudentManagement').then(module => ({ default: module.StudentManagement })));
const GroupDirectorDashboard = lazy(() => import('./components/GroupDirectorDashboard'));
const AcademicSettings = lazy(() => import('./components/AcademicSettings'));
const LoginPage = lazy(() => import('./app/login/page'));


type ViewMode = 
  | 'LOGIN' 
  | 'DASHBOARD' 
  | 'GRADEBOOK' 
  | 'REPORT' 
  | 'USER_MANAGEMENT' 
  | 'ASSIGNMENT_MANAGEMENT'
  | 'SUBJECT_MANAGEMENT'
  | 'GRADE_LEVEL_MANAGEMENT'
  | 'STUDENT_MANAGEMENT'
  | 'GROUP_DIRECTOR_VIEW'
  | 'ACADEMIC_SETTINGS';

// FIX: Added NavItemConfig interface to ensure 'disabled' property is optionally available on all nav items, resolving a TypeScript error.
interface NavItemConfig {
  icon: React.ElementType;
  text: string;
  view: ViewMode;
  disabled?: boolean;
}

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // FIX: Initialized state using a class property to ensure it's always available on the component instance. This resolves errors where `this.state` or `this.props` were accessed before being defined.
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-red-50 rounded-lg">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-lg font-medium text-red-800">Ocurrió un error inesperado</h3>
          <p className="mt-1 text-sm text-red-700">
            Algo salió mal al cargar esta sección. Por favor, intenta recargar la página o volver al panel principal.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

const NavItem = memo<{
  icon: React.ElementType, 
  text: string, 
  onClick: () => void, 
  active?: boolean, 
  disabled?: boolean
}>(({ icon: Icon, text, onClick, active, disabled }) => (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Icon size={20} className="flex-shrink-0" />
      <span className="whitespace-nowrap truncate">{text}</span>
    </button>
));
NavItem.displayName = 'NavItem';

const AppLoader: React.FC = () => (
    <div className="w-full h-full flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-neutral-600" size={48} />
    </div>
);

const StatCard: React.FC<{ 
    title: string; 
    value: string; 
    change: string; 
    changeType: 'positive' | 'negative';
    description: string;
}> = ({ title, value, change, changeType, description }) => {
    const changeColor = changeType === 'positive' ? 'text-emerald-600' : 'text-red-600';
    return (
        <div className="bg-white p-5 rounded-lg shadow-sm border">
            <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-neutral-500">{title}</p>
                <div className={`flex items-center text-xs font-semibold ${changeColor}`}>
                    {change}
                    {changeType === 'positive' ? <ArrowUp size={12} className="ml-0.5" /> : <ArrowDown size={12} className="ml-0.5" />}
                </div>
            </div>
            <p className="text-3xl font-bold text-neutral-800 mt-1">{value}</p>
            <p className="text-xs text-neutral-500 mt-2">{description}</p>
        </div>
    );
};


const VIEW_TITLES: { [key in ViewMode]?: string } = {
    DASHBOARD: 'Panel Principal',
    GRADEBOOK: 'Libro de Calificaciones',
    REPORT: 'Informes Académicos',
    USER_MANAGEMENT: 'Gestión de Usuarios',
    ASSIGNMENT_MANAGEMENT: 'Gestión de Asignaciones',
    SUBJECT_MANAGEMENT: 'Gestión de Materias',
    GRADE_LEVEL_MANAGEMENT: 'Gestión de Grados',
    STUDENT_MANAGEMENT: 'Gestión de Alumnos',
    GROUP_DIRECTOR_VIEW: 'Dirección de Grupo',
    ACADEMIC_SETTINGS: 'Ajustes Académicos',
};

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('LOGIN');
  
  const [groupedAssignments, setGroupedAssignments] = useState<GroupedAssignment[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<GroupedAssignment | null>(null);
  const [gradeData, setGradeData] = useState<StudentGradeRecord[]>([]);
  const [gradeDataCache, setGradeDataCache] = useState<Map<string, StudentGradeRecord[]>>(new Map());
  const [directedGrade, setDirectedGrade] = useState<GradeLevel | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ students: 0, teachers: 0, courses: 0 });
  const [academicSettings, setAcademicSettings] = useState<AcademicSettingsType | null>(null);
  const { addToast } = useToast();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await db.login(username, password);
      if (user) {
        const { settings, isDefault } = await db.getAcademicSettings();
        setAcademicSettings(settings);
        setCurrentUser(user);
        setViewMode('DASHBOARD');
        addToast('Bienvenido/a de nuevo!', 'success');
        if (isDefault && (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN_COLEGIO)) {
            addToast('Ajustes académicos por defecto. Guarde su configuración personalizada.', 'info');
        }
      } else {
        addToast('Usuario o contraseña incorrectos.', 'error');
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error. Inténtelo de nuevo.';
      addToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await db.logout();
    setCurrentUser(null);
    setUsername('');
    setPassword('');
    setViewMode('LOGIN');
    setGradeDataCache(new Map()); // Clear cache on logout
    addToast('Sesión cerrada exitosamente.');
  };
  
  const loadDashboardData = useCallback(async () => {
    if (!currentUser || !academicSettings) return;
    try {
      setLoading(true);
      if (currentUser.role === UserRole.DOCENTE) {
        const [myAssignments, myDirectedGrade] = await Promise.all([
          db.getTeacherAssignments(currentUser.id),
          db.getDirectedGradeLevel(currentUser.id)
        ]);
        setGroupedAssignments(myAssignments);
        setDirectedGrade(myDirectedGrade);
        if (myAssignments.length > 0) {
          setSelectedSubject(myAssignments[0]);
        }
      } else if (currentUser.role === UserRole.ADMIN_COLEGIO || currentUser.role === UserRole.SUPER_ADMIN) {
        const adminStats = await db.getStats();
        setStats(adminStats);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      addToast("No se pudieron cargar los datos del panel.", 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser, addToast, academicSettings]);

  useEffect(() => {
    if (viewMode === 'DASHBOARD') {
      loadDashboardData();
    }
  }, [viewMode, loadDashboardData]);

  const selectAssignment = async (assignment: Assignment) => {
    if (!academicSettings) {
      addToast("Academic settings not loaded.", "error");
      return;
    }
    setSelectedAssignment(assignment);
    setLoading(true);
    setViewMode('GRADEBOOK');
    try {
      if (gradeDataCache.has(assignment.id)) {
        setGradeData(gradeDataCache.get(assignment.id)!);
      } else {
        const grades = await db.getAssignmentGrades(assignment.originalId || assignment.id, assignment.students, academicSettings);
        setGradeData(grades);
        setGradeDataCache(prev => new Map(prev).set(assignment.id, grades));
      }
    } catch (error) {
      console.error(error);
      addToast('Error al cargar las calificaciones.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGradebook = async (
    updatedGrades: StudentGradeRecord[],
    updatedTaskActivities: { [p: number]: Activity[] },
    updatedWorkshopActivities: { [p: number]: Activity[] }
  ) => {
    if (!selectedAssignment) return;
    const assignmentId = selectedAssignment.originalId || selectedAssignment.id;

    try {
      await Promise.all([
        db.saveGrades(assignmentId, updatedGrades),
        db.saveAssignmentActivities(assignmentId, updatedTaskActivities, updatedWorkshopActivities),
      ]);
      setGradeData(updatedGrades); // Update local state
      
      // Update cache
      setGradeDataCache(prev => new Map(prev).set(selectedAssignment.id, updatedGrades));
      
      // Update assignment object in state
      const updatedAssignment = {
        ...selectedAssignment,
        taskActivities: updatedTaskActivities,
        workshopActivities: updatedWorkshopActivities
      };
      setSelectedAssignment(updatedAssignment);

    } catch (error) {
      console.error("Failed to save gradebook changes:", error);
      throw error;
    }
  };

  const renderDashboard = () => {
    if (loading) return <AppLoader />;
    
    if (currentUser?.role === UserRole.DOCENTE) {
      return (
        <div className="flex-1 overflow-auto p-6">
          <h2 className="text-2xl font-bold mb-6">Mis Asignaciones</h2>
          {groupedAssignments.length === 0 ? (
            <p className="text-neutral-500">No tienes asignaciones académicas configuradas.</p>
          ) : (
            <div className="space-y-6">
              {groupedAssignments.map(group => (
                <Card key={group.subject.id}>
                  <CardHeader>
                    <CardTitle>{group.subject.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {group.assignments.map(assignment => (
                        <button key={assignment.id} onClick={() => selectAssignment(assignment)} className="p-4 border rounded-lg hover:bg-neutral-50 text-left transition-colors">
                          <p className="font-bold">{assignment.gradeLevel?.name}</p>
                          <p className="text-sm text-neutral-500">{assignment.students.length} alumnos</p>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (currentUser?.role === UserRole.ADMIN_COLEGIO || currentUser?.role === UserRole.SUPER_ADMIN) {
        return (
            <div className="flex-1 overflow-auto p-6">
                 <h2 className="text-2xl font-bold mb-6">Resumen del Colegio</h2>
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <StatCard 
                        title="Total Alumnos"
                        value={stats.students.toString()}
                        change="+5.2%"
                        changeType="positive"
                        description="desde el mes pasado"
                    />
                     <StatCard 
                        title="Total Docentes"
                        value={stats.teachers.toString()}
                        change="+1.1%"
                        changeType="positive"
                        description="desde el mes pasado"
                    />
                     <StatCard 
                        title="Total Asignaturas"
                        value={stats.courses.toString()}
                        change="-0.5%"
                        changeType="negative"
                        description="desde el mes pasado"
                    />
                </div>
            </div>
        )
    }

    return null;
  };

  const renderView = () => {
    switch(viewMode) {
      case 'DASHBOARD': return renderDashboard();
      case 'GRADEBOOK': 
        return selectedAssignment && academicSettings ? (
          <Suspense fallback={<AppLoader />}>
            <GradeBook 
              key={selectedAssignment.id}
              assignmentId={selectedAssignment.id}
              students={selectedAssignment.students}
              data={gradeData}
              taskActivities={selectedAssignment.taskActivities}
              workshopActivities={selectedAssignment.workshopActivities}
              onSave={handleSaveGradebook}
              onViewReport={() => setViewMode('REPORT')}
              academicSettings={academicSettings}
            />
          </Suspense>
        ) : <p>Seleccione una asignación.</p>;
      case 'REPORT':
         return selectedAssignment && academicSettings ? (
          <Suspense fallback={<AppLoader />}>
            <AcademicReport 
              students={selectedAssignment.students}
              data={gradeData}
              taskActivities={selectedAssignment.taskActivities}
              workshopActivities={selectedAssignment.workshopActivities}
              onSave={handleSaveGradebook}
              onBackToGradeBook={() => setViewMode('GRADEBOOK')}
              assignment={selectedAssignment}
              academicSettings={academicSettings}
            />
          </Suspense>
        ) : <p>Seleccione una asignación.</p>;
      case 'USER_MANAGEMENT': 
        return <Suspense fallback={<AppLoader />}><UserManagement /></Suspense>;
      case 'ASSIGNMENT_MANAGEMENT':
        return <Suspense fallback={<AppLoader />}><AssignmentManagement /></Suspense>;
      case 'SUBJECT_MANAGEMENT':
        return <Suspense fallback={<AppLoader />}><SubjectManagement /></Suspense>;
      case 'GRADE_LEVEL_MANAGEMENT':
        return <Suspense fallback={<AppLoader />}><GradeLevelManagement /></Suspense>;
      case 'STUDENT_MANAGEMENT':
        return <Suspense fallback={<AppLoader />}><StudentManagement /></Suspense>;
      case 'GROUP_DIRECTOR_VIEW':
        return directedGrade && academicSettings ? <Suspense fallback={<AppLoader />}><GroupDirectorDashboard gradeLevel={directedGrade} academicSettings={academicSettings} /></Suspense> : <p>No eres director de ningún grupo.</p>;
      case 'ACADEMIC_SETTINGS':
        return <Suspense fallback={<AppLoader />}><AcademicSettings /></Suspense>;
      default:
        return <p>Vista no encontrada.</p>;
    }
  };
  
  if (!currentUser && isSupabaseConfigured()) {
    return (
      <RootLayout>
        <Suspense fallback={<AppLoader />}>
          <LoginPage
            username={username}
            setUsername={setUsername}
            password={password}
            setPassword={setPassword}
            handleLogin={handleLogin}
            loading={loading}
          />
        </Suspense>
      </RootLayout>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <RootLayout>
        <div className="flex items-center justify-center min-h-screen bg-neutral-50">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle className="text-destructive">Configuración Requerida</CardTitle>
              <CardDescription>La conexión a la base de datos no ha sido configurada.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600">
                Por favor, edita el archivo <code className="bg-neutral-100 p-1 rounded text-xs">services/supabase.ts</code> y añade tus credenciales de Supabase para continuar.
              </p>
            </CardContent>
          </Card>
        </div>
      </RootLayout>
    );
  }

  const handleBackToDashboard = () => {
      setViewMode('DASHBOARD');
      setSelectedAssignment(null);
      setSelectedSubject(null);
  };

  const navItemsByRole: Record<UserRole, NavItemConfig[]> = {
    [UserRole.DOCENTE]: [
      { icon: LayoutGrid, text: 'Panel', view: 'DASHBOARD' },
      { icon: BookUser, text: 'Dir. de Grupo', view: 'GROUP_DIRECTOR_VIEW', disabled: !directedGrade },
    ],
    [UserRole.ADMIN_COLEGIO]: [
      { icon: LayoutGrid, text: 'Panel', view: 'DASHBOARD' },
      { icon: Users2, text: 'Usuarios', view: 'USER_MANAGEMENT' },
      { icon: ClipboardCheck, text: 'Asignaciones', view: 'ASSIGNMENT_MANAGEMENT' },
      { icon: BookText, text: 'Materias', view: 'SUBJECT_MANAGEMENT' },
      { icon: GraduationCap, text: 'Grados', view: 'GRADE_LEVEL_MANAGEMENT' },
      { icon: BarChart3, text: 'Alumnos', view: 'STUDENT_MANAGEMENT' },
      { icon: Settings, text: 'Ajustes', view: 'ACADEMIC_SETTINGS' },
    ],
    [UserRole.SUPER_ADMIN]: [
      { icon: LayoutGrid, text: 'Panel', view: 'DASHBOARD' },
      { icon: Users2, text: 'Usuarios', view: 'USER_MANAGEMENT' },
      { icon: ClipboardCheck, text: 'Asignaciones', view: 'ASSIGNMENT_MANAGEMENT' },
      { icon: BookText, text: 'Materias', view: 'SUBJECT_MANAGEMENT' },
      { icon: GraduationCap, text: 'Grados', view: 'GRADE_LEVEL_MANAGEMENT' },
      { icon: BarChart3, text: 'Alumnos', view: 'STUDENT_MANAGEMENT' },
      { icon: Settings, text: 'Ajustes', view: 'ACADEMIC_SETTINGS' },
    ]
  };
  
  const currentNavItems = currentUser ? navItemsByRole[currentUser.role] : [];
  const currentTitle = VIEW_TITLES[viewMode] || 'EduGrade';
  const showBackButton = viewMode !== 'DASHBOARD';

  return (
    <RootLayout>
      <div className="flex h-screen bg-neutral-100">
        {/* Sidebar */}
        <aside className="w-64 bg-sidebar border-r flex flex-col shrink-0">
          <div className="h-16 border-b flex items-center px-4">
            <h1 className="text-xl font-bold text-neutral-800">EduGrade</h1>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {currentNavItems.map(item => (
              <NavItem 
                key={item.view}
                icon={item.icon}
                text={item.text}
                onClick={() => setViewMode(item.view)}
                active={viewMode === item.view}
                disabled={item.disabled}
              />
            ))}
          </nav>
          <div className="p-4 border-t">
            <NavItem icon={LogOut} text="Cerrar Sesión" onClick={handleLogout} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
           <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
               {showBackButton && (
                <button onClick={handleBackToDashboard} className="p-2 -ml-2 rounded-full hover:bg-neutral-100">
                  <ArrowLeft size={20} className="text-neutral-600" />
                </button>
              )}
              <h2 className="text-xl font-semibold text-neutral-800">{currentTitle}</h2>
            </div>

            <div className="flex items-center gap-4">
               <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <Input placeholder="Buscar..." className="pl-9 w-64" />
              </div>
              <button className="p-2 rounded-full hover:bg-neutral-100"><HelpCircle size={20} className="text-neutral-600" /></button>
              <button className="p-2 rounded-full hover:bg-neutral-100"><Bell size={20} className="text-neutral-600" /></button>
              <div className="w-9 h-9 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-neutral-600">
                {currentUser?.name?.[0].toUpperCase()}
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
             <ErrorBoundary>
               {renderView()}
             </ErrorBoundary>
          </div>
        </main>
      </div>
    </RootLayout>
  );
}

export default App;