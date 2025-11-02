// --- ИЗМЕНЕНИЕ: Добавляем useRef ---
import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
// --- ИЗМЕНЕНИЕ: Добавляем утилиты для работы с датами ---
import { addDays, subDays, startOfWeek } from 'date-fns';
import { RO_WEEK_OPTIONS } from '@/utils/date-config';
// --- КОНЕЦ ИЗМЕНЕНИЙ ---
import { WeekTable } from '../components/WeekTable';
import { DayView } from '../components/DayView';
import { MobileControlPanel } from '../components/MobileControlPanel';
import { LegendAndActions } from '../components/LegendAndActions';
import { LoadingIndicator, ErrorDisplay } from '../components/common';
import { MonthView } from '../components/MonthView';
import type { ScheduleEntry, SearchType, SearchOption } from '@/types';

// --- ИЗМЕНЕНИЕ: Это варианты для смены 'вида' (горизонтально) ---
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

// --- НОВЫЙ КОД: Это варианты для смены 'недели' (вертикально) ---
// (Скопировано из DayView.tsx)
const weekSlideVariants = {
  enter: (direction: number) => ({ y: direction > 0 ? "100%" : "-100%" }),
  center: { zIndex: 1, y: "0%" },
  exit: (direction: number) => ({ zIndex: 0, y: direction < 0 ? "100%" : "-100%" })
};
// --- КОНЕЦ НОВОГО КОДА ---

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
  setIsHeaderVisible
}: MobileViewProps) {
  
  const [animationState, setAnimationState] = useState({
    view: 'main' as 'month' | 'main' | 'day',
    direction: 0,
    isInitial: true
  });
  const [isAnimating, setIsAnimating] = useState(false);
  // --- НОВЫЙ КОД: Ref для направления анимации недели ---
  const weekAnimationDirection = useRef(0);
  // --- КОНЕЦ НОВОГО КОДА ---

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

  // --- НОВЫЙ КОД: Функция для смены недели ---
  const handleChangeWeek = (direction: number) => {
    // direction: 1 = следующая (вверх), -1 = предыдущая (вниз)
    if (isAnimating || !selectedDate) return;
    setIsAnimating(true);
    weekAnimationDirection.current = direction;
    const newDate = direction > 0 ? addDays(selectedDate, 7) : subDays(selectedDate, 7);
    setSelectedDate(newDate);
  };
  // --- КОНЕЦ НОВОГО КОДА ---

  // --- ИЗМЕНЕНИЕ: Обновляем useDrag для обработки ВЕРТИКАЛЬНЫХ свайпов ---
  const bindMainViewDrag = useDrag(
    ({ down, movement: [mx, my], velocity: [vx, vy], direction: [dx, dy] }) => {
      if (isAnimating) return;
      
      if (!down) {
        const isHorizontalSwipe = Math.abs(mx) > Math.abs(my);
        const isSignificantHorizontal = Math.abs(mx) > 50 && Math.abs(vx) > 0.5;
        // Новая проверка для вертикального свайпа
        const isSignificantVertical = Math.abs(my) > 50 && Math.abs(vy) > 0.5;

        if (isHorizontalSwipe && isSignificantHorizontal) {
          // --- Существующая логика для горизонтальных свайпов ---
          if (dx === -1) {
            if (selectedDate) {
              setIsAnimating(true);
              setAnimationState(prev => ({ ...prev, view: 'day', direction: 1, isInitial: false }));
            }
          } else if (dx === 1) {
            setIsAnimating(true);
            setAnimationState(prev => ({ ...prev, view: 'month', direction: -1, isInitial: false }));
          }
        } else if (!isHorizontalSwipe && isSignificantVertical && selectedDate) {
          // --- НОВАЯ ЛОГИКА: Вертикальный свайп ---
          if (dy === -1) { // Свайп ВВЕРХ
            handleChangeWeek(1); // Следующая неделя
          } else if (dy === 1) { // Свайп ВНИЗ
            handleChangeWeek(-1); // Предыдущая неделя
          }
          // --- КОНЕЦ НОВОЙ ЛОГИКИ ---
        }
      }
    },
    {}
  );
  // --- КОНЕЦ ИЗМЕНЕНИЙ ---

  return (
    <div className="flex-grow min-h-0 relative overflow-hidden">
      <AnimatePresence 
        initial={false} 
        custom={animationState.direction}
        onExitComplete={() => setIsAnimating(false)} // Эта функция теперь будет вызываться и после смены недели
      >
        
        {animationState.view === 'month' && selectedDate && (
          <motion.div
            key="month"
            custom={animationState.direction}
            variants={viewSlideVariants} // Горизонтальная анимация
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
            variants={viewSlideVariants} // Горизонтальная анимация
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

            {/* --- ИЗМЕНЕНИЕ: Добавлен AnimatePresence для WeekTable --- */}
            {/* Этот div-контейнер нужен, чтобы AnimatePresence мог управлять
                позиционированием анимированного контента (position: absolute) */}
            <div className="flex-grow min-h-0 relative overflow-hidden">
              <AnimatePresence
                initial={false}
                custom={weekAnimationDirection.current}
                // Когда анимация смены недели завершится, мы сбрасываем isAnimating
                onExitComplete={() => setIsAnimating(false)}
              >
                <motion.div
                  // Ключ должен меняться каждую неделю, чтобы AnimatePresence
                  // мог отследить смену. Мы используем Понедельник недели.
                  key={selectedDate ? startOfWeek(selectedDate, RO_WEEK_OPTIONS).toISOString() : 'no-date'}
                  custom={weekAnimationDirection.current}
                  variants={weekSlideVariants} // Вертикальная анимация!
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ y: { type: "spring", stiffness: 350, damping: 35 } }} //
                  // Абсолютное позиционирование для корректной анимации "вытеснения"
                  className="absolute top-0 left-0 w-full h-full flex flex-col"
                >
                  {/* Этот блок теперь анимируется вертикально */}
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
            {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}

            <div className="mt-auto flex-shrink-0"><LegendAndActions /></div>
          </motion.div>
         )}
        
        {animationState.view === 'day' && selectedDate && (
          <motion.div 
            key="day" 
            custom={animationState.direction}
            variants={viewSlideVariants} // Горизонтальная анимация
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