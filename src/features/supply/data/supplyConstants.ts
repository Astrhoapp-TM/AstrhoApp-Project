export const SUPPLY_TYPES = {
  chemical: { label: 'Químico', color: 'bg-red-100 text-red-800' },
  tool: { label: 'Herramienta', color: 'bg-blue-100 text-blue-800' },
  equipment: { label: 'Equipo', color: 'bg-purple-100 text-purple-800' },
  consumable: { label: 'Consumible', color: 'bg-green-100 text-green-800' },
  cleaning: { label: 'Limpieza', color: 'bg-yellow-100 text-yellow-800' }
};

export const SUPPLY_STATUSES = {
  active: { label: 'Activo', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactivo', color: 'bg-gray-100 text-gray-800' },
  expired: { label: 'Vencido', color: 'bg-red-100 text-red-800' },
  low_stock: { label: 'Stock Bajo', color: 'bg-yellow-100 text-yellow-800' }
};

export const getTypeColor = (type: string) => {
  return SUPPLY_TYPES[type]?.color || 'bg-gray-100 text-gray-800';
};

export const getTypeLabel = (type: string) => {
  return SUPPLY_TYPES[type]?.label || type;
};

export const getStatusColor = (status: string) => {
  return SUPPLY_STATUSES[status]?.color || 'bg-gray-100 text-gray-800';
};

export const getStatusLabel = (status: string) => {
  return SUPPLY_STATUSES[status]?.label || status;
};