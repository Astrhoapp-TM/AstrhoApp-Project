import React, { useEffect, useState } from 'react';
import {
  X, Package, Edit, Trash2, Eye, Search, Plus,
  AlertCircle, CheckCircle, Clock, Archive, Tag, TrendingUp, FileText, Info, Loader2, RefreshCw
} from 'lucide-react';
import { cn } from '@/shared/components/ui/utils';
import { useLoading } from '@/shared/contexts/LoadingContext';
import { SectionLoader } from '@/shared/components/GlobalLoader';
import { supplyService, type Supply } from '../services/supplyService';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/shared/components/ui/pagination';

interface SuppliesListProps {
  hasPermission: (permission: string) => boolean;
}

// Helper: unwrap ASP.NET $values wrappers
function unwrapArray(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.$values)) return raw.$values;
  if (raw && Array.isArray(raw.data)) return raw.data;
  return [];
}

export function SuppliesList({ hasPermission }: SuppliesListProps) {
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error' | 'info', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [supplyToDelete, setSupplyToDelete] = useState<Supply | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const { showSectionLoading, hideSectionLoading } = useLoading();
  const [loading, setLoading] = useState(true);

  // ── Fetch from API ──
  const fetchSupplies = async () => {
    try {
      setLoading(true);
      showSectionLoading('Cargando insumos...');
      const raw = await supplyService.getSupplies();
      setSupplies(unwrapArray(raw));
    } catch (err) {
      console.error('Error loading supplies:', err);
      showAlert('error', 'Error al cargar los insumos');
      setSupplies([]);
    } finally {
      setLoading(false);
      hideSectionLoading();
    }
  };

  useEffect(() => {
    fetchSupplies();
  }, []);

  // Filter supplies
  const filteredSupplies = supplies.filter(supply => {
    const term = searchTerm.toLowerCase();
    return (
      (supply.nombre || '').toLowerCase().includes(term) ||
      (supply.sku || '').toLowerCase().includes(term) ||
      (supply.descripcion || '').toLowerCase().includes(term)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredSupplies.length / itemsPerPage);
  const paginatedSupplies = filteredSupplies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (page: number) => setCurrentPage(page);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  const handleViewSupply = (supply: Supply) => {
    setSelectedSupply(supply);
    setShowDetailModal(true);
  };

  const handleDeleteSupply = (supply: Supply) => {
    setSupplyToDelete(supply);
    setShowDeleteModal(true);
  };

  const confirmDeleteSupply = async () => {
    if (supplyToDelete) {
      try {
        showSectionLoading('Eliminando insumo...');
        await supplyService.deleteSupply(supplyToDelete.insumoId);
        setSupplies(prev => prev.filter(s => s.insumoId !== supplyToDelete.insumoId));
        showAlert('success', 'Insumo eliminado exitosamente');
      } catch (err) {
        console.error('Error deleting supply:', err);
        showAlert('error', 'Error al eliminar el insumo');
      } finally {
        hideSectionLoading();
        setShowDeleteModal(false);
        setSupplyToDelete(null);
      }
    }
  };

  const getStatusDisplayName = (estado: boolean) =>
    estado ? 'Activo' : 'Inactivo';

  const getStatusBadgeColor = (estado: boolean) =>
    estado ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';

  const getStatusIcon = (estado: boolean) =>
    estado ? CheckCircle : Archive;

  const getStockBadgeColor = (stock: number) => {
    if (stock <= 0) return 'bg-gray-100 text-red-800';
    if (stock <= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Gestión de Insumos</h2>
          <p className="text-gray-600">Administra los insumos y materiales del salón</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
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
                {supplies.filter(s => s.estado === true).length}
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
                {supplies.filter(s => (s.stock ?? 0) <= 5 && s.estado === true).length}
              </p>
              <p className="text-sm text-yellow-600">Stock Bajo</p>
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
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={fetchSupplies}
              disabled={loading}
              className="p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center disabled:opacity-50"
              title="Recargar datos"
            >
              <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {/* Supplies Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <SectionLoader />
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
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Categoría</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Stock</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Estado</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && supplies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <Loader2 className="w-10 h-10 text-brand-pink animate-spin" />
                      <p className="text-gray-500 font-medium">Cargando insumos...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedSupplies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <Package className="w-16 h-16 text-gray-300 mb-4" />
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">No hay insumos registrados</h3>
                      <p className="text-gray-400 text-sm mt-1">
                        {searchTerm
                          ? 'No se encontraron insumos con ese criterio de búsqueda'
                          : 'Comienza a registrar insumos para verlos aquí'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSupplies.map((supply) => {
                  const StatusIcon = getStatusIcon(supply.estado);
                  return (
                    <tr key={supply.insumoId} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-brand rounded-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">{supply.nombre}</div>
                            <div className="text-sm text-gray-600">SKU: {supply.sku}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {supply.categoriaNombre || 'N/A'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStockBadgeColor(supply.stock ?? 0)}`}>
                          {supply.stock ?? 0}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <StatusIcon className={`w-4 h-4 ${supply.estado ? 'text-green-500' : 'text-gray-400'}`} />
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(supply.estado)}`}>
                            {getStatusDisplayName(supply.estado)}
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
                                disabled={supply.estado !== true}
                                className={cn(
                                  'p-2 rounded-lg transition-colors',
                                  supply.estado !== true
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                )}
                                title={supply.estado !== true ? 'No se puede editar un insumo inactivo' : 'Editar insumo'}
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteSupply(supply)}
                                disabled={supply.estado !== true}
                                className={cn(
                                  'p-2 rounded-lg transition-colors',
                                  supply.estado !== true
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                                    : 'bg-gray-100 text-brand-pink hover:bg-red-200'
                                )}
                                title={supply.estado !== true ? 'No se puede eliminar un insumo inactivo' : 'Eliminar insumo'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredSupplies.length)} de {filteredSupplies.length} registros
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={goToPreviousPage}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>

                {currentPage > 3 && (
                  <>
                    <PaginationItem>
                      <PaginationLink onClick={() => goToPage(1)} className="cursor-pointer">1</PaginationLink>
                    </PaginationItem>
                    {currentPage > 4 && <PaginationItem><PaginationEllipsis /></PaginationItem>}
                  </>
                )}

                {[...Array(totalPages)].map((_, index) => {
                  const pageNum = index + 1;
                  if (pageNum >= currentPage - 2 && pageNum <= currentPage + 2) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => goToPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className={`cursor-pointer ${currentPage === pageNum ? 'bg-gradient-brand text-white border-pink-400' : ''}`}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  return null;
                })}

                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && <PaginationItem><PaginationEllipsis /></PaginationItem>}
                    <PaginationItem>
                      <PaginationLink onClick={() => goToPage(totalPages)} className="cursor-pointer">{totalPages}</PaginationLink>
                    </PaginationItem>
                  </>
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={goToNextPage}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-brand p-5 text-white shrink-0 shadow-md z-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight">Detalle del Insumo</h3>
                    <p className="text-pink-100 text-sm">{selectedSupply.nombre}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
                  <div className="flex items-center space-x-2 text-brand-violet mb-1">
                    <Tag className="w-4 h-4" />
                    <h4 className="font-bold uppercase text-[10px] tracking-widest">Información Básica</h4>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Nombre</span>
                    <p className="font-bold text-gray-800">{selectedSupply.nombre}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">SKU</span>
                    <p className="font-mono text-gray-700 text-sm">{selectedSupply.sku}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Categoría</span>
                    <p className="font-bold text-gray-700">{selectedSupply.categoriaNombre || 'N/A'}</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
                  <div className="flex items-center space-x-2 text-brand-pink mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <h4 className="font-bold uppercase text-[10px] tracking-widest">Inventario</h4>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Stock actual</span>
                    <p className={`font-bold text-lg ${(selectedSupply.stock ?? 0) <= 5 ? 'text-yellow-600' : 'text-blue-600'}`}>
                      {selectedSupply.stock ?? 0}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Estado</span>
                    <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(selectedSupply.estado)}`}>
                      {getStatusDisplayName(selectedSupply.estado)}
                    </span>
                  </div>
                </div>
              </div>

              {selectedSupply.descripcion && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-brand-pink" />
                    <h4 className="font-bold text-gray-700 text-sm">Descripción</h4>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-700 text-sm leading-relaxed italic">
                      {selectedSupply.descripcion}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 bg-white border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 active:scale-95 transition-all text-sm uppercase tracking-widest"
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
            <div className="bg-gradient-to-r from-red-500 to-pink-600 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Confirmar Eliminación</h3>
                    <p className="text-red-100 text-xs">Esta acción no se puede deshacer</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 rotate-3">
                  <AlertCircle className="w-10 h-10 text-brand-pink -rotate-3" />
                </div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">
                  ¿Eliminar "{supplyToDelete.nombre}"?
                </h4>
                <p className="text-sm text-gray-500 mb-6">
                  Estás a punto de eliminar este insumo de forma permanente.
                </p>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                    <Package className="w-6 h-6 text-brand-pink" />
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
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Banner */}
      {alert && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-right-5 duration-300">
          <div className={cn(
            'text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 min-w-[320px] bg-gradient-to-r',
            alert.type === 'success' ? 'from-pink-400 to-purple-500' :
              alert.type === 'error' ? 'from-red-500 to-pink-600' :
                'from-blue-400 to-indigo-500'
          )}>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              {alert.type === 'success' && <CheckCircle className="w-6 h-6 text-white" />}
              {alert.type === 'error' && <AlertCircle className="w-6 h-6 text-white" />}
              {alert.type === 'info' && <Info className="w-6 h-6 text-white" />}
            </div>
            <p className="font-semibold flex-1">{alert.message}</p>
            <button
              onClick={() => setAlert(null)}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
