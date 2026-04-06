-- ============================================================================
-- ASTHROAPP - ESQUEMA COMPLETO DE BASE DE DATOS
-- Salón de Belleza Astrid Eugenia Hoyos
-- Ubicación: Cll 55 #42-16 Medellín
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONES Y CONFIGURACIONES INICIALES
-- ============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. TIPOS ENUMERADOS (ENUMS)
-- ============================================================================

-- Roles de usuario
CREATE TYPE user_role AS ENUM ('administrador', 'asistente', 'cliente');

-- Estados de pedido
CREATE TYPE order_status AS ENUM ('pendiente', 'confirmado', 'preparando', 'listo', 'completado', 'cancelado');

-- Estados de cita
CREATE TYPE appointment_status AS ENUM ('pendiente', 'confirmada', 'en_proceso', 'completada', 'cancelada', 'no_asistio');

-- Estados de compra
CREATE TYPE purchase_status AS ENUM ('pendiente', 'recibida', 'parcial', 'cancelada');

-- Estados de entrega de suministros
CREATE TYPE delivery_status AS ENUM ('pendiente', 'en_transito', 'entregado', 'cancelado');

-- Métodos de pago
CREATE TYPE payment_method AS ENUM ('efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata');

-- Días de la semana
CREATE TYPE day_of_week AS ENUM ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo');

-- ============================================================================
-- 3. TABLAS DE AUTENTICACIÓN Y USUARIOS
-- ============================================================================

-- Tabla de usuarios (extiende auth.users de Supabase)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role user_role DEFAULT 'cliente' NOT NULL,
    avatar_url TEXT,
    address TEXT,
    city VARCHAR(100) DEFAULT 'Medellín',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de tokens de recuperación de contraseña
CREATE TABLE public.password_recovery_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. TABLAS DE CATÁLOGOS Y CONFIGURACIÓN
-- ============================================================================

-- Categorías de productos
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Servicios del salón
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    duration INTEGER NOT NULL CHECK (duration > 0), -- Duración en minutos
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    category VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Horarios de atención
CREATE TABLE public.schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_of_week day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    max_appointments INTEGER DEFAULT 10,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    UNIQUE(day_of_week, start_time)
);

-- ============================================================================
-- 5. TABLAS DE PRODUCTOS E INVENTARIO
-- ============================================================================

-- Productos
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    brand VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    min_stock_level INTEGER DEFAULT 5 CHECK (min_stock_level >= 0),
    sku VARCHAR(50) UNIQUE,
    barcode VARCHAR(100),
    image_url TEXT,
    images TEXT[], -- Array de URLs de imágenes adicionales
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    weight DECIMAL(8, 2), -- En gramos
    dimensions VARCHAR(50), -- Formato: "LxWxH cm"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Movimientos de inventario
CREATE TABLE public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('entrada', 'salida', 'ajuste', 'devolucion')),
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reason TEXT,
    reference_id UUID, -- Referencia a pedido, compra, etc.
    reference_type VARCHAR(50), -- 'order', 'purchase', 'adjustment'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. TABLAS DE PROVEEDORES Y SUMINISTROS
-- ============================================================================

