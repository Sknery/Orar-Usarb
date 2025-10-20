import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Search, Printer, BookOpen, CalendarClock, MoreHorizontal, ArrowLeft, Coffee, ArrowUp, ArrowDown, ChevronLeft, Hand, SlidersHorizontal } from "lucide-react";
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
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ToggleGroup,
  ToggleGroupItem
} from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, subDays } from 'date-fns';
import { ro } from 'date-fns/locale';
import { useDrag } from '@use-gesture/react';

// --- TYPE DEFINITIONS ---
export interface ScheduleEntry {
  time: string;
  subject: string;
  type: 'Lecție' | 'Practică' | 'Laborator';
  professor: string;
  classroom: string;
}

export interface ScheduleData {
  [date: string]: ScheduleEntry[];
}

interface SearchOption {
  id: string;
  name: string;
}

type SearchType = "grupe" | "profesori" | "aule";
// --- END TYPE DEFINITIONS ---

// --- MOCK DATA ---
const scheduleData: ScheduleData = {
  '2025-10-20': [
    { time: '08:00', subject: 'Programarea Web', type: 'Lecție', professor: 'Popescu Ion', classroom: '501' },
    { time: '09:45', subject: 'Structuri de Date și Algoritmi', type: 'Practică', professor: 'Ionescu Vasile', classroom: '303-L' },
    { time: '11:30', subject: 'Limba Engleză de Specialitate', type: 'Practică', professor: 'Marinescu Ana', classroom: '202' },
  ],
  '2025-10-21': [
    { time: '09:45', subject: 'Sisteme de Operare', type: 'Lecție', professor: 'Georgescu Dan', classroom: '501' },
    { time: '11:30', subject: 'Rețele de Calculatoare', type: 'Laborator', professor: 'Popescu Ion', classroom: '101-L' },
  ],
  '2025-10-22': [], // Zi liberă
  '2025-10-23': [
    { time: '08:00', subject: 'Baze de Date', type: 'Laborator', professor: 'Ionescu Vasile', classroom: '303-L' },
    { time: '09:45', subject: 'Educație Fizică', type: 'Practică', professor: 'Popovici D.', classroom: 'Sala Sportivă' },
  ],
  '2025-10-24': [
    { time: '11:30', subject: 'Programarea Web', type: 'Practică', professor: 'Popescu Ion', classroom: '404-A' },
    { time: '13:15', subject: 'Sisteme de Operare', type: 'Practică', professor: 'Georgescu Dan', classroom: '505' },
  ],
  // Data for the next week
  '2025-10-27': [
    { time: '08:00', subject: 'Inteligență Artificială', type: 'Lecție', professor: 'Marinescu Ana', classroom: '502' },
    { time: '09:45', subject: 'Securitatea Informației', type: 'Practică', professor: 'Georgescu Dan', classroom: '304-L' },
  ],
};

const MOCK_SEARCH_DATA: Record<SearchType, SearchOption[]> = {
  grupe: [
    { id: "ia211", name: "IA-211" },
    { id: "ia212", name: "IA-212" },
    { id: "fr221", name: "FR-221" },
  ],
  profesori: [
    { id: "p_ion", name: "Popescu Ion" },
    { id: "i_vasile", name: "Ionescu Vasile" },
    { id: "m_ana", name: "Marinescu Ana" },
  ],
  aule: [
    { id: "a501", name: "Aula 501" },
    { id: "l303", name: "Lab 303" },
    { id: "s202", name: "Sala 202" },
  ],
};
// --- END MOCK DATA ---


// --- DayView Component ---
const slideVariants = {
  enter: (direction: number) => ({ y: direction > 0 ? "100%" : "-100%" }),
  center: { zIndex: 1, y: "0%" },
  exit: (direction: number) => ({ zIndex: 0, y: direction < 0 ? "100%" : "-100%" })
};

