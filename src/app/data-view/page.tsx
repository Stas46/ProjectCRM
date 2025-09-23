'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type DataType = 'projects' | 'employees' | 'crews' | 'tasks' | 'shifts' | 'invoices';

export default function DataViewPage() {
  const [dataType, setDataType] = useState<DataType>('projects');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase.from(dataType).select('*');
      
      // Добавляем ограничение на количество строк для безопасности
      query = query.limit(50);

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      setData(data || []);
    } catch (err: any) {
      setError(err.message);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dataType]);

  const dataTypes: DataType[] = ['projects', 'employees', 'crews', 'tasks', 'shifts', 'invoices'];

  const renderDataTable = () => {
    if (data.length === 0) {
      return <p className="text-gray-500 italic">Нет данных для отображения</p>;
    }

    const columns = Object.keys(data[0]);

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              {columns.map((column) => (
                <th key={column} className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {columns.map((column) => (
                  <td key={`${rowIndex}-${column}`} className="px-4 py-2 text-sm text-gray-700 border-b">
                    {renderCellValue(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCellValue = (value: any) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">null</span>;
    }

    if (typeof value === 'object') {
      return <span className="text-blue-600">{JSON.stringify(value)}</span>;
    }

    if (typeof value === 'boolean') {
      return value ? <span className="text-green-600">true</span> : <span className="text-red-600">false</span>;
    }

    // Для дат попробуем отформатировать их
    if (typeof value === 'string' && (value.includes('T00:00:00') || value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/))) {
      try {
        const date = new Date(value);
        return date.toLocaleString('ru-RU');
      } catch {
        return value;
      }
    }

    return value;
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Просмотр данных из базы</h1>

      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {dataTypes.map((type) => (
            <button
              key={type}
              onClick={() => setDataType(type)}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                dataType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold capitalize">{dataType}</h2>
          <button
            onClick={fetchData}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-md text-sm font-medium"
          >
            Обновить
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md border border-red-300">
          <h3 className="text-red-700 font-medium">Ошибка при загрузке данных:</h3>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      ) : (
        renderDataTable()
      )}
    </div>
  );
}