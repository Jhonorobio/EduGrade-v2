import React from 'react';
import {
  LayoutGrid,
  Users2,
  BookText,
  LogOut,
  GraduationCap,
  Settings,
  ClipboardCheck,
  BarChart3,
  BookUser,
  Bell,
  HelpCircle,
  Search,
  Menu,
} from 'lucide-react';
import { User, UserRole, GradeLevel } from '../types';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

type ViewMode =
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

interface NavItemConfig {
  icon: React.ElementType;
  text: string;
  view: ViewMode;
  disabled?: boolean;
}

interface AppLayoutProps {
  currentUser: User;
  viewMode: ViewMode;
  setViewMode: (view: ViewMode) => void;
  onLogout: () => void;
  directedGrade: GradeLevel | null;
  children: React.ReactNode;
  currentTitle: string;
}

const navItemsByRole: Record<UserRole, NavItemConfig[]> = {
  [UserRole.DOCENTE]: [
    { icon: LayoutGrid, text: 'Panel', view: 'DASHBOARD' },
    { icon: BookUser, text: 'Dir. de Grupo', view: 'GROUP_DIRECTOR_VIEW' },
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
  ],
};

export function AppLayout({
  currentUser,
  viewMode,
  setViewMode,
  onLogout,
  directedGrade,
  children,
  currentTitle,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const currentNavItems = navItemsByRole[currentUser.role];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-center border-b px-4">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <GraduationCap className="h-6 w-6" />
              </div>
              <span className="text-lg font-semibold text-sidebar-foreground">EduGrade</span>
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-6 w-6" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {sidebarOpen && (
            <p className="mb-2 px-3 text-xs font-semibold text-sidebar-foreground/70">
              Navegación
            </p>
          )}
          {currentNavItems.map((item) => {
            const isDisabled = item.view === 'GROUP_DIRECTOR_VIEW' && !directedGrade;
            const isActive = viewMode === item.view;
            return (
              <button
                key={item.view}
                onClick={() => !isDisabled && setViewMode(item.view)}
                disabled={isDisabled}
                title={!sidebarOpen ? item.text : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  isDisabled && 'cursor-not-allowed opacity-50',
                  !sidebarOpen && 'justify-center'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{item.text}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <button
            onClick={onLogout}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              !sidebarOpen && 'justify-center'
            )}
            title={!sidebarOpen ? 'Cerrar Sesión' : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>Cerrar Sesión</span>}
          </button>
          {sidebarOpen && (
            <div className="mt-4 flex items-center gap-3 px-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent font-semibold text-sidebar-accent-foreground">
                {currentUser.name?.[0].toUpperCase()}
              </div>
              <div className="flex min-w-0 flex-col text-sm">
                <span className="truncate font-medium text-sidebar-foreground">{currentUser.name}</span>
                <span className="truncate text-xs text-sidebar-foreground/70">{currentUser.role}</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-9 w-9"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </Button>
            <h2 className="text-xl font-semibold">{currentTitle}</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar..." className="w-64 pl-9" />
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <HelpCircle className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
