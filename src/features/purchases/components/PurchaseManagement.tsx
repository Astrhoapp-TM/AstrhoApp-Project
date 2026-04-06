import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart, Plus, Eye, Filter, Search, Calendar, AlertTriangle,
  CheckCircle, Clock, Truck, Package, X, Save, DollarSign,
  FileText, Ban, File, Trash2, ChevronDown, Loader2, ShoppingBag, AlertCircle, RefreshCw
} from 'lucide-react';
import { purchaseService, type PurchaseAPI } from '../services/purchaseService';
import { supplierService, type SupplierAPI } from '@/features/suppliers/services/supplierService';
import { supplyService, type Supply } from '@/features/supply/services/supplyService';
import { SimplePagination } from '@/shared/components/ui/simple-pagination';
import { cn } from '@/shared/components/ui/utils';
import { toast } from 'sonner';

interface PurchaseManagementProps {
  hasPermission: (permission: string) => boolean;
}

// Helper: ASP.NET with ReferenceHandler.Preserve wraps arrays in { $values: [...] }
// This utility unwraps at any nesting level.
function unwrapValues(obj: any): any {
  if (obj == null) return obj;
  if (Array.isArray(obj)) return obj.map(unwrapValues);
  if (typeof obj === 'object') {
    // If the object itself is a $values wrapper, return the inner array
    if (Array.isArray(obj.$values)) {
      return obj.$values.map(unwrapValues);
    }
    // Otherwise recurse into each key
    const result: any = {};
    for (const key of Object.keys(obj)) {
      if (key === '$id' || key === '$ref') continue; // skip JSON ref metadata
      result[key] = unwrapValues(obj[key]);
    }
    return result;
  }
  return obj;
}

