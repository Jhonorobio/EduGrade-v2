# Rutas de la Aplicación

## Rutas Públicas
- `/login` - Página de inicio de sesión

## Rutas Protegidas (requieren autenticación)

### Rutas Comunes (todos los usuarios autenticados)
- `/dashboard` - Panel principal (vista personalizada según rol)
- `/profile` - Perfil del usuario

### Rutas de Docentes
- `/dashboard` - Mis asignaciones
- `/group-director` - Dirección de grupo (solo si es director)
- `/gradebook/:assignmentId` - Libro de calificaciones de una asignación
- `/report/:assignmentId` - Informe académico de una asignación

### Rutas de Administradores (ADMIN_COLEGIO y SUPER_ADMIN)
- `/dashboard` - Resumen del colegio con estadísticas
- `/users` - Gestión de usuarios
- `/assignments` - Gestión de asignaciones
- `/subjects` - Gestión de materias
- `/grade-levels` - Gestión de grados
- `/students` - Gestión de alumnos
- `/settings` - Ajustes académicos

## Redirecciones
- `/` → `/dashboard`
- Rutas no encontradas → `/dashboard`
- Si no está autenticado → `/login`
- Si está autenticado y va a `/login` → `/dashboard`

## Navegación
La navegación se realiza mediante:
- Sidebar con enlaces a las rutas principales
- Menú desplegable del usuario para perfil y ajustes
- Botones dentro de las páginas (ej: seleccionar asignación)
- Botones de navegador (atrás/adelante) funcionan correctamente
