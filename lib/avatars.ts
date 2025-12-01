// Colección de avatares predefinidos para los usuarios
export interface Avatar {
  id: string;
  type: 'emoji' | 'gradient' | 'icon';
  value: string;
  background: string;
}

export const avatars: Avatar[] = [
  // Emojis educativos
  { id: 'avatar-1', type: 'emoji', value: '👨‍🏫', background: 'bg-blue-500' },
  { id: 'avatar-2', type: 'emoji', value: '👩‍🏫', background: 'bg-purple-500' },
  { id: 'avatar-3', type: 'emoji', value: '👨‍🎓', background: 'bg-green-500' },
  { id: 'avatar-4', type: 'emoji', value: '👩‍🎓', background: 'bg-pink-500' },
  { id: 'avatar-5', type: 'emoji', value: '📚', background: 'bg-indigo-500' },
  { id: 'avatar-6', type: 'emoji', value: '✏️', background: 'bg-yellow-500' },
  { id: 'avatar-7', type: 'emoji', value: '📝', background: 'bg-orange-500' },
  { id: 'avatar-8', type: 'emoji', value: '🎓', background: 'bg-red-500' },
  
  // Emojis profesionales
  { id: 'avatar-9', type: 'emoji', value: '💼', background: 'bg-gray-600' },
  { id: 'avatar-10', type: 'emoji', value: '🎯', background: 'bg-teal-500' },
  { id: 'avatar-11', type: 'emoji', value: '⭐', background: 'bg-amber-500' },
  { id: 'avatar-12', type: 'emoji', value: '🏆', background: 'bg-yellow-600' },
  
  // Emojis de ciencia
  { id: 'avatar-13', type: 'emoji', value: '🔬', background: 'bg-cyan-500' },
  { id: 'avatar-14', type: 'emoji', value: '🧪', background: 'bg-lime-500' },
  { id: 'avatar-15', type: 'emoji', value: '🧬', background: 'bg-emerald-500' },
  { id: 'avatar-16', type: 'emoji', value: '🌍', background: 'bg-blue-600' },
  
  // Emojis de arte
  { id: 'avatar-17', type: 'emoji', value: '🎨', background: 'bg-rose-500' },
  { id: 'avatar-18', type: 'emoji', value: '🎭', background: 'bg-violet-500' },
  { id: 'avatar-19', type: 'emoji', value: '🎵', background: 'bg-fuchsia-500' },
  { id: 'avatar-20', type: 'emoji', value: '📖', background: 'bg-slate-600' },
  
  // Gradientes
  { id: 'avatar-21', type: 'gradient', value: '', background: 'bg-gradient-to-br from-blue-400 to-purple-600' },
  { id: 'avatar-22', type: 'gradient', value: '', background: 'bg-gradient-to-br from-green-400 to-blue-600' },
  { id: 'avatar-23', type: 'gradient', value: '', background: 'bg-gradient-to-br from-pink-400 to-orange-600' },
  { id: 'avatar-24', type: 'gradient', value: '', background: 'bg-gradient-to-br from-purple-400 to-pink-600' },
];

export function getAvatarById(id: string): Avatar | undefined {
  return avatars.find(avatar => avatar.id === id);
}

export function getDefaultAvatar(): Avatar {
  return avatars[0];
}
