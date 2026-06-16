import { useState, useEffect, useCallback, useMemo } from 'react';
import { serviceService } from '@/features/services/services/serviceService';
import { empleadoAgendaService } from '../services/agendaService';
import { personService } from '@/features/persons/services/personService';
import { userService } from '@/features/users/services/userService';
import { Scissors, User } from 'lucide-react';

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

      let activeServices = servicesArray
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

      // Apply client-side search and pagination if it's a raw array response
      if (Array.isArray(response)) {
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          activeServices = activeServices.filter(s => 
            s.name.toLowerCase().includes(term) || 
            s.description.toLowerCase().includes(term) ||
            s.category.toLowerCase().includes(term)
          );
        }
        
        const totalFiltered = activeServices.length;
        setTotalPages(Math.ceil(totalFiltered / pageSize) || 1);
        setTotalCount(totalFiltered);
        
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        activeServices = activeServices.slice(start, end);
      }

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
      // Get employees from personService, which already applies role filtering!
      const response = await personService.getPersons('employee', {
        page: 1,
        pageSize: 1000,
        search: searchTerm
      });

      let employeesArray = [];
      if (Array.isArray(response)) {
        employeesArray = response;
      } else if (response && response.data) {
        employeesArray = response.data;
      }

      // Also get users and check for super admins
      const usersResponse = await userService.getAll({ page: 1, pageSize: 100 });
      let usersArray = [];
      if (Array.isArray(usersResponse)) {
        usersArray = usersResponse;
      } else if (usersResponse && usersResponse.data) {
        usersArray = usersResponse.data;
      }

      // Filter admin and super admin users
      const adminAndSuperAdminUsers = usersArray.filter((u: any) => {
        const roleName = (u.rolNombre || u.rol?.nombre || '').toLowerCase().trim();
        return (
          roleName.includes('super admin') || 
          roleName.includes('superadmin') || 
          roleName.includes('super_admin') || 
          roleName.includes('admin') || 
          roleName.includes('administrador') || 
          roleName.includes('administradora')
        );
      });

      // Map employees, super admins, and admins to professional format
      const allProfessionals = [
        ...employeesArray.map((p: any, index: number) => ({
          id: p.documentId,
          name: p.name,
          role: 'Estilista Profesional',
          _source: 'employee',
          _index: index
        })),
        ...(await Promise.all(adminAndSuperAdminUsers.map(async (u: any, index: number) => {
          // Try to get person data for name
          const person = await userService.getPersonForUser(u).catch(() => null);
          const name = person?.name || u.nombre || u.Nombre || u.email || 'Administrador';
          const roleName = (u.rolNombre || u.rol?.nombre || '').toLowerCase().trim();
          const isSuper = roleName.includes('super');
          return {
            id: person?.documentId || u.documentoEmpleado || u.documentoCliente || String(u.usuarioId || u.id),
            name,
            role: isSuper ? 'Super Administradora' : 'Administradora',
            _source: isSuper ? 'super-admin' : 'admin',
            _index: employeesArray.length + index
          };
        })))
      ];

      // Remove duplicates by id
      const uniqueProfessionals = Array.from(
        new Map(allProfessionals.map(p => [p.id, p])).values()
      );

      // Filter active
      let activeProfessionals = uniqueProfessionals.filter((p: any, index: number) => {
        if (p._source === 'super-admin') {
          // Super admin is always active
          return true;
        }
        const originalData = employeesArray.find((e: any) => e.documentId === p.id);
        if (!originalData) return true;
        const est = originalData.status !== undefined ? originalData.status : originalData.Estado;
        return est === 'active' || est === true || est === 1 || String(est).toLowerCase() === 'activo' || est === undefined || est === null;
      }).map((p: any, index: number) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        rating: 4.8 + ((p._index || index) * 0.1) % 0.2,
        color: ['bg-rose-500', 'bg-violet-500', 'bg-emerald-500', 'bg-blue-500', 'bg-amber-500'][(p._index || index) % 5],
        avatar: (p.name || 'P').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
      }));

      // Update total count and pages
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        activeProfessionals = activeProfessionals.filter((p: any) => 
          p.name.toLowerCase().includes(term) || 
          p.role.toLowerCase().includes(term)
        );
      }
      
      const totalFiltered = activeProfessionals.length;
      setTotalPages(Math.ceil(totalFiltered / pageSize) || 1);
      setTotalCount(totalFiltered);
      
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;
      activeProfessionals = activeProfessionals.slice(start, end);

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

export function useClientes(pageSize: number = 6) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchClientes = useCallback(async (currentPage: number, searchTerm: string, abortSignal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await personService.getPersons('client', {
        page: currentPage,
        pageSize,
        search: searchTerm
      });

      let clientsArray = [];
      if (Array.isArray(response)) {
        clientsArray = response;
        setTotalPages(1);
        setTotalCount(response.length);
      } else if (response && response.data) {
        clientsArray = response.data;
        setTotalPages(response.totalPages || 1);
        setTotalCount(response.totalCount || response.data.length);
      }

      let activeClients = clientsArray
        .filter((c: any) => {
          const est = c.status !== undefined ? c.status : c.Estado;
          return est === 'active' || est === true || est === 1 || String(est).toLowerCase() === 'activo' || est === undefined || est === null;
        })
        .map((c: any, index: number) => ({
          id: c.documentId,
          name: c.name,
          phone: c.phone,
          role: 'Cliente',
          color: ['bg-rose-500', 'bg-violet-500', 'bg-emerald-500', 'bg-blue-500', 'bg-amber-500'][index % 5],
          avatar: (c.name || 'C').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        }));

      // Apply client-side search and pagination if it's a raw array response
      if (Array.isArray(response)) {
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          activeClients = activeClients.filter((c: any) => 
            c.name.toLowerCase().includes(term) || 
            c.phone.toLowerCase().includes(term)
          );
        }
        
        const totalFiltered = activeClients.length;
        setTotalPages(Math.ceil(totalFiltered / pageSize) || 1);
        setTotalCount(totalFiltered);
        
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        activeClients = activeClients.slice(start, end);
      }

      setData(activeClients);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching clients:', error);
        setError(error.message || 'Error fetching clients');
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      fetchClientes(page, search, controller.signal);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [page, search, fetchClientes]);

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
