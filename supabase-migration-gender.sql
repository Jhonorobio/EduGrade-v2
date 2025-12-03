-- Agregar columna gender a la tabla users
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Agregar la columna gender
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));

-- 2. Establecer un valor por defecto para usuarios existentes
UPDATE users 
SET gender = 'male' 
WHERE gender IS NULL;

-- 3. Comentario sobre la columna
COMMENT ON COLUMN users.gender IS 'Género del usuario para asignación automática de avatar';

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'gender';
