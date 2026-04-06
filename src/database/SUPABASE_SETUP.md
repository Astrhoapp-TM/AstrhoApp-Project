# CONFIGURACIÓN DE SUPABASE PARA ASTHROAPP

## Guía Completa de Instalación y Configuración

Esta guía te ayudará a configurar completamente la base de datos de AsthroApp en Supabase.

---

## 1. CREACIÓN DEL PROYECTO EN SUPABASE

### Paso 1.1: Crear Cuenta y Proyecto
1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto:
   - **Nombre del proyecto**: AsthroApp
   - **Database Password**: Guarda esta contraseña de forma segura
   - **Región**: Selecciona la más cercana a Colombia (preferiblemente `South America (São Paulo)`)
4. Espera a que el proyecto se inicialice (puede tomar 2-3 minutos)

### Paso 1.2: Obtener Credenciales
Una vez creado el proyecto, ve a **Settings** > **API** y copia:
- **Project URL** (API URL)
- **anon/public key** (API Key pública)
- **service_role key** (API Key privada - solo para backend)

---

## 2. EJECUTAR EL ESQUEMA DE BASE DE DATOS

### Paso 2.1: Abrir el Editor SQL
1. En el panel izquierdo de Supabase, haz clic en **SQL Editor**
2. Haz clic en **New Query**

### Paso 2.2: Ejecutar el Script
1. Copia todo el contenido del archivo `schema.sql`
2. Pégalo en el editor SQL
3. Haz clic en **Run** (o presiona Ctrl/Cmd + Enter)
4. Verifica que aparezca el mensaje: "Esquema de base de datos de AsthroApp creado exitosamente"

### Paso 2.3: Verificar Tablas Creadas
1. Ve a **Table Editor** en el panel izquierdo
2. Deberías ver todas las tablas creadas:
   - users
   - categories
   - products
   - services
   - appointments
   - orders
   - sales
   - suppliers
   - supplies
   - Y todas las demás...

---

## 3. CONFIGURACIÓN DE AUTENTICACIÓN

### Paso 3.1: Habilitar Proveedores de Autenticación

#### Email/Password (Ya habilitado por defecto)
1. Ve a **Authentication** > **Providers**
2. Verifica que **Email** esté habilitado
3. Configuración recomendada:
   - ✅ Enable email confirmations (opcional - para producción)
   - ✅ Enable secure password change
   - Minimum password length: 8

