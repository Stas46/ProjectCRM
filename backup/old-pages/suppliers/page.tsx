'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { Plus, Search, Edit, Trash2, Building, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { getAllSuppliers, createSupplier, updateSupplier, deleteSupplier } from '@/services/suppliers';
import { Supplier, NewSupplier, ExpenseCategory, expenseCategoryMap } from '@/types/supplier';
import { getCategoryColor, getCategoryBgColor } from '@/utils/category-colors';

interface SupplierFormData {
  name: string;
  inn: string;
  kpp: string;
  category: ExpenseCategory;
  phone: string;
  email: string;
  legal_address: string;
  description: string;
}

const initialFormData: SupplierFormData = {
  name: '',
  inn: '',
  kpp: '',
  category: 'additional',
  phone: '',
  email: '',
  legal_address: '',
  description: ''
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await getAllSuppliers();
      setSuppliers(data);
    } catch (err: any) {
      console.error('Ошибка загрузки поставщиков:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = 
      (supplier.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (supplier.inn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (supplier.contact_person || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (supplier.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (supplier.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !categoryFilter || supplier.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const categoriesStats = suppliers.reduce((acc, supplier) => {
    const category = supplier.category;
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category]++;
    return acc;
  }, {} as Record<string, number>);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Название поставщика обязательно');
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingSupplier) {
        // Обновление существующего поставщика
        console.log('Frontend: Updating supplier:', editingSupplier.id, formData);
        const updated = await updateSupplier(editingSupplier.id, formData);
        console.log('Frontend: Update result:', updated);
        if (updated) {
          setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? updated : s));
        } else {
          alert('Не удалось обновить поставщика. Проверьте консоль для деталей.');
        }
      } else {
        // Создание нового поставщика
        const newSupplier = await createSupplier(formData as NewSupplier);
        if (newSupplier) {
          setSuppliers(prev => [newSupplier, ...prev]);
        }
      }
      
      // Сброс формы
      setFormData(initialFormData);
      setEditingSupplier(null);
      setShowForm(false);
    } catch (err: any) {
      console.error('Ошибка сохранения поставщика:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      alert('Ошибка сохранения поставщика');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      inn: supplier.inn || '',
      kpp: supplier.kpp || '',
      category: supplier.category,
      phone: supplier.phone || '',
      email: supplier.email || '',
      legal_address: supplier.legal_address || '',
      description: supplier.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`Удалить поставщика "${supplier.name}"?`)) {
      return;
    }

    try {
      const success = await deleteSupplier(supplier.id);
      if (success) {
        setSuppliers(prev => prev.filter(s => s.id !== supplier.id));
      }
    } catch (err: any) {
      console.error('Ошибка удаления поставщика:', err);
      alert('Ошибка удаления поставщика');
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingSupplier(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка поставщиков...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">
                <Building size={20} />
              </div>
              <div>
                <h3 className="text-red-800 font-medium">Ошибка загрузки</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Заголовок */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Поставщики</h1>
            <p className="text-gray-600">Управление базой поставщиков для категоризации затрат</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={20} />
            Добавить поставщика
          </button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <Building className="text-blue-600 mr-3" size={24} />
              <div>
                <p className="text-sm text-gray-600">Всего поставщиков</p>
                <p className="text-2xl font-bold text-gray-900">{suppliers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <FileText className="text-green-600 mr-3" size={24} />
              <div>
                <p className="text-sm text-gray-600">Категорий</p>
                <p className="text-2xl font-bold text-gray-900">{Object.keys(categoriesStats).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <Search className="text-purple-600 mr-3" size={24} />
              <div>
                <p className="text-sm text-gray-600">Найдено</p>
                <p className="text-2xl font-bold text-gray-900">{filteredSuppliers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Фильтры */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Поиск по названию, ИНН, контактам..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="sm:w-64">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Все категории</option>
                {Object.entries(expenseCategoryMap).map(([key, label]) => (
                  <option key={key} value={key}>
                    ● {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Статистика по категориям */}
        {Object.keys(categoriesStats).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Распределение по категориям</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(categoriesStats).map(([category, count]) => {
                const categoryName = expenseCategoryMap[category as ExpenseCategory] || category;
                const bgColor = getCategoryBgColor(categoryName);
                const textColor = getCategoryColor(categoryName);
                
                return (
                  <div 
                    key={category} 
                    className="rounded-lg p-3 border-l-4"
                    style={{ 
                      backgroundColor: bgColor,
                      borderLeftColor: textColor
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: textColor }}
                      />
                      <p className="font-medium text-gray-900">{categoryName}</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{count} поставщик(ов)</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Список поставщиков */}
        {filteredSuppliers.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <Building className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Поставщики не найдены</h3>
            <p className="text-gray-600">
              {suppliers.length === 0 
                ? 'Начните с добавления первого поставщика.'
                : 'Попробуйте изменить параметры поиска или фильтры.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map((supplier) => (
              <div key={supplier.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{supplier.name}</h3>
                    {supplier.inn && (
                      <p className="text-sm text-gray-500">ИНН: {supplier.inn}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Редактировать"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(supplier)}
                      className="text-red-600 hover:text-red-900"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <span 
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: getCategoryBgColor(expenseCategoryMap[supplier.category] || supplier.category),
                      color: getCategoryColor(expenseCategoryMap[supplier.category] || supplier.category)
                    }}
                  >
                    {expenseCategoryMap[supplier.category] || supplier.category}
                  </span>

                  {supplier.contact_person && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Building className="mr-2" size={16} />
                      {supplier.contact_person}
                    </div>
                  )}

                  {supplier.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="mr-2" size={16} />
                      {supplier.phone}
                    </div>
                  )}

                  {supplier.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="mr-2" size={16} />
                      {supplier.email}
                    </div>
                  )}

                  {supplier.legal_address && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="mr-2" size={16} />
                      {supplier.legal_address}
                    </div>
                  )}
                </div>

                {supplier.description && (
                  <p className="text-sm text-gray-600 border-t pt-3">
                    {supplier.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Модальное окно формы */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {editingSupplier ? 'Редактировать поставщика' : 'Добавить поставщика'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Название поставщика *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ООО «Компания»"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ИНН
                      </label>
                      <input
                        type="text"
                        name="inn"
                        value={formData.inn}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="1234567890"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Категория затрат *
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        {Object.entries(expenseCategoryMap).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Телефон
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="+7 (999) 123-45-67"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="info@company.ru"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Юридический адрес
                    </label>
                    <input
                      type="text"
                      name="legal_address"
                      value={formData.legal_address}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="г. Москва, ул. Примерная, д. 1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Описание
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Дополнительная информация о поставщике..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Сохранение...' : (editingSupplier ? 'Обновить' : 'Добавить')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}