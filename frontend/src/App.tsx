import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSchedule } from '@/hooks/useSchedule';
import { DesktopView } from './views/DesktopView';
import { MobileView } from './views/MobileView';
import type { SearchType, SearchOption } from './types';
// --- ИЗМЕНЕНИЕ: Импортируем утилиту для получения видимых недель ---
import { getVisibleWeeks } from './utils/academicWeekUtils'; 
// --- КОНЕЦ ИЗМЕНЕНИЯ ---

// --- Константы для логгирования (без изменений) ---
const LOG_PREFIX_APP = "🚀 [App.tsx]";
const LOG_STYLE_APP = "color: #4CAF50; font-weight: bold;";
const LOG_PREFIX_STATE = "🔄 [App.tsx]";
const LOG_STYLE_STATE = "color: #2196F3;";
const LOG_PREFIX_DATA = "📦 [App.tsx]";
const LOG_STYLE_DATA = "color: #FF9800;";


const defaultQueries: Record<SearchType, string> = {
  grupe: "IA-211",
  profesori: "",
  aule: "",
};


function App() {
  console.log(`%c${LOG_PREFIX_APP} Рендер компонента`, LOG_STYLE_APP);

  // --- Состояния (без изменений) ---
  const [searchType, setSearchType] = useLocalStorage<SearchType>("schedule:searchType", "grupe");

  const [searchQueries, setSearchQueries] = useLocalStorage<Record<SearchType, string>>(
    "schedule:searchQueries",
    defaultQueries
  );

  const initialDate = useMemo(() => new Date(), []);

  const [storedDate, setStoredDate] = useLocalStorage<string | null>(
    "schedule:selectedDate",
    initialDate.toISOString()
  );

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1280);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  // --- Производные состояния ---
  const selectedDate = useMemo(() => {
    return storedDate ? new Date(storedDate) : initialDate;
  }, [storedDate, initialDate]);

  // --- ИЗМЕНЕНИЕ: Считаем все видимые недели ---
  const visibleWeeks = useMemo(() => {
      console.log(`%c${LOG_PREFIX_DATA} Пересчет видимых недель для даты: ${selectedDate}`, LOG_STYLE_DATA);
      return getVisibleWeeks(selectedDate);
  }, [selectedDate]);
  // --- КОНЕЦ ИЗМЕНЕНИЯ ---

  const currentSemester = useMemo(() => (selectedDate.getMonth() < 1 || selectedDate.getMonth() > 6 ? 1 : 2), [selectedDate]);
  
  const searchQuery = useMemo(() => searchQueries[searchType] || "", [searchQueries, searchType]);

  // --- Параметры для хука useSchedule ---
  const scheduleParams = useMemo(() => ({
    searchQuery,
    searchType,
    // --- ИЗМЕНЕНИЕ: Передаем массив недель и контекст даты ---
    academicWeeks: visibleWeeks,
    dateContext: selectedDate, // Для определения учебного года
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---
    semester: currentSemester,
  }), [searchQuery, searchType, visibleWeeks, selectedDate, currentSemester]);

  console.log(`%c${LOG_PREFIX_DATA} Параметры для useSchedule:`, LOG_STYLE_DATA, scheduleParams);

  // --- Хук для получения данных (без изменений) ---
  const { isLoading, error, getScheduleForDate, searchOptions, schedule } = useSchedule(scheduleParams);

  // --- Обработчики событий (без изменений) ---
  const handleSetSearchType = (type: SearchType) => {
    console.log(`%c${LOG_PREFIX_STATE} Тип поиска изменен: ${type}`, LOG_STYLE_STATE);
    setSearchType(type);
  };

  const handleSetSearchQuery = (query: string) => {
    setSearchQueries(prevQueries => {
      const newQueries = { ...prevQueries, [searchType]: query };
      console.log(`%c${LOG_PREFIX_STATE} Запрос поиска изменен: ${JSON.stringify(newQueries)}`, LOG_STYLE_STATE);
      return newQueries;
    });
  };

  const handleSetSelectedDate = (date: Date | null) => {
     const newStoredDate = date ? date.toISOString() : null;
     console.log(`%c${LOG_PREFIX_STATE} Дата изменена: ${newStoredDate}`, LOG_STYLE_STATE);
     setStoredDate(newStoredDate);
  };

  const handleSearchSelect = (option: SearchOption) => {
    console.log(`%c${LOG_PREFIX_APP} Выбрано из поиска: ${option.name}`, LOG_STYLE_APP);
    handleSetSearchQuery(option.name);
    setIsSearchOpen(false);
  };

  // --- Эффекты (без изменений) ---
  useEffect(() => {
    document.documentElement.classList.add('dark');

    const handleResize = () => {
      const newIsDesktop = window.innerWidth >= 1280;
      setIsDesktop(newIsDesktop);
    };
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    const timer = setTimeout(() => {
        setIsInitialLoad(false)
    }, 10);

    const setAppHeight = () => {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };
    window.addEventListener('resize', setAppHeight);
    setAppHeight();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener('resize', setAppHeight);
      clearTimeout(timer);
    }
  }, []);

  console.log(`%c${LOG_PREFIX_DATA} Состояние рендера:`, LOG_STYLE_DATA, { isLoading, error: error ?? 'Нет' });

  // --- Общие пропсы для View ---
  const commonProps = {
    isLoading,
    error,
    selectedDate: selectedDate,
    setSelectedDate: handleSetSelectedDate,
    getScheduleForDate,
    searchQuery,
    setSearchQuery: handleSetSearchQuery,
    searchType,
    setSearchType: handleSetSearchType,
    searchOptions: searchOptions,
    setIsSearchOpen,
    schedule // Передаем накопленный schedule
  };

  return (
    <main className="dark bg-background text-foreground h-[var(--app-height)] w-full overflow-hidden p-2 sm:p-4 flex flex-col
                   xl:max-w-[1200px] xl:mx-auto xl:my-4 xl:rounded-xl xl:shadow-2xl xl:h-[calc(var(--app-height)-2rem)]">

      <header className={cn(
        "flex-shrink-0 mb-4 px-2 sm:px-0 flex items-center justify-center sm:justify-center gap-3 mt-2 sm:mt-0 xl:hidden",
        !isHeaderVisible && "hidden"
      )}>
        <img src="/logo.png" alt="Logo" className="h-10 w-auto rounded-full" />
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Orarul Cursurilor</h1>
      </header>

      {isDesktop ? (
        <DesktopView {...commonProps} />
      ) : (
        <MobileView {...commonProps} isInitialLoad={isInitialLoad} setIsHeaderVisible={setIsHeaderVisible} />
      )}

      {/* Окно поиска (без изменений) */}
      <CommandDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <CommandInput placeholder={`Căutare (${searchType})...`} />
        {isLoading && !searchOptions[searchType]?.length ? (
          <div className="p-6 text-center text-sm">Se încarcă...</div>
        ) : (
          <CommandList>
            <CommandEmpty>Niciun rezultat.</CommandEmpty>
            {searchOptions[searchType] && searchOptions[searchType].length > 0 && (
              <CommandGroup heading="Rezultate">
                {searchOptions[searchType].map((item: SearchOption) => ( // Явно указываем тип 'SearchOption'
                  <CommandItem key={item.id} value={item.name} onSelect={() => handleSearchSelect(item)}>
                    {item.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        )}
      </CommandDialog>
    </main>
  );
}

export default App;
