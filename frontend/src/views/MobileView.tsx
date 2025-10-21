import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import { WeekTable } from '../components/WeekTable';
import { DayView } from '../components/DayView';
import { MobileControlPanel } from '../components/MobileControlPanel';
import { LegendAndActions } from '../components/LegendAndActions';
import { LoadingIndicator, ErrorDisplay } from '../components/common';
import { MonthView } from '../components/MonthView';
import type { ScheduleEntry, SearchType, SearchOption } from '@/types';

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
  }),
  center: {
    zIndex: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction > 0 ? '-100%' : '100%',
  })
};

interface MobileViewProps {
  isLoading: boolean;
  error: string | null;
  isInitialLoad: boolean;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  getScheduleForDate: (date: Date | null, query: string, type: SearchType) => ScheduleEntry[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchType: SearchType;
  setSearchType: (type: SearchType) => void;
  searchOptions: Record<SearchType, SearchOption[]>;
  setIsSearchOpen: (isOpen: boolean) => void;
  // ИЗМЕНЕНИЕ: Добавлен пропс для управления видимостью заголовка
  setIsHeaderVisible: (isVisible: boolean) => void;
}

export function MobileView({
  isLoading,
  error,
  isInitialLoad,
  selectedDate,
  setSelectedDate,
  getScheduleForDate,
  searchQuery,
  setSearchQuery,
  searchType,
  setSearchType,
  searchOptions,
  setIsSearchOpen,
  // ИЗМЕНЕНИЕ: Получаем новую функцию
  setIsHeaderVisible
}: MobileViewProps) {
  
  const [animationState, setAnimationState] = useState({
    view: 'main' as 'month' | 'main' | 'day',
    direction: 0,
    isInitial: true
  });
  
  const [isAnimating, setIsAnimating] = useState(false);

  // ИЗМЕНЕНИЕ: Этот хук скрывает/показывает главный заголовок в зависимости от экрана
  useEffect(() => {
    if (animationState.view === 'day' || animationState.view === 'month') {
      setIsHeaderVisible(false);
    } else {
      setIsHeaderVisible(true);
    }
  }, [animationState.view, setIsHeaderVisible]);


  const handleDaySelect = (date: Date) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSelectedDate(date);
    setAnimationState(prev => ({ ...prev, view: 'day', direction: 1, isInitial: false }));
  };

  const handleDaySelectInMonth = (date: Date) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSelectedDate(date);
    setAnimationState(prev => ({ ...prev, view: 'day', direction: 1, isInitial: false }));
  };

  const handleBack = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    const direction = animationState.view === 'day' ? -1 : 1;
    setAnimationState(prev => ({ ...prev, view: 'main', direction, isInitial: false }));
  };
  
  const bindMainViewDrag = useDrag(
    ({ down, movement: [mx, my], velocity: [vx], direction: [dx] }) => {
      if (isAnimating) return;
      
      if (!down) {
        const isHorizontalSwipe = Math.abs(mx) > Math.abs(my);
        const isSignificantSwipe = Math.abs(mx) > 50 && Math.abs(vx) > 0.5;

        if (isHorizontalSwipe && isSignificantSwipe) {
          if (dx === -1) {
            if (selectedDate) {
              setIsAnimating(true);
              setAnimationState(prev => ({ ...prev, view: 'day', direction: 1, isInitial: false }));
            }
          } else if (dx === 1) {
            setIsAnimating(true);
            setAnimationState(prev => ({ ...prev, view: 'month', direction: -1, isInitial: false }));
          }
        }
      }
    },
    {}
  );

  return (
    <div className="flex-grow min-h-0 relative overflow-hidden">
      <AnimatePresence 
        initial={false} 
        custom={animationState.direction}
        onExitComplete={() => setIsAnimating(false)}
      >
        
        {animationState.view === 'month' && selectedDate && (
          <motion.div
            key="month"
            custom={animationState.direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 left-0 w-full h-full p-2"
          >
            <div className="h-full w-full rounded-lg overflow-hidden">
              <MonthView 
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                onBack={handleBack}
                onDaySelect={handleDaySelectInMonth}
                getScheduleForDate={getScheduleForDate}
                searchQuery={searchQuery}
                searchType={searchType}
              />
            </div>
          </motion.div>
        )}

        {animationState.view === 'main' && (
          <motion.div
            {...(bindMainViewDrag() as any)}
            key="main"
            custom={animationState.direction}
            variants={variants}
            initial={animationState.isInitial ? "center" : "enter"}
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 left-0 w-full h-full flex flex-col gap-2 touch-pan-y"
          >
            <div className="flex-shrink-0">
              <MobileControlPanel 
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
            <div className="flex-grow min-h-0 flex flex-col">
              {isLoading ? 
                <LoadingIndicator /> : error ? <ErrorDisplay error={error}/> : selectedDate ? 
                <WeekTable 
                  selectedDate={selectedDate} 
                  onDaySelect={handleDaySelect} 
                  getScheduleForDate={(date) => getScheduleForDate(date, searchQuery, searchType)} 
                /> : 
                <div className="bg-card p-2 sm:p-4 rounded-lg border h-full flex items-center justify-center">
                  <p className="text-muted-foreground">Selectați o săptămână</p>
                </div>
              }
            </div>
            <div className="mt-auto flex-shrink-0"><LegendAndActions /></div>
          </motion.div>
        )}
        
        {animationState.view === 'day' && selectedDate && (
          <motion.div 
            key="day" 
            custom={animationState.direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 left-0 w-full h-full p-2"
          >
            <div className="h-full w-full rounded-lg overflow-hidden">
              <DayView 
                date={selectedDate} 
                onBack={handleBack} 
                onDateChange={setSelectedDate} 
                schedule={getScheduleForDate(selectedDate, searchQuery, searchType)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

