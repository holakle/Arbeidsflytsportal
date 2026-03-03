# ADR-0002: WorkSession lifecycle for mobile execution

## Status
Accepted

## Context
Field technicians need a simple start/pause/finish flow with low friction and predictable time draft generation.

## Decision
Introduce `WorkSession` model with states:
- `RUNNING`
- `PAUSED`
- `DONE`

API endpoints:
- `POST /workorders/:id/start`
- `POST /workorders/:id/pause`
- `POST /workorders/:id/finish`
- `GET /me/sessions/active`

Rules:
- At most one `RUNNING` session per user per organization (enforced in service guard).
- `finish` creates a draft timesheet entry (`TimesheetEntry.status = DRAFT`).

## Consequences
- Mobile can recover active session after restart.
- Timesheet draft workflow is now linked to operational execution.
