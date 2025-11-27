/**
 * Agent Logger - утилита для детального логирования работы AI-агентов
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AgentLogEntry {
  userId: string;
  sessionId?: string;
  agentType: 'data_agent' | 'assistant_agent' | 'crm_tools' | 'personal_assistant';
  actionType: string;
  inputData?: any;
  outputData?: any;
  sqlQuery?: string;
  rowsAffected?: number;
  executionTimeMs?: number;
  status?: 'success' | 'error' | 'warning';
  errorMessage?: string;
  modelUsed?: string;
  tokensUsed?: number;
}

/**
 * Записать лог в базу данных
 */
export async function logAgentAction(entry: AgentLogEntry): Promise<void> {
  try {
    const { error } = await supabase
      .from('agent_logs')
      .insert({
        user_id: entry.userId,
        session_id: entry.sessionId || generateSessionId(),
        agent_type: entry.agentType,
        action_type: entry.actionType,
        input_data: entry.inputData,
        output_data: entry.outputData,
        sql_query: entry.sqlQuery,
        rows_affected: entry.rowsAffected,
        execution_time_ms: entry.executionTimeMs,
        status: entry.status || 'success',
        error_message: entry.errorMessage,
        model_used: entry.modelUsed,
        tokens_used: entry.tokensUsed,
      });

    if (error) {
      console.error('❌ Failed to log agent action:', error);
    }
  } catch (error) {
    console.error('❌ Exception in logAgentAction:', error);
  }
}

/**
 * Логировать начало действия (возвращает функцию для завершения лога)
 */
export function startAgentLog(
  userId: string,
  agentType: AgentLogEntry['agentType'],
  actionType: string,
  inputData?: any,
  sessionId?: string
): { finish: (result: Partial<AgentLogEntry>) => Promise<void>; sessionId: string } {
  const startTime = Date.now();
  const logSessionId = sessionId || generateSessionId();

  const finish = async (result: Partial<AgentLogEntry>) => {
    const executionTimeMs = Date.now() - startTime;
    
    await logAgentAction({
      userId,
      sessionId: logSessionId,
      agentType,
      actionType,
      inputData,
      executionTimeMs,
      ...result,
    });
  };

  return { finish, sessionId: logSessionId };
}

/**
 * Генерировать ID сессии
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Консольный лог с эмодзи и цветами (для разработки)
 */
export function consoleLog(
  type: 'info' | 'success' | 'error' | 'warning' | 'data',
  message: string,
  data?: any
) {
  const emoji = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    data: '📊',
  };

  const prefix = `${emoji[type]} [${new Date().toLocaleTimeString('ru-RU')}]`;
  
  if (data !== undefined) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}
