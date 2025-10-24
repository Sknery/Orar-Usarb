import { startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
// --- ИЗМЕНЕНИЕ: Импортируем ГЛОБАЛЬНЫЕ ОПЦИИ ---
import { RO_WEEK_OPTIONS } from './date-config';

/**
 * Возвращает массив дат для недели, содержащей указанную дату.
 * @param date - Любая дата внутри нужной недели.
 * @returns Массив объектов Date от понедельника до воскресенья.
 */
export function getWeekDays(date: Date): Date[] {
  // --- ИЗМЕНЕНИЕ: Используем ГЛОБАЛЬНЫЕ ОПЦИИ ---
  const weekStart = startOfWeek(date, RO_WEEK_OPTIONS); 
  const weekEnd = endOfWeek(date, RO_WEEK_OPTIONS);
  // --- КОНЕЦ ИЗМЕНЕНИЯ ---
  return eachDayOfInterval({ start: weekStart, end: weekEnd });
}

