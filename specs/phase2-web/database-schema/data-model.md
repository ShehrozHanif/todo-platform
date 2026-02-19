# Data Model: Neon Database Schema

**Feature**: database-schema | **Branch**: 001-neon-database-schema | **Date**: 2026-02-19

## Entities

### User

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string | PK | Managed by Better Auth (UUID-style) |
| email | string | UNIQUE, NOT NULL | Enforced at DB level |
| name | string | NOT NULL | Display name |
| created_at | datetime (tz) | NOT NULL, server default `now()` | Auto-set on creation |

**Table name**: `user`
**Primary key**: `id` (string, set by Better Auth — not auto-increment)

### Task

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | integer | PK, auto-increment | Auto-generated |
| user_id | string | FK → user.id, NOT NULL, INDEX | CASCADE on delete |
| title | string (max 200) | NOT NULL | Validated: non-empty, max 200 chars |
| description | string (max 1000) | NULL | Optional |
| completed | boolean | NOT NULL, default `false` | INDEX for status filtering |
| created_at | datetime (tz) | NOT NULL, server default `now()` | Auto-set on creation |
| updated_at | datetime (tz) | NOT NULL, server default `now()`, onupdate `now()` | Auto-refreshed on update |

**Table name**: `task`
**Primary key**: `id` (auto-increment integer)
**Foreign key**: `user_id` → `user.id` (CASCADE delete)
**Indexes**: `user_id`, `completed`

## Relationships

```
User (1) ────── (0..*) Task
  │                      │
  PK: id (str)           FK: user_id → user.id
                         CASCADE DELETE
```

- One User has zero or more Tasks
- One Task belongs to exactly one User
- Deleting a User cascades to delete all their Tasks

## Validation Rules

| Entity | Field | Rule | Enforcement |
|--------|-------|------|-------------|
| Task | title | Non-empty string | Pydantic `field_validator` |
| Task | title | Max 200 characters | `Field(max_length=200)` |
| Task | description | Max 1000 characters | `Field(max_length=1000)` |
| Task | user_id | Must reference existing User | FK constraint |
| User | email | Unique across all users | UNIQUE constraint |
| User | id | Non-empty string | PK constraint |

## State Transitions

### Task Lifecycle

```
Created (completed=false)
    │
    ├── Update title/description → Updated (updated_at refreshed)
    │
    ├── Toggle complete → Completed (completed=true, updated_at refreshed)
    │     │
    │     └── Toggle complete → Uncompleted (completed=false, updated_at refreshed)
    │
    └── Delete → Removed (permanent, no soft delete)
```

No soft delete — deletion is permanent per spec FR-009.
