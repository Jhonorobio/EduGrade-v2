import React, { useState } from 'react';
import { User } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { avatars, getAvatarById, Avatar } from '../lib/avatars';
import { db } from '../services/db';
import { useToast } from '../components/Toast';
import { Loader2, Check } from 'lucide-react';

interface ProfileProps {
  currentUser: User;
  onUpdateUser: (user: User) => void;
}

export function Profile({ currentUser, onUpdateUser }: ProfileProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentUser.avatar || avatars[0].id);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleAvatarChange = async (avatarId: string) => {
    setSelectedAvatar(avatarId);
    try {
      await db.updateUserAvatar(currentUser.id, avatarId);
      onUpdateUser({ ...currentUser, avatar: avatarId });
      addToast('Avatar actualizado correctamente', 'success');
    } catch (error) {
      console.error(error);
      addToast('Error al actualizar el avatar', 'error');
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
      await db.changePassword(currentUser.id, currentPassword, newPassword);
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

  const selectedAvatarData = getAvatarById(selectedAvatar);

  return (
    <div className="space-y-6">
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
            <div className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl ${selectedAvatarData?.background || 'bg-gray-300'}`}>
              {selectedAvatarData?.type === 'emoji' ? selectedAvatarData.value : currentUser.name[0].toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold">{currentUser.name}</p>
              <p className="text-sm text-gray-500">{currentUser.email}</p>
              <p className="text-sm text-gray-500 capitalize">{currentUser.role.replace('_', ' ')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selección de Avatar */}
      <Card>
        <CardHeader>
          <CardTitle>Elige tu Avatar</CardTitle>
          <CardDescription>Selecciona un avatar para personalizar tu perfil</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3">
            {avatars.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleAvatarChange(avatar.id)}
                className={`relative flex h-14 w-14 items-center justify-center rounded-full text-2xl transition-all hover:scale-110 ${avatar.background} ${
                  selectedAvatar === avatar.id ? 'ring-4 ring-primary ring-offset-2' : ''
                }`}
              >
                {avatar.type === 'emoji' && avatar.value}
                {selectedAvatar === avatar.id && (
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

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
