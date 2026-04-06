// User Management System
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  documentId: string;
  email: string;
  phone: string;
  role: 'admin' | 'asistente' | 'customer';
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  lastLogin?: string;
  permissions?: string[];
  avatar?: string;
  // Additional client info
  address?: string;
  birthDate?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  allergies?: string;
  skinType?: string;
  hairType?: string;
  preferredServices?: string[];
  notes?: string;
  visitCount?: number;
  totalSpent?: number;
  lastVisit?: string;
  frequency?: 'high' | 'medium' | 'low'; // Based on visit patterns
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
}

// Service Management
export interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  category: string;
  supplies: ServiceSupply[];
  employeeRequired: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface ServiceSupply {
  productId: number;
  quantity: number;
  unit: string;
}

// Appointment Management
export interface Appointment {
  id: number;
  customerId: number;
  employeeId?: number;
  serviceId: number;
  date: string;
  time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  supplies?: AppointmentSupply[];
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentSupply {
  productId: number;
  quantityUsed: number;
  cost: number;
}

// Product and Supply Management
export interface Product {
  id: number;
  name: string;
  description: string;
  sku: string;
  category: string;
  brand: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  supplierId: number;
  expirationDate?: string;
  status: 'active' | 'discontinued' | 'out_of_stock';
  location?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supply {
  id: number;
  name: string;
  description: string;
  sku: string;
  type: 'chemical' | 'tool' | 'equipment' | 'consumable' | 'cleaning';
  quantity: number;
  unit: string;
  location: string;
  expirationDate?: string;
  status: 'active' | 'inactive' | 'expired' | 'low_stock';
  supplierId: number;
  unitCost: number;
  minStock: number;
  maxStock: number;
  assignedTo?: number[]; // Array de IDs de usuarios asignados
  notes?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyDelivery {
  id: number;
  supplyId: number;
  deliveryDate: string;
  quantity: number;
  destination: string;
  responsiblePerson: string;
  responsibleId: number;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  createdBy: number;
  createdAt: string;
  completedAt?: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  parentId?: number;
  type: 'service' | 'product';
  productCount?: number;
  totalDemand?: number;
  createdAt: string;
  updatedAt?: string;
}

// Supplier Management
export interface Supplier {
  id: number;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  department?: string;
  city: string;
  taxId: string;
  supplierType: 'natural' | 'juridica'; // Nuevo campo para tipo de proveedor
  paymentTerms: string;
  rating: number;
  status: 'active' | 'inactive' | 'blacklisted';
  products: SupplierProduct[];
  lastOrderDate?: string;
  totalOrders: number;
  image?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SupplierProduct {
  productId: number;
  productName: string;
  productImage?: string;
  supplierPrice: number;
  minimumOrder: number;
  leadTime: number; // days
}

// Purchase and Sales Management
export interface PurchaseOrder {
  id: number;
  supplierId: number;
  orderDate: string;
  expectedDate: string;
  receivedDate?: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'received' | 'cancelled';
  items: PurchaseItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  createdBy: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  received?: number;
}

export interface Sale {
  id: string;
  customerId: number;
  employeeId: number;
  date: string;
  time: string;
  items: SaleItem[];
  services: SaleService[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'mixed';
  status: 'completed' | 'refunded';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SaleItem {
  productId: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface SaleService {
  serviceId: number;
  appointmentId?: number;
  price: number;
  discount: number;
  totalPrice: number;
}

// Schedule Management
export interface Schedule {
  id: number;
  employeeId?: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  isAvailable: boolean;
  exceptions?: ScheduleException[];
  createdAt: string;
}

export interface ScheduleException {
  date: string;
  startTime?: string;
  endTime?: string;
  isAvailable: boolean;
  reason?: string;
}

// Order Management
export interface Order {
  id: string;
  customerId: number;
  items: OrderItem[];
  status: 'pending' | 'processing' | 'ready' | 'completed' | 'cancelled';
  orderDate: string;
  expectedDate?: string;
  completedDate?: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod?: string;
  pickupMethod: 'store_pickup' | 'delivery';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: 'pending' | 'prepared' | 'delivered';
}

// Sample data
export const mockUsers: User[] = [
  {
    id: 1,
    firstName: 'Astrid Eugenia',
    lastName: 'Hoyos',
    name: 'Astrid Eugenia Hoyos',
    documentId: '43123456',
    email: 'astrid@asthroapp.com',
    phone: '+57 304 123 4567',
    role: 'super_admin',
    status: 'active',
    createdAt: '2023-01-15',
    lastLogin: '2024-01-15 09:30:00'
  },
  {
    id: 2,
    firstName: 'María Fernanda',
    lastName: 'Gómez',
    name: 'María Fernanda Gómez',
    documentId: '1045678901',
    email: 'maria@asthroapp.com',
    phone: '+57 301 987 6543',
    role: 'asistente',
    status: 'active',
    createdAt: '2023-03-20',
    lastLogin: '2024-01-15 08:15:00'
  },
  {
    id: 3,
    firstName: 'Carmen Rosa',
    lastName: 'Jiménez',
    name: 'Carmen Rosa Jiménez',
    documentId: '52987654',
    email: 'carmen@asthroapp.com',
    phone: '+57 300 555 7890',
    role: 'asistente',
    status: 'active',
    createdAt: '2023-06-10',
    lastLogin: '2024-01-14 16:45:00'
  },
  {
    id: 4,
    firstName: 'Ana Patricia',
    lastName: 'Rodríguez',
    name: 'Ana Patricia Rodríguez',
    documentId: '1098765432',
    email: 'ana.rodriguez@gmail.com',
    phone: '+57 315 555 1234',
    role: 'customer',
    status: 'active',
    createdAt: '2023-08-10',
    address: 'Carrera 45 #23-67, Medellín',
    birthDate: '1988-03-15',
    emergencyContact: 'Carlos Rodríguez',
    emergencyPhone: '+57 315 555 4321',
    allergies: 'Ninguna conocida',
    skinType: 'Mixta',
    hairType: 'Graso, rizado',
    preferredServices: ['Corte y Peinado', 'Tratamiento Capilar'],
    notes: 'Prefiere citas en la mañana, cabello sensible',
    visitCount: 12,
    totalSpent: 420000,
    lastVisit: '2024-01-16',
    frequency: 'high'
  },
  {
    id: 5,
    firstName: 'Isabella',
    lastName: 'Torres',
    name: 'Isabella Torres',
    documentId: '1087654321',
    email: 'isabella.torres@gmail.com',
    phone: '+57 312 444 5678',
    role: 'customer',
    status: 'active',
    createdAt: '2023-09-15',
    address: 'Calle 70 #15-32, Medellín',
    birthDate: '1992-07-22',
    emergencyContact: 'María Torres',
    emergencyPhone: '+57 312 444 8765',
    allergies: 'Alérgica al níquel',
    skinType: 'Seca',
    hairType: 'Seco, teñido',
    preferredServices: ['Coloración', 'Manicure & Pedicure'],
    notes: 'Cliente VIP, siempre solicita la misma estilista',
    visitCount: 8,
    totalSpent: 680000,
    lastVisit: '2024-01-16',
    frequency: 'medium'
  },
  {
    id: 6,
    firstName: 'Valentina',
    lastName: 'López',
    name: 'Valentina López',
    documentId: '1076543210',
    email: 'valentina.lopez@gmail.com',
    phone: '+57 318 777 9012',
    role: 'customer',
    status: 'active',
    createdAt: '2023-10-20',
    address: 'Avenida 80 #45-123, Medellín',
    birthDate: '1995-11-08',
    emergencyContact: 'Luis López',
    emergencyPhone: '+57 318 777 2109',
    allergies: 'Productos con parabenos',
    skinType: 'Grasa',
    hairType: 'Normal, liso',
    preferredServices: ['Peinado Especial'],
    notes: 'Estudiante, descuento aplicado',
    visitCount: 5,
    totalSpent: 275000,
    lastVisit: '2024-01-15',
    frequency: 'low'
  },
  {
    id: 7,
    firstName: 'Carolina',
    lastName: 'Mendoza',
    name: 'Carolina Mendoza',
    documentId: '1065432109',
    email: 'carolina.mendoza@gmail.com',
    phone: '+57 301 888 3456',
    role: 'customer',
    status: 'active',
    createdAt: '2023-05-12',
    address: 'Carrera 65 #89-45, Medellín',
    birthDate: '1985-02-28',
    emergencyContact: 'Roberto Mendoza',
    emergencyPhone: '+57 301 888 6543',
    allergies: 'Ninguna',
    skinType: 'Normal',
    hairType: 'Graso, ondulado',
    preferredServices: ['Corte y Peinado', 'Coloración'],
    notes: 'Cliente frecuente, siempre puntual',
    visitCount: 18,
    totalSpent: 850000,
    lastVisit: '2024-01-14',
    frequency: 'high'
  },
  {
    id: 8,
    firstName: 'Sofía',
    lastName: 'Ramírez',
    name: 'Sofía Ramírez',
    documentId: '1054321098',
    email: 'sofia.ramirez@gmail.com',
    phone: '+57 304 999 7890',
    role: 'customer',
    status: 'active',
    createdAt: '2023-12-03',
    address: 'Calle 25 #78-90, Medellín',
    birthDate: '1990-09-12',
    emergencyContact: 'Ana Ramírez',
    emergencyPhone: '+57 304 999 0987',
    allergies: 'Alérgica a tintes con amoníaco',
    skinType: 'Sensible',
    hairType: 'Fino, frágil',
    preferredServices: ['Tratamiento Capilar'],
    notes: 'Requiere productos especiales para cabello sensible',
    visitCount: 3,
    totalSpent: 165000,
    lastVisit: '2024-01-12',
    frequency: 'low'
  }
];

export const mockRoles: Role[] = [
  {
    id: 'super_admin',
    name: 'Super Administrador',
    description: 'Acceso total y absoluto al sistema. Rol asignado a Astrid Eugenia Hoyos.',
    permissions: [
      'module_appointments', 'module_categories', 'module_clients', 'module_purchases',
      'module_employees', 'module_deliveries', 'module_schedules', 'module_supplies',
      'module_suppliers', 'module_roles', 'module_services', 'module_users',
      'module_sales', 'module_dashboard'
    ],
    status: 'active',
    isSuperUser: true, // Super usuario - no se puede desactivar ni eliminar
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01'
  },
  {
    id: 'admin',
    name: 'Administrador',
    description: 'Acceso administrativo para gestión del salón',
    permissions: [
      'module_appointments', 'module_categories', 'module_clients', 'module_purchases',
      'module_employees', 'module_deliveries', 'module_schedules', 'module_supplies',
      'module_suppliers', 'module_roles', 'module_services', 'module_users',
      'module_sales', 'module_dashboard'
    ],
    status: 'active',
    isSuperUser: false,
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01'
  },
  {
    id: 'asistente',
    name: 'Asistente',
    description: 'Personal del salón con acceso limitado para operaciones diarias',
    permissions: [
      'module_appointments', 'module_services', 'module_sales',
      'module_clients', 'module_dashboard', 'module_supplies'
    ],
    status: 'active',
    isSuperUser: false,
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01'
  },
  {
    id: 'customer',
    name: 'Cliente',
    description: 'Acceso para clientes del salón',
    permissions: [
      'module_appointments', 'module_services', 'module_dashboard'
    ],
    status: 'active',
    isSuperUser: false,
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01'
  }
];

export const mockPermissions: Permission[] = [
  { id: 'module_appointments', name: 'Agenda', description: 'Gestión integral de agendamiento y Google Calendar', module: 'appointments' },
  { id: 'module_categories', name: 'Categoría', description: 'Organización de servicios y productos por categorías', module: 'categories' },
  { id: 'module_clients', name: 'Clientes', description: 'Gestión de base de datos de clientes y expedientes', module: 'clients' },
  { id: 'module_purchases', name: 'Compras', description: 'Gestión de órdenes de compra y abastecimiento', module: 'purchases' },
  { id: 'module_employees', name: 'Empleados', description: 'Gestión de empleados y perfiles del personal', module: 'employees' },
  { id: 'module_deliveries', name: 'Entregas', description: 'Registro de entregas de insumos al personal', module: 'deliveries' },
  { id: 'module_schedules', name: 'Horarios', description: 'Administración de jornadas laborales y excepciones', module: 'schedules' },
  { id: 'module_supplies', name: 'Insumo', description: 'Control detallado de insumos de uso interno', module: 'supplies' },
  { id: 'module_suppliers', name: 'Proveedores', description: 'Directorio y gestión de proveedores del salón', module: 'suppliers' },
  { id: 'module_roles', name: 'Roles', description: 'Gestión de roles y permisos del sistema', module: 'roles' },
  { id: 'module_services', name: 'Servicios', description: 'Administración de catálogo de servicios y precios', module: 'services' },
  { id: 'module_users', name: 'Usuarios', description: 'Gestión de usuarios y perfiles del sistema', module: 'users' },
  { id: 'module_sales', name: 'Ventas', description: 'Registro de ventas de productos y servicios agendados', module: 'sales' },
  { id: 'module_dashboard', name: 'Dashboard', description: 'Acceso completo al panel de control interactivo', module: 'dashboard' }
];

export const mockServices = [
  {
    id: 1,
    name: 'Corte y Peinado',
    description: 'Corte personalizado según tu tipo de rostro y estilo',
    price: 35000,
    duration: 45,
    category: 'Cortes',
    supplies: [],
    employeeRequired: true,
    status: 'active',
    createdAt: '2023-01-01'
  },
  {
    id: 2,
    name: 'Tratamiento Capilar',
    description: 'Hidratación profunda para cabello dañado y seco',
    price: 55000,
    duration: 60,
    category: 'Tratamientos',
    supplies: [],
    employeeRequired: true,
    status: 'active',
    createdAt: '2023-01-01'
  },
  {
    id: 3,
    name: 'Coloración',
    description: 'Tintes y mechas con productos de alta calidad',
    price: 85000,
    duration: 120,
    category: 'Coloración',
    supplies: [],
    employeeRequired: true,
    status: 'active',
    createdAt: '2023-01-01'
  },
  {
    id: 4,
    name: 'Peinado Especial',
    description: 'Peinados para eventos especiales y ocasiones importantes',
    price: 65000,
    duration: 90,
    category: 'Peinados',
    supplies: [],
    employeeRequired: true,
    status: 'active',
    createdAt: '2023-01-01'
  },
  {
    id: 5,
    name: 'Manicure & Pedicure',
    description: 'Cuidado completo de manos y pies',
    price: 45000,
    duration: 75,
    category: 'Cuidado Corporal',
    supplies: [],
    employeeRequired: true,
    status: 'active',
    createdAt: '2023-01-01'
  }
];

export const mockProducts = [
  {
    id: 1,
    name: 'Shampoo Hidratante',
    description: 'Shampoo formulado para cabellos secos y dañados',
    sku: 'SHAM-001',
    category: 'Cuidado Capilar',
    brand: 'L\'Oréal',
    price: 25000,
    costPrice: 15000,
    stock: 45,
    minStock: 10,
    maxStock: 100,
    unit: 'unidad',
    supplierId: 1,
    status: 'active',
    location: 'Almacén A - Estante 1',
    image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop',
    createdAt: '2023-06-01',
    updatedAt: '2024-01-15'
  },
  {
    id: 2,
    name: 'Acondicionador Reparador',
    description: 'Acondicionador para reparar y nutrir el cabello',
    sku: 'ACON-001',
    category: 'Cuidado Capilar',
    brand: 'L\'Oréal',
    price: 22000,
    costPrice: 13000,
    stock: 32,
    minStock: 8,
    maxStock: 80,
    unit: 'unidad',
    supplierId: 1,
    status: 'active',
    location: 'Almacén A - Estante 1',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop',
    createdAt: '2023-06-01',
    updatedAt: '2024-01-15'
  },
  {
    id: 3,
    name: 'Mascarilla Nutritiva',
    description: 'Mascarilla intensiva para cabello muy dañado',
    sku: 'MASC-001',
    category: 'Tratamientos',
    brand: 'Matrix',
    price: 35000,
    costPrice: 20000,
    stock: 18,
    minStock: 5,
    maxStock: 50,
    unit: 'unidad',
    supplierId: 2,
    status: 'active',
    location: 'Almacén A - Estante 2',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop',
    createdAt: '2023-07-15',
    updatedAt: '2024-01-14'
  },
  {
    id: 4,
    name: 'Serum Anti-Frizz',
    description: 'Serum controlador de frizz con protección térmica',
    sku: 'SER-001',
    category: 'Styling',
    brand: 'Redken',
    price: 28000,
    costPrice: 16000,
    stock: 25,
    minStock: 8,
    maxStock: 60,
    unit: 'unidad',
    supplierId: 3,
    status: 'active',
    location: 'Almacén B - Estante 1',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    createdAt: '2023-08-20',
    updatedAt: '2024-01-12'
  },
  {
    id: 5,
    name: 'Aceite Capilar Orgánico',
    description: 'Aceite nutritivo 100% orgánico para todo tipo de cabello',
    sku: 'ACE-001',
    category: 'Orgánicos',
    brand: 'Organic Beauty',
    price: 38000,
    costPrice: 22000,
    stock: 12,
    minStock: 5,
    maxStock: 40,
    unit: 'unidad',
    supplierId: 4,
    status: 'active',
    location: 'Almacén B - Estante 2',
    image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&h=400&fit=crop',
    createdAt: '2023-09-10',
    updatedAt: '2024-01-10'
  },
  {
    id: 6,
    name: 'Spray Protector Térmico',
    description: 'Protector térmico para uso con herramientas de calor',
    sku: 'SPR-001',
    category: 'Protección',
    brand: 'L\'Oréal',
    price: 18000,
    costPrice: 10000,
    stock: 35,
    minStock: 12,
    maxStock: 80,
    unit: 'unidad',
    supplierId: 1,
    status: 'active',
    location: 'Almacén B - Estante 1',
    image: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400&h=400&fit=crop',
    createdAt: '2023-10-05',
    updatedAt: '2024-01-16'
  }
];

export const mockAppointments = [
  {
    id: 1,
    customerId: 4,
    employeeId: 2,
    serviceId: 1,
    date: '2024-01-18',
    time: '10:00',
    duration: 45,
    status: 'confirmed',
    totalCost: 35000,
    createdAt: '2024-01-16',
    updatedAt: '2024-01-16'
  },
  {
    id: 2,
    customerId: 5,
    employeeId: 1,
    serviceId: 3,
    date: '2024-01-19',
    time: '14:30',
    duration: 120,
    status: 'pending',
    totalCost: 85000,
    notes: 'Cliente solicita coloración específica',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15'
  },
  {
    id: 3,
    customerId: 6,
    employeeId: 3,
    serviceId: 2,
    date: '2024-01-17',
    time: '16:00',
    duration: 60,
    status: 'completed',
    totalCost: 55000,
    createdAt: '2024-01-12',
    updatedAt: '2024-01-17'
  }
];

export const mockSales: Sale[] = [
  {
    id: 'VNT-001',
    customerId: 4,
    employeeId: 2,
    date: '2024-01-16',
    time: '10:30',
    items: [
      { productId: 1, quantity: 1, unitPrice: 25000, discount: 0, totalPrice: 25000 },
      { productId: 3, quantity: 1, unitPrice: 35000, discount: 0, totalPrice: 35000 }
    ],
    services: [
      { serviceId: 1, price: 35000, discount: 0, totalPrice: 35000 }
    ],
    subtotal: 95000,
    discount: 0,
    tax: 18050,
    total: 113050,
    paymentMethod: 'card',
    status: 'completed',
    notes: 'Cliente habitual, servicio completo',
    createdAt: '2024-01-16',
    updatedAt: '2024-01-16'
  },
  {
    id: 'VNT-002',
    customerId: 5,
    employeeId: 1,
    date: '2024-01-16',
    time: '14:15',
    items: [],
    services: [
      { serviceId: 2, price: 55000, discount: 0, totalPrice: 55000 },
      { serviceId: 5, price: 45000, discount: 0, totalPrice: 45000 }
    ],
    subtotal: 100000,
    discount: 0,
    tax: 19000,
    total: 119000,
    paymentMethod: 'cash',
    status: 'completed',
    notes: 'Pago en efectivo',
    createdAt: '2024-01-16',
    updatedAt: '2024-01-16'
  },
  {
    id: 'VNT-003',
    customerId: 6,
    employeeId: 3,
    date: '2024-01-15',
    time: '11:00',
    items: [
      { productId: 2, quantity: 2, unitPrice: 22000, discount: 2000, totalPrice: 42000 },
      { productId: 4, quantity: 1, unitPrice: 28000, discount: 0, totalPrice: 28000 }
    ],
    services: [
      { serviceId: 3, price: 85000, discount: 5000, totalPrice: 80000 }
    ],
    subtotal: 150000,
    discount: 7000,
    tax: 27170,
    total: 170170,
    paymentMethod: 'transfer',
    status: 'completed',
    notes: 'Coloración completa con productos premium',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15'
  },
  {
    id: 'VNT-004',
    customerId: 4,
    employeeId: 2,
    date: '2024-01-15',
    time: '16:30',
    items: [
      { productId: 5, quantity: 1, unitPrice: 38000, discount: 0, totalPrice: 38000 }
    ],
    services: [],
    subtotal: 38000,
    discount: 0,
    tax: 7220,
    total: 45220,
    paymentMethod: 'card',
    status: 'completed',
    notes: 'Solo compra de producto',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15'
  },
  {
    id: 'VNT-005',
    customerId: 5,
    employeeId: 1,
    date: '2024-01-14',
    time: '09:45',
    items: [],
    services: [
      { serviceId: 4, price: 65000, discount: 0, totalPrice: 65000 }
    ],
    subtotal: 65000,
    discount: 0,
    tax: 12350,
    total: 77350,
    paymentMethod: 'mixed',
    status: 'completed',
    notes: 'Pago completado - mitad efectivo, mitad tarjeta',
    createdAt: '2024-01-14',
    updatedAt: '2024-01-14'
  },
  {
    id: 'VNT-006',
    customerId: 6,
    employeeId: 3,
    date: '2024-01-13',
    time: '13:20',
    items: [
      { productId: 1, quantity: 1, unitPrice: 25000, discount: 0, totalPrice: 25000 },
      { productId: 6, quantity: 1, unitPrice: 18000, discount: 0, totalPrice: 18000 }
    ],
    services: [
      { serviceId: 1, price: 35000, discount: 0, totalPrice: 35000 }
    ],
    subtotal: 78000,
    discount: 0,
    tax: 14820,
    total: 92820,
    paymentMethod: 'card',
    status: 'refunded',
    notes: 'Reembolso solicitado por cliente',
    createdAt: '2024-01-13',
    updatedAt: '2024-01-14'
  },
  {
    id: 'VNT-007',
    customerId: 4,
    employeeId: 1,
    date: '2024-01-12',
    time: '15:00',
    items: [],
    services: [
      { serviceId: 2, price: 55000, discount: 5000, totalPrice: 50000 }
    ],
    subtotal: 50000,
    discount: 5000,
    tax: 9500,
    total: 54500,
    paymentMethod: 'cash',
    status: 'completed',
    notes: 'Descuento por fidelidad',
    createdAt: '2024-01-12',
    updatedAt: '2024-01-12'
  },
  {
    id: 'VNT-008',
    customerId: 5,
    employeeId: 2,
    date: '2024-01-11',
    time: '10:15',
    items: [
      { productId: 3, quantity: 1, unitPrice: 35000, discount: 0, totalPrice: 35000 }
    ],
    services: [
      { serviceId: 1, price: 35000, discount: 0, totalPrice: 35000 },
      { serviceId: 2, price: 55000, discount: 0, totalPrice: 55000 }
    ],
    subtotal: 125000,
    discount: 0,
    tax: 23750,
    total: 148750,
    paymentMethod: 'transfer',
    status: 'completed',
    notes: 'Paquete completo de cuidado capilar',
    createdAt: '2024-01-11',
    updatedAt: '2024-01-11'
  }
];

export const mockCategories: Category[] = [
  {
    id: 1,
    name: 'Cuidado Capilar',
    description: 'Productos para el cuidado y mantenimiento del cabello',
    type: 'product',
    status: 'active',
    productCount: 15,
    totalDemand: 85,
    createdAt: '2023-01-01',
    updatedAt: '2024-01-15'
  },
  {
    id: 2,
    name: 'Tratamientos',
    description: 'Productos especializados para tratamientos capilares',
    type: 'product',
    status: 'active',
    productCount: 8,
    totalDemand: 65,
    createdAt: '2023-01-01',
    updatedAt: '2024-01-12'
  },
  {
    id: 3,
    name: 'Styling',
    description: 'Productos para peinado y acabado',
    type: 'product',
    status: 'active',
    productCount: 12,
    totalDemand: 70,
    createdAt: '2023-01-01',
    updatedAt: '2024-01-10'
  },
  {
    id: 4,
    name: 'Orgánicos',
    description: 'Productos naturales y orgánicos',
    type: 'product',
    status: 'active',
    productCount: 6,
    totalDemand: 45,
    createdAt: '2023-01-01',
    updatedAt: '2024-01-08'
  },
  {
    id: 5,
    name: 'Cortes',
    description: 'Servicios de corte de cabello',
    type: 'service',
    status: 'active',
    productCount: 5,
    totalDemand: 95,
    createdAt: '2023-01-01',
    updatedAt: '2024-01-16'
  },
  {
    id: 6,
    name: 'Coloración',
    description: 'Servicios de coloración y mechas',
    type: 'service',
    status: 'active',
    productCount: 8,
    totalDemand: 80,
    createdAt: '2023-01-01',
    updatedAt: '2024-01-14'
  }
];

export const mockSuppliers: Supplier[] = [
  {
    id: 1,
    name: 'Distribuidora L\'Oréal Colombia',
    contactPerson: 'Carlos Mendoza',
    email: 'carlos.mendoza@loreal.com.co',
    phone: '+57 1 234 5678',
    address: 'Av. El Dorado #68-16',
    department: 'Cundinamarca',
    city: 'Bogotá',
    taxId: '900123456-7',
    supplierType: 'juridica',
    paymentTerms: '30 días',
    rating: 4.8,
    status: 'active',
    products: [
      {
        productId: 1,
        productName: 'Shampoo Hidratante',
        productImage: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=300&h=300&fit=crop',
        supplierPrice: 15000,
        minimumOrder: 12,
        leadTime: 5
      },
      {
        productId: 2,
        productName: 'Acondicionador Reparador',
        productImage: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop',
        supplierPrice: 13000,
        minimumOrder: 12,
        leadTime: 5
      }
    ],
    lastOrderDate: '2024-01-10',
    totalOrders: 25,
    image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop',
    createdAt: '2023-01-15',
    updatedAt: '2024-01-15'
  },
  {
    id: 2,
    name: 'Matrix Professional Colombia',
    contactPerson: 'Ana Lucía Martínez',
    email: 'ana.martinez@matrix.com.co',
    phone: '+57 1 345 6789',
    address: 'Calle 72 #11-45',
    department: 'Cundinamarca',
    city: 'Bogotá',
    taxId: '900234567-8',
    supplierType: 'juridica',
    paymentTerms: '45 días',
    rating: 4.6,
    status: 'active',
    products: [
      {
        productId: 3,
        productName: 'Mascarilla Nutritiva',
        productImage: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&h=300&fit=crop',
        supplierPrice: 20000,
        minimumOrder: 6,
        leadTime: 7
      }
    ],
    lastOrderDate: '2024-01-08',
    totalOrders: 18,
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
    createdAt: '2023-02-20',
    updatedAt: '2024-01-08'
  },
  {
    id: 3,
    name: 'Redken Distribuciones SAS',
    contactPerson: 'Miguel Ángel Restrepo',
    email: 'miguel.restrepo@redken.com.co',
    phone: '+57 4 456 7890',
    address: 'Carrera 70 #52-83',
    department: 'Antioquia',
    city: 'Medellín',
    taxId: '900345678-9',
    supplierType: 'juridica',
    paymentTerms: '60 días',
    rating: 4.9,
    status: 'active',
    products: [
      {
        productId: 4,
        productName: 'Serum Anti-Frizz',
        productImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
        supplierPrice: 16000,
        minimumOrder: 10,
        leadTime: 3
      }
    ],
    lastOrderDate: '2024-01-12',
    totalOrders: 22,
    image: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=400&h=300&fit=crop',
    createdAt: '2023-03-10',
    updatedAt: '2024-01-12'
  },
  {
    id: 4,
    name: 'Organic Beauty Supplies',
    contactPerson: 'Sofía Hernández',
    email: 'sofia.hernandez@organicbeauty.co',
    phone: '+57 5 567 8901',
    address: 'Carrera 43 #34-108',
    department: 'Atlántico',
    city: 'Barranquilla',
    taxId: '900456789-0',
    supplierType: 'juridica',
    paymentTerms: '15 días',
    rating: 4.7,
    status: 'active',
    products: [
      {
        productId: 5,
        productName: 'Aceite Capilar Orgánico',
        productImage: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=300&h=300&fit=crop',
        supplierPrice: 22000,
        minimumOrder: 8,
        leadTime: 10
      }
    ],
    lastOrderDate: '2024-01-05',
    totalOrders: 12,
    image: 'https://images.unsplash.com/photo-1591123549928-52a6ccd7bc96?w=400&h=300&fit=crop',
    createdAt: '2023-04-15',
    updatedAt: '2024-01-05'
  },
  {
    id: 5,
    name: 'María Elena Vargas',
    contactPerson: 'María Elena Vargas',
    email: 'mariaelena.vargas@gmail.com',
    phone: '+57 310 123 4567',
    address: 'Carrera 48 #67-23',
    department: 'Antioquia',
    city: 'Medellín',
    taxId: '43765432-1',
    supplierType: 'natural',
    paymentTerms: '15 días',
    rating: 4.5,
    status: 'active',
    products: [
      {
        productId: 6,
        productName: 'Aceites Esenciales Artesanales',
        productImage: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=300&h=300&fit=crop',
        supplierPrice: 12000,
        minimumOrder: 5,
        leadTime: 3
      }
    ],
    lastOrderDate: '2024-01-14',
    totalOrders: 8,
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=300&fit=crop',
    createdAt: '2023-05-20',
    updatedAt: '2024-01-14'
  },
  {
    id: 6,
    name: 'Carlos Roberto Sánchez',
    contactPerson: 'Carlos Roberto Sánchez',
    email: 'carlos.sanchez.natural@outlook.com',
    phone: '+57 315 987 6543',
    address: 'Calle 52 #34-89',
    department: 'Antioquia',
    city: 'Envigado',
    taxId: '71234567-8',
    supplierType: 'natural',
    paymentTerms: '30 días',
    rating: 4.3,
    status: 'active',
    products: [
      {
        productId: 7,
        productName: 'Herramientas de Corte Profesionales',
        productImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=300&fit=crop',
        supplierPrice: 45000,
        minimumOrder: 2,
        leadTime: 7
      }
    ],
    lastOrderDate: '2024-01-11',
    totalOrders: 5,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    createdAt: '2023-07-10',
    updatedAt: '2024-01-11'
  }
];

export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: 1001,
    supplierId: 1,
    orderDate: '2024-01-15',
    expectedDate: '2024-01-20',
    receivedDate: '2024-01-19',
    status: 'approved',
    items: [
      {
        productId: 1,
        productName: 'Shampoo Hidratante',
        quantity: 24,
        unitPrice: 15000,
        totalPrice: 360000,
        received: 24
      },
      {
        productId: 2,
        productName: 'Acondicionador Reparador',
        quantity: 18,
        unitPrice: 13000,
        totalPrice: 234000,
        received: 18
      }
    ],
    subtotal: 594000,
    tax: 112860,
    total: 706860,
    notes: 'Pedido urgente para restock',
    createdBy: 1,
    createdAt: '2024-01-15',
    updatedAt: '2024-01-19'
  },
  {
    id: 1002,
    supplierId: 3,
    orderDate: '2024-01-12',
    expectedDate: '2024-01-15',
    status: 'approved',
    items: [
      {
        productId: 4,
        productName: 'Serum Anti-Frizz',
        quantity: 20,
        unitPrice: 16000,
        totalPrice: 320000,
        received: 0
      }
    ],
    subtotal: 320000,
    tax: 60800,
    total: 380800,
    notes: 'Promoción especial del proveedor',
    createdBy: 1,
    createdAt: '2024-01-12',
    updatedAt: '2024-01-13'
  },
  {
    id: 1003,
    supplierId: 2,
    orderDate: '2024-01-08',
    expectedDate: '2024-01-15',
    receivedDate: '2024-01-14',
    status: 'cancelled',
    items: [
      {
        productId: 3,
        productName: 'Mascarilla Nutritiva',
        quantity: 12,
        unitPrice: 20000,
        totalPrice: 240000,
        received: 12
      }
    ],
    subtotal: 240000,
    tax: 45600,
    total: 285600,
    notes: 'Pedido mensual regular',
    createdBy: 1,
    createdAt: '2024-01-08',
    updatedAt: '2024-01-14'
  },
  {
    id: 1004,
    supplierId: 4,
    orderDate: '2024-01-10',
    expectedDate: '2024-01-20',
    status: 'approved',
    items: [
      {
        productId: 5,
        productName: 'Aceite Capilar Orgánico',
        quantity: 16,
        unitPrice: 22000,
        totalPrice: 352000,
        received: 0
      }
    ],
    subtotal: 352000,
    tax: 66880,
    total: 418880,
    notes: 'Primera compra con este proveedor',
    createdBy: 1,
    createdAt: '2024-01-10',
    updatedAt: '2024-01-11'
  },
  {
    id: 1005,
    supplierId: 1,
    orderDate: '2024-01-16',
    expectedDate: '2024-01-21',
    status: 'approved',
    items: [
      {
        productId: 1,
        productName: 'Shampoo Hidratante',
        quantity: 12,
        unitPrice: 15000,
        totalPrice: 180000,
        received: 0
      },
      {
        productId: 6,
        productName: 'Spray Protector Térmico',
        quantity: 24,
        unitPrice: 10000,
        totalPrice: 240000,
        received: 0
      }
    ],
    subtotal: 420000,
    tax: 79800,
    total: 499800,
    notes: 'Pedido para promoción del mes',
    createdBy: 1,
    createdAt: '2024-01-16'
  }
];

export const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    customerId: 4,
    items: [
      { productId: 1, quantity: 2, unitPrice: 25000, totalPrice: 50000, status: 'pending' },
      { productId: 3, quantity: 1, unitPrice: 35000, totalPrice: 35000, status: 'pending' }
    ],
    status: 'pending',
    orderDate: '2024-01-16',
    expectedDate: '2024-01-18',
    subtotal: 85000,
    tax: 16150,
    total: 101150,
    paymentStatus: 'paid',
    paymentMethod: 'card',
    pickupMethod: 'store_pickup',
    notes: 'Cliente solicita empaque especial',
    createdAt: '2024-01-16',
    updatedAt: '2024-01-16'
  },
  {
    id: 'ORD-002',
    customerId: 5,
    items: [
      { productId: 2, quantity: 1, unitPrice: 22000, totalPrice: 22000, status: 'prepared' },
      { productId: 4, quantity: 3, unitPrice: 28000, totalPrice: 84000, status: 'pending' }
    ],
    status: 'processing',
    orderDate: '2024-01-15',
    expectedDate: '2024-01-17',
    subtotal: 106000,
    tax: 20140,
    total: 126140,
    paymentStatus: 'paid',
    paymentMethod: 'transfer',
    pickupMethod: 'store_pickup',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-16'
  },
  {
    id: 'ORD-003',
    customerId: 6,
    items: [
      { productId: 5, quantity: 1, unitPrice: 38000, totalPrice: 38000, status: 'delivered' }
    ],
    status: 'completed',
    orderDate: '2024-01-14',
    expectedDate: '2024-01-16',
    completedDate: '2024-01-16',
    subtotal: 38000,
    tax: 7220,
    total: 45220,
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    pickupMethod: 'store_pickup',
    createdAt: '2024-01-14',
    updatedAt: '2024-01-16'
  },
  {
    id: 'ORD-004',
    customerId: 4,
    items: [
      { productId: 1, quantity: 1, unitPrice: 25000, totalPrice: 25000, status: 'prepared' },
      { productId: 6, quantity: 2, unitPrice: 18000, totalPrice: 36000, status: 'prepared' }
    ],
    status: 'ready',
    orderDate: '2024-01-13',
    expectedDate: '2024-01-15',
    subtotal: 61000,
    tax: 11590,
    total: 72590,
    paymentStatus: 'paid',
    paymentMethod: 'card',
    pickupMethod: 'store_pickup',
    notes: 'Pedido listo para recoger',
    createdAt: '2024-01-13',
    updatedAt: '2024-01-15'
  },
  {
    id: 'ORD-005',
    customerId: 5,
    items: [
      { productId: 2, quantity: 2, unitPrice: 22000, totalPrice: 44000, status: 'pending' }
    ],
    status: 'pending',
    orderDate: '2024-01-16',
    expectedDate: '2024-01-18',
    subtotal: 44000,
    tax: 8360,
    total: 52360,
    paymentStatus: 'pending',
    pickupMethod: 'store_pickup',
    notes: 'Cliente pagará al recoger',
    createdAt: '2024-01-16',
    updatedAt: '2024-01-16'
  }
];

export const mockSupplies: Supply[] = [
  {
    id: 1,
    name: 'Peróxido de Hidrógeno 40vol',
    description: 'Agente oxidante para coloración capilar',
    sku: 'SUP-001',
    type: 'chemical',
    quantity: 8,
    unit: 'litros',
    location: 'Almacén A - Estante 2',
    expirationDate: '2024-03-15',
    status: 'low_stock',
    supplierId: 1,
    unitCost: 12000,
    minStock: 10,
    maxStock: 50,
    notes: 'Mantener en lugar fresco y seco',
    createdAt: '2023-06-15',
    updatedAt: '2024-01-16'
  },
  {
    id: 2,
    name: 'Tijeras Profesionales Mizutani',
    description: 'Tijeras de corte profesional 5.5 pulgadas',
    sku: 'SUP-002',
    type: 'tool',
    quantity: 3,
    unit: 'unidades',
    location: 'Estación 1 - Cajón Superior',
    status: 'active',
    supplierId: 2,
    unitCost: 150000,
    minStock: 2,
    maxStock: 8,
    notes: 'Requiere mantenimiento cada 6 meses',
    createdAt: '2023-08-20',
    updatedAt: '2024-01-10'
  },
  {
    id: 3,
    name: 'Toallas Desechables',
    description: 'Toallas de papel desechables para servicios',
    sku: 'SUP-003',
    type: 'consumable',
    quantity: 150,
    unit: 'unidades',
    location: 'Almacén B - Estante 1',
    status: 'active',
    supplierId: 3,
    unitCost: 500,
    minStock: 100,
    maxStock: 500,
    createdAt: '2023-12-01',
    updatedAt: '2024-01-15'
  },
  {
    id: 4,
    name: 'Amoníaco Líquido',
    description: 'Amoníaco para servicios de coloración',
    sku: 'SUP-004',
    type: 'chemical',
    quantity: 2,
    unit: 'litros',
    location: 'Almacén A - Estante 3',
    expirationDate: '2024-02-28',
    status: 'low_stock',
    supplierId: 1,
    unitCost: 8000,
    minStock: 5,
    maxStock: 25,
    notes: 'Producto peligroso - usar con ventilación',
    createdAt: '2023-10-15',
    updatedAt: '2024-01-16'
  },
  {
    id: 5,
    name: 'Secador Profesional Parlux',
    description: 'Secador profesional 2100W con tecnología iónica',
    sku: 'SUP-005',
    type: 'equipment',
    quantity: 4,
    unit: 'unidades',
    location: 'Estaciones de Trabajo',
    status: 'active',
    supplierId: 4,
    costPrice: 180000,
    minStock: 3,
    maxStock: 6,
    notes: 'Revisión técnica anual requerida',
    createdAt: '2023-09-10',
    updatedAt: '2024-01-12'
  },
  {
    id: 6,
    name: 'Desinfectante Barbicide',
    description: 'Solución desinfectante para herramientas',
    sku: 'SUP-006',
    type: 'cleaning',
    quantity: 12,
    unit: 'litros',
    location: 'Almacén B - Estante 2',
    expirationDate: '2024-06-30',
    status: 'active',
    supplierId: 2,
    costPrice: 15000,
    minStock: 8,
    maxStock: 30,
    notes: 'Usar dilución 1:16 con agua',
    createdAt: '2023-11-20',
    updatedAt: '2024-01-14'
  },
  {
    id: 7,
    name: 'Papel Aluminio para Mechas',
    description: 'Papel aluminio especial para técnicas de coloración',
    sku: 'SUP-007',
    type: 'consumable',
    quantity: 25,
    unit: 'rollos',
    location: 'Almacén A - Estante 1',
    status: 'active',
    supplierId: 3,
    costPrice: 2500,
    minStock: 20,
    maxStock: 100,
    createdAt: '2023-12-15',
    updatedAt: '2024-01-16'
  },
  {
    id: 8,
    name: 'Guantes de Nitrilo',
    description: 'Guantes desechables de nitrilo sin polvo',
    sku: 'SUP-008',
    type: 'consumable',
    quantity: 5,
    unit: 'cajas',
    location: 'Almacén B - Estante 3',
    status: 'low_stock',
    supplierId: 4,
    costPrice: 12000,
    minStock: 10,
    maxStock: 50,
    notes: 'Caja contiene 100 unidades',
    createdAt: '2023-07-25',
    updatedAt: '2024-01-16'
  }
];

export const mockSupplyDeliveries: SupplyDelivery[] = [
  {
    id: 1,
    supplyId: 1,
    deliveryDate: '2024-01-16',
    quantity: 3,
    destination: 'Estación 2',
    responsiblePerson: 'María Fernanda Gómez',
    responsibleId: 2,
    status: 'completed',
    notes: 'Entrega para servicio de coloración especial',
    createdBy: 1,
    createdAt: '2024-01-16',
    completedAt: '2024-01-16'
  },
  {
    id: 2,
    supplyId: 3,
    deliveryDate: '2024-01-16',
    quantity: 50,
    destination: 'Estaciones Generales',
    responsiblePerson: 'Carmen Rosa Jiménez',
    responsibleId: 3,
    status: 'pending',
    notes: 'Restock semanal de toallas',
    createdBy: 1,
    createdAt: '2024-01-16'
  },
  {
    id: 3,
    supplyId: 6,
    deliveryDate: '2024-01-15',
    quantity: 2,
    destination: 'Área de Desinfección',
    responsiblePerson: 'María Fernanda Gómez',
    responsibleId: 2,
    status: 'completed',
    notes: 'Entrega rutinaria de desinfectante',
    createdBy: 1,
    createdAt: '2024-01-15',
    completedAt: '2024-01-15'
  },
  {
    id: 4,
    supplyId: 7,
    deliveryDate: '2024-01-14',
    quantity: 10,
    destination: 'Estación de Coloración',
    responsiblePerson: 'Carmen Rosa Jiménez',
    responsibleId: 3,
    status: 'completed',
    notes: 'Papel aluminio para servicios de coloración',
    createdBy: 1,
    createdAt: '2024-01-14',
    completedAt: '2024-01-14'
  },
  {
    id: 5,
    supplyId: 8,
    deliveryDate: '2024-01-17',
    quantity: 2,
    destination: 'Todas las Estaciones',
    responsiblePerson: 'María Fernanda Gómez',
    responsibleId: 2,
    status: 'pending',
    notes: 'Distribución de guantes para la semana',
    createdBy: 1,
    createdAt: '2024-01-16'
  }
];