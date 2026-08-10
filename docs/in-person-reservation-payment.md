# Integración de pago presencial de reservas

## Flujo

1. La agencia abre una reserva pendiente.
2. Selecciona `Solicitar pago presencial`.
3. Opcionalmente envía instrucciones y un enlace HTTPS de Google Maps.
4. El backend genera un código `TRM-XXX-XXXX` y publica el evento en el chat.
5. El personal puede buscar la reserva desde el campo de código.
6. Después de recibir el dinero, selecciona `Confirmar pago recibido`.
7. La reserva pasa a `confirmed` y el pago a `verified_by_agency`.

## Endpoints

Todas las rutas requieren el JWT de un usuario autorizado de la agencia.

```text
POST /api/agencies/{agencyId}/reservations/{reservationId}/payment-requests
GET  /api/agencies/{agencyId}/reservations/payment-requests/lookup?code=TRM-ABC-2345
POST /api/agencies/{agencyId}/reservations/{reservationId}/payment-requests/{requestId}/verify
POST /api/agencies/{agencyId}/reservations/{reservationId}/payment-requests/{requestId}/cancel
```

### Solicitar pago

```json
{
  "locationUrl": "https://maps.google.com/?q=4.123,-75.456",
  "notes": "Atendemos de lunes a sábado de 8:00 a 18:00."
}
```

La respuesta contiene `paymentRequest.code` y `paymentRequest.id`.

### Buscar por código

La respuesta contiene:

```json
{
  "paymentRequest": {},
  "reservation": {},
  "messages": []
}
```

El frontend debe reemplazar el detalle y el chat actuales con estos datos. El código solo sirve para localizar; no debe considerarse una credencial y siempre debe enviarse el JWT.

### Confirmar pago

```json
{
  "paymentReference": "REC-20260809-001",
  "notes": "Pago recibido en efectivo."
}
```

La confirmación es idempotente. Una repetición segura conserva el resultado y no duplica el mensaje de sistema.

## Estados que debe mostrar el frontend

| Campo | Valores relevantes | Etiqueta sugerida |
|---|---|---|
| `paymentRequest.status` | `REQUESTED` | Pago presencial pendiente |
| `paymentRequest.status` | `VERIFIED` | Pago verificado |
| `paymentRequest.status` | `CANCELLED` | Solicitud cancelada |
| `reservation.status` | `confirmed` | Reserva confirmada |
| `reservation.paymentStatus` | `verified_by_agency` | Pago verificado por agencia |

## Errores

- `404`: código inexistente, expirado o perteneciente a otra agencia.
- `403`: el usuario no tiene acceso a la agencia.
- `409`: solicitud ya cancelada, verificada o reserva no compatible.
- `422`: datos inválidos, por ejemplo una URL que no usa HTTPS.

Después de solicitar o confirmar, invalidar las consultas de lista, detalle y mensajes de la reserva. No generar códigos al crear una reserva normal.
