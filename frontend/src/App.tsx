import { useState, useEffect, useMemo } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSchedule } from '@/hooks/useSchedule';
import { DesktopView } from './views/DesktopView';
import { MobileView } from './views/MobileView';
import type { SearchType, SearchOption } from './types';
import { getVisibleWeeks } from './utils/academicWeekUtils';
import { NotesProvider } from './contexts/NotesContext';

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

  // --- Состояния ---
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
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  // --- Состояние для темы ---
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('schedule:theme', 'dark');

  // --- Функция переключения темы ---
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };
  
  // --- Эффект для применения темы к <html> ---
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);
  // --- КОНЕЦ НОВОГО КОДА ---


  // --- Производные состояния ---
  const selectedDate = useMemo(() => {
    return storedDate ? new Date(storedDate) : initialDate;
  }, [storedDate, initialDate]);

  const visibleWeeks = useMemo(() => {
      console.log(`%c${LOG_PREFIX_DATA} Пересчет видимых недель для даты: ${selectedDate}`, LOG_STYLE_DATA);
      return getVisibleWeeks(selectedDate);
  }, [selectedDate]);

  const currentSemester = useMemo(() => (selectedDate.getMonth() < 1 || selectedDate.getMonth() > 6 ? 1 : 2), [selectedDate]);
  
  const searchQuery = useMemo(() => searchQueries[searchType] || "", [searchQueries, searchType]);

  // --- Параметры для хука useSchedule ---
  const scheduleParams = useMemo(() => ({
    searchQuery,
    searchType,
    academicWeeks: visibleWeeks,
    dateContext: selectedDate, // Для определения учебного года
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

  // --- Эффекты ---
  useEffect(() => {
    const handleResize = () => {
      const newIsDesktop = window.innerWidth >= 1024;
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
  }, []); // <-- Зависимость 'theme' здесь не нужна

  console.log(`%c${LOG_PREFIX_DATA} Состояние рендера:`, LOG_STYLE_DATA, { isLoading, error: error ?? 'Нет' });

  // --- ОБНОВЛЕНИЕ: Передаем ВСЕ пропсы в commonProps ---
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
  // --- КОНЕЦ ОБНОВЛЕНИЯ ---

  return (
    <NotesProvider>
      <main className="bg-background text-foreground h-[var(--app-height)] w-full overflow-hidden p-2 sm:p-4 flex flex-col
                    lg:max-w-100% lg:mx-auto lg:my-4 lg:rounded-xl lg:shadow-2xl lg:h-[calc(var(--app-height)-2rem)]">

        <header className={cn(
          "flex-shrink-0 mb-4 px-2 sm:px-0 flex items-center justify-between sm:justify-center gap-3 mt-2 sm:mt-0 lg:hidden",
          !isHeaderVisible && "hidden"
        )}>
          
          {/* === НОВАЯ КНОПКА (Слева) === */}
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-10 w-10">
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* === Обертка для Лого и Заголовка (Центр) === */}
          <div className="flex items-center gap-3">
            <img src="/vite.png" alt="Logo" className="h-10 w-auto rounded-full" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Orarul Cursurilor</h1>
          </div>

          {/* === Пустой 'div' для выравнивания (Справа) === */}
          <div className="h-10 w-10 sm:hidden"></div>

        </header>

        {isDesktop ? (
          // --- ОБНОВЛЕНИЕ: Передаем 'theme' и 'toggleTheme' И все 'commonProps' ---
          <DesktopView {...commonProps} theme={theme} toggleTheme={toggleTheme} />
        ) : (
          <MobileView {...commonProps} isInitialLoad={isInitialLoad} setIsHeaderVisible={setIsHeaderVisible} />
        )}

        {/* Окно поиска (без изменений) */}
        <CommandDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <CommandInput placeholder={`Căutare (${searchType})...`} />
          {isLoading && !searchOptions[searchType]?.length ? (
            // --- ПЕРЕВОД ---
            <div className="p-6 text-center text-sm">Se încarcă...</div>
          ) : (
            <CommandList>
              {/* --- ПЕРЕВОД --- */}
              <CommandEmpty>Niciun rezultat.</CommandEmpty>
              {searchOptions[searchType] && searchOptions[searchType].length > 0 && (
                // --- ПЕРЕВОД ---
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
    </NotesProvider>
  );
}

export default App;