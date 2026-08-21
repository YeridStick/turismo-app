# Integrar multimedia de sitios y estado de pago en chats

Change ID: `integrate-site-media-and-payment-chat-state`

## Resumen

Permitir seleccionar imágenes desde Expo y preparar su carga exclusivamente a través de un contrato de multimedia del backend. Sincronizar el estado visual de reservas y chats únicamente con el estado autoritativo devuelto por el backend después del checkout de Wompi.

## Capacidades

- A. Selección, validación, previsualización y carga multipart de multimedia de sitios.
- B. Eliminación coordinada de multimedia persistida mediante `mediaId` y DELETE del backend.
- C. Reconciliación del pago, reserva, lista de chats, chat abierto y mensajes después de la validación backend.
- D. Estados de carga, error, reintento, concurrencia, desmontaje y recuperación.

## Contratos verificados

- Sitios: `POST /api/places`, `PATCH /api/places/{id}`. El backend actualmente acepta únicamente arrays de URLs; no se encontró endpoint de upload/media ni contrato `mediaId` en la versión inspeccionada.
- Pago: `POST /api/reservations/{id}/payment/checkout` y `GET /api/reservations/{id}/payment/status`.
- Reserva: `GET /api/reservations/me`, `GET /api/reservations/{id}`.
- Chat: `GET/POST /api/reservations/{id}/messages`.

## Restricciones y vacíos

El frontend solo usa turismo-back. No usa AWS SDK, S3, PostgreSQL, Wompi directo, URLs físicas de bucket ni confirmación por redirect. La capacidad multimedia no puede completar la carga persistente hasta que turismo-back publique el endpoint y DTO multipart; no se inventará ese contrato. La propuesta conserva la selección local y deja la integración de carga/eliminación como pendiente bloqueada por contrato.

