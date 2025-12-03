# Configuración de Avatares

## Instrucciones para configurar los 6 avatares

Tienes 2 opciones para usar las imágenes de los avatares:

### Opción 1: Usar Imgur (Recomendado - Más fácil)

1. Ve a https://imgur.com
2. Sube las 6 imágenes de avatares
3. Para cada imagen, haz clic derecho y copia la URL de la imagen
4. Reemplaza las URLs en `lib/avatars.ts`:
   - `avatar-1`: Profesor con barba (fondo amarillo)
   - `avatar-2`: Doctora con lentes (fondo rosa)
   - `avatar-3`: Profesor joven (fondo azul)
   - `avatar-4`: Estudiante sonriente (fondo verde)
   - `avatar-5`: Mujer con suéter amarillo (fondo rosa)
   - `avatar-6`: Joven con sudadera amarilla (fondo beige)

### Opción 2: Usar carpeta public (Para producción)

1. Crea una carpeta `public/avatars` en tu proyecto
2. Guarda las 6 imágenes con estos nombres:
   - `avatar-1.png` - Profesor con barba
   - `avatar-2.png` - Doctora con lentes
   - `avatar-3.png` - Profesor joven
   - `avatar-4.png` - Estudiante sonriente
   - `avatar-5.png` - Mujer con suéter amarillo
   - `avatar-6.png` - Joven con sudadera amarilla

3. Actualiza las URLs en `lib/avatars.ts` a:
   ```typescript
   imageUrl: '/avatars/avatar-1.png'
   imageUrl: '/avatars/avatar-2.png'
   // etc...
   ```

### Opción 3: Usar las imágenes directamente desde tu mensaje

Si guardaste las imágenes localmente, puedes:
1. Crear la carpeta `public/avatars`
2. Copiar las 6 imágenes a esa carpeta
3. Renombrarlas como `avatar-1.png`, `avatar-2.png`, etc.
4. Actualizar las URLs en `lib/avatars.ts`

## Verificar que funciona

Después de configurar las URLs:
1. Abre la aplicación
2. Ve a tu perfil
3. Deberías ver los 6 avatares disponibles para seleccionar
