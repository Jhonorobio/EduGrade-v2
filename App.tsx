import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { User, UserRole, Assignment, GradeLevel, GroupedAssignment, AcademicSettings as AcademicSettingsType } from './types';
import { db } from './services/db';
import { isSupabaseConfigured } from './services/supabase';
import { useToast } from './components/Toast';
import RootLayout from './app/layout';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/card';

// Lazy load components
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const GradeBookPage = lazy(() => import('./pages/GradeBookPage').then(module => ({ default: module.GradeBookPage })));
const ReportPage = lazy(() => import('./pages/ReportPage').then(module => ({ default: module.ReportPage })));
const UserManagement = lazy(() => import('./components/UserManagement').then(module => ({ default: module.UserManagement })));
const AssignmentManagement = lazy(() => import('./components/AssignmentManagement').then(module => ({ default: module.AssignmentManagement })));
const SubjectManagement = lazy(() => import('./components/SubjectManagement').then(module => ({ default: module.SubjectManagement })));
const GradeLevelManagement = lazy(() => import('./components/GradeLevelManagement').then(module => ({ default: module.GradeLevelManagement })));
const StudentManagement = lazy(() => import('./components/StudentManagement').then(module => ({ default: module.StudentManagement })));
const GroupDirectorPage = lazy(() => import('./pages/GroupDirectorPage').then(module => ({ default: module.GroupDirectorPage })));
const AcademicSettings = lazy(() => import('./components/AcademicSettings'));
const LoginPage = lazy(() => import('./app/login/page'));
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
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

const AppLoader: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center p-8">
    <Loader2 className="animate-spin text-neutral-600" size={48} />
  </div>
);

const PAGE_TITLES: { [key: string]: string } = {
  '/dashboard': 'Panel Principal',
  '/gradebook': 'Libro de Calificaciones',
  '/report': 'Informes Académicos',
  '/users': 'Gestión de Usuarios',
  '/assignments': 'Gestión de Asignaciones',
  '/subjects': 'Gestión de Materias',
  '/grade-levels': 'Gestión de Grados',
  '/students': 'Gestión de Alumnos',
  '/group-director': 'Dirección de Grupo',
  '/settings': 'Ajustes Académicos',
  '/profile': 'Mi Perfil',
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [groupedAssignments, setGroupedAssignments] = useState<GroupedAssignment[]>([]);
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
        navigate('/dashboard');
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
    navigate('/login');
    addToast('Sesión cerrada exitosamente.');
  };

  const loadDashboardData = useCallback(async () => {
    if (!currentUser || !academicSettings) return;
    try {
      setLoading(true);
      if (currentUser.role === UserRole.DOCENTE) {
        const [myAssignments, myDirectedGrade] = await Promise.all([
          db.getTeacherAssignments(currentUser.id),
          db.getDirectedGradeLevel(currentUser.id),
        ]);
        setGroupedAssignments(myAssignments);
        setDirectedGrade(myDirectedGrade);
      } else if (currentUser.role === UserRole.ADMIN_COLEGIO || currentUser.role === UserRole.SUPER_ADMIN) {
        const adminStats = await db.getStats();
        setStats(adminStats);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      addToast('No se pudieron cargar los datos del panel.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser, addToast, academicSettings]);

  useEffect(() => {
    if (location.pathname === '/dashboard' && currentUser) {
      loadDashboardData();
    }
  }, [location.pathname, currentUser, loadDashboardData]);

  const selectAssignment = (assignment: Assignment) => {
    navigate(`/gradebook/${assignment.id}`);
  };

  const getCurrentTitle = () => {
    const path = location.pathname.split('/')[1];
    return PAGE_TITLES[`/${path}`] || 'EduGrade';
  };

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

  return (
    <RootLayout>
      <Routes>
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to="/dashboard" replace />
            ) : (
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
            )
          }
        />

        <Route
          path="/*"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <AppLayout
                currentUser={currentUser!}
                onLogout={handleLogout}
                directedGrade={directedGrade}
                currentTitle={getCurrentTitle()}
              >
                <ErrorBoundary>
                  <Suspense fallback={<AppLoader />}>
                    <Routes>
                      <Route
                        path="/dashboard"
                        element={
                          <Dashboard
                            currentUser={currentUser!}
                            groupedAssignments={groupedAssignments}
                            stats={stats}
                            loading={loading}
                            onSelectAssignment={selectAssignment}
                          />
                        }
                      />

                      <Route
                        path="/gradebook/:assignmentId"
                        element={academicSettings ? <GradeBookPage key={location.pathname} academicSettings={academicSettings} /> : <AppLoader />}
                      />

                      <Route
                        path="/report/:assignmentId"
                        element={academicSettings ? <ReportPage academicSettings={academicSettings} /> : <AppLoader />}
                      />

                      <Route
                        path="/users"
                        element={
                          <ProtectedRoute currentUser={currentUser} allowedRoles={[UserRole.ADMIN_COLEGIO, UserRole.SUPER_ADMIN]}>
                            <UserManagement />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/assignments"
                        element={
                          <ProtectedRoute currentUser={currentUser} allowedRoles={[UserRole.ADMIN_COLEGIO, UserRole.SUPER_ADMIN]}>
                            <AssignmentManagement />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/subjects"
                        element={
                          <ProtectedRoute currentUser={currentUser} allowedRoles={[UserRole.ADMIN_COLEGIO, UserRole.SUPER_ADMIN]}>
                            <SubjectManagement />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/grade-levels"
                        element={
                          <ProtectedRoute currentUser={currentUser} allowedRoles={[UserRole.ADMIN_COLEGIO, UserRole.SUPER_ADMIN]}>
                            <GradeLevelManagement />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/students"
                        element={
                          <ProtectedRoute currentUser={currentUser} allowedRoles={[UserRole.ADMIN_COLEGIO, UserRole.SUPER_ADMIN]}>
                            <StudentManagement />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/group-director"
                        element={
                          academicSettings ? (
                            <GroupDirectorPage directedGrade={directedGrade} academicSettings={academicSettings} />
                          ) : (
                            <AppLoader />
                          )
                        }
                      />

                      <Route
                        path="/settings"
                        element={
                          <ProtectedRoute currentUser={currentUser} allowedRoles={[UserRole.ADMIN_COLEGIO, UserRole.SUPER_ADMIN]}>
                            <AcademicSettings />
                          </ProtectedRoute>
                        }
                      />

                      <Route path="/profile" element={<Profile currentUser={currentUser!} onUpdateUser={setCurrentUser} />} />

                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </RootLayout>
  );
}

export default App;
