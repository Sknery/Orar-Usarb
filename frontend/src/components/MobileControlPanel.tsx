import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Search, SlidersHorizontal } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ToggleGroup,
  ToggleGroupItem
} from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { format, startOfWeek } from 'date-fns';
import { ro } from 'date-fns/locale';
import type { SearchType, SearchOption } from '@/types';
// --- ИЗМЕНЕНИЕ: Импортируем 'getAcademicWeek' ---
import { getAcademicWeek } from '@/utils/academicWeekUtils';
// --- ИЗМЕНЕНИЕ: Импортируем ГЛОБАЛЬНЫЕ ОПЦИИ ---
import { RO_WEEK_OPTIONS } from '@/utils/date-config';

interface MobileControlPanelProps {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchType: SearchType;
  setSearchType: (type: SearchType) => void;
  searchOptions: Record<SearchType, SearchOption[]>;
  setIsSearchOpen: (isOpen: boolean) => void;
}

export function MobileControlPanel({
  selectedDate,
  setSelectedDate,
  searchQuery,
  searchType,
  setSearchType,
  setIsSearchOpen,
}: MobileControlPanelProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const handleSearchTypeChange = (newType: string) => {
    if (newType) {
      const validatedNewType = newType as SearchType;
      if (validatedNewType !== searchType) {
        setSearchType(validatedNewType);
      }
    }
  };
  const handleDateSelectInCalendar = (date: Date | undefined) => {
    setSelectedDate(date || null);
    setTimeout(() => setIsSettingsOpen(false), 100);
  };
  const getSearchTypeLabel = (type: SearchType) => {
    return { grupe: "Grupă", profesori: "Profesor", aule: "Aulă" }[type] ||
      "Selecție";
  };

  return (
    <div className="bg-card p-[1vh] rounded-lg border flex flex-col gap-[1vh]">
      <div className="flex items-center gap-[1vh]">
        {/* === ИЗМЕНЕНИЕ (vh): h-8 text-xs -> h-[4.5vh] text-[1.6vh] === */}
        <ToggleGroup type="single" value={searchType} onValueChange={handleSearchTypeChange} className="w-full">
          <ToggleGroupItem value="grupe" className="w-full h-[4.5vh] text-[1.6vh] px-[1.5vh]">Grupe</ToggleGroupItem>
          <ToggleGroupItem value="profesori" className="w-full h-[4.5vh] text-[1.6vh] px-[1.5vh]">Profesori</ToggleGroupItem>
          <ToggleGroupItem value="aule" className="w-full h-[4.5vh] text-[1.6vh] px-[1.5vh]">Aule</ToggleGroupItem>
        </ToggleGroup>
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>

          <DialogTrigger asChild>
            {/* === ИЗМЕНЕНИЕ (vh): h-8 w-8 -> h-[4.5vh] w-[4.5vh] === */}

          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Filtre și Setări</DialogTitle></DialogHeader>
            <div className="flex 
 flex-col gap-2 
 pt-4">
              {/* Для кнопок ВНУТРИ модальных окон (Dialog/Popover) 
                мы можем оставить 'rem' и 'sm', 
                т.к.
они не привязаны к высоте главного экрана.
              */}
              <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal" onClick={() => {
                setIsSearchOpen(true);
                setIsSettingsOpen(false);
              }}>
                <Search className="mr-2 h-4 w-4" />
                <span className="truncate">{searchQuery ||
                  "Căutare..."}</span>
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  {/* --- ИЗМЕНЕНИЕ: Используем ГЛОБАЛЬНЫЕ ОПЦИИ --- */}
                  <Button variant={"outline"} size="sm" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>

   
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ?
                      `Săpt. ${getAcademicWeek(selectedDate)} (${format(startOfWeek(selectedDate, RO_WEEK_OPTIONS), "dd.MM.yy")})` : <span>Selectați săptămâna</span>}
                  </Button>
                  {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  {/* --- ИЗМЕНЕНИЕ: Передаем 'ro' и 'weekStartsOn' в Календарь --- */}
                  <Calendar
                    mode="single"
                    selected={selectedDate ||
                      undefined}
                    onSelect={handleDateSelectInCalendar}
                    initialFocus
                    locale={ro}
                    weekStartsOn={1} // Явно указываем

                 
                  />
                  {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
                </PopoverContent>
              </Popover>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ====================================================================
                          НАЧАЛО ИЗМЕНЕНИЙ
====================================================================
*/}
      {/* === ИЗМЕНЕНИЕ (vh): text-xs -> text-[1.5vh] === */}
      {/* Я добавил 'flex justify-center' и обернул <span> в <button> */}
      <div className="text-[1.5vh] text-center text-muted-foreground border-t pt-[1vh] mt-[1vh] flex justify-center items-center gap-2">
        
        {/* Кнопка для открытия поиска */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="truncate transition-colors hover:text-foreground focus:outline-none focus:text-foreground"
          aria-label="Schimbă căutarea"
        >
          <span>{getSearchTypeLabel(searchType)}: {searchQuery || 'Nicio selecție'}</span>
        </button>

        <span className="mx-2 flex-shrink-0">|</span>
        
        {/* Кнопка для открытия настроек (календаря) */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="truncate transition-colors hover:text-foreground focus:outline-none focus:text-foreground"
          aria-label="Schimbă săptămâna"
        >
          <span>
            {/* --- ИЗМЕНЕНИЕ: Используем ГЛОБАЛЬНЫЕ ОПЦИИ --- */}
            {selectedDate ?
              `Săpt. ${getAcademicWeek(selectedDate)} (${format(startOfWeek(selectedDate, RO_WEEK_OPTIONS), "dd.MM")})` : 'Nicio săptămână'}
            {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
          </span>
        </button>

      </div>
{/* ====================================================================
                          КОНЕЦ ИЗМЕНЕНИЙ
====================================================================
*/}
    </div>
  );
}