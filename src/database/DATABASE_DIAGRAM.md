# DIAGRAMA DE BASE DE DATOS - ASTHROAPP

## Estructura Completa de Tablas y Relaciones

---

## 📋 ÍNDICE

1. [Resumen de Tablas](#resumen-de-tablas)
2. [Diagrama Visual](#diagrama-visual)
3. [Relaciones Detalladas](#relaciones-detalladas)
4. [Descripción de Tablas](#descripción-de-tablas)
5. [Campos Identity y Auth](#campos-identity-y-auth)

---

## RESUMEN DE TABLAS

### Total: 28 Tablas Principales

#### Autenticación y Usuarios (3 tablas)
- ✅ `users` - Usuarios del sistema
- ✅ `clients` - Información extendida de clientes
- ✅ `password_recovery_tokens` - Tokens de recuperación

#### Catálogos (3 tablas)
- ✅ `categories` - Categorías de productos
- ✅ `services` - Servicios del salón
- ✅ `schedules` - Horarios de atención

#### Productos e Inventario (2 tablas)
- ✅ `products` - Productos para venta
- ✅ `inventory_movements` - Movimientos de inventario

#### Proveedores y Suministros (4 tablas)
- ✅ `suppliers` - Proveedores
- ✅ `supplies` - Insumos del salón
- ✅ `supply_alerts` - Alertas de stock
- ✅ `supply_deliveries` - Entregas de suministros

#### Compras (3 tablas)
- ✅ `purchases` - Órdenes de compra
- ✅ `purchase_items` - Detalle de compras
- ✅ `supply_delivery_items` - Items de entregas

#### Ventas y Pedidos (4 tablas)
- ✅ `orders` - Pedidos de clientes
- ✅ `order_items` - Detalle de pedidos
- ✅ `sales` - Registro de ventas
- ✅ `sale_items` - Detalle de ventas

#### Citas (2 tablas)
- ✅ `appointments` - Citas agendadas
- ✅ `appointment_services` - Servicios por cita

#### Otros (5 tablas)
- ✅ `cart` - Carrito de compras
- ✅ `reviews` - Reseñas de servicios
- ✅ `settings` - Configuración del sistema
- ✅ `audit_log` - Auditoría de cambios
- ✅ `notifications` - Notificaciones

---

## DIAGRAMA VISUAL

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        ASTHROAPP DATABASE SCHEMA                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUTENTICACIÓN Y USUARIOS                            │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────┐
    │     auth.users           │  (Supabase Auth)
    │ ──────────────────────── │
    │ • id (UUID) PK           │
    │ • email                  │
    │ • encrypted_password     │
    │ • email_confirmed_at     │
    │ • created_at             │
    └──────────┬───────────────┘
               │ 1:1
               │
    ┌──────────▼───────────────┐         ┌──────────────────────────┐
    │   public.users           │         │ password_recovery_tokens │
    │ ──────────────────────── │         │ ──────────────────────── │
    │ • id (UUID) PK FK        │◄───1:N──┤ • id (UUID) PK           │
    │ • email                  │         │ • user_id FK             │
    │ • full_name              │         │ • token                  │
    │ • phone                  │         │ • expires_at             │
    │ • role (ENUM)            │         │ • used                   │
    │ • avatar_url             │         └──────────────────────────┘
    │ • address                │
    │ • city                   │
    │ • is_active              │
    └──────┬───────────────────┘
           │ 1:1 (role = cliente)
           │
    ┌──────▼───────────────────┐
    │   clients                │
    │ ──────────────────────── │
    │ • id (UUID) PK FK        │
    │ • birth_date             │
    │ • gender                 │
    │ • preferences            │
    │ • allergies              │
    │ • hair_type              │
    │ • total_appointments     │
    │ • total_spent            │
    │ • last_visit             │
    │ • loyalty_points         │
    │ • referral_code          │
    │ • referred_by FK         │
    └──────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        CATÁLOGOS Y CONFIGURACIÓN                             │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────┐         ┌──────────────────────────┐
    │   categories             │         │   schedules              │
    │ ──────────────────────── │         │ ──────────────────────── │
    │ • id (UUID) PK           │         │ • id (UUID) PK           │
    │ • name                   │         │ • day_of_week (ENUM)     │
    │ • description            │         │ • start_time             │
    │ • image_url              │         │ • end_time               │
    │ • is_active              │         │ • is_active              │
    │ • display_order          │         │ • max_appointments       │
    └──────────┬───────────────┘         │ • notes                  │
               │                         └──────────────────────────┘
               │
               │ 1:N                     ┌──────────────────────────┐
               │                         │   services               │
    ┌──────────▼───────────────┐         │ ──────────────────────── │
    │   products               │         │ • id (UUID) PK           │
    │ ──────────────────────── │         │ • name                   │
    │ • id (UUID) PK           │         │ • description            │
    │ • category_id FK         │         │ • price                  │
    │ • name                   │         │ • duration (minutos)     │
    │ • description            │         │ • image_url              │
    │ • brand                  │         │ • is_active              │
    │ • price                  │         │ • category               │
    │ • stock_quantity         │         │ • display_order          │
    │ • min_stock_level        │         └────────┬─────────────────┘
    │ • sku                    │                  │
    │ • barcode                │                  │
    │ • image_url              │                  │
    │ • is_active              │                  │
    │ • is_featured            │                  │
    └──────┬───────────────────┘                  │
           │                                      │
           │ 1:N                                  │
           │                                      │
    ┌──────▼───────────────────┐                  │
    │ inventory_movements      │                  │
    │ ──────────────────────── │                  │
    │ • id (UUID) PK           │                  │
    │ • product_id FK          │                  │
    │ • user_id FK             │                  │
    │ • movement_type (ENUM)   │                  │
    │ • quantity               │                  │
    │ • previous_stock         │                  │
    │ • new_stock              │                  │
    │ • reason                 │                  │
    │ • reference_id           │                  │
    │ • reference_type         │                  │
    └──────────────────────────┘                  │

┌─────────────────────────────────────────────────────────────────────────────┐
│                    PROVEEDORES Y SUMINISTROS                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────┐
    │   suppliers              │
    │ ──────────────────────── │
    │ • id (UUID) PK           │
    │ • name                   │
    │ • contact_name           │
    │ • email                  │
    │ • phone                  │
    │ • address                │
    │ • city                   │
    │ • tax_id (NIT)           │
    │ • payment_terms          │
    │ • is_active              │
    │ • rating                 │
    └──────┬───────────────────┘
           │
           │ 1:N
           │
    ┌──────▼───────────────────┐         ┌──────────────────────────┐
    │   supplies               │         │   supply_alerts          │
    │ ──────────────────────── │───1:N──►│ ──────────────────────── │
    │ • id (UUID) PK           │         │ • id (UUID) PK           │
    │ • supplier_id FK         │         │ • supply_id FK           │
    │ • name                   │         │ • alert_type (ENUM)      │
    │ • description            │         │ • message                │
    │ • category               │         │ • severity (ENUM)        │
    │ • unit_of_measure        │         │ • is_resolved            │
    │ • current_stock          │         │ • resolved_at            │
    │ • min_stock_level        │         │ • resolved_by FK         │
    │ • max_stock_level        │         └──────────────────────────┘
    │ • unit_price             │
    │ • sku                    │
    │ • location               │
    │ • is_active              │
    └──────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMPRAS A PROVEEDORES                               │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────┐
    │   purchases              │
    │ ──────────────────────── │
    │ • id (UUID) PK           │
    │ • purchase_number        │
    │ • supplier_id FK         │
    │ • user_id FK (registra)  │
    │ • purchase_date          │
    │ • expected_delivery_date │
    │ • status (ENUM)          │
    │ • subtotal               │
    │ • tax                    │
    │ • total                  │
    │ • payment_method (ENUM)  │
    │ • notes                  │
    └──────┬──────────┬────────┘
           │          │
           │ 1:N      │ 1:N
           │          │
    ┌──────▼──────────┴────────┐         ┌──────────────────────────┐
    │   purchase_items         │         │   supply_deliveries      │
    │ ──────────────────────── │         │ ──────────────────────── │
    │ • id (UUID) PK           │         │ • id (UUID) PK           │
    │ • purchase_id FK         │         │ • purchase_id FK         │
    │ • supply_id FK           │         │ • delivery_number        │
    │ • product_id FK          │         │ • delivery_date          │
    │ • item_type (ENUM)       │         │ • received_by FK         │
    │ • quantity               │         │ • status (ENUM)          │
    │ • unit_price             │         │ • notes                  │
    │ • subtotal               │         └────────┬─────────────────┘
    │ • total                  │                  │
    │ • received_quantity      │                  │ 1:N
    └──────────┬───────────────┘                  │
               │                          ┌───────▼──────────────────┐
               │                          │ supply_delivery_items    │
               │ 1:N                      │ ──────────────────────── │
               └──────────────────────────┤ • id (UUID) PK           │
                                          │ • delivery_id FK         │
                                          │ • purchase_item_id FK    │
                                          │ • quantity_delivered     │
                                          │ • quality_status (ENUM)  │
                                          │ • notes                  │
                                          └──────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         PEDIDOS Y VENTAS                                     │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌────────────────────────┐            ┌──────────────────────────┐
    │   users (cliente)      │            │   cart                   │
    │ ────────────────────── │──────1:N──►│ ──────────────────────── │
    │ • id (UUID) PK         │            │ • id (UUID) PK           │
    └──────┬─────────────────┘            │ • customer_id FK         │
           │                              │ • product_id FK          │
           │ 1:N                          │ • quantity               │
           │                              └──────────────────────────┘
    ┌──────▼─────────────────┐
    │   orders               │
    │ ────────────────────── │
    │ • id (UUID) PK         │
    │ • order_number         │
    │ • customer_id FK       │
    │ • status (ENUM)        │
    │ • order_date           │
    │ • pickup_date          │
    │ • subtotal             │
    │ • tax                  │
    │ • discount             │
    │ • total                │
    │ • payment_method (ENUM)│
    │ • payment_status       │
    │ • notes                │
    └──────┬─────────────────┘
           │
           │ 1:N
           │
    ┌──────▼─────────────────┐
    │   order_items          │
    │ ────────────────────── │
    │ • id (UUID) PK         │
    │ • order_id FK          │
    │ • product_id FK        │
    │ • quantity             │
    │ • unit_price           │
    │ • subtotal             │
    │ • discount             │
    │ • total                │
    └────────────────────────┘

    ┌──────────────────────────┐
    │   sales                  │
    │ ──────────────────────── │
    │ • id (UUID) PK           │
    │ • sale_number            │
    │ • customer_id FK         │
    │ • user_id FK (vendedor)  │
    │ • sale_date              │
    │ • sale_type (ENUM)       │
    │ • subtotal               │
    │ • tax                    │
    │ • discount               │
    │ • total                  │
    │ • payment_method (ENUM)  │
    │ • payment_status         │
    │ • order_id FK (opcional) │
    │ • appointment_id FK      │
    │ • notes                  │
    └──────┬───────────────────┘
           │
           │ 1:N
           │
    ┌──────▼───────────────────┐
    │   sale_items             │
    │ ──────────────────────── │
    │ • id (UUID) PK           │
    │ • sale_id FK             │
    │ • product_id FK          │
    │ • service_id FK          │
    │ • item_type (ENUM)       │
    │ • quantity               │
    │ • unit_price             │
    │ • subtotal               │
    │ • discount               │
    │ • total                  │
    └──────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        SISTEMA DE CITAS                                      │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌────────────────────────┐
    │   users (cliente)      │
    │ ────────────────────── │
    │ • id (UUID) PK         │
    └──────┬─────────────────┘
           │
           │ 1:N
           │
    ┌──────▼─────────────────┐         ┌──────────────────────────┐
    │   appointments         │         │   reviews                │
    │ ────────────────────── │───1:N──►│ ──────────────────────── │
    │ • id (UUID) PK         │         │ • id (UUID) PK           │
    │ • appointment_number   │         │ • customer_id FK         │
    │ • customer_id FK       │         │ • service_id FK          │
    │ • assigned_to FK       │         │ • appointment_id FK      │
    │ • appointment_date     │         │ • rating (1-5)           │
    │ • start_time           │         │ • comment                │
    │ • end_time             │         │ • is_approved            │
    │ • status (ENUM)        │         │ • approved_by FK         │
    │ • total_duration       │         └──────────────────────────┘
    │ • total_price          │
    │ • payment_method (ENUM)│
    │ • payment_status       │
    │ • google_calendar_id   │
    │ • customer_notes       │
    │ • admin_notes          │
    │ • reminder_sent        │
    │ • completed_at         │
    └──────┬─────────────────┘
           │
           │ 1:N
           │
    ┌──────▼─────────────────┐
    │ appointment_services   │  (Tabla Pivot - Relación N:M)
    │ ────────────────────── │
    │ • id (UUID) PK         │
    │ • appointment_id FK    │◄──────┐
    │ • service_id FK        │       │ N:M
    │ • price                │       │
    │ • duration             │   ┌───┴──────────────────────┐
    └────────────────────────┘   │   services               │
                                 │ ──────────────────────── │
                                 │ • id (UUID) PK           │
                                 │ • name                   │
                                 │ • price                  │
                                 │ • duration               │
                                 └──────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        SISTEMA Y AUDITORÍA                                   │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────┐         ┌──────────────────────────┐
    │   settings               │         │   notifications          │
    │ ──────────────────────── │         │ ──────────────────────── │
    │ • id (UUID) PK           │         │ • id (UUID) PK           │
    │ • key (UNIQUE)           │         │ • user_id FK             │
    │ • value                  │         │ • title                  │
    │ • description            │         │ • message                │
    │ • value_type (ENUM)      │         │ • type (ENUM)            │
    │ • is_public              │         │ • is_read                │
    └──────────────────────────┘         │ • action_url             │
                                         │ • related_id             │
    ┌──────────────────────────┐         │ • related_type           │
    │   audit_log              │         └──────────────────────────┘
    │ ──────────────────────── │
    │ • id (UUID) PK           │
    │ • user_id FK             │
    │ • action                 │
    │ • table_name             │
    │ • record_id              │
    │ • old_values (JSONB)     │
    │ • new_values (JSONB)     │
    │ • ip_address             │
    │ • user_agent             │
    └──────────────────────────┘
```

---

## RELACIONES DETALLADAS

### 1. USUARIOS Y AUTENTICACIÓN

#### users ↔ auth.users
- **Tipo**: 1:1 (One-to-One)
- **Relación**: `users.id` → `auth.users.id`
- **Descripción**: Cada usuario de Supabase Auth tiene un perfil extendido en users
- **Trigger**: Se crea automáticamente al registrarse un usuario

#### users → clients
- **Tipo**: 1:1 (One-to-One) *condicional*
- **Relación**: `clients.id` → `users.id`
- **Descripción**: Solo usuarios con rol 'cliente' tienen entrada en clients
- **Cascade**: ON DELETE CASCADE

#### users → password_recovery_tokens
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `password_recovery_tokens.user_id` → `users.id`
- **Descripción**: Un usuario puede tener múltiples tokens (histórico)

### 2. PRODUCTOS E INVENTARIO

#### categories → products
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `products.category_id` → `categories.id`
- **Descripción**: Una categoría agrupa múltiples productos
- **Cascade**: ON DELETE SET NULL

#### products → inventory_movements
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `inventory_movements.product_id` → `products.id`
- **Descripción**: Rastrea todos los movimientos de stock
- **Cascade**: ON DELETE CASCADE

#### products → cart
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `cart.product_id` → `products.id`
- **Cascade**: ON DELETE CASCADE

#### products → order_items
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `order_items.product_id` → `products.id`
- **Cascade**: ON DELETE SET NULL

### 3. PROVEEDORES Y SUMINISTROS

#### suppliers → supplies
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `supplies.supplier_id` → `suppliers.id`
- **Descripción**: Un proveedor suministra múltiples insumos
- **Cascade**: ON DELETE SET NULL

#### supplies → supply_alerts
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `supply_alerts.supply_id` → `supplies.id`
- **Descripción**: Alertas automáticas de stock bajo
- **Cascade**: ON DELETE CASCADE

### 4. COMPRAS

#### suppliers → purchases
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `purchases.supplier_id` → `suppliers.id`
- **Cascade**: ON DELETE SET NULL

#### users → purchases
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `purchases.user_id` → `users.id`
- **Descripción**: Registra quién hizo la compra
- **Cascade**: ON DELETE SET NULL

#### purchases → purchase_items
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `purchase_items.purchase_id` → `purchases.id`
- **Cascade**: ON DELETE CASCADE

#### supplies → purchase_items
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `purchase_items.supply_id` → `supplies.id`
- **Descripción**: Solo si item_type = 'supply'
- **Cascade**: ON DELETE SET NULL

#### products → purchase_items
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `purchase_items.product_id` → `products.id`
- **Descripción**: Solo si item_type = 'product'
- **Cascade**: ON DELETE SET NULL

#### purchases → supply_deliveries
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `supply_deliveries.purchase_id` → `purchases.id`
- **Cascade**: ON DELETE CASCADE

#### supply_deliveries → supply_delivery_items
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `supply_delivery_items.delivery_id` → `supply_deliveries.id`
- **Cascade**: ON DELETE CASCADE

#### purchase_items → supply_delivery_items
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `supply_delivery_items.purchase_item_id` → `purchase_items.id`
- **Cascade**: ON DELETE CASCADE

### 5. PEDIDOS

#### users → orders
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `orders.customer_id` → `users.id`
- **Descripción**: Cliente que hace el pedido
- **Cascade**: ON DELETE SET NULL

#### orders → order_items
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `order_items.order_id` → `orders.id`
- **Cascade**: ON DELETE CASCADE

### 6. VENTAS

#### users → sales (como cliente)
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `sales.customer_id` → `users.id`
- **Cascade**: ON DELETE SET NULL

#### users → sales (como vendedor)
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `sales.user_id` → `users.id`
- **Cascade**: ON DELETE SET NULL

#### orders → sales
- **Tipo**: 1:1 (One-to-One) *opcional*
- **Relación**: `sales.order_id` → `orders.id`
- **Descripción**: Venta generada desde un pedido
- **Cascade**: ON DELETE SET NULL

#### appointments → sales
- **Tipo**: 1:1 (One-to-One) *opcional*
- **Relación**: `sales.appointment_id` → `appointments.id`
- **Descripción**: Venta generada desde una cita
- **Cascade**: ON DELETE SET NULL

#### sales → sale_items
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `sale_items.sale_id` → `sales.id`
- **Cascade**: ON DELETE CASCADE

### 7. CITAS

#### users → appointments (como cliente)
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `appointments.customer_id` → `users.id`
- **Cascade**: ON DELETE CASCADE

#### users → appointments (como estilista)
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `appointments.assigned_to` → `users.id`
- **Cascade**: ON DELETE SET NULL

#### appointments → appointment_services
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `appointment_services.appointment_id` → `appointments.id`
- **Cascade**: ON DELETE CASCADE

#### services → appointment_services
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `appointment_services.service_id` → `services.id`
- **Cascade**: ON DELETE CASCADE

#### appointments ↔ services
- **Tipo**: N:M (Many-to-Many) a través de appointment_services
- **Descripción**: Una cita puede tener múltiples servicios

### 8. RESEÑAS

#### users → reviews
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `reviews.customer_id` → `users.id`
- **Cascade**: ON DELETE CASCADE

#### services → reviews
- **Tipo**: 1:N (One-to-Many)
- **Relación**: `reviews.service_id` → `services.id`
- **Cascade**: ON DELETE CASCADE

#### appointments → reviews
- **Tipo**: 1:1 (One-to-One) *opcional*
- **Relación**: `reviews.appointment_id` → `appointments.id`
- **Cascade**: ON DELETE SET NULL

---

## DESCRIPCIÓN DE TABLAS

### TABLA: users
**Descripción**: Perfil completo de usuarios del sistema
**Campos Identity/Auth**: 
- `id` - UUID del usuario de Supabase Auth (PRIMARY KEY)
- Se crea automáticamente mediante trigger al registrarse en auth.users

**Campos principales**:
- `email` - Email único del usuario
- `full_name` - Nombre completo
- `role` - Rol del usuario (administrador | asistente | cliente)
- `is_active` - Si el usuario está activo

**Relaciones**:
- Extiende `auth.users` (1:1)
- Tiene `clients` (1:1 si role = cliente)
- Tiene múltiples `orders`, `appointments`, `sales`

---

### TABLA: categories
**Descripción**: Categorías para organizar productos
**Campos principales**:
- `id` - UUID (PRIMARY KEY)
- `name` - Nombre único de la categoría
- `is_active` - Si está activa para mostrar
- `display_order` - Orden de visualización

**Relaciones**:
- Tiene múltiples `products` (1:N)

---

### TABLA: products
**Descripción**: Productos para venta en la tienda
**Campos principales**:
- `id` - UUID (PRIMARY KEY)
- `category_id` - Referencia a categoría
- `name` - Nombre del producto
- `price` - Precio de venta
- `stock_quantity` - Cantidad en inventario
- `min_stock_level` - Nivel mínimo de stock (alerta)
- `sku` - Código único del producto

**Relaciones**:
- Pertenece a `categories` (N:1)
- Tiene múltiples `inventory_movements` (1:N)
- Está en múltiples `cart` (1:N)
- Está en múltiples `order_items` (1:N)

---

### TABLA: services
**Descripción**: Servicios ofrecidos por el salón
**Campos principales**:
- `id` - UUID (PRIMARY KEY)
- `name` - Nombre del servicio
- `price` - Precio del servicio
- `duration` - Duración en minutos
- `is_active` - Si está activo

**Relaciones**:
- Está en múltiples `appointment_services` (N:M con appointments)
- Tiene múltiples `reviews` (1:N)
- Está en múltiples `sale_items` (1:N)

---

### TABLA: appointments
**Descripción**: Citas agendadas con clientes
**Campos principales**:
- `id` - UUID (PRIMARY KEY)
- `appointment_number` - Número único generado automáticamente
- `customer_id` - Cliente que agenda
- `assigned_to` - Estilista asignado
- `appointment_date` - Fecha de la cita
- `start_time` / `end_time` - Hora de inicio y fin
- `status` - Estado (pendiente | confirmada | completada | etc.)
- `total_price` - Precio total de servicios
- `google_calendar_event_id` - ID del evento en Google Calendar

**Relaciones**:
- Pertenece a `users` como cliente (N:1)
- Asignada a `users` como estilista (N:1)
- Tiene múltiples `services` a través de `appointment_services` (N:M)
- Puede tener `reviews` (1:N)
- Puede generar `sales` (1:1)

---

### TABLA: orders
**Descripción**: Pedidos de productos (para recoger en tienda)
**Campos principales**:
- `id` - UUID (PRIMARY KEY)
- `order_number` - Número único generado automáticamente
- `customer_id` - Cliente que hace el pedido
- `status` - Estado del pedido (pendiente | confirmado | listo | completado | cancelado)
- `order_date` - Fecha del pedido
- `pickup_date` - Fecha estimada de recogida
- `total` - Total a pagar
- `payment_status` - Estado del pago

**Relaciones**:
- Pertenece a `users` (N:1)
- Tiene múltiples `order_items` (1:N)
- Puede generar `sales` (1:1)

---

### TABLA: sales
**Descripción**: Registro de ventas (productos y/o servicios)
**Campos principales**:
- `id` - UUID (PRIMARY KEY)
- `sale_number` - Número único generado automáticamente
- `customer_id` - Cliente
- `user_id` - Vendedor/Administrador que registra
- `sale_type` - Tipo (producto | servicio | mixto)
- `sale_date` - Fecha de la venta
- `total` - Total de la venta
- `payment_method` - Método de pago usado

**Relaciones**:
- Pertenece a `users` como cliente (N:1)
- Registrada por `users` como vendedor (N:1)
- Puede venir de `orders` (N:1)
- Puede venir de `appointments` (N:1)
- Tiene múltiples `sale_items` (1:N)

---

### TABLA: suppliers
**Descripción**: Proveedores de productos e insumos
**Campos principales**:
- `id` - UUID (PRIMARY KEY)
- `name` - Nombre del proveedor
- `contact_name` - Persona de contacto
- `email`, `phone` - Datos de contacto
- `tax_id` - NIT del proveedor
- `is_active` - Si está activo

**Relaciones**:
- Tiene múltiples `supplies` (1:N)
- Tiene múltiples `purchases` (1:N)

---

### TABLA: supplies
**Descripción**: Insumos y suministros del salón
**Campos principales**:
- `id` - UUID (PRIMARY KEY)
- `name` - Nombre del insumo
- `supplier_id` - Proveedor
- `current_stock` - Stock actual
- `min_stock_level` - Nivel mínimo (alerta)
- `unit_of_measure` - Unidad de medida (kg, litro, unidad, etc.)

**Relaciones**:
- Pertenece a `suppliers` (N:1)
- Tiene múltiples `supply_alerts` (1:N)
- Está en múltiples `purchase_items` (1:N)

---

### TABLA: purchases
**Descripción**: Órdenes de compra a proveedores
**Campos principales**:
- `id` - UUID (PRIMARY KEY)
- `purchase_number` - Número único generado automáticamente
- `supplier_id` - Proveedor
- `user_id` - Usuario que registra
- `purchase_date` - Fecha de compra
- `status` - Estado (pendiente | recibida | parcial | cancelada)
- `total` - Total de la compra

**Relaciones**:
- Pertenece a `suppliers` (N:1)
- Registrada por `users` (N:1)
- Tiene múltiples `purchase_items` (1:N)
- Tiene múltiples `supply_deliveries` (1:N)

---

### TABLA: cart
**Descripción**: Carrito de compras temporal de clientes
**Campos principales**:
- `id` - UUID (PRIMARY KEY)
- `customer_id` - Cliente dueño del carrito
- `product_id` - Producto en el carrito
- `quantity` - Cantidad

**Relaciones**:
- Pertenece a `users` (N:1)
- Referencia `products` (N:1)

**Constraint**: UNIQUE(customer_id, product_id) - Un producto por cliente

---

## CAMPOS IDENTITY Y AUTH

### Sistema de Autenticación Completo

#### 1. Registro de Usuarios
```sql
-- Flujo automático:
1. Usuario se registra → Crea entrada en auth.users (Supabase Auth)
2. Trigger automático → Crea entrada en public.users
3. Si role = 'cliente' → Se puede crear entrada en clients (manual o trigger)
```

#### 2. Campos de Identidad en auth.users (gestionado por Supabase)
- `id` (UUID) - Identificador único del usuario
- `email` - Email único
- `encrypted_password` - Contraseña encriptada
- `email_confirmed_at` - Timestamp de confirmación de email
- `confirmed_at` - Timestamp de confirmación de cuenta
- `last_sign_in_at` - Último inicio de sesión
- `raw_app_meta_data` - Metadata de la aplicación
- `raw_user_meta_data` - Metadata del usuario (ej: full_name)
- `created_at` - Fecha de creación

#### 3. Extensión en public.users
```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Campo de identity/auth:
    email VARCHAR(255) UNIQUE NOT NULL,
    
    -- Información de perfil:
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    
    -- Control de acceso:
    role user_role DEFAULT 'cliente' NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Adicional:
    avatar_url TEXT,
    address TEXT,
    city VARCHAR(100) DEFAULT 'Medellín',
    
    -- Auditoría:
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. Trigger de Creación Automática
```sql
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'), 
        'cliente'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION create_user_profile();
```

#### 5. Roles y Permisos
```sql
-- Enum de roles
CREATE TYPE user_role AS ENUM ('administrador', 'asistente', 'cliente');

-- Roles y sus permisos:

ADMINISTRADOR:
- Acceso completo a panel administrativo
- CRUD en todas las tablas
- Gestión de usuarios y roles
- Dashboard con estadísticas
- Configuración del sistema

ASISTENTE:
- Acceso a panel administrativo (limitado)
- Gestión de citas
- Gestión de pedidos
- Gestión de productos e inventario
- Registro de ventas
- NO puede gestionar usuarios ni configuración

CLIENTE:
- Vista de catálogo de productos
- Carrito de compras
- Pedidos propios
- Agendar citas
- Ver sus citas
- Perfil personal
- NO acceso al panel administrativo
```

#### 6. Row Level Security (RLS) Basada en Identity
```sql
-- Ejemplo: Los usuarios solo ven sus propios pedidos
CREATE POLICY "users_select_own_orders"
    ON public.orders FOR SELECT
    USING (customer_id = auth.uid());

-- Ejemplo: Solo administradores pueden ver todos los pedidos
CREATE POLICY "admins_select_all_orders"
    ON public.orders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'administrador'
        )
    );
```

#### 7. Funciones de Utilidad para Auth
```sql
-- Obtener rol del usuario actual
CREATE OR REPLACE FUNCTION auth.current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Verificar si es administrador
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'administrador'
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Verificar si es staff (admin o asistente)
CREATE OR REPLACE FUNCTION auth.is_staff()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
    );
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## NÚMEROS AUTOMÁTICOS

Todas estas entidades tienen números únicos generados automáticamente:

- **Pedidos**: `ORD-YYYYMMDD-NNNN` (ej: ORD-20251029-0001)
- **Citas**: `APT-YYYYMMDD-NNNN` (ej: APT-20251029-0001)
- **Ventas**: `SAL-YYYYMMDD-NNNN` (ej: SAL-20251029-0001)
- **Compras**: `PUR-YYYYMMDD-NNNN` (ej: PUR-20251029-0001)
- **Entregas**: `DEL-YYYYMMDD-NNNN` (ej: DEL-20251029-0001)

Cada uno usa su propia secuencia y se genera automáticamente mediante triggers al insertar.

---

## RESUMEN DE CONEXIONES

```
Total de Tablas: 28
Total de Relaciones: 45+
Total de Índices: 25+
Total de Triggers: 15+
Total de Funciones: 10+
Total de Vistas: 5
Total de Políticas RLS: 35+
```

---

**Base de datos diseñada para AsthroApp** 💜💗
**Salón de Belleza Astrid Eugenia Hoyos - Medellín**
