import { useState, useEffect, useCallback, useMemo } from 'react';
import { serviceService } from '@/features/services/services/serviceService';
import { empleadoAgendaService } from '../services/agendaService';
import { Scissors } from 'lucide-react';

export function useServicios(pageSize: number = 6) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchServicios = useCallback(async (currentPage: number, searchTerm: string, abortSignal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await serviceService.getServices({
        page: currentPage,
        pageSize,
        search: searchTerm
      });

      // Handle both paginated and non-paginated responses
      let servicesArray = [];
      if (Array.isArray(response)) {
        servicesArray = response;
        setTotalPages(1);
        setTotalCount(response.length);
      } else if (response && response.data) {
        servicesArray = response.data;
        setTotalPages(response.totalPages || 1);
        setTotalCount(response.totalCount || response.data.length);
      }

      const activeServices = servicesArray
        .filter((s: any) => {
          const estado = s.estado !== undefined ? s.estado : s.Estado;
          return estado === true || 
                 estado === 1 || 
                 estado === '1' || 
                 String(estado).toLowerCase() === 'activo' ||
                 estado === undefined || 
                 estado === null;
        })
        .map((s: any) => ({
          id: s.servicioId || s.ServicioId || s.id || s.Id,
          name: s.nombre || s.Nombre || 'Sin nombre',
          description: s.descripcion || s.Descripcion || '',
          price: s.precio || s.Precio || 0,
          duration: s.duracion || s.Duracion || 0,
          category: s.categoriaNombre || s.CategoriaNombre || 'General',
          icon: Scissors,
          color: 'bg-pink-500'
        }));

      setData(activeServices);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching services:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      fetchServicios(page, search, controller.signal);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [page, search, fetchServicios]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  return {
    data,
    loading,
    page,
    setPage,
    search,
    setSearch,
    totalPages,
    totalCount
  };
}

export function useEmpleados(pageSize: number = 6) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchEmpleados = useCallback(async (currentPage: number, searchTerm: string, abortSignal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await empleadoAgendaService.getAll({
        page: currentPage,
        pageSize,
        search: searchTerm
      });

      let employeesArray = [];
      if (Array.isArray(response)) {
        employeesArray = response;
        setTotalPages(1);
        setTotalCount(response.length);
      } else if (response && response.data) {
        employeesArray = response.data;
        setTotalPages(response.totalPages || 1);
        setTotalCount(response.totalCount || response.data.length);
      }

      const activeProfessionals = employeesArray
        .filter((p: any) => {
          const est = p.estado !== undefined ? p.estado : p.Estado;
          return est === true || est === 1 || String(est).toLowerCase() === 'activo' || est === undefined || est === null;
        })
        .map((p: any, index: number) => ({
          id: p.documentoEmpleado || p.DocumentoEmpleado,
          name: p.nombre || p.Nombre,
          role: 'Estilista Profesional',
          rating: 4.8 + (index * 0.1) % 0.2,
          color: ['bg-rose-500', 'bg-violet-500', 'bg-emerald-500', 'bg-blue-500', 'bg-amber-500'][index % 5],
          avatar: (p.nombre || p.Nombre || 'P').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        }));

      setData(activeProfessionals);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching employees:', error);
        setError(error.message || 'Error fetching employees');
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      fetchEmpleados(page, search, controller.signal);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [page, search, fetchEmpleados]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  return {
    data,
    loading,
    page,
    setPage,
    search,
    setSearch,
    totalPages,
    totalCount,
    error
  };
}
