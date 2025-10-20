import { startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

/**
 * Возвращает массив дат для недели, содержащей указанную дату.
 * @param date - Любая дата внутри нужной недели.
 * @returns Массив объектов Date от понедельника до воскресенья.
 */
export function getWeekDays(date: Date): Date[] {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Неделя начинается с понедельника
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: weekStart, end: weekEnd });
}

