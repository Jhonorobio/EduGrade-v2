import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Subject } from '../types';
import { Plus, Edit, Trash2, X, Loader2, PlusCircle, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { useToast } from './Toast';

interface SubjectManagementProps {}

const SubjectFormModal: React.FC<{
  subject: Subject | null;
  onSave: (subject: Partial<Subject>) => void;
  onCancel: () => void;
}> = ({ subject, onSave, onCancel }) => {
  const [name, setName] = useState(subject?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...subject, name });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">{subject ? 'Editar Materia' : 'Nueva Materia'}</h3>
          <button onClick={onCancel} className="p-1 hover:bg-slate-200 rounded-full"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <label className="text-sm font-medium text-slate-600">Nombre de la Materia</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full p-2 border rounded" required />
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

export const SubjectManagement: React.FC<SubjectManagementProps> = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);
  const { addToast } = useToast();

  const [sortConfig, setSortConfig] = useState<{ key: keyof Subject; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

  const sortedSubjects = useMemo(() => {
    let sortableItems = [...subjects];
    sortableItems.sort((a, b) => {
      const valA = a[sortConfig.key]?.toString().toLowerCase() || '';
      const valB = b[sortConfig.key]?.toString().toLowerCase() || '';
      if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
    return sortableItems;
  }, [subjects, sortConfig]);

  const requestSort = (key: keyof Subject) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Subject) => {
    if (sortConfig.key !== key) return <ChevronsUpDown size={14} className="ml-2 text-slate-400" />;
    if (sortConfig.direction === 'ascending') return <ArrowUp size={14} className="ml-2" />;
    return <ArrowDown size={14} className="ml-2" />;
  };


  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const data = await db.getSubjects();
      setSubjects(data);
    } catch (error) {
      addToast('Error al cargar las materias.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleSaveSubject = async (subject: Partial<Subject>) => {
    try {
      if (subject.id) {
        await db.updateSubject(subject.id, subject);
        addToast('Materia actualizada con éxito.', 'success');
      } else {
        await db.addSubject({ name: subject.name || '' });
        addToast('Materia creada con éxito.', 'success');
      }
      setIsModalOpen(false);
      setEditingSubject(null);
      fetchSubjects();
    } catch (error) {
      addToast('Error al guardar la materia.', 'error');
    }
  };

  const handleDeleteSubject = (subjectId: string) => {
    setSubjectToDelete(subjectId);
  };

  const confirmDeleteSubject = async () => {
    if (subjectToDelete) {
      try {
        await db.deleteSubject(subjectToDelete);
        addToast('Materia eliminada con éxito.', 'success');
        fetchSubjects();
      } catch (error) {
        addToast('Error al eliminar la materia.', 'error');
      } finally {
        setSubjectToDelete(null);
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      {isModalOpen && (
        <SubjectFormModal 
          subject={editingSubject}
          onSave={handleSaveSubject}
          onCancel={() => { setIsModalOpen(false); setEditingSubject(null); }}
        />
      )}
      <ConfirmationModal
        isOpen={!!subjectToDelete}
        onConfirm={confirmDeleteSubject}
        onCancel={() => setSubjectToDelete(null)}
        title="Eliminar Materia"
        message="¿Seguro que quieres eliminar esta materia? Las asignaciones asociadas pueden verse afectadas."
      />
      <div className="p-4 border-b flex items-center justify-between bg-white rounded-t-lg">
        <button onClick={() => { setEditingSubject(null); setIsModalOpen(true); }} className="flex items-center justify-center gap-2 px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-100 transition-colors font-medium text-sm">
          <PlusCircle size={16} /> Nueva Materia
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        {loading ? (
            <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 sticky top-0">
              <tr>
                <th className="p-3 text-left font-bold">
                   <button onClick={() => requestSort('name')} className="flex items-center hover:text-slate-900">
                    Nombre de la Materia {getSortIcon('name')}
                  </button>
                </th>
                <th className="p-3 text-center font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedSubjects.map(subject => (
                <tr key={subject.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-medium">{subject.name}</td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditingSubject(subject); setIsModalOpen(true); }} className="p-2 hover:bg-slate-200 rounded"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteSubject(subject.id)} className="p-2 text-red-500 hover:bg-red-100 rounded"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};