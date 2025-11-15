import { useState, useRef } from 'react';
import { AnimatePresence, motion, PanInfo } from 'framer-motion';
import { Button } from "@/components/ui/button";
// --- ИЗМЕНЕНИЕ: Добавлены 'StickyNote' (иконка) и Popover ---
import { ArrowLeft, Coffee, ArrowUp, ArrowDown, ChevronLeft, Hand, Users, StickyNote } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, addDays, subDays } from 'date-fns';
import { ro } from 'date-fns/locale';
// --- ИЗМЕНЕНИЕ: Импортируем 'getAcademicWeek' ---
import { getAcademicWeek } from '@/utils/academicWeekUtils';
import type { ScheduleEntry } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// --- ИМПОРТ РЕДАКТОРА ЗАМЕТОК ---
import { LessonNoteEditor } from "./LessonNoteEditor";
// --- ИМПОРТ ХУКА ЗАМЕТОК ---
import { useNotes } from "@/contexts/NotesContext";

// --- Sub-Components ---

// Модальное окно для списка групп (без изменений)
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

/**
 * НОВЫЙ КОМПОНЕНТ
 * Popover с кнопкой для отображения/редактирования заметки.
 */
const NotePopover = ({ lesson }: { lesson: ScheduleEntry }) => {
  const { getNote } = useNotes();
  // Уникальный ключ для заметки
  const noteKey = `${lesson.date}T${lesson.time}`;
  // Проверяем, есть ли заметка, чтобы подсветить иконку
  const hasNote = getNote(noteKey).trim() !== '';

  return (
    <Popover>
      <PopoverTrigger asChild 
        // Останавливаем клик, чтобы он не "всплыл" 
        // и не вызвал свайп (если бы был на кнопке)
        onClick={(e) => e.stopPropagation()}
      >
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            // --- ИСПРАВЛЕНО: Убран отступ mt-1 отсюда ---
            "h-auto w-auto p-1 rounded-full",
            // Если есть заметка - яркий цвет, если нет - тусклый
            hasNote ? "text-primary hover:text-primary/80" : "text-muted-foreground/50 hover:text-muted-foreground"
          )}
          aria-label="Открыть заметку"
        >
          <StickyNote className="h-[2.2vh] w-[2.2vh]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto max-w-[250px] text-sm p-3" 
        // ВАЖНО: Останавливаем события, чтобы
        // Popover не мешал свайпам DayView
        onClick={(e) => e.stopPropagation()} 
        onPointerDown={(e) => e.stopPropagation()}
      >
        <LessonNoteEditor lesson={lesson} />
      </PopoverContent>
    </Popover>
  );
};


// --- ОБНОВЛЕНИЕ: Компонент LessonCard ---
// Снова стал кнопкой, принимает 'isSelected' и 'onClick'
const LessonCard = ({ lesson, isSelected, onClick }: { lesson: ScheduleEntry; isSelected: boolean; onClick: () => void; }) => {
  
  const groups = lesson.group.split(', ').map(g => g.trim()).filter(g => g);
  const MAX_GROUPS_VISIBLE = 1;

  return (
    // 1. Контейнер снова стал <button> и реагирует на 'isSelected'
    <button
      onClick={onClick}
      style={{ borderLeftColor: lesson.professorColor, borderLeftWidth: '4px' }}
      className={cn(
        "rounded-lg bg-card border flex-grow xl:flex-grow-0 min-h-0 text-left w-full transition-all",
        // Добавляем визуальный индикатор выбора
        isSelected && "ring-2 ring-primary"
      )}
    >
      {/* 2. Внутренний div для компоновки */}
      <div
        className="flex items-center px-[1vh] py-[0.5vh] sm:px-[1.5vh] sm:py-[1vh] w-full"
      >
        {/* Левая часть (Время, Тип, ЗАМЕТКА) */}
        <div className="flex flex-col items-center justify-center w-[8vh] mr-[1vh] sm:w-[10vh] sm:mr-[1.5vh] flex-shrink-0">
          <span className="font-bold text-[1.8vh] sm:text-[2.2vh]">{lesson.time}</span>
          <span className="text-[1.5vh] text-muted-foreground">{lesson.type}</span>
          
          {/* === ИСПРАВЛЕНО: div-контейнер С отступом mt-1 рендерится УСЛОВНО === */}
          {/* Теперь, когда isSelected = false, этот div не занимает место */}
          {isSelected && (
            <div className="h-[2.2vh] mt-1"> 
              <NotePopover lesson={lesson} />
            </div>
          )}
          
        </div>
        
        {/* Центральная часть (Предмет, Профессор) */}
        <div className="flex-grow min-w-0">
          {/* === ИСПРАВЛЕНИЕ: Возвращаем логику truncate/break-words === */}
          <h3 className={cn(
            "font-semibold text-[1.8vh]",
            // Ваша логика: полный текст при выборе, одна строка - по умолчанию
            isSelected ? "break-words" : "truncate" 
          )}>
            {lesson.subject}
          </h3>
          {/* === КОНЕЦ ИСПРАВЛЕНИЯ === */}
          <p className="text-[1.5vh] text-muted-foreground truncate">
            {lesson.professor}
          </p>
        </div>

        {/* Правая часть (Группа, Аудитория) - без изменений */}
        <div className="flex-shrink-0 w-[10vh] text-center flex flex-col items-center justify-center gap-[0.5vh]">
          {groups.length > MAX_GROUPS_VISIBLE ? (
            <GroupListModal
              groups={groups}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex flex-row h-auto text-[1.5vh] text-muted-foreground hover:text-accent-foreground"
                >
                  {/* <Users/> */}
                  {groups.length} Grupe
                </Button>
              }
            />
          ) : (
            <span className="text-[1.5vh] font-medium text-muted-foreground truncate w-full px-1">
              {lesson.group}
            </span>
          )}
          <span className="font-semibold text-[1.8vh]">{lesson.classroom}</span>
        </div>
      </div>
    </button>
  );
};

