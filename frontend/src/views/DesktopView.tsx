import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { addDays, subDays, format, startOfWeek, subMonths, addMonths, parseISO, max } from 'date-fns';
import { ro } from 'date-fns/locale';
import { RO_WEEK_OPTIONS } from '@/utils/date-config';
import { getAcademicWeek } from '@/utils/academicWeekUtils';
import { getWeekDays } from "@/utils/dateUtils";
import {
  ChevronLeft, ChevronRight, Calendar, View, CalendarDays, Sun, Moon,
  Users, Briefcase, Building, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { DayView } from '@/components/DayView';
import { MonthView } from '@/components/MonthView';
import { FullWeekGrid } from '@/components/FullWeekGrid';
import { ControlPanel } from '@/components/ControlPanel';
import { LoadingIndicator, ErrorDisplay } from '@/components/common';
import { GoogleCalendarButton } from '@/components/GoogleCalendarButton';
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
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onRefresh: () => void;
  lastUpdated: Date | null; // Оставляем как фоллбэк или для других целей
}

type DesktopViewMode = 'day' | 'week' | 'month';

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
  theme,
  toggleTheme,
  onRefresh,
}: DesktopViewProps) {

  const [viewMode, setViewMode] = useState<DesktopViewMode>('week');

  const handlePrevious = () => {
    if (selectedDate) {
      let newDate;
      if (viewMode === 'day') newDate = subDays(selectedDate, 1);
      else if (viewMode === 'week') newDate = subDays(selectedDate, 7);
      else newDate = subMonths(selectedDate, 1);

      setSelectedDate(newDate);
    }
  };

  const handleNext = () => {
    if (selectedDate) {
      let newDate;
      if (viewMode === 'day') newDate = addDays(selectedDate, 1);
      else if (viewMode === 'week') newDate = addDays(selectedDate, 7);
      else newDate = addMonths(selectedDate, 1);

      setSelectedDate(newDate);
    }
  };

  const handleViewModeChange = (mode: string) => {
    if (mode) {
      setViewMode(mode as DesktopViewMode);
    }
  };

  const handleDaySelectInMonth = (date: Date) => {
    setSelectedDate(date);
    setViewMode('day');
  };

  // --- НОВОЕ: Вычисляем уроки для ТЕКУЩЕЙ видимой недели ---
  const visibleLessons = useMemo(() => {
    if (!selectedDate) return [];
    const weekDays = getWeekDays(selectedDate);
    // Собираем все уроки за эту неделю
    return weekDays.flatMap(day => getScheduleForDate(day, searchQuery, searchType));
  }, [selectedDate, getScheduleForDate, searchQuery, searchType]);

  // --- НОВОЕ: Ищем самую позднюю дату обновления среди этих уроков ---
  const specificLastUpdated = useMemo(() => {
    if (visibleLessons.length === 0) return null;
    
    const dates = visibleLessons
        .map(l => l.updatedAt ? parseISO(l.updatedAt) : null)
        .filter((d): d is Date => d !== null);
        
    if (dates.length === 0) return null;
    
    // Находим максимальную дату
    return max(dates);
  }, [visibleLessons]);


  return (
    <div className="flex flex-col h-full gap-4">

      <header className="flex-shrink-0 flex items-center justify-between gap-4 p-2 bg-card rounded-lg border">

        <div className="flex-shrink-0 flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePrevious} aria-label="Perioada precedentă" disabled={isLoading || !selectedDate}>
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <h2 className="text-lg font-semibold capitalize text-center min-w-[200px] tabular-nums">
            {selectedDate ?
              (viewMode === 'day' ? `${format(selectedDate, 'd MMMM yyyy', { locale: ro })} (Săpt. ${getAcademicWeek(selectedDate)})` :
                viewMode === 'week' ? `Săpt. ${getAcademicWeek(selectedDate)} (${format(startOfWeek(selectedDate, RO_WEEK_OPTIONS), "dd.MM.yy")})` :
                  format(selectedDate, 'LLLL yyyy', { locale: ro })) :
              "Selectați data"
            }
          </h2>

          <Button variant="ghost" size="icon" onClick={handleNext} aria-label="Perioada următoare" disabled={isLoading || !selectedDate}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={handleViewModeChange}
          className="w-auto flex-row gap-1"
          disabled={isLoading}
        >
          <ToggleGroupItem value="day" className="h-8 text-xs" aria-label="Zi">
            <CalendarDays className="h-4 w-4 mr-2" /> Zi
          </ToggleGroupItem>
          <ToggleGroupItem value="week" className="h-8 text-xs" aria-label="Săptămână">
            <View className="h-4 w-4 mr-2" /> Săptămână
          </ToggleGroupItem>
          <ToggleGroupItem value="month" className="h-8 text-xs" aria-label="Lună">
            <Calendar className="h-4 w-4 mr-2" /> Lună
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="flex items-center gap-2">

          <div className="flex items-center gap-2 text-sm text-muted-foreground border-r pr-2 mr-2">
            {searchType === 'grupe' && <Users className="h-4 w-4 flex-shrink-0" />}
            {searchType === 'profesori' && <Briefcase className="h-4 w-4 flex-shrink-0" />}
            {searchType === 'aule' && <Building className="h-4 w-4 flex-shrink-0" />}
            <span className="font-medium truncate max-w-[150px]">
              {searchQuery || "Nicio selecție"}
            </span>
          </div>

          <GoogleCalendarButton
            size="default"
            className="h-8 w-auto px-3 text-xs"
            selectedDate={selectedDate}
            getScheduleForDate={getScheduleForDate}
            searchQuery={searchQuery}
            searchType={searchType}
          />

          {/* --- ОБНОВЛЕНИЕ: Отображение Specific Last Updated --- */}
          <div className="flex items-center gap-1">
             {specificLastUpdated && !isLoading && (
                 <div className="hidden xl:flex flex-col items-end mr-2 text-[10px] text-muted-foreground leading-tight">
                    <span>Actualizat:</span>
                    <span className="font-mono">{format(specificLastUpdated, 'dd.MM HH:mm')}</span>
                 </div>
             )}
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="h-9 w-9 flex-shrink-0"
                    title="Actualizare date"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                   <p>{specificLastUpdated ? `Ultima actualizare: ${format(specificLastUpdated, 'dd.MM.yyyy HH:mm:ss')}` : 'Actualizează orarul'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 flex-shrink-0">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          
          <ControlPanel
            variant="minimal"
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchType={searchType}
            setSearchType={setSearchType}
            searchOptions={searchOptions}
            setIsSearchOpen={setIsSearchOpen}
          />
        </div>
      </header>

      <main className="flex-grow min-h-0">
        {isLoading ?
          <LoadingIndicator /> : error ?
            <ErrorDisplay error={error} /> : selectedDate ?
              <AnimatePresence mode="wait">
                <motion.div
                  key={viewMode + selectedDate.toISOString() + searchQuery + searchType}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-grow min-h-0 h-full"
                >
                  {viewMode === 'week' && (
                    <FullWeekGrid
                      selectedDate={selectedDate}
                      getScheduleForDate={getScheduleForDate}
                      searchQuery={searchQuery}
                      searchType={searchType}
                    />
                  )}

                  {viewMode === 'day' && (
                    <DayView
                      date={selectedDate}
                      onBack={() => { }}
                      onDateChange={setSelectedDate}
                      schedule={getScheduleForDate(selectedDate, searchQuery, searchType)}
                    />
                  )}

                  {viewMode === 'month' && (
                    <MonthView
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                      onBack={() => { }}
                      onDaySelect={handleDaySelectInMonth}
                      getScheduleForDate={getScheduleForDate}
                      searchQuery={searchQuery}
                      searchType={searchType}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
              : (
                <div className="flex-grow flex items-center justify-center h-full bg-card rounded-lg border">
                  <p className="text-muted-foreground">Selectați o săptămână pentru a afișa orarul.</p>
                </div>
              )
        }
      </main>
    </div>
  );
}