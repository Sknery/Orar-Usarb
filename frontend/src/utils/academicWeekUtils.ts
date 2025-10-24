import { startOfWeek, getMonth, getYear, addWeeks, format, startOfMonth, addDays, eachDayOfInterval } from 'date-fns';
// --- ИЗМЕНЕНИЕ: Импортируем 'ro' и ГЛОБАЛЬНЫЕ ОПЦИИ ---
import { ro } from 'date-fns/locale';
import { RO_WEEK_OPTIONS } from './date-config'; // <-- НОВЫЙ ИМПОРТ

/**
 * Определяет дату начала учебного года (первый понедельник сентября).
 * @param year Год
 * @returns Дата первого понедельника сентября
 */
export function getAcademicYearStartDate(year: number): Date {
  const septemberFirst = new Date(year, 8, 1); // 1 сентября
  const dayOfWeek = septemberFirst.getDay(); // 0 = Вс, 1 = Пн, ..., 6 = Сб

  if (dayOfWeek === 1) { // 1 сентября = Пн
    return septemberFirst;
  }
  if (dayOfWeek === 0) { // 1 сентября = Вс
    return localAddDays(septemberFirst, 1); // Начало 2-го (Пн)
  }
  // 1 сентября = Вт(2) ... Сб(6)
  const daysToAdd = 8 - dayOfWeek;
  return localAddDays(septemberFirst, daysToAdd);
}

/**
 * Рассчитывает номер академической недели для заданной даты.
 * @param date Дата для расчета
 * @returns Номер академической недели (начиная с 1)
 */
export function getAcademicWeek(date: Date): number {
  const year = getYear(date);

  // --- ИЗМЕНЕНИЕ: Убираем 'month < 8' и используем 'RO_WEEK_OPTIONS' ---
  
  // 1. Находим понедельник недели, к которой относится 'date'
  // ИСПОЛЬЗУЕМ ГЛОБАЛЬНЫЕ ОПЦИИ
  const mondayOfTargetWeek = startOfWeek(date, RO_WEEK_OPTIONS);

  // 2. Находим дату начала учебного года (первый Пн сентября) для этого *календарного* года
  const currentAcademicYearStartDate = getAcademicYearStartDate(year);

  let academicYearStartDateForCalc: Date;

  // 3. Сравниваем понедельник нашей недели с началом учебного года
  if (mondayOfTargetWeek < currentAcademicYearStartDate) {
    // Если наш понедельник (н-р, 26 августа) раньше начала года (2 сентября),
    // то эта неделя относится к *предыдущему* учебному году.
    academicYearStartDateForCalc = getAcademicYearStartDate(year - 1);
  } else {
    // Иначе (н-р, 2 сентября или позже) она относится к *текущему* учебному году.
    academicYearStartDateForCalc = currentAcademicYearStartDate;
  }

  // 4. Считаем разницу в неделях (наш надежный ручной расчет)
  const diffInMs = mondayOfTargetWeek.getTime() - academicYearStartDateForCalc.getTime();
  // Округляем до ближайшего дня, чтобы избежать проблем с летним/зимним временем
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
  
  // Делим на 7 и добавляем 1
  const weekNumber = Math.floor(diffInDays / 7) + 1;
  // --- КОНЕЦ ИЗМЕНЕНИЯ ---

  return weekNumber;
}

/**
* Возвращает информацию об академической неделе для заданной даты.
* @param date Дата
* @returns Объект с номером недели и датой начала недели (понедельник)
*/
export function getAcademicWeekInfo(date: Date): { weekNumber: number; startDate: Date } {
    const weekNumber = getAcademicWeek(date);
    // --- ИЗМЕНЕНИЕ: Добавляем 'RO_WEEK_OPTIONS' ---
    const startDate = startOfWeek(date, RO_WEEK_OPTIONS);
    return { weekNumber, startDate };
}

/**
 * Получает дату начала недели по ее номеру и году.
 * @param weekNumber Номер академической недели (начиная с 1)
 * @param forDate Дата, помогающая определить учебный год (обычно selectedDate)
 * @returns 
 */
export function getAcademicWeekInfoFromNumber(weekNumber: number, forDate: Date): { weekNumber: number; startDate: Date } {
    const year = getYear(forDate);
    
    // --- ИЗМЕНЕНИЕ: Логика, аналогичная getAcademicWeek ---
    const mondayOfTargetWeek = startOfWeek(forDate, RO_WEEK_OPTIONS);
    const currentAcademicYearStartDate = getAcademicYearStartDate(year);

    let academicYearStartYear: number;
    
    if (mondayOfTargetWeek < currentAcademicYearStartDate) {
      academicYearStartYear = year - 1;
    } else {
      academicYearStartYear = year;
    }
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---

    const academicYearStartDate = getAcademicYearStartDate(academicYearStartYear);

    // Добавляем (weekNumber - 1) недель к началу учебного года
    const startDate = addWeeks(academicYearStartDate, weekNumber - 1);
    return { weekNumber, startDate };
}

/**
 * Возвращает массив всех уникальных академических недель,
 * видимых в календаре MonthView для заданной даты.
 * @param selectedDate 
 * @returns 
 */
export function getVisibleWeeks(selectedDate: Date): number[] {
    const monthStart = startOfMonth(selectedDate);
    // --- ИЗМЕНЕНИЕ: Добавляем 'RO_WEEK_OPTIONS' ---
    const viewStartDate = startOfWeek(monthStart, RO_WEEK_OPTIONS);
    // Календарь показывает 6 недель (42 дня)
    const viewEndDate = localAddDays(viewStartDate, 41); 
    
    const days = eachDayOfInterval({ start: viewStartDate, end: viewEndDate });
    const weeks = new Set<number>(days.map(day => getAcademicWeek(day)));
    
    return Array.from(weeks);
}


// Вспомогательная функция addDays (если ее нет)
// Используем 'local' версию, чтобы избежать конфликта имен при импорте
function localAddDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