// --- ОБНОВЛЕНИЕ: Компонент EmptySlot ---
// Теперь это кнопка, которая сбрасывает 'selectedLesson'
const EmptySlot = ({ timeSlot, onClick }: { timeSlot: string; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex items-center p-[1vh] sm:px-[1.5vh] sm:py-[1vh] rounded-lg bg-card/50 border border-dashed flex-grow xl:flex-grow-0 min-h-0 w-full text-left"
  >
    <div className="flex flex-col items-center justify-center w-[8vh] mr-[1vh] sm:w-[10vh] sm:mr-[1.5vh] flex-shrink-0">
      <span className="font-bold text-[1.8vh] sm:text-[2.2vh] text-muted-foreground/50">{timeSlot}</span>
    </div>
    <div className="flex-grow flex items-center justify-center text-muted-foreground">
      <Coffee className="h-[2vh] w-[2vh] mr-[1vh]" />
      <span className="text-[1.5vh] sm:text-[1.6vh]">Fără perechi</span>
    </div>
  </button>
);

// --- ОБНОВЛЕНИЕ: Компонент DayPage ---
// Добавлено состояние 'selectedLesson'
const DayPage = ({ schedule }: { schedule: ScheduleEntry[] }) => {
  // Добавляем состояние для отслеживания выбранной пары
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  
  // Обновляем: При клике на пустой слот - сбрасываем, иначе - устанавливаем
  const handleLessonClick = (timeSlot: string | null) => {
    setSelectedLesson(timeSlot);
  };
  
  return (
    <div className="flex flex-col h-full w-full bg-background p-[1vh] sm:p-[1.5vh]">
      <div className="flex flex-col gap-[1vh] flex-grow xl:flex-grow-0">
        {["08:00", "09:45", "11:30", "13:15", "15:00", "16:45", "18:30"].map((timeSlot) => {
          const lesson = schedule.find((item) => item.time === timeSlot);
          // Определяем, выбрана ли эта карточка
          const isSelected = selectedLesson === timeSlot;
          
          return lesson ? (
            <LessonCard
              key={timeSlot}
              lesson={lesson}
              isSelected={isSelected}
              onClick={() => handleLessonClick(timeSlot)}
            />
          ) : (
            <EmptySlot 
              key={timeSlot} 
              timeSlot={timeSlot} 
              // Нажатие на пустой слот сбрасывает 'selectedLesson'
              onClick={() => handleLessonClick(null)} 
            />
          );
        })}
       </div>
    </div>
  );
};

// --- Основной компонент DayView (без изменений в логике свайпов) ---

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
        className="flex-shrink-0 flex flex-row-reverse items-center p-[1vh] sm:p-[1.5vh] xl:hidden"
      >
        <Button variant="ghost" size="icon" onClick={onBack} className="xl:hidden ml-2">
          <ArrowLeft className="h-[3vh] w-[3vh]" />
        </Button>
        <div className="flex flex-col items-end">
          <h1 className="text-[2.8vh] sm:text-[3.2vh] font-bold capitalize -mb-1">{format(date, 'EEEE', { locale: ro })}</h1>
          {/* --- ИЗМЕНЕНИЕ: Добавляем номер недели --- */}
          <p className="text-[1.5vh] text-muted-foreground">{format(date, 'd MMMM yyyy', { locale: ro })} (Săpt. {getAcademicWeek(date)})</p>
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
        className="flex-shrink-0 xl:hidden flex justify-center items-center pt-[1vh] pb-[1vh] text-muted-foreground"
      >
        <div className='flex flex-col animate-pulse'><ArrowUp className="h-[2vh] w-[2vh]" /><ArrowDown className="h-[2vh] w-[2vh]" /></div>
        <span className="text-[1.5vh] font-semibold text-center mx-2">sau</span>
        <div className='flex items-center animate-pulse'><ChevronLeft className="h-[2vh] w-[2vh]" /><Hand className="h-[2.5vh] w-[2.5vh]" /></div>
      </motion.div>
    </div>
  );
}