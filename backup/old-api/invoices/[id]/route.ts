import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'
);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;
    const updateData = await request.json();
    
    console.log('📝 [INVOICE-UPDATE] Обновление счета:', invoiceId, updateData);
    
    // Обновляем счет
    const { data: invoice, error } = await supabase
      .from('invoices')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ [INVOICE-UPDATE] Ошибка обновления:', error);
      return NextResponse.json({ error: 'Ошибка обновления счета' }, { status: 500 });
    }

    // Если изменился поставщик или категория, обновляем поставщика в базе
    if (updateData.supplier && updateData.category) {
      const { error: supplierError } = await supabase
        .from('suppliers')
        .upsert({
          name: updateData.supplier,
          inn: updateData.supplier_inn || null,
          category: updateData.category
        }, {
          onConflict: 'name'
        });

      if (supplierError) {
        console.warn('⚠️ [INVOICE-UPDATE] Не удалось обновить поставщика:', supplierError);
      } else {
        console.log('✅ [INVOICE-UPDATE] Поставщик обновлен:', updateData.supplier);
      }
    }
    
    console.log('✅ [INVOICE-UPDATE] Счет обновлен:', invoice.id);
    
    return NextResponse.json({ 
      success: true, 
      invoice 
    });
    
  } catch (error: any) {
    console.error('❌ [INVOICE-UPDATE] Ошибка:', error);
    return NextResponse.json({ 
      error: error.message || 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;
    
    console.log('🗑️ [INVOICE-DELETE] Удаление счета:', invoiceId);
    
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);
    
    if (error) {
      console.error('❌ [INVOICE-DELETE] Ошибка удаления:', error);
      return NextResponse.json({ error: 'Ошибка удаления счета' }, { status: 500 });
    }
    
    console.log('✅ [INVOICE-DELETE] Счет удален:', invoiceId);
    
    return NextResponse.json({ 
      success: true 
    });
    
  } catch (error: any) {
    console.error('❌ [INVOICE-DELETE] Ошибка:', error);
    return NextResponse.json({ 
      error: error.message || 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}