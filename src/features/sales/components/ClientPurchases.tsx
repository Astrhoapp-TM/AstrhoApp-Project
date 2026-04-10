import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Calendar, Clock, CreditCard, ChevronLeft, ChevronRight, 
  Search, Eye, Loader2, Package, Tag, Info, AlertCircle, CheckCircle2,
  Receipt, Sparkles, User, MessageCircle, X
} from 'lucide-react';
import { salesService, SaleView } from '../services/salesService';
import { toast } from 'sonner';

interface ClientPurchasesProps {
  currentUser: any;
}

export function ClientPurchases({ currentUser }: ClientPurchasesProps) {
  const [sales, setSales] = useState<SaleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<SaleView | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  useEffect(() => {
    const loadPurchases = async () => {
      try {
        setLoading(true);
        const response = await salesService.getMyPurchases();
        setSales(response.data.sort((a, b) => 
          new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime()
        ));
      } catch (error) {
        console.error('Error loading purchases:', error);
        toast.error('No se pudieron cargar tus compras');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadPurchases();
    }
  }, [currentUser]);

  const filteredSales = sales.filter(sale => 
    sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.items.some(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    sale.services.some(service => service.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'completada' || s === 'pagada') return 'bg-green-100 text-green-800 border-green-200';
    if (s === 'refunded' || s === 'reembolsada' || s === 'anulada' || s === 'cancelado') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getStatusIcon = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'completada' || s === 'pagada') return <CheckCircle2 className="w-4 h-4" />;
    if (s === 'refunded' || s === 'reembolsada' || s === 'anulada' || s === 'cancelado') return <AlertCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const getStatusLabel = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'completada' || s === 'pagada') return 'Completada';
    if (s === 'refunded' || s === 'reembolsada' || s === 'anulada' || s === 'cancelado') return 'Cancelado';
    return status;
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash': return 'Efectivo';
      case 'card': return 'Tarjeta';
      case 'transfer': return 'Transferencia';
      case 'nequi': return 'Nequi';
      case 'daviplata': return 'Daviplata';
      case 'mixed': return 'Mixto';
      default: return method;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50/30 to-purple-50/30">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-pink-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Cargando tu historial de compras...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-br from-pink-50/30 to-purple-50/30 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Mis Compras Realizadas
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Consulta el historial detallado de todos los servicios que has adquirido con nosotros
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Buscar Compras</h3>
              <p className="text-sm text-gray-600">
                {filteredSales.length} factura{filteredSales.length !== 1 ? 's' : ''} encontrada{filteredSales.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="relative max-w-md w-full sm:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-pink-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por ID o servicio..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-200 focus:border-pink-400 focus:bg-white outline-none transition-all duration-200 text-sm font-medium text-gray-700 placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Sales Grid */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-800">Historial de Facturación</h3>
          </div>

          <div className="p-6">
            {paginatedSales.length > 0 ? (
              <div className="grid gap-6">
                {paginatedSales.map((sale) => (
                  <div key={sale.id} className="border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      {/* Sale Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-black text-pink-500 uppercase tracking-widest">Factura</span>
                              <h4 className="text-xl font-bold text-gray-800">
                                {sale.id}
                              </h4>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4 text-pink-400" />
                                <span>{new Date(sale.date + 'T00:00:00').toLocaleDateString('es-ES', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Clock className="w-4 h-4 text-pink-400" />
                                <span>{sale.time}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <CreditCard className="w-4 h-4 text-pink-400" />
                                <span>{getPaymentMethodLabel(sale.paymentMethod)}</span>
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mt-2">
                              {sale.services.map((svc, idx) => (
                                <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  {svc.name}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(sale.status)}`}>
                              {getStatusIcon(sale.status)}
                              <span>{getStatusLabel(sale.status)}</span>
                            </div>
                            <div className="mt-3">
                              <span className="text-xs text-gray-400 block uppercase font-bold tracking-widest">Total Pagado</span>
                              <span className="text-2xl font-black text-pink-600">{formatCurrency(sale.total)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end">
                        <button 
                          onClick={() => {
                            setSelectedSale(sale);
                            setShowDetailModal(true);
                          }}
                          className="bg-purple-50 text-purple-700 px-6 py-3 rounded-xl font-bold hover:bg-purple-100 transition-all flex items-center justify-center space-x-2 border border-purple-100 shadow-sm"
                        >
                          <Eye className="w-5 h-5" />
                          <span>Ver Detalle</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No se encontraron compras</h3>
                <p className="text-gray-500">
                  {searchTerm ? 'Prueba con otro término de búsqueda.' : 'Aún no has realizado ninguna compra de servicios.'}
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredSales.length)} de {filteredSales.length} facturas
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => setCurrentPage(index + 1)}
                      className={`px-3 py-2 text-sm rounded-lg font-bold ${
                        currentPage === index + 1
                          ? 'bg-gradient-to-r from-pink-400 to-purple-500 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight">Detalle de Factura</h3>
                    <p className="text-pink-100 text-sm">{selectedSale.id}</p>
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
                {/* Status Section */}
                <div className="flex justify-center mb-4">
                  <div className={`inline-flex items-center space-x-3 px-6 py-2 rounded-full text-lg font-bold border shadow-sm ${getStatusColor(selectedSale.status)}`}>
                    {getStatusIcon(selectedSale.status)}
                    <span>{getStatusLabel(selectedSale.status)}</span>
                  </div>
                </div>

                {/* Info Cards Row */}
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Date Card */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center space-x-2 text-pink-500 mb-3">
                      <Calendar className="w-4 h-4" />
                      <h4 className="font-bold uppercase text-[10px] tracking-widest">Fecha de Venta</h4>
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-gray-800">
                        {new Date(selectedSale.date + 'T00:00:00').toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-pink-600 font-bold flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {selectedSale.time}
                      </p>
                    </div>
                  </div>

                  {/* Payment Card */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center space-x-2 text-purple-500 mb-3">
                      <CreditCard className="w-4 h-4" />
                      <h4 className="font-bold uppercase text-[10px] tracking-widest">Método de Pago</h4>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{getPaymentMethodLabel(selectedSale.paymentMethod)}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Transacción</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info Card */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center space-x-2 text-blue-500 mb-3">
                      <User className="w-4 h-4" />
                      <h4 className="font-bold uppercase text-[10px] tracking-widest">Información Cliente</h4>
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-gray-800">{selectedSale.customerName}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{selectedSale.customerEmail}</p>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center space-x-2 text-gray-800">
                      <Sparkles className="w-5 h-5 text-pink-500" />
                      <h4 className="font-bold uppercase text-xs tracking-widest">Servicios Adquiridos</h4>
                    </div>
                    <span className="bg-pink-100 text-pink-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {selectedSale.services.length} Item{selectedSale.services.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/30 text-left">
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Servicio</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Precio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {selectedSale.services.map((svc, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                                  <Sparkles className="w-4 h-4 text-purple-400" />
                                </div>
                                <span className="font-bold text-gray-800 text-sm">{svc.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-bold text-gray-800 text-sm">{formatCurrency(svc.totalPrice)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bottom Section: Notes + Totals */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Notes */}
                  <div className="flex flex-col h-full">
                    <div className="flex items-center space-x-2 text-gray-400 mb-3 ml-2">
                      <MessageCircle className="w-4 h-4" />
                      <h4 className="font-bold text-[10px] uppercase tracking-widest">Notas de Venta</h4>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex-1 min-h-[120px]">
                      <p className="text-gray-600 text-sm italic leading-relaxed">
                        {selectedSale.notes || 'Sin notas adicionales.'}
                      </p>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-pink-50 rounded-3xl p-8 border border-pink-100 shadow-sm flex flex-col justify-center space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold uppercase tracking-widest text-pink-700/70 text-[10px]">Subtotal</span>
                      <span className="font-bold text-gray-700">{formatCurrency(selectedSale.subtotal)}</span>
                    </div>
                    {selectedSale.discount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold uppercase tracking-widest text-green-600 text-[10px]">Descuento</span>
                        <span className="font-bold text-green-600">-{formatCurrency(selectedSale.discount)}</span>
                      </div>
                    )}
                    {selectedSale.tax > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold uppercase tracking-widest text-pink-700/70 text-[10px]">IVA</span>
                        <span className="font-bold text-gray-700">{formatCurrency(selectedSale.tax)}</span>
                      </div>
                    )}
                    <div className="h-px bg-pink-200/50 w-full" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black uppercase tracking-widest text-pink-800">Total Pagado</span>
                      <span className="font-black text-2xl text-pink-600">{formatCurrency(selectedSale.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-white border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-8 py-3 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