-- Proveedores
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(150),
    email VARCHAR(255),
    phone VARCHAR(20),
    phone_secondary VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Colombia',
    tax_id VARCHAR(50), -- NIT
    payment_terms TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    rating DECIMAL(3, 2) CHECK (rating >= 0 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Suministros/Insumos
CREATE TABLE public.supplies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit_of_measure VARCHAR(50) NOT NULL, -- 'unidad', 'litro', 'kg', 'ml', etc.
    current_stock DECIMAL(10, 2) DEFAULT 0 CHECK (current_stock >= 0),
    min_stock_level DECIMAL(10, 2) DEFAULT 0 CHECK (min_stock_level >= 0),
    max_stock_level DECIMAL(10, 2),
    unit_price DECIMAL(10, 2) CHECK (unit_price >= 0),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    sku VARCHAR(50) UNIQUE,
    location VARCHAR(100), -- Ubicación en almacén
    is_active BOOLEAN DEFAULT true,
    last_purchase_date DATE,
    last_purchase_price DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alertas de suministros
CREATE TABLE public.supply_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supply_id UUID REFERENCES public.supplies(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('stock_bajo', 'stock_critico', 'vencimiento_proximo', 'sin_stock')),
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 7. TABLAS DE COMPRAS
-- ============================================================================

-- Compras a proveedores
CREATE TABLE public.purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Usuario que registra
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    status purchase_status DEFAULT 'pendiente',
    subtotal DECIMAL(10, 2) DEFAULT 0 CHECK (subtotal >= 0),
    tax DECIMAL(10, 2) DEFAULT 0 CHECK (tax >= 0),
    shipping_cost DECIMAL(10, 2) DEFAULT 0 CHECK (shipping_cost >= 0),
    discount DECIMAL(10, 2) DEFAULT 0 CHECK (discount >= 0),
    total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
    payment_method payment_method,
    notes TEXT,
    invoice_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Detalle de compras
CREATE TABLE public.purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
    supply_id UUID REFERENCES public.supplies(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('supply', 'product')),
    quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    tax DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
    received_quantity DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_item_reference CHECK (
        (item_type = 'supply' AND supply_id IS NOT NULL AND product_id IS NULL) OR
        (item_type = 'product' AND product_id IS NOT NULL AND supply_id IS NULL)
    )
);

-- Entregas de suministros
CREATE TABLE public.supply_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
    delivery_number VARCHAR(50) UNIQUE NOT NULL,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status delivery_status DEFAULT 'pendiente',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Detalle de entregas de suministros
CREATE TABLE public.supply_delivery_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID REFERENCES public.supply_deliveries(id) ON DELETE CASCADE,
    purchase_item_id UUID REFERENCES public.purchase_items(id) ON DELETE CASCADE,
    quantity_delivered DECIMAL(10, 2) NOT NULL CHECK (quantity_delivered > 0),
    quality_status VARCHAR(50) DEFAULT 'aceptado' CHECK (quality_status IN ('aceptado', 'rechazado', 'parcial')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 8. TABLAS DE VENTAS Y PEDIDOS
-- ============================================================================

-- Pedidos de clientes (para recoger en tienda)
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status order_status DEFAULT 'pendiente',
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    pickup_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    tax DECIMAL(10, 2) DEFAULT 0 CHECK (tax >= 0),
    discount DECIMAL(10, 2) DEFAULT 0 CHECK (discount >= 0),
    total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
    payment_method payment_method,
    payment_status VARCHAR(20) DEFAULT 'pendiente' CHECK (payment_status IN ('pendiente', 'pagado', 'reembolsado')),
    notes TEXT,
    customer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Detalle de pedidos
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    discount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ventas registradas (incluye servicios y productos)
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Vendedor/Administrador
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sale_type VARCHAR(20) NOT NULL CHECK (sale_type IN ('producto', 'servicio', 'mixto')),
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    tax DECIMAL(10, 2) DEFAULT 0 CHECK (tax >= 0),
    discount DECIMAL(10, 2) DEFAULT 0 CHECK (discount >= 0),
    total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
    payment_method payment_method NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pagado' CHECK (payment_status IN ('pendiente', 'pagado', 'reembolsado')),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    appointment_id UUID, -- Se relacionará después con appointments
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Detalle de ventas
CREATE TABLE public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('producto', 'servicio')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    discount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_sale_item CHECK (
        (item_type = 'producto' AND product_id IS NOT NULL AND service_id IS NULL) OR
        (item_type = 'servicio' AND service_id IS NOT NULL AND product_id IS NULL)
    )
);

-- ============================================================================
-- 9. TABLAS DE CITAS Y AGENDAMIENTO
-- ============================================================================

-- Citas
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Estilista asignado
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status appointment_status DEFAULT 'pendiente',
    total_duration INTEGER NOT NULL, -- Duración total en minutos
    total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
    payment_method payment_method,
    payment_status VARCHAR(20) DEFAULT 'pendiente' CHECK (payment_status IN ('pendiente', 'pagado', 'reembolsado')),
    google_calendar_event_id VARCHAR(255),
    customer_notes TEXT,
    admin_notes TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_appointment_time CHECK (end_time > start_time)
);

