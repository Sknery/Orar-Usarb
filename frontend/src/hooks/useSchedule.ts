import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
// --- ИЗМЕНЕНИЕ: Убеждаемся, что 'format' импортирован ---
import { format, getYear } from 'date-fns';
import type { ScheduleEntry, SearchOption, SearchType, MasterLists, ScheduleResponseDto } from '@/types';
// --- ИЗМЕНЕНИЕ: Импортируем утилиты для расчета дат ---
import { getAcademicWeekInfoFromNumber } from '@/utils/academicWeekUtils';

// --- Константы для логгирования (без изменений) ---
const LOG_PREFIX_HOOK = "🚀 [useSchedule.ts]";
const LOG_STYLE_HOOK = "color: #9C27B0; font-weight: bold;";
const LOG_PREFIX_FETCH = "🔄 [useSchedule.ts]";
const LOG_STYLE_FETCH = "color: #FF5722;";
const LOG_PREFIX_REQ = "📦 [useSchedule.ts]";
const LOG_STYLE_REQ = "color: #00BCD4;";
const LOG_PREFIX_RESP = "✅ [useSchedule.ts]";
const LOG_STYLE_RESP = "color: #8BC34A; font-weight: bold;";
const LOG_PREFIX_ERROR = "❌ [useSchedule.ts]";
const LOG_STYLE_ERROR = "color: #F44336; font-weight: bold;";
const LOG_PREFIX_FILTER = "🔍 [useSchedule.ts]";
const LOG_STYLE_FILTER = "color: #795548;";
const LOG_PREFIX_FINISH = "🏁 [useSchedule.ts]";
const LOG_STYLE_FINISH = "color: #607D8B;";
// --- ИЗМЕНЕНИЕ: Новый логгер ---
const LOG_PREFIX_API_DATA = "API_DATA [useSchedule.ts]";
const LOG_STYLE_API_DATA = "color: #FF00FF; font-weight: bold; background: #333;";
// --- КОНЕЦ ИЗМЕНЕНИЯ ---

// --- Типизация параметров хука ---
interface UseScheduleParams {
  searchQuery: string;
  searchType: SearchType;
  // --- ИЗМЕНЕНИЕ: Принимаем массив недель и дату для контекста ---
  academicWeeks: number[];
  dateContext: Date; // Нужна для определения правильного учебного года
  // --- КОНЕЦ ИЗМЕНЕНИЯ ---
  semester: number;
}


