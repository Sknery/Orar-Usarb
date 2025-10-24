import { useState, useRef } from 'react';
import { AnimatePresence, motion, PanInfo } from 'framer-motion';
import { Button } from "@/components/ui/button";
// ИЗМЕНЕНИЕ: Добавляем иконку 'Users'
import { ArrowLeft, Coffee, ArrowUp, ArrowDown, ChevronLeft, Hand, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, subDays } from 'date-fns';
import { ro } from 'date-fns/locale';
import type { ScheduleEntry } from '@/types';
// ИЗМЕНЕНИЕ: Импортируем компоненты Dialog
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// --- Sub-Components ---

// НОВЫЙ КОМПОНЕНТ: Модальное окно для списка групп
const GroupListModal = ({ groups, trigger }: { groups: string[]; trigger: React.ReactNode }) => {
  return (
    <Dialog>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lista grupelor</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
          {groups.map((group, index) => (
            <div key={index} className="p-2 bg-muted rounded-md text-sm font-medium">
              {group}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const LessonCard = ({ lesson, isExpanded, onClick }: { lesson: ScheduleEntry; isExpanded: boolean; onClick: () => void; }) => {
  
  // НОВАЯ ЛОГИКА: Разбиваем строку групп на массив
  const groups = lesson.group.split(', ').map(g => g.trim()).filter(g => g);
  // Максимум групп для отображения текстом, прежде чем появится кнопка модального окна
  const MAX_GROUPS_VISIBLE = 1; 

  return (
    <motion.button
      layout
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      onClick={onClick}
      style={{ borderLeftColor: lesson.professorColor, borderLeftWidth: '4px' }}
      className="flex items-center px-2 py-0.5 sm:px-3 sm:py-2 rounded-lg bg-card border flex-grow xl:flex-grow-0 min-h-0 text-left w-full transition-all hover:bg-muted"
    >
      {/* Левая часть (Время, Тип) - Без изменений */}
      <div className="flex flex-col items-center justify-center w-14 sm:w-20 mr-2 sm:mr-4 flex-shrink-0">
        <span className="font-bold text-sm sm:text-lg">{lesson.time}</span>
        <span className="text-xs text-muted-foreground">{lesson.type}</span>
      </div>
      
      {/* Центральная часть (Предмет, Профессор) - Без изменений */}
      <div className="flex-grow min-w-0">
        <h3 className={cn("font-semibold text-sm sm:text-base break-words", !isExpanded && "line-clamp-1")}>
          {lesson.subject}
        </h3>
        <p className={cn("text-xs sm:text-sm text-muted-foreground", !isExpanded && "truncate")}>
          {lesson.professor}
        </p>
      </div>

      {/* Правая часть (Группа, Аудитория) - ИЗМЕНЕНО */}
      <div className="flex-shrink-0 w-16 text-center flex flex-col items-center justify-center gap-1">
        
        {/* ИЗМЕНЕННАЯ ЛОГИКА ОТОБРАЖЕНИЯ ГРУПП */}
        {groups.length > MAX_GROUPS_VISIBLE ? (
          // Если групп > 1, показываем кнопку модального окна
          <GroupListModal
            groups={groups}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="flex flex-row h-auto text-xs text-muted-foreground hover:text-accent-foreground"
              >
                {/* <Users/> */}
                {groups.length} Grupe
              </Button>
            }
          />
        ) : (
          // Если группа 1, показываем их текстом 
          <span className="text-xs font-medium text-muted-foreground truncate w-full px-1">
            {lesson.group}
          </span>
        )}
        {/* КОНЕЦ ИЗМЕНЕННОЙ ЛОГИКИ */}

        <span className="font-semibold text-sm sm:text-base">{lesson.classroom}</span>
      </div>
    </motion.button>
  );
};

const EmptySlot = ({ timeSlot }: { timeSlot: string }) => (
  <div className="flex items-center p-2 sm:px-3 sm:py-2 rounded-lg bg-card/50 border border-dashed flex-grow xl:flex-grow-0 min-h-0">
    <div className="flex flex-col items-center justify-center w-14 sm:w-20 mr-2 sm:mr-4 flex-shrink-0">
      <span className="font-bold text-sm sm:text-lg text-muted-foreground/50">{timeSlot}</span>
    </div>
    <div className="flex-grow flex items-center justify-center text-muted-foreground">
      <Coffee className="h-4 w-4 mr-2" />
      <span className="text-xs sm:text-sm">Fără perechi</span>
    </div>
  </div>
);

const DayPage = ({ schedule }: { schedule: ScheduleEntry[] }) => {
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const handleLessonClick = (timeSlot: string) => {
    setExpandedLesson(current => (current === timeSlot ? null : timeSlot));
  };

  return (
    <div className="flex flex-col h-full w-full bg-background p-1 sm:p-4">
      <div className="flex flex-col gap-2 flex-grow xl:flex-grow-0">
        {["08:00", "09:45", "11:30", "13:15", "15:00", "16:45", "18:30"].map((timeSlot) => {
          const lesson = schedule.find((item) => item.time === timeSlot);
          return lesson ? (
            <LessonCard
              key={timeSlot}
              lesson={lesson}
              isExpanded={expandedLesson === timeSlot}
              onClick={() => handleLessonClick(timeSlot)}
            />
          ) : (
            <EmptySlot key={timeSlot} timeSlot={timeSlot} />
          );
        })}
      </div>
    </div>
  );
};

// --- Main DayView Component ---

const slideVariants = {
  enter: (direction: number) => ({ y: direction > 0 ? "100%" : "-100%" }),
  center: { zIndex: 1, y: "0%" },
  exit: (direction: number) => ({ zIndex: 0, y: direction < 0 ? "100%" : "-100%" })
};

export function DayView({ date, onBack, onDateChange, schedule }: { date: Date; onBack: () => void; onDateChange: (newDate: Date) => void; schedule: ScheduleEntry[] }) {
  const direction = useRef(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const paginate = (newDirection: number) => { 
    if (isAnimating) return; 
    setIsAnimating(true);
    direction.current = newDirection; 
    onDateChange(newDirection > 0 ? addDays(date, 1) : subDays(date, 1)); 
  };
  
  const handleHeaderFooterDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
    if (isAnimating) return;
    
    if (Math.abs(offset.x) > Math.abs(offset.y)) { 
      if (offset.x > 50 && Math.abs(velocity.x) > 0.3) { 
        onBack();
      }
    }
  };

  const handleMainDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
    if (isAnimating) return;
    
    if (Math.abs(offset.x) > Math.abs(offset.y)) { 
      if (offset.x > 50 && Math.abs(velocity.x) > 0.3) {
        onBack();
      }
      return;
    }

    const swipeThreshold = 50;
    if (Math.abs(offset.y) > swipeThreshold && Math.abs(velocity.y) > 0.3) {
      if (offset.y < 0) paginate(1);
      else paginate(-1);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background touch-none">
      <motion.div
        drag={false}
        onPanEnd={handleHeaderFooterDragEnd}
        className="flex-shrink-0 flex flex-row-reverse items-center p-2 sm:p-4 xl:hidden"
      >
        <Button variant="ghost" size="icon" onClick={onBack} className="xl:hidden ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col items-end">
          <h1 className="text-xl sm:text-2xl font-bold capitalize -mb-1">{format(date, 'EEEE', { locale: ro })}</h1>
          <p className="text-xs text-muted-foreground">{format(date, 'd MMMM yyyy', { locale: ro })}</p>
        </div>
      </motion.div>
      
      <div className="flex-grow relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction.current} onExitComplete={() => setIsAnimating(false)}>
          <motion.div 
            className='h-full absolute w-full' 
            key={date.toISOString()} 
            custom={direction.current} 
            variants={slideVariants} 
            initial="enter" 
            animate="center" 
            exit="exit" 
            transition={{ y: { type: "spring", stiffness: 350, damping: 35 } }} 
            drag={false}
            onPanEnd={handleMainDragEnd}
          >
            <DayPage schedule={schedule} />
          </motion.div>
        </AnimatePresence>
      </div>
      
      <motion.div
        drag={false}
        onPanEnd={handleHeaderFooterDragEnd}
        className="flex-shrink-0 xl:hidden flex justify-center items-center pt-2 pb-2 text-muted-foreground"
      >
        <div className='flex flex-col animate-pulse'><ArrowUp className="h-4 w-4" /><ArrowDown className="h-4 w-4" /></div>
        <span className="text-xs font-semibold text-center mx-2">sau</span>
        <div className='flex items-center animate-pulse'><ChevronLeft className="h-4 w-4" /><Hand className="h-5 w-5" /></div>
      </motion.div>
      
    </div>
  );
}
