import { useState, useEffect } from 'react';
import { useNotes } from '@/contexts/NotesContext';
import type { ScheduleEntry } from '@/types';

interface LessonNoteEditorProps {
  lesson: ScheduleEntry;
}

/**
 * Компонент с текстовым полем для редактирования заметки к
 * конкретной паре.
 */
export function LessonNoteEditor({ lesson }: LessonNoteEditorProps) {
  const { getNote, updateNote } = useNotes();
  
  // Создаем уникальный ключ для этой пары (дата + время)
  const noteKey = `${lesson.date}T${lesson.time}`;
  
  const currentNote = getNote(noteKey);
  const [noteText, setNoteText] = useState(currentNote);

  // Синхронизируем локальное состояние, если заметка изменилась
  // (например, была обновлена в другом компоненте)
  useEffect(() => {
    setNoteText(currentNote);
  }, [currentNote]);

  /**
   * Сохраняем заметку, когда пользователь убирает фокус
   * с текстового поля (onBlur).
   */
  const handleSave = () => {
    updateNote(noteKey, noteText);
  };

  return (
    <div 
      className="mt-2 border-t pt-2"
      // ВАЖНО: Останавливаем "всплытие" клика,
      // чтобы он не закрыл Popover или не "схлопнул" карточку в DayView.
      onClick={(e) => e.stopPropagation()}
    >
      <label 
        htmlFor={noteKey} 
        // --- ИЗМЕНЕНИЕ: Добавлен 'break-words' для переноса ---
        className="text-xs font-semibold text-muted-foreground break-words"
      >
        Приватная заметка:
      </label>
      <textarea
        id={noteKey}
        // --- ИЗМЕНЕНИЕ: Добавлен 'resize-none' ---
        className="w-full mt-1 p-2 text-xs bg-muted/50 rounded-md border resize-none"
        rows={4}
        placeholder="Домашнее задание, дедлайны..."
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        onBlur={handleSave}
      />
    </div>
  );
}