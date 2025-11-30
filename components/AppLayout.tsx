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
  ChevronDown,
} from 'lucide-react';
import { User, UserRole, GradeLevel } from '../types';
import { Input } from './ui/input';
import { Button } from './ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

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
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <GraduationCap className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">EduGrade</span>
                      <span className="truncate text-xs">Pro</span>
                    </div>
                    <ChevronDown className="ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
                  <DropdownMenuItem>
                    <span>Acerca de</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Ayuda</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navegación</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {currentNavItems.map((item) => {
                  const isDisabled = item.view === 'GROUP_DIRECTOR_VIEW' && !directedGrade;
                  return (
                    <SidebarMenuItem key={item.view}>
                      <SidebarMenuButton
                        onClick={() => !isDisabled && setViewMode(item.view)}
                        isActive={viewMode === item.view}
                        disabled={isDisabled}
                        tooltip={item.text}
                      >
                        <item.icon />
                        <span>{item.text}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-sidebar-accent font-semibold">
                      {currentUser.name?.[0].toUpperCase()}
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{currentUser.name}</span>
                      <span className="truncate text-xs">{currentUser.role}</span>
                    </div>
                    <ChevronDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56" side="bottom" align="end" sideOffset={4}>
                  <DropdownMenuItem>
                    <span>Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Configuración</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onLogout}>
                    <LogOut />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex flex-1 items-center justify-between">
            <h2 className="text-xl font-semibold">{currentTitle}</h2>
            <div className="flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar..." className="w-64 pl-9" />
              </div>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
