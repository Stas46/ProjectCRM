'use client';

import { Search, Filter, X } from 'lucide-react';
import { useState } from 'react';

interface TaskFiltersProps {
  onFilterChange: (filters: {
    search: string;
    status: string[];
    priority: number[];
    assignee: string[];
  }) => void;
}

const TaskFilters = ({ onFilterChange }: TaskFiltersProps) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<number[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  const statuses = [
    { value: 'todo', label: 'К выполнению' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'blocked', label: 'Блокировано' },
    { value: 'review', label: 'На проверке' },
    { value: 'done', label: 'Выполнено' },
  ];

  const priorities = [
    { value: 1, label: 'Высокий' },
    { value: 2, label: 'Средний' },
    { value: 3, label: 'Низкий' },
  ];

  // Обычно это бы загружалось из API
  const assignees = [
    { value: 'user1', label: 'Иванов И.И.' },
    { value: 'user2', label: 'Петров П.П.' },
    { value: 'user3', label: 'Сидоров С.С.' },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    onFilterChange({ 
      search: value, 
      status: selectedStatuses,
      priority: selectedPriorities,
      assignee: selectedAssignees
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
      priority: selectedPriorities,
      assignee: selectedAssignees
    });
  };

  const handlePriorityChange = (priority: number) => {
    const newPriorities = selectedPriorities.includes(priority)
      ? selectedPriorities.filter(p => p !== priority)
      : [...selectedPriorities, priority];
    
    setSelectedPriorities(newPriorities);
    onFilterChange({ 
      search, 
      status: selectedStatuses,
      priority: newPriorities,
      assignee: selectedAssignees
    });
  };

  const handleAssigneeChange = (assignee: string) => {
    const newAssignees = selectedAssignees.includes(assignee)
      ? selectedAssignees.filter(a => a !== assignee)
      : [...selectedAssignees, assignee];
    
    setSelectedAssignees(newAssignees);
    onFilterChange({ 
      search, 
      status: selectedStatuses,
      priority: selectedPriorities,
      assignee: newAssignees
    });
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSelectedAssignees([]);
    onFilterChange({ 
      search: '', 
      status: [],
      priority: [],
      assignee: []
    });
  };

  const hasActiveFilters = search || 
    selectedStatuses.length > 0 || 
    selectedPriorities.length > 0 || 
    selectedAssignees.length > 0;

  const activeFiltersCount = 
    (selectedStatuses.length > 0 ? 1 : 0) + 
    (selectedPriorities.length > 0 ? 1 : 0) + 
    (selectedAssignees.length > 0 ? 1 : 0);

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
            placeholder="Поиск задач..."
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

            {/* Приоритеты */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Приоритет</h4>
              <div className="flex flex-col gap-2">
                {priorities.map(priority => (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() => handlePriorityChange(priority.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border text-left
                      ${selectedPriorities.includes(priority.value)
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
                      }
                    `}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Исполнители */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Исполнитель</h4>
              <div className="flex flex-col gap-2">
                {assignees.map(assignee => (
                  <button
                    key={assignee.value}
                    type="button"
                    onClick={() => handleAssigneeChange(assignee.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border text-left
                      ${selectedAssignees.includes(assignee.value)
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
                      }
                    `}
                  >
                    {assignee.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskFilters;