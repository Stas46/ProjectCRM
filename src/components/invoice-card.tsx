'use client';

import { FilePenLine, Trash2, Eye, ArrowUpDown, Check, X, Download } from 'lucide-react';
import { useState } from 'react';

export interface InvoiceCardProps {
  id: string;
  projectId: string;
  projectTitle: string;
  vendor: string;
  number: string;
  issueDate: string;
  amount: number;
  status: 'draft' | 'to_pay' | 'paid' | 'rejected';
  category: string;
  hasAttachment: boolean;
  onClick?: (id: string) => void;
}

const statusMap = {
  draft: { label: 'Черновик', color: 'bg-gray-100 text-gray-800' },
  to_pay: { label: 'К оплате', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Оплачен', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Отклонен', color: 'bg-red-100 text-red-800' },
};

const InvoiceCard = ({
  id,
  projectId,
  projectTitle,
  vendor,
  number,
  issueDate,
  amount,
  status,
  category,
  hasAttachment,
  onClick,
}: InvoiceCardProps) => {
  const statusInfo = statusMap[status];
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU').format(date);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-medium text-gray-900">{vendor}</h3>
            <p className="text-sm text-gray-500">№ {number}</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
        
        <div className="mt-3">
          <p className="text-sm text-blue-600 hover:underline cursor-pointer">
            {projectTitle}
          </p>
        </div>
        
        <div className="mt-3 flex justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Дата</p>
            <p className="text-sm">{formatDate(issueDate)}</p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 mb-1">Категория</p>
            <p className="text-sm">{category}</p>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Сумма</p>
            <p className="text-lg font-medium text-gray-900">{formatCurrency(amount)}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => onClick && onClick(id)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Просмотр"
          >
            <Eye size={18} />
          </button>
          
          {hasAttachment && (
            <button
              type="button"
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Скачать файл"
            >
              <Download size={18} />
            </button>
          )}
        </div>
        
        <div className="flex space-x-2">
          {status === 'draft' && (
            <>
              <button
                type="button"
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Редактировать"
              >
                <FilePenLine size={18} />
              </button>
              <button
                type="button"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded"
                title="Удалить"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
          
          {status === 'to_pay' && (
            <>
              <button
                type="button"
                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded"
                title="Подтвердить оплату"
              >
                <Check size={18} />
              </button>
              <button
                type="button"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded"
                title="Отклонить"
              >
                <X size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceCard;