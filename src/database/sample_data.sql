-- ============================================================================
-- ASTHROAPP - DATOS DE EJEMPLO
-- Script para poblar la base de datos con datos de prueba
-- ============================================================================

-- IMPORTANTE: Este script debe ejecutarse DESPUÉS de crear el esquema principal
-- y DESPUÉS de haber registrado al menos un usuario administrador desde la aplicación

-- ============================================================================
-- 1. USUARIOS DE EJEMPLO
-- ============================================================================

-- NOTA: Los usuarios deben registrarse primero desde la aplicación para que
-- Supabase Auth los cree en auth.users
-- Luego puedes actualizar sus roles con estos comandos:

-- Ejemplo: Convertir usuarios en administradores o asistentes
-- UPDATE public.users SET role = 'administrador' WHERE email = 'admin@asthroapp.com';
-- UPDATE public.users SET role = 'asistente' WHERE email = 'asistente@asthroapp.com';

-- ============================================================================
-- 2. CATEGORÍAS DE PRODUCTOS
-- ============================================================================

INSERT INTO public.categories (name, description, is_active, display_order) VALUES
('Shampoos', 'Shampoos para todo tipo de cabello - hidratantes, reparadores, anticaspa', true, 1),
('Acondicionadores', 'Acondicionadores y cremas para peinar que nutren y suavizan', true, 2),
('Tratamientos Capilares', 'Tratamientos intensivos, mascarillas y ampollas reparadoras', true, 3),
('Styling', 'Productos para peinar y fijar: gel, mousse, spray, cera', true, 4),
('Coloración', 'Tintes permanentes, semi-permanentes y productos para el cuidado del color', true, 5),
('Herramientas', 'Cepillos, peines, planchas, secadores y accesorios profesionales', true, 6),
('Cuidado de Uñas', 'Esmaltes, removedores y tratamientos para uñas', true, 7),
('Maquillaje', 'Productos de maquillaje profesional para el rostro', true, 8)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. SERVICIOS DEL SALÓN
-- ============================================================================

INSERT INTO public.services (name, description, price, duration, category, is_active, display_order) VALUES
-- Cortes
('Corte de Cabello Mujer', 'Corte profesional para mujer, incluye lavado y secado', 35000, 45, 'Cortes', true, 1),
('Corte de Cabello Hombre', 'Corte clásico o moderno para hombre', 25000, 30, 'Cortes', true, 2),
('Corte + Brushing', 'Corte con cepillado y secado profesional', 50000, 60, 'Cortes', true, 3),

-- Coloración
('Tinte Completo', 'Aplicación de color en todo el cabello, incluye lavado', 80000, 120, 'Coloración', true, 4),
('Tinte de Raíces', 'Retoque de raíces hasta 3 cm', 45000, 60, 'Coloración', true, 5),
('Mechas Californiana', 'Mechas iluminadas estilo californiano', 120000, 150, 'Coloración', true, 6),
('Balayage', 'Técnica de iluminación degradada natural', 150000, 180, 'Coloración', true, 7),
('Ombré', 'Degradado de color de raíces a puntas', 130000, 165, 'Coloración', true, 8),

-- Tratamientos
('Keratina', 'Tratamiento de keratina alisador, resultados duraderos', 180000, 180, 'Tratamientos', true, 9),
('Botox Capilar', 'Tratamiento intensivo de botox para reparación profunda', 120000, 120, 'Tratamientos', true, 10),
('Hidratación Profunda', 'Mascarilla hidratante con productos profesionales', 45000, 45, 'Tratamientos', true, 11),
('Cauterización', 'Tratamiento de cauterización para cabello maltratado', 90000, 90, 'Tratamientos', true, 12),
('Ampolla Reparadora', 'Tratamiento express con ampollas nutritivas', 35000, 30, 'Tratamientos', true, 13),

