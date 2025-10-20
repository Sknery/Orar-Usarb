import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface DayCardProps {
  date: Date;
  onClick: () => void;
  isActive: boolean;
}

export function DayCard({ date, onClick, isActive }: DayCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        p-4 rounded-lg text-center transition-all duration-300
        ${isActive ? 'bg-primary text-primary-foreground scale-105 shadow-lg' : 'bg-card text-card-foreground hover:bg-muted'}
      `}
    >
      <p className="text-sm font-medium capitalize text-muted-foreground">
        {format(date, 'EEEE', { locale: ru })}
      </p>
      <p className="text-3xl font-bold">{format(date, 'dd')}</p>
    </button>
  );
}

