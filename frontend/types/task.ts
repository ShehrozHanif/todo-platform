// [Task]: T004 [From]: specs/phase2-web/frontend-ui/tasks.md §T004
// TypeScript interfaces matching backend TaskRead schema exactly.

export interface Task {
  id: number;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface TaskCreateInput {
  title: string;
  description?: string;
}

export interface TaskUpdateInput {
  title?: string;
  description?: string;
}
