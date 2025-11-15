import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Printer, BookOpen, CalendarClock, MoreHorizontal, HelpCircle } from "lucide-react";
import { GoogleCalendarButton } from './GoogleCalendarButton';
// --- НОВЫЕ ИМПОРТЫ ---
import type { ScheduleEntry, SearchType } from '@/types';
// --- КОНЕЦ ИМПОРТОВ ---

const LegendPopover = () => (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-[3.5vh] w-[3.5vh] shrink-0">
                <HelpCircle className="h-[2vh] w-[2vh] text-muted-foreground" />
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

// --- ОБНОВЛЕНИЕ: Принимаем пропсы ---
interface LegendAndActionsProps {
  selectedDate: Date | null;
  searchQuery: string;
  searchType: SearchType;
  getScheduleForDate: (date: Date | null, query: string, type: SearchType) => ScheduleEntry[];
}

export function LegendAndActions({
  selectedDate,
  searchQuery,
  searchType,
  getScheduleForDate
}: LegendAndActionsProps) {
// --- КОНЕЦ ОБНОВЛЕНИЯ ---
    return (
        <div className="bg-card p-[1vh] rounded-lg border flex items-center justify-between gap-[1vh]">
            <div className="flex items-center gap-1">
                <LegendPopover />
                <span className="text-[1.5vh] text-muted-foreground">Legendă</span>
            </div>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" className="h-[4.5vh] text-[1.6vh] px-[1.5vh]">
                        <MoreHorizontal className="mr-[0.5vh] h-[2.2vh] w-[2.2vh]" />
                        Mai multe acțiuni
                    </Button>
                </DialogTrigger>
                
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader><DialogTitle>Acțiuni suplimentare</DialogTitle></DialogHeader>
                    <div className="flex flex-col gap-2 justify-center pt-4">
                        
                        {/* === ОБНОВЛЕНИЕ: Передаем пропсы в GoogleCalendarButton === */}
                        <GoogleCalendarButton 
                          size="sm" 
                          selectedDate={selectedDate}
                          getScheduleForDate={getScheduleForDate}
                          searchQuery={searchQuery}
                          searchType={searchType}
                        />
                        {/* === КОНЕЦ ОБНОВЛЕНИЯ === */}

                        <Button variant="outline" size="sm" disabled><Printer className="mr-2 h-4 w-4" />Descărcare</Button>
                        <Button variant="outline" size="sm" disabled><BookOpen className="mr-2 h-4 w-4" />Examene</Button>
                        <Button variant="outline" size="sm" disabled><CalendarClock className="mr-2 h-4 w-4" />Planificare</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}