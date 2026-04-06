import React, { useEffect, useState  } from 'react';
import { X, 
  Package, Edit, Trash2, Eye, Search, Filter, Plus,
  AlertCircle, CheckCircle, Clock, Archive, Tag, TrendingUp, Truck, MapPin, FileText
} from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/shared/components/ui/pagination';

// Mock data for supplies
const mockSupplies = [
  {
    id: 1,
    name: 'Tinte Rubio Cenizo',
    description: 'Tinte permanente para coloración professional',
    sku: 'TIN-001',
    type: 'chemical',
    quantity: 25,
    unit: 'unidad',
    location: 'Almacén A - Estante 3',
    expirationDate: '2025-06-15',
    status: 'active',
    supplierId: 1,
    supplierName: 'Distribuidora L\'Oréal',
    costPrice: 18500,
    minStock: 10,
    maxStock: 50,
    assignedTo: [2, 3],
    notes: 'Revisar fecha de vencimiento mensualmente',
    createdAt: '2023-08-15',
    updatedAt: '2024-01-16'
  },
  {
    id: 2,
    name: 'Tijeras Profesionales',
    description: 'Tijeras de acero inoxidable para corte profesional',
    sku: 'HER-001',
    type: 'tool',
    quantity: 8,
    unit: 'unidad',
    location: 'Estación 1',
    status: 'active',
    supplierId: 2,
    supplierName: 'Herramientas Beauty Pro',
    costPrice: 125000,
    minStock: 5,
    maxStock: 15,
    assignedTo: [1, 2],
    notes: 'Requiere mantenimiento semestral',
    createdAt: '2023-06-20',
    updatedAt: '2024-01-10'
  },
  {
    id: 3,
    name: 'Papel Aluminio',
    description: 'Papel aluminio para mechas y reflejos',
    sku: 'CON-001',
    type: 'consumable',
    quantity: 3,
    unit: 'rollo',
    location: 'Almacén B - Estante 1',
    status: 'low_stock',
    supplierId: 3,
    supplierName: 'Suministros Belleza Total',
    costPrice: 8500,
    minStock: 5,
    maxStock: 20,
    assignedTo: [1, 2, 3],
    notes: 'Stock bajo - solicitar reposición',
    createdAt: '2023-09-05',
    updatedAt: '2024-01-15'
  },
  {
    id: 4,
    name: 'Secador Profesional',
    description: 'Secador de pelo profesional 2000W',
    sku: 'EQU-001',
    type: 'equipment',
    quantity: 4,
    unit: 'unidad',
    location: 'Estación 2',
    status: 'active',
    supplierId: 4,
    supplierName: 'Equipos Hair Studio',
    costPrice: 285000,
    minStock: 3,
    maxStock: 8,
    assignedTo: [2, 3],
    notes: 'Garantía hasta diciembre 2024',
    createdAt: '2023-05-12',
    updatedAt: '2024-01-08'
  },
  {
    id: 5,
    name: 'Desinfectante Instrumental',
    description: 'Solución desinfectante para herramientas',
    sku: 'LIM-001',
    type: 'cleaning',
    quantity: 12,
    unit: 'litro',
    location: 'Área de Limpieza',
    expirationDate: '2024-12-30',
    status: 'active',
    supplierId: 5,
    supplierName: 'Productos de Limpieza Medellín',
    costPrice: 15500,
    minStock: 8,
    maxStock: 25,
    assignedTo: [1, 2, 3],
    notes: 'Uso obligatorio después de cada cliente',
    createdAt: '2023-11-22',
    updatedAt: '2024-01-14'
  },
  {
    id: 6,
    name: 'Oxidante 30 Vol',
    description: 'Peróxido de hidrógeno al 9% para coloración',
    sku: 'QUI-001',
    type: 'chemical',
    quantity: 18,
    unit: 'litro',
    location: 'Almacén A - Estante 4',
    expirationDate: '2024-08-20',
    status: 'active',
    supplierId: 1,
    supplierName: 'Distribuidora L\'Oréal',
    costPrice: 12800,
    minStock: 15,
    maxStock: 40,
    assignedTo: [1, 2],
    notes: 'Almacenar en lugar fresco y seco',
    createdAt: '2023-07-08',
    updatedAt: '2024-01-12'
  }
];

interface SuppliesListProps {
  hasPermission: (permission: string) => boolean;
}