-- Peinados
('Brushing Simple', 'Secado con cepillo para volumen y brillo', 30000, 30, 'Peinados', true, 14),
('Brushing Elaborado', 'Peinado con ondas o liso perfecto', 45000, 45, 'Peinados', true, 15),
('Peinado de Novia', 'Peinado especial para novias, incluye prueba', 150000, 120, 'Peinados', true, 16),
('Peinado de Fiesta', 'Peinado elegante para eventos especiales', 80000, 60, 'Peinados', true, 17),
('Ondas con Plancha', 'Ondas definidas con plancha', 40000, 40, 'Peinados', true, 18),

-- Uñas
('Manicure Clásica', 'Limado, cutícula y esmaltado clásico', 20000, 45, 'Uñas', true, 19),
('Manicure con Gel', 'Esmaltado en gel de larga duración', 35000, 60, 'Uñas', true, 20),
('Pedicure Clásica', 'Limado, cutícula y esmaltado en pies', 25000, 60, 'Uñas', true, 21),
('Pedicure Spa', 'Pedicure con exfoliación y masaje relajante', 45000, 75, 'Uñas', true, 22),
('Uñas Acrílicas', 'Extensión de uñas con acrílico', 60000, 120, 'Uñas', true, 23),

-- Depilación
('Cejas', 'Depilación y diseño de cejas', 12000, 20, 'Depilación', true, 24),
('Bigote', 'Depilación de zona del bigote', 8000, 15, 'Depilación', true, 25),
('Axilas', 'Depilación con cera en axilas', 15000, 20, 'Depilación', true, 26),
('Media Pierna', 'Depilación desde rodilla hasta tobillo', 30000, 30, 'Depilación', true, 27),
('Pierna Completa', 'Depilación completa de piernas', 50000, 60, 'Depilación', true, 28),

-- Maquillaje
('Maquillaje Social', 'Maquillaje para eventos diurnos o nocturnos', 60000, 60, 'Maquillaje', true, 29),
('Maquillaje de Novia', 'Maquillaje profesional para novias con prueba', 120000, 90, 'Maquillaje', true, 30),
('Pestañas Postizas', 'Aplicación de pestañas postizas', 25000, 30, 'Maquillaje', true, 31)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. PRODUCTOS DE EJEMPLO
-- ============================================================================

INSERT INTO public.products (category_id, name, description, brand, price, stock_quantity, min_stock_level, sku, is_active, is_featured)
SELECT 
    (SELECT id FROM public.categories WHERE name = 'Shampoos' LIMIT 1),
    'Shampoo Hidratante Argán',
    'Shampoo con aceite de argán para cabello seco y maltratado. 400ml',
    'L''Oréal Professional',
    45000,
    25,
    5,
    'SHA-ARG-400',
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'SHA-ARG-400');

INSERT INTO public.products (category_id, name, description, brand, price, stock_quantity, min_stock_level, sku, is_active, is_featured)
SELECT 
    (SELECT id FROM public.categories WHERE name = 'Shampoos' LIMIT 1),
    'Shampoo Anticaspa Professional',
    'Shampoo anticaspa con zinc pyrithione. 350ml',
    'Head & Shoulders',
    32000,
    30,
    8,
    'SHA-ANT-350',
    true,
    false
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'SHA-ANT-350');

INSERT INTO public.products (category_id, name, description, brand, price, stock_quantity, min_stock_level, sku, is_active, is_featured)
SELECT 
    (SELECT id FROM public.categories WHERE name = 'Shampoos' LIMIT 1),
    'Shampoo Keratina Reconstructor',
    'Shampoo con keratina para reconstrucción capilar. 500ml',
    'Tresemmé',
    38000,
    20,
    5,
    'SHA-KER-500',
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'SHA-KER-500');

INSERT INTO public.products (category_id, name, description, brand, price, stock_quantity, min_stock_level, sku, is_active)
SELECT 
    (SELECT id FROM public.categories WHERE name = 'Acondicionadores' LIMIT 1),
    'Acondicionador Nutritivo Argán',
    'Acondicionador enriquecido con aceite de argán. 400ml',
    'L''Oréal Professional',
    48000,
    22,
    5,
    'ACO-ARG-400',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'ACO-ARG-400');

