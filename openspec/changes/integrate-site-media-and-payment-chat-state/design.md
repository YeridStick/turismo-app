# Diseño

## Multimedia

`CreatePlaceScreen` mantiene separadas las imágenes locales (`uri`, nombre, MIME, tamaño y estado temporal) y las referencias persistidas entregadas por turismo-back (`mediaId`, `objectKey`, URL lógica/de lectura y metadatos). Expo Image Picker solicita permisos solo al seleccionar, valida tipo/tamaño/cantidad y muestra estados local, pendiente, cargando, cargado y error. La carga multipart debe pasar por Axios hacia un endpoint backend confirmado; Axios configura el boundary.

Si el backend exige `siteId`, se crea primero el sitio y se conserva ese ID durante reintentos. Un fallo parcial no repite la creación ni informa éxito total. Una imagen local se puede retirar del formulario. Una imagen persistida solo se retira después del DELETE backend exitoso; mientras tanto permanece visible y un fallo permite reintentar.

Actualmente el contrato de upload/delete multimedia no existe en el frontend ni en la versión backend inspeccionada, por lo que no se agrega endpoint ficticio ni se persiste una URI local.

## Pago y chat

El checkout solo abre la URL entregada por backend. El retorno/cierre de Wompi no confirma nada. Después del checkout se consulta `payment/status` con polling limitado y cancelable mientras el estado sea `pending`, `checkout_created` o `processing`. Los estados terminales son `paid`, `failed`, `expired`, `cancelled` y `verified_by_agency`; los errores de consulta quedan como error temporal y no como rechazo.

Cada respuesta autoritativa actualiza el detalle y la lista de reservas, invalida deduplicadores de pago/detalle/lista/mensajes y recarga los mensajes del chat abierto. No se crea mensaje de sistema desde frontend: si existe, se obtiene desde `/messages`. Las respuestas fuera de orden se descartan mediante secuencia y no pueden degradar un estado terminal.

## Seguridad de interacción

Los botones se deshabilitan durante mutaciones, el polling evita solicitudes simultáneas, se detiene al desmontar o cerrar el detalle y no actualiza estado de una pantalla desmontada.