-- Servicios de citas (relación muchos a muchos)
CREATE TABLE public.appointment_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0), -- Precio al momento de la cita
    duration INTEGER NOT NULL, -- Duración en minutos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(appointment_id, service_id)
);

-- Agregar la relación faltante en sales
ALTER TABLE public.sales 
ADD CONSTRAINT fk_sales_appointment 
FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;

-- ============================================================================
-- 10. TABLAS DE CLIENTES Y RESEÑAS
-- ============================================================================

-- Clientes (vista extendida de usuarios con rol cliente)
CREATE TABLE public.clients (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    birth_date DATE,
    gender VARCHAR(20),
    preferences TEXT, -- Preferencias de productos o servicios
    allergies TEXT, -- Alergias conocidas
    skin_type VARCHAR(50),
    hair_type VARCHAR(50),
    notes TEXT, -- Notas del estilista
    total_appointments INTEGER DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0,
    last_visit DATE,
    loyalty_points INTEGER DEFAULT 0,
    referral_code VARCHAR(20) UNIQUE,
    referred_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reseñas de servicios
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 11. TABLAS DE CARRITO DE COMPRAS
-- ============================================================================

-- Carrito de compras
CREATE TABLE public.cart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, product_id)
);

-- ============================================================================
-- 12. TABLAS DE CONFIGURACIÓN Y SISTEMA
-- ============================================================================

-- Configuración general del salón
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    value_type VARCHAR(20) DEFAULT 'string' CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Registro de auditoría
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notificaciones
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    related_id UUID,
    related_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 13. ÍNDICES PARA OPTIMIZACIÓN
-- ============================================================================

-- Índices de usuarios
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_is_active ON public.users(is_active);

-- Índices de productos
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_products_stock ON public.products(stock_quantity);

-- Índices de pedidos
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_order_date ON public.orders(order_date);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);

-- Índices de citas
CREATE INDEX idx_appointments_customer_id ON public.appointments(customer_id);
CREATE INDEX idx_appointments_assigned_to ON public.appointments(assigned_to);
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_number ON public.appointments(appointment_number);

-- Índices de ventas
CREATE INDEX idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX idx_sales_user_id ON public.sales(user_id);
CREATE INDEX idx_sales_sale_date ON public.sales(sale_date);
CREATE INDEX idx_sales_sale_number ON public.sales(sale_number);

-- Índices de compras
CREATE INDEX idx_purchases_supplier_id ON public.purchases(supplier_id);
CREATE INDEX idx_purchases_status ON public.purchases(status);
CREATE INDEX idx_purchases_purchase_date ON public.purchases(purchase_date);
CREATE INDEX idx_purchases_number ON public.purchases(purchase_number);

-- Índices de suministros
CREATE INDEX idx_supplies_supplier_id ON public.supplies(supplier_id);
CREATE INDEX idx_supplies_category ON public.supplies(category);
CREATE INDEX idx_supplies_stock ON public.supplies(current_stock);

-- Índices de carrito
CREATE INDEX idx_cart_customer_id ON public.cart(customer_id);

-- Índices de auditoría
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at);

-- Índices de notificaciones
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- ============================================================================
-- 14. FUNCIONES Y TRIGGERS
-- ============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON public.schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplies_updated_at BEFORE UPDATE ON public.supplies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON public.purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supply_deliveries_updated_at BEFORE UPDATE ON public.supply_deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_updated_at BEFORE UPDATE ON public.cart
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para generar números de orden automáticos
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number := 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('order_number_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Secuencia para números de orden
CREATE SEQUENCE order_number_seq START 1;

-- Trigger para generar número de orden
CREATE TRIGGER generate_order_number_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL)
EXECUTE FUNCTION generate_order_number();

-- Función para generar números de cita automáticos
CREATE OR REPLACE FUNCTION generate_appointment_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.appointment_number := 'APT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('appointment_number_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Secuencia para números de cita
CREATE SEQUENCE appointment_number_seq START 1;