export function PurchaseManagement({ hasPermission }: PurchaseManagementProps) {
  const [purchases, setPurchases] = useState<PurchaseAPI[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierAPI[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseAPI | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const itemsPerPage = 5;

  // ── Debounce Search ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Fetch data from API ──
  const fetchPurchases = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Construir parámetros para la API
      const params: any = {
        pagina: currentPage,
        registrosPorPagina: itemsPerPage,
      };
      
      if (debouncedSearch.trim()) {
        params.buscar = debouncedSearch.trim();
      }

      const response = await purchaseService.getAll(params);

      const items = response.data || [];
      setTotalCount(response.totalCount || 0);
      setTotalPages(response.totalPages || 0);

      // Unwrap nested $values (e.g. detalles.$values)
      const cleaned = items.map(unwrapValues);
      setPurchases(cleaned);
    } catch (err) {
      console.error('Error loading purchases:', err);
      setError('Error al cargar las compras');
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await supplierService.getAll();
      setSuppliers(response.data || []);
    } catch (err) {
      console.error('Error loading suppliers:', err);
    }
  };

  const fetchSupplies = async () => {
    try {
      const response = await supplyService.getSupplies();
      setSupplies(response.data || []);
    } catch (err) {
      console.error('Error loading supplies:', err);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    fetchSuppliers();
    fetchSupplies();
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

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const getStatusColor = (estado: boolean) => {
    return estado
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  const getStatusLabel = (estado: boolean) => {
    return estado ? 'Aprobado' : 'Anulado';
  };

  const handleViewDetail = async (purchase: PurchaseAPI) => {
    try {
      setLoading(true);
      const raw = await purchaseService.getById(purchase.compraId);
      const unwrapped = unwrapValues(raw);

      // Normalize: API may return wrapped in .data/.result or use PascalCase keys
      const src = unwrapped?.data && typeof unwrapped.data === 'object' && !Array.isArray(unwrapped.data)
        ? unwrapped.data
        : unwrapped?.result && typeof unwrapped.result === 'object' && !Array.isArray(unwrapped.result)
          ? unwrapped.result
          : unwrapped;

      const normalized: PurchaseAPI = {
        compraId: src?.compraId ?? src?.CompraId ?? purchase.compraId,
        fechaRegistro: src?.fechaRegistro ?? src?.FechaRegistro ?? purchase.fechaRegistro,
        proveedorId: src?.proveedorId ?? src?.ProveedorId ?? purchase.proveedorId,
        proveedorNombre: src?.proveedorNombre ?? src?.ProveedorNombre ?? purchase.proveedorNombre ?? '',
        iva: src?.iva ?? src?.Iva ?? purchase.iva ?? 0,
        subtotal: src?.subtotal ?? src?.Subtotal ?? purchase.subtotal ?? 0,
        total: src?.total ?? src?.Total ?? purchase.total ?? 0,
        estado: src?.estado ?? src?.Estado ?? purchase.estado,
        detalles: (src?.detalles ?? src?.Detalles ?? purchase.detalles ?? []).map((d: any) => ({
          detalleCompraId: d?.detalleCompraId ?? d?.DetalleCompraId ?? 0,
          insumoId: d?.insumoId ?? d?.InsumoId ?? 0,
          insumoNombre: d?.insumoNombre ?? d?.InsumoNombre ?? 'Sin nombre',
          cantidad: d?.cantidad ?? d?.Cantidad ?? 0,
          precioUnitario: d?.precioUnitario ?? d?.PrecioUnitario ?? 0,
          subtotal: d?.subtotal ?? d?.Subtotal ?? 0,
        })),
      };

      setSelectedPurchase(normalized);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching purchase detail:', error);
      toast.error('No se pudo cargar el detalle de la compra');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePurchase = () => {
    setSelectedPurchase(null);
    setShowCreateModal(true);
  };

  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const handleCancelPurchase = (purchase: PurchaseAPI) => {
    setSelectedPurchase(purchase);
    setShowCancelModal(true);
  };

  const confirmCancelPurchase = async (observation: string) => {
    if (!selectedPurchase) return;

    try {
      await purchaseService.update(selectedPurchase.compraId, {
        proveedorId: selectedPurchase.proveedorId,
        iva: selectedPurchase.iva,
        estado: false,
        observacion: observation // Pass the observation to the update
      });

      await fetchPurchases();

      setShowCancelModal(false);
      setSelectedPurchase(null);
      setShowSuccessAlert(true);
      setAlertMessage('Compra anulada exitosamente');
    } catch (err) {
      console.error('Error cancelling purchase:', err);
      toast.error('Error al anular la compra');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('es-CO');
    } catch {
      return dateStr;
    }
  };

  const handleGeneratePDF = (purchase: PurchaseAPI) => {
    const receiptContent = `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #e91e63; padding-bottom: 15px; margin-bottom: 15px;">
          <h1 style="color: #e91e63; margin: 0;">AstroApp</h1>
          <p style="margin: 5px 0; color: #666;">Salón de Belleza</p>
          <p style="margin: 5px 0; color: #666;">Cll 55 #42-16 Medellín</p>
        </div>
        
        <div style="margin-bottom: 15px;">
          <h3 style="margin: 0 0 10px 0; color: #333;">FACTURA DE COMPRA</h3>
          <p><strong>ID Compra:</strong> #${purchase.compraId}</p>
          <p><strong>Fecha de Registro:</strong> ${formatDate(purchase.fechaRegistro)}</p>
          <p><strong>Estado:</strong> ${getStatusLabel(purchase.estado)}</p>
        </div>
        
        <div style="margin-bottom: 15px;">
          <h4 style="margin: 0 0 10px 0; color: #333;">INFORMACIÓN DEL PROVEEDOR:</h4>
          <p><strong>Proveedor:</strong> ${purchase.proveedorNombre}</p>
        </div>
        
        <div style="margin-bottom: 15px;">
          <h4 style="margin: 0 0 10px 0; color: #333;">INSUMOS ORDENADOS:</h4>
          ${purchase.detalles.map(item => `
            <div style="margin-bottom: 10px; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
              <div style="font-weight: bold;">${item.insumoNombre}</div>
              <div style="display: flex; justify-content: space-between; margin: 2px 0;">
                <span>Cantidad:</span>
                <span>${item.cantidad}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 2px 0;">
                <span>Precio Unitario:</span>
                <span>$${item.precioUnitario.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 2px 0;">
                <span>Subtotal:</span>
                <span>$${item.subtotal.toLocaleString()}</span>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 15px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Subtotal:</span>
            <span>$${purchase.subtotal.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>IVA (${purchase.iva}%):</span>
            <span>$${((purchase.subtotal * purchase.iva) / 100).toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; border-top: 1px solid #ddd; padding-top: 5px;">
            <span>TOTAL:</span>
            <span>$${purchase.total.toLocaleString()}</span>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
          <p>Documento generado el ${new Date().toLocaleDateString('es-CO')}</p>
          <p>astrid@asthroapp.com | +57 304 123 4567</p>
        </div>
      </div>
    `;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Factura de Compra - #${purchase.compraId}</title>
          </head>
          <body>
            ${receiptContent}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  const handleSavePurchase = async (purchaseData: any) => {
    try {
      await purchaseService.create(purchaseData);
      await fetchPurchases();
      setShowCreateModal(false);
      setSelectedPurchase(null);
      setShowSuccessAlert(true);
      setAlertMessage('Compra registrada exitosamente');
    } catch (err) {
      console.error('Error creating purchase:', err);
      toast.error('Error al registrar la compra');
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Gestión de Compras</h2>
          <p className="text-gray-600">
            Control de órdenes de compra y abastecimiento de inventario
          </p>
        </div>
      </div>

      {/* Search and Register */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por N° compra o proveedor..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={fetchPurchases}
              className="p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
              title="Recargar datos"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {hasPermission('manage_purchases') && (
              <button
                onClick={handleCreatePurchase}
                className="w-full md:w-auto bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span>Registrar Compra</span>
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
            onClick={fetchPurchases}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors font-semibold"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Purchases Table */}
      {!error && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden relative min-h-[400px]">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin mb-2" />
              <span className="text-sm font-medium text-gray-500">Buscando...</span>
            </div>
          )}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-800">Historial de Compras</h3>
            <p className="text-gray-600">
              {totalCount} compra{totalCount !== 1 ? 's' : ''} encontrada{totalCount !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">N° Compra</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Fecha</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Proveedor</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Cantidad</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Costo Total</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Estado</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchases.map((purchase) => (
                  <tr key={purchase.compraId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800">#{purchase.compraId}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-gray-800">{formatDate(purchase.fechaRegistro)}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">
                        {purchase.proveedorNombre}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-gray-800">{purchase.detalles?.length || 0}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-lg font-bold text-gray-800">
                        ${(purchase.total ?? 0).toLocaleString()}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2 text-sm">
                        <span className={`px-3 py-1 rounded-full font-semibold ${getStatusColor(purchase.estado)}`}>
                          {getStatusLabel(purchase.estado)}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetail(purchase)}
                          className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Ver Detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleGeneratePDF(purchase)}
                          className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          title="Generar PDF"
                        >
                          <File className="w-4 h-4" />
                        </button>

                        {hasPermission('manage_purchases') && purchase.estado && (
                          <button
                            onClick={() => handleCancelPurchase(purchase)}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                            title="Anular Compra"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination - Always visible */}
      {!error && (
        <div className="px-6 py-4 bg-gray-50/50 rounded-b-2xl border-t border-gray-100">
          <SimplePagination
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={goToPage}
            totalRecords={totalCount}
            recordsPerPage={itemsPerPage}
          />
        </div>
      )}

      {/* Purchase Detail Modal */}
      {showDetailModal && selectedPurchase && (
        <PurchaseDetailModal
          purchase={selectedPurchase}
          suppliers={suppliers}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {/* Purchase Creation Modal */}
      {showCreateModal && (
        <PurchaseCreateModal
          onClose={() => {
            setShowCreateModal(false);
            setSelectedPurchase(null);
          }}
          onSave={handleSavePurchase}
          suppliers={suppliers}
          supplies={supplies}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && selectedPurchase && (
        <CancelConfirmationModal
          purchase={selectedPurchase}
          onClose={() => {
            setShowCancelModal(false);
            setSelectedPurchase(null);
          }}
          onConfirm={confirmCancelPurchase}
        />
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

function PurchaseDetailModal({ purchase, suppliers, onClose }: { purchase: PurchaseAPI; suppliers: SupplierAPI[]; onClose: () => void }) {
  const getStatusColor = (estado: boolean) => {
    return estado
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  const getStatusLabel = (estado: boolean) => {
    return estado ? 'Aprobado' : 'Anulado';
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('es-CO');
    } catch {
      return dateStr;
    }
  };

  const supplier = suppliers.find(s => s.proveedorId === purchase.proveedorId);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Detalle de Compra</h3>
                <p className="text-pink-100 text-sm">#{purchase.compraId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
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
            {/* Purchase Info + Supplier Info */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Purchase Info */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-purple-500 mb-4">
                  <FileText className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Información de la Compra</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">ID de Compra:</span>
                    <span className="font-bold text-gray-800">#{purchase.compraId}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Fecha de Registro:</span>
                    <span className="text-gray-800 font-medium">{formatDate(purchase.fechaRegistro)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Estado:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(purchase.estado)}`}>
                      {getStatusLabel(purchase.estado)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Supplier Info */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-pink-500 mb-4">
                  <Truck className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Información del Proveedor</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Proveedor:</span>
                    <span className="font-bold text-gray-800">{purchase.proveedorNombre}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Contacto:</span>
                    <span className="font-medium text-gray-800">{supplier?.personaContacto || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Email:</span>
                    <span className="font-medium text-gray-800">{supplier?.correo || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Teléfono:</span>
                    <span className="font-medium text-gray-800">{supplier?.telefono || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center space-x-2 text-purple-500 mb-4">
                <Package className="w-4 h-4" />
                <h4 className="font-bold uppercase text-[10px] tracking-widest">Insumos Ordenados</h4>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">Insumo</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">Cantidad</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">Precio Unit.</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {purchase.detalles?.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">{item.insumoNombre}</td>
                        <td className="px-4 py-3 text-gray-600">{item.cantidad}</td>
                        <td className="px-4 py-3 text-gray-600">${(item.precioUnitario ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">${(item.subtotal ?? 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-5 rounded-2xl border border-purple-200 shadow-sm">
              <div className="space-y-3">
                <div className="flex justify-between text-base">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-semibold text-gray-800">
                    ${(purchase.subtotal ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-gray-700">IVA ({purchase.iva}%):</span>
                  <span className="font-semibold text-gray-800">
                    ${(((purchase.subtotal ?? 0) * (purchase.iva ?? 0)) / 100).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-purple-300 pt-3">
                  <span className="font-bold text-gray-800">Total:</span>
                  <span className="font-bold text-purple-700 text-xl">
                    ${(purchase.total ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="p-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 justify-end shrink-0 z-20">
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// Reusable Search Select Components
// ══════════════════════════════════════════

function SupplierSearchSelect({ onSelect, selectedId, error, disabled }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchResults, setSearchResults] = useState<SupplierAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierAPI | null>(null);

  useEffect(() => {
    const fetchSelected = async () => {
      if (selectedId && !selectedSupplier) {
        try {
          const supplier = await supplierService.getById(parseInt(selectedId));
          setSelectedSupplier(supplier);
        } catch (e) {
          console.warn('Error fetching selected supplier:', e);
        }
      }
    };
    fetchSelected();
  }, [selectedId, selectedSupplier]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await supplierService.getAll({ search: searchTerm, pageSize: 20 });
        setSearchResults(res.data);
      } catch (err) {
        console.error('Error searching suppliers:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchSuppliers, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${isOpen ? 'z-50' : ''}`} ref={dropdownRef}>
      <div
        className={cn(
          "w-full px-4 py-3 min-h-[48px] border rounded-xl flex items-center justify-between cursor-pointer bg-white transition-all",
          error ? 'border-red-300' : 'border-gray-300',
          disabled && 'bg-gray-100 cursor-not-allowed opacity-100'
        )}
        onClick={() => !disabled && setIsOpen(true)}
      >
        {!isOpen && !selectedSupplier ? (
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-pink-400" />
            <span className="text-gray-500 text-sm">Seleccionar proveedor...</span>
          </div>
        ) : !isOpen && selectedSupplier ? (
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-pink-400" />
            <span className="text-gray-800 font-medium text-sm">{selectedSupplier.nombre}</span>
          </div>
        ) : (
          <div className="flex-1 flex items-center">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-pink-400" /> : <Search className="text-gray-400 w-4 h-4 mr-2" />}
            <input
              type="text"
              className="w-full bg-transparent text-sm focus:outline-none"
              placeholder="Buscar por nombre o NIT..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              autoFocus
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          </div>
        )}
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-500 transition-transform",
          isOpen && 'rotate-180'
        )} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto py-1">
            {loading && searchResults.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">Buscando...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                {searchTerm ? 'No se encontraron proveedores' : 'Escribe para buscar...'}
              </div>
            ) : (
              searchResults.map((supplier) => (
                <div
                  key={supplier.proveedorId}
                  className={cn(
                    "px-4 py-3 hover:bg-pink-50 cursor-pointer text-sm flex justify-between items-center transition-colors",
                    String(supplier.proveedorId) === selectedId ? 'bg-pink-100 text-pink-700 font-semibold' : 'text-gray-800'
                  )}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onSelect(supplier);
                    setSelectedSupplier(supplier);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle
                      className={cn(
                        "h-4 w-4 text-pink-500",
                        String(supplier.proveedorId) === selectedId ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{supplier.nombre}</span>
                      <span className="text-xs text-gray-500">
                        {supplier.tipoDocumento === 'NIT' || supplier.tipoProveedor === 'Juridico'
                          ? `NIT: ${supplier.documento || 'N/A'}`
                          : `${supplier.tipoDocumento || 'Doc'}: ${supplier.documento || 'N/A'}`}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SupplySearchSelect({ onSelect, selectedId, error, disabled, allSelectedIds }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchResults, setSearchResults] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);

  useEffect(() => {
    const fetchSelected = async () => {
      if (selectedId && !selectedSupply) {
        try {
          const supply = await supplyService.getSupplyById(parseInt(selectedId));
          setSelectedSupply(supply);
        } catch (e) {
          console.warn('Error fetching selected supply:', e);
        }
      } else if (!selectedId) {
        setSelectedSupply(null);
      }
    };
    fetchSelected();
  }, [selectedId, selectedSupply]);

  useEffect(() => {
    const fetchSupplies = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await supplyService.getSupplies({ search: searchTerm, pageSize: 20 });
        setSearchResults(res.data);
      } catch (err) {
        console.error('Error searching supplies:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchSupplies, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${isOpen ? 'z-50' : ''}`} ref={dropdownRef}>
      <div
        className={cn(
          "w-full px-4 py-2 min-h-[40px] border rounded-xl flex items-center justify-between cursor-pointer bg-white transition-all",
          error ? 'border-red-300' : 'border-gray-200',
          disabled && 'bg-gray-100 cursor-not-allowed opacity-100'
        )}
        onClick={() => !disabled && setIsOpen(true)}
      >
        {!isOpen && !selectedSupply ? (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">Buscar insumo...</span>
          </div>
        ) : !isOpen && selectedSupply ? (
          <div className="flex items-center gap-2">
            <span className="text-gray-800 font-bold text-sm">{selectedSupply.nombre}</span>
          </div>
        ) : (
          <div className="flex-1 flex items-center">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-pink-400" /> : <Search className="text-gray-400 w-4 h-4 mr-2" />}
            <input
              type="text"
              className="w-full bg-transparent text-sm focus:outline-none font-bold"
              placeholder="Escribe para buscar..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              autoFocus
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          </div>
        )}
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-500 transition-transform",
          isOpen && 'rotate-180'
        )} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto py-1">
            {loading && searchResults.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">Buscando...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                {searchTerm ? 'No se encontraron insumos' : 'Escribe para buscar...'}
              </div>
            ) : (
              searchResults.map((supply) => {
                const isAlreadySelected = allSelectedIds.includes(String(supply.insumoId)) && String(supply.insumoId) !== selectedId;
                return (
                  <div
                    key={supply.insumoId}
                    className={cn(
                      "px-4 py-3 text-sm flex justify-between items-center transition-colors",
                      String(supply.insumoId) === selectedId ? 'bg-pink-100 text-pink-700 font-semibold' : 'text-gray-800',
                      isAlreadySelected ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-pink-50 cursor-pointer'
                    )}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      if (isAlreadySelected) return;
                      onSelect(supply);
                      setSelectedSupply(supply);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle
                        className={cn(
                          "h-4 w-4 text-pink-500",
                          String(supply.insumoId) === selectedId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{supply.nombre}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-400">Stock: {supply.stockActual} {supply.unidadMedida}</span>
                          <span className="text-[10px] text-gray-400">•</span>
                          <span className="text-[10px] text-pink-500 font-bold">${(supply.precioPromedio || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Purchase Creation Modal Component
function PurchaseCreateModal({ onClose, onSave, suppliers, supplies }: {
  onClose: () => void;
  onSave: (data: any) => void;
  suppliers: SupplierAPI[];
  supplies: Supply[];
}) {
  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    proveedorId: '',
    iva: '19',
    orderDate: getCurrentDate(),
    purchaseNumber: '',
    notes: '',
    items: [] as { insumoId: string; insumoNombre: string; cantidad: number; precioUnitario: number; subtotal: number }[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const addProduct = () => {
    setFormData({
      ...formData,
      items: [{
        insumoId: '',
        insumoNombre: '',
        cantidad: 1,
        precioUnitario: 0,
        subtotal: 0
      }, ...formData.items]
    });
  };

  const removeProduct = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      items: newItems
    });
  };

  const updateProduct = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };

    if (field === 'insumoId') {
      item.insumoId = String(value.insumoId);
      item.insumoNombre = value.nombre;
    } else if (field === 'cantidad') {
      item.cantidad = Math.max(1, parseInt(value) || 1);
    } else if (field === 'precioUnitario') {
      item.precioUnitario = parseFloat(value) || 0;
    }

    // Recalcular subtotal
    item.subtotal = item.cantidad * item.precioUnitario;
    newItems[index] = item;

    setFormData({
      ...formData,
      items: newItems
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.proveedorId) {
      newErrors.proveedorId = 'Selecciona un proveedor';
    }

    if (!formData.purchaseNumber) {
      newErrors.purchaseNumber = 'Ingresa el N° de factura o referencia';
    }

    if (!formData.iva || parseFloat(formData.iva) < 0) {
      newErrors.iva = 'Ingresa un valor de IVA válido';
    }

    if (formData.items.length === 0) {
      newErrors.items = 'Agrega al menos un insumo';
    }

    formData.items.forEach((item, index) => {
      if (!item.insumoId) {
        newErrors[`product_${index}`] = 'Selecciona un insumo';
      }
      if (item.cantidad <= 0) {
        newErrors[`quantity_${index}`] = 'La cantidad debe ser mayor a 0';
      }
      if (item.precioUnitario <= 0) {
        newErrors[`price_${index}`] = 'El precio debe ser mayor a 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const purchaseData = {
      proveedorId: parseInt(formData.proveedorId),
      iva: parseFloat(formData.iva),
      purchaseNumber: formData.purchaseNumber,
      notes: formData.notes,
      fechaRegistro: formData.orderDate,
      items: formData.items.map(item => ({
        insumoId: parseInt(item.insumoId),
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario
      }))
    };

    onSave(purchaseData);
  };

  const subtotal = formData.items.reduce((sum, item) => sum + item.subtotal, 0);
  const ivaPercent = parseFloat(formData.iva) || 0;
  const ivaAmount = subtotal * (ivaPercent / 100);
  const total = subtotal + ivaAmount;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Registrar Compra</h3>
                <p className="text-pink-100 text-sm">Abastece tu inventario registrando facturas de proveedores</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/30 no-scrollbar">
          <style>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>

          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
            {/* Form Alert */}
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl flex items-center space-x-3 animate-in slide-in-from-left-2 duration-200">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-700">Por favor, completa los campos obligatorios.</p>
              </div>
            )}

            {/* Basic Info Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
              <div className="flex items-center space-x-2 text-purple-500">
                <FileText className="w-4 h-4" />
                <h4 className="font-bold uppercase text-[10px] tracking-widest">Información de la Orden</h4>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Proveedor *</label>
                    <SupplierSearchSelect
                      selectedId={formData.proveedorId}
                      onSelect={(s: SupplierAPI) => setFormData({ ...formData, proveedorId: String(s.proveedorId) })}
                      error={!!errors.proveedorId}
                    />
                    {errors.proveedorId && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.proveedorId}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">N° de Factura / Referencia *</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        name="purchaseNumber"
                        placeholder="Ej: FAC-12345"
                        value={formData.purchaseNumber}
                        onChange={handleInputChange}
                        className={cn(
                          "w-full pl-10 pr-4 py-3 bg-gray-50/50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700",
                          errors.purchaseNumber ? 'border-red-300' : 'border-gray-200'
                        )}
                      />
                    </div>
                    {errors.purchaseNumber && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.purchaseNumber}</p>}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Fecha de Registro *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="date"
                        name="orderDate"
                        value={formData.orderDate}
                        max={getCurrentDate()}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Observaciones</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder="Notas adicionales sobre la compra..."
                      className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Products Selection Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-pink-400" />
                  <h4 className="font-bold text-gray-700 text-sm">Insumos a Comprar</h4>
                </div>
                <button
                  type="button"
                  onClick={addProduct}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-lg transition-all flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir Insumo</span>
                </button>
              </div>

              <div className="p-6">
                {formData.items.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {formData.items.map((item, index) => (
                      <div key={index} className="flex flex-wrap md:flex-nowrap items-end gap-4 py-4 group">
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Insumo *</label>
                          <SupplySearchSelect
                            selectedId={item.insumoId}
                            onSelect={(s: Supply) => updateProduct(index, 'insumoId', s)}
                            error={!!errors[`product_${index}`]}
                            allSelectedIds={formData.items.map(i => i.insumoId)}
                          />
                        </div>

                        <div className="w-24">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Cant. *</label>
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) => updateProduct(index, 'cantidad', e.target.value)}
                            className={cn(
                              "w-full px-3 py-2 bg-white border rounded-xl focus:ring-2 focus:ring-pink-300 transition-all font-bold text-gray-700 text-sm",
                              errors[`quantity_${index}`] ? 'border-red-300' : 'border-gray-200'
                            )}
                          />
                        </div>

                        <div className="w-32">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Precio Unit. *</label>
                          <div className="relative">
                            {item.precioUnitario === 0 && (
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
                            )}
                            <input
                              type="number"
                              min="0"
                              value={item.precioUnitario === 0 ? '' : item.precioUnitario}
                              onChange={(e) => updateProduct(index, 'precioUnitario', e.target.value)}
                              className={cn(
                                "w-full pr-3 py-2 bg-white border rounded-xl focus:ring-2 focus:ring-pink-300 transition-all font-bold text-gray-700 text-sm",
                                item.precioUnitario === 0 ? 'pl-7' : 'pl-3',
                                errors[`price_${index}`] ? 'border-red-300' : 'border-gray-200'
                              )}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="w-32">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Subtotal</label>
                          <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-500 text-sm">
                            ${item.subtotal.toLocaleString()}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeProduct(index)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all mb-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-3xl">
                    <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 font-medium">No has agregado ningún insumo aún</p>
                  </div>
                )}
                {errors.items && <p className="text-red-500 text-[10px] mt-2 text-center font-black uppercase tracking-widest">{errors.items}</p>}
              </div>
            </div>

            {/* Totals Summary - outside the gray box, visually attached */}
            {formData.items.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-5 rounded-2xl border border-purple-200 shadow-sm -mt-1">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-base">
                    <span className="text-gray-700">Subtotal:</span>
                    <span className="font-semibold text-gray-800">
                      ${subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-base">
                    <div className="flex items-center gap-2 text-gray-700">
                      <span>IVA (</span>
                      <input
                        type="number"
                        name="iva"
                        value={formData.iva}
                        onChange={handleInputChange}
                        className="w-14 bg-white border border-purple-200 rounded-lg px-2 py-0.5 text-center font-bold text-purple-600 text-sm focus:ring-2 focus:ring-pink-300 focus:border-pink-400 transition-all"
                      />
                      <span>%):</span>
                    </div>
                    <span className="font-semibold text-gray-800">
                      ${ivaAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-purple-300 pt-3">
                    <span className="font-bold text-gray-800">Total:</span>
                    <span className="font-bold text-purple-700 text-xl">
                      ${total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="p-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 justify-end shrink-0 z-20">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-8 py-2.5 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-xl font-black hover:shadow-lg active:scale-95 transition-all text-sm uppercase tracking-widest shadow-md flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Registrar Compra</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Cancel Confirmation Modal Component
function CancelConfirmationModal({ purchase, onClose, onConfirm }: {
  purchase: PurchaseAPI;
  onClose: () => void;
  onConfirm: (observation: string) => void;
}) {
  const [observation, setObservation] = useState('');

  const handleConfirm = () => {
    if (!observation.trim()) {
      toast.error('Por favor, ingresa el motivo de anulación');
      return;
    }
    onConfirm(observation);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('es-CO');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-pink-600 p-5 text-white shrink-0 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Ban className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold leading-tight">Confirmar Anulación</h3>
                <p className="text-pink-100 text-xs">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Centered alert icon */}
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h4 className="text-lg font-bold text-gray-800 mb-2">
              ¿Anular compra #{purchase.compraId}?
            </h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              Estás a punto de anular esta compra de forma permanente.
              Esta acción afectará el inventario de insumos asociados.
            </p>
          </div>

          {/* Item card */}
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl p-4">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Compra a anular</p>
              <p className="font-bold text-red-700">Compra #{purchase.compraId}</p>
              <p className="text-xs text-red-500">{purchase.proveedorNombre} | ${(purchase.total ?? 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Motivo de Anulación *</label>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-300 focus:border-transparent transition-all font-medium text-gray-700 resize-none"
              rows={3}
              placeholder="Explica brevemente el motivo..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all uppercase text-xs tracking-widest"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-200 uppercase text-xs tracking-widest flex items-center justify-center gap-2"
            >
              <Ban className="w-4 h-4" />
              Anular
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
