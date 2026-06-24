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
    return { date: 'Fecha no disponible', time: '00:00' };
  }
  const s = String(dateStr).trim();
  
  // If it contains 'T', it's ISO format: split by T
  if (s.includes('T')) {
    const [d, t] = s.split('T');
    return { date: d, time: t.slice(0, 5) };
  }
  
  // If it contains space, try to split date and time
  if (s.includes(' ')) {
    const parts = s.split(' ');
    return { date: parts[0], time: parts[1]?.slice(0, 5) || '00:00' };
  }
  
  // If it looks like just a date (YYYY-MM-DD or DD/MM/YYYY or similar)
  if (s.match(/^\d{4}-\d{2}-\d{2}$/) || s.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return { date: s, time: '00:00' };
  }
  
  return { date: s, time: '00:00' };
}

function mapApiSaleToView(apiSale: any): SaleView {
  console.log('🔍 mapApiSaleToView raw apiSale:', JSON.stringify(apiSale, null, 2));
  const id =
    apiSale?.id ||
    apiSale?.sale_number ||
    apiSale?.ventaId ||
    `VNT-${String(apiSale?.ventaId || Math.floor(Math.random() * 100000)).padStart(3, '0')}`;

  const dt = extractDateTime(
    apiSale?.fechaRegistro ||
    apiSale?.FechaRegistro ||
    apiSale?.sale_date || 
    apiSale?.SaleDate || 
    apiSale?.fechaVenta || 
    apiSale?.FechaVenta ||
    apiSale?.fecha || 
    apiSale?.Fecha ||
    apiSale?.citaFecha || 
    apiSale?.CitaFecha ||
    apiSale?.fechaCita ||
    apiSale?.FechaCita ||
    apiSale?.appointment_date ||
    apiSale?.AppointmentDate ||
    apiSale?.cita?.fecha ||
    apiSale?.cita?.Fecha ||
    apiSale?.Cita?.Fecha ||
    apiSale?.createdAt || 
    apiSale?.created_at ||
    apiSale?.CreatedAt
  );

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

  let services: SaleServiceItem[] = [];
  if (Array.isArray(apiSale?.items)) {
    services = apiSale.items
      .filter((it: any) => String(it?.item_type || it?.tipo)?.toLowerCase().includes('serv'))
      .map((it: any) => ({
        serviceId: it?.service_id ?? it?.servicioId,
        appointmentId: apiSale?.appointment_id ?? apiSale?.citaId,
        price: safeNumber(it?.unit_price ?? it?.precio ?? it?.precioUnitario ?? it?.totalPrice ?? it?.total ?? it?.subtotal),
        discount: safeNumber(it?.discount ?? it?.descuento),
        totalPrice: safeNumber(it?.total ?? it?.totalPrice ?? it?.subtotal ?? it?.precio ?? it?.unit_price ?? it?.precioUnitario),
        name: it?.service_name ?? it?.nombreServicio ?? it?.nombre,
      }));
  } else if (Array.isArray(apiSale?.servicios)) {
    services = apiSale.servicios.map((s: any) => ({
      serviceId: s?.servicioId ?? s?.id,
      appointmentId: s?.appointmentId ?? apiSale?.appointment_id,
      price: safeNumber(s?.precio ?? s?.precioUnitario ?? s?.totalPrice ?? s?.subtotal),
      discount: safeNumber(s?.descuento),
      totalPrice: safeNumber(s?.totalPrice ?? s?.subtotal ?? s?.precio ?? s?.precioUnitario),
      name: s?.nombre,
    }));
  } else if (Array.isArray(apiSale?.detalles)) {
    services = apiSale.detalles
      .filter((d: any) => d?.servicioId != null)
      .map((d: any) => ({
        serviceId: d?.servicioId,
        price: safeNumber(d?.precio ?? d?.precioUnitario ?? d?.subtotal),
        discount: safeNumber(d?.descuento),
        totalPrice: safeNumber(d?.subtotal ?? d?.precio ?? d?.precioUnitario),
        name: d?.nombreServicio ?? d?.nombre ?? d?.descripcion,
      }));
  } else if (Array.isArray(apiSale?.motivos)) {
    services = apiSale.motivos.map((m: any) => ({
      serviceId: m?.servicioId ?? m?.id,
      price: safeNumber(m?.precio ?? m?.totalPrice ?? m?.subtotal),
      discount: safeNumber(m?.descuento),
      totalPrice: safeNumber(m?.totalPrice ?? m?.subtotal ?? m?.precio),
      name: m?.descripcion ?? m?.nombre,
    }));
  }

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
    createdAt: apiSale?.created_at ?? apiSale?.createdAt ?? apiSale?.fechaRegistro,
    updatedAt: apiSale?.updated_at ?? apiSale?.updatedAt,
  };
}

