import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  UserCircle,
  ChevronUp,
} from 'lucide-react';
import { User, UserRole, GradeLevel } from '../types';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { getAvatarForUser } from '../lib/avatars';

interface NavItemConfig {
  icon: React.ElementType;
  text: string;
  path: string;
  disabled?: boolean;
}

interface AppLayoutProps {
  currentUser: User;
  onLogout: () => void;
  directedGrade: GradeLevel | null;
  children: React.ReactNode;
  currentTitle: string;
}

const navItemsByRole: Record<UserRole, NavItemConfig[]> = {
  [UserRole.DOCENTE]: [
    { icon: LayoutGrid, text: 'Panel', path: '/dashboard' },
    { icon: BookUser, text: 'Dir. de Grupo', path: '/group-director' },
  ],
  [UserRole.ADMIN_COLEGIO]: [
    { icon: LayoutGrid, text: 'Panel', path: '/dashboard' },
    { icon: Users2, text: 'Usuarios', path: '/users' },
    { icon: ClipboardCheck, text: 'Asignaciones', path: '/assignments' },
    { icon: BookText, text: 'Materias', path: '/subjects' },
    { icon: GraduationCap, text: 'Grados', path: '/grade-levels' },
    { icon: BarChart3, text: 'Alumnos', path: '/students' },
    { icon: Settings, text: 'Ajustes', path: '/settings' },
  ],
  [UserRole.SUPER_ADMIN]: [
    { icon: LayoutGrid, text: 'Panel', path: '/dashboard' },
    { icon: Users2, text: 'Usuarios', path: '/users' },
    { icon: ClipboardCheck, text: 'Asignaciones', path: '/assignments' },
    { icon: BookText, text: 'Materias', path: '/subjects' },
    { icon: GraduationCap, text: 'Grados', path: '/grade-levels' },
    { icon: BarChart3, text: 'Alumnos', path: '/students' },
    { icon: Settings, text: 'Ajustes', path: '/settings' },
  ],
};

export function AppLayout({
  currentUser,
  onLogout,
  directedGrade,
  children,
  currentTitle,
}: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const currentNavItems = navItemsByRole[currentUser.role];
  const userAvatar = getAvatarForUser(currentUser.role, currentUser.gender);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex h-full flex-col bg-slate-50 transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-48' : 'w-[52px]'
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex h-16 items-center transition-all duration-300 ease-in-out",
          sidebarOpen ? "px-4" : "px-1.5 justify-center"
        )}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className={cn(
              "flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
              sidebarOpen ? "opacity-100 w-auto" : "opacity-0 w-0"
            )}>
              <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">EduGrade</span>
              <span className="text-xs text-gray-500 whitespace-nowrap">Plataforma educativa</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {sidebarOpen && (
            <p className="mb-2 px-3 text-xs font-semibold text-gray-500">
              Navegación
            </p>
          )}
          {currentNavItems.map((item) => {
            const isDisabled = item.path === '/group-director' && !directedGrade;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                onClick={() => !isDisabled && navigate(item.path)}
                disabled={isDisabled}
                title={!sidebarOpen ? item.text : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md py-2 text-sm font-medium transition-all duration-300 ease-in-out',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200',
                  isDisabled && 'cursor-not-allowed opacity-50',
                  sidebarOpen ? 'px-3' : 'pl-0.5 pr-1 justify-center'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap",
                  sidebarOpen ? "opacity-100 w-auto" : "opacity-0 w-0"
                )}>
                  {item.text}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex w-full items-center gap-3 rounded-md py-2 text-sm font-medium text-gray-700 transition-all duration-300 ease-in-out',
                  sidebarOpen && 'hover:bg-gray-200 px-3',
                  !sidebarOpen && 'justify-center pl-0.5 pr-1'
                )}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md text-lg ${userAvatar?.background || 'bg-gray-300'}`}>
                  {userAvatar?.imageUrl ? (
                    <img src={userAvatar.imageUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    currentUser.name?.[0].toUpperCase()
                  )}
                </div>
                <div className={cn(
                  "flex min-w-0 flex-1 flex-col text-left overflow-hidden transition-all duration-300 ease-in-out",
                  sidebarOpen ? "opacity-100 w-auto" : "opacity-0 w-0"
                )}>
                  <span className="truncate font-medium text-gray-900 whitespace-nowrap">{currentUser.name}</span>
                  <span className="truncate text-xs text-gray-500 capitalize whitespace-nowrap">{currentUser.role.replace('_', ' ')}</span>
                </div>
                <ChevronUp className={cn(
                  "h-4 w-4 shrink-0 transition-all duration-300 ease-in-out",
                  sidebarOpen ? "opacity-100" : "opacity-0 w-0"
                )} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md ${userAvatar.background}`}>
                    <img src={userAvatar.imageUrl} alt="Avatar" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-col space-y-0.5 min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{currentUser.name}</p>
                    <p className="text-xs text-gray-500 capitalize truncate">{currentUser.role.replace('_', ' ')}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Mi Perfil</span>
              </DropdownMenuItem>
              {(currentUser.role === UserRole.ADMIN_COLEGIO || currentUser.role === UserRole.SUPER_ADMIN) && (
                <>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Ajustes Académicos</span>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content - Página contenedor con scroll */}
      <div className="flex flex-1 flex-col overflow-y-auto bg-slate-50">
        {/* Contenedor principal amarillo */}
        <div className={cn(
          "flex flex-col min-h-full pr-1 pt-1 pb-4 md:pr-2 md:pt-1.5 md:pb-6 transition-all duration-300",
          sidebarOpen ? "pl-0.5 md:pl-1" : "pl-0"
        )}>
          <div className="bg-white rounded-xl border shadow-sm flex flex-col">
            {/* Header dentro del contenedor */}
            <header className="flex h-12 shrink-0 items-center justify-between px-6 border-b">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="h-6 w-6"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
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
                <div className="h-6 w-px bg-gray-300"></div>
                <h2 className="text-base font-semibold">{currentTitle}</h2>
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

            {/* Content - Contenidos verdes */}
            <main className="flex-1 p-6 flex flex-col">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