#### Google OAuth (Opcional - para Google Calendar)
1. Ve a **Authentication** > **Providers**
2. Habilita **Google**
3. Necesitarás crear credenciales OAuth en Google Cloud Console:
   - Ve a [Google Cloud Console](https://console.cloud.google.com)
   - Crea un nuevo proyecto o selecciona uno existente
   - Habilita Google Calendar API
   - Ve a **Credentials** > **Create Credentials** > **OAuth 2.0 Client ID**
   - Tipo de aplicación: **Web application**
   - Authorized redirect URIs: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Copia el **Client ID** y **Client Secret**
4. Vuelve a Supabase y pega las credenciales en el proveedor de Google

### Paso 3.2: Configurar URLs de Redirección
1. Ve a **Authentication** > **URL Configuration**
2. Configura las siguientes URLs:
   - **Site URL**: `http://localhost:3000` (desarrollo) o tu dominio en producción
   - **Redirect URLs**: Añade las siguientes URLs permitidas:
     - `http://localhost:3000`
     - `http://localhost:3000/auth/callback`
     - `https://tu-dominio.com` (producción)
     - `https://tu-dominio.com/auth/callback` (producción)

### Paso 3.3: Configurar Email Templates (Opcional pero recomendado)
1. Ve a **Authentication** > **Email Templates**
2. Personaliza los siguientes templates con los colores del salón (rosado/morado):

#### Confirm Signup
```html
<h2>¡Bienvenida a AsthroApp!</h2>
<p>Hola,</p>
<p>Gracias por registrarte en el Salón de Belleza Astrid Eugenia Hoyos.</p>
<p>Haz clic en el enlace para confirmar tu correo electrónico:</p>
<p><a href="{{ .ConfirmationURL }}" style="background: #E91E63; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Confirmar Email</a></p>
```

#### Reset Password
```html
<h2>Recuperación de Contraseña</h2>
<p>Hola,</p>
<p>Recibimos una solicitud para restablecer tu contraseña en AsthroApp.</p>
<p>Haz clic en el enlace para crear una nueva contraseña:</p>
<p><a href="{{ .ConfirmationURL }}" style="background: #9C27B0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a></p>
<p>Si no solicitaste esto, puedes ignorar este correo.</p>
```

---

## 4. CONFIGURACIÓN DE ROW LEVEL SECURITY (RLS)

El esquema ya incluye todas las políticas RLS necesarias. Para verificar:

1. Ve a **Authentication** > **Policies**
2. Selecciona cualquier tabla (ej: `users`, `products`, `appointments`)
3. Deberías ver las políticas configuradas automáticamente

### Políticas Clave Implementadas:
- ✅ Los clientes solo ven sus propios pedidos y citas
- ✅ Los administradores y asistentes tienen acceso completo
- ✅ Los productos y servicios son públicos (solo lectura)
- ✅ Los usuarios solo pueden editar su propio perfil
- ✅ Solo el staff puede acceder a módulos administrativos

---

## 5. CREAR USUARIO ADMINISTRADOR INICIAL

### Paso 5.1: Registrar Usuario desde la Aplicación
1. Ejecuta tu aplicación AsthroApp
2. Regístrate con un email y contraseña

### Paso 5.2: Convertir a Administrador
1. Ve a **Table Editor** > **users**
2. Busca el usuario que acabas de crear
3. Edita el campo `role` y cámbialo de `'cliente'` a `'administrador'`
4. Guarda los cambios

### Alternativa: Crear Usuario Administrador desde SQL
```sql
-- Inserta un usuario administrador directamente (después de registrarlo en auth)
-- Primero regístralo normalmente desde la app, luego ejecuta:
UPDATE public.users 
SET role = 'administrador' 
WHERE email = 'admin@asthroapp.com';
```

---

## 6. CONFIGURACIÓN DE STORAGE (para imágenes)

### Paso 6.1: Crear Buckets
1. Ve a **Storage** en el panel izquierdo
2. Crea los siguientes buckets públicos:

#### Bucket: `products`
- **Name**: products
- **Public**: ✅ Yes
- **Allowed MIME types**: image/jpeg, image/png, image/webp
- **Max file size**: 5 MB

#### Bucket: `services`
- **Name**: services
- **Public**: ✅ Yes
- **Allowed MIME types**: image/jpeg, image/png, image/webp
- **Max file size**: 5 MB

#### Bucket: `avatars`
- **Name**: avatars
- **Public**: ✅ Yes
- **Allowed MIME types**: image/jpeg, image/png, image/webp
- **Max file size**: 2 MB

#### Bucket: `categories`
- **Name**: categories
- **Public**: ✅ Yes
- **Allowed MIME types**: image/jpeg, image/png, image/webp
- **Max file size**: 3 MB

### Paso 6.2: Configurar Políticas de Storage
Para cada bucket, crea las siguientes políticas:

#### Política de Lectura (todos pueden ver)
```sql
-- Ejecuta esto para cada bucket (cambia 'products' por el nombre del bucket)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'products' );
```

#### Política de Escritura (solo administradores)
```sql
-- Para cada bucket
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'products' AND
    (auth.role() = 'authenticated') AND
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
    )
);
```

---

## 7. VARIABLES DE ENTORNO EN LA APLICACIÓN

Crea un archivo `.env.local` en la raíz de tu proyecto con las siguientes variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publica-anon

# Solo para operaciones de servidor (si usas Next.js API routes)
SUPABASE_SERVICE_ROLE_KEY=tu-clave-privada-service-role

# Google Calendar (Opcional - si implementas integración)
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret

# Configuración del Salón
NEXT_PUBLIC_SALON_NAME="Salón de Belleza Astrid Eugenia Hoyos"
NEXT_PUBLIC_SALON_ADDRESS="Cll 55 #42-16"
NEXT_PUBLIC_SALON_CITY="Medellín"
NEXT_PUBLIC_SALON_PHONE="+57 300 123 4567"
```

---

## 8. CÓDIGO DE INTEGRACIÓN EN LA APLICACIÓN

### Paso 8.1: Instalar Cliente de Supabase
```bash
npm install @supabase/supabase-js
```

### Paso 8.2: Crear Cliente de Supabase
Crea un archivo `/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos de base de datos (puedes generarlos automáticamente)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'administrador' | 'asistente' | 'cliente';
          phone: string | null;
          // ... otros campos
        };
      };
      // ... otras tablas
    };
  };
};
```

---

## 9. FUNCIONES DE AUTENTICACIÓN

### Registro de Usuario
```typescript
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });
  
  return { data, error };
}
```

### Inicio de Sesión
```typescript
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
}
```

### Cerrar Sesión
```typescript
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}
```

### Obtener Usuario Actual
```typescript
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (!user) return { user: null, profile: null, error };
  
  // Obtener perfil completo
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return { user, profile, error: profileError };
}
```

### Recuperación de Contraseña
```typescript
export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  
  return { data, error };
}
```

### Actualizar Contraseña
```typescript
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  
  return { data, error };
}
```

---

## 10. MANEJO DE ROLES Y PERMISOS

### Hook para Verificar Rol
```typescript
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export function useUserRole() {
  const [role, setRole] = useState<'administrador' | 'asistente' | 'cliente' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        setRole(profile?.role || null);
      }
      
      setLoading(false);
    }
    
    fetchRole();
    
    // Suscribirse a cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchRole();
    });
    
    return () => subscription.unsubscribe();
  }, []);

  return { role, loading, isAdmin: role === 'administrador', isStaff: role === 'administrador' || role === 'asistente' };
}
```

### Redirección Basada en Rol
```typescript
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUserRole } from './useUserRole';

