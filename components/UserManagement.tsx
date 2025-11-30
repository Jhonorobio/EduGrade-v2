import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { User, UserRole } from '../types';
import { Plus, Edit, Trash2, X, Loader2, PlusCircle, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { useToast } from './Toast';

interface UserManagementProps {}

const UserFormModal: React.FC<{
  user: User | null;
  onSave: (user: Partial<User>) => void;
  onCancel: () => void;
}> = ({ user, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    username: '',
    email: '',
    password: '',
    role: UserRole.DOCENTE,
  });

  useEffect(() => {
    if (user) {
      setFormData({ ...user, password: '' }); // Clear password for editing
    } else {
      setFormData({
        name: '', username: '', email: '', password: '', role: UserRole.DOCENTE,
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...user, ...formData });
  };

  const isEditing = !!user;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          <button onClick={onCancel} className="p-1 hover:bg-slate-200 rounded-full"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Nombre Completo</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 w-full p-2 border rounded" required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Nombre de Usuario</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange} className="mt-1 w-full p-2 border rounded" required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 w-full p-2 border rounded" required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">{isEditing ? 'Cambiar Contraseña' : 'Contraseña'}</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} className="mt-1 w-full p-2 border rounded" required={!isEditing} />
              {isEditing && <p className="text-xs text-slate-400 mt-1">Dejar en blanco para no cambiar la contraseña actual.</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Rol</label>
              <select name="role" value={formData.role} onChange={handleChange} className="mt-1 w-full p-2 border rounded bg-white" required>
                <option value={UserRole.DOCENTE}>Docente</option>
                <option value={UserRole.ADMIN_COLEGIO}>Admin Colegio</option>
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
      {isModalOpen && (
        <UserFormModal 
          user={editingUser}
          onSave={handleSaveUser}
          onCancel={() => { setIsModalOpen(false); setEditingUser(null); }}
        />
      )}
      <ConfirmationModal
        isOpen={!!userToDelete}
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
        title="Eliminar Usuario"
        message="¿Seguro que quieres eliminar este usuario? Esta acción es irreversible."
      />

      <div className="p-4 border-b flex items-center justify-between bg-white rounded-t-lg">
         <button onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="flex items-center justify-center gap-2 px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-100 transition-colors font-medium text-sm">
            <PlusCircle size={16} /> Nuevo Usuario
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
                    Nombre {getSortIcon('name')}
                  </button>
                </th>
                <th className="p-3 text-left font-bold hidden sm:table-cell">
                   <button onClick={() => requestSort('email')} className="flex items-center hover:text-slate-900">
                    Email {getSortIcon('email')}
                  </button>
                </th>
                <th className="p-3 text-left font-bold hidden md:table-cell">
                   <button onClick={() => requestSort('role')} className="flex items-center hover:text-slate-900">
                    Rol {getSortIcon('role')}
                  </button>
                </th>
                <th className="p-3 text-center font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map(user => (
                <tr key={user.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-slate-500 sm:hidden">{user.email}</div>
                    <div className="text-xs text-slate-500 md:hidden mt-1">{user.role}</div>
                  </td>
                  <td className="p-3 text-slate-600 hidden sm:table-cell">{user.email}</td>
                  <td className="p-3 hidden md:table-cell"><span className="bg-slate-200 text-slate-700 px-2 py-1 rounded-full text-xs font-medium">{user.role}</span></td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditingUser(user); setIsModalOpen(true); }} className="p-2 hover:bg-slate-200 rounded"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-red-500 hover:bg-red-100 rounded"><Trash2 size={16} /></button>
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