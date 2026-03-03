# ADR-0003: StorageProvider abstraction for attachments

## Status
Accepted

## Context
Attachments are required for mobile execution, but production storage provider selection (S3/R2/etc.) is postponed.

## Decision
Add a `StorageProvider` interface and use a dev-only local disk implementation:
- `save(...) -> { storageKey, url? }`

API persists attachment metadata in database and stores binary data via the provider.

## Consequences
- Attachment flow is available now in local/dev.
- Future cloud storage migration can replace provider without API contract changes.
