import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// --- ИЗМЕНЕНИЕ: Импортируем Dialog и иконки ---
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { HelpCircle, StickyNote, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { ro } from 'date-fns/locale';
import type { ScheduleEntry } from '@/types';
import { RO_WEEK_OPTIONS } from '@/utils/date-config';
// --- ИЗМЕНЕНИЕ: Убираем прямой импорт LessonNoteEditor, импортируем useNotes ---
import { useNotes } from "@/contexts/NotesContext";
// --- ИМПОРТ РЕДАКТОРА ЗАМЕТОК (он нужен внутри Dialog) ---
import { LessonNoteEditor } from "./LessonNoteEditor";

// --- ИСПРАВЛЕНИЕ: Добавляем недостающую функцию ---
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
// --- КОНЕЦ ИСПРАВЛЕНИЯ ---


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

const LegendPopover = () => (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto text-sm p-3" side="top">
             <div className="font-bold mb-2">Legendă</div>
            <ul className="space-y-1">
                <li><span className="font-bold inline-block w-6">P</span> - Prelegere</li>
                <li><span className="font-bold inline-block w-6">S</span> - Seminar</li>
                <li><span className="font-bold inline-block w-6">L</span> - Laborator</li>
                 <li><span className="font-bold inline-block w-6">PC</span> - Proiect de Curs</li>
                <li><span className="font-bold inline-block w-6">EP</span> - Evaluare periodică</li>
                <li><span className="font-bold inline-block w-6">C</span> - Consultație</li>
                <li><span className="font-bold inline-block w-6">E</span> - Examinare</li>
                <li><span className="font-bold inline-block w-6">R</span> - Reexaminare</li>
                 <li><span className="font-bold inline-block w-6">SP</span> - Seminar prealabil</li>
                <li><span className="font-bold inline-block w-6">ST</span> - Seminar de totalizare</li>
            </ul>
        </PopoverContent>
    </Popover>
);

export function WeekTable({ selectedDate, onDaySelect, getScheduleForDate }: { selectedDate: Date, onDaySelect: (date: Date) => void, getScheduleForDate: (date: Date | null) => ScheduleEntry[] }) {
    const weekStart = startOfWeek(selectedDate, RO_WEEK_OPTIONS);
    const weekEnd = endOfWeek(weekStart, RO_WEEK_OPTIONS);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const timeSlots = ["08:00", "09:45", "11:30", "13:15", "15:00", "16:45", "18:30"];
    const timeSlotHeaders = ['1', '2', '3', '4', '5', '6', '7'];
    
    return (
        <div className="bg-card p-2 sm:p-4 rounded-[2vh] border flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold hidden sm:block">Orar săptămânal</h2>
                <div className="hidden sm:block">
                    <LegendPopover />
                </div>
            </div>

            <div className="relative w-full overflow-auto touch-none flex-grow min-h-0">
                <table className={cn("w-full", "w-full caption-bottom text-sm", "h-full")}>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px] p-2 sm:p-4">Data</TableHead>
                            {timeSlotHeaders.map(header => <TableHead key={header} className="text-center p-2 text-[2vh]">{header}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody className="h-full">
                        {weekDays.map(day => (
                            <TableRow key={day.toISOString()} className={cn(isSameDay(day, selectedDate) && "bg-muted/50", "h-[calc(100%/7)]")}>
                                <TableCell
                                    className="font-medium p-1 sm:p-4 cursor-pointer transition-colors hover:bg-muted/25"
                                    onClick={() => onDaySelect(day)}
                                >
                                    <div className="capitalize text-[2vh]">{format(day, 'EEEE', { locale: ro }).substring(0, 2)}</div>
                                    <div className="text-[1.6vh] text-muted-foreground">{format(day, 'dd.MM')}</div>
                                </TableCell>

                                {timeSlots.map((slot) => {
                                    const lessons = getScheduleForDate(day);
                                    const lesson = lessons.find(l => l.time.startsWith(slot));
                                    
                                    return (
                                        <TableCell
                                            key={slot}
                                            className={cn(
                                                "text-center text-[2vh] font-bold",
                                                lesson && "rounded-[1vh] p-0 relative",
                                                // --- ИЗМЕНЕНИЕ: Убираем cursor-pointer и hover ---
                                                !lesson && "p-1 text-muted-foreground/50"
                                            )}
                                            style={{ backgroundColor: lesson ? `${lesson.professorColor}88` : 'transparent' }}
                                            // --- ИЗМЕНЕНИЕ: Убираем onClick для пустых ячеек ---
                                            onClick={undefined}
                                        >
                                            {lesson ? (
                                                <Popover>
                                                    <PopoverTrigger className="absolute inset-0 flex items-center justify-center font-bold cursor-help focus:outline-none focus:ring-1 focus:ring-ring rounded-md text-[2.25vh]">
                                                        {getLessonAbbreviation(lesson.type)}
                                                    </PopoverTrigger>
                                                    
                                                    {/* --- ОБНОВЛЕНИЕ: PopoverContent --- */}
                                                    <PopoverContent className=" w-auto text-[1.8vh] p-3">
                                                        <div className="font-bold mb-2 break-words">{lesson.subject}</div>
                                                        <ul className="space-y-1 text-[1.5vh]">
                                                            <li className="truncate"><strong>Prof:</strong> {lesson.professor}</li>
                                                            <li className="truncate"><strong>Aula:</strong> {lesson.classroom}</li>
                                                            <li className="truncate"><strong>Grupa:</strong> {lesson.group}</li>
                                                            <li className="truncate"><strong>Tip:</strong> {lesson.type}</li>
                                                        </ul>
                                                        
                                                        {/* --- ИЗМЕНЕНО: Заменяем редактор на триггер --- */}
                                                        <NoteEditorTrigger lesson={lesson} />
                                                    </PopoverContent>
                                                </Popover>
                                            ) : (
                                                '-'
                                            )}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </table>
            </div>
        </div>
    );
}