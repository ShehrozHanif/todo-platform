# Feature Specification: Neon Database Schema

**Feature Branch**: `001-neon-database-schema`
**Created**: 2026-02-19
**Status**: Clarified
**Input**: User description: "Feature 1: Database Schema for Phase 2 - Neon PostgreSQL + SQLModel models for the todo-platform. Feature location: specs/phase2-web/database-schema/. See phase2.md for full context."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Store and Retrieve Tasks Per User (Priority: P1)

As a registered user, I want my tasks saved in a persistent database so that they survive server restarts and are available across sessions.

**Why this priority**: Without persistent task storage, no other feature (API, auth, frontend) can function. This is the foundational data layer.

**Independent Test**: Can be fully tested by inserting a task record for a user, restarting the connection, and confirming the task is still retrievable — delivering persistent multi-user data storage.

**Acceptance Scenarios**:

1. **Given** a user exists in the system, **When** a task is created with a title, **Then** the task is stored with an auto-generated ID, creation timestamp, and default status of not completed.
2. **Given** a user has multiple tasks, **When** tasks are queried by user, **Then** only that user's tasks are returned.
3. **Given** a task was created previously, **When** the system is restarted, **Then** the task is still retrievable from the database.

---

### User Story 2 - Manage Task Lifecycle (Priority: P1)

As a registered user, I want to update, complete, and delete my tasks so that my task list reflects current priorities.

**Why this priority**: CRUD operations on tasks are the core value proposition — without update/delete/complete, storage alone is insufficient.

**Independent Test**: Can be tested by creating a task, updating its title, toggling its completion status, and deleting it — confirming each operation persists correctly.

**Acceptance Scenarios**:

1. **Given** an existing task, **When** the title or description is updated, **Then** the updated values are persisted and the updated-at timestamp is refreshed.
2. **Given** an incomplete task, **When** the task is marked as completed, **Then** the completion status changes to true and persists.
3. **Given** an existing task, **When** the task is deleted, **Then** it is permanently removed and no longer retrievable.

---

### User Story 3 - User Isolation (Priority: P2)

As a system administrator, I want each user's tasks to be isolated so that no user can access or modify another user's tasks.

**Why this priority**: User isolation is essential for multi-tenancy but depends on the task storage foundation being in place first.

**Independent Test**: Can be tested by creating tasks for two different users and confirming that querying by one user's ID returns only their tasks.

**Acceptance Scenarios**:

1. **Given** User A and User B each have tasks, **When** querying User A's tasks, **Then** only User A's tasks are returned.
2. **Given** User A's task ID, **When** User B attempts to access it by user filter, **Then** the task is not found.
3. **Given** a task is created, **When** no user ID is provided, **Then** the task creation fails.

---

### User Story 4 - Automatic Timestamping (Priority: P3)

As a user, I want timestamps recorded automatically when tasks are created or modified so that I can see when things happened without manual input.

**Why this priority**: Timestamps provide audit trail and sorting capability but are not blocking for basic CRUD functionality.

**Independent Test**: Can be tested by creating a task and verifying created-at is auto-populated, then updating it and verifying updated-at changes.

**Acceptance Scenarios**:

1. **Given** a new task is created, **When** stored in the database, **Then** a created-at timestamp is automatically set to the current time.
2. **Given** an existing task is updated, **When** the update is saved, **Then** the updated-at timestamp is refreshed to the current time.
3. **Given** a task is only read (not modified), **When** retrieved, **Then** the timestamps remain unchanged.

---

### Edge Cases

- What happens when a task title exceeds the maximum allowed length (200 characters)?
- What happens when two tasks are created simultaneously for the same user?
- What happens when a task is created with an empty title?
- What happens when a user ID references a user that does not exist in the users table?
- What happens when the database connection is temporarily unavailable?
- How does the system handle special characters and Unicode in task titles and descriptions?

## Clarifications

### Session 2026-02-19

