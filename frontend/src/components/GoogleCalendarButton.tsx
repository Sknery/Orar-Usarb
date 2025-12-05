import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
// Добавляем иконку Trash2
import { Loader2, Check, LogOut, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduleEntry, SearchType } from '@/types';
import { startOfWeek } from 'date-fns';
import { RO_WEEK_OPTIONS } from '@/utils/date-config';
import { useUserId } from '@/hooks/useUserId';

// ... (GoogleLogo компонент оставляем без изменений) ...
const GoogleLogo = ({ className }: { className?: string }) => (
  <svg className={cn("h-4 w-4 mr-2", className)} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.35 6.53C12.86 13.48 18.04 9.5 24 9.5z"></path>
    <path fill="#34A853" d="M46.86 24.5c0-1.65-.15-3.25-.42-4.8H24v9.02h12.84c-.58 2.94-2.26 5.43-4.81 7.18l7.73 6.01C43.63 40.09 46.86 32.93 46.86 24.5z"></path>
    <path fill="#FBBC05" d="M10.91 28.76c-.52-1.57-.82-3.24-.82-4.99s.3-3.42.82-4.99L2.56 13.22C.96 16.29 0 19.99 0 24c0 4.01.96 7.71 2.56 10.78l8.35-6.02z"></path>
    <path fill="#EA4335" d="M24 48c6.47 0 11.9-2.13 15.86-5.82l-7.73-6.01c-2.13 1.44-4.81 2.3-7.73 2.3-5.96 0-11.14-3.98-13.09-9.35L2.56 34.78C6.51 42.62 14.62 48 24 48z"></path>
    <path fill="none" d="M0 0h48v48H0z"></path>
  </svg>
);

// Добавляем статус 'unsyncing'
type AuthStatus = 'loading' | 'connected' | 'disconnected' | 'error' | 'syncing' | 'synced' | 'unsyncing';
type SizeProp = 'sm' | 'default' | 'lg' | 'icon' | null;

interface GoogleCalendarButtonProps {
  className?: string;
  size?: SizeProp;
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
  
