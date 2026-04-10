import { apiClient, type PaginatedResponse } from '@/shared/services/apiClient';

export interface SaleServiceItem {
  serviceId?: number | string;
  appointmentId?: number | string;
  price: number;
  discount?: number;
  totalPrice: number;
  name?: string;
}

export interface SaleProductItem {
  productId?: number | string;
  quantity?: number;
  unitPrice?: number;
  discount?: number;
  totalPrice: number;
  name?: string;
}

export interface SaleView {
  id: string;
  customerId?: string | number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  employeeId?: string | number;
  employeeName?: string;
  date: string;
  time: string;
  items: SaleProductItem[];
  services: SaleServiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'mixed' | 'nequi' | 'daviplata';
  status: 'completed' | 'refunded' | string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

function toPaymentMethod(pm: string | null | undefined): SaleView['paymentMethod'] {
  const s = String(pm || '').toLowerCase();
  if (s.includes('efectivo') || s === 'cash') return 'cash';
  if (s.includes('tarjeta') || s === 'card') return 'card';
  if (s.includes('transfer') || s.includes('transferencia')) return 'transfer';
  if (s.includes('nequi')) return 'nequi';
  if (s.includes('daviplata')) return 'daviplata';
  return 'cash';
}

function toStatus(st: string | boolean | null | undefined): SaleView['status'] {
  if (typeof st === 'boolean') return st ? 'completed' : 'refunded';
  const s = String(st || '').toLowerCase();
  if (s.includes('refund') || s.includes('reembolso') || s.includes('anulada') || s.includes('cancel')) return 'refunded';
  return 'completed';
}

function safeNumber(n: any, fallback = 0): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function extractDateTime(dateStr: any): { date: string; time: string } {
  if (!dateStr) {
    const d = new Date();
    return { date: d.toISOString().split('T')[0], time: d.toTimeString().slice(0, 5) };
  }
  const s = String(dateStr);
  if (s.includes('T')) {
    const [d, t] = s.split('T');
    return { date: d, time: t.slice(0, 5) };
  }
  return { date: s, time: '00:00' };
}

function mapApiSaleToView(apiSale: any): SaleView {
  const id =
    apiSale?.id ||
    apiSale?.sale_number ||
    apiSale?.ventaId ||
    `VNT-${String(apiSale?.ventaId || Math.floor(Math.random() * 100000)).padStart(3, '0')}`;

  const dt = extractDateTime(apiSale?.sale_date || apiSale?.fechaVenta || apiSale?.fecha || apiSale?.createdAt);

  const items: SaleProductItem[] = Array.isArray(apiSale?.items)
    ? apiSale.items
        .filter((it: any) => String(it?.item_type || it?.tipo)?.toLowerCase().includes('product'))
        .map((it: any) => ({
          productId: it?.product_id ?? it?.productoId,
          quantity: safeNumber(it?.quantity ?? it?.cantidad ?? 1, 1),
          unitPrice: safeNumber(it?.unit_price ?? it?.precioUnitario),
          discount: safeNumber(it?.discount ?? it?.descuento),
          totalPrice: safeNumber(it?.total ?? it?.totalPrice ?? it?.subtotal),
          name: it?.product_name ?? it?.nombreProducto ?? it?.nombre,
        }))
    : [];

  const services: SaleServiceItem[] = Array.isArray(apiSale?.items)
    ? apiSale.items
        .filter((it: any) => String(it?.item_type || it?.tipo)?.toLowerCase().includes('serv'))
        .map((it: any) => ({
          serviceId: it?.service_id ?? it?.servicioId,
          appointmentId: apiSale?.appointment_id ?? apiSale?.citaId,
          price: safeNumber(it?.unit_price ?? it?.precio),
          discount: safeNumber(it?.discount ?? it?.descuento),
          totalPrice: safeNumber(it?.total ?? it?.totalPrice ?? it?.subtotal),
          name: it?.service_name ?? it?.nombreServicio ?? it?.nombre,
        }))
    : Array.isArray(apiSale?.servicios)
    ? apiSale.servicios.map((s: any) => ({
        serviceId: s?.servicioId ?? s?.id,
        appointmentId: s?.appointmentId ?? apiSale?.appointment_id,
        price: safeNumber(s?.precio),
        discount: safeNumber(s?.descuento),
        totalPrice: safeNumber(s?.totalPrice ?? s?.subtotal ?? s?.precio),
        name: s?.nombre,
      }))
    : [];

  const subtotal = safeNumber(apiSale?.subtotal);
  const discount = safeNumber(apiSale?.discount ?? apiSale?.descuento);
  const tax = safeNumber(apiSale?.tax ?? apiSale?.iva);
  const total =
    safeNumber(apiSale?.total) ||
    items.reduce((acc, i) => acc + safeNumber(i.totalPrice), 0) +
      services.reduce((acc, s) => acc + safeNumber(s.totalPrice), 0);

  return {
    id: String(id),
    customerId: apiSale?.documentoCliente ?? apiSale?.customer_id ?? apiSale?.clienteId ?? apiSale?.cliente?.id,
    customerName: apiSale?.clienteNombre ?? apiSale?.customer_name ?? apiSale?.cliente?.nombre,
    customerEmail: apiSale?.customer_email ?? apiSale?.clienteEmail ?? apiSale?.cliente?.email ?? apiSale?.cliente?.nombreUsuario,
    customerPhone: apiSale?.customer_phone ?? apiSale?.clienteTelefono ?? apiSale?.cliente?.telefono,
    employeeId: apiSale?.empleadoDocumento ?? apiSale?.user_id ?? apiSale?.empleadoId ?? apiSale?.empleado?.id,
    employeeName: apiSale?.empleadoNombre ?? apiSale?.user_name ?? apiSale?.empleado?.nombre,
    date: dt.date,
    time: dt.time,
    items,
    services,
    subtotal,
    discount,
    tax,
    total,
    paymentMethod: toPaymentMethod(apiSale?.payment_method ?? apiSale?.metodoPago),
    status: toStatus(apiSale?.payment_status ?? apiSale?.estado),
    notes: apiSale?.notes ?? apiSale?.observaciones ?? apiSale?.observacion ?? apiSale?.observación ?? apiSale?.Observaciones ?? apiSale?.Observación,
    createdAt: apiSale?.created_at ?? apiSale?.createdAt,
    updatedAt: apiSale?.updated_at ?? apiSale?.updatedAt,
  };
}

export const salesService = {
  async getAll(params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<SaleView>> {
    const endpoints = ['/api/Ventas', '/api/Venta', '/api/Sales'];
    for (const ep of endpoints) {
      try {
        const res = await apiClient.get<any>(ep, params);
        if (res && res.data && Array.isArray(res.data)) {
          return {
            ...res,
            data: res.data.map(mapApiSaleToView)
          };
        }
        if (Array.isArray(res)) {
          return {
            data: res.map(mapApiSaleToView),
            totalCount: res.length,
            page: params?.page || 1,
            pageSize: params?.pageSize || res.length,
            totalPages: 1
          };
        }
      } catch (err) {
        continue;
      }
    }
    return { data: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
  },

  async getById(id: string | number): Promise<SaleView> {
    const res = await apiClient.get(`/api/Ventas/${id}`);
    return mapApiSaleToView(res);
  },

  async update(id: string | number, data: any): Promise<SaleView | null> {
    const res = await apiClient.put(`/api/Ventas/${id}`, data);
    if (!res) return null;
    return mapApiSaleToView(res);
  },

  async cancel(id: string | number, observacion: string): Promise<SaleView | null> {
    try {
      // Intentamos primero con el endpoint de cancelación si existe
      const res = await apiClient.post(`/api/Ventas/${id}/cancel`, { observacion });
      if (res) return mapApiSaleToView(res);
    } catch (err) {
      // Si falla, intentamos con el PUT tradicional que desactiva la venta
      const payload = {
        estado: false,
        observacion: observacion
      };
      const res = await apiClient.put(`/api/Ventas/${id}`, payload);
      if (res) return mapApiSaleToView(res);
    }
    return null;
  },

  async getMyPurchases(params?: { page?: number; pageSize?: number }): Promise<PaginatedResponse<SaleView>> {
    try {
      const res = await apiClient.get<any>('/api/Ventas/mis-compras', params);
      
      if (res && res.data && Array.isArray(res.data)) {
        return {
          ...res,
          data: res.data.map(mapApiSaleToView)
        };
      }

      if (Array.isArray(res)) {
        return {
          data: res.map(mapApiSaleToView),
          totalCount: res.length,
          page: params?.page || 1,
          pageSize: params?.pageSize || res.length,
          totalPages: 1
        };
      }
    } catch (err) {
      console.error('Error fetching my purchases:', err);
    }
    return { data: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
  },

  async create(data: any): Promise<SaleView | null> {
    try {
      const payload = {
        documentoCliente: data.clienteId,
        documentoEmpleado: data.empleadoId,
        metodoPagoId: data.metodoPagoId,
        subtotal: data.subtotal,
        descuento: data.descuento,
        total: data.total,
        observaciones: data.observaciones,
        estado: true,
        serviciosIds: data.items.filter(i => i.tipo === 'service').map(i => i.id),
        detalles: data.items.map((item: any) => ({
          productoId: item.tipo === 'product' ? item.id : null,
          servicioId: item.tipo === 'service' ? item.id : null,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: item.total
        }))
      };

      const res = await apiClient.post('/api/Ventas', payload);
      if (!res) return null;
      return mapApiSaleToView(res);
    } catch (error) {
      console.error('Error in salesService.create:', error);
      throw error;
    }
  }
};