-- Trigger para generar número de cita
CREATE TRIGGER generate_appointment_number_trigger
BEFORE INSERT ON public.appointments
FOR EACH ROW
WHEN (NEW.appointment_number IS NULL)
EXECUTE FUNCTION generate_appointment_number();

-- Función para generar números de venta automáticos
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sale_number := 'SAL-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('sale_number_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Secuencia para números de venta
CREATE SEQUENCE sale_number_seq START 1;

-- Trigger para generar número de venta
CREATE TRIGGER generate_sale_number_trigger
BEFORE INSERT ON public.sales
FOR EACH ROW
WHEN (NEW.sale_number IS NULL)
EXECUTE FUNCTION generate_sale_number();

-- Función para generar números de compra automáticos
CREATE OR REPLACE FUNCTION generate_purchase_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.purchase_number := 'PUR-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('purchase_number_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Secuencia para números de compra
CREATE SEQUENCE purchase_number_seq START 1;

-- Trigger para generar número de compra
CREATE TRIGGER generate_purchase_number_trigger
BEFORE INSERT ON public.purchases
FOR EACH ROW
WHEN (NEW.purchase_number IS NULL)
EXECUTE FUNCTION generate_purchase_number();

-- Función para generar números de entrega automáticos
CREATE OR REPLACE FUNCTION generate_delivery_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.delivery_number := 'DEL-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('delivery_number_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Secuencia para números de entrega
CREATE SEQUENCE delivery_number_seq START 1;

-- Trigger para generar número de entrega
CREATE TRIGGER generate_delivery_number_trigger
BEFORE INSERT ON public.supply_deliveries
FOR EACH ROW
WHEN (NEW.delivery_number IS NULL)
EXECUTE FUNCTION generate_delivery_number();

-- Función para actualizar stock de productos
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Registrar movimiento de inventario
        INSERT INTO public.inventory_movements (
            product_id,
            movement_type,
            quantity,
            previous_stock,
            new_stock,
            reason,
            reference_id,
            reference_type
        )
        SELECT 
            oi.product_id,
            'salida',
            oi.quantity,
            p.stock_quantity,
            p.stock_quantity - oi.quantity,
            'Venta de producto',
            NEW.order_id,
            'order'
        FROM public.order_items oi
        JOIN public.products p ON p.id = oi.product_id
        WHERE oi.id = NEW.id;
        
        -- Actualizar stock
        UPDATE public.products p
        SET stock_quantity = stock_quantity - NEW.quantity
        FROM public.order_items oi
        WHERE p.id = oi.product_id AND oi.id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar stock al crear item de orden
CREATE TRIGGER update_product_stock_trigger
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION update_product_stock();

-- Función para generar alertas de stock bajo
CREATE OR REPLACE FUNCTION check_supply_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar si el stock está bajo
    IF NEW.current_stock <= NEW.min_stock_level AND NEW.current_stock > 0 THEN
        INSERT INTO public.supply_alerts (supply_id, alert_type, message, severity)
        VALUES (
            NEW.id,
            'stock_bajo',
            'El suministro "' || NEW.name || '" tiene stock bajo. Stock actual: ' || NEW.current_stock || ' ' || NEW.unit_of_measure,
            'warning'
        )
        ON CONFLICT DO NOTHING;
    ELSIF NEW.current_stock = 0 THEN
        INSERT INTO public.supply_alerts (supply_id, alert_type, message, severity)
        VALUES (
            NEW.id,
            'sin_stock',
            'El suministro "' || NEW.name || '" está sin stock.',
            'critical'
        )
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para verificar stock de suministros
CREATE TRIGGER check_supply_stock_trigger
AFTER UPDATE OF current_stock ON public.supplies
FOR EACH ROW
EXECUTE FUNCTION check_supply_stock();

