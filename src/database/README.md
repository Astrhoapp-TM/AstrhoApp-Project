# 💜 BASE DE DATOS ASTHROAPP 💗

## Salón de Belleza Astrid Eugenia Hoyos - Medellín

**Ubicación**: Cll 55 #42-16, Medellín
**Tecnología**: Supabase (PostgreSQL) + Row Level Security

---

## 📚 ÍNDICE

1. [Descripción General](#descripción-general)
2. [Archivos Incluidos](#archivos-incluidos)
3. [Instalación Rápida](#instalación-rápida)
4. [Características Principales](#características-principales)
5. [Estructura de la Base de Datos](#estructura-de-la-base-de-datos)
6. [Sistema de Autenticación](#sistema-de-autenticación)
7. [Roles y Permisos](#roles-y-permisos)
8. [Seguridad (RLS)](#seguridad-rls)
9. [API y Funciones](#api-y-funciones)
10. [Troubleshooting](#troubleshooting)

---

## 📖 DESCRIPCIÓN GENERAL

AsthroApp es una aplicación web completa para la gestión integral de un salón de belleza que incluye:

- ✅ **Sistema de Autenticación** con roles (administrador, asistente, cliente)
- ✅ **Tienda de Productos** con carrito de compras (recogida en tienda)
- ✅ **Sistema de Agendamiento** de citas con selección múltiple de servicios
- ✅ **Panel Administrativo** completo para gestionar todas las operaciones
- ✅ **Gestión de Inventario** de productos y suministros
- ✅ **Control de Ventas y Compras** con reportes
- ✅ **Gestión de Proveedores** y entregas
- ✅ **Dashboard Interactivo** con estadísticas en tiempo real
- ✅ **Integración con Google Calendar** (opcional)

---

## 📁 ARCHIVOS INCLUIDOS

```
/database/
├── README.md                    # Este archivo - guía principal
├── schema.sql                   # Esquema completo de la base de datos
├── sample_data.sql             # Datos de ejemplo para pruebas
├── SUPABASE_SETUP.md           # Guía detallada de configuración
└── DATABASE_DIAGRAM.md         # Diagrama y documentación técnica
```

### 📄 Descripción de Archivos

#### `schema.sql` (Archivo Principal)
- **Contenido**: Esquema completo de 28 tablas con relaciones
- **Incluye**: 
  - Tipos enumerados (ENUMS)
  - Tablas con constraints
  - Índices optimizados
  - Triggers automáticos
  - Funciones de utilidad
  - Políticas RLS completas
  - Vistas útiles
  - Configuración inicial
- **Líneas**: ~2000+
- **Ejecutar**: Una sola vez al crear el proyecto

#### `sample_data.sql`
- **Contenido**: Datos de prueba realistas
- **Incluye**:
  - 8 categorías de productos
  - 31 servicios del salón
  - 17 productos de ejemplo
  - 4 proveedores
  - 8 suministros
- **Ejecutar**: Después del schema.sql

#### `SUPABASE_SETUP.md`
- **Contenido**: Guía paso a paso completa
- **Incluye**:
  - Configuración de Supabase desde cero
  - Configuración de autenticación
  - Configuración de Storage
  - Variables de entorno
  - Código de integración
  - Google Calendar setup
  - Troubleshooting

#### `DATABASE_DIAGRAM.md`
- **Contenido**: Documentación técnica detallada
- **Incluye**:
  - Diagrama visual completo (ASCII)
  - Descripción de cada tabla
  - Todas las relaciones explicadas
  - Tipos de datos
  - Campos de identidad
  - Ejemplos de queries

---

## ⚡ INSTALACIÓN RÁPIDA

### Prerrequisitos
- Cuenta en [Supabase](https://supabase.com)
- Proyecto creado en Supabase

### Pasos Rápidos

1. **Ejecutar el esquema**
   ```
   - Abre Supabase Dashboard
   - Ve a SQL Editor
   - Copia y pega el contenido de schema.sql
   - Ejecuta (Run)
   ```

2. **Cargar datos de ejemplo** (opcional)
   ```
   - En SQL Editor
   - Copia y pega el contenido de sample_data.sql
   - Ejecuta (Run)
   ```

3. **Configurar variables de entorno**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu-url-de-proyecto
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon
   ```

4. **Crear usuario administrador**
   ```
   - Regístrate desde la aplicación
   - En Supabase: Table Editor > users
   - Edita tu usuario: role = 'administrador'
   ```

5. **¡Listo!** 🎉

Para instrucciones detalladas, consulta `SUPABASE_SETUP.md`.

---

## 🌟 CARACTERÍSTICAS PRINCIPALES

### 1. Autenticación y Usuarios
- Registro con email/password
- Login seguro con Supabase Auth
- Recuperación de contraseña
- Roles: administrador, asistente, cliente
- Perfiles extendidos con información adicional

### 2. Gestión de Productos
- Catálogo de productos con categorías
- Control de inventario en tiempo real
- Alertas de stock bajo
- Historial de movimientos
- Productos destacados
- Búsqueda y filtros

### 3. Sistema de Citas
- Agenda visual de disponibilidad
- Selección múltiple de servicios
- Cálculo automático de duración y precio
- Estados de cita (pendiente, confirmada, completada, etc.)
- Integración con Google Calendar (opcional)
- Recordatorios automáticos

### 4. Carrito y Pedidos
- Carrito de compras persistente
- Pedidos para recoger en tienda física
- Estados de pedido rastreables
- Notificaciones de estado
- Historial de pedidos

### 5. Panel Administrativo
- Dashboard con métricas en tiempo real
- Gestión de usuarios y roles
- Gestión de productos e inventario
- Gestión de servicios
- Gestión de citas
- Gestión de pedidos
- Registro de ventas
- Gestión de compras a proveedores
- Gestión de suministros
- Gestión de horarios
- Reportes y estadísticas

### 6. Gestión de Proveedores
- Registro de proveedores
- Historial de compras
- Entregas y recepciones
- Alertas de suministros bajos

### 7. Ventas y Reportes
- Registro de ventas (productos y servicios)
- Múltiples métodos de pago
- Reportes por período
- Estadísticas de clientes
- Top clientes y productos

---

## 🗂️ ESTRUCTURA DE LA BASE DE DATOS

### Resumen de Tablas

#### 📊 Total: 28 Tablas

**Autenticación y Usuarios** (3)
- `users` - Perfiles de usuario
- `clients` - Información extendida de clientes
- `password_recovery_tokens` - Tokens de recuperación

**Catálogos** (3)
- `categories` - Categorías de productos
- `services` - Servicios del salón
- `schedules` - Horarios de atención

**Productos** (2)
- `products` - Productos para venta
- `inventory_movements` - Movimientos de inventario

**Proveedores** (4)
- `suppliers` - Proveedores
- `supplies` - Insumos del salón
- `supply_alerts` - Alertas de stock
- `supply_deliveries` - Entregas

**Compras** (3)
- `purchases` - Órdenes de compra
- `purchase_items` - Detalle de compras
- `supply_delivery_items` - Items de entregas

**Ventas** (4)
- `orders` - Pedidos de clientes
- `order_items` - Detalle de pedidos
- `sales` - Registro de ventas
- `sale_items` - Detalle de ventas

**Citas** (2)
- `appointments` - Citas agendadas
- `appointment_services` - Servicios por cita (N:M)

**Otros** (5)
- `cart` - Carrito de compras
- `reviews` - Reseñas de servicios
- `settings` - Configuración del sistema
- `audit_log` - Auditoría de cambios
- `notifications` - Notificaciones

### Relaciones Principales

```
users → clients (1:1)
users → appointments (1:N)
users → orders (1:N)
categories → products (1:N)
appointments ↔ services (N:M)
suppliers → supplies (1:N)
purchases → purchase_items (1:N)
orders → order_items (1:N)
sales → sale_items (1:N)
```

Para el diagrama completo, consulta `DATABASE_DIAGRAM.md`.

---

## 🔐 SISTEMA DE AUTENTICACIÓN

### Flujo de Autenticación

```
1. Usuario se registra
   └─> Crea cuenta en auth.users (Supabase Auth)
       └─> Trigger automático crea perfil en public.users
           └─> Role por defecto: 'cliente'

2. Usuario inicia sesión
   └─> Supabase Auth valida credenciales
       └─> Retorna JWT token
           └─> App obtiene perfil de public.users
               └─> Redirecciona según role:
                   - administrador → /admin
                   - asistente → /admin (limitado)
                   - cliente → /home
```

### Campos de Identity

**En auth.users (Supabase)**
- `id` (UUID) - Identificador único
- `email` - Email único
- `encrypted_password` - Contraseña encriptada
- `email_confirmed_at` - Confirmación de email
- `last_sign_in_at` - Último acceso

**En public.users (Extendido)**
- `id` (UUID FK) - Referencia a auth.users
- `email` - Email (duplicado para facilidad)
- `full_name` - Nombre completo
- `role` - Rol del usuario (ENUM)
- `phone` - Teléfono
- `address` - Dirección
- `is_active` - Estado activo/inactivo

### Recuperación de Contraseña

1. Usuario solicita recuperación
2. Se genera token único en `password_recovery_tokens`
3. Se envía email con enlace
4. Usuario hace clic y actualiza contraseña
5. Token se marca como usado

---

## 👥 ROLES Y PERMISOS

### Rol: ADMINISTRADOR

**Acceso Total al Sistema**

✅ Panel Administrativo Completo:
- Dashboard con todas las métricas
- Gestión de usuarios (crear, editar, eliminar, cambiar roles)
- Gestión de productos e inventario
- Gestión de servicios
- Gestión de citas (ver todas, editar, cancelar)
- Gestión de pedidos (ver todos, cambiar estados)
- Registro de ventas
- Gestión de compras y proveedores
- Gestión de suministros
- Gestión de horarios
- Configuración del sistema

✅ Vista de Cliente:
- Ver catálogo
- Agendar citas propias
- Hacer pedidos

**Nota**: Los administradores son redirigidos automáticamente al panel admin al iniciar sesión.

---

### Rol: ASISTENTE

**Acceso Limitado al Panel Admin**

✅ Puede:
- Ver dashboard (métricas limitadas)
- Gestionar citas
- Gestionar pedidos
- Registrar ventas
- Gestionar productos e inventario
- Ver proveedores y suministros
- Gestionar clientes

❌ No puede:
- Gestionar usuarios ni cambiar roles
- Modificar configuración del sistema
- Eliminar registros importantes
- Acceder a reportes financieros completos

---

### Rol: CLIENTE

**Solo Vista de Cliente**

✅ Puede:
- Ver catálogo de productos
- Agregar productos al carrito
- Crear pedidos
- Ver sus pedidos
- Agendar citas
- Ver sus citas
- Editar su perfil
- Dejar reseñas

❌ No puede:
- Acceder al panel administrativo
- Ver información de otros clientes
- Ver datos de inventario o proveedores
- Cambiar precios o estados

---

## 🛡️ SEGURIDAD (RLS)

### Row Level Security

Todas las tablas tienen RLS habilitado con políticas específicas:

#### Ejemplo: Tabla `orders`

```sql
-- Los clientes solo ven sus propios pedidos
CREATE POLICY "clients_view_own_orders"
    ON orders FOR SELECT
    USING (customer_id = auth.uid());

-- Los administradores ven todos los pedidos
CREATE POLICY "admins_view_all_orders"
    ON orders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
        )
    );

-- Los clientes pueden crear sus propios pedidos
CREATE POLICY "clients_create_orders"
    ON orders FOR INSERT
    WITH CHECK (customer_id = auth.uid());
```

#### Políticas Implementadas

**Públicas (lectura sin autenticación)**
- `categories` (solo activas)
- `services` (solo activos)
- `products` (solo activos)
- `schedules` (solo activos)

**Privadas (requieren autenticación)**
- `users` - Solo su propio perfil
- `orders` - Solo sus propios pedidos
- `appointments` - Solo sus propias citas
- `cart` - Solo su propio carrito
- `reviews` - Pueden crear, ver solo aprobadas

**Solo Staff**
- `suppliers`
- `supplies`
- `purchases`
- `sales`
- `clients` (info extendida)

---

## 🔧 API Y FUNCIONES

### Funciones Disponibles

#### `get_customer_upcoming_appointments(customer_uuid)`
Obtiene las próximas citas de un cliente

```sql
SELECT * FROM get_customer_upcoming_appointments('uuid-del-cliente');
```

#### `check_appointment_availability(date, start_time, end_time)`
Verifica si hay disponibilidad para una cita

```sql
SELECT check_appointment_availability('2025-11-01', '10:00', '11:30');
-- Retorna: true/false
```

#### `calculate_cart_total(customer_uuid)`
Calcula el total del carrito de un cliente

```sql
SELECT calculate_cart_total('uuid-del-cliente');
-- Retorna: DECIMAL (total en pesos)
```

#### `get_dashboard_stats(start_date, end_date)`
Obtiene estadísticas para el dashboard

```sql
SELECT get_dashboard_stats('2025-10-01', '2025-10-31');
-- Retorna: JSON con estadísticas
```

### Triggers Automáticos

**Números de Orden Automáticos**
- `orders` → `ORD-YYYYMMDD-NNNN`
- `appointments` → `APT-YYYYMMDD-NNNN`
- `sales` → `SAL-YYYYMMDD-NNNN`
- `purchases` → `PUR-YYYYMMDD-NNNN`
- `deliveries` → `DEL-YYYYMMDD-NNNN`

**Actualización de Timestamps**
- Todas las tablas actualizan `updated_at` automáticamente

**Gestión de Stock**
- Al crear `order_items` → Reduce stock de `products`
- Al recibir `purchase_items` → Aumenta stock de `supplies`

**Alertas de Stock Bajo**
- Al actualizar stock de `supplies` → Genera alertas si está bajo mínimo

**Estadísticas de Cliente**
- Al completar cita → Actualiza stats en `clients`

### Vistas Útiles

#### `low_stock_products`
Productos con stock bajo o agotado

```sql
SELECT * FROM low_stock_products;
```

#### `low_stock_supplies`
Suministros con stock bajo

```sql
SELECT * FROM low_stock_supplies;
```

#### `today_appointments`
Citas del día actual

```sql
SELECT * FROM today_appointments;
```

#### `today_sales`
Ventas del día actual

```sql
SELECT * FROM today_sales;
```

#### `top_clients`
Mejores clientes por gasto

```sql
SELECT * FROM top_clients LIMIT 10;
```

---

## 🔍 QUERIES ÚTILES

### Ver todos los usuarios por rol
```sql
SELECT role, COUNT(*) as cantidad
FROM users
GROUP BY role;
```

### Ver citas de hoy con detalles
```sql
SELECT 
    a.appointment_number,
    u.full_name as cliente,
    array_agg(s.name) as servicios,
    a.start_time,
    a.total_price,
    a.status
FROM appointments a
JOIN users u ON u.id = a.customer_id
LEFT JOIN appointment_services aps ON aps.appointment_id = a.id
LEFT JOIN services s ON s.id = aps.service_id
WHERE a.appointment_date = CURRENT_DATE
GROUP BY a.id, u.full_name
ORDER BY a.start_time;
```

### Ver ventas del mes
```sql
SELECT 
    DATE(sale_date) as fecha,
    COUNT(*) as cantidad_ventas,
    SUM(total) as total_vendido
FROM sales
WHERE EXTRACT(MONTH FROM sale_date) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM sale_date) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY DATE(sale_date)
ORDER BY fecha DESC;
```

### Ver productos más vendidos
```sql
SELECT 
    p.name,
    SUM(oi.quantity) as cantidad_vendida,
    SUM(oi.total) as total_vendido
FROM order_items oi
JOIN products p ON p.id = oi.product_id
GROUP BY p.name
ORDER BY cantidad_vendida DESC
LIMIT 10;
```

### Ver proveedores y total de compras
```sql
SELECT 
    s.name as proveedor,
    COUNT(p.id) as cantidad_compras,
    SUM(p.total) as total_comprado
FROM suppliers s
LEFT JOIN purchases p ON p.supplier_id = s.id
GROUP BY s.name
ORDER BY total_comprado DESC;
```

---

## ⚠️ TROUBLESHOOTING

### Problema: No puedo iniciar sesión

**Solución**:
1. Verifica que el email esté confirmado en auth.users
2. Verifica que exista el perfil en public.users
3. Verifica que `is_active = true`

### Problema: Usuario no tiene rol de administrador

**Solución**:
```sql
UPDATE public.users 
SET role = 'administrador' 
WHERE email = 'tu-email@ejemplo.com';
```

### Problema: Error de RLS "insufficient privileges"

**Solución**:
1. Verifica que estés autenticado (auth.uid() no es null)
2. Verifica las políticas RLS de la tabla
3. Temporalmente deshabilita RLS para debugging:
```sql
ALTER TABLE nombre_tabla DISABLE ROW LEVEL SECURITY;
```

### Problema: Stock negativo en productos

**Solución**:
El trigger ya previene esto, pero si ocurre:
```sql
-- Ver productos con stock negativo
SELECT * FROM products WHERE stock_quantity < 0;

-- Ajustar manualmente
UPDATE products SET stock_quantity = 0 WHERE stock_quantity < 0;
```

### Problema: Las citas se solapan

**Solución**:
Usa la función de verificación antes de insertar:
```sql
SELECT check_appointment_availability(
    '2025-11-01', 
    '10:00', 
    '11:30'
);
```

### Problema: Los números de orden no se generan

**Solución**:
```sql
-- Verificar que las secuencias existan
SELECT * FROM pg_sequences WHERE schemaname = 'public';

-- Reiniciar una secuencia si es necesario
ALTER SEQUENCE order_number_seq RESTART WITH 1;
```

---

## 📊 ESTADÍSTICAS DE LA BASE DE DATOS

```
Total de Tablas:           28
Total de Relaciones:       45+
Total de Índices:          25+
Total de Triggers:         15+
Total de Funciones:        10+
Total de Vistas:           5
Total de Políticas RLS:    35+
Total de ENUMs:            6
Líneas de Código SQL:      2000+
```

---

## 📞 SOPORTE Y CONTACTO

### Documentación
- `schema.sql` - Esquema completo
- `SUPABASE_SETUP.md` - Guía de configuración
- `DATABASE_DIAGRAM.md` - Documentación técnica
- `sample_data.sql` - Datos de ejemplo

### Recursos
- [Documentación de Supabase](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🎨 INFORMACIÓN DEL PROYECTO

**Proyecto**: AsthroApp
**Cliente**: Salón de Belleza Astrid Eugenia Hoyos
**Ubicación**: Cll 55 #42-16, Medellín, Colombia
**Colores**: Rosado (#E91E63) y Morado (#9C27B0)
**Tecnologías**: Supabase, PostgreSQL, Row Level Security
**Fecha**: Octubre 2025

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Configuración Inicial
- [ ] Crear proyecto en Supabase
- [ ] Ejecutar `schema.sql`
- [ ] Ejecutar `sample_data.sql` (opcional)
- [ ] Configurar variables de entorno
- [ ] Configurar Storage buckets

### Autenticación
- [ ] Habilitar Email/Password provider
- [ ] Configurar URLs de redirección
- [ ] Personalizar email templates
- [ ] (Opcional) Configurar Google OAuth

### Usuarios
- [ ] Crear primer usuario administrador
- [ ] Crear usuario asistente de prueba
- [ ] Crear usuarios cliente de prueba

### Datos Iniciales
- [ ] Verificar categorías
- [ ] Verificar servicios
- [ ] Verificar horarios
- [ ] Cargar productos reales
- [ ] Configurar proveedores

### Testing
- [ ] Probar registro de usuario
- [ ] Probar login con cada rol
- [ ] Probar crear cita
- [ ] Probar crear pedido
- [ ] Probar panel admin

### Producción
- [ ] Hacer backup de la base de datos
- [ ] Configurar dominio personalizado
- [ ] Habilitar confirmación de email
- [ ] Configurar límites de rate limiting
- [ ] Monitorear logs regularmente

---

## 🚀 ¡LISTO PARA USAR!

Tu base de datos AsthroApp está completamente configurada y lista para gestionar todas las operaciones del salón de belleza. 

**Próximos pasos**:
1. Integra la base de datos con tu aplicación frontend
2. Prueba todas las funcionalidades
3. Carga datos reales de productos y servicios
4. ¡Empieza a gestionar tu salón! 💜💗

---

**Desarrollado con 💜 para AsthroApp**
**Salón de Belleza Astrid Eugenia Hoyos - Medellín**
