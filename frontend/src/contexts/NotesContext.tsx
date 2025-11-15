import { createContext, useContext } from 'react';
import { useLessonNotes } from '@/hooks/useLessonNotes';

interface INotesContext {
  getNote: (noteKey: string) => string;
  updateNote: (noteKey: string, text: string) => void;
}

// Создаем контекст с "пустыми" значениями по умолчанию
const NotesContext = createContext<INotesContext>({
  getNote: () => '',
  updateNote: () => {},
});

/**
 * Провайдер, который "оборачивает" приложение и предоставляет
 * доступ к хуку useLessonNotes.
 */
export const NotesProvider = ({ children }: { children: React.ReactNode }) => {
  const { getNote, updateNote } = useLessonNotes();

  return (
    <NotesContext.Provider value={{ getNote, updateNote }}>
      {children}
    </NotesContext.Provider>
  );
};

/**
 * Простой хук для использования в компонентах, чтобы получить
 * функции getNote и updateNote.
 */
export const useNotes = () => useContext(NotesContext);