export function useAdminRedirect() {
  const router = useRouter();
  const { role, loading } = useUserRole();

  useEffect(() => {
    if (!loading && role === 'administrador') {
      // Redirigir automáticamente al panel admin
      router.push('/admin');
    }
  }, [role, loading, router]);

  return { role, loading };
}
```

---

## 11. REALTIME (OPCIONAL - para notificaciones en tiempo real)

### Habilitar Realtime en Tablas
```sql
-- Ejecuta esto en SQL Editor para habilitar realtime en tablas específicas
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### Suscribirse a Cambios
```typescript
// Ejemplo: Escuchar nuevas citas
const subscription = supabase
  .channel('appointments-channel')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'appointments',
    },
    (payload) => {
      console.log('Nueva cita creada:', payload.new);
      // Actualizar UI, mostrar notificación, etc.
    }
  )
  .subscribe();

// No olvides cleanup
return () => {
  subscription.unsubscribe();
};
```

---

## 12. INTEGRACIÓN CON GOOGLE CALENDAR (OPCIONAL)

### Paso 12.1: Habilitar Google Calendar API
1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** > **Library**
4. Busca "Google Calendar API" y habilítala

### Paso 12.2: Configurar Scopes
En la configuración de OAuth, añade los siguientes scopes:
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/calendar`

### Paso 12.3: Código de Integración
```typescript
// Crear evento en Google Calendar al crear cita
export async function createCalendarEvent(appointment: any) {
  // Obtener token de acceso del usuario
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.provider_token) {
    throw new Error('No hay token de Google disponible');
  }

  const event = {
    summary: `Cita - ${appointment.services.join(', ')}`,
    description: `Cita en Salón Astrid Eugenia Hoyos\nServicios: ${appointment.services.join(', ')}`,
    start: {
      dateTime: `${appointment.date}T${appointment.start_time}`,
      timeZone: 'America/Bogota',
    },
    end: {
      dateTime: `${appointment.date}T${appointment.end_time}`,
      timeZone: 'America/Bogota',
    },
    location: 'Cll 55 #42-16, Medellín',
  };

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.provider_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  const data = await response.json();
  return data.id; // Guardar este ID en el campo google_calendar_event_id
}
```

---

## 13. SEGURIDAD Y MEJORES PRÁCTICAS

### ✅ Implementado en el Esquema
- Row Level Security (RLS) habilitado en todas las tablas
- Políticas de acceso basadas en roles
- Triggers para auditoría
- Validaciones a nivel de base de datos
- Encriptación de contraseñas (manejada por Supabase Auth)

### 🔒 Recomendaciones Adicionales
1. **Nunca expongas** la `service_role_key` en el frontend
2. **Usa HTTPS** en producción siempre
3. **Habilita 2FA** para cuentas de administrador
4. **Configura límites de rate limiting** en Supabase Dashboard
5. **Haz backups regulares** de la base de datos (Settings > Database > Backups)
6. **Monitorea logs** regularmente (Logs > Postgres Logs)

---

## 14. TESTING Y VERIFICACIÓN

### Verificar que Todo Funciona
Ejecuta estas consultas en SQL Editor para verificar:

```sql
-- Verificar que las tablas se crearon
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verificar tipos enum
SELECT typname 
FROM pg_type 
WHERE typtype = 'e'
ORDER BY typname;

