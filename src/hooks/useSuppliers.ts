import { useState, useEffect } from 'react';

interface Supplier {
  id: string;
  name: string;
  inn?: string;
  category: string;
  description?: string;
}

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/suppliers');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки поставщиков');
      }
      
      setSuppliers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const getSupplierByName = (name: string) => {
    return suppliers.find(supplier => 
      supplier.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(supplier.name.toLowerCase())
    );
  };

  const getCategoryBySupplier = (supplierName: string): string => {
    const supplier = getSupplierByName(supplierName);
    return supplier?.category || 'Профили';
  };

  return {
    suppliers,
    loading,
    error,
    fetchSuppliers,
    getSupplierByName,
    getCategoryBySupplier
  };
};