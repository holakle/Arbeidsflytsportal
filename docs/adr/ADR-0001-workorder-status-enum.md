# ADR-0001: WorkOrder status as enum

## Status
Accepted

## Context
`WorkOrder.status` was previously a free-text string with mixed values. Mobile execution flow requires strict status transitions and typed contracts.

## Decision
Replace `WorkOrder.status` with enum:
- `DRAFT`
- `READY_FOR_PLANNING`
- `PLANNED`
- `IN_PROGRESS`
- `BLOCKED`
- `DONE`
- `CANCELLED`

Migration maps legacy values:
- `OPEN` -> `READY_FOR_PLANNING`
- `IN_PROGRESS` -> `IN_PROGRESS`
- `DONE` -> `DONE`
- `BLOCKED` -> `BLOCKED`
- `CANCELLED` -> `CANCELLED`

## Consequences
- Better API contract safety for web/mobile.
- Existing code paths using `OPEN` must be updated.
- Seed data now includes at least one work order per enum state.
