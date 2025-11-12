/**
 * Сервис для работы с почтой через n8n
 */

export interface EmailOptions {
  to: string | string[];
  subject: string;
  message?: string; // Текстовая версия
  html?: string; // HTML версия
  attachments?: Array<{
    filename: string;
    content: string; // base64 или URL
    contentType?: string;
  }>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  message: string;
}

/**
 * Отправка email через n8n
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const response = await fetch('/api/n8n/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send email');
    }

    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
}

/**
 * Шаблон: Новый счет создан
 */
export function newInvoiceTemplate(data: {
  invoiceNumber: string;
  supplierName: string;
  totalAmount: number;
  invoiceDate: string;
  projectName?: string;
}): EmailTemplate {
  const { invoiceNumber, supplierName, totalAmount, invoiceDate, projectName } = data;

  const subject = `Новый счет №${invoiceNumber} от ${supplierName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .info-block { margin: 15px 0; padding: 15px; background: white; border-left: 4px solid #4CAF50; }
        .label { font-weight: bold; color: #666; }
        .value { color: #333; font-size: 16px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📄 Новый счет распознан</h1>
        </div>
        <div class="content">
          <div class="info-block">
            <div class="label">Номер счета:</div>
            <div class="value">${invoiceNumber}</div>
          </div>
          <div class="info-block">
            <div class="label">Поставщик:</div>
            <div class="value">${supplierName}</div>
          </div>
          <div class="info-block">
            <div class="label">Сумма:</div>
            <div class="value">${totalAmount.toLocaleString('ru-RU')} ₽</div>
          </div>
          <div class="info-block">
            <div class="label">Дата счета:</div>
            <div class="value">${new Date(invoiceDate).toLocaleDateString('ru-RU')}</div>
          </div>
          ${projectName ? `
          <div class="info-block">
            <div class="label">Проект:</div>
            <div class="value">${projectName}</div>
          </div>
          ` : ''}
        </div>
        <div class="footer">
          <p>Это автоматическое уведомление из CRM системы</p>
          <p>Glazing CRM | alu.stella-spb.ru</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const message = `
Новый счет распознан

Номер счета: ${invoiceNumber}
Поставщик: ${supplierName}
Сумма: ${totalAmount.toLocaleString('ru-RU')} ₽
Дата счета: ${new Date(invoiceDate).toLocaleDateString('ru-RU')}
${projectName ? `Проект: ${projectName}` : ''}

---
Это автоматическое уведомление из CRM системы
Glazing CRM | alu.stella-spb.ru
  `;

  return { subject, html, message };
}

/**
 * Шаблон: Приглашение в систему
 */
export function inviteUserTemplate(data: {
  userName: string;
  userEmail: string;
  tempPassword: string;
}): EmailTemplate {
  const { userName, userEmail, tempPassword } = data;

  const subject = `Приглашение в Glazing CRM`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .credentials { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>👋 Добро пожаловать!</h1>
        </div>
        <div class="content">
          <p>Здравствуйте, ${userName}!</p>
          <p>Для вас создан аккаунт в системе Glazing CRM.</p>
          
          <div class="credentials">
            <p><strong>Ваши данные для входа:</strong></p>
            <p>Email: <strong>${userEmail}</strong></p>
            <p>Временный пароль: <strong>${tempPassword}</strong></p>
          </div>

          <p style="text-align: center;">
            <a href="https://alu.stella-spb.ru" class="button">Войти в систему</a>
          </p>

          <p><strong>⚠️ Важно:</strong> После первого входа обязательно смените пароль!</p>
        </div>
        <div class="footer">
          <p>Glazing CRM | alu.stella-spb.ru</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const message = `
Добро пожаловать!

Здравствуйте, ${userName}!

Для вас создан аккаунт в системе Glazing CRM.

Ваши данные для входа:
Email: ${userEmail}
Временный пароль: ${tempPassword}

Войти: https://alu.stella-spb.ru

⚠️ Важно: После первого входа обязательно смените пароль!

---
Glazing CRM | alu.stella-spb.ru
  `;

  return { subject, html, message };
}
