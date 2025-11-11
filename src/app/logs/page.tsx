'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ChevronDown, ChevronUp, Clock, AlertCircle, CheckCircle, AlertTriangle, Database, Brain, Wrench } from 'lucide-react';

interface AgentLog {
  id: string;
  user_id: string;
  session_id: string;
  agent_type: string;
  action_type: string;
  input_data: any;
  output_data: any;
  sql_query: string | null;
  rows_affected: number | null;
  execution_time_ms: number | null;
  status: 'success' | 'error' | 'warning';
  error_message: string | null;
  model_used: string | null;
  tokens_used: number | null;
  created_at: string;
}

export default function AgentLogsPage() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  
  // Фильтры
  const [filterAgentType, setFilterAgentType] = useState('');
  const [filterActionType, setFilterActionType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSession, setFilterSession] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadLogs();
    }
  }, [currentUser, filterAgentType, filterActionType, filterStatus, filterSession]);

  async function initAuth() {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setCurrentUser(user);
      } else {
        router.push('/login');
      }
    } catch (err) {
      console.error('Error initializing auth:', err);
      router.push('/login');
    }
  }

  async function loadLogs() {
    try {
      setLoading(true);
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const params = new URLSearchParams({
        limit: '100',
        offset: '0',
      });

      if (filterAgentType) params.append('agent_type', filterAgentType);
      if (filterActionType) params.append('action_type', filterActionType);
      if (filterStatus) params.append('status', filterStatus);
      if (filterSession) params.append('session_id', filterSession);

      const response = await fetch(`/api/agent-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load logs');

      const data = await response.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Load logs error:', err);
    } finally {
      setLoading(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="text-green-600" size={20} />;
      case 'error': return <AlertCircle className="text-red-600" size={20} />;
      case 'warning': return <AlertTriangle className="text-yellow-600" size={20} />;
      default: return <Activity className="text-gray-600" size={20} />;
    }
  };

  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case 'data_agent': return <Brain className="text-blue-600" size={18} />;
      case 'crm_tools': return <Database className="text-purple-600" size={18} />;
      case 'assistant_agent': return <Wrench className="text-green-600" size={18} />;
      default: return <Activity className="text-gray-600" size={18} />;
    }
  };

  const toggleExpand = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="text-blue-600" />
                Логи AI-агентов
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Детальная информация о работе личного помощника
              </p>
            </div>
            <button
              onClick={() => router.push('/chat')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Вернуться к чату
            </button>
          </div>

          {/* Фильтры */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filterAgentType}
              onChange={(e) => setFilterAgentType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Все агенты</option>
              <option value="data_agent">Data Agent</option>
              <option value="crm_tools">CRM Tools</option>
              <option value="assistant_agent">Assistant Agent</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Все статусы</option>
              <option value="success">Успех</option>
              <option value="error">Ошибка</option>
              <option value="warning">Предупреждение</option>
            </select>

            <input
              type="text"
              value={filterActionType}
              onChange={(e) => setFilterActionType(e.target.value)}
              placeholder="Тип действия..."
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="text"
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              placeholder="ID сессии..."
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Загрузка логов...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Activity className="mx-auto text-gray-400" size={48} />
            <p className="text-gray-500 mt-4">Логи не найдены</p>
            <p className="text-sm text-gray-400">Попробуйте изменить фильтры или задайте вопрос личному помощнику</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Log Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(log.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(log.status)}
                      {getAgentIcon(log.agent_type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {log.action_type}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {log.agent_type}
                          </span>
                          {log.execution_time_ms && (
                            <span className="text-xs text-blue-600 flex items-center gap-1">
                              <Clock size={12} />
                              {log.execution_time_ms}ms
                            </span>
                          )}
                          {log.rows_affected !== null && (
                            <span className="text-xs text-purple-600">
                              {log.rows_affected} строк
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(log.created_at).toLocaleString('ru-RU')}
                          {log.session_id && (
                            <span className="ml-2 text-xs">
                              Session: {log.session_id.slice(0, 12)}...
                            </span>
                          )}
                        </p>
                      </div>
                      {expandedLog === log.id ? (
                        <ChevronUp className="text-gray-400" size={20} />
                      ) : (
                        <ChevronDown className="text-gray-400" size={20} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Log Details */}
                {expandedLog === log.id && (
                  <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                    <div className="mt-3 space-y-3 text-sm">
                      {/* Input Data */}
                      {log.input_data && (
                        <div>
                          <div className="font-medium text-gray-700 mb-1">📥 Входные данные:</div>
                          <pre className="bg-white p-3 rounded border border-gray-200 overflow-x-auto text-xs">
                            {JSON.stringify(log.input_data, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Output Data */}
                      {log.output_data && (
                        <div>
                          <div className="font-medium text-gray-700 mb-1">📤 Выходные данные:</div>
                          <pre className="bg-white p-3 rounded border border-gray-200 overflow-x-auto text-xs">
                            {JSON.stringify(log.output_data, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* SQL Query */}
                      {log.sql_query && (
                        <div>
                          <div className="font-medium text-gray-700 mb-1">🗄️ SQL-запрос:</div>
                          <pre className="bg-white p-3 rounded border border-gray-200 overflow-x-auto text-xs font-mono">
                            {log.sql_query}
                          </pre>
                        </div>
                      )}

                      {/* Error Message */}
                      {log.error_message && (
                        <div>
                          <div className="font-medium text-red-700 mb-1">❌ Ошибка:</div>
                          <div className="bg-red-50 text-red-700 p-3 rounded border border-red-200 text-xs">
                            {log.error_message}
                          </div>
                        </div>
                      )}

                      {/* Model & Tokens */}
                      {(log.model_used || log.tokens_used) && (
                        <div className="flex gap-4 text-xs text-gray-600">
                          {log.model_used && (
                            <span>🤖 Модель: <strong>{log.model_used}</strong></span>
                          )}
                          {log.tokens_used && (
                            <span>🎯 Токены: <strong>{log.tokens_used}</strong></span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
