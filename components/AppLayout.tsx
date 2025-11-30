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
} from 'lucide-react';
import { User, UserRole, GradeLevel } from '../types';
import { Input } from './ui/input';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from './ui/sidebar';

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
  const currentNavItems = navItemsByRole[currentUser.role];

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold">EduGrade</span>
                <span className="text-xs text-muted-foreground">Pro</span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navegación</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {currentNavItems.map((item) => {
                    const isDisabled =
                      item.view === 'GROUP_DIRECTOR_VIEW' && !directedGrade;
                    return (
                      <SidebarMenuItem key={item.view}>
                        <SidebarMenuButton
                          onClick={() => !isDisabled && setViewMode(item.view)}
                          isActive={viewMode === item.view}
                          disabled={isDisabled}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.text}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t p-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onLogout}>
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <div className="mt-4 flex items-center gap-3 px-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-semibold">
                {currentUser.name?.[0].toUpperCase()}
              </div>
              <div className="flex flex-col text-sm">
                <span className="font-medium">{currentUser.name}</span>
                <span className="text-xs text-muted-foreground">
                  {currentUser.role}
                </span>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h2 className="text-xl font-semibold">{currentTitle}</h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar..." className="w-64 pl-9" />
              </div>
              <button className="rounded-full p-2 hover:bg-accent">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
              </button>
              <button className="rounded-full p-2 hover:bg-accent">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
