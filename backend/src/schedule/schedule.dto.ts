/**
 * Описывает одну запись в расписании, которую мы отдаем фронтенду.
 */
export interface ScheduleEntry {
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM'
  subject: string;
  type: 'Prelegere' | 'Seminar' | 'Practică' | 'Laborator' | 'Proiect de Curs' | 'Evaluare periodică' | 'Consultație' | 'Examinare' | 'Reexaminare' | 'Seminar prealabil' | 'Seminar de totalizare' | string;
  professor: string;
  professorColor: string;
  classroom: string;
  group: string;
  // --- НОВОЕ ПОЛЕ: Время последнего обновления этой конкретной записи ---
  updatedAt?: string; 
}

/**
 * Описывает один элемент в списках для поиска (группы, преподаватели, аудитории).
 */
export interface SearchOption {
  id: string;
  name: string;
}

/**
 * Описывает структуру списков для поиска.
 * Значения могут быть null, пока списки не загружены с API.
 */
export interface MasterLists {
  group: SearchOption[] | null;
  teacher: SearchOption[] | null;
  office: SearchOption[] | null;
}

/**
 * Описывает полный ответ, который наш бэкенд отдает фронтенду.
 */
export interface ScheduleResponseDto {
  schedule: ScheduleEntry[];
  masterLists: MasterLists;
}

// --- Типы для API ответа от orar.usarb.md ---

/**
 * Описывает одну пару (урок) в ответе от API orar.usarb.md.
 */
export interface UsarbApiLesson {
  cours_nr: number;         // Номер пары (1-7)
  cours_name: string;       // Название предмета
  cours_office: string;     // Аудитория
  teacher_name: string;     // Имя преподавателя
  cours_type: string;       // Тип пары (L, S, P...)
  group_id?: number;        // ID группы (есть в ответах для преподавателя/аудитории)
  Denumire?: string;        // Имя группы (есть в ответах для преподавателя/аудитории)
  Subgrupa: string;         // Подгруппа (не используется нами)
  day_number: number;       // День недели (1=Пн, 7=Вс)
  usarb_color: string;      // Цвет (не используется нами)
  Color?: string;           // Еще один цвет? (не используется нами)
  Titlu?: string;           // Заголовок? (не используется нами)
  week?: number;            // Номер недели (не используется нами)
}

/**
 * Описывает один элемент в "мастер-списках" (групп, преподавателей),
 * получаемых от API orar.usarb.md.
 */
export interface UsarbApiMasterListItem {
  Id: number | string; // ID может быть числом или строкой (видели "233")
  Denumire: string;    // Название (группы, преподавателя, аудитории)
}
// --- Конец типов API ---