# TypeScript Interfaces Template

## frontend/types/task.ts

```typescript
// [Task]: T00X [From]: specs/phase2-web/frontend-ui/plan.md §Types

/** Task response from backend API — matches TaskResponse Pydantic schema. */
export interface Task {
  id: number;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

/** Request body for creating a new task — matches TaskCreate schema. */
export interface TaskCreateInput {
  title: string;
  description?: string;
}

/** Request body for updating a task — matches TaskUpdate schema. */
export interface TaskUpdateInput {
  title?: string;
  description?: string;
}

/** API error response format from FastAPI. */
export interface ApiError {
  detail: string;
}
```

## Key Points

- `Task` interface mirrors `TaskResponse` from backend exactly
- `created_at` / `updated_at` are `string` (ISO 8601 from JSON serialization)
- `description` is `string | null` (nullable in backend)
- `TaskCreateInput.title` is required, `description` is optional
- `TaskUpdateInput` has all fields optional (partial update)
- `ApiError` matches FastAPI's `HTTPException` JSON format
