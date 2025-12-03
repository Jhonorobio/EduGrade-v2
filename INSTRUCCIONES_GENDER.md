# Instrucciones para agregar la columna Gender

## Error actual
```
Could not find the 'gender' column of 'users' in the schema cache
```

## Solución

### Opción 1: Usando el SQL Editor de Supabase (Recomendado)

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. En el menú lateral, haz clic en **SQL Editor**
4. Crea una nueva query
5. Copia y pega el contenido del archivo `supabase-migration-gender.sql`
6. Haz clic en **Run** para ejecutar el script
7. Verifica que la columna se agregó correctamente

### Opción 2: Usando Table Editor

1. Ve a tu proyecto en Supabase
2. En el menú lateral, haz clic en **Table Editor**
3. Selecciona la tabla `users`
4. Haz clic en el botón **+ New Column**
5. Configura la columna:
   - **Name**: `gender`
   - **Type**: `text`
   - **Default value**: (dejar vacío)
   - **Is nullable**: ✓ (marcado)
6. Haz clic en **Save**

### Después de agregar la columna

1. Recarga tu aplicación en el navegador
2. Ve a tu perfil
3. Ahora deberías poder seleccionar tu género sin errores

## Nota importante

Si estás usando el modo demo (sin Supabase configurado), este error no debería aparecer. El error solo ocurre cuando tienes Supabase configurado pero la columna no existe en la base de datos.
