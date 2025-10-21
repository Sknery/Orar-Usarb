import { AnimatePresence, motion } from 'framer-motion';
import { WeekTable } from '@/components/WeekTable';
import { DayView } from '@/components/DayView';
import { ControlPanel } from '@/components/ControlPanel';
import { LoadingIndicator, ErrorDisplay } from '@/components/common';
import type { ScheduleEntry, SearchType, SearchOption } from '@/types';

interface DesktopViewProps {
  isLoading: boolean;
  error: string | null;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  getScheduleForDate: (date: Date | null, query: string, type: SearchType) => ScheduleEntry[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchType: SearchType;
  setSearchType: (type: SearchType) => void;
  searchOptions: Record<SearchType, SearchOption[]>;
  setIsSearchOpen: (isOpen: boolean) => void;
}

export function DesktopView({
  isLoading,
  error,
  selectedDate,
  setSelectedDate,
  getScheduleForDate,
  searchQuery,
  setSearchQuery,
  searchType,
  setSearchType,
  searchOptions,
  setIsSearchOpen,
}: DesktopViewProps) {
  
  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
  };
  
  return (
    <div className="flex-grow flex gap-4 min-h-0">
      <aside className="w-[420px] flex-shrink-0 flex flex-col gap-4">
        <ControlPanel 
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery} 
          searchType={searchType}
          setSearchType={setSearchType}
          searchOptions={searchOptions}
          setIsSearchOpen={setIsSearchOpen}
        />
        <div className="flex-grow min-h-0">
          {isLoading ? <LoadingIndicator/> : error ? <ErrorDisplay error={error} /> : selectedDate && 
            <WeekTable 
              selectedDate={selectedDate} 
              onDaySelect={handleDaySelect} 
              getScheduleForDate={(date) => getScheduleForDate(date, searchQuery, searchType)} 
            />
          }
        </div>
      </aside>
    
      <section className="flex-grow min-w-0 flex flex-col">
        <header className="flex-shrink-0 mb-4 flex items-center justify-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto rounded-full" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Orarul Cursurilor</h1>
        </header>

         {isLoading ? <LoadingIndicator/> : error ?
        <ErrorDisplay error={error} /> : selectedDate ? 
            <AnimatePresence mode="wait">
              <motion.div 
                key={selectedDate.toISOString() + searchQuery + searchType} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.2 }} 
                className="flex-grow min-h-0"
              >
                <DayView 
                  date={selectedDate} 
                  onBack={() => {}} 
                  onDateChange={setSelectedDate} 
                  schedule={getScheduleForDate(selectedDate, searchQuery, searchType)} 
                />
              </motion.div>
            </AnimatePresence> : null
          }
      </section>
    </div>
  );
}