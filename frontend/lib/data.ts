import { Task } from './types';

export const seedTasks: Task[] = [
  {
    id: '1',
    title: 'Design system audit',
    description: 'Review all components and align with new brand guidelines.',
    priority: 'high',
    category: 'work',
    dueDate: '2026-02-22',
    completed: false,
    createdAt: '2026-02-18T09:00:00Z',
  },
  {
    id: '2',
    title: 'Morning run — 5K',
    description: 'Track pace and heart rate with Strava.',
    priority: 'medium',
    category: 'health',
    dueDate: '2026-02-20',
    completed: true,
    createdAt: '2026-02-17T07:00:00Z',
  },
  {
    id: '3',
    title: 'Read "Atomic Habits" ch. 7-10',
    priority: 'low',
    category: 'personal',
    dueDate: '2026-02-23',
    completed: false,
    createdAt: '2026-02-16T20:00:00Z',
  },
  {
    id: '4',
    title: 'Submit Q1 budget proposal',
    description: 'Include projections for marketing and headcount.',
    priority: 'high',
    category: 'work',
    dueDate: '2026-02-21',
    completed: false,
    createdAt: '2026-02-15T10:00:00Z',
  },
  {
    id: '5',
    title: 'React advanced patterns — Module 3',
    priority: 'medium',
    category: 'study',
    dueDate: '2026-02-25',
    completed: true,
    createdAt: '2026-02-14T18:00:00Z',
  },
  {
    id: '6',
    title: 'Grocery shopping',
    priority: 'low',
    category: 'personal',
    dueDate: '2026-02-20',
    completed: true,
    createdAt: '2026-02-19T12:00:00Z',
  },
  {
    id: '7',
    title: 'Weekly team sync — prep agenda',
    priority: 'medium',
    category: 'work',
    dueDate: '2026-02-20',
    completed: false,
    createdAt: '2026-02-19T09:00:00Z',
  },
  {
    id: '8',
    title: 'Yoga session',
    priority: 'low',
    category: 'health',
    dueDate: '2026-02-21',
    completed: false,
    createdAt: '2026-02-18T06:00:00Z',
  },
];

export const categoryColors: Record<string, string> = {
  work: '#4F46E5',
  personal: '#F59E0B',
  study: '#10B981',
  health: '#EF4444',
};

export const categoryLabels: Record<string, string> = {
  work: 'Work',
  personal: 'Personal',
  study: 'Study',
  health: 'Health',
};
