import { useState, useEffect } from 'react';

const USER_ID_KEY = 'schedule_device_id';

export function useUserId() {
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    try {
      // 1. Пробуем найти ID в хранилище
      let storedId = localStorage.getItem(USER_ID_KEY);

      // 2. Если нет - генерируем новый UUID
      if (!storedId) {
        // --- FIX: Безопасная генерация UUID ---
        // crypto.randomUUID работает только в Secure Context (HTTPS/localhost)
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          storedId = crypto.randomUUID();
        } else {
          // Надежный фоллбэк для HTTP и старых браузеров (UUID v4)
          storedId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        }
        
        localStorage.setItem(USER_ID_KEY, storedId);
      }

      setUserId(storedId);
    } catch (e) {
      console.error("Error in useUserId:", e);
      // В самом крайнем случае - просто случайная строка, чтобы приложение не падало
      setUserId(`fallback-${Date.now()}-${Math.random()}`);
    }
  }, []);

  return userId;
}