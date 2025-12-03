import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { User, UserRole, Assignment, Subject, GradeLevel } from '../types';
import { Edit, Trash2, Loader2, PlusCircle, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { useToast } from './Toast';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
interface AssignmentManagementProps {}

const AssignmentFormModal: React.FC<{
  assignment: Assignment | null;
  open: boolean;
  subjects: Subject[];
  gradeLevels: GradeLevel[];
  teachers: User[];
  onSave: (assignment: Partial<Assignment>) => void;
  onCancel: () => void;
}> = ({ assignment, open, subjects, gradeLevels, teachers, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    subjectId: assignment?.subjectId || '',
    gradeLevelIds: assignment?.gradeLevelIds || [] as string[],
    teacherId: assignment?.teacherId || '',
  });
  const { addToast } = useToast();

  useEffect(() => {
    setFormData({
      subjectId: assignment?.subjectId || '',
      gradeLevelIds: assignment?.gradeLevelIds || [] as string[],
      teacherId: assignment?.teacherId || '',
    });
  }, [assignment]);

  const handleGradeLevelChange = (gradeId: string, checked: boolean) => {
    setFormData(prev => {
        const newIds = checked
            ? [...prev.gradeLevelIds, gradeId]
            : prev.gradeLevelIds.filter(id => id !== gradeId);
        return { ...prev, gradeLevelIds: newIds };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subjectId || !formData.teacherId || formData.gradeLevelIds.length === 0) {
        addToast("Por favor seleccione materia, profesor y al menos un grado.", "error");
        return;
    }
    onSave({ ...assignment, ...formData });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{assignment ? 'Editar Asignación' : 'Nueva Asignación'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Materia</Label>
              <Select
                value={formData.subjectId}
                onValueChange={(value) => setFormData({ ...formData, subjectId: value })}
              >
                <SelectTrigger id="subject" className="w-full">
                  <SelectValue placeholder="Seleccione una materia..." />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grados Asignados</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto border p-3 rounded-md bg-slate-50">
                {gradeLevels.map(g => (
                  <div key={g.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`grade-${g.id}`}
                      checked={formData.gradeLevelIds.includes(g.id)}
                      onCheckedChange={(checked) => handleGradeLevelChange(g.id, checked as boolean)}
                    />
                    <Label htmlFor={`grade-${g.id}`} className="text-sm font-normal cursor-pointer">
                      {g.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher">Profesor Asignado</Label>
              <Select
                value={formData.teacherId}
                onValueChange={(value) => setFormData({ ...formData, teacherId: value })}
              >
                <SelectTrigger id="teacher" className="w-full">
                  <SelectValue placeholder="Seleccione un profesor..." />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const AssignmentManagement: React.FC<AssignmentManagementProps> = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);
  
  type SortableKeys = 'subject' | 'teacher';
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'subject', direction: 'ascending' });

  const sortedAssignments = useMemo(() => {
    let sortableItems = [...assignments];
    sortableItems.sort((a, b) => {
        let aValue: string, bValue: string;
        if (sortConfig.key === 'subject') {
            aValue = a.subject?.name?.toLowerCase() || '';
            bValue = b.subject?.name?.toLowerCase() || '';
        } else { // 'teacher'
            aValue = a.teacher?.name?.toLowerCase() || '';
            bValue = b.teacher?.name?.toLowerCase() || '';
        }

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
    });
    return sortableItems;
  }, [assignments, sortConfig]);

  const requestSort = (key: SortableKeys) => {
      let direction: 'ascending' | 'descending' = 'ascending';
      if (sortConfig.key === key && sortConfig.direction === 'ascending') {
          direction = 'descending';
      }
      setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortableKeys) => {
      if (sortConfig.key !== key) return <ChevronsUpDown size={14} className="ml-2 text-slate-400" />;
      if (sortConfig.direction === 'ascending') return <ArrowUp size={14} className="ml-2" />;
      return <ArrowDown size={14} className="ml-2" />;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
        const [subjectsData, assignmentsData, teachersData, gradeLevelsData] = await Promise.all([
          db.getSubjects(),
          db.getAssignments(),
          db.getUsersByRole(UserRole.DOCENTE),
          db.getGradeLevels(),
        ]);
        setSubjects(subjectsData);
        setAssignments(assignmentsData);
        setTeachers(teachersData);
        setGradeLevels(gradeLevelsData);
    } catch (error) {
        addToast('Error al cargar datos de asignaciones.', 'error');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveAssignment = async (assignment: Partial<Assignment>) => {
    try {
      if (assignment.id) {
        await db.updateAssignment(assignment.id, assignment);
        addToast('Asignación actualizada con éxito.', 'success');
      } else {
        await db.addAssignment(assignment as Pick<Assignment, 'subjectId' | 'gradeLevelIds' | 'teacherId'>);
        addToast('Asignación creada con éxito.', 'success');
      }
      setIsModalOpen(false);
      setEditingAssignment(null);
      fetchData();
    } catch(error) {
       addToast('Error al guardar la asignación.', 'error');
    }
  };

  const handleDeleteAssignment = (assignmentId: string) => {
    setAssignmentToDelete(assignmentId);
  };

  const confirmDeleteAssignment = async () => {
    if (assignmentToDelete) {
      try {
        await db.deleteAssignment(assignmentToDelete);
        addToast('Asignación eliminada con éxito.', 'success');
        fetchData();
      } catch(error) {
         addToast('Error al eliminar la asignación.', 'error');
      } finally {
        setAssignmentToDelete(null);
      }
    }
  };

  const renderAssignmentsTable = () => (
    <div>
      <Table>
        <TableHeader className="bg-slate-100">
          <TableRow>
            <TableHead>
              <Button 
                variant="ghost" 
                onClick={() => requestSort('subject')} 
                className="flex items-center gap-1 h-auto p-0 hover:bg-transparent font-bold"
              >
                Asignación (Materia y Grados) {getSortIcon('subject')}
              </Button>
            </TableHead>
            <TableHead className="hidden sm:table-cell">
              <Button 
                variant="ghost" 
                onClick={() => requestSort('teacher')} 
                className="flex items-center gap-1 h-auto p-0 hover:bg-transparent font-bold"
              >
                Profesor {getSortIcon('teacher')}
              </Button>
            </TableHead>
            <TableHead className="text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAssignments.map(a => (
            <TableRow key={a.id}>
              <TableCell>
                <div className="font-medium">{a.subject?.name || 'N/A'}</div>
                <div className="text-xs text-muted-foreground">{a.gradeLevels?.map(gl => gl.name).join(', ') || 'N/A'}</div>
                <div className="sm:hidden text-xs text-muted-foreground mt-1">{a.teacher?.name || 'No asignado'}</div>
              </TableCell>
              <TableCell className="text-muted-foreground hidden sm:table-cell">{a.teacher?.name || 'No asignado'}</TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {setEditingAssignment(a); setIsModalOpen(true)}}
                  >
                    <Edit size={16}/>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeleteAssignment(a.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={16}/>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="flex flex-col">
      <AssignmentFormModal 
        assignment={editingAssignment}
        open={isModalOpen}
        subjects={subjects} 
        gradeLevels={gradeLevels.filter(g => g.isEnabled)} 
        teachers={teachers} 
        onSave={handleSaveAssignment} 
        onCancel={() => {setIsModalOpen(false); setEditingAssignment(null);}} 
      />
      <ConfirmationModal
        isOpen={!!assignmentToDelete}
        onConfirm={confirmDeleteAssignment}
        onCancel={() => setAssignmentToDelete(null)}
        title="Eliminar Asignación"
        message="¿Seguro que quieres eliminar esta asignación? Todos los datos de calificaciones asociados se perderán."
      />
      
      <div className="p-4 border-b flex items-center justify-between bg-white">
        <Button 
          onClick={() => { setEditingAssignment(null); setIsModalOpen(true); }}
          variant="outline"
          className="gap-2"
        >
          <PlusCircle size={16} /> Nueva Asignación
        </Button>
      </div>
      
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
        </div>
      ) : (
        <Tabs defaultValue="periodo1" className="flex flex-col">
          <div className="px-4 pt-4 bg-white">
            <TabsList className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-100 p-1 text-slate-500 shadow-sm">
              <TabsTrigger value="periodo1" className="rounded-md px-6 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow">
                Periodo 1
              </TabsTrigger>
              <TabsTrigger value="periodo2" className="rounded-md px-6 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow">
                Periodo 2
              </TabsTrigger>
              <TabsTrigger value="periodo3" className="rounded-md px-6 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow">
                Periodo 3
              </TabsTrigger>
              <TabsTrigger value="resumen" className="rounded-md px-6 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow">
                Resumen
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="periodo1" className="mt-0">
            {renderAssignmentsTable()}
          </TabsContent>
          
          <TabsContent value="periodo2" className="mt-0">
            {renderAssignmentsTable()}
          </TabsContent>
          
          <TabsContent value="periodo3" className="mt-0">
            {renderAssignmentsTable()}
          </TabsContent>
          
          <TabsContent value="resumen" className="mt-0">
            <div className="p-8 text-center text-slate-500">
              <p className="text-lg font-medium">Resumen de todos los periodos</p>
              <p className="text-sm mt-2">Aquí puedes ver un resumen consolidado de las asignaciones</p>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};