-- Función para actualizar estadísticas de cliente
CREATE OR REPLACE FUNCTION update_client_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'appointments' AND NEW.status = 'completada' THEN
        UPDATE public.clients
        SET 
            total_appointments = total_appointments + 1,
            total_spent = total_spent + NEW.total_price,
            last_visit = NEW.appointment_date
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar estadísticas de cliente
CREATE TRIGGER update_client_stats_trigger
AFTER UPDATE OF status ON public.appointments
FOR EACH ROW
WHEN (NEW.status = 'completada' AND OLD.status <> 'completada')
EXECUTE FUNCTION update_client_stats();

-- Función para crear perfil de usuario automáticamente
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'), 'cliente');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil al registrar en auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- ============================================================================
-- 15. VISTAS ÚTILES
-- ============================================================================

-- Vista de productos con bajo stock
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
    p.id,
    p.name,
    p.sku,
    p.stock_quantity,
    p.min_stock_level,
    c.name as category_name,
    (p.min_stock_level - p.stock_quantity) as units_needed
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
WHERE p.stock_quantity <= p.min_stock_level AND p.is_active = true
ORDER BY p.stock_quantity ASC;

-- Vista de suministros con bajo stock
CREATE OR REPLACE VIEW low_stock_supplies AS
SELECT 
    s.id,
    s.name,
    s.category,
    s.current_stock,
    s.min_stock_level,
    s.unit_of_measure,
    sup.name as supplier_name,
    (s.min_stock_level - s.current_stock) as units_needed
FROM public.supplies s
LEFT JOIN public.suppliers sup ON sup.id = s.supplier_id
WHERE s.current_stock <= s.min_stock_level AND s.is_active = true
ORDER BY s.current_stock ASC;

-- Vista de citas del día
CREATE OR REPLACE VIEW today_appointments AS
SELECT 
    a.id,
    a.appointment_number,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.status,
    a.total_price,
    u.full_name as customer_name,
    u.phone as customer_phone,
    staff.full_name as assigned_to_name,
    array_agg(s.name) as services
FROM public.appointments a
JOIN public.users u ON u.id = a.customer_id
LEFT JOIN public.users staff ON staff.id = a.assigned_to
LEFT JOIN public.appointment_services aps ON aps.appointment_id = a.id
LEFT JOIN public.services s ON s.id = aps.service_id
WHERE a.appointment_date = CURRENT_DATE
GROUP BY a.id, u.full_name, u.phone, staff.full_name
ORDER BY a.start_time;

-- Vista de ventas del día
CREATE OR REPLACE VIEW today_sales AS
SELECT 
    s.id,
    s.sale_number,
    s.sale_date,
    s.sale_type,
    s.total,
    s.payment_method,
    u.full_name as customer_name,
    seller.full_name as seller_name
FROM public.sales s
LEFT JOIN public.users u ON u.id = s.customer_id
LEFT JOIN public.users seller ON seller.id = s.user_id
WHERE DATE(s.sale_date) = CURRENT_DATE
ORDER BY s.sale_date DESC;

-- Vista de mejores clientes
CREATE OR REPLACE VIEW top_clients AS
SELECT 
    c.id,
    u.full_name,
    u.email,
    u.phone,
    c.total_appointments,
    c.total_spent,
    c.last_visit,
    c.loyalty_points
FROM public.clients c
JOIN public.users u ON u.id = c.id
WHERE u.is_active = true
ORDER BY c.total_spent DESC
LIMIT 100;

-- ============================================================================
-- 16. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios
CREATE POLICY "Los usuarios pueden ver su propio perfil"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Los administradores pueden ver todos los usuarios"
    ON public.users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
        )
    );

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Los administradores pueden actualizar cualquier usuario"
    ON public.users FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'administrador'
        )
    );

CREATE POLICY "Los administradores pueden insertar usuarios"
    ON public.users FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'administrador'
        )
    );

-- Políticas para categorías (públicas para lectura)
CREATE POLICY "Todos pueden ver categorías activas"
    ON public.categories FOR SELECT
    USING (is_active = true);

CREATE POLICY "Solo administradores pueden modificar categorías"
    ON public.categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'administrador'
        )
    );

-- Políticas para servicios (públicos para lectura)
CREATE POLICY "Todos pueden ver servicios activos"
    ON public.services FOR SELECT
    USING (is_active = true);

CREATE POLICY "Solo administradores pueden modificar servicios"
    ON public.services FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'administrador'
        )
    );

-- Políticas para horarios (públicos para lectura)
CREATE POLICY "Todos pueden ver horarios activos"
    ON public.schedules FOR SELECT
    USING (is_active = true);

CREATE POLICY "Solo administradores pueden modificar horarios"
    ON public.schedules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'administrador'
        )
    );

-- Políticas para productos (públicos para lectura)
CREATE POLICY "Todos pueden ver productos activos"
    ON public.products FOR SELECT
    USING (is_active = true);

CREATE POLICY "Solo administradores pueden modificar productos"
    ON public.products FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
        )
    );

-- Políticas para pedidos
CREATE POLICY "Los clientes pueden ver sus propios pedidos"
    ON public.orders FOR SELECT
    USING (customer_id = auth.uid());

CREATE POLICY "Los administradores pueden ver todos los pedidos"
    ON public.orders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
        )
    );

CREATE POLICY "Los clientes pueden crear pedidos"
    ON public.orders FOR INSERT
    WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Los administradores pueden modificar pedidos"
    ON public.orders FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
        )
    );

-- Políticas para citas
CREATE POLICY "Los clientes pueden ver sus propias citas"
    ON public.appointments FOR SELECT
    USING (customer_id = auth.uid());

CREATE POLICY "Los administradores pueden ver todas las citas"
    ON public.appointments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
        )
    );

CREATE POLICY "Los clientes pueden crear citas"
    ON public.appointments FOR INSERT
    WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Los clientes pueden actualizar sus citas pendientes"
    ON public.appointments FOR UPDATE
    USING (customer_id = auth.uid() AND status = 'pendiente');

CREATE POLICY "Los administradores pueden modificar cualquier cita"
    ON public.appointments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
        )
    );

-- Políticas para carrito
CREATE POLICY "Los clientes pueden ver su propio carrito"
    ON public.cart FOR SELECT
    USING (customer_id = auth.uid());

CREATE POLICY "Los clientes pueden modificar su propio carrito"
    ON public.cart FOR ALL
    USING (customer_id = auth.uid());

-- Políticas para reseñas
CREATE POLICY "Todos pueden ver reseñas aprobadas"
    ON public.reviews FOR SELECT
    USING (is_approved = true);

CREATE POLICY "Los clientes pueden ver sus propias reseñas"
    ON public.reviews FOR SELECT
    USING (customer_id = auth.uid());

CREATE POLICY "Los clientes pueden crear reseñas"
    ON public.reviews FOR INSERT
    WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Los administradores pueden modificar reseñas"
    ON public.reviews FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
        )
    );

-- Políticas para notificaciones
CREATE POLICY "Los usuarios pueden ver sus propias notificaciones"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Los usuarios pueden actualizar sus propias notificaciones"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid());

-- Políticas para módulos administrativos (solo administradores y asistentes)
CREATE POLICY "Solo staff puede acceder a proveedores"
    ON public.suppliers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
        )
    );

CREATE POLICY "Solo staff puede acceder a suministros"
    ON public.supplies FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
        )
    );

CREATE POLICY "Solo staff puede acceder a compras"
    ON public.purchases FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
        )
    );

CREATE POLICY "Solo staff puede acceder a items de compra"
    ON public.purchase_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
        )
    );

CREATE POLICY "Solo staff puede acceder a ventas"
    ON public.sales FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
        )
    );

CREATE POLICY "Solo staff puede acceder a items de venta"
    ON public.sale_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
        )
    );

CREATE POLICY "Solo staff puede acceder a clientes"
    ON public.clients FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
        )
    );

-- Políticas para servicios de citas
CREATE POLICY "Los usuarios pueden ver servicios de sus citas"
    ON public.appointment_services FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.appointments
            WHERE id = appointment_id AND customer_id = auth.uid()
        )
    );

CREATE POLICY "Los administradores pueden ver todos los servicios de citas"
    ON public.appointment_services FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
        )
    );

