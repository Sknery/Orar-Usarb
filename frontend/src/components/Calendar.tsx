import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  addMonths,
  subMonths,
} from 'date-fns';

interface CalendarProps {
  onDateSelect: (date: Date) => void;
}

export function Calendar({ onDateSelect }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handleDateClick = (day: Date) => {
    setSelectedDate(day);
    onDateSelect(day);
  };
  
  const isWeekend = (day: Date) => {
    return day.getDay() === 0 || day.getDay() === 6;
  }

  const selectedWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const selectedWeekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  const isInSelectedWeek = (day: Date) => {
    return day >= selectedWeekStart && day <= selectedWeekEnd;
  };

  return (
    <div className="p-4 rounded-lg bg-card text-card-foreground">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 text-center text-sm text-muted-foreground mb-2">
        <div>Пн</div>
        <div>Вт</div>
        <div>Ср</div>
        <div>Чт</div>
        <div>Пт</div>
        <div>Сб</div>
        <div>Вс</div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <button
            key={day.toString()}
            onClick={() => handleDateClick(day)}
            className={`
              h-10 w-10 flex items-center justify-center rounded-md transition-all
              ${!isSameMonth(day, currentMonth) ? 'text-muted-foreground/50' : ''}
              ${isInSelectedWeek(day) ? 'bg-primary/20' : ''}
              ${isSameDay(day, selectedDate) ? 'bg-primary text-primary-foreground' : ''}
              hover:bg-primary/10
            `}
          >
            {format(day, 'd')}
          </button>
        ))}
      </div>
    </div>
  );
}