-- Verificar triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar funciones
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

---

## 15. TROUBLESHOOTING

### Problema: No puedo iniciar sesión como administrador
**Solución**: Verifica que el campo `role` en la tabla `users` esté configurado como `'administrador'`

### Problema: Las imágenes no se cargan
**Solución**: Verifica que los buckets de Storage estén públicos y que las políticas estén configuradas correctamente

### Problema: Error "insufficient_privileges"
**Solución**: Verifica las políticas RLS y asegúrate de que el usuario tenga el rol correcto

### Problema: Las políticas RLS bloquean todo
**Solución**: Temporalmente puedes deshabilitar RLS para debugging:
```sql
ALTER TABLE nombre_tabla DISABLE ROW LEVEL SECURITY;
-- Recuerda habilitarlo de nuevo después:
ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;
```

---

## 16. PRÓXIMOS PASOS

Una vez completada la configuración:

1. ✅ Crea un usuario administrador
2. ✅ Prueba el registro e inicio de sesión
3. ✅ Verifica que el administrador sea redirigido al panel admin
4. ✅ Crea categorías y productos de prueba
5. ✅ Crea servicios de prueba
6. ✅ Configura los horarios del salón
7. ✅ Prueba el sistema de citas
8. ✅ Prueba el carrito de compras
9. ✅ Configura las plantillas de email
10. ✅ (Opcional) Integra con Google Calendar

---

## 17. RECURSOS ADICIONALES

- [Documentación Oficial de Supabase](https://supabase.com/docs)
- [Guía de Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [API Reference](https://supabase.com/docs/reference/javascript/introduction)
- [Realtime](https://supabase.com/docs/guides/realtime)
- [Storage](https://supabase.com/docs/guides/storage)

---

## SOPORTE

Si tienes problemas con la configuración:
1. Revisa los logs de Supabase (Logs > Postgres Logs)
2. Verifica la documentación oficial
3. Revisa este documento de configuración paso a paso
4. Consulta los ejemplos de código proporcionados

---

**¡Tu base de datos AsthroApp está lista para usar!** 🎉💜💗
