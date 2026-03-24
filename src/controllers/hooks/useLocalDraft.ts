import { useState, useEffect } from 'react';

export function useLocalDraft<T>(storageKey: string, initialData: T) {
  // 1. Initialize state from Local Storage (if it exists)
  const [formData, setFormData] = useState<T>(() => {
    try {
      const savedDraft = localStorage.getItem(storageKey);
      return savedDraft ? JSON.parse(savedDraft) : initialData;
    } catch (error) {
      console.error('Error reading localStorage', error);
      return initialData;
    }
  });

  // 2. Automatically sync to Local Storage whenever formData changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(formData));
    } catch (error) {
      console.error('Error saving to localStorage', error);
    }
  }, [formData, storageKey]);

  // 3. A function to wipe the draft after a successful save
  const clearDraft = () => {
    localStorage.removeItem(storageKey);
    setFormData(initialData);
  };

  return [formData, setFormData, clearDraft] as const;
}
