// --- НОВЫЙ ИМПОРТ: useState и React ---
import { useState } from 'react';
import type { MouseEvent } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// --- ИЗМЕНЕНИЕ: Импортируем Dialog и иконки ---
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { StickyNote, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleEntry, SearchType } from "@/types";
import { getWeekDays } from "@/utils/dateUtils";
import { format, isSameDay } from "date-fns";
import { ro } from "date-fns/locale";
// --- ИЗМЕНЕНИЕ: Убираем прямой импорт LessonNoteEditor, импортируем useNotes ---
import { useNotes } from "@/contexts/NotesContext";
// --- ИМПОРТ РЕДАКТОРА ЗАМЕТОК (он нужен внутри Dialog) ---
import { LessonNoteEditor } from "./LessonNoteEditor";

// --- Вспомогательные константы (без изменений) ---
const timeSlots = ["08:00", "09:45", "11:30", "13:15", "15:00", "16:45", "18:30"];
const timeSlotHeaders = ['1', '2', '3', '4', '5', '6', '7'];

const getLessonAbbreviation = (type: ScheduleEntry['type']): string => ({
    'Prelegere': 'P',
    'Seminar': 'S',
    'Practică': 'S',
    'Laborator': 'L',
    'Proiect de Curs': 'PC',
    'Evaluare periodică': 'EP',
    'Consultație': 'C',
    'Examinare': 'E',
    'Reexaminare': 'R',
    'Seminar prealabil': 'SP',
    'Seminar de totalizare': 'ST'
}[type] || '?');

interface LessonCellProps {
    lesson: ScheduleEntry | undefined;
}
// ---
// --- НОВЫЙ КОМПОНЕНТ: Триггер для модального окна заметки ---
// ---
const NoteEditorTrigger = ({ lesson }: { lesson: ScheduleEntry }) => {
  const { getNote } = useNotes();
  const noteKey = `${lesson.date}T${lesson.time}`;
  const noteText = getNote(noteKey);
  const hasNote = noteText.trim() !== '';

  return (
    <Dialog>
      <DialogTrigger asChild
        // Останавливаем клик, чтобы он не "всплыл" и не закрыл Popover
        onClick={(e) => e.stopPropagation()}
      >
        {/* Это та самая "строчка с иконкой", которую вы просили */}
        <button className="w-full mt-2 border-t pt-2 flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors text-left">
          {hasNote ? (
            <>
              <StickyNote className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
              {/* --- ИЗМЕНЕНИЕ: 'truncate' заменен на 'break-words' --- */}
              <span className="break-words">
                {/* Показываем первую строку заметки */}
                {noteText.split('\n')[0]}
              </span>
            </>
          ) : (
            <>
              <PlusCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>Добавить приватную заметку</span>
            </>
          )}
        </button>
      </DialogTrigger>
      <DialogContent 
        // ВАЖНО: Останавливаем события, чтобы
        // клики внутри Dialog не закрывали Popover
        onClick={(e) => e.stopPropagation()} 
        onPointerDown={(e) => e.stopPropagation()}
        className="max-w-[calc(100%-2rem)] sm:max-w-md"
      >
        <DialogHeader>
          {/* --- ИЗМЕНЕНИЕ: 'truncate' заменен на 'break-words' --- */}
          <DialogTitle className="break-words">
            Заметка: {lesson.subject}
          </DialogTitle>
        </DialogHeader>
        {/* А здесь уже сам редактор */}
        <LessonNoteEditor lesson={lesson} />
      </DialogContent>
    </Dialog>
  );
};



const LessonCell = ({ lesson }: LessonCellProps) => {
    // --- НОВЫЙ КОД: Состояния для hover/click ---
    const [isOpen, setIsOpen] = useState(false);
    const [isClickLocked, setIsClickLocked] = useState(false);

    const handleMouseEnter = () => {
      if (!isClickLocked) {
        setIsOpen(true);
      }
    }
    
    const handleMouseLeave = () => {
      if (!isClickLocked) {
        setIsOpen(false);
      }
    }

    const handleClick = (e: MouseEvent) => {
      e.preventDefault(); // Останавливаем стандартное поведение
      const newState = !isClickLocked; // Инвертируем состояние "закреплен"
      setIsClickLocked(newState); // Устанавливаем
      setIsOpen(newState); // Если "закрепили" - открыть, если "открепили" - закрыть
    }

    const handleOpenChange = (open: boolean) => {
        // Эта функция вызывается Popover'ом (клик снаружи, кнопка X)
        setIsOpen(open);
        if (!open) {
            // Если Popover закрылся (неважно как),
            // мы должны "открепить" его.
            setIsClickLocked(false); 
        }
    }
    // --- КОНЕЦ НОВОГО КОДА ---

    if (!lesson) {
        return (
            <div className="h-full w-full p-1 text-center text-xs text-muted-foreground/20 flex items-center justify-center">
                -
            </div>
        );
    }

    return (
        // --- ИЗМЕНЕНИЕ: Popover стал "управляемым" ---
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
            {/* --- НОВЫЙ КОД: Обертка для hover-событий --- */}
            <div 
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="h-full w-full"
            >
                <PopoverTrigger
                    asChild // Говорим PopoverTrigger, что у него дочерний компонент
                    onClick={handleClick} // Используем наш кастомный клик
                >
                    <button
                        className="h-full w-full rounded-[0.8vh] p-[0.8vh] text-left flex flex-col justify-between transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:z-10"
                        style={{ backgroundColor: `${lesson.professorColor}33` }}
                    >
                        {/* Верхняя часть (Предмет, Преподаватель) */}
                        <div>
                            <p className="font-semibold line-clamp-1 leading-tight text-[1.5vh]">
                                {lesson.subject}
                            </p>
                            <p className="text-muted-foreground truncate leading-tight text-[1.2vh] mt-[0.5vh]">
                                {lesson.professor}
                            </p>
                        </div>

                        {/* Нижняя часть (Тип, Аудитория) */}
                        <div className="flex justify-between items-center gap-[0.5vh] border-t border-black/10 dark:border-white/10 mt-[0.6vh] pt-[0.4vh]">
                            <span
                                className="font-bold rounded-full text-[1.5vh] px-[0.8vh] flex items-center justify-center flex-shrink-0"
                                style={{
                                    backgroundColor: `${lesson.professorColor}DD`,
                                    color: isColorDark(lesson.professorColor) ? '#FFF' : '#000'
                                }}
                            >
                                {getLessonAbbreviation(lesson.type)}
                            </span>

                            <span
                                className="font-bold text-[1.6vh] truncate min-w-0 text-right"
                            >
                                {lesson.classroom}
                            </span>
                        </div>
                    </button>
                </PopoverTrigger>
            </div> 
            {/* --- КОНЕЦ ОБЕРТКИ --- */}
            
            {/* --- ОБНОВЛЕНИЕ: PopoverContent --- */}
            <PopoverContent className="w-auto max-w-[250px] text-sm p-3">
                {/* Содержимое Popover'а */}
                <div className="font-bold mb-2 break-words">{lesson.subject}</div>
                <ul className="space-y-1 text-xs">
                    <li className="truncate"><strong>Prof:</strong> {lesson.professor}</li>
                    <li className="truncate"><strong>Aula:</strong> {lesson.classroom}</li>
                    <li className="truncate"><strong>Grupa:</strong> {lesson.group}</li>
                    <li className="truncate"><strong>Tip:</strong> {lesson.type}</li>
                    <li className="truncate"><strong>Ora:</strong> {lesson.time}</li>
                </ul>
                
                {/* --- ИЗМЕНЕНО: Заменяем редактор на триггер --- */}
                <NoteEditorTrigger lesson={lesson} />
            </PopoverContent>
        </Popover>
    );
};

// --- Вспомогательная функция (без изменений) ---
function isColorDark(hexColor: string): boolean {
    if (!hexColor) return false;
    const color = (hexColor.charAt(0) === '#') ? hexColor.substring(1, 7) : hexColor;
    const r = parseInt(color.substring(0, 2), 16); // red
    const g = parseInt(color.substring(2, 4), 16); // green
    const b = parseInt(color.substring(4, 6), 16); // blue
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
}

// --- Основной компонент сетки (ИЗМЕНЕН) ---

