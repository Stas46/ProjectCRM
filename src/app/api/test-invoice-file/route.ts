/**
 * Тестовый endpoint для проверки отправки файлов счетов
 * GET /api/test-invoice-file?userId=YOUR_USER_ID&invoiceNumber=63
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserInvoices } from '@/lib/crm-data-tools';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const invoiceNumber = searchParams.get('invoiceNumber') || 'last';

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Получаем счета пользователя
    const { data: invoices } = await getUserInvoices(userId, { limit: 10 });

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ 
        error: 'No invoices found',
        userId 
      }, { status: 404 });
    }

    // Ищем нужный счёт
    let targetInvoice;
    if (invoiceNumber === 'last' || invoiceNumber === 'последний') {
      targetInvoice = invoices[0];
    } else {
      targetInvoice = invoices.find(inv => 
        inv.invoice_number === invoiceNumber || 
        inv.invoice_number?.includes(invoiceNumber)
      );
    }

    if (!targetInvoice) {
      return NextResponse.json({ 
        error: `Invoice "${invoiceNumber}" not found`,
        availableInvoices: invoices.map(inv => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          supplier: inv.supplier_name,
          amount: inv.total_amount
        }))
      }, { status: 404 });
    }

    // Получаем полную информацию о счёте с file_url
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, file_url, total_amount, invoice_date')
      .eq('id', targetInvoice.id)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ 
        error: 'Failed to fetch invoice details',
        details: error?.message 
      }, { status: 500 });
    }

    // Проверяем наличие файла
    if (!invoice.file_url) {
      return NextResponse.json({
        error: 'Invoice file not found',
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          amount: invoice.total_amount,
          has_file: false
        }
      }, { status: 404 });
    }

    // Возвращаем информацию для Telegram
    return NextResponse.json({
      success: true,
      message: `Бот отправит файл счёта ${invoice.invoice_number}`,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: invoice.total_amount,
        date: invoice.invoice_date,
        file_url: invoice.file_url
      },
      telegram_action: {
        method: 'sendDocument',
        chat_id: 'YOUR_TELEGRAM_CHAT_ID',
        document: invoice.file_url,
        caption: `📄 Счёт ${invoice.invoice_number}`
      }
    });

  } catch (error: any) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
