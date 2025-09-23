'use client';

import { Search, Filter, X, Calendar } from 'lucide-react';
import { useState } from 'react';

interface InvoiceFiltersProps {
  onFilterChange: (filters: {
    search: string;
    status: string[];
    category: string[];
    dateFrom?: string;
    dateTo?: string;
  }) => void;
}

const InvoiceFilters = ({ onFilterChange }: InvoiceFiltersProps) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);

  const statuses = [
    { value: 'draft', label: 'Черновик' },
    { value: 'to_pay', label: 'К оплате' },
    { value: 'paid', label: 'Оплачен' },
    { value: 'rejected', label: 'Отклонен' },
  ];

  // Обычно это бы загружалось из API
  const categories = [
    { value: 'materials', label: 'Материалы' },
    { value: 'profile', label: 'ПВХ/Алюминий' },
    { value: 'hardware', label: 'Фурнитура' },
    { value: 'logistics', label: 'Логистика' },
    { value: 'installation', label: 'Монтаж' },
    { value: 'other', label: 'Прочее' },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    onFilterChange({ 
      search: value, 
      status: selectedStatuses,
      category: selectedCategories,
      dateFrom,
      dateTo
    });
  };

  const handleStatusChange = (status: string) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status];
    
    setSelectedStatuses(newStatuses);
    onFilterChange({ 
      search, 
      status: newStatuses,
      category: selectedCategories,
      dateFrom,
      dateTo
    });
  };

  const handleCategoryChange = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    
    setSelectedCategories(newCategories);
    onFilterChange({ 
      search, 
      status: selectedStatuses,
      category: newCategories,
      dateFrom,
      dateTo
    });
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateFrom(value);
    onFilterChange({ 
      search, 
      status: selectedStatuses,
      category: selectedCategories,
      dateFrom: value,
      dateTo
    });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateTo(value);
    onFilterChange({ 
      search, 
      status: selectedStatuses,
      category: selectedCategories,
      dateFrom,
      dateTo: value
    });
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedStatuses([]);
    setSelectedCategories([]);
    setDateFrom('');
    setDateTo('');
    onFilterChange({ 
      search: '', 
      status: [],
      category: [],
      dateFrom: undefined,
      dateTo: undefined
    });
  };

  const hasActiveFilters = search || 
    selectedStatuses.length > 0 || 
    selectedCategories.length > 0 ||
    dateFrom ||
    dateTo;

  const activeFiltersCount = 
    (selectedStatuses.length > 0 ? 1 : 0) + 
    (selectedCategories.length > 0 ? 1 : 0) +
    ((dateFrom || dateTo) ? 1 : 0);

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="search"
            className="block w-full py-2.5 pl-10 pr-3 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Поиск счетов..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        
        {/* Filter button */}
        <button
          type="button"
          className={`inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg border
            ${isOpen || activeFiltersCount > 0
              ? 'bg-blue-50 text-blue-700 border-blue-300'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }
          `}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Filter size={18} className="mr-2" />
          Фильтры
          {activeFiltersCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-blue-500 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>
        
        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            type="button"
            className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            onClick={handleClearFilters}
          >
            <X size={18} className="mr-2" />
            Очистить
          </button>
        )}
      </div>
      
      {/* Filter dropdown */}
      {isOpen && (
        <div className="mt-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Статусы */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Статус</h4>
              <div className="flex flex-col gap-2">
                {statuses.map(status => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => handleStatusChange(status.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border text-left
                      ${selectedStatuses.includes(status.value)
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
                      }
                    `}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Категории */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Категория</h4>
              <div className="flex flex-col gap-2">
                {categories.map(category => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => handleCategoryChange(category.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border text-left
                      ${selectedCategories.includes(category.value)
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
                      }
                    `}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Период */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Период</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">С даты</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Calendar size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="date"
                      className="block w-full py-2 pl-10 pr-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={dateFrom}
                      onChange={handleDateFromChange}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">По дату</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Calendar size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="date"
                      className="block w-full py-2 pl-10 pr-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={dateTo}
                      onChange={handleDateToChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceFilters;