import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Subject } from '../types';
import { Edit, Trash2, Loader2, PlusCircle, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { useToast } from './Toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
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

interface SubjectManagementProps {}

const SubjectFormModal: React.FC<{
  subject: Subject | null;
  open: boolean;
  onSave: (subject: Partial<Subject>) => void;
  onCancel: () => void;
}> = ({ subject, open, onSave, onCancel }) => {
  const [name, setName] = useState(subject?.name || '');

  useEffect(() => {
    setName(subject?.name || '');
  }, [subject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...subject, name });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{subject ? 'Editar Materia' : 'Nueva Materia'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Materia</Label>
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
      <SubjectFormModal 
        subject={editingSubject}
        open={isModalOpen}
        onSave={handleSaveSubject}
        onCancel={() => { setIsModalOpen(false); setEditingSubject(null); }}
      />
      <ConfirmationModal
        isOpen={!!subjectToDelete}
        onConfirm={confirmDeleteSubject}
        onCancel={() => setSubjectToDelete(null)}
        title="Eliminar Materia"
        message="¿Seguro que quieres eliminar esta materia? Las asignaciones asociadas pueden verse afectadas."
      />
      <div className="p-4 border-b flex items-center justify-between bg-white rounded-t-lg">
        <Button 
          onClick={() => { setEditingSubject(null); setIsModalOpen(true); }}
          variant="outline"
          className="gap-2"
        >
          <PlusCircle size={16} /> Nueva Materia
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
                    Nombre de la Materia {getSortIcon('name')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSubjects.map(subject => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.name}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => { setEditingSubject(subject); setIsModalOpen(true); }}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteSubject(subject.id)}
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