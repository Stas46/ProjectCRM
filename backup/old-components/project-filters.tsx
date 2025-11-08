'use client';

import { Search, Filter, X } from 'lucide-react';
import { useState } from 'react';

interface ProjectFiltersProps {
  onFilterChange: (filters: {
    search: string;
    status: string[];
  }) => void;
}

const ProjectFilters = ({ onFilterChange }: ProjectFiltersProps) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const statuses = [
    { value: 'planning', label: 'Планирование' },
    { value: 'active', label: 'Активен' },
    { value: 'on_hold', label: 'На паузе' },
    { value: 'done', label: 'Завершен' },
    { value: 'cancelled', label: 'Отменен' },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    onFilterChange({ search: value, status: selectedStatuses });
  };

  const handleStatusChange = (status: string) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status];
    
    setSelectedStatuses(newStatuses);
    onFilterChange({ search, status: newStatuses });
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedStatuses([]);
    onFilterChange({ search: '', status: [] });
  };

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
            placeholder="Поиск проектов..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        
        {/* Filter button */}
        <button
          type="button"
          className={`inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg border
            ${isOpen || selectedStatuses.length > 0
              ? 'bg-blue-50 text-blue-700 border-blue-300'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }
          `}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Filter size={18} className="mr-2" />
          Фильтры
          {selectedStatuses.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-blue-500 rounded-full">
              {selectedStatuses.length}
            </span>
          )}
        </button>
        
        {/* Clear filters */}
        {(search || selectedStatuses.length > 0) && (
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
          <h4 className="text-sm font-medium text-gray-700 mb-3">Статус проекта</h4>
          <div className="flex flex-wrap gap-2">
            {statuses.map(status => (
              <button
                key={status.value}
                type="button"
                onClick={() => handleStatusChange(status.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border
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
      )}
    </div>
  );
};

export default ProjectFilters;