import React, { useState, useEffect } from 'react';
import {
    Users, Plus, Search, Filter, Eye, Edit, Calendar,
    Phone, Mail, MapPin, Heart, Scissors, ShoppingBag,
    X, Save, AlertCircle, Star, TrendingUp, Clock, Trash2, CheckCircle,
    Briefcase, Shield, User, UserCheck, IdCard, Loader2, RefreshCw, Info
} from 'lucide-react';
import { SimplePagination } from '@/shared/components/ui/simple-pagination';
import { cn } from '@/shared/components/ui/utils';
import { personService, type Person, type CreatePersonData } from '../services/personService';
import { authService } from '@/features/auth/services/authService';
import { userService } from '@/features/users/services/userService';
import { agendaService } from '@/features/appointments/services/agendaService';
import { salesService } from '@/features/sales/services/salesService';
import { roleService, type RolListDto } from '@/features/roles/services/roleService';
import { useLoading } from '@/shared/contexts/LoadingContext';
import { SectionLoader } from '@/shared/components/GlobalLoader';

interface PersonManagementProps {
    hasPermission: (permission: string) => boolean;
    initialType?: 'client' | 'employee';
}

export function PersonManagement({ hasPermission, initialType = 'client' }: PersonManagementProps) {
    const personType = initialType;
    const [persons, setPersons] = useState<Person[]>([]);
    const [roles, setRoles] = useState<RolListDto[]>([]);
    const [loading, setLoading] = useState(false);
    const { showSectionLoading, hideSectionLoading } = useLoading();

    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
    const [showPersonModal, setShowPersonModal] = useState(false);
    const [showNewPersonModal, setShowNewPersonModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
    const [editingPerson, setEditingPerson] = useState<Person | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

    const showAlert = (type: 'success' | 'error' | 'info', message: string) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 4000);
    };

    // Fetch data when personType, page or search changes
    useEffect(() => {
        fetchPersons();
    }, [personType, currentPage, searchTerm]);

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchPersons = async () => {
        try {
            showSectionLoading(`Obteniendo ${personType === 'client' ? 'clientes' : 'empleados'}...`);
            setLoading(true);
            const response = await personService.getPersons(personType, {
                page: currentPage,
                pageSize: itemsPerPage,
                search: searchTerm
            });
            setPersons(response.data || []);
            setTotalCount(response.totalCount || 0);
            setTotalPages(response.totalPages || 0);
        } catch (error) {
            console.error('Error fetching persons:', error);
            // Fallback to empty list or handle error UI
            setPersons([]);
        } finally {
            setLoading(false);
            hideSectionLoading();
        }
    };

    const fetchRoles = async () => {
        try {
            const data = await roleService.getRoles();
            setRoles(data.data || data || []);
        } catch (error) {
            console.error('Error fetching roles:', error);
        }
    };

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Ya no filtramos en el cliente, usamos lo que viene de la API
    const paginatedPersons = persons;

    const goToPage = (page: number) => {
        setCurrentPage(page);
    };

    const getDocumentTypeLabel = (person: Person) => {
        return person.documentType || 'CC';
    };

    const handleViewPerson = async (person: Person) => {
        try {
            showSectionLoading("Cargando perfil...");
            setLoading(true);
            const fullPerson = await personService.getPersonByDocument(person.documentId, person.type);
            
            // Si el correo no está presente pero hay un usuarioId, intentamos obtenerlo del servicio de usuarios
            if (!fullPerson.email && fullPerson.usuarioId) {
                try {
                    const userDetail = await userService.getById(fullPerson.usuarioId);
                    if (userDetail && userDetail.email) {
                        fullPerson.email = userDetail.email;
                    }
                } catch (userError) {
                    console.error('Error fetching associated user email:', userError);
                }
            }
            
            setSelectedPerson(fullPerson);
            setShowPersonModal(true);
        } catch (error) {
            console.error('Error fetching person detail:', error);
            // Fallback
            setSelectedPerson(person);
            setShowPersonModal(true);
        } finally {
            setLoading(false);
            hideSectionLoading();
        }
    };

    const handleEditPerson = async (person: Person) => {
        try {
            showSectionLoading("Cargando datos...");
            setLoading(true);
            const fullPerson = await personService.getPersonByDocument(person.documentId, person.type);

            // Enrich with email from user service if needed
            if (!fullPerson.email && fullPerson.usuarioId) {
                try {
                    const userDetail = await userService.getById(fullPerson.usuarioId);
                    if (userDetail?.email) {
                        fullPerson.email = userDetail.email;
                    }
                } catch (userError) {
                    console.error('Error fetching associated user email:', userError);
                }
            }

            setEditingPerson(fullPerson);
            setShowNewPersonModal(true);
        } catch (error) {
            console.error('Error fetching person detail for edit:', error);
            // Fallback to list-row data if the fetch fails
            setEditingPerson(person);
            setShowNewPersonModal(true);
        } finally {
            setLoading(false);
            hideSectionLoading();
        }
    };

    const handleDeletePerson = (person: Person) => {
        setPersonToDelete(person);
        setShowDeleteModal(true);
    };

    const confirmDeletePerson = async () => {
        if (personToDelete) {
            try {
                showSectionLoading("Verificando dependencias...");
                setLoading(true);

                // 1. Check associations with appointments and sales
                const [appointmentsRes, salesRes] = await Promise.all([
                    agendaService.getAll(),
                    salesService.getAll()
                ]);

                const appointments = appointmentsRes?.data || [];
                const sales = salesRes?.data || [];

                const hasAppointments = appointments.some(apt =>
                    personType === 'client'
                        ? String(apt.documentoCliente) === String(personToDelete.documentId)
                        : String(apt.documentoEmpleado) === String(personToDelete.documentId)
                );

                const hasSales = sales.some(sale => {
                    const saleCustId = String(sale.customerId || '');
                    const saleEmpId = String(sale.employeeId || '');
                    const personId = String(personToDelete.usuarioId || '');
                    const personDocId = String(personToDelete.documentId || '');

                    if (personType === 'client') {
                        return (personId && saleCustId === personId) || (personDocId && saleCustId === personDocId);
                    } else {
                        return (personId && saleEmpId === personId) || (personDocId && saleEmpId === personDocId);
                    }
                });

                if (hasAppointments || hasSales) {
                    alert("Esta persona ya esta asociada a una Cita o Venta");
                    setLoading(false);
                    hideSectionLoading();
                    setShowDeleteModal(false);
                    setPersonToDelete(null);
                    return;
                }

                showSectionLoading("Eliminando registro...");
                // 2. Identify and delete the user
                let targetUserId = personToDelete.usuarioId;

                // Fallback: If no direct usuarioId, try to find the user by email or name
                if (!targetUserId) {
                    try {
                        const usersRes = await userService.getAll({ pageSize: 1000 });
                        const allUsers = usersRes?.data || [];
                        const foundUser = allUsers.find(u =>
                            (personToDelete.email && u.email?.toLowerCase() === personToDelete.email.toLowerCase()) ||
                            (personToDelete.name && u.nombreUsuario?.toLowerCase() === personToDelete.name.toLowerCase()) ||
                            (u.email?.toLowerCase().includes((personToDelete.email || '').toLowerCase()))
                        );
                        if (foundUser) {
                            targetUserId = foundUser.usuarioId;
                        }
                    } catch (findError) {
                        console.error('Error in user fallback search:', findError);
                    }
                }

                // If we found a user, deleting the user should handle everything (cascade in DB)
                // If not, we still try to delete the person record via personService
                if (targetUserId) {
                    console.log('Deleting associated user:', targetUserId);
                    await userService.delete(targetUserId);
                } else {
                    console.log('No associated user found, deleting person record only');
                    await personService.deletePerson(personToDelete.documentId, personType);
                }

                setPersons(persons.filter(p => p.documentId !== personToDelete.documentId));
                showAlert('success', `${personType === 'client' ? 'Cliente' : 'Empleado'} eliminado exitosamente`);
            } catch (error: any) {
                console.error('Error deleting person:', error);
                // Handle 404 gracefully if it was already deleted by cascade
                if (error?.response?.status === 404) {
                    setPersons(persons.filter(p => p.documentId !== personToDelete.documentId));
                    showAlert('success', `${personType === 'client' ? 'Cliente' : 'Empleado'} eliminado exitosamente`);
                } else {
                    showAlert('error', 'Error al eliminar. Verifique que no existan dependencias activas.');
                }
            } finally {
                setLoading(false);
                hideSectionLoading();
                setShowDeleteModal(false);
                setPersonToDelete(null);
            }
        }
    };

    const handleSavePerson = async (personData: CreatePersonData & { email?: string, roleId?: number }) => {
        try {
            showSectionLoading("Guardando información...");
            const { email, roleId, ...personOnlyData } = personData;

            // When editing, personOnlyData.documentId holds the USER documento (not the person PK).
            // The person PK (documentoEmpleado/documentoCliente) stays as editingPerson.documentId.
            const isEditing = !!editingPerson;

            // Validar documento duplicado solo en creación
            if (!isEditing) {
                const docId = personOnlyData.documentId.trim();
                let docExists = false;

                try {
                    const client = await personService.getPersonByDocument(docId, 'client');
                    if (client) docExists = true;
                } catch (e) { /* No encontrado */ }

                if (!docExists) {
                    try {
                        const employee = await personService.getPersonByDocument(docId, 'employee');
                        if (employee) docExists = true;
                    } catch (e) { /* No encontrado */ }
                }

                if (docExists) {
                    showAlert('error', 'Error: El número de documento ya está registrado para otro usuario.');
                    return;
                }
            }

            if (!editingPerson && email) {
                const { emailExists } = await authService.checkDuplicates(email);
                if (emailExists) {
                    showAlert('error', 'Error: El correo electrónico ya está registrado.');
                    return;
                }
                const selectedRoleId = roleId || (personType === 'client' ? 2 : 3);
                const tempResp = await authService.createTempUser({
                    rolId: selectedRoleId,
                    email
                });
                let usuarioId = (tempResp && (tempResp.usuarioId || tempResp.id)) || null;
                if (!usuarioId) {
                    usuarioId = await authService.getUserIdByEmail(email);
                }
                if (!usuarioId) {
                    showAlert('error', 'No se pudo obtener el ID del usuario creado. Intenta nuevamente.');
                    return;
                }
                (personOnlyData as any).usuarioId = usuarioId;
            }

            if (editingPerson) {
                // Edit: personOnlyData.documentId is the USER documento (from the form).
                // The person record must keep the original PK (editingPerson.documentId).
                const userDocumento = personOnlyData.documentId;

                const updatedRaw = await personService.updatePerson(editingPerson.documentId, {
                    ...editingPerson,
                    ...personOnlyData,
                    documentId: editingPerson.documentId, // preserve person PK
                    type: personType
                } as Person);

                // Also update the associated user's documento field
                if (editingPerson.usuarioId && userDocumento) {
                    try {
                        const userDetail = await userService.getById(editingPerson.usuarioId);
                        if (userDetail) {
                            await userService.update(editingPerson.usuarioId, {
                                rolId: userDetail.rol?.rolId,
                                email: userDetail.email,
                                estado: userDetail.estado,
                                documento: userDocumento,
                            });
                        }
                    } catch (userUpdateError) {
                        console.error('Error updating user documento:', userUpdateError);
                    }
                }

                setPersons(persons.map(p =>
                    p.documentId === editingPerson.documentId ? { ...updatedRaw, status: editingPerson.status } : p
                ));
                showAlert('success', `${personType === 'client' ? 'Cliente' : 'Empleado'} actualizado exitosamente`);
            } else {
                // Create
                personOnlyData.type = personType;
                const newPerson = await personService.createPerson(personOnlyData);
                setPersons([...persons, newPerson]);
                showAlert('success', `${personType === 'client' ? 'Cliente' : 'Empleado'} registrado exitosamente`);
            }
        } catch (error) {
            console.error('Error saving person:', error);
            showAlert('error', 'Error al guardar datos. Por favor revise la consola.');
        } finally {
            hideSectionLoading();
            setShowNewPersonModal(false);
            setEditingPerson(null);
            fetchPersons(); // Refresh just in case mapping missed something
        }
    };

    const handleTogglePersonStatus = async (personId: string, currentStatus: string) => {
        const personToUpdate = persons.find(p => p.documentId === personId);
        if (!personToUpdate) return;

        try {
            showSectionLoading("Actualizando estado...");
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            await personService.updatePerson(personToUpdate.documentId, {
                ...personToUpdate,
                status: newStatus
            });

            // Update associated user status if exists
            if (personToUpdate.usuarioId) {
                try {
                    const userDetail = await userService.getById(personToUpdate.usuarioId);
                    if (userDetail) {
                        const newEstado = newStatus === 'active';
                        await userService.update(personToUpdate.usuarioId, {
                            rolId: userDetail.rol?.rolId,
                            email: userDetail.email,
                            estado: newEstado
                        });
                    }
                } catch (userUpdateError) {
                    console.error('Error updating associated user status:', userUpdateError);
                    // Don't fail the whole operation, just log it
                }
            }

            setPersons(persons.map(p =>
                p.documentId === personId ? { ...p, status: newStatus } : p
            ));
            showAlert('success', `${personType === 'client' ? 'Cliente' : 'Empleado'} ${newStatus === 'active' ? 'activado' : 'inactivado'} correctamente`);
        } catch (error) {
            console.error('Error toggling status:', error);
            showAlert('error', 'Error al cambiar el estado');
        } finally {
            hideSectionLoading();
        }
    };


    return (
        <div className="p-8">
            {/* Notification Banner */}
            {alert && (
                <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-right-5 duration-300">
                    <div className={cn(
                        "text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 min-w-[320px] bg-gradient-to-r",
                        alert.type === 'success' ? "from-pink-400 to-purple-500" :
                            alert.type === 'error' ? "from-red-500 to-pink-600" :
                                "from-blue-400 to-indigo-500"
                    )}>
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                {alert.type === 'success' && <CheckCircle className="w-6 h-6 text-white" />}
                                {alert.type === 'error' && <AlertCircle className="w-6 h-6 text-white" />}
                                {alert.type === 'info' && <Info className="w-6 h-6 text-white" />}
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold">{alert.message}</p>
                        </div>
                        <button
                            onClick={() => setAlert(null)}
                            className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">{personType === 'client' ? 'Gestión de Clientes' : 'Gestión de Empleados'}</h2>
                    <p className="text-gray-600">
                        {personType === 'client' ? 'Administra la información de clientes' : 'Administra la información de empleados'}
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
                            placeholder="Buscar por nombre, documento o teléfono..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent"
                        />
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        <button
                            onClick={fetchPersons}
                            disabled={loading}
                            className="p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center disabled:opacity-50"
                            title="Recargar datos"
                        >
                            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                        </button>

                        {hasPermission('manage_clients') && (
                            <button
                                onClick={() => {
                                    setEditingPerson(null);
                                    setShowNewPersonModal(true);
                                }}
                                className="w-full md:w-auto bg-gradient-brand text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Registrar {personType === 'client' ? 'Cliente' : 'Empleado'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Persons Table */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <div className={`bg-gradient-to-r ${personType === 'client' ? 'from-pink-50 to-purple-50' : 'from-purple-50 to-blue-50'} p-6 border-b border-gray-100`}>
                    <h3 className="text-xl font-bold text-gray-800">
                        Lista de {personType === 'client' ? 'Clientes' : 'Empleados'}
                    </h3>
                    <p className="text-gray-600">
                        {totalCount} registro{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left font-semibold text-gray-800">Tipo Doc.</th>
                                <th className="px-6 py-4 text-left font-semibold text-gray-800">Documento</th>
                                <th className="px-6 py-4 text-left font-semibold text-gray-800">Nombre</th>
                                <th className="px-6 py-4 text-left font-semibold text-gray-800">Teléfono</th>
                                <th className="px-6 py-4 text-left font-semibold text-gray-800">Estado</th>
                                <th className="px-6 py-4 text-left font-semibold text-gray-800">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedPersons.map((person) => (
                                <tr key={person.documentId} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium">
                                            {getDocumentTypeLabel(person)}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-800">{person.userDocument || person.documentId || 'N/A'}</div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-800 line-clamp-1">{person.name}</div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2 text-sm">
                                            <Phone className="w-4 h-4 text-gray-400" />
                                            <span className="text-gray-700">{person.phone || 'N/A'}</span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            {hasPermission('manage_clients') && (
                                                person.documentId === '8729451090' ? (
                                                    <div className="flex items-center space-x-2 cursor-not-allowed opacity-60" title="Este empleado no se puede desactivar">
                                                        <div className="w-11 h-6 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full relative">
                                                            <div className="absolute top-[2px] right-[2px] bg-white border-white border rounded-full h-5 w-5 shadow-sm"></div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={person.status === 'active'}
                                                            onChange={() => handleTogglePersonStatus(person.documentId, person.status)}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-periwinkle/300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-400 peer-checked:to-purple-500"></div>
                                                    
                                                    </label>
                                                )
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleViewPerson(person)}
                                                className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                                title="Ver perfil"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>

                                            {hasPermission('manage_clients') && (
                                                <>
                                                    <button
                                                        onClick={() => handleEditPerson(person)}
                                                        disabled={person.status === 'inactive'}
                                                        className={cn(
                                                            "p-2 rounded-lg transition-colors",
                                                            person.status === 'inactive'
                                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                                                                : "bg-green-100 text-green-700 hover:bg-green-200"
                                                        )}
                                                        title={person.status === 'inactive' ? "No se puede editar un registro inactivo" : "Editar registro"}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>

                                                    {person.documentId !== '8729451090' && (
                                                        <button
                                                            onClick={() => handleDeletePerson(person)}
                                                            disabled={person.status === 'inactive'}
                                                            className={cn(
                                                                "p-2 rounded-lg transition-colors",
                                                                person.status === 'inactive'
                                                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                                                                    : "bg-gray-100 text-brand-pink hover:bg-red-200"
                                                            )}
                                                            title={person.status === 'inactive' ? "No se puede eliminar un registro inactivo" : "Eliminar registro"}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {paginatedPersons.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <Users className="w-12 h-12 mb-4 text-gray-300" />
                                            <p className="text-lg font-medium">No se encontraron registros</p>
                                            <p className="text-sm mt-1">Intenta ajustando los filtros de búsqueda</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalCount > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                        <SimplePagination
                            totalPages={totalPages}
                            currentPage={currentPage}
                            onPageChange={goToPage}
                            totalRecords={totalCount}
                            recordsPerPage={itemsPerPage}
                        />
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && personToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Standardized Header */}
                        <div className="bg-gradient-to-r from-red-500 to-pink-600 p-5 text-white shrink-0 shadow-md">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                                        <AlertCircle className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold leading-tight">Eliminar {personType === 'client' ? 'Cliente' : 'Empleado'}</h3>
                                        <p className="text-red-100 text-xs font-medium">Esta acción no se puede deshacer</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all shadow-sm"
                                    disabled={loading}
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
                                    ¿Eliminar a {personToDelete.name}?
                                </h4>
                                
                                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                                    Estás a punto de eliminar este {personType === 'client' ? 'cliente' : 'empleado'} de forma permanente. Todos sus datos y acceso al sistema serán borrados.
                                </p>

                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Documento:</span>
                                        <span className="font-bold text-gray-700">{personToDelete.userDocument || personToDelete.documentId}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre:</span>
                                        <span className="font-bold text-gray-700">{personToDelete.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo:</span>
                                        <span className="font-bold text-gray-700">{personType === 'client' ? 'Cliente' : 'Empleado'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={loading}
                                    className="flex-1 px-6 py-3 rounded-xl font-black text-gray-400 hover:bg-gray-100 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDeletePerson}
                                    disabled={loading}
                                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    <span>{loading ? 'Eliminando...' : 'Eliminar'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Person Profile Modal */}
            {showPersonModal && selectedPerson && (
                <PersonProfileModal
                    person={selectedPerson}
                    onClose={() => setShowPersonModal(false)}
                    personType={personType}
                />
            )}

            {/* New/Edit Person Modal */}
            {showNewPersonModal && (
                <NewPersonModal
                    onClose={() => {
                        setShowNewPersonModal(false);
                        setEditingPerson(null);
                    }}
                    onSave={handleSavePerson}
                    editingPerson={editingPerson}
                    personType={personType}
                    roles={roles}
                />
            )}
        </div>
    );
}

// Person Profile Modal Component
function PersonProfileModal({ person, onClose, personType }: { person: Person, onClose: () => void, personType: string }) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header - Fixed at top */}
                <div className={`bg-gradient-to-r ${personType === 'client' ? 'from-pink-500 to-purple-600' : 'from-purple-500 to-blue-600'} p-5 text-white shrink-0 shadow-md z-20`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <User className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold leading-tight">
                                    Detalles de {personType === 'client' ? 'Cliente' : 'Empleado'}
                                </h3>
                                <p className="text-pink-100 text-sm">
                                    {person.name}
                                </p>
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
                        {/* Avatar Section */}
                        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
                            <div className="w-24 h-24 bg-gradient-to-r from-pink-400 to-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-pink-50">
                                <span className="text-white font-bold text-3xl">
                                    {person.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <h4 className="text-2xl font-bold text-gray-800 mb-1">{person.name}</h4>
                            <p className="text-gray-500 text-sm mb-4">{person.documentType || 'CC'}: {person.userDocument || person.documentId || 'N/A'}</p>
                            <div className="flex justify-center">
                                
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Contact Information Card */}
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                <div className="flex items-center space-x-2 text-brand-pink mb-5">
                                    <Phone className="w-5 h-5" />
                                    <h4 className="font-bold uppercase text-[10px] tracking-widest">Información de Contacto</h4>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Teléfono Principal</span>
                                        <div className="flex items-center space-x-3">
                                            <Phone className="w-4 h-4 text-brand-pink" />
                                            <span className="font-bold text-gray-700">{person.phone || 'No registrado'}</span>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Dirección de Residencia</span>
                                        <div className="flex items-center space-x-3">
                                            <MapPin className="w-4 h-4 text-purple-400" />
                                            <span className="font-bold text-gray-700">{person.address || 'No registrada'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Details Card */}
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                <div className="flex items-center space-x-2 text-brand-violet mb-5">
                                    <Shield className="w-5 h-5" />
                                    <h4 className="font-bold uppercase text-[10px] tracking-widest">Detalles del Registro</h4>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Correo Electrónico</span>
                                        <div className="flex items-center space-x-3">
                                            <Mail className="w-4 h-4 text-purple-400" />
                                            <span className="font-bold text-gray-700 break-all">{person.email || 'Sin correo asignado'}</span>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Tipo de Perfil</span>
                                        <div className="flex items-center space-x-3">
                                            <UserCheck className="w-4 h-4 text-blue-400" />
                                            <span className="font-bold text-gray-700">
                                                {personType === 'client' ? 'Cliente de Asthro' : 'Colaborador del Salón'}
                                            </span>
                                        </div>
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

// New/Edit Person Modal Component
function NewPersonModal({ onClose, onSave, editingPerson, personType, roles }: { onClose: () => void, onSave: (data: any) => void, editingPerson: Person | null, personType: string, roles: RolListDto[] }) {
    const [formData, setFormData] = useState({
        documentType: editingPerson?.documentType || 'CC',
        documentId: editingPerson ? (editingPerson.userDocument || editingPerson.documentId || '') : '',
        name: editingPerson?.name || '',
        phone: editingPerson?.phone || '',
        address: editingPerson?.address || '',
        email: '',
        type: personType as 'client' | 'employee',
        roleId: (personType === 'employee' ? (roles.find(r => r.nombre.toLowerCase() === 'administrador')?.rolId || roles.find(r => r.nombre.toLowerCase() === 'asistente')?.rolId || 3) : 2),
        authData: undefined
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    const filteredRoles = roles.filter(r =>
        r.nombre.toLowerCase() !== 'cliente' &&
        r.nombre.toLowerCase() !== 'super admin' &&
        r.nombre.toLowerCase() !== 'super administrador'
    );

    // Función de validación por campo, similar a AuthModal
    const validateField = (name: string, value: string, docType?: string): string => {
        switch (name) {
            case 'name':
                if (!value.trim()) return 'El nombre es obligatorio';
                if (value.trim() && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(value))
                    return 'El nombre solo debe contener letras';
                return '';
            case 'email':
                if (!editingPerson && !value.trim()) return 'El correo electrónico es obligatorio';
                if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) 
                    return 'El formato del correo no es válido';
                return '';
            case 'documentId': {
                if (!value.trim()) return 'El número de documento es obligatorio';
                const effectiveDocType = docType || formData.documentType;
                if (value.trim()) {
                    const len = value.trim().length;
                    const docTypeLower = (effectiveDocType || '').toLowerCase();
                    if (docTypeLower === 'pasaporte') {
                        // Pasaporte permite letras y números
                        if (!/^[a-zA-Z0-9]+$/.test(value.trim()))
                            return 'El pasaporte debe contener solo letras y números';
                        if (len < 5 || len > 20) return 'El pasaporte debe tener entre 5 y 20 caracteres';
                    } else if (docTypeLower === 'nit') {
                        // NIT permite números y guion
                        if (!/^\d+(-\d)?$/.test(value.trim()))
                            return 'El NIT debe contener solo números y un guion opcional';
                        if (len < 9 || len > 11) return 'El NIT debe tener entre 9 y 11 caracteres';
                    } else {
                        // TI, CC, CE solo números
                        if (!/^\d+$/.test(value.trim()))
                            return 'El número de documento solo debe contener números';
                        if (len < 7 || len > 15) return 'El número de documento debe tener entre 7 y 15 dígitos';
                    }
                }
                return '';
            }
            case 'phone':
                if (!value.trim()) return 'El teléfono es obligatorio';
                if (value.trim() && !/^\d{10}$/.test(value))
                    return 'El teléfono debe tener exactamente 10 dígitos numéricos';
                return '';
            default:
                return '';
        }
    };

    // Validación completa del formulario
    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        const fieldsToValidate = ['name', 'documentId', 'phone'];
        if (!editingPerson) fieldsToValidate.push('email');

        for (const field of fieldsToValidate) {
            const err = validateField(field, formData[field as keyof typeof formData], formData.documentType);
            if (err) newErrors[field] = err;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            setIsSaving(true);
            try {
                await onSave(formData);
            } finally {
                setIsSaving(false);
            }
        }
    };

    // Handle Blur - valida cuando el usuario sale del campo
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const error = validateField(name, value, formData.documentType);
        if (error) {
            setErrors(prev => ({ ...prev, [name]: error }));
        }
    };

    // Handle Key Down - para campos numéricos solo permite números
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const { name } = e.currentTarget;
        
        // Permite teclas de control
        if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
            return;
        }
        
        // Permite Ctrl+A, Ctrl+C, etc.
        if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
            return;
        }
        
        const docTypeLower = (formData.documentType || '').toLowerCase();

        // Para teléfono y documento (excepto NIT y Pasaporte) solo números
        if (name === 'phone' || (name === 'documentId' && docTypeLower !== 'nit' && docTypeLower !== 'pasaporte')) {
            if (!/^[0-9]$/.test(e.key)) {
                e.preventDefault();
            }
        }
        
        // Para Pasaporte: permitir letras y números
        if (name === 'documentId' && docTypeLower === 'pasaporte') {
            if (!/^[a-zA-Z0-9]$/.test(e.key)) {
                e.preventDefault();
            }
        }
        
        // Para NIT: números y un solo guion
        if (name === 'documentId' && docTypeLower === 'nit') {
            const currentValue = e.currentTarget.value;
            if (!/^[0-9-]$/.test(e.key)) {
                e.preventDefault();
            }
            if (e.key === '-' && currentValue.includes('-')) {
                e.preventDefault(); // No permite más de un guion
            }
        }
    };

    // Handle Paste - sanitiza el texto pegado
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const { name } = e.currentTarget;
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        let sanitizedText = pastedText;
        
        const docTypeLower = (formData.documentType || '').toLowerCase();

        if (name === 'phone' || (name === 'documentId' && docTypeLower !== 'nit' && docTypeLower !== 'pasaporte')) {
            sanitizedText = pastedText.replace(/[^0-9]/g, '');
        } else if (name === 'documentId' && docTypeLower === 'pasaporte') {
            sanitizedText = pastedText.replace(/[^a-zA-Z0-9]/g, '');
        }
        
        if (name === 'documentId' && docTypeLower === 'nit') {
            sanitizedText = pastedText.replace(/[^0-9-]/g, '');
            // Solo permite un guion
            const firstDashIndex = sanitizedText.indexOf('-');
            if (firstDashIndex !== -1) {
                sanitizedText = sanitizedText.slice(0, firstDashIndex + 1) + sanitizedText.slice(firstDashIndex + 1).replace(/-/g, '');
            }
        }
        
        // Validación en tiempo real
        const error = validateField(name, sanitizedText, formData.documentType);
        setErrors(prev => ({ ...prev, [name]: error }));
        
        // Actualiza form data
        handleChange(name, sanitizedText);
    };

    const handleChange = (field: string, value: any) => {
        let processedValue = value;
        
        if (['name', 'address', 'email'].includes(field)) {
            processedValue = value.slice(0, 100);
        } else if (['phone'].includes(field)) {
            processedValue = value.slice(0, 10);
        } else if (['documentId'].includes(field)) {
            const docTypeLower = (formData.documentType || '').toLowerCase();
            if (docTypeLower === 'nit') {
                processedValue = value.slice(0, 11); // NIT hasta 11 caracteres
            } else if (docTypeLower === 'pasaporte') {
                processedValue = value.slice(0, 20); // Pasaporte hasta 20 caracteres
            } else {
                processedValue = value.slice(0, 15);
            }
        }
        
        setFormData(prev => ({ ...prev, [field]: processedValue }));
        
        // Validación en tiempo real mientras el usuario escribe
        if (['name', 'email', 'documentId', 'phone'].includes(field)) {
            const error = validateField(field, processedValue, formData.documentType);
            if (error) {
                setErrors(prev => ({ ...prev, [field]: error }));
            } else if (errors[field]) {
                setErrors(prev => ({ ...prev, [field]: '' }));
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header - Fixed at top */}
                <div className={`bg-gradient-to-r ${personType === 'client' ? 'from-pink-500 to-purple-600' : 'from-purple-500 to-blue-600'} p-5 text-white shrink-0 shadow-md z-20`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                {personType === 'client' ? <User className="w-6 h-6 text-white" /> : <Briefcase className="w-6 h-6 text-white" />}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold leading-tight">
                                    {editingPerson ? `Editar ${personType === 'client' ? 'Cliente' : 'Empleado'}` : `Registrar ${personType === 'client' ? 'Nuevo Cliente' : 'Nuevo Empleado'}`}
                                </h3>
                                <p className="text-pink-100 text-sm">
                                    {editingPerson ? `Actualizando datos de ${editingPerson.name}` : 'Complete la información para el registro'}
                                </p>
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
                <form onSubmit={handleSubmit} id="person-form" className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/30 no-scrollbar">
                    <style>{`
                        .no-scrollbar::-webkit-scrollbar { display: none; }
                        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                    `}</style>

                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Errors Notification */}
                        {Object.keys(errors).length > 0 && (
                            <div className="bg-gray-50 border border-red-200 text-brand-pink px-6 py-4 rounded-2xl flex items-center space-x-3 animate-in fade-in duration-300">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p className="font-semibold text-sm">Por favor corrija los errores en el formulario</p>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Identity Section */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-2">
                                    <Shield className="w-4 h-4 text-brand-pink" />
                                    <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Identificación</h4>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Tipo de Documento *</label>
                                            <div className="relative">
                                                <IdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                <select
                                                    value={formData.documentType}
                                                    onChange={(e) => {
                                                        const newDocType = e.target.value;
                                                        // Cuando cambia el tipo de documento, revalidamos
                                                        handleChange('documentType', newDocType);
                                                        const error = validateField('documentId', formData.documentId, newDocType);
                                                        if (error) {
                                                            setErrors(prev => ({ ...prev, documentId: error }));
                                                        } else if (errors.documentId) {
                                                            setErrors(prev => ({ ...prev, documentId: '' }));
                                                        }
                                                    }}
                                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none appearance-none"
                                                >
                                                    <option value="TI">Tarjeta Identidad (TI)</option>
                                                    <option value="CC">Cédula (CC)</option>
                                                    <option value="CE">Extranjería (CE)</option>
                                                    <option value="NIT">NIT</option>
                                                    <option value="Pasaporte">Pasaporte</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Número Documento *</label>
                                            <div className="relative">
                                                <IdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                <input
                                                    type="text"
                                                    name="documentId"
                                                    value={formData.documentId}
                                                    onChange={(e) => handleChange('documentId', e.target.value)}
                                                    onBlur={handleBlur}
                                                    onKeyDown={handleKeyDown}
                                                    onPaste={handlePaste}
                                                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none ${errors.documentId ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                                                        }`}
                                                    placeholder={formData.documentType === 'NIT' ? '901234567-1' : formData.documentType?.toLowerCase() === 'pasaporte' ? 'PAS123456' : '1234567890'}
                                                    maxLength={formData.documentType === 'NIT' ? 11 : formData.documentType?.toLowerCase() === 'pasaporte' ? 20 : 15}
                                                />
                                            </div>
                                            {errors.documentId && <p className="text-[9px] text-brand-pink mt-1">{errors.documentId}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Nombre Completo *</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={(e) => handleChange('name', e.target.value)}
                                                onBlur={handleBlur}
                                                className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none ${errors.name ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                                                    }`}
                                                placeholder="Nombres y Apellidos"
                                                maxLength={100}
                                            />
                                        </div>
                                        {errors.name && <p className="text-[9px] text-brand-pink mt-1">{errors.name}</p>}
                                    </div>

                                    {personType === 'employee' && !editingPerson && (
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Rol del Colaborador</label>
                                            <div className="relative">
                                                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                <select
                                                    value={formData.roleId}
                                                    onChange={(e) => handleChange('roleId', Number(e.target.value))}
                                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all outline-none appearance-none"
                                                >
                                                    {filteredRoles.map((role) => (
                                                        <option key={role.rolId} value={role.rolId}>
                                                            {role.nombre}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Contact Section */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-2">
                                    <Phone className="w-4 h-4 text-brand-violet" />
                                    <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Contacto y Ubicación</h4>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Teléfono Móvil *</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={(e) => handleChange('phone', e.target.value)}
                                                onBlur={handleBlur}
                                                onKeyDown={handleKeyDown}
                                                onPaste={handlePaste}
                                                className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none ${errors.phone ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                                                    }`}
                                                placeholder="3001234567"
                                                maxLength={10}
                                            />
                                        </div>
                                        {errors.phone && <p className="text-[9px] text-brand-pink mt-1">{errors.phone}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Dirección de Residencia</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                name="address"
                                                value={formData.address}
                                                onChange={(e) => handleChange('address', e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none"
                                                placeholder="Calle 10 #20-30"
                                                maxLength={100}
                                            />
                                        </div>
                                    </div>

                                    {!editingPerson && (
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Correo Electrónico {!editingPerson && '*'}</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={(e) => handleChange('email', e.target.value)}
                                                    onBlur={handleBlur}
                                                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none ${errors.email ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                                                        }`}
                                                    placeholder="correo@ejemplo.com"
                                                    maxLength={100}
                                                />
                                            </div>
                                            {errors.email && <p className="text-[9px] text-brand-pink mt-1">{errors.email}</p>}
                                        </div>
                                    )}
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
                        disabled={isSaving}
                    >
                        Cancelar
                    </button>
                    <button
                        form="person-form"
                        type="submit"
                        disabled={isSaving}
                        className={`px-8 py-2.5 rounded-xl font-black text-white active:scale-95 transition-all text-sm uppercase tracking-widest shadow-lg flex items-center space-x-2 ${personType === 'client'
                                ? 'bg-gradient-brand hover:shadow-pink-200'
                                : 'bg-gradient-to-r from-purple-500 to-blue-600 hover:shadow-purple-200'
                            } disabled:opacity-50`}
                    >
                        {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{editingPerson ? 'Actualizar' : 'Registrar'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
