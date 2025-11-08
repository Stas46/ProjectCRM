'use client';

import { useEffect, useState } from 'react';
import { getCategoryColor, getCategoryBgColor } from '@/utils/category-colors';

interface ExpenseData {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

interface ExpenseProgressBarProps {
  projectId: string;
}

export default function ExpenseProgressBar({ projectId }: ExpenseProgressBarProps) {
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExpenseData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/projects/${projectId}/invoices`);
        if (!response.ok) {
          throw new Error('Ошибка загрузки данных');
        }

        const result = await response.json();
        const invoices = result.invoices || [];
        
        console.log('💡 [ExpenseProgressBar] Полученные данные:', {
          result,
          invoices,
          invoicesLength: invoices.length
        });
        
        // Если нет данных, показываем демо-данные
        if (invoices.length === 0) {
          console.log('💡 [ExpenseProgressBar] Нет данных, показываем демо-данные');
          const demoData: ExpenseData[] = [
            { category: 'Профиль', amount: 150000, count: 3, percentage: 45.5 },
            { category: 'Комплектующие', amount: 80000, count: 2, percentage: 24.2 },
            { category: 'Доп. затраты', amount: 50000, count: 1, percentage: 15.2 },
            { category: 'Фурнитура', amount: 30000, count: 1, percentage: 9.1 },
            { category: 'Доставка', amount: 20000, count: 1, percentage: 6.0 }
          ];
          setExpenseData(demoData);
          setTotalAmount(330000);
          return;
        }
        
        // Группируем счета по категориям
        const categoryTotals: { [key: string]: { amount: number; count: number } } = {};
        let total = 0;

        invoices.forEach((invoice: any) => {
          console.log('💡 [ExpenseProgressBar] Обрабатываем счет:', {
            id: invoice.id,
            category: invoice.category,
            amount: invoice.amount,
            total_amount: invoice.total_amount
          });
          
          const category = invoice.category || 'Прочее';
          const amount = parseFloat(invoice.amount || invoice.total_amount) || 0;
          
          if (!categoryTotals[category]) {
            categoryTotals[category] = { amount: 0, count: 0 };
          }
          
          categoryTotals[category].amount += amount;
          categoryTotals[category].count += 1;
          total += amount;
        });

        // Конвертируем в массив для визуализации
        const data: ExpenseData[] = Object.entries(categoryTotals).map(([category, { amount, count }]) => {
          const color = getCategoryColor(category);
          console.log('🎨 [ExpenseProgressBar] Цвет для категории:', { category, color });
          
          return {
            category,
            amount,
            count,
            percentage: total > 0 ? (amount / total) * 100 : 0
          };
        });

        // Сортируем по убыванию суммы
        data.sort((a, b) => b.amount - a.amount);

        console.log('💡 [ExpenseProgressBar] Итоговые данные:', {
          data,
          total,
          dataLength: data.length
        });

        setExpenseData(data);
        setTotalAmount(total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      fetchExpenseData();
    }
  }, [projectId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="text-red-600 text-center">
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (expenseData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h3 className="text-base font-semibold text-gray-900 mb-2">
          Распределение затрат
        </h3>
        <div className="text-gray-500 text-center py-3">
          <p className="text-sm">Нет данных о затратах. Добавьте счета для просмотра статистики.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      {/* Заголовок и общая сумма в одной строке */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-semibold text-gray-900">
          Распределение затрат
        </h3>
        <span className="text-sm text-gray-600">
          Общая сумма: <span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
        </span>
      </div>

      {/* Единая полоса распределения */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
        <div className="h-full flex">
          {expenseData.map((category, index) => (
            <div
              key={category.category}
              className="h-full transition-all duration-300 relative group"
              style={{ 
                width: `${category.percentage}%`,
                backgroundColor: getCategoryColor(category.category)
              }}
              title={`${category.category}: ${formatCurrency(category.amount)} (${category.percentage.toFixed(1)}%)`}
            />
          ))}
        </div>
      </div>

      {/* Компактная легенда с суммами */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
        {expenseData.map((category) => (
          <div key={category.category} className="flex items-center space-x-1">
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: getCategoryColor(category.category) }}
            />
            <span className="text-gray-700 truncate" title={category.category}>
              {category.category}
            </span>
            <span className="text-gray-900 font-medium">
              {formatCurrency(category.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}