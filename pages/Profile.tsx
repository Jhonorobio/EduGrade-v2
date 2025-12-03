import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { getAvatarForUser } from '../lib/avatars';
import { db } from '../services/db';
import { useToast } from '../components/Toast';
import { Loader2 } from 'lucide-react';

interface ProfileProps {
  currentUser: User;
  onUpdateUser: (user: User) => void;
}

export function Profile({ currentUser, onUpdateUser }: ProfileProps) {
  const [gender, setGender] = useState<'male' | 'female'>(currentUser.gender || 'male');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleGenderChange = async (newGender: 'male' | 'female') => {
    setGender(newGender);
    try {
      await db.updateUserGender(currentUser.id, newGender);
      onUpdateUser({ ...currentUser, gender: newGender });
      addToast('Género actualizado correctamente', 'success');
    } catch (error) {
      console.error(error);
      addToast('Error al actualizar el género', 'error');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      addToast('Las contraseñas no coinciden', 'error');
      return;
    }

    if (newPassword.length < 6) {
      addToast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    setLoading(true);
    try {
      await db.updateUserPassword(currentUser.id, currentPassword, newPassword);
      addToast('Contraseña actualizada correctamente', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(error);
      addToast('Error al cambiar la contraseña. Verifica tu contraseña actual.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const userAvatar = getAvatarForUser(currentUser.role, gender);
  const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;

  return (
    <div className="flex-1 overflow-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Mi Perfil</h2>
        <p className="text-gray-500">Personaliza tu cuenta y configuración</p>
      </div>

      {/* Información del usuario */}
      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
          <CardDescription>Tu información básica de usuario</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg ${userAvatar.background}`}>
              <img src={userAvatar.imageUrl} alt="Avatar" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold truncate">{currentUser.name}</p>
              <p className="text-sm text-gray-500 capitalize">{currentUser.role.replace('_', ' ')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selección de Género (solo si no es Super Admin) */}
      {!isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Avatar del Perfil</CardTitle>
            <CardDescription>Tu avatar se asigna automáticamente según tu género</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label>Género</Label>
              <div className="flex gap-3">
                <button
                  onClick={() => handleGenderChange('male')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                    gender === 'male' ? 'border-primary bg-primary/5' : 'border-gray-200'
                  }`}
                >
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md bg-blue-400">
                    <img 
                      src={getAvatarForUser(UserRole.DOCENTE, 'male').imageUrl} 
                      alt="Avatar Masculino" 
                      className="h-full w-full object-cover" 
                    />
                  </div>
                  <span className="text-xs font-medium">Masculino</span>
                </button>
                <button
                  onClick={() => handleGenderChange('female')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                    gender === 'female' ? 'border-primary bg-primary/5' : 'border-gray-200'
                  }`}
                >
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md bg-pink-400">
                    <img 
                      src={getAvatarForUser(UserRole.DOCENTE, 'female').imageUrl} 
                      alt="Avatar Femenino" 
                      className="h-full w-full object-cover" 
                    />
                  </div>
                  <span className="text-xs font-medium">Femenino</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cambiar Contraseña */}
      <Card>
        <CardHeader>
          <CardTitle>Cambiar Contraseña</CardTitle>
          <CardDescription>Actualiza tu contraseña para mantener tu cuenta segura</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Contraseña Actual</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva Contraseña</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cambiar Contraseña
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
