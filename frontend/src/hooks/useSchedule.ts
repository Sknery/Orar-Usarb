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
        params.append(searchType, searchQuery);

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
        setAllLessons(prevLessons => {
            // Создаем Set дат, которые есть в новом пакете данных
            const newLessonDates = new Set(data.schedule.map(l => l.date));
            
            // Фильтруем старые уроки, УБИРАЯ те, которые относятся к датам из нового пакека
            // Это гарантирует, что если расписание на неделю обновилось, мы покажем новые данные
            const oldLessonsToKeep = prevLessons.filter(l => !newLessonDates.has(l.date));
            
            // Возвращаем старые уроки (с других недель) + новые уроки
            return [...oldLessonsToKeep, ...data.schedule];
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
        setAllLessons([]);
        fetchedRequestsRef.current.clear(); // Сбрасываем кэш запросов
        setIsLoading(false);
        setError(null);
        return;
    }

    // --- ИЗМЕНЕНИЕ: Запускаем загрузку для каждой требуемой недели ---
    let activeFetches = 0;
    setIsLoading(true); // Показываем загрузку, если начинаем fetch

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
  }, [searchQuery, searchType, academicWeeks, dateContext, semester]); 
  // --- КОНЕЦ ИЗМЕНЕНИЯ ---


  // --- Мемоизированная функция фильтрации ---
  const getScheduleForDate = useCallback((date: Date | null, query: string, type: SearchType): ScheduleEntry[] => {
    if (!date || !allLessons || allLessons.length === 0) {
      return [];
    }
    const targetDateStr = format(date, 'yyyy-MM-dd');
    
    // --- ИЗМЕНЕНИЕ: Фильтруем по `allLessons` ---
    const filtered = allLessons.filter(lesson => lesson.date === targetDateStr);
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---
    
    // console.log(`%c${LOG_PREFIX_FILTER} Фильтрация getScheduleForDate для даты ${targetDateStr}. Найдено ${filtered.length}`, LOG_STYLE_FILTER);
    return filtered;
  }, [allLessons]); // Зависит только от `allLessons`


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

