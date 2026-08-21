# Payment and chat state

## ADDED Requirements

### Requirement: backend is payment authority
The frontend MUST treat only `GET /api/reservations/{id}/payment/status` and the reservation detail returned by turismo-back as payment authority. A checkout URL, redirect, browser close, transaction ID, or successful checkout creation MUST NOT mark a payment approved.

#### Scenario: checkout returns without approval
- **WHEN** the browser returns from Wompi
- **THEN** the UI keeps the reservation pending/processing until a backend response says `paid` or another terminal state

### Requirement: bounded reconciliation
The frontend MUST poll only while payment is pending, checkout-created, or processing, with a bounded interval and attempt count, and MUST stop at terminal state, timeout, close, or unmount.

#### Scenario: terminal response
- **WHEN** the backend returns `paid`, `failed`, `expired`, `cancelled`, or `verified_by_agency`
- **THEN** polling stops and the UI presents that authoritative state

### Requirement: consistent reservation chat context
After an authoritative payment response, the frontend MUST refresh reservation list, reservation detail, and open reservation messages using existing backend endpoints. It MUST NOT create a persistent frontend-only payment message.

#### Scenario: approved payment
- **WHEN** backend returns `paid`
- **THEN** reservation status, payment badge, available actions, chat context, and system messages all reflect refreshed backend data without duplicate messages

### Requirement: errors and concurrency
The frontend MUST keep visible data on temporary query errors, prevent double checkout/reconciliation, and ignore stale responses that would move a terminal state backward.

#### Scenario: temporary status error
- **WHEN** a status request fails transiently
- **THEN** the UI keeps the previous state and may retry without showing the payment as rejected
