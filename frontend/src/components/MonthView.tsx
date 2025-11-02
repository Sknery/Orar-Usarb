// --- ИЗМЕНЕНИЕ: Добавляем useState и useRef ---
import { useState, useRef } from 'react';
import { AnimatePresence, motion, PanInfo } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addDays
} from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { ScheduleEntry, SearchType } from '@/types';
// --- ИЗМЕНЕНИЕ: Импортируем ГЛОБАЛЬНЫЕ ОПЦИИ ---
import { RO_WEEK_OPTIONS } from '@/utils/date-config';

interface MonthViewProps {
  selectedDate: Date;
  setSelectedDate: (date: Date | null) => void;
  onBack: () => void;
  onDaySelect: (date: Date) => void;
  getScheduleForDate: (date: Date | null, query: string, type: SearchType) => ScheduleEntry[];
  searchQuery: string;
  searchType: SearchType;
}

const timeSlots = ["08:00", "09:45", "11:30", "13:15", "15:00", "16:45", "18:30"];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// --- НОВЫЙ КОД: Варианты для вертикальной анимации смены месяца ---
const monthSlideVariants = {
  enter: (direction: number) => ({ y: direction > 0 ? "100%" : "-100%" }),
  center: { zIndex: 1, y: "0%" },
  exit: (direction: number) => ({ zIndex: 0, y: direction < 0 ? "100%" : "-100%" })
};
// --- КОНЕЦ НОВОГО КОДА ---

export function MonthView({
  selectedDate,
  setSelectedDate,
  onBack,
  onDaySelect,
  getScheduleForDate,
  searchQuery,
  searchType
}: MonthViewProps) {
  
  // --- НОВЫЙ КОД: Состояние для анимации и ref для направления ---
  const [isAnimating, setIsAnimating] = useState(false);
  const monthAnimationDirection = useRef(0);
  // --- КОНЕЦ НОВОГО КОДА ---
  
  const monthStart = startOfMonth(selectedDate);
  // --- ИЗМЕНЕНИЕ: Используем ГЛОБАЛЬНЫЕ ОПЦИИ ---
  const startDate = startOfWeek(monthStart, RO_WEEK_OPTIONS);
  const endDate = addDays(startDate, 41);
  // --- КОНЕЦ ИЗМЕНЕНИЯ ---
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // --- ИЗМЕНЕНИЕ: Обновляем changeMonth ---
  const changeMonth = (direction: number) => {
    // direction: 1 = следующий (свайп вверх), -1 = предыдущий (свайп вниз)
    if (isAnimating) return;
    setIsAnimating(true);
    monthAnimationDirection.current = direction;

    const newMonth = direction > 0 ?
      addMonths(selectedDate, 1) : subMonths(selectedDate, 1);
    setSelectedDate(newMonth);
  };
  // --- КОНЕЦ ИЗМЕНЕНИЯ ---

  const handleHeaderDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
    if (isAnimating) return; // --- Добавлена проверка ---
    if (Math.abs(offset.x) > Math.abs(offset.y)) { 
      if (offset.x < -50 && Math.abs(velocity.x) > 0.3) {
        onBack();
      }
    }
  };

  const handleMainDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
    if (isAnimating) return; // --- Добавлена проверка ---

    const isHorizontal = Math.abs(offset.x) > Math.abs(offset.y);
    if (isHorizontal) {
      if (offset.x < -50 && Math.abs(velocity.x) > 0.3) {
        onBack();
      }
    } else {
      const isSignificant = Math.abs(offset.y) > 50 && Math.abs(velocity.y) > 0.3;
      if (isSignificant) {
        if (offset.y < 0) { // Свайп ВВЕРХ
          changeMonth(1);
        } else { // Свайп ВНИЗ
          changeMonth(-1);
        }
      }
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-background touch-none">
      
      <motion.div
        drag={false}
        onPanEnd={handleHeaderDragEnd}
        className="flex-shrink-0 flex flex-row-reverse items-center p-2 sm:p-4 mb-2"
      >
        <Button variant="ghost" size="icon" onClick={onBack} className="xl:hidden ml-2">
          <ArrowRight className="h-5 w-5" />
        </Button>
        
        <div className="flex flex-col items-end">
          <h1 className="text-xl sm:text-2xl font-bold capitalize -mb-1">
            {capitalize(format(selectedDate, 'LLLL yyyy', { locale: ro }))}
          </h1>
          <p className="text-xs text-muted-foreground">Vizualizare lunară</p>
        </div>
      </motion.div>

      <motion.div 
        drag={false}
        onPanEnd={handleMainDragEnd}
        className="bg-card p-2 sm:p-4 rounded-lg border flex-grow flex flex-col min-h-0"
      >
        <div className="grid grid-cols-7 gap-1 flex-shrink-0 mb-1">
          {["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"].map(day => (
            <div key={day} className="text-center text-xs font-medium">{day}</div>
          ))}
        </div>

        {/* --- ИЗМЕНЕНИЕ: Добавляем AnimatePresence и motion.div --- */}
        {/* Этот div-контейнер нужен, чтобы AnimatePresence мог управлять
            позиционированием анимированного контента (position: absolute) */}
        <div className="relative flex-grow min-h-0 overflow-hidden">
          <AnimatePresence
            initial={false}
            custom={monthAnimationDirection.current}
            onExitComplete={() => setIsAnimating(false)} // Сбрасываем флаг
          >
            <motion.div
              // Ключ должен меняться каждый месяц
              key={monthStart.toISOString()}
              custom={monthAnimationDirection.current}
              variants={monthSlideVariants} // Вертикальная анимация!
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ y: { type: "spring", stiffness: 350, damping: 35 } }}
              // Абсолютное позиционирование для корректной анимации "вытеснения"
              className="absolute top-0 left-0 w-full h-full"
            >
              {/* Этот grid теперь анимируется */}
              <div className="grid grid-cols-7 grid-rows-6 gap-1 flex-grow min-h-0 h-full">
                {days.map(day => {
                  const lessons = getScheduleForDate(day, searchQuery, searchType);
                  const isCurrentMonth = isSameMonth(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => onDaySelect(day)}
                      className={cn(
                        "rounded-md border flex flex-col p-0.5 sm:p-1 overflow-hidden transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary",
                        isCurrentMonth ? "bg-background/50" : "bg-muted/25 opacity-50",
                        isToday && "ring-2 ring-primary"
                      )}
                    >
                      <span className={cn(
                        "text-xs font-semibold mb-0.5",
                        !isCurrentMonth && "text-muted-foreground/50"
                      )}>
                        {format(day, 'd')}
                      </span>
                      
              
                      <div className="flex-grow grid grid-rows-7 gap-px">
                        {timeSlots.map((slot) => {
                          const lesson = lessons.find(l => l.time.startsWith(slot));
                          return (
                            <div
                              key={slot}
                              className="w-full h-full rounded-sm min-h-[4px]"
                              style={{ 
                                backgroundColor: lesson ? `${lesson.professorColor}CC` : 'transparent' 
                              }}
                            />
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}

      </motion.div>
    </div>
  );
}
