'use client';

export default function PdfToolsNavigation() {
  const tools = [
    {
      title: 'Анализ структуры PDF',
      description: 'Анализирует метаданные, структуру страниц и информацию о PDF файле',
      url: '/pdf-analyze',
      status: '✅ Работает',
      color: 'green',
      features: ['Метаданные PDF', 'Размеры страниц', 'Дата создания', 'Автор и создатель']
    },
    {
      title: 'Альтернативная обработка PDF',
      description: 'Извлекает текст и создает изображение-заглушку без внешних зависимостей',
      url: '/alternative-convert',
      status: '✅ Работает',
      color: 'green',
      features: ['Извлечение текста', 'Изображение-заглушка', 'Работает без GraphicsMagick', 'Показывает содержимое']
    },
    {
      title: 'Тестирование всех методов',
      description: 'Полное тестирование всех доступных методов конвертации PDF',
      url: '/pdf-test',
      status: '⚠️ Частично',
      color: 'yellow',
      features: ['Тест pdf2pic', 'Тест pdf-poppler', 'Тест pdfjs-dist', 'Системная диагностика']
    },
    {
      title: 'Простая конвертация PDF',
      description: 'Прямая конвертация PDF в изображение с помощью pdf2pic',
      url: '/simple-convert',
      status: '❌ Требует GraphicsMagick',
      color: 'red',
      features: ['Высокое качество', 'PNG формат', 'Быстрая конвертация', 'Нужен GraphicsMagick']
    }
  ];

  const getStatusColor = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-50 border-green-200 text-green-800';
      case 'yellow': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'red': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getButtonColor = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-600 hover:bg-green-700';
      case 'yellow': return 'bg-yellow-600 hover:bg-yellow-700';
      case 'red': return 'bg-red-600 hover:bg-red-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🔧 Инструменты для работы с PDF
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Набор инструментов для анализа, конвертации и обработки PDF файлов. 
            Выберите подходящий инструмент в зависимости от ваших потребностей.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {tools.map((tool, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">{tool.title}</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(tool.color)}`}>
                    {tool.status}
                  </span>
                </div>
                
                <p className="text-gray-600 mb-4">{tool.description}</p>
                
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-2">Возможности:</h3>
                  <ul className="space-y-1">
                    {tool.features.map((feature, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-center">
                        <span className="text-blue-500 mr-2">•</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <a
                  href={tool.url}
                  className={`block w-full text-center py-3 px-4 text-white font-semibold rounded-lg transition-colors ${getButtonColor(tool.color)}`}
                >
                  Открыть инструмент
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Информационные блоки */}
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-blue-800 mb-4">💡 Рекомендации по использованию</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-700">
              <div>
                <h3 className="font-semibold mb-2">Для начала:</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Используйте "Анализ структуры PDF" для понимания файла</li>
                  <li>• "Альтернативная обработка" работает всегда</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Для полной функциональности:</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Установите GraphicsMagick для качественной конвертации</li>
                  <li>• Тестируйте разные методы для выбора лучшего</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-yellow-800 mb-4">⚠️ Требования системы</h2>
            <div className="text-yellow-700">
              <p className="mb-2">Для полной функциональности всех инструментов необходимо:</p>
              <div className="bg-yellow-100 p-4 rounded">
                <p className="font-mono text-sm">
                  <strong>GraphicsMagick:</strong> choco install graphicsmagick<br/>
                  <strong>Poppler Utils:</strong> choco install poppler<br/>
                  <em>(Требуют права администратора)</em>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-green-800 mb-4">✅ Что уже работает</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-green-700 text-sm">
              <div>
                <h3 className="font-semibold">PDF анализ:</h3>
                <ul className="space-y-1">
                  <li>• Метаданные</li>
                  <li>• Структура страниц</li>
                  <li>• Размеры и формат</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold">Извлечение текста:</h3>
                <ul className="space-y-1">
                  <li>• PDF-parse</li>
                  <li>• Полный текст</li>
                  <li>• Без зависимостей</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold">Создание изображений:</h3>
                <ul className="space-y-1">
                  <li>• Canvas заглушки</li>
                  <li>• Информационные карточки</li>
                  <li>• PNG формат</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            Все инструменты созданы для CRM системы анализа счетов и работают в браузере
          </p>
        </div>
      </div>
    </div>
  );
}