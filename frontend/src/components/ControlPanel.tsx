import { useState } from 'react';
import { Button } from "@/components/ui/button";
// --- ИЗМЕНЕНИЕ: Добавляем иконки ---
import { Calendar as CalendarIcon, Search, SlidersHorizontal, Users, Briefcase, Building } from "lucide-react";
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

interface ControlPanelProps {
    selectedDate: Date | null;
    setSelectedDate: (date: Date | null) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchType: SearchType;
    setSearchType: (type: SearchType) => void;
    searchOptions: Record<SearchType, SearchOption[]>;
    setIsSearchOpen: (isOpen: boolean) => void;
    /** Определяет, как рендерится панель: как отдельная карточка или как часть другого контейнера */
    variant?: 'card' | 'sidebar' | 'icon' | 'minimal';
}

export function ControlPanel({
    selectedDate,
    setSelectedDate,
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
    searchOptions,
    setIsSearchOpen,
    variant = 'card' // Устанавливаем 'card' по умолчанию
}: ControlPanelProps) {
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

    // --- ИЗМЕНЕНИЕ: Классы зависят от варианта ---
    const rootClassName = cn(
        "flex gap-2",
        variant === 'card' && "flex-col bg-card p-2 rounded-lg border",
        (variant === 'sidebar' || variant === 'icon') && "flex-col",
        variant === 'minimal' && "flex-row items-center" // <-- НОВЫЙ
    );

    return (
        <div className={rootClassName}>
            {/* --- ИЗМЕНЕНИЕ: Контейнер меняет направление --- */}
            <div className={cn("flex items-center gap-2", (variant === 'icon' || variant === 'sidebar') && "flex-col w-full", variant === 'minimal' && "flex-row")}>
                <ToggleGroup type="single" value={searchType} onValueChange={handleSearchTypeChange} className={cn("w-full", (variant === 'sidebar' || variant === 'icon') && "flex-col gap-1", variant === 'minimal' && "flex-row w-auto")}>
                    {/* --- ИЗМЕНЕНИЕ: Добавляем иконки и скрытый текст --- */}
                    <ToggleGroupItem value="grupe" className={cn("h-8 text-xs", (variant === 'sidebar' || variant === 'icon') ? "w-full justify-start" : "w-auto")}>
                        <Users className="h-4 w-4" />
                        <span className={cn((variant === 'icon' || variant === 'minimal') ? "hidden" : "ml-2", variant === 'icon' && "group-hover:inline")}>Grupe</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="profesori" className={cn("h-8 text-xs", (variant === 'sidebar' || variant === 'icon') ? "w-full justify-start" : "w-auto")}>
                        <Briefcase className="h-4 w-4" />
                        <span className={cn((variant === 'icon' || variant === 'minimal') ? "hidden" : "ml-2", variant === 'icon' && "group-hover:inline")}>Profesori</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="aule" className={cn("h-8 text-xs", (variant === 'sidebar' || variant === 'icon') ? "w-full justify-start" : "w-auto")}>
                        <Building className="h-4 w-4" />
                        <span className={cn((variant === 'icon' || variant === 'minimal') ? "hidden" : "ml-2", variant === 'icon' && "group-hover:inline")}>Aule</span>
                    </ToggleGroupItem>
                </ToggleGroup>
                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>

                    <DialogTrigger asChild>
                         {/* --- ИЗМЕНЕНИЕ: Кнопка фильтров тоже меняется --- */}

                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Filtre și Setări</DialogTitle></DialogHeader>
                        <div className="flex flex-col gap-2 pt-4">
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
                 {/* --- НОВЫЙ КОД: Кнопка поиска и календаря (только для minimal) --- */}
                {variant === 'minimal' && (
                    <>
                        <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setIsSearchOpen(true)}>
                            <Search className="h-4 w-4" />
                        </Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} size="icon" className="h-8 w-8 flex-shrink-0">
                                    <CalendarIcon className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar 
                                    mode="single" 
                                    selected={selectedDate || undefined} 
                                    onSelect={handleDateSelectInCalendar} 
                                    initialFocus 
                                    locale={ro} 
                                    weekStartsOn={1}
                                />
                            </PopoverContent>
                        </Popover>
                    </>
                )}
            </div>
            {/* --- ИЗМЕНЕНИЕ: Скрываем текст в режиме иконок и minimal --- */}
            <div className={cn("text-xs text-center text-muted-foreground border-t pt-2 mt-2", (variant === 'icon' || variant === 'minimal') && "hidden")}>
                <span>{getSearchTypeLabel(searchType)}: {searchQuery}</span>
                <span className="mx-2">|</span>
                <span>
                    {/* --- ИЗМЕНЕНИЕ: Используем ГЛОБАЛЬНЫЕ ОПЦИИ --- */}
                    {selectedDate ?
                        `Săpt. ${getAcademicWeek(selectedDate)} (${format(startOfWeek(selectedDate, RO_WEEK_OPTIONS), "dd.MM")})` : 'Nicio săptămână'} 
                    {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
                </span>
            </div>
        </div>
    );
}