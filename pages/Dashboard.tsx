import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { User, UserRole, GroupedAssignment, Assignment } from '../types';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface DashboardProps {
  currentUser: User;
  groupedAssignments: GroupedAssignment[];
  stats: { students: number; teachers: number; courses: number };
  loading: boolean;
  onSelectAssignment: (assignment: Assignment) => void;
}

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

export function Dashboard({ currentUser, groupedAssignments, stats, loading, onSelectAssignment }: DashboardProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-neutral-600" size={48} />
      </div>
    );
  }

  if (currentUser.role === UserRole.DOCENTE) {
    return (
      <div className="flex-1 overflow-auto">
        <h2 className="text-2xl font-bold mb-6">Mis Asignaciones</h2>
        {groupedAssignments.length === 0 ? (
          <p className="text-neutral-500">No tienes asignaciones académicas configuradas.</p>
        ) : (
          <div className="space-y-6">
            {groupedAssignments.map((group) => (
              <Card key={group.subject.id}>
                <CardHeader>
                  <CardTitle>{group.subject.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {group.assignments.map((assignment) => (
                      <button
                        key={assignment.id}
                        onClick={() => onSelectAssignment(assignment)}
                        className="p-4 border rounded-lg hover:bg-neutral-50 text-left transition-colors"
                      >
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

  if (currentUser.role === UserRole.ADMIN_COLEGIO || currentUser.role === UserRole.SUPER_ADMIN) {
    return (
      <div className="flex-1 overflow-auto">
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
    );
  }

  return null;
}
