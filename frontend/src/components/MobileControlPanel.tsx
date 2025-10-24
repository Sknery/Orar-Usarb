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
    return { grupe: "Grupă", profesori: "Profesor", aule: "Aulă" }[type] || "Selecție";
  };

  return (
    <div className="bg-card p-2 rounded-lg border flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <ToggleGroup type="single" value={searchType} onValueChange={handleSearchTypeChange} className="w-full">
          <ToggleGroupItem value="grupe" className="w-full h-8 text-xs">Grupe</ToggleGroupItem>
          <ToggleGroupItem value="profesori" className="w-full h-8 text-xs">Profesori</ToggleGroupItem>
          <ToggleGroupItem value="aule" className="w-full h-8 text-xs">Aule</ToggleGroupItem>
        </ToggleGroup>
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Filtre și Setări</DialogTitle></DialogHeader>
            <div className="flex flex-col gap-2 pt-4">
              <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal" onClick={() => { setIsSearchOpen(true); setIsSettingsOpen(false); }}>
                <Search className="mr-2 h-4 w-4" />
                <span className="truncate">{searchQuery || "Căutare..."}</span>
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  {/* --- ИЗМЕНЕНИЕ: Используем ГЛОБАЛЬНЫЕ ОПЦИИ --- */}
                  <Button variant={"outline"} size="sm" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? `Săptămâna: ${format(startOfWeek(selectedDate, RO_WEEK_OPTIONS), "dd.MM.yy")}` : <span>Selectați săptămâna</span>}
                  </Button>
                  {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  {/* --- ИЗМЕНЕНИЕ: Передаем 'ro' и 'weekStartsOn' в Календарь --- */}
                  <Calendar 
                    mode="single" 
                    selected={selectedDate || undefined} 
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
      <div className="text-xs text-center text-muted-foreground border-t pt-2 mt-2">
        <span>{getSearchTypeLabel(searchType)}: {searchQuery}</span>
        <span className="mx-2">|</span>
        <span>
          {/* --- ИЗМЕНЕНИЕ: Используем ГЛОБАЛЬНЫЕ ОПЦИИ --- */}
          {selectedDate ? `Săptămâna: ${format(startOfWeek(selectedDate, RO_WEEK_OPTIONS), "dd.MM")}` : 'Nicio săptămână'}
          {/* --- КОНЕЦ ИZМЕНЕНИЯ --- */}
        </span>
      </div>
    </div>
  );
}

