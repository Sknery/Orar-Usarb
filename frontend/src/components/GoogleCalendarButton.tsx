import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
// --- НОВЫЕ ИМПОРТЫ ---
import type { ScheduleEntry, SearchType } from '@/types';
import { getWeekDays } from '@/utils/dateUtils';
import { startOfWeek } from 'date-fns';
import { RO_WEEK_OPTIONS } from '@/utils/date-config';
// --- КОНЕЦ ИМПОРТОВ ---

// Встроенный SVG для логотипа Google
const GoogleLogo = ({ className }: { className?: string }) => (
  <svg 
    className={cn("h-4 w-4 mr-2", className)} 
    viewBox="0 0 48 48" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* ... (path data - без изменений) ... */}
    <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.35 6.53C12.86 13.48 18.04 9.5 24 9.5z"></path>
    <path fill="#34A853" d="M46.86 24.5c0-1.65-.15-3.25-.42-4.8H24v9.02h12.84c-.58 2.94-2.26 5.43-4.81 7.18l7.73 6.01C43.63 40.09 46.86 32.93 46.86 24.5z"></path>
    <path fill="#FBBC05" d="M10.91 28.76c-.52-1.57-.82-3.24-.82-4.99s.3-3.42.82-4.99L2.56 13.22C.96 16.29 0 19.99 0 24c0 4.01.96 7.71 2.56 10.78l8.35-6.02z"></path>
    <path fill="#EA4335" d="M24 48c6.47 0 11.9-2.13 15.86-5.82l-7.73-6.01c-2.13 1.44-4.81 2.3-7.73 2.3-5.96 0-11.14-3.98-13.09-9.35L2.56 34.78C6.51 42.62 14.62 48 24 48z"></path>
    <path fill="none" d="M0 0h48v48H0z"></path>
  </svg>
);

// --- ОБНОВЛЕНИЕ: Добавляем isSyncing ---
type AuthStatus = 'loading' | 'connected' | 'disconnected' | 'error' | 'syncing' | 'synced';
type SizeProp = 'sm' | 'default' | 'lg' | 'icon' | null;

// --- НОВЫЕ ПРОПСЫ ---
interface GoogleCalendarButtonProps {
  className?: string;
  size?: SizeProp;
  // Пропсы, необходимые для сбора данных
  selectedDate: Date | null;
  searchQuery: string;
  searchType: SearchType;
  getScheduleForDate: (date: Date | null, query: string, type: SearchType) => ScheduleEntry[];
}

export function GoogleCalendarButton({ 
  className,
  size = "sm",
  selectedDate,
  searchQuery,
  searchType,
  getScheduleForDate
}: GoogleCalendarButtonProps) {
  
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Проверяем статус при монтировании
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/google-calendar/check-status');
        if (!response.ok) throw new Error(`Eroare de rețea`);
        const data = await response.json();
        setStatus(data.isConnected ? 'connected' : 'disconnected');
      } catch (err: any) {
        console.error("Eroare la verificarea statutului Google Auth:", err);
        setErrorMessage(err.message || 'Eroare necunoscută');
        setStatus('error');
      }
    };
    checkStatus();
  }, []);
  
  // Сбрасываем 'synced' обратно в 'connected' при смене недели
  useEffect(() => {
    if (status === 'synced') {
      setStatus('connected');
    }
  }, [selectedDate, searchQuery, searchType, status]);

  // 2. ОБНОВЛЕННЫЙ Обработчик клика
  const handleAuthClick = () => {
    // Только для подключения
    if (status === 'disconnected' || status === 'error') {
      setStatus('loading');
      window.location.href = '/api/google-calendar/auth-url';
    }
  };
  
  const handleSyncClick = async () => {
    // Только для синхронизации
    if (status !== 'connected' || !selectedDate) {
      if (!selectedDate) {
        alert('Vă rugăm să selectați o săptămână mai întâi.');
      }
      return;
    }

    setStatus('syncing');
    setErrorMessage(null);

    try {
      // 1. Собираем уроки
      const weekDays = getWeekDays(selectedDate);
      const lessonsToSync = weekDays.flatMap(day => getScheduleForDate(day, searchQuery, searchType));
      const weekStartDate = startOfWeek(selectedDate, RO_WEEK_OPTIONS);
      
      console.log(`[GoogleCalendarButton] Sincronizare ${lessonsToSync.length} lecții...`);

      // 2. Отправляем на бэкенд
      const response = await fetch('/api/google-calendar/sync-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessons: lessonsToSync,
          weekStartDate: weekStartDate.toISOString(),
        }),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Eroare la sincronizare pe server.');
      }

      // 3. Успех
      setStatus('synced');
      
    } catch (err: any) {
      console.error("Eroare la sincronizare:", err);
      setErrorMessage(err.message || 'Eroare necunoscută');
      setStatus('error');
    }
  };

  // 3. Рендеринг в зависимости от статуса
  switch (status) {
    case 'loading':
      return (
        <Button variant="outline" size={size} className={cn("w-full", className)} disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Se verifică...
        </Button>
      );
    
    case 'syncing':
      return (
        <Button variant="outline" size={size} className={cn("w-full", className)} disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Se sincronizează...
        </Button>
      );

    case 'synced':
      return (
        <Button variant="outline" size={size} className={cn("w-full text-green-600", className)} disabled>
          <Check className="mr-2 h-4 w-4" />
          Sincronizat!
        </Button>
      );

    case 'error':
      return (
        <Button variant="destructive" size={size} className={cn("w-full", className)} onClick={handleAuthClick}>
          Eroare. Reîncercați?
        </Button>
      );
      
    case 'connected':
      return (
        <Button variant="outline" size={size} className={cn("w-full", className)} onClick={handleSyncClick}>
          <GoogleLogo />
          Sincronizare săptămână
        </Button>
      );
      
    case 'disconnected':
    default:
      return (
        <Button variant="outline" size={size} className={cn("w-full", className)} onClick={handleAuthClick}>
          <GoogleLogo />
          Conectare Google Calendar
        </Button>
      );
  }
}