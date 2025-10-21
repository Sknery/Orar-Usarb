import { useState, useEffect } from 'react';
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

const defaultQueries: Record<SearchType, string> = {
  grupe: "IA-211",
  profesori: "Popescu Ion",
  aule: "501",
};

function App() {
  const [searchType, setSearchType] = useLocalStorage<SearchType>("schedule:searchType", "grupe");
  
  const [searchQueries, setSearchQueries] = useLocalStorage<Record<SearchType, string>>(
    "schedule:searchQueries", 
    defaultQueries
  );
  
  const [storedDate, setStoredDate] = useLocalStorage<string | null>(
    "schedule:selectedDate", 
    new Date('2025-09-15').toISOString()
  );
  
  const { isLoading, error, getScheduleForDate, searchOptions } = useSchedule();

  const selectedDate = storedDate ? new Date(storedDate) : null;
  
  const setSelectedDate = (date: Date | null) => {
    setStoredDate(date ? date.toISOString() : null);
  };
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1280);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    const handleResize = () => setIsDesktop(window.innerWidth >= 1280);
    window.addEventListener('resize', handleResize);
    const down = (e: KeyboardEvent) => { if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setIsSearchOpen((open) => !open); } }
    document.addEventListener("keydown", down);
    const timer = setTimeout(() => setIsInitialLoad(false), 10);
    return () => { 
      window.removeEventListener('resize', handleResize); 
      document.removeEventListener("keydown", down); 
      clearTimeout(timer); 
    }
  }, []);

  useEffect(() => {
    const setAppHeight = () => {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };
    window.addEventListener('resize', setAppHeight);
    setAppHeight();
    return () => window.removeEventListener('resize', setAppHeight);
  }, []);

  const handleSetSearchQuery = (query: string) => {
    setSearchQueries(prevQueries => ({
      ...prevQueries,
      [searchType]: query
    }));
  };

  const handleSearchSelect = (option: SearchOption) => {
    handleSetSearchQuery(option.name);
    setIsSearchOpen(false);
  };

  const commonProps = {
    isLoading,
    error,
    selectedDate,
    setSelectedDate,
    getScheduleForDate,
    searchQuery: searchQueries[searchType] || "",
    setSearchQuery: handleSetSearchQuery,
    searchType,
    setSearchType,
    searchOptions,
    setIsSearchOpen,
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
      
      <CommandDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <CommandInput placeholder={`Căutare (${searchType})...`} />
        <CommandList>
          <CommandEmpty>Niciun rezultat.</CommandEmpty>
          <CommandGroup heading="Rezultate">
            {searchOptions[searchType].map(item => (<CommandItem key={item.id} onSelect={() => handleSearchSelect(item)}>{item.name}</CommandItem>))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </main>
  );
}

export default App;
