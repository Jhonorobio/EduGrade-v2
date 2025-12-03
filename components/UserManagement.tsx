import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { User, UserRole } from '../types';
import { Edit, Trash2, Loader2, PlusCircle, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
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

interface UserManagementProps {}

const UserFormModal: React.FC<{
  user: User | null;
  open: boolean;
  onSave: (user: Partial<User>) => void;
  onCancel: () => void;
}> = ({ user, open, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    username: '',
    email: '',
    password: '',
    role: UserRole.DOCENTE,
    gender: 'male',
  });

  useEffect(() => {
    if (user) {
      setFormData({ ...user, password: '' }); // Clear password for editing
    } else {
      setFormData({
        name: '', username: '', email: '', password: '', role: UserRole.DOCENTE, gender: 'male',
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...user, ...formData });
  };

  const isEditing = !!user;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Nombre de Usuario</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{isEditing ? 'Cambiar Contraseña' : 'Contraseña'}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!isEditing}
              />
              {isEditing && <p className="text-xs text-muted-foreground">Dejar en blanco para no cambiar la contraseña actual.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
              >
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.DOCENTE}>Docente</SelectItem>
                  <SelectItem value={UserRole.ADMIN_COLEGIO}>Admin Colegio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Género</Label>
              <Select
                value={formData.gender || 'male'}
                onValueChange={(value) => setFormData({ ...formData, gender: value as 'male' | 'female' })}
              >
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue placeholder="Seleccionar género" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Femenino</SelectItem>
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

export const UserManagement: React.FC<UserManagementProps> = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const { addToast } = useToast();

  const [sortConfig, setSortConfig] = useState<{ key: keyof User | null; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

  const sortedUsers = useMemo(() => {
    let sortableItems = [...users];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key!]?.toString().toLowerCase() || '';
        const valB = b[sortConfig.key!]?.toString().toLowerCase() || '';
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [users, sortConfig]);

  const requestSort = (key: keyof User) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof User) => {
    if (sortConfig.key !== key) return <ChevronsUpDown size={14} className="ml-2 text-slate-400" />;
    if (sortConfig.direction === 'ascending') return <ArrowUp size={14} className="ml-2" />;
    return <ArrowDown size={14} className="ml-2" />;
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await db.getManageableUsers();
      setUsers(data);
    } catch (error) {
      addToast('Error al cargar usuarios.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSaveUser = async (user: Partial<User>) => {
    try {
      const userData = { ...user };
      if (userData.id && userData.password === '') {
        delete userData.password;
      }
      
      if (userData.id) {
        await db.updateUser(userData.id, userData);
        addToast('Usuario actualizado con éxito.', 'success');
      } else {
        await db.addUser(userData as Omit<User, 'id'>);
        addToast('Usuario creado con éxito.', 'success');
      }
      setIsModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
       const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
       addToast(message, 'error');
    }
  };

  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId);
  };

  const confirmDeleteUser = async () => {
    if (userToDelete) {
      try {
        await db.deleteUser(userToDelete);
        addToast('Usuario eliminado con éxito.', 'success');
        fetchUsers();
      } catch (error) {
        addToast('Error al eliminar el usuario.', 'error');
      } finally {
        setUserToDelete(null);
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <UserFormModal 
        user={editingUser}
        open={isModalOpen}
        onSave={handleSaveUser}
        onCancel={() => { setIsModalOpen(false); setEditingUser(null); }}
      />
      <ConfirmationModal
        isOpen={!!userToDelete}
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
        title="Eliminar Usuario"
        message="¿Seguro que quieres eliminar este usuario? Esta acción es irreversible."
      />

      <div className="p-4 border-b flex items-center justify-between bg-white rounded-t-lg">
        <Button 
          onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
          variant="outline"
          className="gap-2"
        >
          <PlusCircle size={16} /> Nuevo Usuario
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
                    Nombre {getSortIcon('name')}
                  </Button>
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <Button 
                    variant="ghost" 
                    onClick={() => requestSort('email')} 
                    className="flex items-center gap-1 h-auto p-0 hover:bg-transparent font-bold"
                  >
                    Email {getSortIcon('email')}
                  </Button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <Button 
                    variant="ghost" 
                    onClick={() => requestSort('role')} 
                    className="flex items-center gap-1 h-auto p-0 hover:bg-transparent font-bold"
                  >
                    Rol {getSortIcon('role')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground sm:hidden">{user.email}</div>
                    <div className="text-xs text-muted-foreground md:hidden mt-1">{user.role}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">{user.email}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded-full text-xs font-medium">
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => { setEditingUser(user); setIsModalOpen(true); }}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteUser(user.id)}
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