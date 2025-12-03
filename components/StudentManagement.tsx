import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../services/db';
import { Student, GradeLevel } from '../types';
import { ArrowLeft, Edit, Trash2, Loader2, Users, Upload, Download, PlusCircle, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { useToast } from './Toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
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
import { Card, CardContent } from './ui/card';

interface StudentManagementProps {}

const StudentFormModal: React.FC<{
  student: Student | null;
  open: boolean;
  gradeLevels: GradeLevel[];
  onSave: (student: Partial<Student>) => void;
  onCancel: () => void;
  defaultGradeId?: string | null;
}> = ({ student, open, gradeLevels, onSave, onCancel, defaultGradeId }) => {
  const [formData, setFormData] = useState<Partial<Student>>({
    name: student?.name || '',
    gradeLevelId: student?.gradeLevelId || defaultGradeId || null,
  });

  useEffect(() => {
    setFormData({
      name: student?.name || '',
      gradeLevelId: student?.gradeLevelId || defaultGradeId || null,
    });
  }, [student, defaultGradeId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...student, ...formData });
  };

  const isEditing = !!student;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Alumno' : 'Nuevo Alumno'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo del Alumno</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gradeLevel">Grado Asignado</Label>
              <Select
                value={formData.gradeLevelId || ''}
                onValueChange={(value) => setFormData({ ...formData, gradeLevelId: value })}
              >
                <SelectTrigger id="gradeLevel" className="w-full">
                  <SelectValue placeholder="Seleccione un grado..." />
                </SelectTrigger>
                <SelectContent>
                  {gradeLevels.map(gl => (
                    <SelectItem key={gl.id} value={gl.id}>{gl.name}</SelectItem>
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

export const StudentManagement: React.FC<StudentManagementProps> = () => {
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | null>(null);
  const [actionToDelete, setActionToDelete] = useState<'all' | 'grade' | null>(null);
  const { addToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importGradeId, setImportGradeId] = useState<string | null>(null);
  
  const [sortConfig, setSortConfig] = useState<{ key: keyof Student; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

  const studentsInSelectedGrade = useMemo(() => selectedGrade 
    ? allStudents.filter(s => s.gradeLevelId === selectedGrade.id)
    : [], [allStudents, selectedGrade]);

  const sortedStudentsInGrade = useMemo(() => {
    let sortableItems = [...studentsInSelectedGrade];
    sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key]?.toString().toLowerCase() || '';
        const valB = b[sortConfig.key]?.toString().toLowerCase() || '';
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
    });
    return sortableItems;
  }, [studentsInSelectedGrade, sortConfig]);

  const requestSort = (key: keyof Student) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: keyof Student) => {
    if (sortConfig.key !== key) return <ChevronsUpDown size={14} className="ml-2 text-slate-400" />;
    if (sortConfig.direction === 'ascending') return <ArrowUp size={14} className="ml-2" />;
    return <ArrowDown size={14} className="ml-2" />;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
        const [studentsData, gradeLevelsData] = await Promise.all([
            db.getStudents(),
            db.getGradeLevels()
        ]);
        setAllStudents(studentsData);
        setGradeLevels(gradeLevelsData);
    } catch(error) {
        addToast('Error al cargar datos de alumnos.', 'error');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveStudent = async (student: Partial<Student>) => {
    try {
      const gradeIdForDb: string | null = student.gradeLevelId || null;

      if (student.id) {
        await db.updateStudent(student.id, {
          name: student.name,
          gradeLevelId: gradeIdForDb
        });
        addToast('Alumno actualizado con éxito.', 'success');
      } else {
        await db.addStudent({ 
          name: student.name || '', 
          gradeLevelId: gradeIdForDb
        });
        addToast('Alumno creado con éxito.', 'success');
      }
      setIsModalOpen(false);
      setEditingStudent(null);
      fetchData();
    } catch(error) {
      addToast('Error al guardar alumno.', 'error');
    }
  };

  const handleDeleteStudent = (studentId: string) => {
    setStudentToDelete(studentId);
  };

  const confirmDeleteStudent = async () => {
    if (studentToDelete) {
      try {
        await db.deleteStudent(studentToDelete);
        addToast('Alumno eliminado con éxito.', 'success');
        fetchData();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error al eliminar alumno.';
        addToast(message, 'error');
      } finally {
        setStudentToDelete(null);
      }
    }
  };
  
  const handleConfirmMassDelete = async () => {
    if (!actionToDelete) return;

    setIsProcessing(true);
    try {
        if (actionToDelete === 'all') {
            await db.deleteAllStudents();
            addToast('Todos los alumnos han sido eliminados.', 'success');
        } else if (actionToDelete === 'grade' && selectedGrade) {
            await db.deleteStudentsByGrade(selectedGrade.id);
            addToast(`Alumnos del grado ${selectedGrade.name} eliminados.`, 'success');
        }
        await fetchData();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error en la eliminación masiva.';
        addToast(message, 'error');
    } finally {
        setActionToDelete(null);
        setIsProcessing(false);
    }
  };

  const handleExport = (studentsToExport: Student[], fileName: string) => {
    const header = 'PrimerApellido;SegundoApellido;PrimerNombre;SegundoNombre;NombreDelGrado\n';
    
    const rows = studentsToExport.map(student => {
      const nameParts = student.name.split(' ').filter(Boolean);
      let firstName1 = '', firstName2 = '', lastName1 = '', lastName2 = '';

      switch (nameParts.length) {
        case 1:
          firstName1 = nameParts[0];
          break;
        case 2:
          firstName1 = nameParts[0];
          lastName1 = nameParts[1];
          break;
        case 3:
          firstName1 = nameParts[0];
          lastName1 = nameParts[1];
          lastName2 = nameParts[2];
          break;
        case 4:
        default:
          firstName1 = nameParts[0];
          firstName2 = nameParts[1];
          lastName1 = nameParts[2];
          lastName2 = nameParts.slice(3).join(' ');
          break;
      }

      const gradeName = student.gradeLevel?.name || 'N/A';
      
      return [lastName1, lastName2, firstName1, firstName2, gradeName].join(';');
    }).join('\n');

    const csvContent = header + rows;
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Exportación iniciada.', 'success');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) {
          addToast('No se pudo leer el archivo.', 'error');
          setIsProcessing(false);
          return;
        }

        let text = new TextDecoder('utf-8').decode(buffer);

        if (text.includes('�')) {
          try {
            text = new TextDecoder('windows-1252').decode(buffer);
          } catch (decodeError) {
             console.error("Failed to decode with windows-1252, proceeding with UTF-8 decoded text.", decodeError);
          }
        }
        
        const lines = text.split(/[\r\n]+/).filter(line => line.trim() !== '' && !line.startsWith('DESPEDIDA'));
  
        if (lines.length <= 1) {
          addToast('El archivo CSV está vacío o solo contiene la cabecera.', 'error');
          setIsProcessing(false);
          return;
        }

        const normalizeGradeName = (name: string) => {
            if (!name) return '';
            return name
                .trim()
                .toLowerCase()
                .normalize("NFD") 
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[°º]/g, "");
        };

        const gradeMap = new Map(gradeLevels.map(gl => [normalizeGradeName(gl.name), gl.id]));
        const existingStudentsSet = new Set(
          allStudents.map(s => `${s.name.trim().toLowerCase()}|${s.gradeLevelId}`)
        );
        
        let skippedCount = 0;
        let unmatchedGradeCount = 0;
        const unmatchedGradeNames = new Set<string>();
        const studentsToInsert: { name: string; grade_level_id: string | null }[] = [];

        lines.slice(1).forEach(line => {
          const parts = line.trim().split(';');
          const [lastName1, lastName2, firstName1, firstName2, gradeName] = parts;
          
          const fullName = [firstName1, firstName2, lastName1, lastName2].filter(Boolean).join(' ').trim();
          
          let gradeLevelId = importGradeId;
          if (!gradeLevelId && gradeName) {
            gradeLevelId = gradeMap.get(normalizeGradeName(gradeName)) || null;
          }

          if (fullName && gradeLevelId) {
            const studentKey = `${fullName.toLowerCase()}|${gradeLevelId}`;
            if (existingStudentsSet.has(studentKey)) {
              skippedCount++;
            } else {
              studentsToInsert.push({ name: fullName, grade_level_id: gradeLevelId });
              existingStudentsSet.add(studentKey);
            }
          } else if(fullName && !gradeLevelId && !importGradeId) {
            unmatchedGradeCount++;
            if (gradeName) {
                unmatchedGradeNames.add(gradeName.trim());
            }
          }
        });
        
        if (studentsToInsert.length > 0) {
          await db.bulkAddStudents(studentsToInsert);
        }
        
        let successMessage = `${studentsToInsert.length} alumnos importados.`;
        if (skippedCount > 0) {
            successMessage += ` ${skippedCount} duplicados omitidos.`
        }
        addToast(successMessage, 'success');
        
        if (unmatchedGradeCount > 0) {
            addToast(
                `${unmatchedGradeCount} alumnos omitidos. Grados no encontrados: ${[...unmatchedGradeNames].slice(0, 3).join(', ')}${unmatchedGradeNames.size > 3 ? '...' : ''}`,
                'error'
            );
        }
        await fetchData();

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        addToast(`Error al procesar el archivo: ${message}`, 'error');
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setImportGradeId(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (!selectedGrade) {
    return (
       <div className="h-full flex flex-col">
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".csv" className="hidden" />
        <ConfirmationModal
          isOpen={!!actionToDelete}
          onConfirm={handleConfirmMassDelete}
          onCancel={() => setActionToDelete(null)}
          title="Eliminar Todos los Alumnos"
          message="¿Estás seguro? Esta acción es irreversible y eliminará a todos los alumnos de la base de datos."
        />
        <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white rounded-t-lg gap-2">
          <h2 className="text-lg font-bold text-slate-800">Gestión de Alumnos por Grado</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => { setImportGradeId(null); fileInputRef.current?.click(); }} 
              disabled={isProcessing || loading}
              variant="outline"
              className="flex-1 sm:flex-none gap-2"
            >
              {isProcessing && !importGradeId ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16} />}
              Importar (Todos)
            </Button>
            <Button 
              onClick={() => handleExport(allStudents, 'todos_los_alumnos.csv')} 
              disabled={isProcessing || loading || allStudents.length === 0}
              variant="outline"
              className="flex-1 sm:flex-none gap-2"
            >
              <Download size={16} /> Exportar (Todos)
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {gradeLevels.filter(gl => gl.isEnabled).map(grade => {
                const studentCount = allStudents.filter(s => s.gradeLevelId === grade.id).length;
                return (
                  <Card 
                    key={grade.id} 
                    onClick={() => setSelectedGrade(grade)} 
                    className="cursor-pointer hover:bg-indigo-50 hover:border-indigo-500 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 text-lg">{grade.name}</h3>
                        <div className="flex items-center gap-2 text-slate-500">
                          <Users size={16} />
                          <span className="font-semibold">{studentCount}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">Gestionar alumnos de este grado</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
       <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".csv" className="hidden" />
      <StudentFormModal 
        student={editingStudent}
        open={isModalOpen}
        gradeLevels={gradeLevels.filter(gl => gl.isEnabled)}
        onSave={handleSaveStudent}
        onCancel={() => { setIsModalOpen(false); setEditingStudent(null); }}
        defaultGradeId={selectedGrade.id}
      />
      <ConfirmationModal
        isOpen={!!studentToDelete || !!actionToDelete}
        onConfirm={studentToDelete ? confirmDeleteStudent : handleConfirmMassDelete}
        onCancel={() => { setStudentToDelete(null); setActionToDelete(null); }}
        title={studentToDelete ? "Eliminar Alumno" : "Eliminar Alumnos del Grado"}
        message={studentToDelete ? "¿Seguro que quieres eliminar este alumno? Esta acción es irreversible." : `¿Estás seguro? Esta acción es irreversible y eliminará a todos los alumnos del grado ${selectedGrade?.name}.`}
      />

      <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white rounded-t-lg gap-2">
        <div className="flex items-center gap-3">
          <Button onClick={() => setSelectedGrade(null)} variant="ghost" size="icon">
            <ArrowLeft size={20} />
          </Button>
          <h2 className="text-lg font-bold text-slate-800">Alumnos en: {selectedGrade.name}</h2>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => { setEditingStudent(null); setIsModalOpen(true); }}
              variant="outline"
              className="flex-1 sm:flex-none gap-2"
            >
              <PlusCircle size={16} /> Nuevo Alumno
            </Button>
            <Button 
              onClick={() => { setImportGradeId(selectedGrade.id); fileInputRef.current?.click(); }} 
              disabled={isProcessing || loading}
              variant="outline"
              className="flex-1 sm:flex-none gap-2"
            >
              {isProcessing && importGradeId ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16} />}
              Importar
            </Button>
            <Button 
              onClick={() => handleExport(studentsInSelectedGrade, `alumnos_${selectedGrade.name.replace(/ /g, '_')}.csv`)} 
              disabled={isProcessing || loading || studentsInSelectedGrade.length === 0}
              variant="outline"
              className="flex-1 sm:flex-none gap-2"
            >
               <Download size={16} /> Exportar
            </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        {loading ? (
            <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>
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
                    Nombre del Alumno {getSortIcon('name')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStudentsInGrade.map(student => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => { setEditingStudent(student); setIsModalOpen(true); }}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteStudent(student.id)}
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