export const salesService = {
  async getAll(params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<SaleView>> {
    const endpoints = ['/api/Ventas', '/api/Venta', '/api/Sales'];
    for (const ep of endpoints) {
      try {
        const res = await apiClient.get<any>(ep, params);
        // Handle { success, data } format
        const responseData = res?.success && res?.data ? res.data : res;
        
        if (responseData && responseData.data && Array.isArray(responseData.data)) {
          return {
            ...responseData,
            data: responseData.data.map(mapApiSaleToView)
          };
        }
        if (Array.isArray(responseData)) {
          return {
            data: responseData.map(mapApiSaleToView),
            totalCount: responseData.length,
            page: params?.page || 1,
            pageSize: params?.pageSize || responseData.length,
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
    const res = await apiClient.get('/api/Ventas/' + id);
    // Handle { success, data } format
    const saleData = res?.success && res?.data ? res.data : res;
    return mapApiSaleToView(saleData);
  },

  async update(id: string | number, data: any): Promise<SaleView | null> {
    const res = await apiClient.put('/api/Ventas/' + id, data);
    if (!res) return null;
    return mapApiSaleToView(res);
  },

  async cancel(id: string | number, observacion: string): Promise<SaleView | null> {
    try {
      const res = await apiClient.post('/api/Ventas/' + id + '/cancel', { observacion });
      if (res) return mapApiSaleToView(res);
    } catch (err) {
      const payload = {
        estado: false,
        observacion: observacion
      };
      const res = await apiClient.put('/api/Ventas/' + id, payload);
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

  async getMySalesEmployee(params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<SaleView>> {
    try {
      const res = await apiClient.get<any>('/api/Ventas/mis-ventas-empleado', params);
      
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
      console.error('Error fetching my sales employee:', err);
    }
    return { data: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
  },

  async create(data: any): Promise<SaleView | null> {
    try {
      console.log('🎯 salesService.create payload:', data);
      
      // Prepare detalles array in the exact format API expects: { servicioId, precio }
      const detalles = data.items
        .filter((i: any) => i.tipo === 'service')
        .map((item: any) => ({
          servicioId: item.id,
          precio: item.precioUnitario || item.price || 0
        }));
      
      const payload = {
        documentoCliente: data.clienteId,
        documentoEmpleado: data.empleadoId,
        metodopagoId: data.metodoPagoId, // Note: API expects "metodopagoId" (lowercase "d")
        observacion: data.observaciones || "", // Note: API expects "observacion" (singular)
        subtotal: data.subtotal,
        total: data.total,
        detalles: detalles
      };

      console.log('📤 Sending to API:', payload);
      const res = await apiClient.post('/api/Ventas', payload);
      console.log('✅ API create sale response:', res);
      if (!res) return null;
      
      // Handle both possible response formats: { success, data } or just the data
      const saleData = res?.success && res?.data ? res.data : res;
      return mapApiSaleToView(saleData);
    } catch (error) {
      console.error('Error in salesService.create:', error);
      throw error;
    }
  }
};
