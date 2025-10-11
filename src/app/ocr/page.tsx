"use client";

import React from 'react';

export default function OCRPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [text, setText] = React.useState<string>("");
  const [pages, setPages] = React.useState<Array<{ page: number; text: string }>>([]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setText("");
    setPages([]);
    setLoading(true);

    try {
      const form = e.currentTarget;
      const fd = new FormData(form);
      const res = await fetch('/api/ocr-from-pdf', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка OCR');
      }
      setText(data.fullText || '');
      setPages(data.pages || []);
    } catch (err: any) {
      setError(err.message || 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">OCR из PDF (PDF → PNG → Google Vision)</h1>
      <form onSubmit={onSubmit} className="space-y-3 border p-4 rounded">
        <input name="file" type="file" accept="application/pdf" required className="block" />
        <button type="submit" disabled={loading} className="px-4 py-2 bg-black text-white rounded">
          {loading ? 'Обрабатываю…' : 'Распознать'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>
      )}

      {pages.length > 0 && (
        <div className="mt-6 space-y-6">
          {pages.map(p => (
            <section key={p.page}>
              <h2 className="font-semibold mb-2">Страница {p.page}</h2>
              <pre className="whitespace-pre-wrap bg-gray-50 p-3 rounded border max-h-[50vh] overflow-auto">{p.text}</pre>
            </section>
          ))}
        </div>
      )}

      {text && pages.length === 0 && (
        <pre className="mt-6 whitespace-pre-wrap bg-gray-50 p-3 rounded border max-h-[60vh] overflow-auto">{text}</pre>
      )}
    </main>
  );
}
