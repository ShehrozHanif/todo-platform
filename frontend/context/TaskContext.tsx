'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { Task, TaskAction, TaskState } from '@/lib/types';
import { useSession } from '@/lib/auth-client';
import * as api from '@/lib/api';
import { saveTaskExtras, removeTaskExtras } from '@/lib/api';

type InternalAction = TaskAction | { type: 'SET_TASKS'; payload: Task[] };

function taskReducer(state: TaskState, action: InternalAction): TaskState {
  switch (action.type) {
    case 'SET_TASKS':
      return { ...state, tasks: (action as { type: 'SET_TASKS'; payload: Task[] }).payload };
    case 'ADD':
      return state; // handled async
    case 'TOGGLE': {
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload ? { ...t, completed: !t.completed } : t
        ),
      };
    }
    case 'DELETE': {
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) };
    }
    case 'EDIT': {
      return {
        ...state,
        tasks: state.tasks.map(t => (t.id === action.payload.id ? action.payload : t)),
        modalOpen: false,
        editingTask: null,
      };
    }
    case 'OPEN_MODAL': {
      return { ...state, modalOpen: true, editingTask: action.payload ?? null };
    }
    case 'CLOSE_MODAL': {
      return { ...state, modalOpen: false, editingTask: null };
    }
    case 'SET_CATEGORY': {
      return { ...state, activeCategory: action.payload };
    }
    case 'SET_FILTER': {
      return { ...state, activeFilter: action.payload };
    }
    case 'ADD_CUSTOM_CATEGORY': {
      const newCat = { ...action.payload, id: Date.now().toString() };
      return { ...state, customCategories: [...state.customCategories, newCat] };
    }
    default:
      return state;
  }
}

interface TaskContextValue {
  state: TaskState;
  dispatch: (action: TaskAction) => void;
}

const TaskContext = createContext<TaskContextValue | null>(null);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [state, rawDispatch] = useReducer(taskReducer, {
    tasks: [],
    modalOpen: false,
    editingTask: null,
    activeCategory: null,
    customCategories: [],
    activeFilter: 'All',
  });

  // Load tasks from backend on login
  useEffect(() => {
    if (!userId) return;
    api.getTasks(userId)
      .then(tasks => rawDispatch({ type: 'SET_TASKS', payload: tasks }))
      .catch(console.error);
  }, [userId]);

  // Async-aware dispatch — ADD/EDIT/DELETE/TOGGLE hit the API; others are synchronous
  const dispatch = useCallback((action: TaskAction) => {
    if (!userId) {
      rawDispatch(action as InternalAction);
      return;
    }
    switch (action.type) {
      case 'ADD': {
        const { title, description, priority, category, dueDate, dueTime, recurring, reminder } = action.payload;
        api.createTask(userId, { title, description })
          .then(created => {
            // Persist UI-only fields keyed by the backend-assigned ID
            saveTaskExtras(created.id, { priority, category, dueDate, dueTime, recurring, reminder });
            return api.getTasks(userId);
          })
          .then(tasks => {
            rawDispatch({ type: 'SET_TASKS', payload: tasks });
            rawDispatch({ type: 'CLOSE_MODAL' });
          })
          .catch(console.error);
        break;
      }
      case 'TOGGLE': {
        rawDispatch(action as InternalAction); // optimistic
        api.toggleComplete(userId, action.payload).catch(() => {
          rawDispatch({ type: 'TOGGLE', payload: action.payload }); // revert
        });
        break;
      }
      case 'DELETE': {
        rawDispatch(action as InternalAction); // optimistic
        removeTaskExtras(action.payload); // clean up persisted extras
        api.deleteTask(userId, action.payload).catch(() => {
          api.getTasks(userId)
            .then(tasks => rawDispatch({ type: 'SET_TASKS', payload: tasks }))
            .catch(console.error);
        });
        break;
      }
      case 'EDIT': {
        const task = action.payload;
        // Persist UI-only fields so they survive API round-trips
        saveTaskExtras(task.id, {
          priority: task.priority,
          category: task.category,
          dueDate: task.dueDate,
          dueTime: task.dueTime,
          recurring: task.recurring,
          reminder: task.reminder,
        });
        rawDispatch(action as InternalAction); // optimistic (keeps priority/category/dueDate)
        api.updateTask(userId, task.id, { title: task.title, description: task.description }).catch(() => {
          api.getTasks(userId)
            .then(tasks => rawDispatch({ type: 'SET_TASKS', payload: tasks }))
            .catch(console.error);
        });
        break;
      }
      default:
        rawDispatch(action as InternalAction);
    }
  }, [userId]);

  return <TaskContext.Provider value={{ state, dispatch }}>{children}</TaskContext.Provider>;
}

export function useTaskContext() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTaskContext must be used within TaskProvider');
  return ctx;
}