INSERT INTO public.products (category_id, name, description, brand, price, stock_quantity, min_stock_level, sku, is_active)
SELECT 
    (SELECT id FROM public.categories WHERE name = 'Acondicionadores' LIMIT 1),
    'Acondicionador Repair Therapy',
    'Acondicionador reparador para cabello maltratado. 350ml',
    'Dove',
    28000,
    28,
    8,
    'ACO-REP-350',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'ACO-REP-350');

INSERT INTO public.products (category_id, name, description, brand, price, stock_quantity, min_stock_level, sku, is_active, is_featured)
SELECT 
    (SELECT id FROM public.categories WHERE name = 'Tratamientos Capilares' LIMIT 1),
    'Mascarilla Hidratación Intensa',
    'Mascarilla de hidratación profunda con extractos naturales. 250g',
    'Pantene',
    42000,
    15,
    5,
    'MAS-HID-250',
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'MAS-HID-250');

INSERT INTO public.products (category_id, name, description, brand, price, stock_quantity, min_stock_level, sku, is_active, is_featured)
SELECT 
    (SELECT id FROM public.categories WHERE name = 'Tratamientos Capilares' LIMIT 1),
    'Ampolla Botox Capilar',
    'Tratamiento de botox en ampolla para uso profesional. Pack x10',
    'Kativa',
    85000,
    10,
    3,
    'AMP-BOT-P10',
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'AMP-BOT-P10');

INSERT INTO public.products (category_id, name, description, brand, price, stock_quantity, min_stock_level, sku, is_active)
SELECT 
    (SELECT id FROM public.categories WHERE name = 'Styling' LIMIT 1),
    'Gel Fijación Extra Fuerte',
    'Gel para peinados con fijación extra fuerte. 500ml',
    'Moco de Gorila',
    22000,
    35,
    10,
    'GEL-FIJ-500',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'GEL-FIJ-500');

INSERT INTO public.products (category_id, name, description, brand, price, stock_quantity, min_stock_level, sku, is_active)
SELECT 
    (SELECT id FROM public.categories WHERE name = 'Styling' LIMIT 1),
    'Spray Fijador Professional',
    'Spray fijador de larga duración sin alcohol. 400ml',
    'Tresemmé',
    35000,
    18,
    5,
    'SPR-FIJ-400',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'SPR-FIJ-400');

INSERT INTO public.products (category_id, name, description, brand, price, stock_quantity, min_stock_level, sku, is_active)
SELECT 
    (SELECT id FROM public.categories WHERE name = 'Styling' LIMIT 1),
    'Mousse Volumen y Control',
    'Mousse para volumen sin apelmazar. 300ml',
    'Pantene',
    32000,
    20,
    5,
    'MOU-VOL-300',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'MOU-VOL-300');

INSERT INTO public.products (category_id, name, description, brand, price, stock_quantity, min_stock_level, sku, is_active, is_featured)
SELECT 
    (SELECT id FROM public.categories WHERE name = 'Coloración' LIMIT 1),
    'Tinte Permanente Castaño',
    'Tinte permanente con colágeno y keratina. Castaño Medio 5.0',
    'Garnier',
    25000,
    40,
    10,
    'TIN-CAS-50',
    true,
    false
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'TIN-CAS-50');

INSERT INTO public.products (category_id, name, description, brand, price, stock_quantity, min_stock_level, sku, is_active)
SELECT 
    (SELECT id FROM public.categories WHERE name = 'Coloración' LIMIT 1),
    'Tinte Permanente Negro',
    'Tinte permanente color negro intenso 1.0',
    'Garnier',
    25000,
    35,
    10,
    'TIN-NEG-10',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'TIN-NEG-10');

INSERT INTO public.products (category_id, name, description, brand, price, stock_quantity, min_stock_level, sku, is_active)
SELECT 
    (SELECT id FROM public.categories WHERE name = 'Coloración' LIMIT 1),
    'Tinte Permanente Rubio',
    'Tinte permanente rubio dorado 7.3',
    'Garnier',
    25000,
    30,
    8,
    'TIN-RUB-73',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'TIN-RUB-73');

