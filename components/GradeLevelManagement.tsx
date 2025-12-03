import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { GradeLevel, User, UserRole } from '../types';
import { Edit, Loader2, Trash2, PlusCircle, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { useToast } from './Toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
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

interface GradeLevelManagementProps {}

const GradeLevelFormModal: React.FC<{
  gradeLevel: GradeLevel | null;
  open: boolean;
  onSave: (gradeLevel: Partial<GradeLevel>) => void;
  onCancel: () => void;
}> = ({ gradeLevel, open, onSave, onCancel }) => {
  const [name, setName] = useState(gradeLevel?.name || '');

  useEffect(() => {
    setName(gradeLevel?.name || '');
  }, [gradeLevel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...gradeLevel, name });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{gradeLevel ? 'Editar Grado' : 'Nuevo Grado'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Grado (Ej: 6-1, 10-A)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
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
      <GradeLevelFormModal 
        gradeLevel={editingGradeLevel}
        open={isModalOpen}
        onSave={handleSaveGradeLevel}
        onCancel={() => { setIsModalOpen(false); setEditingGradeLevel(null); }}
      />
      <ConfirmationModal
        isOpen={!!gradeLevelToDelete}
        onConfirm={confirmDelete}
        onCancel={() => setGradeLevelToDelete(null)}
        title="Eliminar Grado Permanentemente"
        message="¿Estás seguro? Esta acción no se puede deshacer. Si el grado está en uso por alguna asignación, no se podrá eliminar."
      />
      <div className="p-4 border-b flex items-center justify-between bg-white rounded-t-lg">
        <Button 
          onClick={() => { setEditingGradeLevel(null); setIsModalOpen(true); }}
          variant="outline"
          className="gap-2"
        >
          <PlusCircle size={16} /> Nuevo Grado
        </Button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-100 sticky top-0">
              <TableRow>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => requestSort('name')} 
                    className="flex items-center gap-1 h-auto p-0 hover:bg-transparent font-bold"
                  >
                    Nombre del Grado {getSortIcon('name')}
                  </Button>
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <Button 
                    variant="ghost" 
                    onClick={() => requestSort('director')} 
                    className="flex items-center gap-1 h-auto p-0 hover:bg-transparent font-bold"
                  >
                    Director de Grupo {getSortIcon('director')}
                  </Button>
                </TableHead>
                <TableHead className="text-center w-32">Habilitado</TableHead>
                <TableHead className="text-center w-32">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedGradeLevels.map(gradeLevel => (
                <TableRow key={gradeLevel.id} className={!gradeLevel.isEnabled ? 'opacity-50 bg-slate-50' : ''}>
                  <TableCell className="font-medium">
                    {gradeLevel.name}
                    <div className="sm:hidden mt-2">
                      <Select
                        value={gradeLevel.directorId || ''}
                        onValueChange={(value) => handleUpdateDirector(gradeLevel.id, value || null)}
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Sin Asignar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sin Asignar</SelectItem>
                          {teachers.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Select
                      value={gradeLevel.directorId || ''}
                      onValueChange={(value) => handleUpdateDirector(gradeLevel.id, value || null)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sin Asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin Asignar</SelectItem>
                        {teachers.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Switch 
                        checked={gradeLevel.isEnabled} 
                        onCheckedChange={() => handleToggleIsEnabled(gradeLevel)} 
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => { setEditingGradeLevel(gradeLevel); setIsModalOpen(true); }}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(gradeLevel.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-100"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};