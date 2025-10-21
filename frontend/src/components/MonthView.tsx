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

export function MonthView({
  selectedDate,
  setSelectedDate,
  onBack,
  onDaySelect,
  getScheduleForDate,
  searchQuery,
  searchType
}: MonthViewProps) {
  
  const monthStart = startOfMonth(selectedDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = addDays(startDate, 41);
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const changeMonth = (direction: number) => {
    const newMonth = direction > 0 ? addMonths(selectedDate, 1) : subMonths(selectedDate, 1);
    setSelectedDate(newMonth);
  };

  const handleHeaderDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
    if (Math.abs(offset.x) > Math.abs(offset.y)) { 
      if (offset.x < -50 && Math.abs(velocity.x) > 0.3) {
        onBack();
      }
    }
  };

  const handleMainDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
    const isHorizontal = Math.abs(offset.x) > Math.abs(offset.y);
    
    if (isHorizontal) {
      if (offset.x < -50 && Math.abs(velocity.x) > 0.3) {
        onBack();
      }
    } else {
      const isSignificant = Math.abs(offset.y) > 50 && Math.abs(velocity.y) > 0.3;
      if (isSignificant) {
        if (offset.y < 0) {
          changeMonth(1);
        } else {
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

        <div className="grid grid-cols-7 grid-rows-6 gap-1 flex-grow min-h-0">
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
    </div>
  );
}
