import React, { useState, useEffect } from 'react';
import { CheckCircle, Plus, Search, Edit, Trash2, Eye, Package, Wrench, AlertTriangle, X, Loader2, Tag, TrendingUp, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { supplyService, type Supply } from '../services/supplyService';
import { supplierService } from '@/features/suppliers/services/supplierService';
import { SupplyEditModal } from './modals/SupplyEditModal';
import { SimplePagination } from '@/shared/components/ui/simple-pagination';

interface SupplyManagementProps {
  hasPermission: (permission: string) => boolean;
}

// Helper: unwrap ASP.NET $values wrappers
function unwrapArray(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.$values)) return raw.$values;
  if (raw && Array.isArray(raw.data)) return raw.data;
  if (raw && Array.isArray(raw.result)) return raw.result;
  return [];
}

export function SupplyManagement({ hasPermission }: SupplyManagementProps) {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupply, setSelectedSupply] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // ── Fetch data from API ──
  const fetchSupplies = async () => {
    try {
      setLoading(true);
      setError(null);
      const raw = await supplyService.getSupplies();
      const items = unwrapArray(raw);
      setSupplies(items);
    } catch (err) {
      console.error('Error loading supplies:', err);
      setError('Error al cargar los insumos');
      setSupplies([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const raw = await supplierService.getAll();
      setSuppliers(unwrapArray(raw));
    } catch (err) {
      console.error('Error loading suppliers:', err);
    }
  };

  useEffect(() => {
    fetchSupplies();
    fetchSuppliers();
  }, []);

  // Auto-hide success alert after 4 seconds
  useEffect(() => {
    if (showSuccessAlert) {
      const timer = setTimeout(() => {
        setShowSuccessAlert(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessAlert]);

  // Reset a página 1 cuando cambia búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredSupplies = supplies.filter(supply => {
    const matchesSearch =
      (supply.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supply.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Stats from API data
  const stats = {
    totalSupplies: supplies.length,
    activeSupplies: supplies.filter(s => s.estado === true).length,
    inactiveSupplies: supplies.filter(s => s.estado === false).length,
    lowStockSupplies: supplies.filter(s => (s.stock ?? 0) <= 5 && (s.stock ?? 0) > 0).length,
  };

  // Paginación
  const totalPages = Math.ceil(filteredSupplies.length / itemsPerPage);
  const paginatedSupplies = filteredSupplies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (page: number) => setCurrentPage(page);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  const handleCreateSupply = () => {
    setSelectedSupply(null);
    setShowEditModal(true);
  };

  const handleEditSupply = (supply: Supply) => {
    setSelectedSupply(supply);
    setShowEditModal(true);
  };

  const handleViewDetail = (supply: Supply) => {
    setSelectedSupply(supply);
    setShowDetailModal(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [supplyToDelete, setSupplyToDelete] = useState<Supply | null>(null);

  const handleDeleteSupply = (supplyId: number) => {
    const supply = supplies.find(s => s.insumoId === supplyId);
    if (supply) {
      setSupplyToDelete(supply);
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteSupply = async () => {
    if (!supplyToDelete) return;

    try {
      await supplyService.deleteSupply(supplyToDelete.insumoId);
      await fetchSupplies();
      setShowDeleteModal(false);
      setSupplyToDelete(null);
      setShowSuccessAlert(true);
      setAlertMessage('Insumo eliminado exitosamente');
    } catch (err) {
      console.error('Error deleting supply:', err);
      setShowSuccessAlert(true);
      setAlertMessage('Error al eliminar el insumo');
    }
  };

  const handleSaveSupply = async (supplyData: any) => {
    try {
      if (selectedSupply) {
        await supplyService.updateSupply(selectedSupply.insumoId, {
          sku: supplyData.sku || supplyData.name,
          nombre: supplyData.nombre || supplyData.name,
          descripcion: supplyData.descripcion || supplyData.description || '',
          categoriaId: supplyData.categoriaId || selectedSupply.categoriaId,
          estado: supplyData.estado ?? selectedSupply.estado,
          stock: supplyData.stock ?? supplyData.quantity ?? selectedSupply.stock,
        });
      } else {
        await supplyService.createSupply({
          sku: supplyData.sku || '',
          nombre: supplyData.nombre || supplyData.name || '',
          descripcion: supplyData.descripcion || supplyData.description || '',
          categoriaId: supplyData.categoriaId || 1,
          estado: supplyData.estado ?? true,
          stock: supplyData.stock ?? supplyData.quantity ?? 0,
        });
      }

      await fetchSupplies();
      setShowEditModal(false);
      setShowSuccessAlert(true);
      setAlertMessage(selectedSupply ? 'Insumo actualizado exitosamente' : 'Insumo creado exitosamente');
    } catch (err) {
      console.error('Error saving supply:', err);
      setShowSuccessAlert(true);
      setAlertMessage('Error al guardar el insumo');
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Gestión de Insumos</h2>
          <p className="text-gray-600">Control de inventario de insumos y materiales</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <StatCard icon={<Wrench className="w-8 h-8 text-blue-600" />} value={stats.totalSupplies} label="Total Insumos" />
        <StatCard icon={<CheckCircle className="w-8 h-8 text-green-600" />} value={stats.activeSupplies} label="Activos" />
        <StatCard icon={<AlertTriangle className="w-8 h-8 text-yellow-600" />} value={stats.lowStockSupplies} label="Stock Bajo" />
        <StatCard icon={<AlertTriangle className="w-8 h-8 text-red-600" />} value={stats.inactiveSupplies} label="Inactivos" />
      </div>

      {/* Search and Register */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar insumos por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={fetchSupplies}
              className="p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
              title="Recargar datos"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {hasPermission('manage_supplies') && (
              <button
                onClick={handleCreateSupply}
                className="w-full md:w-auto bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span>Nuevo Insumo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchSupplies}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors font-semibold"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden relative min-h-[400px]">
          {loading && supplies.length > 0 && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin mb-2" />
              <span className="text-sm font-medium text-gray-500">Buscando...</span>
            </div>
          )}
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
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Nombre</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">SKU</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Categoría</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Stock</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Estado</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {paginatedSupplies.map((supply) => (
                  <tr key={supply.insumoId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-800">{supply.nombre}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{supply.sku}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{supply.categoriaNombre || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${(supply.stock ?? 0) <= 0
                        ? 'bg-red-100 text-red-800'
                        : (supply.stock ?? 0) <= 5
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                        }`}>
                        {supply.stock ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${supply.estado
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {supply.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex space-x-2">
                      <button onClick={() => handleViewDetail(supply)} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors" title="Ver Detalle">
                        <Eye className="w-4 h-4" />
                      </button>
                      {hasPermission('manage_supplies') && (
                        <>
                          <button onClick={() => handleEditSupply(supply)} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors" title="Editar">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteSupply(supply.insumoId)} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <SimplePagination
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={goToPage}
              totalRecords={filteredSupplies.length}
              recordsPerPage={itemsPerPage}
            />
          </div>
        </div>
      )}

      {/* Detail Modal */}
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
                    <h3 className="text-xl font-bold leading-tight">Detalle de Insumo</h3>
                    <p className="text-pink-100 text-sm">{selectedSupply.nombre}</p>
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
                      <p className="font-bold text-gray-800 text-lg mb-1 truncate">{selectedSupply.nombre}</p>
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
                        <span className={`font-bold ${(selectedSupply.stock ?? 0) <= 5 ? 'text-red-500' : 'text-blue-600'}`}>
                          {selectedSupply.stock ?? 0} unidades
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Categoría:</span>
                        <span className="font-bold text-gray-700">{selectedSupply.categoriaNombre || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Card */}
                  <div className={`rounded-2xl p-5 border shadow-sm flex flex-col items-center justify-center ${selectedSupply.estado
                      ? 'bg-green-50/50 border-green-100 text-green-600'
                      : 'bg-red-50/50 border-red-100 text-red-600'
                    }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${selectedSupply.estado ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <span className="font-black uppercase text-[10px] tracking-[0.2em]">
                      {selectedSupply.estado ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>

                {/* Description Section */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                    <h4 className="font-bold text-gray-700 text-sm flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-pink-400" />
                      <span>Descripción del Insumo</span>
                    </h4>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-700 italic leading-relaxed">
                      "{selectedSupply.descripcion || 'Sin descripción adicional.'}"
                    </p>
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

      {showEditModal && (
        <SupplyEditModal
          supply={selectedSupply}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveSupply}
          suppliers={suppliers}
        />
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
                  ¿Eliminar insumo "{supplyToDelete.nombre}"?
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
                    <p className="font-bold text-gray-700">{supplyToDelete.nombre}</p>
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

function StatCard({ icon, value, label }: any) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
      {icon}
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-600">{label}</p>
      </div>
    </div>
  );
}
