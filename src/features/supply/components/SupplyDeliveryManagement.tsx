import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Plus, Calendar, Filter, Search, CheckCircle, Clock, ChevronDown,
  X, Save, AlertCircle, Package, User, MapPin, FileText, Eye, Ban, Trash2, ShoppingCart, RefreshCw
} from 'lucide-react';
import { SimplePagination } from '@/shared/components/ui/simple-pagination';
import { deliveryService, type Delivery } from '../services/deliveryService';
import { supplyService, type Supply } from '../services/supplyService';
import { personService, type Person } from '@/features/persons/services/personService';
import { authService } from '@/features/auth/services/authService';
import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/components/ui/utils';

interface SupplyDeliveryManagementProps {
  hasPermission: (permission: string) => boolean;
}

// Map any variation of status to a normalized UI label
const getNormalizedLabel = (status: string) => {
  if (!status) return 'Pendiente';
  const s = status.toString().toLowerCase();
  if (s.includes('completado') || s.includes('completed') || s.includes('entregado')) return 'Completado';
  if (s.includes('cancelado') || s.includes('cancelled')) return 'Cancelado';
  return 'Pendiente';
};

export function SupplyDeliveryManagement({ hasPermission }: SupplyDeliveryManagementProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [deliveryToCancel, setDeliveryToCancel] = useState<Delivery | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const [response, suppliesData, employeesData] = await Promise.all([
        deliveryService.getDeliveries({
          page: currentPage,
          pageSize: itemsPerPage,
          search: searchTerm
        }),
        supplyService.getSupplies(),
        personService.getPersons('employee')
      ]);

      const deliveriesData = response.data || [];
      setTotalCount(response.totalCount || 0);
      setTotalPages(response.totalPages || 0);

      setDeliveries(deliveriesData);
      setSupplies(suppliesData.data || []);

      const employees = Array.isArray(employeesData) ? employeesData : (employeesData.data || []);
      const mappedEmployees = employees.map((emp: any) => ({
        id: emp.documentId || emp.documentoEmpleado,
        name: emp.name || emp.nombre,
        role: 'employee',
        email: emp.phone || emp.telefono
      }));
      setUsers(mappedEmployees);
    } catch (error) {
      console.error('Error fetching delivery data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount, page change, or search change
  useEffect(() => {
    fetchData();
  }, [currentPage, searchTerm]);

  // Removed redundant setCurrentPage(1) effect for searchTerm to avoid race conditions
  // Now handled in search input onChange

  // Ya no filtramos en el cliente, usamos lo que viene de la API
  const paginatedDeliveries = deliveries;

  // Auto-hide success alert after 4 seconds
  useEffect(() => {
    if (showSuccessAlert) {
      const timer = setTimeout(() => {
        setShowSuccessAlert(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessAlert]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const getSupplyInfo = (insumoId: number) => {
    return supplies.find(s => s.insumoId === insumoId);
  };

  const getUserInfo = (documentoEmpleado: string) => {
    return users.find(u => u.id === documentoEmpleado);
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s.includes('pendiente')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (s.includes('completado') || s.includes('entregado')) return 'bg-green-100 text-green-700 border-green-200';
    if (s.includes('cancelado')) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'pendiente':
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'completado':
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelado':
      case 'cancelled': return <X className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    if (!status) return 'Pendiente';
    const s = status.toString().toLowerCase();

    // Map any variation of 'completed' or 'delivered' to 'Completado'
    if (s.includes('completado') || s.includes('completed') || s.includes('entregado')) {
      return 'Completado';
    }

    // Map any variation of 'cancelled' to 'Cancelado'
    if (s.includes('cancelado') || s.includes('cancelled')) {
      return 'Cancelado';
    }

    return 'Pendiente';
  };

  const handleViewDetail = async (delivery: Delivery) => {
    try {
      setIsProcessing(true);
      // Como el listado general /Entregas no trae los "detalles", consultamos la ruta individual /Entregas/{id}
      const detailedDelivery = await deliveryService.getDeliveryById(delivery.id);
      setSelectedDelivery(detailedDelivery);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error obteniendo detalle de la entrega:', error);
      // Fallback
      setSelectedDelivery(delivery);
      setShowDetailModal(true);
    } finally {
      setIsProcessing(false);
    }
  };



  const handleCancelDelivery = (delivery: Delivery) => {
    setDeliveryToCancel(delivery);
    setShowCancelModal(true);
  };

  const confirmCancelDelivery = async () => {
    if (deliveryToCancel) {
      const id = deliveryToCancel.id;
      setShowCancelModal(false);
      setDeliveryToCancel(null);
      setCancelReason('');
      await updateDeliveryStatus(id, 'cancelado');
    }
  };

  const handleCreateDelivery = () => {
    setShowCreateModal(true);
  };

  const handleSaveDelivery = async (deliveryData: any) => {
    try {
      setIsProcessing(true);
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;

      // Format data for the backend API - matching CrearEntregaDto exactly
      const payload = {
        usuarioId: currentUser?.id || 1,
        fechaEntrega: new Date(deliveryData.deliveryDate).toISOString(),
        documentoEmpleado: deliveryData.responsibleId.toString(),
        detalles: deliveryData.items.map((item: any) => ({
          insumoId: Number(item.supplyId),
          cantidad: Number(item.quantity)
        }))
      };

      await deliveryService.createDelivery(payload);

      // Refresh both deliveries and supplies
      await fetchData();

      setShowCreateModal(false);
      setAlertMessage('Entrega registrada exitosamente');
      setShowSuccessAlert(true);
    } catch (error: any) {
      console.error('Error creating delivery:', error);
      const errorMessage = error.message || 'Error desconocido';
      setAlertMessage(`Error al crear la entrega: ${errorMessage}`);
      setShowSuccessAlert(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateDeliveryStatus = async (deliveryId: number, newStatus: string) => {
    if (isProcessing) return;

    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;

    // Rules from user: 1 -> Pendiente, 2 -> Completado, 3 -> Cancelado
    const estadoMap: Record<string, number> = {
      'pendiente': 1,
      'completado': 2,
      'cancelado': 3
    };

    const currentLabel = getNormalizedLabel(delivery.estado);
    const normalizedNewStatus = getNormalizedLabel(newStatus);
    const estadoId = estadoMap[normalizedNewStatus.toLowerCase()];

    // Validation
    if (!estadoId) {
      console.error("estadoId is required");
      return;
    }

    // If already finalized or status hasn't changed, ignore
    // 2 = Completado, 3 = Cancelado
    if (delivery.estadoId === 2 || delivery.estadoId === 3 || currentLabel === normalizedNewStatus) {
      return;
    }

    const previousDeliveries = [...deliveries];

    // Optimistic UI update
    setDeliveries(prev => prev.map(d =>
      d.id === deliveryId ? { ...d, estado: normalizedNewStatus, estadoId: estadoId } : d
    ));

    try {
      setIsProcessing(true);

      const payload = {
        usuarioId: delivery.usuarioId || 1,
        documentoEmpleado: delivery.documentoEmpleado,
        fechaEntrega: delivery.fechaEntrega,
        estadoId: estadoId
      };

      console.log('Updating delivery status with payload:', payload);
      await deliveryService.updateDelivery(deliveryId, payload);

      const actionWord = normalizedNewStatus === 'Completado' ? 'completada' : 'cancelada';
      setAlertMessage(`Entrega ${actionWord} exitosamente`);
      setShowSuccessAlert(true);

      // Final Sync: always refresh from backend to ensure consistency
      await fetchData(true);

    } catch (error) {
      console.error('Error updating status:', error);
      setDeliveries(previousDeliveries);
      setAlertMessage('Ocurrió un error al actualizar el estado.');
      setShowSuccessAlert(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintDeliveryPDF = (delivery: Delivery) => {
    const responsible = getUserInfo(delivery.documentoEmpleado);

    const pdfContent = `
      <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e91e63; padding-bottom: 15px;">
          <h1 style="color: #e91e63; margin-bottom: 5px;">AsthroApp</h1>
          <h2 style="color: #9c27b0; margin-top: 0;">Recibo de Entrega de Insumos</h2>
          <p style="color: #666; margin: 5px 0;">Cll 55 #42-16 Medellín</p>
          <p style="color: #666; margin: 5px 0;">astrid@asthroapp.com | +57 304 123 4567</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <div>
              <strong>Entrega #:</strong> ${delivery.id}
            </div>
            <div>
              <strong>Fecha:</strong> ${delivery.fechaEntrega.split('T')[0]}
            </div>
          </div>
          <div style="margin-bottom: 10px;">
            <strong>Estado:</strong> 
            <span style="padding: 4px 12px; border-radius: 20px; border: 1px solid ${delivery.estado.toLowerCase() === 'completado' || delivery.estado.toLowerCase() === 'completed' ? '#28a745' :
        delivery.estado.toLowerCase() === 'pendiente' || delivery.estado.toLowerCase() === 'pending' ? '#ffc107' : '#dc3545'
      }; background-color: ${delivery.estado.toLowerCase() === 'completado' || delivery.estado.toLowerCase() === 'completed' ? '#d4edda' :
        delivery.estado.toLowerCase() === 'pendiente' || delivery.estado.toLowerCase() === 'pending' ? '#fff3cd' : '#f8d7da'
      }; color: ${delivery.estado.toLowerCase() === 'completado' || delivery.estado.toLowerCase() === 'completed' ? '#155724' :
        delivery.estado.toLowerCase() === 'pendiente' || delivery.estado.toLowerCase() === 'pending' ? '#856404' : '#721c24'
      };">
              ${getStatusLabel(delivery.estado)}
            </span>
          </div>
        </div>

        <div style="margin-bottom: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 8px;">
          <h3 style="color: #333; margin-top: 0;">Responsable</h3>
          <p><strong>Nombre:</strong> ${responsible?.name || delivery.documentoEmpleado}</p>
          <p><strong>Rol:</strong> Empleado</p>
          <p><strong>ID:</strong> ${delivery.documentoEmpleado}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Detalle de los Productos</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #e91e63; color: white;">
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Producto</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">SKU</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              ${delivery.detalles?.map(item => {
        const product = getSupplyInfo(item.insumoId);
        return `<tr>
                  <td style="padding: 10px; border: 1px solid #ddd;">${product?.nombre || 'Insumo'}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${product?.sku || '-'}</td>
                  <td style="padding: 10px; text-align: center; border: 1px solid #ddd; font-weight: bold;">${item.cantidad}</td>
                </tr>`;
      }).join('')}
            </tbody>
          </table>
        </div>

        ${delivery.notes ? `
          <div style="margin-bottom: 20px; padding: 15px; background-color: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
            <h3 style="color: #333; margin-top: 0;">Notas Adicionales</h3>
            <p style="margin: 0;">${delivery.notes}</p>
          </div>
        ` : ''}

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
          <p>Este documento es un comprobante de entrega interna de insumos</p>
          <p>Generado el ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')}</p>
        </div>
      </div>
    `;

    const newWindow = window.open('', '_blank');
    newWindow.document.write(`
      <html>
        <head>
          <title>Entrega de Insumos - ${delivery.id}</title>
        </head>
        <body>
          ${pdfContent}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    newWindow.document.close();
  };

  // Calculate statistics
  const totalDeliveries = deliveries.length;
  const pendingDeliveries = deliveries.filter(d => d.estado.toLowerCase() === 'pendiente').length;
  const completedDeliveries = deliveries.filter(d => d.estado.toLowerCase() === 'completado').length;
  const todayDeliveries = deliveries.filter(d => d.fechaEntrega.split('T')[0] === new Date().toISOString().split('T')[0]).length;

  if (loading && deliveries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
        <p className="text-gray-600 font-medium italic">Cargando entregas...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Entregas de insumos</h2>
          <p className="text-gray-600">
            Control de entregas internas de insumos y materiales
          </p>
        </div>
      </div>

      {/* Search and Register */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por insumo, destino o responsable..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 outline-none transition-all"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => fetchData(true)}
              className="p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
              title="Recargar datos"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {hasPermission('manage_deliveries') && (
              <button
                onClick={handleCreateDelivery}
                className="w-full md:w-auto bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span>Registrar Entrega</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 relative min-h-[400px]">
        {loading && deliveries.length > 0 && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin mb-2" />
            <span className="text-sm font-medium text-gray-500">Buscando...</span>
          </div>
        )}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">Lista de Entregas</h3>
          <p className="text-gray-600">
            {totalCount} entrega{totalCount !== 1 ? 's' : ''} encontrada{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Responsable</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Insumos</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedDeliveries.map((delivery) => {
                const responsible = getUserInfo(delivery.documentoEmpleado);

                return (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{responsible?.name}</div>
                          <div className="text-sm text-gray-600">{responsible?.role === 'admin' ? 'Administrador' : 'Asistente'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <DeliveryItemsPreview deliveryId={delivery.id} getSupplyInfo={getSupplyInfo} />
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-gray-800">{delivery.fechaEntrega.split('T')[0]}</div>
                      {delivery.fechaCompletado && (
                        <div className="text-sm text-green-600">
                          Completado: {delivery.fechaCompletado.split('T')[0]}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {/* Select de cambio de estado */}
                      <div className="relative">
                        {hasPermission('manage_deliveries') &&
                          (delivery.estadoId === 1) ? (
                          <select
                            value={delivery.estado}
                            onChange={(e) => updateDeliveryStatus(delivery.id, e.target.value)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 cursor-pointer transition-all duration-200 focus:outline-none ${getStatusColor(delivery.estado)}`}
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="Completado">Completado</option>
                          </select>
                        ) : (
                          <span className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 inline-block ${getStatusColor(delivery.estado)}`}>
                            {getStatusLabel(delivery.estado)}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetail(delivery)}
                          className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>



                        <button
                          onClick={() => handlePrintDeliveryPDF(delivery)}
                          className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                          title="Imprimir PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {hasPermission('manage_deliveries') && delivery.estadoId === 1 && (
                          <button
                            onClick={() => handleCancelDelivery(delivery)}
                            className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                            title="Cancelar entrega"
                          >
                            <X className="w-4 h-4" />
                          </button>
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
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <SimplePagination
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            totalRecords={totalCount}
            recordsPerPage={itemsPerPage}
          />
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && deliveryToCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Standard Header */}
            <div className="bg-gradient-to-r from-red-500 to-pink-600 p-5 text-white shrink-0 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight">Confirmar Anulación</h3>
                    <p className="text-red-100 text-xs font-medium">Esta acción no se puede deshacer</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setDeliveryToCancel(null);
                    setCancelReason('');
                  }}
                  disabled={isProcessing}
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
                  ¿Anular entrega #{deliveryToCancel.id}?
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  Estás a punto de anular esta entrega. Se devolverá el stock a los insumos correspondientes.
                </p>
                
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col space-y-2 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Responsable:</span>
                    <span className="font-bold text-gray-700">{getUserInfo(deliveryToCancel.documentoEmpleado)?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha:</span>
                    <span className="font-bold text-gray-700">{deliveryToCancel.fechaEntrega.split('T')[0]}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Insumos:</span>
                    <span className="font-bold text-gray-700">{deliveryToCancel.detalles?.length || 0}</span>
                  </div>
                </div>

                <div className="text-left space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Motivo de Anulación *</label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-300 focus:border-transparent transition-all font-medium text-gray-700 resize-none outline-none"
                    rows={3}
                    placeholder="Explica brevemente el motivo..."
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setDeliveryToCancel(null);
                    setCancelReason('');
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-6 py-3 rounded-xl font-black text-gray-400 hover:bg-gray-100 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmCancelDelivery}
                  disabled={!cancelReason.trim() || isProcessing}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  <span>Anular</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Delivery Modal */}
      {showCreateModal && (
        <CreateDeliveryModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleSaveDelivery}
          supplies={supplies}
          users={users}
          isProcessing={isProcessing}
        />
      )}

      {/* Delivery Detail Modal */}
      {showDetailModal && selectedDelivery && (
        <DeliveryDetailModal
          delivery={selectedDelivery}
          onClose={() => setShowDetailModal(false)}
          responsible={getUserInfo(selectedDelivery.documentoEmpleado)}
          getSupplyInfo={getSupplyInfo}
        />
      )}

      {/* Success Alert - rendered at root level for highest z-index */}
      {showSuccessAlert && (
        <div className="fixed bottom-4 right-4 z-[2147483647] animate-in slide-in-from-bottom-5 duration-300">
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

// Employee Search and Select Component
function EmployeeSearchSelect({ users, onSelect, selectedId, error }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedUser = users.find((u: any) => u.id && u.id.toString() === (selectedId || '').toString());

  const filteredUsers = users.filter((u: any) => {
    if (!u) return false;
    const name = (u.name || '').toLowerCase();
    const doc = (u.id || '').toString().toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || doc.includes(search);
  });

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
    <div className={cn("relative", isOpen ? "z-50" : "")} ref={dropdownRef}>
      <div
        className={cn(
          "w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl flex items-center justify-between cursor-pointer transition-all outline-none",
          error ? 'border-red-300' : 'border-gray-200'
        )}
        onClick={() => setIsOpen(true)}
      >
        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        {!isOpen && !selectedUser ? (
          <span className="text-gray-400 text-sm font-medium">Buscar responsable (nombre o documento)...</span>
        ) : !isOpen && selectedUser ? (
          <span className="text-gray-800 text-sm font-bold">{selectedUser.name}</span>
        ) : (
          <input
            type="text"
            className="w-full bg-transparent text-sm focus:outline-none font-medium"
            placeholder="Escribe para buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">No se encontraron responsables</div>
            ) : (
              filteredUsers.map((user: any) => (
                <div
                  key={user.id}
                  className={cn(
                    "px-4 py-3 hover:bg-pink-50 cursor-pointer text-sm flex items-center transition-colors",
                    user.id.toString() === (selectedId || '').toString() ? 'bg-pink-100 text-pink-700 font-bold' : 'text-gray-800'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(user);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle
                      className={cn(
                        "h-4 w-4 text-pink-500",
                        user.id.toString() === (selectedId || '').toString() ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-bold">{user.name}</span>
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

// Product Search and Select Component
function ProductSearchSelect({ supplies, onSelect, selectedSupplyId, error, placeholder = 'Selecciona un insumo' }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedSupply = supplies.find((s: any) => s.insumoId === selectedSupplyId);

  const filteredSupplies = supplies.filter((s: any) => {
    if (!s) return false;
    const nombre = (s.nombre || '').toLowerCase();
    const sku = (s.sku || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return (s.estado === true || s.Estado === true) && (nombre.includes(search) || sku.includes(search));
  });

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
    <div className={cn("relative", isOpen ? "z-50" : "")} ref={dropdownRef}>
      <div
        className={cn(
          "w-full px-4 py-2 min-h-[42px] border rounded-xl flex items-center justify-between cursor-pointer bg-white transition-all",
          error ? 'border-red-300' : 'border-gray-200'
        )}
        onClick={() => setIsOpen(true)}
      >
        {!isOpen && !selectedSupply ? (
          <div className="flex-1 flex items-center">
            <Search className="text-gray-400 w-4 h-4 mr-2" />
            <span className="text-gray-400 text-sm font-medium">{placeholder}</span>
          </div>
        ) : !isOpen && selectedSupply ? (
          <span className="text-gray-800 text-sm font-bold">{selectedSupply.nombre}</span>
        ) : (
          <div className="flex-1 flex items-center">
            <Search className="text-gray-400 w-4 h-4 mr-2" />
            <input
              type="text"
              className="w-full bg-transparent text-sm focus:outline-none font-medium"
              placeholder="Buscar insumo..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              autoFocus
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          </div>
        )}
        <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredSupplies.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">No se encontraron insumos</div>
            ) : (
              filteredSupplies.map((supply: any) => (
                <div
                  key={supply.insumoId}
                  className={cn(
                    "px-4 py-3 hover:bg-pink-50 cursor-pointer text-sm flex items-center transition-colors",
                    supply.insumoId === selectedSupplyId ? 'bg-pink-100 text-pink-700 font-bold' : 'text-gray-800'
                  )}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onSelect(supply);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle
                      className={cn(
                        "h-4 w-4 text-pink-500",
                        supply.insumoId === selectedSupplyId ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-bold">{supply.nombre}</span>
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

// Create Delivery Modal Component
function CreateDeliveryModal({ onClose, onSave, supplies, users, isProcessing }: any) {
  const [formData, setFormData] = useState({
    deliveryDate: new Date().toISOString().split('T')[0],
    responsibleId: '',
    notes: '',
    items: []
  });

  const [errors, setErrors] = useState<any>({});

  const addInsumo = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        supplyId: '',
        quantity: ''
      }]
    });
  };

  const removeInsumo = (index: number) => {
    const newItems = formData.items.filter((_: any, i: number) => i !== index);
    setFormData({
      ...formData,
      items: newItems
    });
  };

  const updateInsumo = (index: number, field: string, value: any) => {
    if (field === 'supplyId' && value) {
      const isDuplicate = formData.items.some(
        (item: any, i: number) => i !== index && item.supplyId === value
      );

      if (isDuplicate) {
        setErrors({
          ...errors,
          [`supply_${index}`]: 'Este insumo ya ha sido agregado'
        });
        return;
      }
    }

    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };

    const newErrors: any = { ...errors };
    if (field === 'supplyId') {
      delete newErrors[`supply_${index}`];
    }

    setErrors(newErrors);
    setFormData({
      ...formData,
      items: newItems
    });
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const newErrors: any = {};
    if (formData.items.length === 0) {
      newErrors.items = 'Agrega al menos un insumo';
    }
    if (!formData.responsibleId) newErrors.responsibleId = 'Selecciona un responsable';

    formData.items.forEach((item: any, index: number) => {
      const supplyIdNum = parseInt(item.supplyId);
      if (isNaN(supplyIdNum)) {
        newErrors[`supply_${index}`] = 'Selecciona un insumo';
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        newErrors[`quantity_${index}`] = 'Cantidad debe ser mayor a 0';
      }

      if (!isNaN(supplyIdNum)) {
        const supply = supplies.find((s: any) => s.insumoId === supplyIdNum);
        if (supply) {
          const rawStock = supply.cantidad ?? supply.stock ?? supply.existencia ?? supply.stock_quantity;
          if (rawStock !== undefined) {
            const availableStock = parseFloat(rawStock as any);
            if (parseFloat(item.quantity) > availableStock) {
              newErrors[`quantity_${index}`] = `Stock insuficiente. Disponible: ${availableStock}`;
            }
          }
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const responsible = users.find(u => u.id.toString() === formData.responsibleId.toString());

    onSave({
      ...formData,
      responsibleId: formData.responsibleId,
      responsiblePerson: responsible?.name,
      destination: 'Salón de Belleza',
      items: formData.items.map((item: any) => ({
        supplyId: parseInt(item.supplyId),
        quantity: parseFloat(item.quantity)
      }))
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if ((errors as any)[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Registrar Entrega de Insumos</h3>
                <p className="text-pink-100 text-sm">Registro de entrega interna para el salón</p>
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

        {/* Scrollable Body - 2 Columns Layout */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/30 no-scrollbar">
          <style>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>

          <div className="max-w-5xl mx-auto space-y-6">
            {/* Error Notification */}
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center space-x-3 animate-in fade-in duration-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="font-semibold text-sm">Por favor complete todos los campos requeridos correctamente</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column: Basic Info & Notes */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-2 rounded-t-2xl">
                    <User className="w-4 h-4 text-pink-500" />
                    <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Información de Entrega</h4>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Fecha de Entrega *</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="date"
                          name="deliveryDate"
                          value={formData.deliveryDate}
                          onChange={handleInputChange}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Responsable *</label>
                      <EmployeeSearchSelect
                        users={users}
                        selectedId={formData.responsibleId}
                        onSelect={(u: any) => {
                          setFormData({ ...formData, responsibleId: u.id.toString() });
                          if (errors.responsibleId) {
                            setErrors({ ...errors, responsibleId: '' });
                          }
                        }}
                        error={!!errors.responsibleId}
                      />
                      {errors.responsibleId && <p className="text-[9px] text-red-500 mt-1 ml-1">{errors.responsibleId}</p>}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-2 rounded-t-2xl">
                    <FileText className="w-4 h-4 text-purple-500" />
                    <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Notas Adicionales</h4>
                  </div>
                  <div className="p-6">
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Observaciones sobre la entrega (opcional)..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all outline-none min-h-[120px] resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Insumos (Matching Purchase Form Style) */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between rounded-t-2xl">
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-pink-400" />
                    <h4 className="font-bold text-gray-700 text-sm">Insumos a Entregar</h4>
                  </div>
                  <button
                    type="button"
                    onClick={addInsumo}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-lg transition-all flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Añadir Insumo</span>
                  </button>
                </div>

                <div className="p-6 flex-1 max-h-[500px] overflow-y-auto no-scrollbar">
                  {formData.items.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {formData.items.map((item: any, index: number) => {
                        const supplyIdNum = parseInt(item.supplyId);
                        const supply = supplies.find((s: any) => s.insumoId === supplyIdNum);
                        const rawStock = supply?.cantidad ?? supply?.stock ?? supply?.existencia ?? supply?.stock_quantity;
                        const availableStock = rawStock !== undefined ? parseFloat(rawStock as any) : 0;
                        const isOverStock = item.supplyId && parseFloat(item.quantity) > availableStock;

                        return (
                          <div key={index} className="flex flex-wrap md:flex-nowrap items-end gap-4 py-4 group">
                            <div className="flex-1 min-w-[200px]">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Insumo *</label>
                              <ProductSearchSelect
                                supplies={supplies}
                                selectedSupplyId={parseInt(item.supplyId)}
                                onSelect={(s: any) => updateInsumo(index, 'supplyId', s.insumoId.toString())}
                                error={!!errors[`supply_${index}`]}
                              />
                            </div>

                            <div className="w-24">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Cant. *</label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateInsumo(index, 'quantity', e.target.value)}
                                min="1"
                                className={cn(
                                  "w-full px-3 py-2 bg-white border rounded-xl focus:ring-2 focus:ring-pink-300 transition-all font-bold text-gray-700 text-sm",
                                  isOverStock ? 'border-red-300' : 'border-gray-200'
                                )}
                                required
                              />
                            </div>

                            {item.supplyId && (
                              <div className="w-28">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Disponible</label>
                                <div className={`w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl font-bold text-sm ${isOverStock ? 'text-red-500' : 'text-gray-500'}`}>
                                  {availableStock} {supply?.unidad_medida || ''}
                                </div>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => removeInsumo(index)}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all mb-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
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
            </div>

          </div>
        </form>

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
            type="button"
            onClick={() => handleSubmit()}
            disabled={isProcessing || formData.items.length === 0}
            className="px-8 py-2.5 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-xl font-black hover:shadow-lg active:scale-95 transition-all text-sm uppercase tracking-widest shadow-md flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isProcessing ? 'Procesando...' : 'Registrar Entrega'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Delivery Detail Modal Component
function DeliveryDetailModal({ delivery, onClose, responsible, getSupplyInfo }: any) {
  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s.includes('pendiente')) return 'bg-yellow-50/50 border-yellow-100 text-yellow-600';
    if (s.includes('completado') || s.includes('entregado')) return 'bg-green-50/50 border-green-100 text-green-600';
    if (s.includes('cancelado')) return 'bg-red-50/50 border-red-100 text-red-600';
    return 'bg-gray-50/50 border-gray-100 text-gray-600';
  };

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase();
    if (s.includes('pendiente')) return <Clock className="w-5 h-5" />;
    if (s.includes('completado') || s.includes('entregado')) return <CheckCircle className="w-5 h-5" />;
    if (s.includes('cancelado')) return <Ban className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  const getStatusLabel = (status: string) => {
    const s = status?.toLowerCase();
    if (s.includes('pendiente')) return 'Pendiente';
    if (s.includes('completado') || s.includes('entregado')) return 'Completado';
    if (s.includes('cancelado')) return 'Cancelado';
    return status;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-6 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight">Detalle de Entrega #{delivery.id}</h3>
                <p className="text-pink-100 text-xs font-medium uppercase tracking-widest opacity-80">Información completa de la entrega interna</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all shadow-sm"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/30 no-scrollbar">
          <style>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>
          
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Info Cards Row */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Responsible Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-purple-500 mb-3">
                  <User className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Responsable</h4>
                </div>
                <div className="mb-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">ID Empleado:</span>
                  <p className="font-mono text-gray-600 text-sm">{delivery.documentoEmpleado || 'No registrado'}</p>
                </div>
                <p className="font-bold text-gray-800 text-lg mb-1 truncate">
                  {responsible?.name || 'Empleado No Registrado'}
                </p>
                <div className="flex items-center space-x-2 text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-sm">Salón de Belleza</span>
                </div>
              </div>

              {/* Date Info Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-pink-500 mb-3">
                  <Calendar className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Fechas y Tiempos</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Fecha Entrega:</span>
                    <span className="font-bold text-gray-700">{delivery.fechaEntrega.split('T')[0]}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Fecha Registro:</span>
                    <span className="font-bold text-gray-700">{delivery.fechaCreado.split('T')[0]}</span>
                  </div>
                  {delivery.fechaCompletado && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Completado:</span>
                      <span className="font-bold text-green-600">{delivery.fechaCompletado.split('T')[0]}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Card */}
              <div className={`rounded-2xl p-5 border shadow-sm flex flex-col items-center justify-center ${getStatusColor(delivery.estado)}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                  delivery.estado.toLowerCase().includes('pendiente') ? 'bg-yellow-100' : 
                  delivery.estado.toLowerCase().includes('completado') ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {getStatusIcon(delivery.estado)}
                </div>
                <span className="font-black uppercase text-[10px] tracking-[0.2em]">
                  {getStatusLabel(delivery.estado)}
                </span>
              </div>
            </div>

            {/* Insumos Table Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <h4 className="font-bold text-gray-700 text-sm flex items-center space-x-2">
                  <Package className="w-4 h-4 text-pink-400" />
                  <span>Insumos Entregados</span>
                </h4>
                <span className="text-[10px] font-black bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full uppercase">
                  {delivery.detalles?.length || 0} productos
                </span>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                <table className="w-full">
                  <thead className="bg-gray-50/80 sticky top-0 backdrop-blur-sm z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Insumo</th>
                      <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">SKU</th>
                      <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {delivery.detalles?.map((item, idx) => {
                      const prod = getSupplyInfo(item.insumoId);
                      return (
                        <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-gray-700">{prod?.nombre || 'Insumo'}</td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-500">{prod?.sku || '-'}</td>
                          <td className="px-6 py-4 text-center text-sm font-bold text-purple-600">
                            {item.cantidad} {prod?.unidad_medida || ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Observations and Summary Section */}
            <div className="grid md:grid-cols-2 gap-6 pb-4">
              {/* Observations */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-blue-500">
                  <FileText className="w-4 h-4" />
                  <h4 className="font-bold text-[10px] uppercase tracking-widest">Notas de Entrega</h4>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm min-h-[120px]">
                  <p className="text-gray-600 text-sm italic leading-relaxed">
                    {delivery.notes || delivery.notas || 'Sin observaciones adicionales.'}
                  </p>
                </div>
              </div>

              {/* Summary / Stats */}
              <div className="bg-purple-50 rounded-3xl p-8 border border-purple-100 shadow-sm flex flex-col justify-center min-h-[160px]">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-purple-700/70">Total Insumos</span>
                    <span className="font-bold text-lg text-purple-600">
                      {delivery.detalles?.reduce((sum, item) => sum + item.cantidad, 0)} unidades
                    </span>
                  </div>
                  <div className="pt-6 mt-2 border-t border-purple-200 flex justify-between items-center px-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-purple-800">Estado</span>
                    <span className={`font-bold text-lg ${
                      delivery.estado.toLowerCase().includes('pendiente') ? 'text-yellow-600' : 
                      delivery.estado.toLowerCase().includes('completado') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {getStatusLabel(delivery.estado)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="p-5 bg-white border-t border-gray-100 flex justify-end shrink-0 z-20">
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

// Sub-componente mágico para cargar los insumos de cada entrega en la fila correspondientes
function DeliveryItemsPreview({ deliveryId, getSupplyInfo }: { deliveryId: number, getSupplyInfo: (id: number) => any }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDetailedDelivery = async () => {
      try {
        const detail = await deliveryService.getDeliveryById(deliveryId);
        if (isMounted) {
          setItems(detail.detalles || []);
        }
      } catch (e) {
        console.error("Error fetching detail for", deliveryId);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDetailedDelivery();
    return () => { isMounted = false; };
  }, [deliveryId]);

  if (loading) return <div className="text-xs text-purple-400 animate-pulse font-medium">Cargando insumos...</div>;
  if (!items || items.length === 0) return <div className="text-sm text-gray-400 italic">No hay insumos o no se detectaron</div>;

  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => {
        const prod = getSupplyInfo(item.insumoId);
        return (
          <div key={idx} className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            <span>{prod?.nombre || 'Insumo #' + item.insumoId}: <strong className="text-purple-700 ml-1">{item.cantidad}</strong></span>
          </div>
        );
      })}
    </div>
  );
}