const DayPage = ({ date, schedule }: { date: Date, schedule: ScheduleEntry[] }) => (
  <div className="flex flex-col h-full w-full bg-background p-1 sm:p-4">
    <div className="flex-shrink-0 flex items-center mb-2 sm:mb-4">
      <h1 className="text-xl sm:text-2xl font-bold capitalize">{format(date, 'EEEE', { locale: ro })}</h1>
      <p className="text-sm text-muted-foreground ml-4">{format(date, 'd MMMM yyyy', { locale: ro })}</p>
    </div>
    <div className="flex-grow flex flex-col gap-2">
      {["08:00", "09:45", "11:30", "13:15", "15:00", "16:45", "18:30"].map((timeSlot) => {
        const lesson = schedule.find((item) => item.time === timeSlot);
        return lesson ? (
          <div key={timeSlot} className="flex items-center p-2 sm:p-3 rounded-lg bg-card border flex-grow min-h-0">
            <div className="flex flex-col items-center justify-center w-14 sm:w-20 mr-2 sm:mr-4 flex-shrink-0">
              <span className="font-bold text-sm sm:text-lg">{lesson.time}</span>
              <span className="text-xs text-muted-foreground">{lesson.type}</span>
            </div>
            <div className="flex-grow"><h3 className="font-semibold text-sm sm:text-base break-words">{lesson.subject}</h3><p className="text-xs sm:text-sm text-muted-foreground">{lesson.professor}</p></div>
            <div className="flex-shrink-0 w-16 text-center"><span className="font-semibold text-sm sm:text-base">{lesson.classroom}</span></div>
          </div>
        ) : (
          <div key={timeSlot} className="flex items-center p-2 sm:p-3 rounded-lg bg-card/50 border border-dashed flex-grow min-h-0">
            <div className="flex flex-col items-center justify-center w-14 sm:w-20 mr-2 sm:mr-4 flex-shrink-0"><span className="font-bold text-sm sm:text-lg text-muted-foreground/50">{timeSlot}</span></div>
            <div className="flex-grow flex items-center justify-center text-muted-foreground"><Coffee className="h-4 w-4 mr-2" /><span className="text-xs sm:text-sm">Fără perechi</span></div>
          </div>
        );
      })}
    </div>
  </div>
);

function DayView({ date, onBack, onDateChange, getScheduleForDate }: { date: Date; onBack: () => void; onDateChange: (newDate: Date) => void; getScheduleForDate: (date: Date | null) => ScheduleEntry[] }) {
  const direction = useRef(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const paginate = (newDirection: number) => { if (isAnimating) return; setIsAnimating(true); direction.current = newDirection; onDateChange(newDirection > 0 ? addDays(date, 1) : subDays(date, 1)); };
  return (
    <div className="flex flex-col h-full bg-background touch-none">
      <div className="flex-shrink-0 flex items-center p-2 sm:p-4"><Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden"><ArrowLeft className="h-5 w-5" /></Button></div>
      <div className="flex-grow relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction.current} onExitComplete={() => setIsAnimating(false)}>
          <motion.div className='h-full absolute w-full' key={date.toISOString()} custom={direction.current} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ y: { type: "spring", stiffness: 350, damping: 35 } }} drag={isAnimating ? false : "y"} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.1}
            onDragEnd={(e, { offset, velocity }) => {
              if (isAnimating) return;
              if (Math.abs(offset.x) > Math.abs(offset.y)) { if (offset.x > 50) onBack(); return; }
              const swipeThreshold = 50;
              if (Math.abs(offset.y) > swipeThreshold && Math.abs(velocity.y) > 0.3) {
                if (offset.y < 0) paginate(1); else paginate(-1);
              }
            }}>
            <DayPage date={date} schedule={getScheduleForDate(date)} />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex-shrink-0 lg:hidden flex justify-center items-center pt-2 pb-2 text-muted-foreground">
        <div className='flex flex-col animate-pulse'><ArrowUp className="h-4 w-4" /><ArrowDown className="h-4 w-4" /></div>
        <span className="text-xs font-semibold text-center mx-2">sau</span>
        <div className='flex items-center animate-pulse'><ChevronLeft className="h-4 w-4" /><Hand className="h-5 w-5" /></div>
      </div>
    </div>
  );
}
// --- END DayView ---

// --- Helper Functions ---
const getLessonAbbreviation = (type: ScheduleEntry['type']): string => ({ 'Lecție': 'P', 'Practică': 'S', 'Laborator': 'L' }[type] || '?');

