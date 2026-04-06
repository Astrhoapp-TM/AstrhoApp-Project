import { Supply } from '../data/management';

export const isExpiringSoon = (expirationDate: string | undefined): boolean => {
  if (!expirationDate) return false;
  const today = new Date();
  const expDate = new Date(expirationDate);
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 30 && diffDays > 0;
};

export const isExpired = (expirationDate: string | undefined): boolean => {
  if (!expirationDate) return false;
  const today = new Date();
  const expDate = new Date(expirationDate);
  return expDate < today;
};

export const calculateSupplyStats = (supplies: Supply[]) => {
  const totalSupplies = supplies.length;
  const lowStockSupplies = supplies.filter(s => s.quantity <= s.minStock).length;
  const expiredSupplies = supplies.filter(s => isExpired(s.expirationDate)).length;
  const expiringSoonSupplies = supplies.filter(s => isExpiringSoon(s.expirationDate)).length;

  return {
    totalSupplies,
    lowStockSupplies,
    expiredSupplies,
    expiringSoonSupplies
  };
};

export const getUniqueLocations = (supplies: Supply[]): string[] => {
  return [...new Set(supplies.map(s => s.location))];
};

export const filterSupplies = (
  supplies: Supply[], 
  searchTerm: string, 
  filterType: string, 
  filterStatus: string, 
  filterLocation: string
): Supply[] => {
  return supplies.filter(supply => {
    const matchesSearch = supply.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supply.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supply.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || supply.type === filterType;
    const matchesStatus = filterStatus === 'all' || supply.status === filterStatus;
    const matchesLocation = filterLocation === 'all' || supply.location.toLowerCase().includes(filterLocation.toLowerCase());
    
    return matchesSearch && matchesType && matchesStatus && matchesLocation;
  });
};