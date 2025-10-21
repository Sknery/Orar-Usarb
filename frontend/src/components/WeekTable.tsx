import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { ro } from 'date-fns/locale';
import type { ScheduleEntry } from '@/types';

const getLessonAbbreviation = (type: ScheduleEntry['type']): string => ({ 'Lecție': 'P', 'Practică': 'S', 'Laborator': 'L' }[type] || '?');

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
    const weekDays = eachDayOfInterval({ start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) });
    const timeSlots = ["08:00", "09:45", "11:30", "13:15", "15:00", "16:45", "18:30"];
    const timeSlotHeaders = ['1', '2', '3', '4', '5', '6', '7'];

    return (
        <div className="bg-card p-2 sm:p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold hidden sm:block">Sumar săptămânal</h2>
                <div className="hidden sm:block">
                    <LegendPopover />
                </div>
            </div>

            <div className="relative w-full overflow-auto touch-none">
                <table className={cn("table-fixed w-full", "w-full caption-bottom text-sm")}>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px] p-1 sm:p-2">Data</TableHead>
                            {timeSlotHeaders.map(header => <TableHead key={header} className="text-center p-1 text-xs sm:text-sm">{header}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {weekDays.map(day => (
                            <TableRow key={day.toISOString()} className={cn(isSameDay(day, selectedDate) && "bg-muted/50")}>
                                <TableCell
                                    className="font-medium p-1 sm:p-2 cursor-pointer transition-colors hover:bg-muted/25"
                                    onClick={() => onDaySelect(day)}
                                >
                                    <div className="capitalize text-xs sm:text-sm">{format(day, 'EEEE', { locale: ro }).substring(0, 2)}</div>
                                    <div className="text-[10px] sm:text-xs text-muted-foreground">{format(day, 'dd.MM')}</div>
                                </TableCell>

                                {timeSlots.map((slot) => {
                                    const lessons = getScheduleForDate(day);
                                    const lesson = lessons.find(l => l.time.startsWith(slot));

                                    return (
                                        <TableCell
                                            key={slot}
                                            className={cn(
                                                "text-center text-sm font-bold",
                                                lesson && "rounded-md p-0", 
                                                !lesson && "p-1 cursor-pointer transition-colors hover:bg-muted/25" 
                                            )}
                                            style={{ backgroundColor: lesson ? `${lesson.professorColor}40` : 'transparent' }}
                                            onClick={!lesson ? () => onDaySelect(day) : undefined}
                                        >
                                            {lesson ? (
                                                <Popover>
                                                    <PopoverTrigger className="w-full h-full flex items-center justify-center p-1 font-bold cursor-help focus:outline-none focus:ring-1 focus:ring-ring rounded-md">
                                                        {getLessonAbbreviation(lesson.type)}
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto max-w-[200px] text-sm p-3">
                                                        <div className="font-bold mb-2 break-words">{lesson.subject}</div>
                                                        <ul className="space-y-1 text-xs">
                                                            <li className="truncate"><strong>Prof:</strong> {lesson.professor}</li>
                                                            <li className="truncate"><strong>Aula:</strong> {lesson.classroom}</li>
                                                            <li className="truncate"><strong>Grupa:</strong> {lesson.group}</li>
                                                            <li className="truncate"><strong>Tip:</strong> {lesson.type}</li>
                                                        </ul>
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