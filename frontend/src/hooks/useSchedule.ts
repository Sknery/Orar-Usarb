import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import type { ScheduleEntry, ScheduleData, SearchType, SearchOption } from '@/types';

export function useSchedule() {
  const [apiSchedule, setApiSchedule] = useState<ScheduleData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchOptions, setSearchOptions] = useState<Record<SearchType, SearchOption[]>>({
    grupe: [],
    profesori: [],
    aule: [],
  });

  useEffect(() => {
    const fetchSchedule = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/schedule');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const rawSchedule: ScheduleEntry[] = await response.json();

        const grupe = new Set<string>();
        const profesori = new Set<string>();
        const aule = new Set<string>();

        rawSchedule.forEach(entry => {
          grupe.add(entry.group);
          profesori.add(entry.professor);
          aule.add(entry.classroom);
        });

        const setToOptions = (set: Set<string>) => Array.from(set).sort().map(item => ({ id: item, name: item }));

        setSearchOptions({
          grupe: setToOptions(grupe),
          profesori: setToOptions(profesori),
          aule: setToOptions(aule)
        });

        const groupedSchedule = rawSchedule.reduce<ScheduleData>((acc, entry) => {
          const dateKey = entry.date;
          if (!acc[dateKey]) {
            acc[dateKey] = [];
          }
          acc[dateKey].push(entry);
          return acc;
        }, {});

        setApiSchedule(groupedSchedule);
      } catch (e) {
        if (e instanceof Error) {
            setError(`Nu s-a putut încărca orarul. Verificați conexiunea și asigurați-vă că serverul API este pornit. (${e.message})`);
        } else {
            setError("A apărut o eroare necunoscută la încărcarea orarului.");
        }
        console.error("Failed to fetch schedule:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  const getScheduleForDate = useCallback((date: Date | null, searchQuery: string, searchType: SearchType): ScheduleEntry[] => {
    if (!date || !searchQuery) return [];
    const daySchedule = apiSchedule[format(date, 'yyyy-MM-dd')] || [];

    switch (searchType) {
        case 'profesori':
            return daySchedule.filter(lesson => lesson.professor === searchQuery);
        case 'aule': {
            return daySchedule.filter(lesson => lesson.classroom === searchQuery);
        }
        case 'grupe':
        default:
            return daySchedule.filter(lesson => lesson.group === searchQuery);
    }
  }, [apiSchedule]);

  return { isLoading, error, getScheduleForDate, searchOptions };
}
