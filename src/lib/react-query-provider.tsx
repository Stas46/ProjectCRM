'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Кэшируем данные на 5 минут
            staleTime: 5 * 60 * 1000,
            // Храним в кэше 10 минут
            gcTime: 10 * 60 * 1000,
            // Автоматически обновляем при фокусе
            refetchOnWindowFocus: true,
            // Повторяем при ошибке
            retry: 1,
            // Не обновляем при монтировании если данные свежие
            refetchOnMount: 'always',
          },
          mutations: {
            // Повторяем мутации 1 раз при ошибке
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
