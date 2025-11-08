'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Play, FileText, Code } from 'lucide-react'

interface ParsedResult {
  invoice: {
    number: string | null
    date: string | null
    due_date: string | null
    total_amount: number | null
    vat_amount: number | null
    vat_rate: number | null
    has_vat: boolean
  }
  contractor: {
    name: string | null
    inn: string | null
    kpp: string | null
    address: string | null
  }
  items: Array<{
    number: number
    name: string
    quantity: number
    unit: string
    price: number
    total: number
  }>
}

export default function ParserTestPage() {
  const [inputText, setInputText] = useState('')
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [rawOutput, setRawOutput] = useState('')

  const testParser = async () => {
    if (!inputText.trim()) {
      setError('Введите текст счета для тестирования')
      return
    }

    setIsLoading(true)
    setError('')
    setParsedResult(null)
    setRawOutput('')

    try {
      const response = await fetch('/api/test-parser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      })

      const data = await response.json()

      if (data.success) {
        setParsedResult(data.result)
        setRawOutput(data.rawOutput || '')
      } else {
        setError(data.error || 'Ошибка парсинга')
        setRawOutput(data.rawOutput || '')
      }
    } catch (err) {
      setError('Ошибка сети: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/smart-invoice', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setInputText(data.fullText || '')
        if (data.parsedInvoice) {
          setParsedResult(data.parsedInvoice)
        }
      } else {
        setError(data.error || 'Ошибка загрузки файла')
      }
    } catch (err) {
      setError('Ошибка загрузки: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Тестирование парсера счетов</h1>
        <p className="text-muted-foreground">
          Загрузите PDF файл или вставьте текст счета для тестирования и отладки парсера
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Левая панель - ввод */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Загрузка файла
              </CardTitle>
              <CardDescription>
                Загрузите файл счета (PDF, Excel, Word) для автоматического извлечения текста
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".pdf,.xlsx,.xls,.docx,.doc"
                onChange={uploadFile}
                className="w-full p-2 border rounded"
                disabled={isLoading}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Текст счета
              </CardTitle>
              <CardDescription>
                Или вставьте текст счета напрямую для тестирования
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="invoice-text">Текст счета:</Label>
                <Textarea
                  id="invoice-text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Вставьте здесь текст счета для парсинга..."
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
              <Button 
                onClick={testParser} 
                disabled={isLoading || !inputText.trim()}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                {isLoading ? 'Обработка...' : 'Тестировать парсер'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Правая панель - результаты */}
        <div className="space-y-6">
          {error && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Ошибка</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-600">{error}</p>
                {rawOutput && (
                  <div className="mt-4">
                    <Label>Сырой вывод:</Label>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                      {rawOutput}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {parsedResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Результат парсинга</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="structured" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="structured">Структурированно</TabsTrigger>
                    <TabsTrigger value="json">JSON</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="structured" className="space-y-4">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Номер счета:</Label>
                          <p className="font-mono">{parsedResult.invoice.number || 'Не найден'}</p>
                        </div>
                        <div>
                          <Label>Дата:</Label>
                          <p className="font-mono">{parsedResult.invoice.date || 'Не найдена'}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Сумма:</Label>
                          <p className="font-mono">
                            {parsedResult.invoice.total_amount 
                              ? `${parsedResult.invoice.total_amount.toLocaleString()} руб.`
                              : 'Не найдена'
                            }
                          </p>
                        </div>
                        <div>
                          <Label>НДС:</Label>
                          <p className="font-mono">
                            {parsedResult.invoice.has_vat
                              ? `${parsedResult.invoice.vat_amount?.toLocaleString()} руб. (${parsedResult.invoice.vat_rate}%)`
                              : 'Без НДС'
                            }
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label>Поставщик:</Label>
                        <p className="font-mono">{parsedResult.contractor.name || 'Не найден'}</p>
                      </div>

                      <div>
                        <Label>Дата оплаты:</Label>
                        <p className="font-mono">{parsedResult.invoice.due_date || 'Не найдена'}</p>
                      </div>

                      {parsedResult.items.length > 0 && (
                        <div>
                          <Label>Товары ({parsedResult.items.length}):</Label>
                          <div className="space-y-2 mt-2">
                            {parsedResult.items.map((item, index) => (
                              <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                                <div className="font-medium">{item.name}</div>
                                <div className="text-gray-600">
                                  {item.quantity} {item.unit} × {item.price.toLocaleString()} = {item.total.toLocaleString()} руб.
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="json">
                    <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                      {JSON.stringify(parsedResult, null, 2)}
                    </pre>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {rawOutput && !error && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Отладочная информация
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-64">
                  {rawOutput}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}