export function SuppliesList({ hasPermission }: SuppliesListProps) {
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Auto-hide success alert after 4 seconds
  useEffect(() => {
    if (showSuccessAlert) {
      const timer = setTimeout(() => {
        setShowSuccessAlert(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessAlert]);

  const [supplies, setSupplies] = useState(mockSupplies);
  const [selectedSupply, setSelectedSupply] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [supplyToDelete, setSupplyToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Filter supplies
  const filteredSupplies = supplies.filter(supply => {
    const matchesSearch = supply.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supply.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supply.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredSupplies.length / itemsPerPage);
  const paginatedSupplies = filteredSupplies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handleViewSupply = (supply) => {
    setSelectedSupply(supply);
    setShowDetailModal(true);
  };

  const handleDeleteSupply = (supply) => {
    setSupplyToDelete(supply);
    setShowDeleteModal(true);
  };

  const confirmDeleteSupply = () => {
    if (supplyToDelete) {
      setSupplies(supplies.filter(s => s.id !== supplyToDelete.id));
      setShowDeleteModal(false);
      setSupplyToDelete(null);
    }
  };

  const getTypeDisplayName = (type) => {
    const types = {
      chemical: 'Químico',
      tool: 'Herramienta',
      equipment: 'Equipo',
      consumable: 'Consumible',
      cleaning: 'Limpieza'
    };
    return types[type] || type;
  };

  const getTypeBadgeColor = (type) => {
    const colors = {
      chemical: 'bg-orange-100 text-orange-800',
      tool: 'bg-blue-100 text-blue-800',
      equipment: 'bg-purple-100 text-purple-800',
      consumable: 'bg-green-100 text-green-800',
      cleaning: 'bg-yellow-100 text-yellow-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusDisplayName = (status) => {
    const statuses = {
      active: 'Activo',
      inactive: 'Inactivo',
      expired: 'Vencido',
      low_stock: 'Stock Bajo'
    };
    return statuses[status] || status;
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800',
      low_stock: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'low_stock': return AlertCircle;
      case 'expired': return Clock;
      case 'inactive': return Archive;
      default: return CheckCircle;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Gestión de Insumos</h2>
          <p className="text-gray-600">
            Administra los insumos y materiales del salón
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6">
          <div className="flex items-center space-x-4">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-800">{supplies.length}</p>
              <p className="text-sm text-blue-600">Total Insumos</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-6">
          <div className="flex items-center space-x-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-800">
                {supplies.filter(s => s.status === 'active').length}
              </p>
              <p className="text-sm text-green-600">Activos</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-2xl p-6">
          <div className="flex items-center space-x-4">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold text-yellow-800">
                {supplies.filter(s => s.status === 'low_stock').length}
              </p>
              <p className="text-sm text-yellow-600">Stock Bajo</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-2xl p-6">
          <div className="flex items-center space-x-4">
            <Clock className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-800">
                {supplies.filter(s => s.status === 'expired').length}
              </p>
              <p className="text-sm text-red-600">Vencidos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Register */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
            />
          </div>

          {hasPermission('manage_supplies') && (
            <button className="w-full md:w-auto bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 whitespace-nowrap">
              <Plus className="w-5 h-5" />
              <span>Nuevo Insumo</span>
            </button>
          )}
        </div>
      </div>

      {/* Supplies Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">Lista de Insumos</h3>
          <p className="text-gray-600">
            {filteredSupplies.length} insumo{filteredSupplies.length !== 1 ? 's' : ''} encontrado{filteredSupplies.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Insumo</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Tipo</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Stock</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Ubicación</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Estado</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedSupplies.map((supply) => {
                const StatusIcon = getStatusIcon(supply.status);
                
                return (
                  <tr key={supply.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{supply.name}</div>
                          <div className="text-sm text-gray-600">SKU: {supply.sku}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeBadgeColor(supply.type)}`}>
                        {getTypeDisplayName(supply.type)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-800">
                          {supply.quantity} {supply.unit}
                        </div>
                        <div className="text-sm text-gray-600">
                          Min: {supply.minStock} | Max: {supply.maxStock}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-gray-800">{supply.location}</div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <StatusIcon className={`w-4 h-4 ${
                          supply.status === 'active' ? 'text-green-500' :
                          supply.status === 'low_stock' ? 'text-yellow-500' :
                          supply.status === 'expired' ? 'text-red-500' :
                          'text-gray-500'
                        }`} />
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(supply.status)}`}>
                          {getStatusDisplayName(supply.status)}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewSupply(supply)}
                          className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {hasPermission('manage_supplies') && (
                          <>
                            <button
                              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                              title="Editar insumo"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => handleDeleteSupply(supply)}
                              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                              title="Eliminar insumo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredSupplies.length)} de {filteredSupplies.length} registros
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={goToPreviousPage}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {/* First page */}
                {currentPage > 3 && (
                  <>
                    <PaginationItem>
                      <PaginationLink onClick={() => goToPage(1)} className="cursor-pointer">
                        1
                      </PaginationLink>
                    </PaginationItem>
                    {currentPage > 4 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                  </>
                )}
                
                {/* Pages around current page */}
                {[...Array(totalPages)].map((_, index) => {
                  const pageNum = index + 1;
                  if (pageNum >= currentPage - 2 && pageNum <= currentPage + 2) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => goToPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className={`cursor-pointer ${
                            currentPage === pageNum
                              ? 'bg-gradient-to-r from-pink-400 to-purple-500 text-white border-pink-400'
                              : ''
                          }`}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  return null;
                })}
                
                {/* Last page */}
                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink onClick={() => goToPage(totalPages)} className="cursor-pointer">
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={goToNextPage}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Supply Detail Modal */}
      {showDetailModal && selectedSupply && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header - Fixed at top */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight">Detalle del Insumo</h3>
                    <p className="text-pink-100 text-sm">{selectedSupply.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/30 no-scrollbar">
              <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
              `}</style>

              <div className="max-w-4xl mx-auto space-y-6">
                {/* Info Cards Row */}
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Basic Info Card */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center space-x-2 text-purple-500 mb-3">
                      <Tag className="w-4 h-4" />
                      <h4 className="font-bold uppercase text-[10px] tracking-widest">Información Básica</h4>
                    </div>
                    <div className="mb-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Nombre:</span>
                      <p className="font-bold text-gray-800 text-lg mb-1 truncate">{selectedSupply.name}</p>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-500">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded-md">SKU: {selectedSupply.sku}</span>
                    </div>
                  </div>

                  {/* Stock Info Card */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center space-x-2 text-pink-500 mb-3">
                      <TrendingUp className="w-4 h-4" />
                      <h4 className="font-bold uppercase text-[10px] tracking-widest">Estado de Stock</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Cantidad:</span>
                        <span className={`font-bold ${selectedSupply.quantity <= selectedSupply.minStock ? 'text-red-500' : 'text-blue-600'}`}>
                          {selectedSupply.quantity} {selectedSupply.unit}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Tipo:</span>
                        <span className="font-bold text-gray-700">{getTypeDisplayName(selectedSupply.type)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Card */}
                  <div className={`rounded-2xl p-5 border shadow-sm flex flex-col items-center justify-center ${
                    selectedSupply.status === 'active' 
                    ? 'bg-green-50/50 border-green-100 text-green-600' 
                    : 'bg-red-50/50 border-red-100 text-red-600'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                      selectedSupply.status === 'active' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <span className="font-black uppercase text-[10px] tracking-[0.2em]">
                      {getStatusDisplayName(selectedSupply.status)}
                    </span>
                  </div>
                </div>

                {/* Grid for Detailed Sections */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Stock Details Section */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                      <h4 className="font-bold text-gray-700 text-sm flex items-center space-x-2">
                        <Package className="w-4 h-4 text-blue-400" />
                        <span>Parámetros de Inventario</span>
                      </h4>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Mínimo</span>
                          <p className="font-bold text-gray-700">{selectedSupply.minStock} {selectedSupply.unit}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Máximo</span>
                          <p className="font-bold text-gray-700">{selectedSupply.maxStock} {selectedSupply.unit}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl col-span-2">
                          <span className="text-[10px] font-black text-green-600 uppercase tracking-widest block mb-1">Precio de Costo</span>
                          <p className="font-bold text-green-700 text-lg">${selectedSupply.costPrice.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Supplier & Location Section */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                      <h4 className="font-bold text-gray-700 text-sm flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-purple-400" />
                        <span>Logística y Origen</span>
                      </h4>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-purple-500" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Ubicación</span>
                            <p className="font-bold text-gray-700 text-sm">{selectedSupply.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Truck className="w-4 h-4 text-blue-500" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Proveedor</span>
                            <p className="font-bold text-gray-700 text-sm">{selectedSupply.supplierName}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description & Notes Section */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                    <h4 className="font-bold text-gray-700 text-sm flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-pink-400" />
                      <span>Detalles Adicionales</span>
                    </h4>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Descripción</span>
                      <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl italic">
                        {selectedSupply.description || 'Sin descripción disponible.'}
                      </p>
                    </div>
                    {selectedSupply.notes && (
                      <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Notas del Insumo</span>
                        <p className="text-gray-700 text-sm leading-relaxed bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
                          {selectedSupply.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Fixed at bottom */}
            <div className="p-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 justify-end shrink-0 z-20">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && supplyToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-pink-600 p-5 text-white shrink-0 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                    <Trash2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight">Confirmar Eliminación</h3>
                    <p className="text-red-100 text-xs font-medium">Esta acción no se puede deshacer</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all shadow-sm"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 rotate-3">
                  <AlertCircle className="w-10 h-10 text-red-500 -rotate-3" />
                </div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">
                  ¿Eliminar insumo "{supplyToDelete.name}"?
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  Estás a punto de eliminar este insumo de forma permanente. 
                  Esta acción afectará los registros históricos y el inventario actual.
                </p>
                
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                    <Package className="w-6 h-6 text-pink-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Insumo a eliminar</p>
                    <p className="font-bold text-gray-700">{supplyToDelete.name}</p>
                    <p className="text-[10px] font-mono text-gray-400 uppercase">SKU: {supplyToDelete.sku}</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-black text-gray-400 hover:bg-gray-100 transition-all text-[10px] uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteSupply}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {showSuccessAlert && (
        <div className="fixed bottom-4 right-4 z-[9999] animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 min-w-[320px]">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold">{alertMessage}</p>
            </div>
            <button
              onClick={() => setShowSuccessAlert(false)}
              className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}