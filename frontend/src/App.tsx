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

// ... (log constants omitted for brevity) ...
const defaultQueries: Record<SearchType, string> = {
  grupe: "IA-211",
  profesori: "",
  aule: "",
};

function App() {
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
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // --- Состояние для темы ---
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('schedule:theme', 'dark');

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };
  
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const onRefresh = () => {
    console.log("🔄 Manual Refresh Triggered");
    setRefreshTrigger(prev => prev + 1);
  };


  // --- Производные состояния ---
  const selectedDate = useMemo(() => {
    return storedDate ? new Date(storedDate) : initialDate;
  }, [storedDate, initialDate]);

  const visibleWeeks = useMemo(() => {
      return getVisibleWeeks(selectedDate);
  }, [selectedDate]);

  const currentSemester = useMemo(() => (selectedDate.getMonth() < 1 || selectedDate.getMonth() > 6 ? 1 : 2), [selectedDate]);
  
  const searchQuery = useMemo(() => searchQueries[searchType] || "", [searchQueries, searchType]);

  const scheduleParams = useMemo(() => ({
    searchQuery,
    searchType,
    academicWeeks: visibleWeeks,
    dateContext: selectedDate,
    semester: currentSemester,
    refreshTrigger, 
  }), [searchQuery, searchType, visibleWeeks, selectedDate, currentSemester, refreshTrigger]);

  // --- Деструктурируем lastUpdated ---
  const { isLoading, error, getScheduleForDate, searchOptions, schedule, lastUpdated } = useSchedule(scheduleParams);

  // --- Обработчики ---
  const handleSetSearchType = (type: SearchType) => {
    setSearchType(type);
  };

  const handleSetSearchQuery = (query: string) => {
    setSearchQueries(prevQueries => {
      const newQueries = { ...prevQueries, [searchType]: query };
      return newQueries;
    });
  };

  const handleSetSelectedDate = (date: Date | null) => {
     const newStoredDate = date ? date.toISOString() : null;
     setStoredDate(newStoredDate);
  };

  const handleSearchSelect = (option: SearchOption) => {
    handleSetSearchQuery(option.name);
    setIsSearchOpen(false);
  };

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
  }, []);

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
    schedule,
    onRefresh,
    // --- Передаем lastUpdated ---
    lastUpdated
  };

  // --- ВАЖНО: В MobileView нет явного пропса lastUpdated в интерфейсе (нужно было бы добавить), 
  // но так как мы используем MobileControlPanel внутри, мы передадим его туда пропсом.
  // Но подожди, в `MobileView` мы передаем `...commonProps`. 
  // TypeScript может ругаться, если интерфейс MobileViewProps не обновлен. 
  // Давай обновим MobileView.tsx тоже, чтобы быть уверенными.
  
  return (
    <NotesProvider>
      <main className="bg-background text-foreground h-[var(--app-height)] w-full overflow-hidden p-2 sm:p-4 flex flex-col
                    lg:max-w-100% lg:mx-auto lg:my-4 lg:rounded-xl lg:shadow-2xl lg:h-[calc(var(--app-height)-2rem)]">

        <header className={cn(
          "flex-shrink-0 mb-4 px-2 sm:px-0 flex items-center justify-between sm:justify-center gap-3 mt-2 sm:mt-0 lg:hidden",
          !isHeaderVisible && "hidden"
        )}>
          
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-10 w-10">
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <div className="flex items-center gap-3">
            <img src="/vite.png" alt="Logo" className="h-10 w-auto rounded-full" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Orarul Cursurilor</h1>
          </div>

          <div className="h-10 w-10 sm:hidden"></div>

        </header>

        {isDesktop ? (
          <DesktopView {...commonProps} theme={theme} toggleTheme={toggleTheme} />
        ) : (
          <MobileView {...commonProps} isInitialLoad={isInitialLoad} setIsHeaderVisible={setIsHeaderVisible} />
        )}

        <CommandDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <CommandInput placeholder={`Căutare (${searchType})...`} />
          {isLoading && !searchOptions[searchType]?.length ? (
            <div className="p-6 text-center text-sm">Se încarcă...</div>
          ) : (
            <CommandList>
              <CommandEmpty>Niciun rezultat.</CommandEmpty>
              {searchOptions[searchType] && searchOptions[searchType].length > 0 && (
                <CommandGroup heading="Rezultate">
                  {searchOptions[searchType].map((item: SearchOption) => ( 
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