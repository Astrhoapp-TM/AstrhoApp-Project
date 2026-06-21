import {
  BarChart3, Users, Calendar, ShoppingCart, Package,
  UserCheck, Settings, Truck, Tag, FileText, Send, Wrench, DollarSign, Scissors, CalendarPlus
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: any;
  permission: string;
  category?: string;
}

export interface MenuCategory {
  name: string;
  items: MenuItem[];
}

export const ADMIN_MENU_ITEMS: MenuItem[] = [
  // Dashboard (sin categoría)
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    permission: 'module_dashboard'
  },
  // CONFIGURACIÓN
  {
    id: 'users',
    label: 'Usuarios',
    icon: Users,
    permission: 'module_users',
    category: 'Configuración'
  },
  {
    id: 'roles',
    label: 'Roles',
    icon: Settings,
    permission: 'module_roles',
    category: 'Configuración'
  },
  // AGENDA
  {
    id: 'appointments',
    label: 'Agendamiento',
    icon: CalendarPlus,
    permission: 'module_appointments',
    category: 'Agenda'
  },
  {
    id: 'schedules',
    label: 'Horarios',
    icon: Calendar,
    permission: 'module_schedules',
    category: 'Agenda'
  },
  // VENTAS
  {
    id: 'sales',
    label: 'Ventas',
    icon: DollarSign,
    permission: 'module_sales',
    category: 'Ventas'
  },
  {
    id: 'services',
    label: 'Servicios',
    icon: Scissors,
    permission: 'module_services',
    category: 'Ventas'
  },
  {
    id: 'clients',
    label: 'Clientes',
    icon: UserCheck,
    permission: 'module_clients',
    category: 'Ventas'
  },
  {
    id: 'employees',
    label: 'Empleados',
    icon: Users,
    permission: 'module_clients',
    category: 'Ventas'
  },
  // COMPRAS
  {
    id: 'products',
    label: 'Insumos',
    icon: Package,
    permission: 'module_supplies',
    category: 'Compras'
  },
  {
    id: 'purchases',
    label: 'Compras',
    icon: ShoppingCart,
    permission: 'module_purchases',
    category: 'Compras'
  },
  {
    id: 'categories',
    label: 'Categoría de Insumos',
    icon: Tag,
    permission: 'module_categories',
    category: 'Compras'
  },
  {
    id: 'suppliers',
    label: 'Proveedores',
    icon: Truck,
    permission: 'module_suppliers',
    category: 'Compras'
  },
  {
    id: 'deliveries',
    label: 'Entrega de insumos',
    icon: Send,
    permission: 'module_deliveries',
    category: 'Compras'
  }
];

export const getVisibleMenuItems = (menuItems: MenuItem[], hasPermission: (permission: string) => boolean): MenuItem[] => {
  return menuItems.filter(item => hasPermission(item.permission));
};

export const getMenuItemsByCategory = (
  menuItems: MenuItem[], 
  hasPermission: (permission: string) => boolean,
  userRole?: string
): MenuCategory[] => {
  let visibleItems = getVisibleMenuItems(menuItems, hasPermission);

  // Role-based filtering
  if (userRole === 'asistente') {
    const allowedIds = ['dashboard', 'appointments', 'schedules', 'sales'];
    visibleItems = visibleItems.filter(item => allowedIds.includes(item.id));
  }

  const categories: MenuCategory[] = [];

  // Dashboard sin categoría
  const dashboardItem = visibleItems.find(item => item.id === 'dashboard');
  if (dashboardItem) {
    categories.push({
      name: '',
      items: [dashboardItem]
    });
  }

  // Agrupar por categorías en el orden deseado
    const categoryOrder = ['Configuración', 'Agenda', 'Ventas', 'Compras'];

  categoryOrder.forEach(categoryName => {
    const categoryItems = visibleItems.filter(item => item.category === categoryName);
    if (categoryItems.length > 0) {
      categories.push({
        name: categoryName,
        items: categoryItems
      });
    }
  });

  return categories;
};