INSERT INTO public.products (category_id, name, description, brand, price, stock_quantity, min_stock_level, sku, is_active)
SELECT 
    (SELECT id FROM public.categories WHERE name = 'Herramientas' LIMIT 1),
    'Cepillo Térmico Professional',
    'Cepillo térmico con cerámicas para brushing perfecto',
    'Babyliss',
    55000,
    12,
    3,
    'CEP-TER-PRO',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'CEP-TER-PRO');

INSERT INTO public.products (category_id, name, description, brand, price, stock_quantity, min_stock_level, sku, is_active)
SELECT 
    (SELECT id FROM public.categories WHERE name = 'Herramientas' LIMIT 1),
    'Peine de Corte Professional',
    'Peine profesional de carbono antiestático',
    'Wahl',
    18000,
    25,
    8,
    'PEI-COR-PRO',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'PEI-COR-PRO');

INSERT INTO public.products (category_id, name, description, brand, price, stock_quantity, min_stock_level, sku, is_active, is_featured)
SELECT 
    (SELECT id FROM public.categories WHERE name = 'Cuidado de Uñas' LIMIT 1),
    'Esmalte Permanente Gel',
    'Esmalte de gel de larga duración. Color Rojo Pasión',
    'OPI',
    38000,
    20,
    5,
    'ESM-GEL-ROJ',
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'ESM-GEL-ROJ');

INSERT INTO public.products (category_id, name, description, brand, price, stock_quantity, min_stock_level, sku, is_active)
SELECT 
    (SELECT id FROM public.categories WHERE name = 'Cuidado de Uñas' LIMIT 1),
    'Kit Manicure Completo',
    'Kit profesional con cortauñas, lima y pulidora',
    'Revlon',
    45000,
    15,
    5,
    'KIT-MAN-COM',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'KIT-MAN-COM');

-- ============================================================================
-- 5. PROVEEDORES
-- ============================================================================

INSERT INTO public.suppliers (name, contact_name, email, phone, address, city, tax_id, is_active, rating)
VALUES 
('Distribuidora Beauty Pro', 'María González', 'ventas@beautypro.com', '+57 300 123 4567', 'Calle 50 #45-20', 'Medellín', '900.123.456-7', true, 4.5),
('Importadora Capelli', 'Carlos Ramírez', 'info@capelli.com.co', '+57 310 234 5678', 'Carrera 43A #12-34', 'Medellín', '900.234.567-8', true, 4.8),
('Cosméticos del Valle', 'Ana Martínez', 'pedidos@cosmeticosdelvalle.com', '+57 320 345 6789', 'Av. Oriental #65-12', 'Cali', '900.345.678-9', true, 4.3),
('Mayorista Belleza Total', 'Jorge López', 'contacto@bellezatotal.com', '+57 315 456 7890', 'Calle 52 #48-15', 'Bogotá', '900.456.789-0', true, 4.6)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. SUMINISTROS/INSUMOS
-- ============================================================================

INSERT INTO public.supplies (supplier_id, name, description, category, unit_of_measure, current_stock, min_stock_level, max_stock_level, unit_price, sku, location, is_active)
SELECT 
    (SELECT id FROM public.suppliers WHERE name = 'Distribuidora Beauty Pro' LIMIT 1),
    'Peróxido de Hidrógeno 30vol',
    'Oxidante para tintes y decoloraciones',
    'Coloración',
    'litro',
    15.5,
    5.0,
    30.0,
    12000,
    'SUP-PER-30V',
    'Estante A1',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.supplies WHERE sku = 'SUP-PER-30V');

INSERT INTO public.supplies (supplier_id, name, description, category, unit_of_measure, current_stock, min_stock_level, max_stock_level, unit_price, sku, location, is_active)
SELECT 
    (SELECT id FROM public.suppliers WHERE name = 'Distribuidora Beauty Pro' LIMIT 1),
    'Polvo Decolorante Azul',
    'Polvo decolorante profesional para mechas',
    'Coloración',
    'kg',
    8.0,
    3.0,
    15.0,
    35000,
    'SUP-POL-AZU',
    'Estante A2',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.supplies WHERE sku = 'SUP-POL-AZU');

