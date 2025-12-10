'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface Project {
  id: string;
  title: string;
  client: string;
  address: string | null;
  description: string | null;
  budget: number | null;
  status: string;
  due_date: string | null;
  created_at: string;
}

/**
 * Хук для загрузки проектов с кэшированием через React Query
 */
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 3 * 60 * 1000, // 3 минуты - данные свежие
    gcTime: 10 * 60 * 1000, // 10 минут в кэше
  });
}

/**
 * Хук для создания проекта с автоматической инвалидацией кэша
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (projectData: Partial<Project>) => {
      const { error } = await supabase
        .from('projects')
        .insert([projectData]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Обновляем кэш после создания
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// Аналогично для других сущностей
export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useTasks(projectId?: string) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      let query = supabase.from('tasks').select('*');
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!projectId, // Загружать только если есть projectId
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
