import { Task } from "../types/habitta";

const STORAGE_KEY = "habitta_tasks";

export const getTasks = (): Task[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const addTask = (task: Task): void => {
  const existing = getTasks();
  const updated = [...existing, task].sort((a, b) => 
    new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};