INSERT INTO public.supplies (supplier_id, name, description, category, unit_of_measure, current_stock, min_stock_level, max_stock_level, unit_price, sku, location, is_active)
SELECT 
    (SELECT id FROM public.suppliers WHERE name = 'Importadora Capelli' LIMIT 1),
    'Papel Aluminio Professional',
    'Rollo de papel aluminio para mechas y tintes',
    'Insumos',
    'unidad',
    25,
    10,
    50,
    8500,
    'SUP-PAP-ALU',
    'Estante B1',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.supplies WHERE sku = 'SUP-PAP-ALU');

INSERT INTO public.supplies (supplier_id, name, description, category, unit_of_measure, current_stock, min_stock_level, max_stock_level, unit_price, sku, location, is_active)
SELECT 
    (SELECT id FROM public.suppliers WHERE name = 'Importadora Capelli' LIMIT 1),
    'Guantes de Nitrilo Caja x100',
    'Guantes desechables de nitrilo negro',
    'Insumos',
    'caja',
    12,
    5,
    25,
    25000,
    'SUP-GUA-NIT',
    'Estante B2',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.supplies WHERE sku = 'SUP-GUA-NIT');

INSERT INTO public.supplies (supplier_id, name, description, category, unit_of_measure, current_stock, min_stock_level, max_stock_level, unit_price, sku, location, is_active)
SELECT 
    (SELECT id FROM public.suppliers WHERE name = 'Cosméticos del Valle' LIMIT 1),
    'Toallas Desechables x100',
    'Toallas desechables para salón de belleza',
    'Insumos',
    'paquete',
    8,
    5,
    20,
    18000,
    'SUP-TOA-DES',
    'Estante C1',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.supplies WHERE sku = 'SUP-TOA-DES');

INSERT INTO public.supplies (supplier_id, name, description, category, unit_of_measure, current_stock, min_stock_level, max_stock_level, unit_price, sku, location, is_active)
SELECT 
    (SELECT id FROM public.suppliers WHERE name = 'Mayorista Belleza Total' LIMIT 1),
    'Capas de Corte Negras',
    'Capas impermeables profesionales',
    'Insumos',
    'unidad',
    15,
    5,
    30,
    22000,
    'SUP-CAP-NEG',
    'Estante C2',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.supplies WHERE sku = 'SUP-CAP-NEG');

INSERT INTO public.supplies (supplier_id, name, description, category, unit_of_measure, current_stock, min_stock_level, max_stock_level, unit_price, sku, location, is_active)
SELECT 
    (SELECT id FROM public.suppliers WHERE name = 'Distribuidora Beauty Pro' LIMIT 1),
    'Algodón en Rollo 500g',
    'Algodón hidrófilo para manicure y limpieza',
    'Insumos',
    'rollo',
    10,
    5,
    25,
    12000,
    'SUP-ALG-ROL',
    'Estante D1',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.supplies WHERE sku = 'SUP-ALG-ROL');

INSERT INTO public.supplies (supplier_id, name, description, category, unit_of_measure, current_stock, min_stock_level, max_stock_level, unit_price, sku, location, is_active)
SELECT 
    (SELECT id FROM public.suppliers WHERE name = 'Importadora Capelli' LIMIT 1),
    'Acetona Pura Galón',
    'Acetona industrial para removedor de esmalte',
    'Químicos',
    'galón',
    6,
    3,
    15,
    28000,
    'SUP-ACE-GAL',
    'Estante D2',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.supplies WHERE sku = 'SUP-ACE-GAL');

-- ============================================================================
-- 7. HORARIOS DE ATENCIÓN
-- ============================================================================

-- Ya están insertados en el esquema principal, pero puedes actualizarlos:
-- UPDATE public.schedules SET max_appointments = 10 WHERE day_of_week = 'sabado';

-- ============================================================================
-- 8. CONFIGURACIÓN DEL SISTEMA
-- ============================================================================

