import { useState, useEffect, useCallback } from 'react';

/**
 * Хук для синхронизации состояния с localStorage.
 * @param key Ключ для localStorage.
 * @param initialValue Начальное значение, если в localStorage ничего нет.
 * @returns Кортеж [состояние, функция для установки состояния].
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Ошибка чтения ключа localStorage “${key}”:`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = (value: T | ((val: T) => T)) => {
    if (typeof window == 'undefined') {
      console.warn(
        `Попытка установить ключ localStorage “${key}”, хотя окружение не является клиентом`
      );
    }

    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Ошибка установки ключа localStorage “${key}”:`, error);
    }
  };
  
  useEffect(() => {
    setStoredValue(readValue());
  }, []);


  return [storedValue, setValue];
}