CREATE POLICY "Solo administradores pueden modificar servicios de citas"
    ON public.appointment_services FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
        )
    );

-- Políticas para items de pedido
CREATE POLICY "Los clientes pueden ver items de sus pedidos"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE id = order_id AND customer_id = auth.uid()
        )
    );

CREATE POLICY "Los administradores pueden ver todos los items"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('administrador', 'asistente')
        )
    );

-- ============================================================================
-- 17. DATOS INICIALES
-- ============================================================================

-- Insertar configuración inicial
INSERT INTO public.settings (key, value, description, value_type, is_public) VALUES
('salon_name', 'Salón de Belleza Astrid Eugenia Hoyos', 'Nombre del salón', 'string', true),
('salon_address', 'Cll 55 #42-16', 'Dirección del salón', 'string', true),
('salon_city', 'Medellín', 'Ciudad', 'string', true),
('salon_phone', '+57 300 123 4567', 'Teléfono de contacto', 'string', true),
('salon_email', 'contacto@asthroapp.com', 'Email de contacto', 'string', true),
('tax_rate', '19', 'Tasa de IVA en porcentaje', 'number', false),
('appointment_min_advance_hours', '24', 'Horas mínimas de anticipación para citas', 'number', true),
('appointment_max_advance_days', '30', 'Días máximos de anticipación para citas', 'number', true),
('loyalty_points_per_peso', '1', 'Puntos de lealtad por cada peso gastado', 'number', false),
('min_order_amount', '20000', 'Monto mínimo de pedido', 'number', true),
('theme_primary_color', '#E91E63', 'Color primario (rosado)', 'string', true),
('theme_secondary_color', '#9C27B0', 'Color secundario (morado)', 'string', true)
ON CONFLICT (key) DO NOTHING;

-- Insertar horarios predeterminados
INSERT INTO public.schedules (day_of_week, start_time, end_time, max_appointments, notes) VALUES
('lunes', '09:00', '18:00', 8, 'Horario regular'),
('martes', '09:00', '18:00', 8, 'Horario regular'),
('miercoles', '09:00', '18:00', 8, 'Horario regular'),
('jueves', '09:00', '18:00', 8, 'Horario regular'),
('viernes', '09:00', '18:00', 8, 'Horario regular'),
('sabado', '09:00', '17:00', 10, 'Horario extendido fin de semana'),
('domingo', '10:00', '14:00', 5, 'Horario reducido')
ON CONFLICT (day_of_week, start_time) DO NOTHING;

-- Insertar categorías de ejemplo
INSERT INTO public.categories (name, description, display_order) VALUES
('Shampoos', 'Shampoos para todo tipo de cabello', 1),
('Acondicionadores', 'Acondicionadores y tratamientos', 2),
('Tratamientos', 'Tratamientos capilares especializados', 3),
('Styling', 'Productos para peinar y fijar', 4),
('Coloración', 'Productos para teñir el cabello', 5),
('Herramientas', 'Herramientas y accesorios', 6)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 18. FUNCIONES AUXILIARES PARA LA APLICACIÓN
-- ============================================================================

