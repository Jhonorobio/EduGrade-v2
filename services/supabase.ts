import { createClient } from '@supabase/supabase-js';

// --- ATENCIÓN: CONFIGURACIÓN DE LA BASE DE DATOS ---
// Reemplaza los siguientes valores con las credenciales de tu proyecto de Supabase.
// Puedes encontrarlas en la configuración de tu proyecto en Supabase, en la sección "API".
// IMPORTANTE: Por seguridad, no compartas estas claves públicamente.
const supabaseUrl: string = 'https://rizddhhcqbmbvnborjlc.supabase.co';
const supabaseKey: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpemRkaGhjcWJtYnZuYm9yamxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTA0MzMsImV4cCI6MjA3OTE2NjQzM30.leurOJjOMQI1qp-InyMThzghBJpJUUqOm6R1rfvg6vw';
// ----------------------------------------------------

// Comprueba si las credenciales son las de ejemplo o si están vacías.
const isDemoMode = !supabaseUrl || supabaseUrl === 'https://tu-id-de-proyecto.supabase.co' || !supabaseKey || supabaseKey === 'tu-clave-anonima-publica';

// Solo crea el cliente si las credenciales han sido configuradas.
export const supabase = !isDemoMode
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export const isSupabaseConfigured = () => !!supabase;
