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

const LegendPopover = () => (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
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

export function LegendAndActions() {
    return (
        <div className="bg-card p-2 rounded-lg border flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
                <LegendPopover />
                <span className="text-xs text-muted-foreground">Legendă</span>
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