-- Función para obtener próximas citas de un cliente
CREATE OR REPLACE FUNCTION get_customer_upcoming_appointments(customer_uuid UUID)
RETURNS TABLE (
    id UUID,
    appointment_number VARCHAR,
    appointment_date DATE,
    start_time TIME,
    end_time TIME,
    status appointment_status,
    total_price DECIMAL,
    services TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.appointment_number,
        a.appointment_date,
        a.start_time,
        a.end_time,
        a.status,
        a.total_price,
        array_agg(s.name) as services
    FROM public.appointments a
    LEFT JOIN public.appointment_services aps ON aps.appointment_id = a.id
    LEFT JOIN public.services s ON s.id = aps.service_id
    WHERE a.customer_id = customer_uuid
        AND a.appointment_date >= CURRENT_DATE
        AND a.status NOT IN ('cancelada', 'completada')
    GROUP BY a.id
    ORDER BY a.appointment_date, a.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar disponibilidad de cita
CREATE OR REPLACE FUNCTION check_appointment_availability(
    check_date DATE,
    check_start_time TIME,
    check_end_time TIME,
    exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    is_available BOOLEAN;
    max_appointments INTEGER;
    current_appointments INTEGER;
    day_name day_of_week;
BEGIN
    -- Obtener el día de la semana en español
    day_name := CASE EXTRACT(DOW FROM check_date)
        WHEN 0 THEN 'domingo'
        WHEN 1 THEN 'lunes'
        WHEN 2 THEN 'martes'
        WHEN 3 THEN 'miercoles'
        WHEN 4 THEN 'jueves'
        WHEN 5 THEN 'viernes'
        WHEN 6 THEN 'sabado'
    END;
    
    -- Verificar si hay horario configurado para ese día
    SELECT s.max_appointments INTO max_appointments
    FROM public.schedules s
    WHERE s.day_of_week = day_name
        AND s.is_active = true
        AND check_start_time >= s.start_time
        AND check_end_time <= s.end_time
    LIMIT 1;
    
    IF max_appointments IS NULL THEN
        RETURN false; -- No hay horario configurado
    END IF;
    
    -- Contar citas existentes en ese horario
    SELECT COUNT(*) INTO current_appointments
    FROM public.appointments
    WHERE appointment_date = check_date
        AND status NOT IN ('cancelada')
        AND (
            (start_time <= check_start_time AND end_time > check_start_time) OR
            (start_time < check_end_time AND end_time >= check_end_time) OR
            (start_time >= check_start_time AND end_time <= check_end_time)
        )
        AND (exclude_appointment_id IS NULL OR id != exclude_appointment_id);
    
    is_available := current_appointments < max_appointments;
    RETURN is_available;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular total de carrito
CREATE OR REPLACE FUNCTION calculate_cart_total(customer_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    cart_total DECIMAL;
BEGIN
    SELECT COALESCE(SUM(p.price * c.quantity), 0) INTO cart_total
    FROM public.cart c
    JOIN public.products p ON p.id = c.product_id
    WHERE c.customer_id = customer_uuid;
    
    RETURN cart_total;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas del dashboard
CREATE OR REPLACE FUNCTION get_dashboard_stats(start_date DATE DEFAULT CURRENT_DATE, end_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_sales', COALESCE(SUM(total), 0),
        'total_orders', COUNT(DISTINCT CASE WHEN sale_type IN ('producto', 'mixto') THEN id END),
        'total_appointments', COUNT(DISTINCT CASE WHEN sale_type IN ('servicio', 'mixto') THEN appointment_id END),
        'total_customers', COUNT(DISTINCT customer_id),
        'avg_sale', COALESCE(AVG(total), 0),
        'sales_by_type', json_build_object(
            'producto', COALESCE(SUM(CASE WHEN sale_type = 'producto' THEN total ELSE 0 END), 0),
            'servicio', COALESCE(SUM(CASE WHEN sale_type = 'servicio' THEN total ELSE 0 END), 0),
            'mixto', COALESCE(SUM(CASE WHEN sale_type = 'mixto' THEN total ELSE 0 END), 0)
        ),
        'sales_by_payment_method', (
            SELECT json_object_agg(payment_method, total)
            FROM (
                SELECT payment_method, COALESCE(SUM(total), 0) as total
                FROM public.sales
                WHERE DATE(sale_date) BETWEEN start_date AND end_date
                GROUP BY payment_method
            ) pm
        )
    ) INTO result
    FROM public.sales
    WHERE DATE(sale_date) BETWEEN start_date AND end_date;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIN DEL ESQUEMA
-- ============================================================================

-- Comentarios finales
COMMENT ON DATABASE postgres IS 'Base de datos de AsthroApp - Salón de Belleza Astrid Eugenia Hoyos';
COMMENT ON SCHEMA public IS 'Esquema principal de AsthroApp con gestión completa de salón de belleza';

-- Para verificar que todo se creó correctamente
SELECT 'Esquema de base de datos de AsthroApp creado exitosamente' as message;