  const userId = useUserId();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ email?: string, name?: string, picture?: string } | null>(null);

  useEffect(() => {
    if (!userId) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/google-calendar/check-status?userId=${userId}`);
        if (!response.ok) throw new Error(`Eroare de rețea`);
        const data = await response.json();
        
        setStatus(data.isConnected ? 'connected' : 'disconnected');
        
        if (data.isConnected) {
            setUserInfo({ email: data.email, name: data.name, picture: data.picture });
        }
      } catch (err: any) {
        console.error("Eroare verificarea statutului:", err);
        setErrorMessage(err.message);
        setStatus('error');
      }
    };
    checkStatus();
  }, [userId]);
  
  useEffect(() => {
    if (status === 'synced') {
        const timer = setTimeout(() => setStatus('connected'), 3000); 
        return () => clearTimeout(timer);
    }
  }, [status]);

  const handleAuthClick = () => {
    if (userId) {
      setStatus('loading');
      window.location.href = `/api/google-calendar/auth-url?userId=${userId}`;
    }
  };
  
  const handleDisconnect = async () => {
    if (!confirm("Sigur doriți să deconectați contul Google?")) return;
    try {
        setStatus('loading');
        await fetch('/api/google-calendar/disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        setStatus('disconnected');
        setUserInfo(null);
    } catch (e) {
        console.error("Eroare la deconectare", e);
        setStatus('error');
    }
  };

  const handleSyncClick = async () => {
    if (status !== 'connected' || !selectedDate || !userId) {
      if (!selectedDate) alert('Selectați o săptămână mai întâi.');
      return;
    }

    setStatus('syncing');
    setErrorMessage(null);
    try {
      const weekDays = [0,1,2,3,4,5,6].map(offset => { // Упростили получение дней для примера, лучше использовать getWeekDays
          const d = new Date(startOfWeek(selectedDate, RO_WEEK_OPTIONS));
          d.setDate(d.getDate() + offset);
          return d;
      });
      // Можно использовать пропс getScheduleForDate, перебирая дни недели:
      // Но для сокращения кода внутри примера, оставим логику как есть, предполагая что lessonsToSync сформирован правильно
      // В оригинале у вас: const weekDays = getWeekDays(selectedDate);
      
      // ВАЖНО: Восстановим оригинальную логику сбора уроков, если import getWeekDays доступен
      // const lessonsToSync = weekDays.flatMap(day => getScheduleForDate(day, searchQuery, searchType));
      
      // Предполагаем, что getWeekDays импортирован корректно (он был в imports)
      // Внимание: я использую упрощенную заглушку для примера, 
      // убедитесь что у вас импортирован getWeekDays в файле.
      
      // --- ВРЕМЕННЫЙ КОД для сбора уроков (аналог того, что был) ---
      const start = startOfWeek(selectedDate, RO_WEEK_OPTIONS);
      const days = [];
      for(let i=0; i<7; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          days.push(d);
      }
      const lessonsToSync = days.flatMap(day => getScheduleForDate(day, searchQuery, searchType));
      // -------------------------------------------------------------

      const weekStartDate = startOfWeek(selectedDate, RO_WEEK_OPTIONS);

      const response = await fetch('/api/google-calendar/sync-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessons: lessonsToSync,
          weekStartDate: weekStartDate.toISOString(),
          userId: userId,
        }),
      });
      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Eroare la sincronizare.');
      }
      setStatus('synced');
    } catch (err: any) {
      console.error("Eroare sincronizare:", err);
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  // --- НОВАЯ ФУНКЦИЯ: Удаление недели ---
  const handleUnsyncClick = async () => {
    if (!selectedDate || !userId) return;

    if (!confirm("Sigur doriți să ștergeți orarul pentru această săptămână din Google Calendar?")) {
        return;
    }

    setStatus('unsyncing');
    setErrorMessage(null);

    try {
        const weekStartDate = startOfWeek(selectedDate, RO_WEEK_OPTIONS);

        const response = await fetch('/api/google-calendar/unsync-week', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                weekStartDate: weekStartDate.toISOString(),
                userId: userId,
            }),
        });
        
        const result = await response.json();

        if (!response.ok || result.success === false) {
            throw new Error(result.message || 'Eroare la ștergere.');
        }
        
        // После успешного удаления просто возвращаемся в статус 'connected'
        // Можно показать временное сообщение "Deleted", но connected тоже подойдет
        setStatus('connected');
        alert(`Au fost șterse ${result.count} evenimente.`);

    } catch (err: any) {
        console.error("Eroare la ștergere (unsync):", err);
        setErrorMessage(err.message);
        setStatus('error');
    }
  };


  if (!userId) return null;

  // --- ВАРИАНТЫ ОТОБРАЖЕНИЯ ---

  if (status === 'loading') {
    return (
        <Button variant="outline" size={size} className={cn("w-full", className)} disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Se verifică...
        </Button>
    );
  }
  
  if (status === 'syncing') {
      return (
        <Button variant="outline" size={size} className={cn("w-full", className)} disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Se sincronizează...
        </Button>
      );
  }

  // --- НОВОЕ СОСТОЯНИЕ: UNSYNCING ---
  if (status === 'unsyncing') {
    return (
      <Button variant="destructive" size={size} className={cn("w-full opacity-80", className)} disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Se șterge...
      </Button>
    );
  }

  if (status === 'synced') {
      return (
        <Button variant="outline" size={size} className={cn("w-full text-green-600 border-green-200 bg-green-50", className)} disabled>
          <Check className="mr-2 h-4 w-4" /> Sincronizat!
        </Button>
      );
  }
  
  if (status === 'error') {
       return (
        <Button variant="destructive" size={size} className={cn("w-full", className)} onClick={handleAuthClick}>
          Eroare: {errorMessage || "Reîncercați?"}
        </Button>
      );
  }

  // --- СТАТУС: ПОДКЛЮЧЕНО ---
  if (status === 'connected') {
    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex flex-col md:flex-row gap-2 w-full items-center">
                {/* Группа кнопок действий */}
                <div className="flex w-full items-center gap-1">
                    {/* Кнопка синхронизации */}
                    <Button variant="outline" size={size} className={cn("flex-grow", className)} onClick={handleSyncClick}>
                        <GoogleLogo />
                        Sincronizare
                    </Button>
                    
                    {/* --- НОВАЯ КНОПКА: Удалить (корзина) --- */}
                    <Button 
                        variant="destructive" 
                        size={size} 
                        className="px-3 bg-black text-red-600 hover:bg-red-800 border-red-800 border"
                        onClick={handleUnsyncClick}
                        title="Șterge săptămâna curentă din Google Calendar"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
                
                {/* ИНФОБЛОК С ИМЕНЕМ ПОЛЬЗОВАТЕЛЯ */}
                <div className="flex items-center justify-between px-2 py-1 bg-muted/50 rounded-md border text-xs w-full md:w-auto">
                    <div className="flex items-center overflow-hidden">
                        {userInfo?.picture && (
                            <img 
                              src={userInfo.picture} 
                              alt="Avatar" 
                              className="w-5 h-5 rounded-full mr-2 flex-shrink-0"
                            />
                        )}
                        <span 
                          className="truncate text-muted-foreground font-medium max-w-[100px] sm:max-w-[140px]" 
                          title={userInfo?.email || 'Cont Google'}
                        >
                            {userInfo?.name || userInfo?.email || 'Cont Google'}
                        </span>
                    </div>
                    
                    {/* Кнопка выхода */}
                    <button 
                        onClick={handleDisconnect} 
                        className="ml-2 text-destructive hover:text-destructive/80 p-1 transition-colors rounded hover:bg-muted"
                        title="Deconectare / Schimbă contul"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
  }

  // --- СТАТУС: НЕ ПОДКЛЮЧЕНО ---
  return (
    <Button variant="outline" size={size} className={cn("w-full", className)} onClick={handleAuthClick}>
        <GoogleLogo />
        Conectare Google Calendar
    </Button>
  );
}