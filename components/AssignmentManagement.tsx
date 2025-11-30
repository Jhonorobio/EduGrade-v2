import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { User, UserRole, Assignment, Subject, GradeLevel } from '../types';
import { Plus, Edit, Trash2, X, Loader2, PlusCircle, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { useToast } from './Toast';

interface AssignmentManagementProps {}

const AssignmentFormModal: React.FC<{
  assignment: Assignment | null;
  subjects: Subject[];
  gradeLevels: GradeLevel[];
  teachers: User[];
  onSave: (assignment: Partial<Assignment>) => void;
  onCancel: () => void;
}> = ({ assignment, subjects, gradeLevels, teachers, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    subjectId: assignment?.subjectId || '',
    gradeLevelIds: assignment?.gradeLevelIds || [] as string[],
    teacherId: assignment?.teacherId || '',
  });
  const { addToast } = useToast();

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGradeLevelChange = (gradeId: string) => {
    setFormData(prev => {
        const newIds = prev.gradeLevelIds.includes(gradeId)
            ? prev.gradeLevelIds.filter(id => id !== gradeId)
            : [...prev.gradeLevelIds, gradeId];
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">{assignment ? 'Editar Asignación' : 'Nueva Asignación'}</h3>
          <button onClick={onCancel} className="p-1 hover:bg-slate-200 rounded-full"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Materia</label>
              <select name="subjectId" value={formData.subjectId} onChange={handleSelectChange} className="mt-1 w-full p-2 border rounded bg-white" required>
                <option value="" disabled>Seleccione una materia...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
             <div>
              <label className="text-sm font-medium text-slate-600">Grados Asignados</label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border p-3 rounded-md bg-slate-50">
                {gradeLevels.map(g => (
                  <div key={g.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`grade-${g.id}`}
                      checked={formData.gradeLevelIds.includes(g.id)}
                      onChange={() => handleGradeLevelChange(g.id)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor={`grade-${g.id}`} className="ml-3 text-sm text-gray-700">{g.name}</label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Profesor Asignado</label>
              <select name="teacherId" value={formData.teacherId} onChange={handleSelectChange} className="mt-1 w-full p-2 border rounded bg-white" required>
                 <option value="" disabled>Seleccione un profesor...</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="p-4 bg-slate-50 flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 bg-slate-200 rounded">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Guardar</button>
          </div>
        </form>
      </div>
    </div>
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

  return (
    <div className="h-full flex flex-col">
      {isModalOpen && (
        <AssignmentFormModal 
            assignment={editingAssignment} 
            subjects={subjects} 
            gradeLevels={gradeLevels.filter(g => g.isEnabled)} 
            teachers={teachers} 
            onSave={handleSaveAssignment} 
            onCancel={() => {setIsModalOpen(false); setEditingAssignment(null);}} 
        />
      )}
      <ConfirmationModal
        isOpen={!!assignmentToDelete}
        onConfirm={confirmDeleteAssignment}
        onCancel={() => setAssignmentToDelete(null)}
        title="Eliminar Asignación"
        message="¿Seguro que quieres eliminar esta asignación? Todos los datos de calificaciones asociados se perderán."
      />
      
      <div className="p-4 border-b flex items-center justify-between bg-white rounded-t-lg">
        <button onClick={() => { setEditingAssignment(null); setIsModalOpen(true); }} className="flex items-center justify-center gap-2 px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-100 transition-colors font-medium text-sm">
          <PlusCircle size={16} /> Nueva Asignación
        </button>
      </div>
      
      {loading ? (
        <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>
      ) : (
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 sticky top-0">
              <tr>
                <th className="p-3 text-left font-bold">
                   <button onClick={() => requestSort('subject')} className="flex items-center hover:text-slate-900">
                    Asignación (Materia y Grados) {getSortIcon('subject')}
                  </button>
                </th>
                <th className="p-3 text-left font-bold hidden sm:table-cell">
                   <button onClick={() => requestSort('teacher')} className="flex items-center hover:text-slate-900">
                    Profesor {getSortIcon('teacher')}
                  </button>
                </th>
                <th className="p-3 text-center font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedAssignments.map(a => (
                <tr key={a.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-medium">{a.subject?.name || 'N/A'}</div>
                    <div className="text-xs text-slate-500">{a.gradeLevels?.map(gl => gl.name).join(', ') || 'N/A'}</div>
                    <div className="sm:hidden text-xs text-slate-500 mt-1">{a.teacher?.name || 'No asignado'}</div>
                  </td>
                  <td className="p-3 text-slate-600 hidden sm:table-cell">{a.teacher?.name || 'No asignado'}</td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => {setEditingAssignment(a); setIsModalOpen(true)}} className="p-2 hover:bg-slate-200 rounded"><Edit size={16}/></button>
                      <button onClick={() => handleDeleteAssignment(a.id)} className="p-2 text-red-500 hover:bg-red-100 rounded"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};