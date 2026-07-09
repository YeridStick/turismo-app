# Baseline de rendimiento

Change ID: `improve-app-performance`

Este baseline corresponde a tareas 1 y 2. No cambia comportamiento funcional, endpoints ni navegacion.

## Instrumentation temporal

Se agregaron utilidades dev-only en `src/utils/performanceInstrumentation.js`.

Activacion:

- Debe ejecutarse en runtime de desarrollo.
- Debe tener `EXPO_PUBLIC_PERF_INSTRUMENTATION=true`.
- En produccion no registra aunque el flag este presente.

Utilidades disponibles:

- `recordRequestInstrumentation(key, meta)` cuenta requests por key.
- `recordRenderInstrumentation(componentName, meta)` cuenta renders por componente.
- `getPerformanceInstrumentationSnapshot()` entrega snapshot de conteos y eventos.
- `resetPerformanceInstrumentation()` limpia el store global.

Estado actual:

- La instrumentation queda disponible y testeada.
- No se conecto todavia a `api.js`, pantallas ni componentes para evitar cambios funcionales o ruido.
- La conexion a flujos reales debe hacerse en fases posteriores, de forma puntual y removible.

## Mapa actual de requests por flujo

### Home mount

Origen principal: `src/screens/HomeScreen/hooks/useHomeData.js`.

- `handleRefresh()` dispara `loadAll()`.
  - `GET ENDPOINTS.PLACES_SEARCH`
  - Params: `mode=ALL`, `size=10`, `page=0`
- `handleRefresh()` dispara `loadPopular()`.
  - `GET ENDPOINTS.PLACES_SEARCH`
  - Params: `mode=ALL`, `size=10`
- `handleRefresh()` dispara `loadPackages()`.
  - `GET ENDPOINTS.PACKAGES` o `GET ENDPOINTS.AGENCY_PACKAGES(agency.id)`
  - Params: `limit=3`, `offset=0`
- `handleRefresh()` dispara `loadAgencies()`.
  - `GET ENDPOINTS.AGENCIES` o `GET ENDPOINTS.AGENCIES_SEARCH`
  - Params: `q`, `limit=3`, `offset=0`
- `handleRefresh()` dispara `loadTopPlaces()`.
  - `GET ENDPOINTS.PLACES_TOP`
  - Params: `limit=8`
  - Fallback posible: `GET ENDPOINTS.PLACES_SEARCH` con `mode=ALL`, `size=8`
- `handleRefresh()` dispara `loadBestRatedPlaces()`.
  - `GET ENDPOINTS.PLACES_TOP_RATED`
  - Params: `limit=8`
- `handleRefresh()` dispara `loadNearby()`.
  - Solicita ubicacion.
  - `GET ENDPOINTS.PLACES_SEARCH`
  - Params: `mode=NEARBY`, `lat`, `lng`, `radius`, `size=50`, `categoryId`
- `handleRefresh()` dispara `loadNearbyContext()`.
  - Solo si hay usuario.
  - Solicita ubicacion.
  - `GET ENDPOINTS.PLACES_NEARBY_CONTEXT`
  - Params: `lat`, `lng`, `radius=150`, `limit=5`
- `handleRefresh()` dispara `loadCategories()`.
  - `GET ENDPOINTS.CATEGORIES`

Riesgos observados:

- `loadAll()` y `loadPopular()` consultan datos equivalentes de `PLACES_SEARCH`.
- `loadTopPlaces()` puede caer a otro `PLACES_SEARCH`.
- `loadNearby()` y `loadNearbyContext()` pueden pedir ubicacion en la misma rafaga.

### Pull-to-refresh

Origen: `HomeScreen` `RefreshControl` llama `handleRefresh()`.

Requests esperados:

- Mismo conjunto que Home mount.

Riesgos observados:

- Pull-to-refresh repetido puede duplicar requests si la primera rafaga sigue en vuelo.
- Un fallo parcial no deberia borrar datos de otras secciones.

### Busqueda

Origen: `useHomeData.performSearch()`.

Requests esperados:

- `GET ENDPOINTS.PLACES_SEARCH`
  - Params: `q`, `categoryId`, `lat`, `lng`, `radiusMeters`
- Si hay coordenadas, despues llama `loadNearby(finalDistance, finalCategory)`.
  - Posible `GET ENDPOINTS.PLACES_SEARCH`
  - Params: `mode=NEARBY`, `lat`, `lng`, `radius`, `size=50`, `categoryId`