-- Ya están insertados en el esquema principal

-- ============================================================================
-- 9. DATOS DE EJEMPLO PARA CLIENTES (después de registro)
-- ============================================================================

-- Estos datos se crean automáticamente cuando un cliente con role='cliente'
-- se registra. Puedes actualizar información adicional así:

/*
-- Ejemplo: Actualizar información de cliente después de registro
UPDATE public.clients SET
    hair_type = 'liso',
    preferences = 'Prefiere productos sin sulfatos',
    allergies = 'Alergia al níquel'
WHERE id = (SELECT id FROM public.users WHERE email = 'cliente@ejemplo.com');
*/

-- ============================================================================
-- VERIFICACIÓN DE DATOS
-- ============================================================================

-- Verificar categorías insertadas
SELECT COUNT(*) as total_categorias FROM public.categories;

-- Verificar servicios insertados
SELECT COUNT(*) as total_servicios FROM public.services;

-- Verificar productos insertados
SELECT COUNT(*) as total_productos FROM public.products;

-- Verificar proveedores insertados
SELECT COUNT(*) as total_proveedores FROM public.suppliers;

-- Verificar suministros insertados
SELECT COUNT(*) as total_suministros FROM public.supplies;

-- Ver resumen por categoría
SELECT 
    c.name as categoria,
    COUNT(p.id) as cantidad_productos,
    SUM(p.stock_quantity) as stock_total
FROM public.categories c
LEFT JOIN public.products p ON p.category_id = c.id
GROUP BY c.name
ORDER BY c.display_order;

-- Ver servicios por categoría
SELECT 
    category,
    COUNT(*) as cantidad,
    AVG(price) as precio_promedio,
    AVG(duration) as duracion_promedio
FROM public.services
WHERE is_active = true
GROUP BY category
ORDER BY category;

-- Ver productos con stock bajo
SELECT 
    p.name,
    p.stock_quantity,
    p.min_stock_level,
    c.name as categoria
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
WHERE p.stock_quantity <= p.min_stock_level
ORDER BY p.stock_quantity;

-- Ver suministros con stock bajo
SELECT 
    name,
    current_stock,
    min_stock_level,
    unit_of_measure,
    category
FROM public.supplies
WHERE current_stock <= min_stock_level
ORDER BY current_stock;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

/*
PARA CREAR DATOS DE PRUEBA COMPLETOS:

1. USUARIOS:
   - Registra usuarios desde la aplicación (esto los crea en auth.users y public.users)
   - Luego actualiza roles según necesites:
     UPDATE public.users SET role = 'administrador' WHERE email = 'admin@asthroapp.com';

2. CITAS:
   - Las citas deben crearse desde la aplicación para validar disponibilidad
   - O puedes insertar manualmente asegurándote de no generar conflictos

3. PEDIDOS:
   - Los pedidos se crean desde el carrito de compras en la aplicación
   - Se generan números automáticamente con el trigger

4. VENTAS:
   - Las ventas se registran desde el panel administrativo
   - También se generan automáticamente números únicos

5. COMPRAS:
   - Las compras a proveedores se registran desde el panel admin
   - Actualiza automáticamente el stock de supplies

PARA PROBAR EL SISTEMA COMPLETO:
- Crea 1 usuario administrador
- Crea 1 usuario asistente  
- Crea 2-3 usuarios clientes
- Agenda algunas citas como cliente
- Crea un pedido como cliente
- Registra ventas y compras como administrador
*/

-- ============================================================================
-- FIN DEL SCRIPT DE DATOS DE EJEMPLO
-- ============================================================================

SELECT '✅ Datos de ejemplo insertados correctamente' as mensaje;
SELECT 'Total de categorías: ' || COUNT(*) FROM public.categories;
SELECT 'Total de servicios: ' || COUNT(*) FROM public.services;
SELECT 'Total de productos: ' || COUNT(*) FROM public.products;
SELECT 'Total de proveedores: ' || COUNT(*) FROM public.suppliers;
SELECT 'Total de suministros: ' || COUNT(*) FROM public.supplies;
