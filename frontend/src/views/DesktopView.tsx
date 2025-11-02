import { AnimatePresence, motion } from 'framer-motion';
// --- ИЗМЕНЕНИЕ: Добавляем утилиты для работы с датами и опции ---
import { addDays, subDays, format, startOfWeek } from 'date-fns';
import { ro } from 'date-fns/locale';
import { RO_WEEK_OPTIONS } from '@/utils/date-config';
// --- ИЗМЕНЕНИЕ: Добавляем иконки и компонент Button ---
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
// --- КОНЕЦ ИЗМЕНЕНИЙ ---
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
  
  // --- НОВЫЙ КОД: Обработчики для смены недели ---
  /**
   * Устанавливает selectedDate на 7 дней назад.
   */
  const handlePreviousWeek = () => {
    if (selectedDate) {
      setSelectedDate(subDays(selectedDate, 7));
    }
  };

  /**
   * Устанавливает selectedDate на 7 дней вперед.
   */
  const handleNextWeek = () => {
    if (selectedDate) {
      setSelectedDate(addDays(selectedDate, 7));
    }
  };
  // --- КОНЕЦ НОВОГО КОДА ---

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

        {/* --- НОВЫЙ БЛОК: Навигация по неделям (ПЕРЕМЕЩЕНА СЮДА) --- */}
        {/* Показываем, только если есть дата и нет загрузки/ошибки */}
        {selectedDate && !isLoading && !error && (
          <div className="flex-shrink-0 flex items-center justify-center gap-2 bg-card p-2 rounded-lg border">
            <Button variant="ghost" size="icon" onClick={handlePreviousWeek} aria-label="Săptămâna precedentă">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-sm font-semibold capitalize text-center min-w-[180px] tabular-nums">
              {/* Форматируем так же, как в ControlPanel, 
                используя RO_WEEK_OPTIONS для получения Понедельника
              */}
              Săptămâna: {format(startOfWeek(selectedDate, RO_WEEK_OPTIONS), "dd.MM.yy")}
            </h2>
            <Button variant="ghost" size="icon" onClick={handleNextWeek} aria-label="Săptămâna următoare">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
        {/* --- КОНЕЦ НОВОГО БЛОКА --- */}

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

         {isLoading ?
        <LoadingIndicator/> : error ?
        <ErrorDisplay error={error} /> : selectedDate ?
        // --- ИЗМЕНЕНИЕ: Блок с датой и кнопками отсюда УДАЛЕН ---
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
        </AnimatePresence>
         : null
          }
      </section>
    </div>
  );
}