import { createClient } from '@supabase/supabase-js';

// Obtener credenciales desde variables de entorno
const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Comprueba si las credenciales están configuradas
const isDemoMode = !supabaseUrl || !supabaseKey;

// Solo crea el cliente si las credenciales han sido configuradas
export const supabase = !isDemoMode
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export const isSupabaseConfigured = () => !!supabase;
