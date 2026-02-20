export type Priority = 'high' | 'medium' | 'low';
export type Category = 'work' | 'personal' | 'study' | 'health';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  category: string;
  dueDate?: string;
  dueTime?: string;
  recurring?: boolean;
  reminder?: boolean;
  completed: boolean;
  createdAt: string;
}

export interface CustomCategory {
  id: string;
  name: string;
  color: string;
}

export interface TaskState {
  tasks: Task[];
  modalOpen: boolean;
  editingTask: Task | null;
  activeCategory: string | null;
  customCategories: CustomCategory[];
  activeFilter: string;
}

export type TaskAction =
  | { type: 'ADD'; payload: Omit<Task, 'id' | 'createdAt'> }
  | { type: 'TOGGLE'; payload: string }
  | { type: 'DELETE'; payload: string }
  | { type: 'EDIT'; payload: Task }
  | { type: 'OPEN_MODAL'; payload?: Task }
  | { type: 'CLOSE_MODAL' }
  | { type: 'SET_CATEGORY'; payload: string | null }
  | { type: 'SET_FILTER'; payload: string }
  | { type: 'ADD_CUSTOM_CATEGORY'; payload: Omit<CustomCategory, 'id'> };