Riesgos observados:

- Puede haber dos consultas cercanas a `PLACES_SEARCH` en una sola busqueda.
- Puede repetir solicitud de ubicacion si no hay coordenadas disponibles.

### Filtros

Origen: `FilterModal` aplica `performSearch()`.

Requests esperados:

- Igual que busqueda, con `categoryId` y `radiusMeters`.
- Posible nearby posterior.

Riesgos observados:

- Cambios rapidos de categoria/radio pueden dejar requests en vuelo.
- Se necesita invalidacion por categoria, radio y coordenadas.

### Nearby

Origen: `loadNearby()`, boton de recarga y aumento de radio.

Requests esperados:

- Solicitud de ubicacion con `ensureLocation()`.
- `GET ENDPOINTS.PLACES_SEARCH`
  - Params: `mode=NEARBY`, `lat`, `lng`, `radius`, `size=50`, `categoryId`

Cache actual:

- Existe cache local por radio, coordenadas, data y categoria.

Riesgos observados:

- Falta guard para request en vuelo por la misma clave.
- La clave debe considerar coordenadas redondeadas, radio y categoria.

### Paquetes/agencias

Origen: `loadPackages()`, `loadAgencies()`, search de agencia y filtros.

Requests esperados:

- `GET ENDPOINTS.PACKAGES`
  - Params: `limit=3`, `offset`
- `GET ENDPOINTS.AGENCY_PACKAGES(agency.id)`
  - Params: `limit=3`, `offset`
- `GET ENDPOINTS.AGENCIES`
  - Params: `limit=3`, `offset`
- `GET ENDPOINTS.AGENCIES_SEARCH`
  - Params: `q`, `limit=3`, `offset`

Riesgos observados:

- Search de agencia tiene debounce, pero no guard de request en vuelo.
- Cambiar agencia activa dispara reload de paquetes.
- Retry de seccion recarga paquetes y agencias a la vez.

### MapScreen

Origen: `src/screens/MapScreen.jsx`.

Requests esperados:

- Solicitud de permisos y ubicacion.
- `GET ENDPOINTS.PLACES_SEARCH`
  - Params: `mode=ALL`, `size=1000`

Riesgos observados:

- `size=1000` puede ser pesado.
- Filtros, region y markers se recalculan en render.

### PlaceDetail

Origen: `src/screens/PlaceDetailScreen.jsx`.

Requests esperados:

- `GET ENDPOINTS.PLACE_DETAIL(initialPlace.id)`
- `GET ENDPOINTS.PLACE_RATING(place.id)`
- `GET ENDPOINTS.PLACE_REVIEWS(place.id)`
- `GET ENDPOINTS.PLACES_NEARBY_CONTEXT`
  - Params: `lat`, `lng`, `radius=200`, `limit=5`
- Intervalo de nearby context cada 20s si hay usuario y place id.
- Mutaciones existentes:
  - `POST ENDPOINTS.PLACE_CHECKIN(place.id)`
  - `PATCH ENDPOINTS.VISIT_CONFIRM(pendingVisitId)`
  - `POST ENDPOINTS.PLACE_REVIEWS(place.id)`
  - `POST ENDPOINTS.PLACE_FEEDBACK(place.id)`
  - favoritos por `POST`/`DELETE`

Restriccion:

- La deduplicacion de fase posterior no debe aplicarse globalmente a mutaciones.

### Dashboard

Origen: `src/screens/AgencyDashboardScreen.jsx`.

Requests esperados:

- `GET ENDPOINTS.AGENCY_MY`
- `GET ENDPOINTS.AGENCY_DASHBOARD`
  - Params: `email`, `agencyId`, `from`, `to`
- Fallback si no hay paquetes:
  - `GET ENDPOINTS.AGENCY_PACKAGES(agency.id)`
- Conteos por agencia:
  - Para cada agencia y estado activo (`requested`, `contacted`, `awaiting_payment`):
  - `GET ENDPOINTS.AGENCY_SCOPED_RESERVATIONS(agencyId)` o endpoint equivalente via service
  - Params: `status`, `page=0`, `size=50`

Riesgos observados:

- Conteos escalan con `agencias * estados`.
- Cambio rapido de agencia puede dejar respuestas viejas.

### Reservas

Origen: `src/screens/MyReservationsScreen.jsx` y `src/screens/AgencyReservationsScreen.jsx`.

Requests esperados usuario:

- `GET ENDPOINTS.RESERVATIONS_ME`
  - Params: `page=0`, `size=20`
- Al abrir detalle:
  - `GET ENDPOINTS.RESERVATION_DETAIL(id)`
  - `GET ENDPOINTS.RESERVATION_MESSAGES(id)`
- Acciones:
  - `PATCH ENDPOINTS.RESERVATION_DETAIL(id)`
  - `DELETE ENDPOINTS.RESERVATION_DETAIL(id)`
  - `POST ENDPOINTS.RESERVATION_MESSAGES(id)`
  - `POST ENDPOINTS.RESERVATION_PAYMENT_CHECKOUT(id)`
  - `GET ENDPOINTS.RESERVATION_PAYMENT_STATUS(id)`

Requests esperados agencia:

- `GET ENDPOINTS.AGENCY_RESERVATIONS` o `GET ENDPOINTS.AGENCY_SCOPED_RESERVATIONS(agencyId)`
  - Params: `status`, `page=0`, `size=20`
- Al abrir detalle:
  - `GET` detalle de reserva de agencia.
  - `GET` mensajes de reserva de agencia.
- Acciones:
  - `PATCH` estado.
  - `POST` mensaje.

Restriccion:

- Mutaciones de reserva/mensaje/estado no deben deduplicarse globalmente.
- Deben protegerse por loading/disabled y refrescar solo datos afectados en fases posteriores.

## Matriz inicial de invalidacion de cache

- Filtros: invalidar claves de busqueda, catalogo filtrado y nearby cuando cambien `query`, `categoryId` o radio.
- Coordenadas: invalidar nearby y nearby context cuando cambie la coordenada efectiva.
- Usuario/cambio de cuenta: invalidar notificaciones, nearby context, reservas, dashboard, agencias propias y cualquier scope con email.
- Mutaciones de reserva: invalidar lista/detalle/mensajes de reservas y notificaciones relacionadas.
- Mutaciones de paquete/agencia: invalidar paquetes, agencias, dashboard y rutas dependientes.
- Favoritos/reviews/feedback/visitas: invalidar detalle, reviews/rating, favoritos y nearby context cuando aplique.

## Checklist manual base

- Home:
  - Abrir sin sesion.
  - Abrir con sesion.
  - Pull-to-refresh.
  - Ver catalogo, top, mejores valorados, paquetes y agencias.
- Busqueda/filtros:
  - Buscar por texto.
  - Aplicar categoria.
  - Cambiar radio.
  - Limpiar filtro de agencia.
- Nearby/mapa:
  - Permitir ubicacion.
  - Denegar ubicacion.
  - Aumentar radio.
  - Recargar nearby.
  - Bloquear/desbloquear gesto de mapa.
  - Abrir detalle desde nearby.
- MapScreen:
  - Abrir mapa general.
  - Abrir mapa con lugar seleccionado.
  - Cambiar filtros `nearby`, `selected` y `all`.
- Paquetes/agencias:
  - Buscar agencia.
  - Cargar mas agencias.
  - Filtrar paquetes por agencia.
  - Cargar mas paquetes.
  - Abrir detalle de paquete.
  - Abrir modal de agencia.
- Reservas:
  - Abrir modal de reserva.
  - Validar usuario no autenticado.
  - Validar correo no verificado.
  - Enviar reserva autenticada.
  - Abrir Mis reservas.
  - Abrir detalle y mensajes.
- Dashboard:
  - Abrir dashboard con una agencia.
  - Abrir dashboard con varias agencias.
  - Cambiar agencia activa.
  - Pull-to-refresh.
  - Abrir solicitudes de reserva.
- Notificaciones:
  - Abrir panel.
  - Refrescar notificaciones.
  - Marcar una como leida.
  - Marcar todas como leidas.
  - Abrir reservas desde notificacion.
- Login/logout:
  - Iniciar sesion.
  - Cerrar sesion.
  - Cambiar cuenta guardada si aplica.
  - Verificar que datos scoped por usuario no se mezclan.

## Guardrails para fases posteriores

- No cambiar endpoints ni parametros existentes sin una propuesta separada.
- No cambiar nombres de pantallas ni parametros de navegacion.
- No deduplicar globalmente `POST`, `PATCH` ni `DELETE`.
- No activar instrumentation por defecto.
- No dejar logs permanentes en produccion.
- Mantener cache en memoria acotada y con invalidacion por filtros, coordenadas, usuario, mutaciones y cambio de cuenta.