interface FullWeekGridProps {
    selectedDate: Date;
    getScheduleForDate: (date: Date | null, query: string, type: SearchType) => ScheduleEntry[];
    searchQuery: string;
    searchType: SearchType;
}

export function FullWeekGrid({
    selectedDate,
    getScheduleForDate,
    searchQuery,
    searchType
}: FullWeekGridProps) {

    const weekDays = getWeekDays(selectedDate);
    const today = new Date();

    return (
        // --- ИЗМЕНЕНИЕ: Внешний контейнер теперь просто задает границы и flex-контекст ---
        <div className="bg-card p-2 sm:p-4 rounded-lg border h-full flex flex-col">
            
            {/* --- ИЗМЕНЕНИЕ: Создана ЕДИНАЯ СЕТКА, которая управляет и хедером, и телом --- */}
            {/* Она отвечает за компоновку, рост (flex-grow) и прокрутку (overflow-auto) */}
            <div className="grid grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-1 flex-grow min-h-0 overflow-auto relative">
                
                {/* --- 1. Хедер (Дни недели) - теперь часть единой сетки --- */}
                
                {/* --- ИЗМЕНЕНИЕ: Ячейка "Ora" стала sticky --- */}
                <div className="p-2 text-center text-[2.0vh] font-medium text-muted-foreground sticky top-0 left-0 bg-card z-20 items-center  content-center">
                    Ora
                </div>
                
                {/* --- ИЗМЕНЕНИЕ: Ячейки дней недели стали sticky --- */}
                {weekDays.map(day => (
                    <div
                        key={day.toISOString()}
                        className={cn(
                            // Добавлены sticky, top-0, bg-card (для непрозрачности) и z-10
                            "p-1 text-center text-[2.0vh] font-medium rounded-md flex flex-col justify-center items-center sticky top-0 bg-card z-10", 
                            isSameDay(day, today) && "bg-primary text-primary-foreground "
                        )}
                    >
                        <span className="capitalize hidden md:inline">{format(day, 'EEEE', { locale: ro })}</span>
                        <span className="capitalize md:hidden ">{format(day, 'EEEE', { locale: ro }).substring(0, 2)}</span>
                        
                        <span className={cn(
                            "text-[1.2vh]", 
                            !isSameDay(day, today) && "text-muted-foreground"
                        )}>
                            {format(day, 'dd.MM')}
                        </span>
                    </div>
                ))}
                {/* --- КОНЕЦ ХЕДЕРА --- */}


                {/* --- 2. Основная сетка (Время + Пары) - теперь часть единой сетки --- */}
                {/* Старые div-обертки (`flex-grow` и `grid-rows-7`) УДАЛЕНЫ */}
                
                {timeSlots.flatMap((slot, index) => {
                    const lessonsForSlot = weekDays.map(day => {
                        const lessonsForDay = getScheduleForDate(day, searchQuery, searchType);
                        return lessonsForDay.find(l => l.time.startsWith(slot));
                    });

                    return [
                        // Ячейка 1: Время 
                        // --- ИЗМЕНЕНИЕ: Ячейка времени стала sticky ---
                        <div
                            key={slot}
                            // Добавлены sticky, left-0, bg-card и z-10
                            className="p-3 text-center font-semibold text-muted-foreground flex flex-col justify-center items-center rounded-md border sticky left-0 bg-card z-10"
                        >
                            <span className="text-[1.4vh]">{timeSlotHeaders[index]}</span>
                            <span className="text-[1.2vh]">{slot}</span>
                        </div>,

                        // Ячейки 2-8: Уроки (логика без изменений)
                        ...lessonsForSlot.map((lesson, dayIndex) => {
                            const day = weekDays[dayIndex];
                            return (
                                <div
                                    key={`${day.toISOString()}-${slot}`}
                                    className={cn(
                                        "rounded-md border relative",
                                        isSameDay(day, today) && "bg-muted/30"
                                    )}
                                >
                                    <LessonCell lesson={lesson} />
                                </div>
                            );
                        })
                    ];
                })}
                {/* --- КОНЕЦ ТЕЛА СЕТКИ --- */}
            </div>
        </div>
    );
}