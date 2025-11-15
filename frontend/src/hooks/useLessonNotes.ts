import { useState, useEffect, useCallback } from 'react';

// Ключ, по которому все заметки будут храниться в localStorage
const NOTES_STORAGE_KEY = 'scheduleNotes';

// Тип для хранения заметок: { "2025-11-10T08:00": "Текст заметки", ... }
type NoteStorage = Record<string, string>;

/**
 * Хук для управления приватными заметками пар в localStorage.
 */
export function useLessonNotes() {
  const [notes, setNotes] = useState<NoteStorage>({});

  // 1. Единоразовая загрузка заметок из localStorage при старте
  useEffect(() => {
    try {
      const storedNotes = window.localStorage.getItem(NOTES_STORAGE_KEY);
      if (storedNotes) {
        setNotes(JSON.parse(storedNotes));
      }
    } catch (e) {
      console.error("Failed to load notes from localStorage", e);
    }
  }, []);

  // 2. Функция для обновления/сохранения одной заметки
  const updateNote = useCallback((noteKey: string, text: string) => {
    setNotes(prevNotes => {
      const newNotes = { ...prevNotes };

      if (text.trim() === '') {
        // Если текст пустой, удаляем заметку
        delete newNotes[noteKey];
      } else {
        // Иначе обновляем/добавляем
        newNotes[noteKey] = text;
      }

      // Сохраняем в localStorage
      try {
        window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(newNotes));
      } catch (e) {
        console.error("Failed to save notes to localStorage", e);
      }

      return newNotes;
    });
  }, []);

  // 3. Функция для получения заметки по ключу
  const getNote = useCallback((noteKey: string): string => {
    return notes[noteKey] || '';
  }, [notes]);

  return { getNote, updateNote };
}