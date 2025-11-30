import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { GradeLevel, User, UserRole } from '../types';
import { Plus, Edit, X, Loader2, Trash2, PlusCircle, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { useToast } from './Toast';

interface GradeLevelManagementProps {}

const GradeLevelFormModal: React.FC<{
  gradeLevel: GradeLevel | null;
  onSave: (gradeLevel: Partial<GradeLevel>) => void;
  onCancel: () => void;
}> = ({ gradeLevel, onSave, onCancel }) => {
  const [name, setName] = useState(gradeLevel?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...gradeLevel, name });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">{gradeLevel ? 'Editar Grado' : 'Nuevo Grado'}</h3>
          <button onClick={onCancel} className="p-1 hover:bg-slate-200 rounded-full"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <label className="text-sm font-medium text-slate-600">Nombre del Grado (Ej: 6-1, 10-A)</label>
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

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; }> = ({ checked, onChange }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
  </label>
);

export const GradeLevelManagement: React.FC<GradeLevelManagementProps> = () => {
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGradeLevel, setEditingGradeLevel] = useState<GradeLevel | null>(null);
  const [gradeLevelToDelete, setGradeLevelToDelete] = useState<string | null>(null);
  const { addToast } = useToast();

  type SortableKeys = 'name' | 'director';
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

  const sortedGradeLevels = useMemo(() => {
    let sortableItems = [...gradeLevels];
    sortableItems.sort((a, b) => {
      let valA: string, valB: string;
      if (sortConfig.key === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else { // director
        valA = a.director?.name.toLowerCase() || 'zzzz'; // Unassigned last
        valB = b.director?.name.toLowerCase() || 'zzzz';
      }
      if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
    return sortableItems;
  }, [gradeLevels, sortConfig]);

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
      const [gradeLevelsData, teachersData] = await Promise.all([
         db.getGradeLevels(),
         db.getUsersByRole(UserRole.DOCENTE)
      ]);
      setGradeLevels(gradeLevelsData);
      setTeachers(teachersData);
    } catch(error) {
      addToast('Error al cargar los datos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveGradeLevel = async (gradeLevel: Partial<GradeLevel>) => {
    try {
      if (gradeLevel.id) {
        await db.updateGradeLevel(gradeLevel.id, gradeLevel);
        addToast('Grado actualizado con éxito.', 'success');
      } else {
        await db.addGradeLevel({ name: gradeLevel.name || '' });
        addToast('Grado creado con éxito.', 'success');
      }
      setIsModalOpen(false);
      setEditingGradeLevel(null);
      fetchData();
    } catch (error) {
       addToast('Error al guardar el grado.', 'error');
    }
  };

  const handleDelete = (gradeLevelId: string) => {
    setGradeLevelToDelete(gradeLevelId);
  };

  const confirmDelete = async () => {
    if (gradeLevelToDelete) {
      try {
        await db.deleteGradeLevel(gradeLevelToDelete);
        addToast('Grado eliminado con éxito.', 'success');
        fetchData();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo eliminar el grado.';
        addToast(message, 'error');
      } finally {
        setGradeLevelToDelete(null);
      }
    }
  };

  const handleToggleIsEnabled = async (gradeLevel: GradeLevel) => {
    const updatedGradeLevel = { ...gradeLevel, isEnabled: !gradeLevel.isEnabled };
    setGradeLevels(prev => prev.map(gl => gl.id === updatedGradeLevel.id ? updatedGradeLevel : gl));
    try {
        await db.updateGradeLevel(gradeLevel.id, { isEnabled: !gradeLevel.isEnabled });
        addToast(`Grado ${gradeLevel.name} ${!gradeLevel.isEnabled ? 'habilitado' : 'deshabilitado'}.`, 'success');
    } catch (error) {
        addToast('No se pudo actualizar el estado del grado.', 'error');
        setGradeLevels(prev => prev.map(gl => gl.id === updatedGradeLevel.id ? gradeLevel : gl));
    }
  };

  const handleUpdateDirector = async (gradeLevelId: string, directorId: string | null) => {
    const originalGradeLevels = [...gradeLevels];
    const newDirector = teachers.find(t => t.id === directorId) || null;
    
    setGradeLevels(prev => prev.map(gl => gl.id === gradeLevelId ? { ...gl, directorId, director: newDirector } : gl));
    try {
      await db.updateGradeLevel(gradeLevelId, { directorId: directorId });
      addToast('Director de grupo actualizado.', 'success');
    } catch (error) {
      addToast('No se pudo actualizar el director de grupo.', 'error');
      setGradeLevels(originalGradeLevels);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {isModalOpen && (
        <GradeLevelFormModal 
          gradeLevel={editingGradeLevel}
          onSave={handleSaveGradeLevel}
          onCancel={() => { setIsModalOpen(false); setEditingGradeLevel(null); }}
        />
      )}
      <ConfirmationModal
        isOpen={!!gradeLevelToDelete}
        onConfirm={confirmDelete}
        onCancel={() => setGradeLevelToDelete(null)}
        title="Eliminar Grado Permanentemente"
        message="¿Estás seguro? Esta acción no se puede deshacer. Si el grado está en uso por alguna asignación, no se podrá eliminar."
      />
      <div className="p-4 border-b flex items-center justify-between bg-white rounded-t-lg">
        <button onClick={() => { setEditingGradeLevel(null); setIsModalOpen(true); }} className="flex items-center justify-center gap-2 px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-100 transition-colors font-medium text-sm">
          <PlusCircle size={16} /> Nuevo Grado
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
                    Nombre del Grado {getSortIcon('name')}
                  </button>
                </th>
                <th className="p-3 text-left font-bold hidden sm:table-cell">
                  <button onClick={() => requestSort('director')} className="flex items-center hover:text-slate-900">
                    Director de Grupo {getSortIcon('director')}
                  </button>
                </th>
                <th className="p-3 text-center font-bold w-32">Habilitado</th>
                <th className="p-3 text-center font-bold w-32">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedGradeLevels.map(gradeLevel => (
                <tr key={gradeLevel.id} className={`border-b hover:bg-slate-50 ${!gradeLevel.isEnabled ? 'opacity-50 bg-slate-50' : ''}`}>
                  <td className="p-3 font-medium">
                    {gradeLevel.name}
                     <div className="sm:hidden mt-2">
                        <select 
                          value={gradeLevel.directorId || ''}
                          onChange={(e) => handleUpdateDirector(gradeLevel.id, e.target.value || null)}
                          className="w-full p-2 border rounded bg-white text-xs"
                        >
                          <option value="">Sin Asignar</option>
                          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                  </td>
                   <td className="p-3 font-medium hidden sm:table-cell">
                      <select 
                        value={gradeLevel.directorId || ''}
                        onChange={(e) => handleUpdateDirector(gradeLevel.id, e.target.value || null)}
                        className="w-full p-2 border rounded bg-white"
                      >
                        <option value="">Sin Asignar</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                  </td>
                  <td className="p-3 text-center">
                    <ToggleSwitch 
                      checked={gradeLevel.isEnabled} 
                      onChange={() => handleToggleIsEnabled(gradeLevel)} 
                    />
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => { setEditingGradeLevel(gradeLevel); setIsModalOpen(true); }} 
                        className="p-2 hover:bg-slate-200 rounded"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(gradeLevel.id)}
                        className="p-2 text-red-500 hover:bg-red-100 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
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