// --- UI Components ---
function WeekTable({ selectedDate, onDaySelect, getScheduleForDate }: { selectedDate: Date, onDaySelect: (date: Date) => void, getScheduleForDate: (date: Date | null) => ScheduleEntry[] }) {
  const weekDays = eachDayOfInterval({ start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) });
  const timeSlots = ["08:00", "09:45", "11:30", "13:15", "15:00", "16:45", "18:30"];
  const timeSlotHeaders = ['1', '2', '3', '4', '5', '6', '7'];
  return (
    <div className="bg-card p-2 sm:p-4 rounded-lg border">
      <h2 className="text-lg font-semibold mb-2 hidden sm:block">Sumar săptămânal</h2>
      <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px] p-1 sm:p-2">Data</TableHead>
            {timeSlotHeaders.map(header => <TableHead key={header} className="text-center p-1 text-xs sm:text-sm">{header}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {weekDays.map(day => (
            <TableRow key={day.toISOString()} className={cn("cursor-pointer", isSameDay(day, selectedDate) && "bg-muted/50")} onClick={() => onDaySelect(day)}>
              <TableCell className="font-medium p-1 sm:p-2">
                <div className="capitalize text-xs sm:text-sm">{format(day, 'EEEE', { locale: ro }).substring(0, 2)}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">{format(day, 'dd.MM')}</div>
              </TableCell>
              {timeSlots.map((slot) => {
                const lessons = getScheduleForDate(day);
                const lesson = lessons.find(l => l.time.startsWith(slot));
                return <TableCell key={slot} className={cn("text-center text-sm p-1 font-bold", lesson && "bg-primary/20 rounded-md")}>{lesson ? getLessonAbbreviation(lesson.type) : '-'}</TableCell>;
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LegendAndActions() {
  return (
    <div className="bg-card p-2 rounded-lg border flex flex-col gap-2">
      <div className="text-[10px] text-muted-foreground text-center space-y-0.5">
        <p>P - Prelegere | S - Seminar | L - Laborator</p>
      </div>
      <Dialog>
        <DialogTrigger asChild><Button variant="outline" size="sm"><MoreHorizontal className="mr-2 h-4 w-4" />Mai multe acțiuni</Button></DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Acțiuni suplimentare</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-2 justify-center pt-4">
            <Button variant="outline" size="sm" disabled><Printer className="mr-2 h-4 w-4" />Descărcare</Button>
            <Button variant="outline" size="sm" disabled><BookOpen className="mr-2 h-4 w-4" />Examene</Button>
            <Button variant="outline" size="sm" disabled><CalendarClock className="mr-2 h-4 w-4" />Planificare</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Main App Component ---
function App() {
  // --- State ---
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date('2025-10-20'));
  const [searchType, setSearchType] = useState<SearchType>("grupe");
  const [searchQuery, setSearchQuery] = useState("IA-211");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [mobileView, setMobileView] = useState<'main' | 'day'>('main');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const getScheduleForDate = useCallback((date: Date | null): ScheduleEntry[] => {
    if (!date) return [];
    return scheduleData[format(date, 'yyyy-MM-dd')] || [];
  }, []);

  // --- Effects ---
  useEffect(() => {
    document.documentElement.classList.add('dark');
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    const down = (e: KeyboardEvent) => { if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setIsSearchOpen((open) => !open); } }
    document.addEventListener("keydown", down);
    const timer = setTimeout(() => setIsInitialLoad(false), 10);
    return () => { window.removeEventListener('resize', handleResize); document.removeEventListener("keydown", down); clearTimeout(timer); }
  }, []);

  // --- Handlers ---
  const handleDaySelect = (date: Date) => { setSelectedDate(date); if (!isDesktop) setMobileView('day'); };
  const handleBack = () => { if (!isDesktop) setMobileView('main'); };
  const handleDateSelectInCalendar = (date: Date | undefined) => {
    setSelectedDate(date || null);
    setTimeout(() => setIsSettingsOpen(false), 100);
  };
  const handleSearchSelect = (option: SearchOption) => {
    setSearchQuery(option.name);
    setIsSearchOpen(false);
    setIsSettingsOpen(false);
  };

  const bindMainViewDrag = useDrag(({ down, movement: [mx], direction: [dx], cancel }) => { if (down && dx < 0 && mx < -100) { if (selectedDate) setMobileView('day'); cancel(); } }, { axis: 'x', filterTaps: true });

  // --- Sub-Components ---
  const ControlPanel = () => (
    <div className="bg-card p-2 rounded-lg border flex flex-col gap-2">
      <ToggleGroup type="single" value={searchType} onValueChange={(value: SearchType) => value && setSearchType(value)} className="w-full">
        <ToggleGroupItem value="grupe" className="w-full h-8 text-xs">Grupe</ToggleGroupItem>
        <ToggleGroupItem value="profesori" className="w-full h-8 text-xs">Profesori</ToggleGroupItem>
        <ToggleGroupItem value="aule" className="w-full h-8 text-xs">Aule</ToggleGroupItem>
      </ToggleGroup>
      <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal" onClick={() => setIsSearchOpen(true)}>
        <Search className="mr-2 h-4 w-4" /><span className="truncate">{searchQuery || "Căutare..."}</span>
        <kbd className="ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex"><span className="text-xs">⌘</span>K</kbd>
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant={"outline"} size="sm" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? `Săptămâna: ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "dd.MM.yy")}` : <span>Selectați săptămâna</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={selectedDate || undefined} onSelect={handleDateSelectInCalendar} initialFocus locale={ro} />
        </PopoverContent>
      </Popover>
    </div>
  );

  const MobileControlPanel = () => (
    <div className="bg-card p-2 rounded-lg border flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <ToggleGroup type="single" value={searchType} onValueChange={(value: SearchType) => value && setSearchType(value)} className="w-full">
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
              <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal" onClick={() => setIsSearchOpen(true)}>
                <Search className="mr-2 h-4 w-4" />
                <span className="truncate">{searchQuery || "Căutare..."}</span>
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} size="sm" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? `Săptămâna: ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "dd.MM.yy")}` : <span>Selectați săptămâna</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={selectedDate || undefined} onSelect={handleDateSelectInCalendar} initialFocus locale={ro} />
                </PopoverContent>
              </Popover>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="text-xs text-center text-muted-foreground border-t pt-2 mt-2">
        <span>{searchQuery}</span>
        <span className="mx-2">|</span>
        <span>
          {selectedDate ? `Săptămâna: ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "dd.MM")}` : 'Nicio săptămână'}
        </span>
      </div>
    </div>
  );


  // --- RENDER ---
  return (
    <main className="dark bg-background text-foreground h-screen w-screen overflow-hidden p-2 sm:p-4 flex flex-col">
      <header className="flex-shrink-0 mb-4 px-2 sm:px-0 flex items-center justify-center sm:justify-center gap-3 mt-2 sm:mt-0">
        <img src="logo.png" alt="Logo" className="h-10 w-100% rounded-full" />
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Orarul Cursurilor</h1>
      </header>
      {isDesktop ? (
        <div className="flex-grow flex gap-4 min-h-0">
          <aside className="w-[420px] flex-shrink-0 flex flex-col gap-4">
            <ControlPanel />
            <div className="flex-grow min-h-0">
              {selectedDate && <WeekTable selectedDate={selectedDate} onDaySelect={handleDaySelect} getScheduleForDate={getScheduleForDate} />}
            </div>
          </aside>
          <section className="flex-grow min-w-0">
            {selectedDate && <AnimatePresence mode="wait"><motion.div key={selectedDate.toISOString()} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="h-full"><DayView date={selectedDate} onBack={() => { }} onDateChange={setSelectedDate} getScheduleForDate={getScheduleForDate} /></motion.div></AnimatePresence>}
          </section>
        </div>
      ) : (
        <div className="flex-grow min-h-0 relative overflow-hidden">
          <AnimatePresence>
            {mobileView === 'main' && (
              <motion.div
                key="main"
                initial={{ x: isInitialLoad ? '0%' : '-100%' }}
                animate={{ x: '0%' }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute top-0 left-0 w-full h-full flex flex-col gap-2 touch-none"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={(event, { offset, velocity }) => {
                  if (offset.x < -100 && velocity.x < -300) {
                    if (selectedDate) setMobileView('day');
                  }
                }}
              >                <div className="flex-shrink-0"><MobileControlPanel /></div>
                <div className="flex-shrink-0">
                  {selectedDate ? <WeekTable selectedDate={selectedDate} onDaySelect={handleDaySelect} getScheduleForDate={getScheduleForDate} /> : <div className="bg-card p-2 sm:p-4 rounded-lg border h-[350px] flex items-center justify-center"><p className="text-muted-foreground">Selectați o săptămână</p></div>}
                </div>
                <div className="mt-auto flex-shrink-0"><LegendAndActions /></div>
              </motion.div>
            )}
            {mobileView === 'day' && selectedDate && (
              <motion.div key="day" initial={{ x: '100%' }} animate={{ x: '0%' }} exit={{ x: '100%' }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="absolute top-0 left-0 w-full h-full p-2">
                <div className="h-full w-full rounded-lg overflow-hidden"><DayView date={selectedDate} onBack={handleBack} onDateChange={setSelectedDate} getScheduleForDate={getScheduleForDate} /></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      <CommandDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <CommandInput placeholder={`Căutare (${searchType})...`} />
        <CommandList>
          <CommandEmpty>Niciun rezultat.</CommandEmpty>
          <CommandGroup heading="Rezultate">
            {MOCK_SEARCH_DATA[searchType].map(item => (<CommandItem key={item.id} onSelect={() => handleSearchSelect(item)}>{item.name}</CommandItem>))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </main>
  );
}

export default App;

