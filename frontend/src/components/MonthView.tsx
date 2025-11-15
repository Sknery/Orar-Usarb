// --- ИЗМЕНЕНИЕ: Убраны импорты, связанные с Popover/Dialog ---
import { useState, useRef } from 'react';
// import type { MouseEvent } from 'react'; // <-- Убрано
import { AnimatePresence, motion, PanInfo } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react"; // <-- Убраны StickyNote, PlusCircle
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // <-- Убрано
/* // <-- Убрано
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
*/
// import { useNotes } from "@/contexts/NotesContext"; // <-- Убрано
// import { LessonNoteEditor } from "./LessonNoteEditor"; // <-- Убрано
// --- КОНЕЦ ИЗМЕНЕНИЙ ---
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

// ---
// --- УДАЛЕНО: Компонент NoteEditorTrigger ---
// ---

// ---
// --- УДАЛЕНО: Компонент MonthLessonCell ---
// ---


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
    if (isAnimating) return;
    // --- Добавлена проверка ---
    if (Math.abs(offset.x) > Math.abs(offset.y)) { 
      if (offset.x < -50 && Math.abs(velocity.x) > 0.3) {
        onBack();
      }
    }
  };

  const handleMainDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
    if (isAnimating) return;
    // --- Добавлена проверка ---

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
      
      {/* === НОВЫЙ ХЕДЕР (Только для мобильных, lg:hidden) === */}
      {/* Этот код почти идентичен хедеру из DayView.tsx для единообразия */}
      <motion.div
          drag={false}
          onPanEnd={handleHeaderDragEnd}
          /* === ИСПОЛЬЗУЕМ 'vh' ДЛЯ РАЗМЕРОВ === */
          /* === ИСПОЛЬЗУЕМ lg:hidden ЧТОБЫ СКРЫТЬ НА ДЕСКТОПЕ === */
          className="flex-shrink-0 flex flex-row-reverse items-center p-[1vh] sm:p-[1.5vh] lg:hidden"
      >
          <Button variant="ghost" size="icon" onClick={onBack} className="ml-2">
              <ArrowLeft className="h-[3vh] w-[3vh]" />
          </Button>
          <div className="flex flex-col items-end">
              <h1 className="text-[2.8vh] sm:text-[3.2vh] font-bold capitalize -mb-1">
                  {format(selectedDate, 'LLLL yyyy', { locale: ro })}
              </h1>
          </div>
      </motion.div>
      {/* === КОНЕЦ НОВОГО ХЕДЕРА === */}

      <motion.div 
        drag={false}
        onPanEnd={handleMainDragEnd}
        /* === ИЗМЕНЕНИЕ (vh): p-2 sm:p-4 -> vh === */
        /* === ИЗМЕНЕНИЕ: Убираем отступы сверху на мобильных (т.к. хедер теперь внутри) === */
        className="bg-card p-[1vh] sm:p-[1.5vh] lg:p-[1.5vh] rounded-lg border flex-grow flex flex-col min-h-0"
      >
        {/* === ИЗМЕНЕНИЕ (vh): gap-1 mb-1 -> vh === */}
        <div className="grid grid-cols-7 gap-[0.5vh] flex-shrink-0 mb-[0.5vh]">
          {["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"].map(day => (
        
             /* === ИЗМЕНЕНИЕ (vh): text-xs -> vh === */
             <div key={day} className="text-center text-[1.5vh] font-medium">{day}</div>
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
              {/* === ИЗМЕНЕНИЕ (vh): gap-1 -> vh === */}
              <div className="grid grid-cols-7 grid-rows-6 gap-[0.5vh] flex-grow min-h-0 h-full">
                {days.map(day => {
                  const lessons = getScheduleForDate(day, searchQuery, searchType);
                 
                   const isCurrentMonth = isSameMonth(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <button
                      key={day.toISOString()}
           
                         onClick={() => onDaySelect(day)}
                      /* === ИЗМЕНЕНИЕ (vh): p-0.5 sm:p-1 -> vh === */
                      className={cn(
                        "rounded-md border flex flex-col p-[0.25vh] overflow-hidden transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary",
                        isCurrentMonth ?
 "bg-background/50" : "bg-muted/25 opacity-50",
                        isToday && "ring-2 ring-primary"
                      )}
                    >
                      {/* === ИЗМЕНЕНИЕ (vh): text-xs mb-0.5 -> vh === */}
                      <span className={cn(
     
                         "text-[1.5vh] font-semibold mb-[0.25vh]",
                        !isCurrentMonth && "text-muted-foreground/50"
                      )}>
                        {format(day, 'd')}
      
                       </span>
                      
                      {/* === ГЛАВНОЕ ИЗМЕНЕНИЕ ===
                        По умолчанию (мобильные) - 7 горизонтальных рядов (grid-rows-7).
                        На 'lg' (десктоп) - сбрасываем ряды и ставим 7 вертикальных колонок (lg:grid-cols-7).
                      */}
                      <div className="flex-grow grid grid-rows-7 lg:grid-rows-none lg:grid-cols-7 gap-px">
                        
                        {/* --- ИЗМЕНЕНИЕ: Возвращаем старую логику рендера --- */}
                        {timeSlots.map((slot) => {
                          const lesson = lessons.find(l => l.time.startsWith(slot));
                          return (
                            <div
                              key={slot}
                              /* === ИЗМЕНЕНИЕ (vh): min-h-[4px] -> vh === */
                              className="w-full h-full 
 rounded-sm min-h-[0.5vh]" // min-h-[0.5vh] был min-h-[4px]
                              style={{ 
                                backgroundColor: lesson ? `${lesson.professorColor}CC` : 'transparent' 
                          
                           }}
                            />
                          );
                        })}
                        {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
                  
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