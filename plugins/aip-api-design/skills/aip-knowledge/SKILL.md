---
name: aip-knowledge
description: Reference knowledge for Google API Improvement Proposals (AIP), adapted for REST/OpenAPI. Use when reviewing APIs, designing endpoints, or explaining AIP rules. Contains patterns for errors, pagination, filtering, LRO, field masks, and batch operations.
---

# AIP Knowledge

Quick reference for API Improvement Proposals adapted to REST/OpenAPI.

## When to Load References

Based on the task, load the relevant reference file:

| Topic                | Reference File    | When to Use                                      |
| -------------------- | ----------------- | ------------------------------------------------ |
| Error responses      | `errors.md`       | Designing error schema, reviewing error handling |
| Pagination           | `pagination.md`   | Adding pagination to list endpoints              |
| Filtering & sorting  | `filtering.md`    | Adding filter/order_by parameters                |
| Long-running ops     | `lro.md`          | Async operations, jobs, polling                  |
| Partial updates      | `field-masks.md`  | PATCH implementation, update semantics           |
| Batch operations     | `batch.md`        | Batch create/update/delete                       |
| Proto → REST mapping | `rest-mapping.md` | Translating AIP concepts to REST                 |

## Quick Reference

### Standard Methods → HTTP

| Method | HTTP   | Path              | Idempotent |
| ------ | ------ | ----------------- | ---------- |
| Get    | GET    | `/resources/{id}` | Yes        |
| List   | GET    | `/resources`      | Yes        |
| Create | POST   | `/resources`      | No\*       |
| Update | PATCH  | `/resources/{id}` | Yes        |
| Delete | DELETE | `/resources/{id}` | Yes        |

\*Use Idempotency-Key header for safe retries

### Naming Rules (AIP-122)

- ✓ `/users`, `/orders`, `/products` (plural nouns)
- ✗ `/user`, `/order` (singular)
- ✗ `/getUsers`, `/createOrder` (verbs)
- ✓ `/users/{id}/orders` (nested ownership)

### Pagination (AIP-158)

Request: `?page_size=20&page_token=xxx`

Response:

```json
{
  "data": [...],
  "next_page_token": "yyy"
}
```

### Error Response (AIP-193)

```json
{
  "error": {
    "code": "INVALID_ARGUMENT",
    "message": "Human-readable message",
    "details": [...],
    "request_id": "req_abc123"
  }
}
```

### Fetch AIPs On Demand

For detailed guidance, fetch from:

- `https://google.aip.dev/{number}` (e.g., `/158` for pagination)
- Only fetch when user needs deeper explanation
