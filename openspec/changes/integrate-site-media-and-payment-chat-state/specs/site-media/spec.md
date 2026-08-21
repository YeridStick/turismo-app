# Site media

## ADDED Requirements

### Requirement: local image selection
The frontend MUST allow selecting local images with Expo-compatible URI, name, MIME type, size, quantity and temporary state, and MUST NOT treat a local URI as persisted media.

#### Scenario: local removal
- **WHEN** the user removes an image that has not been uploaded
- **THEN** the image is removed from the form without calling the backend

### Requirement: backend-only persistence
The frontend MUST upload media only through a confirmed turismo-back multipart endpoint and MUST use only the backend response as persisted reference. It MUST NOT communicate with S3 or construct bucket URLs.

#### Scenario: missing upload contract
- **WHEN** no backend multipart endpoint and response DTO are available
- **THEN** the UI does not claim persistence and the task remains pending in OpenSpec

### Requirement: coordinated deletion
Local unpersisted media MAY be removed locally. Persisted media MUST be deleted through the confirmed backend DELETE endpoint and MUST remain visible until success; on failure it remains visible and retryable.

#### Scenario: failed persisted deletion
- **WHEN** the backend rejects deletion of persisted media
- **THEN** the image remains visible and the user can retry

### Requirement: missing contract
If tourism-back does not publish upload/delete DTOs and endpoints, the frontend MUST leave persistence pending and document the exact missing contract rather than inventing one.

#### Scenario: no invented endpoint
- **WHEN** the frontend cannot identify a real media endpoint
- **THEN** it does not send a fabricated request or contact storage directly
