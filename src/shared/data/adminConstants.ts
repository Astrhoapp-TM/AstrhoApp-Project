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
    category: 'CONFIGURACIÓN'
  },
  {
    id: 'roles',
    label: 'Roles',
    icon: Settings,
    permission: 'module_roles',
    category: 'CONFIGURACIÓN'
  },
  // AGENDA
  {
    id: 'appointments',
    label: 'Agendamiento',
    icon: CalendarPlus,
    permission: 'module_appointments',
    category: 'AGENDA'
  },
  {
    id: 'schedules',
    label: 'Horarios',
    icon: Calendar,
    permission: 'module_schedules',
    category: 'AGENDA'
  },
  // VENTAS
  {
    id: 'sales',
    label: 'Ventas',
    icon: DollarSign,
    permission: 'module_sales',
    category: 'VENTAS'
  },
  {
    id: 'services',
    label: 'Servicios',
    icon: Scissors,
    permission: 'module_services',
    category: 'VENTAS'
  },
  {
    id: 'persons',
    label: 'Personas',
    icon: UserCheck,
    permission: 'module_clients',
    category: 'VENTAS'
  },
  // COMPRAS
  {
    id: 'purchases',
    label: 'Compras',
    icon: ShoppingCart,
    permission: 'module_purchases',
    category: 'COMPRAS'
  },
  {
    id: 'products',
    label: 'Insumos',
    icon: Package,
    permission: 'module_products',
    category: 'COMPRAS'
  },
  {
    id: 'categories',
    label: 'Categoría de Insumos',
    icon: Tag,
    permission: 'module_categories',
    category: 'COMPRAS'
  },
  {
    id: 'suppliers',
    label: 'Proveedores',
    icon: Truck,
    permission: 'module_suppliers',
    category: 'COMPRAS'
  },
  {
    id: 'deliveries',
    label: 'Entrega de insumos',
    icon: Send,
    permission: 'module_deliveries',
    category: 'COMPRAS'
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
    visibleItems = visibleItems.filter(item => item.id !== 'dashboard');
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
  const categoryOrder = ['CONFIGURACIÓN', 'AGENDA', 'VENTAS', 'COMPRAS'];

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