export function useSchedule({
  searchQuery,
  searchType,
  // --- ИЗМЕНЕНИЕ: Используем новые параметры ---
  academicWeeks,
  dateContext,
  // --- КОНЕЦ ИЗМЕНЕНИЯ ---
  semester,
}: UseScheduleParams) {
  console.log(`%c${LOG_PREFIX_HOOK} Хук useSchedule. Требуемые недели: [${academicWeeks.join(', ')}]`, LOG_STYLE_HOOK);

  // --- Состояния ---
  // --- ИЗМЕНЕНИЕ: Храним ВСЕ загруженные пары ---
  const [allLessons, setAllLessons] = useState<ScheduleEntry[]>([]);
  // --- КОНЕЦ ИЗМЕНЕНИЯ ---
  const [masterLists, setMasterLists] = useState<MasterLists>({ group: null, teacher: null, office: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Ref для отслеживания уже запрошенных недель ---
  const fetchedRequestsRef = useRef(new Set<string>());

  // ---
  // ---
  // --- НОВЫЙ ЭФФЕКТ ДЛЯ ОЧИСТКИ КЭША ---
  // ---
  // ---
  // Этот эффект следит за searchQuery и searchType.
  // Как только они меняются (пользователь меняет вкладку или выбирает
  // другой поиск), мы полностью очищаем старые данные.
  useEffect(() => {
    console.log(`%c${LOG_PREFIX_HOOK} Смена контекста: ${searchType} / ${searchQuery}. Очистка...`, LOG_STYLE_HOOK);
    // Сбрасываем уроки
    setAllLessons([]);
    // Сбрасываем кэш запрошенных недель
    fetchedRequestsRef.current.clear();
    // Устанавливаем isLoading, так как мы будем загружать новые данные
    setIsLoading(true);
  }, [searchQuery, searchType]); // <-- Этот эффект зависит ТОЛЬКО от searchQuery и searchType
  // ---
  // ---
  // --- КОНЕЦ НОВОГО ЭФФЕКТА ---
  // ---
  // ---

  // --- Эффект для загрузки данных ---
  useEffect(() => {
    
    // --- ИЗМЕНЕНИЕ: Функция теперь ожидает 'startDateOfWeekStr' ---
    const fetchSchedule = async (week: number, startDateOfWeekStr: string) => {
      // setIsLoading(true); // Управляется снаружи
      setError(null);

      try {
        const params = new URLSearchParams({
          week: String(week),
          sem: String(semester),
          // --- ИЗМЕНЕНИЕ: Отправляем 'yyyy-MM-dd' строку ---
          startDateOfWeek: startDateOfWeekStr,
        });
        
        // --- ИЗМЕНЕНИЕ: Проверяем, что searchType не 'grupe', 'profesori' или 'aule' ---
        // Это исправление для типа, чтобы params.append работал
        if (searchType === 'grupe' || searchType === 'profesori' || searchType === 'aule') {
            params.append(searchType, searchQuery);
        }
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        console.log(`%c${LOG_PREFIX_REQ} Отправка запроса на /api/schedule со параметрами: ${params.toString()}`, LOG_STYLE_REQ);

        const response = await fetch(`/api/schedule?${params.toString()}`);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Network response was not ok (${response.status}): ${errorText}`);
        }

        const data: ScheduleResponseDto = await response.json();
        
        // --- ИЗМЕНЕНИЕ: ЛОГИРОВАНИЕ ---
        console.log(`%c${LOG_PREFIX_API_DATA} ПОЛУЧЕНЫ ДАННЫЕ (Week ${week}, Date ${startDateOfWeekStr}):`, LOG_STYLE_API_DATA, data);
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        console.log(`%c${LOG_PREFIX_RESP} Данные успешно получены (Ключ: ${searchType}-${searchQuery}-${week}):`, LOG_STYLE_RESP, { scheduleLength: data.schedule?.length ?? 0 });

        if (!data || !Array.isArray(data.schedule) || !data.masterLists) {
             console.error(`%c${LOG_PREFIX_ERROR} Некорректный формат данных от бэкенда.`, LOG_STYLE_ERROR, data);
             throw new Error("Некорректный формат данных от сервера.");
        }

        // --- ИЗМЕНЕНИЕ: Добавляем данные, а не заменяем ---
        // Эта логика теперь безопасна, так как allLessons очищается
        // при смене query/type благодаря новому useEffect.
        // Мы просто добавляем уроки (для разных недель одного запроса).
        setAllLessons(prevLessons => {
            return [...prevLessons, ...data.schedule];
        });
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        setMasterLists(data.masterLists); // Обновляем masterLists

      } catch (e: any) {
        console.error(`%c${LOG_PREFIX_ERROR} Ошибка при загрузке расписания: ${e.message}`, LOG_STYLE_ERROR, e);
        setError(`Не удалось загрузить расписание. ${e.message}`);
        // Не очищаем расписание при ошибке, чтобы не терять другие недели
      } finally {
        setIsLoading(false);
        console.log(`%c${LOG_PREFIX_FINISH} fetchSchedule завершен (Ключ: ${searchType}-${searchQuery}-${week}).`, LOG_STYLE_FINISH);
      }
    };
    // --- КОНЕЦ ИЗМЕНЕНИЯ ФУНКЦИИ ---


    // Если нет searchQuery, сбрасываем состояние и выходим
    if (!searchQuery) {
        console.log(`%c${LOG_PREFIX_FETCH} Нет searchQuery, сброс состояния.`, LOG_STYLE_FETCH);
        // allLessons и fetchedRequestsRef УЖЕ БЫЛИ очищены
        // новым useEffect. Нам нужно только выключить загрузку.
        setIsLoading(false);
        setError(null);
        return;
    }

    // --- ИЗМЕНЕНИЕ: Запускаем загрузку для каждой требуемой недели ---
    let activeFetches = 0;
    // setIsLoading(true); // <-- Это уже делается в новом useEffect

    academicWeeks.forEach(weekToFetch => {
        const requestKey = `${searchType}-${searchQuery}-${weekToFetch}-${semester}`;

        // Если ключ уже есть в Set, значит, мы его *уже* запрашивали (или запрашиваем)
        if (fetchedRequestsRef.current.has(requestKey)) {
            // console.log(`%c${LOG_PREFIX_FETCH} Ключ ${requestKey} уже в обработке, пропускаем.`, LOG_STYLE_FETCH);
            return;
        }

        // Отмечаем, что мы начали запрос по этому ключу
        fetchedRequestsRef.current.add(requestKey);
        activeFetches++;
        
        console.log(`%c${LOG_PREFIX_FETCH} Запуск fetchSchedule... Ключ: ${requestKey}`, LOG_STYLE_FETCH);
        
        // --- Получаем startDateOfWeek для конкретной недели ---
        // Мы используем dateContext (selectedDate из App.tsx) чтобы правильно определить учебный год
        const { startDate } = getAcademicWeekInfoFromNumber(weekToFetch, dateContext);
        
        // --- ИЗМЕНЕНИЕ: Конвертируем в 'yyyy-MM-dd' ВМЕСТО .toISOString() ---
        const startDateString = format(startDate, 'yyyy-MM-dd');
        fetchSchedule(weekToFetch, startDateString);
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---
    });
    
    if (activeFetches === 0) {
        setIsLoading(false); // Если новых запросов не было, выключаем загрузку
    }
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---

  // --- ИЗМЕНЕНИЕ: Зависимости эффекта ---
  // Этот эффект теперь зависит от ВСЕХ параметров.
  // Новый useEffect выше сработает ПЕРВЫМ при смене query/type,
  // очистит данные, а ЗАТЕМ сработает этот эффект и начнет
  // новую загрузку.
  }, [searchQuery, searchType, academicWeeks, dateContext, semester]); 
  // --- КОНЕЦ ИЗМЕНЕНИЯ ---


  // --- Мемоизированная функция фильтрации ---
  // ---
  // --- 
  // --- ОКОНЧАТЕЛЬНОЕ ИСПРАВЛЕНИЕ БАГА ---
  // ---
  // ---
  const getScheduleForDate = useCallback((date: Date | null, query: string, type: SearchType): ScheduleEntry[] => {
    
    // 1. Проверяем, что у нас есть дата и уроки
    if (!date || !allLessons || allLessons.length === 0) {
      return [];
    }
    
    // Параметры 'query' и 'type' БОЛЬШЕ НЕ НУЖНЫ для фильтрации.
    // `allLessons` УЖЕ содержит данные ТОЛЬКО для текущего
    // `searchQuery` и `searchType` (благодаря новому useEffect).
    // Нам нужно фильтровать ТОЛЬКО ПО ДАТЕ.
    
    // 2. Получаем дату в нужном формате
    const targetDateStr = format(date, 'yyyy-MM-dd');

    // 3. Фильтруем!
    const filtered = allLessons.filter(lesson => {
      // Условие 1: Дата должна совпадать
      const dateMatch = lesson.date === targetDateStr;
      return dateMatch;
    });
    
    // console.log(`%c${LOG_PREFIX_FILTER} Фильтрация для ${targetDateStr}. Найдено ${filtered.length} из ${allLessons.length}`, LOG_STYLE_FILTER);
    
    return filtered;
  }, [allLessons]); // Зависимость `allLessons` правильная
  // ---
  // --- 
  // --- КОНЕЦ ИСПРАВЛЕНИЯ БАГА ---
  // ---
  // ---

  // --- Мемоизированные опции для поиска ---
  const searchOptions = useMemo(() => {
     return {
         grupe: masterLists.group || [],
         profesori: masterLists.teacher || [],
         aule: masterLists.office || []
     };
  }, [masterLists]);


  // --- Возвращаемое значение хука ---
  // --- ИЗМЕНЕНИЕ: Возвращаем `allLessons` как `schedule` ---
  return { isLoading, error, getScheduleForDate, searchOptions, schedule: allLessons };
  // --- КОНЕЦ ИЗМЕНЕНИЯ ---
}

