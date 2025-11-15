import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import { addDays, subDays, startOfWeek } from 'date-fns';
import { RO_WEEK_OPTIONS } from '@/utils/date-config';
import { WeekTable } from '../components/WeekTable';
import { DayView } from '../components/DayView';
import { MobileControlPanel } from '../components/MobileControlPanel';
import { LegendAndActions } from '../components/LegendAndActions';
import { LoadingIndicator, ErrorDisplay } from '../components/common';
import { MonthView } from '../components/MonthView';
import type { ScheduleEntry, SearchType, SearchOption } from '@/types';

const viewSlideVariants = {
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
const weekSlideVariants = {
  enter: (direction: number) => ({ y: direction > 0 ? "100%" : "-100%" }),
  center: { zIndex: 1, y: "0%" },
  exit: (direction: number) => ({ zIndex: 0, y: direction < 0 ? "100%" : "-100%" })
};

interface MobileViewProps {
  isLoading: boolean;
  error: string | null;
  isInitialLoad: boolean;
  selectedDate: Date |
 null;
  setSelectedDate: (date: Date | null) => void;
  getScheduleForDate: (date: Date | null, query: string, type: SearchType) => ScheduleEntry[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchType: SearchType;
  setSearchType: (type: SearchType) => void;
  searchOptions: Record<SearchType, SearchOption[]>;
  setIsSearchOpen: (isOpen: boolean) => void;
  setIsHeaderVisible: (isVisible: boolean) => void;
}

type ViewMode = 'month' | 'main' | 'day';

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
  setIsHeaderVisible
}: MobileViewProps) {
  
  const [animationState, setAnimationState] = useState({
    view: 'main' as ViewMode,
    direction: 0,
    isInitial: true,
    dayViewOrigin: 'main' as 'main' | 'month' 
  });

  const [isAnimating, setIsAnimating] = useState(false);
  const weekAnimationDirection = useRef(0);

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
    setAnimationState(prev => ({ 
      ...prev, 
      view: 'day', 
      direction: 1, 
      isInitial: false,
      dayViewOrigin: 'main'
    }));
  };
  
  const handleDaySelectInMonth = (date: Date) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSelectedDate(date);
    setAnimationState(prev => ({ 
      ...prev, 
      view: 'day', 
      direction: 1, 
      isInitial: false,
      dayViewOrigin: 'month'
    }));
  };
  
  const handleBack = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    if (animationState.view === 'day') {
      const returnToView = animationState.dayViewOrigin;
      setAnimationState(prev => ({ 
        ...prev, 
        view: returnToView,
        direction: -1, 
        isInitial: false 
      }));
    } else if (animationState.view === 'month') {
      setAnimationState(prev => ({ 
        ...prev, 
        view: 'main', 
        direction: 1,
        isInitial: false 
      }));
    }
  };
  
  const handleChangeWeek = (direction: number) => {
    if (isAnimating || !selectedDate) return;
    setIsAnimating(true);
    weekAnimationDirection.current = direction;
    const newDate = direction > 0 ? addDays(selectedDate, 7) : subDays(selectedDate, 7);
    setSelectedDate(newDate);
  };

  const bindMainViewDrag = useDrag(
    ({ down, movement: [mx, my], velocity: [vx, vy], direction: [dx, dy] }) => {
      if (isAnimating) return;
      
      if (!down) {
        const isHorizontalSwipe = Math.abs(mx) > Math.abs(my);
        const isSignificantHorizontal = Math.abs(mx) > 50 && Math.abs(vx) > 0.5;
        const isSignificantVertical = Math.abs(my) > 50 && Math.abs(vy) > 0.5;

        if (isHorizontalSwipe && isSignificantHorizontal) {
          if (dx === -1) { 
            if (selectedDate) {
              setIsAnimating(true);
              setAnimationState(prev => ({ 
                ...prev, 
                view: 'day', 
                direction: 1, 
                isInitial: false,
                dayViewOrigin: 'main'
              }));
            }
          } else if (dx === 1) { 
            setIsAnimating(true);
            setAnimationState(prev => ({ 
              ...prev, 
              view: 'month', 
              direction: -1, 
              isInitial: false 
            }));
          }
        } else if (!isHorizontalSwipe && isSignificantVertical && selectedDate) {
          if (dy === -1) { 
            handleChangeWeek(1);
          } else if (dy === 1) { 
            handleChangeWeek(-1);
          }
        }
      }
    },
    {}
  );

  // --- ОБНОВЛЕНИЕ: Собираем пропсы для передачи в LegendAndActions ---
  const legendProps = {
    selectedDate,
    getScheduleForDate,
    searchQuery,
    searchType,
  };
  // --- КОНЕЦ ОБНОВЛЕНИЯ ---

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
            variants={viewSlideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 left-0 w-full h-full p-[1vh]"
          >
             <div className="h-full w-full rounded-xl overflow-hidden">
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
            variants={viewSlideVariants}
            initial={animationState.isInitial ? "center" : "enter"}
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 left-0 w-full h-full flex flex-col gap-[1vh] touch-pan-y"
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

            <div className="flex-grow min-h-0 relative overflow-hidden">
              <AnimatePresence
                initial={false}
                custom={weekAnimationDirection.current}
                onExitComplete={() => setIsAnimating(false)}
              >
                <motion.div
                  key={selectedDate ? startOfWeek(selectedDate, RO_WEEK_OPTIONS).toISOString() : 'no-date'}
                  custom={weekAnimationDirection.current}
                  variants={weekSlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ y: { type: "spring", stiffness: 350, damping: 35 } }}
                  className="absolute top-0 left-0 w-full h-full flex flex-col justify-center"
                >
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
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* --- ОБНОВЛЕНИЕ: Передаем пропсы в LegendAndActions --- */}
            <div className="mt-auto flex-shrink-0">
              <LegendAndActions {...legendProps} />
            </div>
            {/* --- КОНЕЦ ОБНОВЛЕНИЯ --- */}
          </motion.div>
         )}
        
        {animationState.view === 'day' && selectedDate && (
          <motion.div 
            key="day" 
            custom={animationState.direction}
            variants={viewSlideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 left-0 w-full h-full p-[1vh]"
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