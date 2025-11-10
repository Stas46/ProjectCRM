export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Шапка */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900">CRM Система</h1>
        </div>
      </div>

      {/* Главное меню */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/projects"
            className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-400"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🏗️</span>
              <h2 className="text-lg font-semibold text-gray-900">Проекты</h2>
            </div>
            <p className="text-sm text-gray-600">Управление заказами и задачами</p>
          </a>

          <a
            href="/tasks"
            className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 hover:border-purple-400"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">✓</span>
              <h2 className="text-lg font-semibold text-gray-900">Задачи</h2>
            </div>
            <p className="text-sm text-gray-600">Матрица Эйзенхауэра и личные задачи</p>
          </a>

          <a
            href="/invoices"
            className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-400"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📄</span>
              <h2 className="text-lg font-semibold text-gray-900">Счета</h2>
            </div>
            <p className="text-sm text-gray-600">Загрузка и распознавание счетов</p>
          </a>

          <a
            href="/suppliers"
            className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-400"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🏢</span>
              <h2 className="text-lg font-semibold text-gray-900">Поставщики</h2>
            </div>
            <p className="text-sm text-gray-600">База поставщиков и аналитика</p>
          </a>
        </div>
      </div>
    </div>
  );
}
