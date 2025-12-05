import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import type { ScheduleEntry, SearchType, MasterLists, ScheduleResponseDto } from '@/types';
import { getAcademicWeekInfoFromNumber } from '@/utils/academicWeekUtils';

// --- Константы для логгирования ---
const LOG_PREFIX_HOOK = "🚀 [useSchedule]";
const LOG_STYLE_HOOK = "color: #9C27B0; font-weight: bold;";
const LOG_PREFIX_ERROR = "❌ [useSchedule]";
const LOG_STYLE_ERROR = "color: #F44336; font-weight: bold;";

interface UseScheduleParams {
  searchQuery: string;
  searchType: SearchType;
  academicWeeks: number[];
  dateContext: Date; 
  semester: number;
  refreshTrigger: number;
}

export function useSchedule({
  searchQuery,
  searchType,
  academicWeeks,
  dateContext,
  semester,
  refreshTrigger
}: UseScheduleParams) {
  
  // --- Состояния ---
  const [allLessons, setAllLessons] = useState<ScheduleEntry[]>([]);
  const [masterLists, setMasterLists] = useState<MasterLists>({ group: null, teacher: null, office: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // --- НОВОЕ: Дата последнего успешного обновления ---
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchedRequestsRef = useRef(new Set<string>());
  const currentQueryRef = useRef<string>(`${searchType}-${searchQuery}-${refreshTrigger}`);

  // --- Очистка при смене запроса ---
  useEffect(() => {
    currentQueryRef.current = `${searchType}-${searchQuery}-${refreshTrigger}`;
    setAllLessons([]);
    fetchedRequestsRef.current.clear();
    setIsLoading(true);
    // Сбрасываем дату обновления при начале нового поиска
    setLastUpdated(null);
  }, [searchQuery, searchType, refreshTrigger]);

  // --- Загрузка данных ---
  useEffect(() => {
    let isStale = false;
    const keysRequestedByThisEffect: string[] = [];

    const fetchSchedule = async (week: number, startDateOfWeekStr: string) => {
      const fetchQueryKey = currentQueryRef.current; 

      try {
        const params = new URLSearchParams({
          week: String(week),
          sem: String(semester),
          startDateOfWeek: startDateOfWeekStr,
          _: String(Date.now()) 
        });
        
        if (searchType === 'grupe' || searchType === 'profesori' || searchType === 'aule') {
            params.append(searchType, searchQuery);
        }

        const response = await fetch(`/api/schedule?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Network response was not ok (${response.status})`);
        }

        const data: ScheduleResponseDto = await response.json();
        
        if (!data || !Array.isArray(data.schedule) || !data.masterLists) {
             throw new Error("Некорректный формат данных от сервера.");
        }

        if (isStale || fetchQueryKey !== currentQueryRef.current) {
           return; 
        }

        setAllLessons(prevLessons => {
            const newLessons = data.schedule;
            return [...prevLessons, ...newLessons];
        });

        setMasterLists(data.masterLists); 
        
        // --- НОВОЕ: Обновляем дату последнего обновления при успехе ---
        setLastUpdated(new Date());

      } catch (e: any) {
        console.error(`%c${LOG_PREFIX_ERROR} Ошибка: ${e.message}`, LOG_STYLE_ERROR);
        if (!isStale) {
          setError(`Не удалось загрузить расписание. ${e.message}`);
        }
      } finally {
        if (!isStale) {
          setIsLoading(false);
        }
      }
    };

    if (!searchQuery) {
        setIsLoading(false);
        setError(null);
        return;
    }

    let activeFetches = 0;

    academicWeeks.forEach(weekToFetch => {
        const requestKey = `${searchType}-${searchQuery}-${weekToFetch}-${semester}-${refreshTrigger}`;

        if (fetchedRequestsRef.current.has(requestKey)) {
            return;
        }

        fetchedRequestsRef.current.add(requestKey);
        keysRequestedByThisEffect.push(requestKey);
        activeFetches++;
        
        const { startDate } = getAcademicWeekInfoFromNumber(weekToFetch, dateContext);
        const startDateString = format(startDate, 'yyyy-MM-dd');
        
        fetchSchedule(weekToFetch, startDateString);
    });
    
    if (activeFetches === 0) {
       setIsLoading(false);
       // Если данные взяты из кэша (нет новых запросов), можно тоже обновить таймстамп, 
       // чтобы показать пользователю, что "проверка прошла".
       if (allLessons.length > 0) {
           setLastUpdated(new Date());
       }
    }

    return () => {
        isStale = true;
        keysRequestedByThisEffect.forEach(key => {
          fetchedRequestsRef.current.delete(key);
        });
    }

  }, [searchQuery, searchType, academicWeeks, dateContext, semester, refreshTrigger]);


  const getScheduleForDate = useCallback((date: Date | null, query: string, type: SearchType): ScheduleEntry[] => {
    if (!date || !allLessons || allLessons.length === 0) {
      return [];
    }
    const targetDateStr = format(date, 'yyyy-MM-dd');
    return allLessons.filter(lesson => lesson.date === targetDateStr);
  }, [allLessons]); 

  const searchOptions = useMemo(() => {
     return {
         grupe: masterLists.group || [],
         profesori: masterLists.teacher || [],
         aule: masterLists.office || []
     };
  }, [masterLists]);

  return { 
    isLoading, 
    error, 
    getScheduleForDate, 
    searchOptions, 
    schedule: allLessons,
    // Экспортируем дату обновления
    lastUpdated 
  };
}