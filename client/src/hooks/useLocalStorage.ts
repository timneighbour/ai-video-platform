import { useState, useEffect } from "react";

/**
 * Hook for persisting state to localStorage
 * Automatically syncs state to localStorage and restores on mount
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return JSON.parse(item) as T;
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
    return initialValue;
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

/**
 * Hook for persisting form data with auto-cleanup
 * Clears localStorage when form is successfully submitted
 */
export function useFormPersistence(formKey: string, onClear?: () => void) {
  const clearFormData = () => {
    try {
      window.localStorage.removeItem(formKey);
      onClear?.();
    } catch (error) {
      console.warn(`Error clearing localStorage key "${formKey}":`, error);
    }
  };

  const hasPersistedData = () => {
    try {
      return window.localStorage.getItem(formKey) !== null;
    } catch {
      return false;
    }
  };

  return { clearFormData, hasPersistedData };
}
