// --- TYPE DEFINITIONS ---
export interface ScheduleEntry {
  date: string;
  time: string;
  subject: string;
  type: 'Lecție' | 'Practică' | 'Laborator';
  professor: string;
  professorColor: string;
  classroom: string;
  group: string;
}

export interface ScheduleData {
  [date: string]: ScheduleEntry[];
}

export interface SearchOption {
  id: string;
  name: string;
}

export type SearchType = "grupe" | "profesori" | "aule";
