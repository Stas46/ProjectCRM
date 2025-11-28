/**
 * Personal Data Tools
 * Функции для работы с личными данными пользователя
 */

import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

// ============================================
// ТИПЫ
// ============================================

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  birthday: string | null;
  home_address: string | null;
  home_coordinates: { lat: number; lon: number } | null;
  work_address: string | null;
  work_coordinates: { lat: number; lon: number } | null;
  car_plate: string | null;
  work_hours: { start: string; end: string; days: number[] } | null;
  transport_preference: 'car' | 'metro' | 'walk' | 'mixed';
  preferences: any;
  timezone: string;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  name: string;
  relation: string;
  birthday: string | null;
  interests: string[];
  gift_history: Array<{ date: string; gift: string; liked: boolean; cost: number }>;
  important_dates: Array<{ type: string; date: string; title: string }>;
  notes: string | null;
}

export interface UserEvent {
  id: string;
  user_id: string;
  title: string;
  event_type: string;
  event_date: string;
  event_time: string | null;
  recurrence: string | null;
  location: string | null;
  reminder_settings: Array<{ days_before: number; sent: boolean }>;
  related_family_id: string | null;
  notes: string | null;
  is_completed: boolean;
}

export interface ConversationContext {
  id: string;
  user_id: string;
  context_type: 'recent_topic' | 'preference' | 'fact' | 'pattern';
  key: string;
  value: any;
  confidence: number;
  source: 'user_said' | 'inferred' | 'api';
  last_updated: string;
  expires_at: string | null;
}

export interface UserLocation {
  id: string;
  user_id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lon: number } | null;
  category: 'home' | 'work' | 'family' | 'shopping' | 'leisure';
  visit_frequency: 'daily' | 'weekly' | 'monthly' | 'rarely';
  notes: string | null;
}

// ============================================
// ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
// ============================================

