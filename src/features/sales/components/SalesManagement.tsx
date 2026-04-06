import React, { useEffect, useState, useRef } from 'react';
import {
  CheckCircle,
  DollarSign, Plus, Search, Filter, Eye, X, Calendar,
  CreditCard, TrendingUp, Users, User,
  Ban, FileText, Scissors,
  AlertCircle, Save, Clock, ShoppingBag, Phone, Loader2,
  Check, ChevronsUpDown, Trash2, Briefcase, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { salesService, type SaleView } from '../services/salesService';
import { userService } from '@/features/users/services/userService';
import { personService, type Person } from '@/features/persons/services/personService';
import { serviceService, type Service } from '@/features/services/services/serviceService';
import { supplyService, type Supply } from '@/features/supply/services/supplyService';
import { metodoPagoService, type MetodoPago } from '@/features/appointments/services/agendaService';
import { SimplePagination } from '@/shared/components/ui/simple-pagination';
import { cn } from '@/shared/components/ui/utils';
import { Button } from '@/shared/components/ui/button';

interface SalesManagementProps {
  hasPermission: (permission: string) => boolean;
  currentUser: any;
}

export function SalesManagement({ hasPermission, currentUser }: SalesManagementProps) {
  const [sales, setSales] = useState<SaleView[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleView | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelModal, setCancelModal] = useState(false);
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<SaleView | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await salesService.getAll({
        page: currentPage,
        pageSize: itemsPerPage,
        search: searchTerm
      });
      setSales(response.data || []);
      setTotalCount(response.totalCount || 0);
      setTotalPages(response.totalPages || 0);
    } catch (err) {
      console.error('Error loading sales:', err);
      setError('Error al cargar ventas');
      toast.error('Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [currentPage, searchTerm]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Ya no filtramos en el cliente, usamos lo que viene de la API
  const paginatedSales = sales;

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  if (loading && sales.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-pink-300 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Cargando ventas...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'refunded': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'refunded': return 'Anulada';
      default: return status;
    }
  };

  const handleViewSale = (sale) => {
    setSelectedSale(sale);
    setShowDetailModal(true);
  };

  const handleCancelSale = (sale) => {
    setSaleToCancel(sale);
    setCancelModal(true);
  };

  const confirmCancelSale = async (observacion: string) => {
    if (saleToCancel) {
      try {
        setLoading(true);
        // Llamada real a la API para anular
        await salesService.cancel(saleToCancel.id, observacion);

        const updatedSale = {
          ...saleToCancel,
          status: 'refunded' as const,
          notes: observacion,
          updatedAt: new Date().toISOString().split('T')[0]
        };

        setSales(sales.map(sale =>
          sale.id === saleToCancel.id ? updatedSale : sale
        ));

        // Si la venta anulada es la que se está viendo en el detalle, actualizarla también
        if (selectedSale && selectedSale.id === saleToCancel.id) {
          setSelectedSale(updatedSale);
        }

        toast.success(`Venta ${saleToCancel.id} anulada correctamente`);
        setCancelModal(false);
        setSaleToCancel(null);
      } catch (err) {
        console.error('Error al anular venta:', err);
        toast.error('Error al anular la venta. Verifique la conexión o el ID.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreateSale = async (saleData: any) => {
    try {
      setLoading(true);
      const createdSale = await salesService.create(saleData);
      if (createdSale) {
        // En lugar de agregar manualmente el objeto que puede estar incompleto, 
        // recargamos la lista desde el servidor para obtener los datos completos.
        if (currentPage === 1) {
          await load();
        } else {
          setCurrentPage(1);
        }
        
        toast.success(`Venta ${createdSale.id} registrada correctamente`);
        setShowNewSaleModal(false);
      } else {
        throw new Error('No se pudo registrar la venta');
      }
    } catch (err) {
      console.error('Error creating sale:', err);
      toast.error('Error al registrar la venta. Verifique los datos.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = (sale) => {
    // Crear contenido del recibo
    const customerName = sale.customerName || '';
    const employeeName = sale.employeeName || '';

    const receiptContent = `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #e91e63; padding-bottom: 15px; margin-bottom: 15px;">
          <h1 style="color: #e91e63; margin: 0;">AsthroApp</h1>
          <p style="margin: 5px 0; color: #666;">Salón de Belleza</p>
          <p style="margin: 5px 0; color: #666;">Cll 55 #42-16 Medellín</p>
        </div>
        
        <div style="margin-bottom: 15px;">
          <h3 style="margin: 0 0 10px 0; color: #333;">RECIBO DE VENTA</h3>
          <p><strong>ID Venta:</strong> ${sale.id}</p>
          <p><strong>Fecha:</strong> ${sale.date} - ${sale.time}</p>
          <p><strong>Cliente:</strong> ${customerName}</p>
          <p><strong>Empleado:</strong> ${employeeName}</p>
        </div>
        
        ${sale.services && sale.services.length > 0 ? `
          <div style="margin-bottom: 15px;">
            <h4 style="margin: 0 0 10px 0; color: #333;">SERVICIOS:</h4>
            ${sale.services.map(service => {
      return `<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>${service.name || service.serviceId}</span>
                <span>$${(service.totalPrice || 0).toLocaleString()}</span>
              </div>`;
    }).join('')}
          </div>
        ` : ''}
        
        <div style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 15px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Subtotal:</span>
            <span>$${(sale.subtotal || 0).toLocaleString()}</span>
          </div>
          ${sale.discount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>Descuento:</span>
              <span style="color: #e91e63;">-$${(sale.discount || 0).toLocaleString()}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; border-top: 1px solid #ddd; padding-top: 5px; margin-top: 5px;">
            <span>TOTAL:</span>
            <span>$${(sale.total || 0).toLocaleString()}</span>
          </div>
        </div>
        
        <div style="margin-top: 15px; font-size: 12px; color: #666;">
          <p><strong>Método de Pago:</strong> ${sale.paymentMethod === 'cash' ? 'Efectivo' :
        sale.paymentMethod === 'transfer' ? 'Transferencia' :
          sale.paymentMethod === 'nequi' ? 'Nequi' :
            sale.paymentMethod === 'daviplata' ? 'Daviplata' : 'Otro'
      }</p>
          ${sale.notes ? `<p><strong>Observaciones:</strong> ${sale.notes}</p>` : ''}
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
          <p>¡Gracias por tu preferencia!</p>
          <p>astrid@asthroapp.com | +57 304 123 4567</p>
        </div>
      </div>
    `;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Recibo de Venta - ${sale.id}</title>
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Gestión de Ventas</h2>
          <p className="text-gray-600">
            Registro y seguimiento de todas las ventas del salón
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
              placeholder="Buscar por ID, documento o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={load}
              className="p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
              title="Recargar datos"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {hasPermission('manage_sales') && (
              <button
                onClick={() => setShowNewSaleModal(true)}
                className="w-full md:w-auto bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span>Registrar Venta</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden relative min-h-[400px]">
        {loading && sales.length > 0 && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-pink-300 border-t-transparent animate-spin mb-2" />
            <span className="text-sm font-medium text-gray-500">Buscando...</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Documento</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Cliente</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Servicios</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Total</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Estado</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-600">
                    No hay ventas para mostrar. Ajusta filtros o intenta nuevamente más tarde.
                  </td>
                </tr>
              ) : (
                paginatedSales.map((sale) => {
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-gray-800">{sale.customerId || '---'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800">{sale.customerName || 'Cliente'}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          <Scissors className="w-4 h-4 text-purple-600" />
                          <span className="text-sm text-purple-600">{sale.services?.length || 0}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-green-600">
                          ${(sale.total || 0).toLocaleString()}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(sale.status)}`}>
                          {getStatusLabel(sale.status)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewSale(sale)}
                            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {hasPermission('manage_sales') && (
                            <>
                              <button
                                className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                                title="Imprimir recibo"
                                onClick={() => handlePrintReceipt(sale)}
                              >
                                <FileText className="w-4 h-4" />
                              </button>

                              {sale.status === 'completed' && (
                                <button
                                  onClick={() => handleCancelSale(sale)}
                                  className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                                  title="Anular venta"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
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

        {/* Updated Pagination */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <SimplePagination
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={goToPage}
            totalRecords={totalCount}
            recordsPerPage={itemsPerPage}
          />
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && saleToCancel && (
        <CancelSaleModal
          sale={saleToCancel}
          isConfirming={loading}
          onClose={() => {
            setCancelModal(false);
            setSaleToCancel(null);
          }}
          onConfirm={confirmCancelSale}
        />
      )}

      {/* Sale Detail Modal */}
      {showDetailModal && selectedSale && (
        <SaleDetailModal
          sale={selectedSale}
          onClose={() => setShowDetailModal(false)}
          onCancel={handleCancelSale}
          onPrint={handlePrintReceipt}
          hasPermission={hasPermission}
        />
      )}

      {/* New Sale Modal */}
      {showNewSaleModal && (
        <NewSaleModal
          onClose={() => setShowNewSaleModal(false)}
          onSubmit={handleCreateSale}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

// New Sale Modal Component
function NewSaleModal({ onClose, onSubmit, currentUser }: {
  onClose: () => void;
  onSubmit: (data: any) => void;
  currentUser: any;
}) {
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState<number>(0);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<MetodoPago[]>([]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch payment methods
  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const methods = await metodoPagoService.getAll();
        setAvailablePaymentMethods(Array.isArray(methods) ? methods : []);
        if (methods && methods.length > 0) {
          setPaymentMethodId(methods[0].metodopagoId);
        }
      } catch (err) {
        console.error('Error fetching payment methods:', err);
      }
    };
    fetchMethods();
  }, []);

  // Set default employee if currentUser is an employee
  useEffect(() => {
    if (currentUser?.documento) {
      setSelectedEmployeeId(currentUser.documento);
    }
  }, [currentUser]);

  const addService = (service: any) => {
    // Permite servicios duplicados en ventas si se desea, 
    // pero para consistencia con Agenda podríamos validarlo.
    // En ventas es común repetir ítems, así que lo dejamos libre.
    setSelectedServices([...selectedServices, {
      serviceId: service.servicioId,
      name: service.nombre,
      price: Number(service.precio) || 0,
      totalPrice: Number(service.precio) || 0
    }]);
  };

  const removeService = (index: number) => {
    setSelectedServices(selectedServices.filter((_, i) => i !== index));
  };

  const total = selectedServices.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!selectedClientId) newErrors.cliente = 'Selecciona un cliente';
    if (!selectedEmployeeId) newErrors.empleado = 'Selecciona un profesional';
    if (selectedServices.length === 0) newErrors.servicios = 'Agrega al menos un servicio';
    if (!paymentMethodId) newErrors.metodoPago = 'Selecciona un método de pago';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    const saleData = {
      clienteId: selectedClientId,
      empleadoId: selectedEmployeeId,
      metodoPagoId: paymentMethodId,
      items: selectedServices.map(s => ({
        tipo: 'service',
        id: s.serviceId,
        cantidad: 1,
        precioUnitario: s.price,
        total: s.totalPrice
      })),
      subtotal: total,
      descuento: 0,
      total,
      observaciones: notes || 'Sin observaciones',
      estado: true
    };

    try {
      await onSubmit(saleData);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

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
                <h3 className="text-xl font-bold leading-tight">Registrar Nueva Venta</h3>
                <p className="text-pink-100 text-sm">Registra servicios realizados y procesa el pago</p>
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

          <form onSubmit={handleFormSubmit} className="max-w-4xl mx-auto space-y-6">
            {/* Form Alert */}
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl flex items-center space-x-3 animate-in slide-in-from-left-2 duration-200">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-700">Por favor, completa los campos obligatorios.</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Client Info Card */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center space-x-2 text-pink-500">
                  <Users className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Información del Cliente</h4>
                </div>

                <div className="space-y-4">
                  <div className="bg-pink-50/30 p-4 rounded-2xl border border-pink-100">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Buscar Cliente *</label>
                    <ClientSearchSelect
                      selectedDocument={selectedClientId}
                      onSelect={(cli: any) => setSelectedClientId(cli.documentoCliente)}
                      error={!!errors.cliente}
                    />
                    {errors.cliente && (
                      <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.cliente}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Método de Pago *</label>
                    <div className="relative">
                      <select
                        value={paymentMethodId}
                        onChange={(e) => setPaymentMethodId(parseInt(e.target.value))}
                        className={cn(
                          "w-full px-4 py-3 bg-gray-50/50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700 appearance-none shadow-sm",
                          errors.metodoPago ? 'border-red-300' : 'border-gray-200'
                        )}
                      >
                        <option value={0}>Seleccionar método...</option>
                        {availablePaymentMethods.map(method => (
                          <option key={method.metodopagoId} value={method.metodopagoId}>
                            {method.nombre}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <CreditCard className="w-4 h-4 text-pink-400" />
                      </div>
                    </div>
                    {errors.metodoPago && (
                      <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.metodoPago}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Employee Card */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center space-x-2 text-purple-500">
                  <Briefcase className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Profesional Asignado</h4>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Atendido por *</label>
                    <ProfessionalSearchSelect
                      selectedDocument={selectedEmployeeId}
                      onSelect={(emp: any) => setSelectedEmployeeId(emp.documentoEmpleado)}
                      checkEmployeeOccupied={() => false} // No validamos ocupación en ventas directas
                      checkEmployeeHasSchedule={() => true} // Siempre permitimos vender
                      error={!!errors.empleado}
                    />
                    {errors.empleado && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.empleado}</p>}
                  </div>

                  <div className="bg-purple-50/30 p-4 rounded-2xl border border-purple-100 min-h-[100px]">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Observaciones</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 text-sm text-gray-700 resize-none p-0"
                      rows={3}
                      placeholder="Detalles adicionales de la venta..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Services Selection Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Scissors className="w-4 h-4 text-pink-400" />
                  <h4 className="font-bold text-gray-700 text-sm">Servicios Prestados</h4>
                </div>
                <div className="w-64">
                  <ServiceSearchSelect
                    selectedServiceId={0}
                    onSelect={(s: any) => addService(s)}
                    allSelectedIds={[]} // Permitimos duplicados en ventas
                  />
                </div>
              </div>

              <div className="p-6">
                {selectedServices.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {selectedServices.map((s, index) => (
                      <div key={index} className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 group hover:border-pink-200 transition-all">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-100 group-hover:bg-pink-50 group-hover:text-pink-500 transition-colors">
                          <Scissors className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-800">{s.name}</p>
                          <p className="text-xs font-black text-pink-500">${s.price.toLocaleString()}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeService(index)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-3xl">
                    <Plus className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 font-medium">No has agregado ningún servicio aún</p>
                  </div>
                )}
                {errors.servicios && <p className="text-red-500 text-[10px] mt-2 text-center font-black uppercase tracking-widest">{errors.servicios}</p>}
              </div>

              {/* Totals Summary */}
              {selectedServices.length > 0 && (
                <div className="px-8 py-6 bg-gray-900 text-white border-t border-gray-100 flex flex-wrap justify-between items-center gap-4">
                  <div className="flex items-center space-x-8">
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Items</span>
                      <span className="text-xl font-bold text-purple-400">{selectedServices.length}</span>
                    </div>
                    <div className="w-px h-10 bg-gray-700 hidden md:block"></div>
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Subtotal</span>
                      <span className="text-xl font-bold text-gray-300">${total.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] block mb-1">Total a Pagar</span>
                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">
                      ${total.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
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
            onClick={handleFormSubmit}
            disabled={submitting || selectedServices.length === 0}
            className="px-8 py-2.5 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-xl font-black hover:shadow-lg active:scale-95 transition-all text-sm uppercase tracking-widest shadow-md flex items-center space-x-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{submitting ? 'Procesando...' : 'Finalizar Venta'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Cancel Sale Modal Component
function CancelSaleModal({ sale, isConfirming, onClose, onConfirm }: {
  sale: SaleView;
  isConfirming: boolean;
  onClose: () => void;
  onConfirm: (observation: string) => void;
}) {
  const [observation, setObservation] = useState('');

  const handleConfirm = () => {
    if (isConfirming) return;
    onConfirm(observation);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-pink-600 p-5 text-white shrink-0 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                <Ban className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Confirmar Anulación</h3>
                <p className="text-red-100 text-xs font-medium">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isConfirming}
              className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all shadow-sm"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 rotate-3">
              <AlertCircle className="w-10 h-10 text-red-500 -rotate-3" />
            </div>
            <h4 className="text-lg font-bold text-gray-800 mb-2">
              ¿Anular venta #{sale.id}?
            </h4>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Estás a punto de anular esta venta de forma permanente. 
              Se generará un registro de devolución en el sistema.
            </p>
            
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center space-x-4 text-left">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                <ShoppingBag className="w-6 h-6 text-pink-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Información de Venta</p>
                <p className="font-bold text-gray-700 truncate">{sale.customerName || 'Cliente no registrado'}</p>
                <p className="text-[10px] font-mono text-gray-400 uppercase mt-0.5">Total: ${(sale.total || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1 text-left">Motivo de Anulación *</label>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-300 focus:border-transparent transition-all font-medium text-gray-700 resize-none text-sm"
                rows={3}
                placeholder="Explica brevemente el motivo..."
                disabled={isConfirming}
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isConfirming}
              className="flex-1 px-6 py-3 rounded-xl font-black text-gray-400 hover:bg-gray-100 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!observation.trim() || isConfirming}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {isConfirming ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Ban className="w-3.5 h-3.5" />
              )}
              <span>{isConfirming ? 'Procesando...' : 'Anular'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// Reusable Search Select Components (Styled like Agenda)
// ══════════════════════════════════════════

function ClientSearchSelect({ onSelect, selectedDocument, error, disabled }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  useEffect(() => {
    const fetchSelected = async () => {
      if (selectedDocument && !selectedClient) {
        try {
          const client = await personService.getPersonByDocument(selectedDocument, 'client');
          const mapped = {
            documentoCliente: client.documentId,
            nombre: client.name,
            telefono: client.phone
          };
          setSelectedClient(mapped);
        } catch (e) {
          console.warn('Error fetching selected client:', e);
        }
      }
    };
    fetchSelected();
  }, [selectedDocument, selectedClient]);

  useEffect(() => {
    const fetchClients = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await personService.getPersons('client', { search: searchTerm, pageSize: 20 });
        const mapped = res.data.map(p => ({
          documentoCliente: p.documentId,
          nombre: p.name,
          telefono: p.phone
        }));
        setSearchResults(mapped);
      } catch (err) {
        console.error('Error searching clients:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchClients, 300);
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
        {!isOpen && !selectedClient ? (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-pink-400" />
            <span className="text-gray-500 text-sm">Seleccionar cliente...</span>
          </div>
        ) : !isOpen && selectedClient ? (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-pink-400" />
            <span className="text-gray-800 font-medium text-sm">{selectedClient.nombre}</span>
          </div>
        ) : (
          <div className="flex-1 flex items-center">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-pink-400" /> : <Search className="text-gray-400 w-4 h-4 mr-2" />}
            <input
              type="text"
              className="w-full bg-transparent text-sm focus:outline-none"
              placeholder="Buscar por nombre o documento..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              autoFocus
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          </div>
        )}
        <ChevronsUpDown className={cn(
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
                {searchTerm ? 'No se encontraron clientes' : 'Escribe para buscar...'}
              </div>
            ) : (
              searchResults.map((client: any) => (
                <div
                  key={client.documentoCliente}
                  className={cn(
                    "px-4 py-3 hover:bg-pink-50 cursor-pointer text-sm flex justify-between items-center transition-colors",
                    client.documentoCliente === selectedDocument ? 'bg-pink-100 text-pink-700 font-semibold' : 'text-gray-800'
                  )}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onSelect(client);
                    setSelectedClient(client);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Check
                      className={cn(
                        "h-4 w-4 text-pink-500",
                        client.documentoCliente === selectedDocument ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{client.nombre}</span>
                      <span className="text-xs text-gray-500">{client.documentoCliente}</span>
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

function ProfessionalSearchSelect({
  selectedDocument,
  onSelect,
  checkEmployeeOccupied,
  checkEmployeeHasSchedule,
  disabled,
  error
}: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSelected = async () => {
      if (selectedDocument && !selectedEmployee) {
        try {
          const emp = await personService.getPersonByDocument(selectedDocument, 'employee');
          const mapped = {
            documentoEmpleado: emp.documentId,
            nombre: emp.name,
            telefono: emp.phone
          };
          setSelectedEmployee(mapped);
        } catch (e) {
          console.warn('Error fetching selected employee:', e);
        }
      }
    };
    fetchSelected();
  }, [selectedDocument, selectedEmployee]);

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await personService.getPersons('employee', { search: searchTerm, pageSize: 20 });
        const mapped = res.data.map(p => ({
          documentoEmpleado: p.documentId,
          nombre: p.name,
          telefono: p.phone
        }));
        setSearchResults(mapped);
      } catch (err) {
        console.error('Error searching employees:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full px-4 py-3 border rounded-xl transition-all cursor-pointer bg-white",
          error ? "border-red-300 ring-red-100" : "border-gray-300 ring-pink-100",
          !disabled && "hover:border-pink-300 focus-within:ring-2",
          disabled && "bg-gray-100 cursor-not-allowed opacity-75"
        )}
      >
        {!isOpen && !selectedEmployee ? (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-pink-400" />
            <span className="text-gray-500 text-sm">Seleccionar profesional...</span>
          </div>
        ) : !isOpen && selectedEmployee ? (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-pink-400" />
            <span className="text-gray-800 font-medium text-sm">{selectedEmployee.nombre}</span>
          </div>
        ) : (
          <div className="flex-1 flex items-center">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-pink-400" /> : <Search className="text-gray-400 w-4 h-4 mr-2" />}
            <input
              type="text"
              className="w-full bg-transparent text-sm focus:outline-none"
              placeholder="Buscar profesional..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              autoFocus
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          </div>
        )}
        <ChevronsUpDown className={cn(
          "w-4 h-4 text-gray-500 transition-transform",
          isOpen && 'rotate-180'
        )} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-[280px] overflow-y-auto py-1">
            {loading && searchResults.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">Buscando...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                {searchTerm ? 'No se encontraron profesionales' : 'Escribe para buscar...'}
              </div>
            ) : (
              searchResults.map((emp: any) => {
                const occupied = checkEmployeeOccupied(emp.documentoEmpleado);
                const isWithinSchedule = checkEmployeeHasSchedule(emp.documentoEmpleado);
                const isDisabled = occupied || !isWithinSchedule;
                const statusText = occupied
                  ? 'Ocupado'
                  : !isWithinSchedule
                    ? 'Fuera de horario'
                    : '';

                return (
                  <div
                    key={emp.documentoEmpleado}
                    className={cn(
                      "px-4 py-3 text-sm flex justify-between items-center transition-colors",
                      emp.documentoEmpleado === selectedDocument ? 'bg-pink-100 text-pink-700 font-semibold' : 'text-gray-800',
                      isDisabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "hover:bg-pink-50 cursor-pointer"
                    )}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      if (isDisabled) return;
                      onSelect(emp);
                      setSelectedEmployee(emp);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Check
                        className={cn(
                          "h-4 w-4 text-pink-500",
                          emp.documentoEmpleado === selectedDocument ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{emp.nombre}</span>
                        {statusText && (
                          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                            {statusText}
                          </span>
                        )}
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

function ServiceSearchSelect({
  selectedServiceId,
  onSelect,
  disabled,
  allSelectedIds
}: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSelected = async () => {
      if (selectedServiceId > 0 && (!selectedService || selectedService.servicioId !== selectedServiceId)) {
        try {
          const svc = await serviceService.getServiceById(selectedServiceId);
          setSelectedService(svc);
        } catch (e) {
          console.warn('Error fetching selected service:', e);
        }
      } else if (selectedServiceId === 0) {
        setSelectedService(null);
      }
    };
    fetchSelected();
  }, [selectedServiceId, selectedService]);

  useEffect(() => {
    const fetchServices = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await serviceService.getServices({ search: searchTerm, pageSize: 20 });
        setSearchResults(res.data);
      } catch (err) {
        console.error('Error searching services:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchServices, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full px-4 py-2 border rounded-xl transition-all cursor-pointer bg-white hover:border-pink-300",
          disabled && "cursor-not-allowed opacity-75"
        )}
      >
        {!isOpen && !selectedService ? (
          <div className="flex items-center gap-2">
            <Plus className="w-3 h-3 text-pink-500" />
            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Añadir Servicio</span>
          </div>
        ) : !isOpen && selectedService ? (
          <div className="flex items-center gap-2">
            <span className="text-gray-800 font-bold text-xs">{selectedService.nombre}</span>
          </div>
        ) : (
          <div className="flex-1 flex items-center">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-pink-400" /> : <Search className="text-gray-400 w-4 h-4 mr-2" />}
            <input
              type="text"
              className="w-full bg-transparent text-xs focus:outline-none font-bold uppercase tracking-widest"
              placeholder="Buscar servicio..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              autoFocus
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          </div>
        )}
        <ChevronsUpDown className={cn(
          "w-4 h-4 text-gray-500 transition-transform",
          isOpen && 'rotate-180'
        )} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-[250px] overflow-y-auto py-1">
            {loading && searchResults.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">Buscando...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                {searchTerm ? 'No se encontraron servicios' : 'Escribe para buscar...'}
              </div>
            ) : (
              searchResults.map((svc) => {
                const isSelected = svc.servicioId === selectedServiceId;
                const isAlreadyAdded = allSelectedIds.includes(svc.servicioId) && !isSelected;

                return (
                  <div
                    key={svc.servicioId}
                    className={cn(
                      "px-4 py-3 text-sm flex justify-between items-center transition-colors",
                      isSelected ? 'bg-pink-100 text-pink-700 font-semibold' : 'text-gray-800',
                      isAlreadyAdded ? "opacity-50 cursor-not-allowed bg-gray-50" : "hover:bg-pink-50 cursor-pointer"
                    )}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      if (isAlreadyAdded) return;
                      onSelect(svc);
                      setSelectedService(svc);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Check
                        className={cn(
                          "h-4 w-4 text-pink-500",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{svc.nombre}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-400">{svc.duracion} min</span>
                          <span className="text-[10px] text-gray-400">•</span>
                          <span className="text-[10px] text-gray-400">${svc.precio.toLocaleString()}</span>
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

// Sale Detail Modal Component
function SaleDetailModal({ sale, onClose, onCancel, onPrint, hasPermission }) {
  const [customerInfo, setCustomerInfo] = useState<{ email?: string; phone?: string }>({
    email: sale.customerEmail,
    phone: sale.customerPhone
  });
  const [loadingInfo, setLoadingInfo] = useState(false);

  useEffect(() => {
    const fetchExtraInfo = async () => {
      if (customerInfo.email && customerInfo.phone) return;

      setLoadingInfo(true);
      try {
        // 1. Try to find by customerId if it's a usuarioId
        if (sale.customerId && typeof sale.customerId === 'number') {
          const users = await userService.getAll();
          const user = users.find(u => u.usuarioId === sale.customerId);
          if (user) {
            setCustomerInfo(prev => ({ ...prev, email: user.email }));
          }
        }

        // 2. Try to find in Clientes to get phone/email
        const clients = await personService.getPersons('client');
        const client = clients.find(c =>
          (sale.customerId && (String(c.usuarioId) === String(sale.customerId) || String(c.documentId) === String(sale.customerId))) ||
          (sale.customerName && c.name === sale.customerName)
        );

        if (client) {
          setCustomerInfo(prev => ({
            ...prev,
            email: prev.email || client.email,
            phone: prev.phone || client.phone
          }));
        }
      } catch (err) {
        console.error('Error fetching extra customer info:', err);
      } finally {
        setLoadingInfo(false);
      }
    };

    fetchExtraInfo();
  }, [sale]);

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'cash': return 'Efectivo';
      case 'card': return 'Tarjeta';
      case 'transfer': return 'Transferencia';
      case 'nequi': return 'Nequi';
      case 'daviplata': return 'Daviplata';
      case 'mixed': return 'Mixto';
      default: return 'Otro';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Detalle de Venta {sale.id}</h3>
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
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Info Cards Row */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Customer Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-purple-500 mb-3">
                  <Users className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Cliente</h4>
                </div>
                <div className="mb-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Documento:</span>
                  <p className="font-mono text-gray-600 text-sm">{sale.customerId || 'No registrado'}</p>
                </div>
                <p className="font-bold text-gray-800 text-lg mb-1 truncate">
                  {sale.customerName || 'Cliente No Registrado'}
                </p>
                <div className="flex items-center space-x-2 text-gray-500">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="text-sm">{customerInfo.phone || 'N/A'}</span>
                </div>
              </div>

              {/* Payment Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-pink-500 mb-3">
                  <CreditCard className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Pago y Atención</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Método:</span>
                    <span className="font-bold text-gray-700">{getPaymentMethodLabel(sale.paymentMethod)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Atendido por:</span>
                    <span className="font-bold text-gray-700 truncate ml-2">{sale.employeeName || 'Personal'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Doc. Empleado:</span>
                    <span className="font-mono text-gray-600 text-xs">{sale.employeeId || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Status Card */}
              <div className={`rounded-2xl p-5 border shadow-sm flex flex-col items-center justify-center ${sale.status === 'completed'
                  ? 'bg-green-50/50 border-green-100 text-green-600'
                  : 'bg-red-50/50 border-red-100 text-red-600'
                }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${sale.status === 'completed' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                  {sale.status === 'completed' ? <CheckCircle className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                </div>
                <span className="font-black uppercase text-[10px] tracking-[0.2em]">
                  {sale.status === 'completed' ? 'Venta Exitosa' : 'Venta Anulada'}
                </span>
              </div>
            </div>

            {/* Services Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <h4 className="font-bold text-gray-700 text-sm flex items-center space-x-2">
                  <Scissors className="w-4 h-4 text-pink-400" />
                  <span>Servicios y Productos</span>
                </h4>
                <span className="text-[10px] font-black bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full uppercase">
                  {sale.services?.length || 0} ítems
                </span>
              </div>

              <div className="max-h-[250px] overflow-y-auto no-scrollbar">
                <table className="w-full">
                  <thead className="bg-gray-50/80 sticky top-0 backdrop-blur-sm z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Nombre del Servicio</th>
                      <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Precio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sale.services?.map((service, index) => (
                      <tr key={index} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-700">{service.name || 'Servicio'}</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                          ${(service.totalPrice || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Section: Observations and Totals */}
            <div className="grid md:grid-cols-2 gap-6 pb-4">
              {/* Observations */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-blue-500">
                  <FileText className="w-4 h-4" />
                  <h4 className="font-bold text-[10px] uppercase tracking-widest">Observaciones</h4>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm min-h-[120px]">
                  <p className="text-gray-600 text-sm italic leading-relaxed">
                    {sale.notes || 'Sin observaciones adicionales.'}
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-green-50 rounded-3xl p-8 border border-green-100 shadow-sm flex flex-col justify-center min-h-[160px]">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-green-700/70">Subtotal</span>
                    <span className="font-bold text-lg text-green-600">${(sale.subtotal || 0).toLocaleString()}</span>
                  </div>
                  {(sale.discount || 0) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-widest text-green-700/70">Descuento</span>
                      <span className="font-bold text-lg text-green-600">-${(sale.discount || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="pt-6 mt-2 border-t border-green-200 flex justify-between items-center px-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-green-800">Total</span>
                    <span className="font-bold text-lg text-green-600">
                      ${(sale.total || 0).toLocaleString()}
                    </span>
                  </div>
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