- Q: What happens to a user's tasks when the user record is deleted? → A: CASCADE delete — deleting a user automatically deletes all their tasks.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST persist task records in a durable database that survives application restarts.
- **FR-002**: System MUST auto-generate a unique numeric identifier for each task upon creation.
- **FR-003**: System MUST associate every task with exactly one user via a user identifier.
- **FR-004**: System MUST store the following attributes for each task: title (required, max 200 characters), description (optional, max 1000 characters), completion status (boolean, defaults to false).
- **FR-005**: System MUST automatically record a creation timestamp when a task is first stored.
- **FR-006**: System MUST automatically update a modification timestamp whenever a task's attributes change.
- **FR-007**: System MUST support querying all tasks belonging to a specific user.
- **FR-008**: System MUST support updating a task's title, description, and completion status independently.
- **FR-009**: System MUST support permanent deletion of a task by its identifier and owning user.
- **FR-010**: System MUST enforce user isolation — a query for one user's tasks never returns another user's tasks.
- **FR-011**: System MUST reject task creation when the title is empty or exceeds 200 characters.
- **FR-012**: System MUST store user records with at minimum: unique identifier, email address, display name, and account creation timestamp.
- **FR-013**: System MUST enforce email uniqueness — no two user records may share the same email address.
- **FR-014**: System MUST establish a referential relationship between tasks and users such that orphaned tasks (tasks without a valid user) cannot exist.

### Key Entities

- **User**: Represents a registered account. Key attributes: unique identifier (string), email (unique), display name, creation timestamp. Managed by the authentication system but defined at the database level.
- **Task**: Represents a single to-do item owned by a user. Key attributes: unique numeric identifier, owning user reference, title, description, completion status, creation timestamp, modification timestamp.
- **Relationship**: Each User can have zero or more Tasks. Each Task belongs to exactly one User. Deleting a user record CASCADE deletes all their tasks (no orphaned tasks permitted).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All task CRUD operations (create, read, update, delete) complete successfully with data persisted across application restarts.
- **SC-002**: User isolation is enforced — querying tasks by user never leaks data from other users, verified across 100% of query operations.
- **SC-003**: Automatic timestamps are populated on every create and update operation without manual input, accurate to within 1 second of the operation time.
- **SC-004**: Task creation with invalid data (empty title, title exceeding 200 characters) is rejected with a clear error, achieving 100% rejection rate for invalid inputs.
- **SC-005**: The database layer achieves 90%+ test coverage across all data models and connection handling.
- **SC-006**: All database operations complete within 2 seconds under normal load conditions.
- **SC-007**: The system handles concurrent task operations for the same user without data corruption or loss.

## Assumptions

- User records are managed by the authentication system (Better Auth) in a later feature, but the database schema for users is defined now to establish the foreign key relationship.
- The user identifier is a string type (not integer) to align with the authentication system's UUID-based IDs.
- Database provisioning and access credentials are handled externally; this feature only defines the schema and connection handling.
- No pagination, sorting, or filtering is required at the database layer — those concerns belong to the API layer (Feature 2).
- Migration tooling (e.g., Alembic) is out of scope for this feature; table creation is handled programmatically at application startup.
- The database description field is optional and nullable with a 1000-character limit based on typical task management patterns.

## Scope

### In Scope

- Database table definitions for User and Task entities
- Async database connection and session management
- Foreign key relationship between Task and User
- Indexes for frequently queried columns (user ID, completion status)
- Automatic timestamp management (created-at, updated-at)
- Field-level constraints (title length, email uniqueness)
- Test infrastructure (fixtures, test database configuration)
- Environment variable configuration for database connection

### Out of Scope

- REST API endpoints (Feature 2)
- Authentication and authorization logic (Feature 3)
- Frontend user interface (Feature 4)
- Database migration tooling
- Database provisioning and deployment
- Backup and recovery procedures
- Query performance optimization beyond basic indexing
- Full-text search capabilities

## Dependencies

- Neon PostgreSQL database instance (provisioned externally)
- Database connection credentials provided via environment variable
- Phase 1 CLI app is complete (provides the business model patterns to carry forward)
