'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Trash2, DollarSign, Zap, BarChart3, Paperclip, X, File, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string;
  tokens_total: number;
  cost_usd: number;
  created_at: string;
  attachments?: Array<{
    file_name: string;
    file_type: string;
    file_url: string;
    file_size: number;
  }>;
}

interface ModelConfig {
  name: string;
  displayName: string;
  pricePrompt: number; // $ per 1M tokens
  priceCompletion: number; // $ per 1M tokens
}

const MODELS: ModelConfig[] = [
  { name: 'deepseek-chat', displayName: '🚀 DeepSeek Chat (Дёшево!)', pricePrompt: 0.28, priceCompletion: 0.42 },
  { name: 'gpt-4o-mini', displayName: 'GPT-4o Mini 🎨', pricePrompt: 0.15, priceCompletion: 0.6 },
  { name: 'gpt-4o', displayName: 'GPT-4o 🎨 (Vision)', pricePrompt: 2.5, priceCompletion: 10 },
  { name: 'deepseek-coder', displayName: '💻 DeepSeek Coder', pricePrompt: 0.28, priceCompletion: 0.42 },
  { name: 'gpt-4-turbo', displayName: 'GPT-4 Turbo', pricePrompt: 10, priceCompletion: 30 },
  { name: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo', pricePrompt: 0.5, priceCompletion: 1.5 },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState('deepseek-chat');
  const [agentType, setAgentType] = useState<'general' | 'personal_assistant'>('general');
  const [stats, setStats] = useState({ totalTokens: 0, totalCost: 0, messageCount: 0 });
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadMessages();
      loadStats();
    }
  }, [currentUser, agentType]); // Перезагружаем при смене агента

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  async function loadMessages() {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('agent_type', agentType) // Фильтруем по типу агента
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Load messages error:', err);
    }
  }

  async function loadStats() {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('chat_usage_stats')
        .select('*')
        .eq('date', new Date().toISOString().split('T')[0])
        .single();

      if (data) {
        setStats({
          totalTokens: data.total_tokens || 0,
          totalCost: parseFloat(data.total_cost_usd) || 0,
          messageCount: data.total_messages || 0,
        });
      }
    } catch (err) {
      console.error('Load stats error:', err);
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        alert(`Файл ${file.name} слишком большой. Максимум 10MB`);
        return false;
      }
      return true;
    });
    
    setAttachedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  async function sendMessage() {
    if ((!input.trim() && attachedFiles.length === 0) || loading) return;

    const userMessage = input.trim();
    setInput('');
    const filesToSend = [...attachedFiles];
    setAttachedFiles([]);
    
    // Сбрасываем file input чтобы можно было выбрать те же файлы снова
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    setLoading(true);

    try {
      // Получаем текущую сессию
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Ошибка: нет активной сессии');
        setLoading(false);
        return;
      }

      // Загружаем файлы если есть
      let fileUrls: any[] = [];
      if (filesToSend.length > 0) {
        for (const file of filesToSend) {
          // Очищаем имя файла: убираем кириллицу, пробелы, спецсимволы
          const cleanFileName = file.name
            .replace(/[^a-zA-Z0-9._-]/g, '_') // Заменяем всё кроме латиницы, цифр, точки, тире, подчёркивания
            .replace(/_{2,}/g, '_'); // Убираем множественные подчёркивания
          
          const fileName = `${Date.now()}_${cleanFileName}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('chat-files')
            .upload(`${currentUser.id}/${fileName}`, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('chat-files')
            .getPublicUrl(`${currentUser.id}/${fileName}`);

          fileUrls.push({
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_url: publicUrl,
          });
        }
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: userMessage || '📎 Файлы прикреплены',
          model: selectedModel,
          history: messages.slice(-10),
          attachments: fileUrls,
          agentType: agentType, // Отправляем тип агента
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Обновляем сообщения и статистику
      await loadMessages();
      await loadStats();
    } catch (err) {
      console.error('Send message error:', err);
      alert('Ошибка отправки сообщения');
    } finally {
      setLoading(false);
    }
  }

  async function clearHistory() {
    const agentName = agentType === 'personal_assistant' ? 'Личного помощника' : 'Обычного чата';
    if (!confirm(`Удалить всю историю ${agentName}?`)) return;

    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('agent_type', agentType); // Удаляем только сообщения текущего агента

      if (error) throw error;
      setMessages([]);
    } catch (err) {
      console.error('Clear history error:', err);
    }
  }

  const currentModelConfig = MODELS.find(m => m.name === selectedModel);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Назад
              </button>
              <h1 className="text-2xl font-bold text-gray-900">AI Чат-бот</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Выбор модели */}
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MODELS.map(model => (
                  <option key={model.name} value={model.name}>
                    {model.displayName}
                  </option>
                ))}
              </select>

              {/* Переключатель типа агента */}
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setAgentType('general')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    agentType === 'general'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  💬 Обычный чат
                </button>
                <button
                  onClick={() => setAgentType('personal_assistant')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    agentType === 'personal_assistant'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🤖 Личный помощник
                </button>
              </div>

              <button
                onClick={clearHistory}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Очистить историю"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>

          {/* Статистика */}
          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <BarChart3 size={16} />
              <span>{stats.messageCount} сообщений</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Zap size={16} />
              <span>{stats.totalTokens.toLocaleString()} токенов</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <DollarSign size={16} />
              <span>${stats.totalCost.toFixed(4)}</span>
            </div>
          </div>

          {/* Цены текущей модели */}
          {currentModelConfig && (
            <div className="mt-2 text-xs text-gray-500">
              Цены: ${currentModelConfig.pricePrompt}/1M промпт, ${currentModelConfig.priceCompletion}/1M ответ
            </div>
          )}
        </div>
      </div>

      {/* Сообщения */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-32">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            {agentType === 'personal_assistant' ? (
              <>
                <div className="text-6xl mb-4">🤖</div>
                <p className="text-2xl font-semibold mb-3 text-gray-700">Личный помощник</p>
                <p className="text-sm max-w-2xl mx-auto mb-6">
                  Я помогу вам управлять задачами, проектами и счетами в CRM. Задавайте вопросы о ваших данных!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-2xl mb-2">📋</div>
                    <p className="font-medium text-gray-700 mb-1">Задачи</p>
                    <p className="text-xs text-gray-500">Какие задачи на этой неделе? Что срочного?</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-2xl mb-2">🏗️</div>
                    <p className="font-medium text-gray-700 mb-1">Проекты</p>
                    <p className="text-xs text-gray-500">Покажи активные проекты. Сколько завершено?</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-2xl mb-2">📊</div>
                    <p className="font-medium text-gray-700 mb-1">Счета</p>
                    <p className="text-xs text-gray-500">Сколько неоплаченных счетов?</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-lg mb-2">Начните диалог с AI</p>
                <p className="text-sm">Выберите модель и задайте вопрос</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  }`}
                >
                  {/* Прикрепленные файлы */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {msg.attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {att.file_type.startsWith('image/') ? (
                            <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={att.file_url}
                                alt={att.file_name}
                                className="max-w-full max-h-64 rounded-lg border border-white/20"
                              />
                            </a>
                          ) : (
                            <a
                              href={att.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                                msg.role === 'user'
                                  ? 'bg-blue-500 hover:bg-blue-400'
                                  : 'bg-gray-100 hover:bg-gray-200'
                              } transition-colors`}
                            >
                              <File size={16} />
                              <span className="text-sm">{att.file_name}</span>
                              <span className="text-xs opacity-75">({formatFileSize(att.file_size)})</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ node, ...props }) => (
                          <a 
                            {...props} 
                            className="text-blue-600 hover:text-blue-800 underline" 
                            target="_blank" 
                            rel="noopener noreferrer"
                          />
                        ),
                        code: ({ node, inline, ...props }: any) => (
                          inline 
                            ? <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props} />
                            : <code className="block bg-gray-100 p-2 rounded text-sm overflow-x-auto" {...props} />
                        )
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {msg.tokens_total} токенов • ${msg.cost_usd.toFixed(4)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Поле ввода */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Превью прикрепленных файлов */}
          {attachedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg text-sm"
                >
                  {file.type.startsWith('image/') ? (
                    <ImageIcon size={16} className="text-blue-600" />
                  ) : (
                    <File size={16} className="text-gray-600" />
                  )}
                  <span className="max-w-[200px] truncate">{file.name}</span>
                  <span className="text-gray-500">({formatFileSize(file.size)})</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="ml-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            {/* Скрытый input для файлов */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
            />
            
            {/* Кнопка прикрепления */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="px-3 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Прикрепить файл"
            >
              <Paperclip size={20} className="text-gray-600" />
            </button>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Введите сообщение..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || (!input.trim() && attachedFiles.length === 0)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Думаю...</span>
                </>
              ) : (
                <>
                  <Send size={20} />
                  <span>Отправить</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
