import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint для отправки email через n8n
 * POST /api/n8n/send-email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, message, html, attachments } = body;

    // Валидация
    if (!to || !subject || (!message && !html)) {
      return NextResponse.json(
        { error: 'Необходимо указать: to, subject и message/html' },
        { status: 400 }
      );
    }

    // Отправка в n8n webhook
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.alu.stella-spb.ru/webhook/send-email';
    
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        message,
        html,
        attachments,
        timestamp: new Date().toISOString(),
        source: 'crm',
      }),
    });

    if (!response.ok) {
      throw new Error(`n8n webhook failed: ${response.status}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Email отправлен через n8n',
      data: result,
    });

  } catch (error) {
    console.error('Ошибка отправки email через n8n:', error);
    return NextResponse.json(
      { 
        error: 'Не удалось отправить email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