export async function getUserProfile(userId: string): Promise<{ data: UserProfile | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      return { data: null, error: error.message };
    }

    return { data: data as UserProfile, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

export async function upsertUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<{ data: UserProfile | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, ...profileData }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as UserProfile, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// ============================================
// СЕМЬЯ
// ============================================

export async function getFamilyMembers(userId: string): Promise<{ data: FamilyMember[]; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_family')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data as FamilyMember[], error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}

export async function addFamilyMember(userId: string, memberData: Partial<FamilyMember>): Promise<{ data: FamilyMember | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_family')
      .insert({ user_id: userId, ...memberData })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as FamilyMember, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

export async function updateFamilyMember(memberId: string, updates: Partial<FamilyMember>): Promise<{ data: FamilyMember | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_family')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as FamilyMember, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// ============================================
// СОБЫТИЯ
// ============================================

export async function getUpcomingEvents(userId: string, daysAhead: number = 30): Promise<{ data: UserEvent[]; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('user_events')
      .select('*, user_family(*)')
      .eq('user_id', userId)
      .gte('event_date', today)
      .lte('event_date', futureDateStr)
      .eq('is_completed', false)
      .order('event_date');

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data as UserEvent[], error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}

export async function addEvent(userId: string, eventData: Partial<UserEvent>): Promise<{ data: UserEvent | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_events')
      .insert({ user_id: userId, ...eventData })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as UserEvent, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// ============================================
// КОНТЕКСТ ДИАЛОГА (ПАМЯТЬ)
// ============================================

export async function saveContext(
  userId: string,
  contextType: ConversationContext['context_type'],
  key: string,
  value: any,
  options?: { ttlDays?: number; confidence?: number; source?: ConversationContext['source'] }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    
    let expiresAt = null;
    if (options?.ttlDays) {
      const expires = new Date();
      expires.setDate(expires.getDate() + options.ttlDays);
      expiresAt = expires.toISOString();
    }

    const data = {
      user_id: userId,
      context_type: contextType,
      key,
      value,
      confidence: options?.confidence || 1.0,
      source: options?.source || 'user_said',
      expires_at: expiresAt,
      last_updated: new Date().toISOString()
    };

    // Сначала пробуем найти существующую запись
    const { data: existing } = await supabase
      .from('conversation_context')
      .select('id')
      .eq('user_id', userId)
      .eq('key', key)
      .single();

    let error;
    if (existing) {
      // Обновляем существующую
      const result = await supabase
        .from('conversation_context')
        .update(data)
        .eq('id', existing.id);
      error = result.error;
    } else {
      // Создаём новую
      const result = await supabase
        .from('conversation_context')
        .insert(data);
      error = result.error;
    }

    if (error) {
      console.error('saveContext error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('saveContext exception:', error);
    return { success: false, error: error.message };
  }
}

export async function getContext(
  userId: string,
  contextType?: ConversationContext['context_type']
): Promise<{ data: ConversationContext[]; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('conversation_context')
      .select('*')
      .eq('user_id', userId)
      .or('expires_at.is.null,expires_at.gte.' + new Date().toISOString());

    if (contextType) {
      query = query.eq('context_type', contextType);
    }

    const { data, error } = await query.order('last_updated', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data as ConversationContext[], error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}

// ============================================
// МЕСТА
// ============================================

export async function getUserLocations(userId: string): Promise<{ data: UserLocation[]; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_locations')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data as UserLocation[], error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}

export async function addLocation(userId: string, locationData: Partial<UserLocation>): Promise<{ data: UserLocation | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_locations')
      .insert({ user_id: userId, ...locationData })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as UserLocation, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// ============================================
// ПРОАКТИВНЫЕ ДЕЙСТВИЯ БОТА
// ============================================

export async function createProactiveAction(
  userId: string,
  actionType: 'question' | 'suggestion' | 'reminder' | 'alert',
  topic: string,
  message: string
): Promise<{ data: any; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('bot_proactive_actions')
      .insert({
        user_id: userId,
        action_type: actionType,
        topic,
        message,
        is_answered: false
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

export async function answerProactiveAction(
  actionId: string,
  response: string,
  responseData?: any
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('bot_proactive_actions')
      .update({
        user_response: response,
        response_data: responseData,
        is_answered: true,
        answered_at: new Date().toISOString()
      })
      .eq('id', actionId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUnansweredActions(userId: string): Promise<{ data: any[]; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('bot_proactive_actions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_answered', false)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}

// ============================================
// УТИЛИТЫ
// ============================================

/**
 * Форматировать события для AI
 */
export function formatEventsForAI(events: UserEvent[]): string {
  if (!events || events.length === 0) {
    return 'Нет предстоящих событий.';
  }

  let result = '📅 **ПРЕДСТОЯЩИЕ СОБЫТИЯ:**\n\n';

  events.forEach((event) => {
    const date = new Date(event.event_date);
    const daysUntil = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const emoji = event.event_type === 'birthday' ? '🎂' : event.event_type === 'anniversary' ? '💍' : '📌';

    result += `${emoji} **${event.title}**\n`;
    result += `   Дата: ${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    
    if (daysUntil === 0) {
      result += ' (сегодня!)';
    } else if (daysUntil === 1) {
      result += ' (завтра)';
    } else if (daysUntil <= 7) {
      result += ` (через ${daysUntil} дн.)`;
    }

    if (event.notes) {
      result += `\n   ${event.notes}`;
    }
    result += '\n\n';
  });

  return result;
}

/**
 * Форматировать семью для AI
 */
export function formatFamilyForAI(family: FamilyMember[]): string {
  if (!family || family.length === 0) {
    return 'Информация о семье не добавлена.';
  }

  let result = '👨‍👩‍👧‍👦 **СЕМЬЯ:**\n\n';

  family.forEach((member) => {
    const relationEmoji: Record<string, string> = {
      spouse: '💑',
      son: '👦',
      daughter: '👧',
      mother: '👩',
      father: '👨',
      brother: '👨‍👦',
      sister: '👩‍👦',
      friend: '🤝'
    };

    const emoji = relationEmoji[member.relation] || '👤';
    result += `${emoji} **${member.name}** (${member.relation})\n`;

    if (member.birthday) {
      const bday = new Date(member.birthday);
      result += `   🎂 ДР: ${bday.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}\n`;
    }

    if (member.interests && member.interests.length > 0) {
      result += `   💡 Интересы: ${member.interests.join(', ')}\n`;
    }

    result += '\n';
  });

  return result;
}

/**
 * Определить ближайший день рождения в семье
 */
export function getNextBirthday(family: FamilyMember[]): { member: FamilyMember; daysUntil: number } | null {
  if (!family || family.length === 0) return null;

  const today = new Date();
  const currentYear = today.getFullYear();

  let closest: { member: FamilyMember; daysUntil: number } | null = null;

  family.forEach((member) => {
    if (!member.birthday) return;

    const bday = new Date(member.birthday);
    const thisYearBday = new Date(currentYear, bday.getMonth(), bday.getDate());
    
    if (thisYearBday < today) {
      thisYearBday.setFullYear(currentYear + 1);
    }

    const daysUntil = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (!closest || daysUntil < closest.daysUntil) {
      closest = { member, daysUntil };
    }
  });

  return closest;
}
