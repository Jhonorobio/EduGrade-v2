import { UserRole } from '../types';

// Colección de avatares predefinidos para los usuarios
export interface Avatar {
  id: string;
  type: 'image';
  imageUrl: string;
  background: string;
  name: string;
}

// Helper para agregar cache busting a las URLs de imágenes
const addCacheBuster = (url: string): string => {
  const timestamp = Date.now();
  return `${url}?t=${timestamp}`;
};

// Avatares predefinidos por rol y género
const AVATAR_SUPER_ADMIN = {
  id: 'super-admin',
  url: 'https://i.imgur.com/EqdgL7Q.png',
  background: 'bg-purple-500',
  name: 'Super Admin'
};

const AVATAR_MALE = {
  id: 'male-default',
  url: 'https://i.imgur.com/a0SA85s.png',
  background: 'bg-blue-400',
  name: 'Avatar Masculino'
};

const AVATAR_FEMALE = {
  id: 'female-default',
  url: 'https://i.imgur.com/uHRLZvD.png',
  background: 'bg-pink-400',
  name: 'Avatar Femenino'
};

// Función para obtener el avatar según el rol y género del usuario
export function getAvatarForUser(role: UserRole, gender?: 'male' | 'female'): Avatar {
  // Super Admin siempre tiene su avatar especial
  if (role === UserRole.SUPER_ADMIN) {
    return {
      id: AVATAR_SUPER_ADMIN.id,
      type: 'image',
      imageUrl: addCacheBuster(AVATAR_SUPER_ADMIN.url),
      background: AVATAR_SUPER_ADMIN.background,
      name: AVATAR_SUPER_ADMIN.name
    };
  }

  // Para otros roles, usar avatar según género
  const avatarData = gender === 'female' ? AVATAR_FEMALE : AVATAR_MALE;
  
  return {
    id: avatarData.id,
    type: 'image',
    imageUrl: addCacheBuster(avatarData.url),
    background: avatarData.background,
    name: avatarData.name
  };
}

// Función para obtener avatar por ID (para compatibilidad)
export function getAvatarById(id: string): Avatar | undefined {
  const avatars = [AVATAR_SUPER_ADMIN, AVATAR_MALE, AVATAR_FEMALE];
  const avatarData = avatars.find(a => a.id === id);
  
  if (!avatarData) return undefined;
  
  return {
    id: avatarData.id,
    type: 'image',
    imageUrl: addCacheBuster(avatarData.url),
    background: avatarData.background,
    name: avatarData.name
  };
}

// Avatar por defecto
export function getDefaultAvatar(): Avatar {
  return getAvatarForUser(UserRole.DOCENTE, 'male');
}
