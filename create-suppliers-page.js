const fs = require('fs');

const content = `'use client';

export default function SuppliersPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Поставщики</h1>
      <p className="text-gray-600">Страница в разработке...</p>
    </div>
  );
}
`;

fs.writeFileSync('src/app/suppliers/page.tsx', content, 'utf-8');
console.log('✅ Файл создан: src/app/suppliers/page.tsx');
