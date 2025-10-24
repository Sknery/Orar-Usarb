// --- TYPE DEFINITIONS ---
export interface ScheduleEntry {
  date: string;
  time: string;
  subject: string;
  // --- ИСПРАВЛЕНО: Обновляем тип на основе твоего списка ---
  type: 'Prelegere' | 'Seminar' | 'Practică' | 'Laborator' | 'Proiect de Curs' | 'Evaluare periodică' | 'Consultație' | 'Examinare' | 'Reexaminare' | 'Seminar prealabil' | 'Seminar de totalizare' | string;
  // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
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


// --- ДОБАВЛЕНО: Эти типы нужны для хука useSchedule ---

/**
 * Описывает структуру списков для поиска (из бэкенда).
 * Значения могут быть null, пока списки не загружены с API.
 *
 */
export interface MasterLists {
  group: SearchOption[] | null;
  teacher: SearchOption[] | null;
  office: SearchOption[] | null;
}

/**
 * Описывает полный ответ, который наш бэкенд отдает фронтенду.
 *
 */
export interface ScheduleResponseDto {
  schedule: ScheduleEntry[];
  masterLists: MasterLists;
}
